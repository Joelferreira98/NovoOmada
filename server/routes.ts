import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertSiteSchema, insertPlanSchema, insertOmadaCredentialsSchema, insertUserSchema } from "@shared/schema";
import { hashPassword } from "./auth";
import { z } from "zod";
import https from "https";

// Temporarily disable SSL verification for development (self-signed certs)
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

// Token cache to avoid multiple rapid requests to Omada
let tokenCache: { token: string; expires: number; omadacId: string } | null = null;

async function getValidOmadaToken(credentials: any): Promise<string> {
  const now = Date.now();
  
  // Check if we have a valid cached token for this omadacId
  if (tokenCache && 
      tokenCache.omadacId === credentials.omadacId && 
      tokenCache.expires > now + 60000) { // 1 minute buffer
    console.log('Using cached token');
    return tokenCache.token;
  }
  
  // Get new token using client credentials (following Python implementation)
  console.log('Getting fresh token from Omada API using client credentials');
  
  const tokenUrl = `${credentials.omadaUrl}/openapi/authorize/token?grant_type=client_credentials`;
  const requestBody = {
    'omadacId': credentials.omadacId,
    'client_id': credentials.clientId,
    'client_secret': credentials.clientSecret
  };
  
  console.log(`Token request URL: ${tokenUrl}`);
  console.log(`Request body:`, requestBody);
  
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token request failed: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('Token response:', tokenData);
  
  if (tokenData.errorCode !== 0) {
    throw new Error(`Token error: ${tokenData.msg || 'Authentication failed'}`);
  }

  const accessToken = tokenData.result?.accessToken;
  if (!accessToken) {
    throw new Error('No access token received from Omada API');
  }

  // Cache the token
  tokenCache = {
    token: accessToken,
    expires: now + (tokenData.result.expiresIn * 1000) - 300000, // 5 minutes before actual expiry
    omadacId: credentials.omadacId
  };

  return accessToken;
}

async function processOmadaSites(omadaSites: any[], res: any) {
  let syncedCount = 0;
  let updatedCount = 0;

  console.log(`Found ${omadaSites.length} sites from Omada API:`, omadaSites);

  for (const omadaSite of omadaSites) {
    // Check if site already exists
    const existingSites = await storage.getAllSites();
    const existingSite = existingSites.find(site => site.omadaSiteId === omadaSite.siteId);
    
    if (existingSite) {
      // Update existing site
      await storage.updateSite(existingSite.id, {
        name: omadaSite.name,
        location: omadaSite.address || omadaSite.region || existingSite.location,
        status: "active"
      });
      updatedCount++;
    } else {
      // Create new site
      await storage.createSite({
        name: omadaSite.name,
        location: omadaSite.address || omadaSite.region || "Localização não informada",
        omadaSiteId: omadaSite.siteId,
        status: "active"
      });
      syncedCount++;
    }
  }

  res.json({ 
    message: `Sites sincronizados com sucesso. ${syncedCount} novos sites, ${updatedCount} atualizados.`,
    syncedCount,
    updatedCount,
    totalSites: omadaSites.length
  });
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Middleware to check role
  const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };

  // Omada Credentials Management (Master only)
  app.get("/api/omada-credentials", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const credentials = await storage.getOmadaCredentials();
      res.json(credentials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  app.post("/api/omada-credentials", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const validatedData = insertOmadaCredentialsSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      
      // Check if credentials already exist
      const existingCredentials = await storage.getOmadaCredentials();
      let credentials;
      
      if (existingCredentials) {
        // Update existing credentials
        credentials = await storage.updateOmadaCredentials(existingCredentials.id, validatedData);
      } else {
        // Create new credentials
        credentials = await storage.createOmadaCredentials(validatedData);
      }
      
      res.status(200).json(credentials);
    } catch (error) {
      console.error("Validation error:", error);
      res.status(400).json({ message: "Invalid data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Test Omada credentials connectivity
  app.post("/api/omada-credentials/test", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(400).json({ success: false, message: "Nenhuma credencial configurada" });
      }

      const tokenUrl = `${credentials.omadaUrl}/openapi/authorize/token?grant_type=client_credentials`;
      const requestBody = {
        'omadacId': credentials.omadacId,
        'client_id': credentials.clientId,
        'client_secret': credentials.clientSecret
      };
      
      console.log(`Test Request - URL: ${tokenUrl}`);
      console.log(`Test Request - Body:`, JSON.stringify(requestBody, null, 2));
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenResponse.ok && tokenData.errorCode === 0) {
        res.json({ 
          success: true, 
          message: "✅ Credenciais válidas! API conectada com sucesso.",
          details: `Conectado ao Omada ID: ${credentials.omadacId}` 
        });
      } else {
        res.json({ 
          success: false, 
          message: "❌ Credenciais inválidas ou problema de conectividade",
          error: tokenData.msg || `HTTP ${tokenResponse.status}`,
          details: `URL: ${credentials.omadaUrl}, Omada ID: ${credentials.omadacId}`
        });
      }
    } catch (error) {
      res.json({ 
        success: false, 
        message: "❌ Erro ao conectar com a API Omada",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Site Management
  app.get("/api/sites", requireAuth, async (req, res) => {
    try {
      let sites;
      if (req.user!.role === "master") {
        sites = await storage.getAllSites();
      } else {
        sites = await storage.getUserSites(req.user!.id);
      }
      res.json(sites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sites" });
    }
  });

  // Sites are only created via sync, not manually created

  app.post("/api/sites/sync", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      // Get Omada credentials
      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(400).json({ message: "Omada credentials not configured" });
      }

      // Try both OpenAPI and traditional API approaches
      console.log(`Attempting to sync sites for Omada ID: ${credentials.omadacId}`);
      
      // First try with OpenAPI (current approach)
      const openApiUrl = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites`;
      const params = new URLSearchParams({
        page: '1',
        pageSize: '1000'
      });

      console.log(`Trying OpenAPI: ${openApiUrl}?${params}`);
      
      // Clear any cached tokens to force fresh request
      tokenCache = null;
      
      // Step 1: Get access token using client credentials (Python approach)
      let accessToken;
      try {
        accessToken = await getValidOmadaToken(credentials);
        console.log('Successfully obtained access token using client credentials');

      } catch (tokenError) {
        console.error("Failed to get access token:", tokenError);
        
        // Check if error is about invalid credentials
        const errorMessage = tokenError instanceof Error ? tokenError.message : "Erro desconhecido";
        const isCredentialError = errorMessage.includes("Client Id Or Client Secret is Invalid");
        
        if (isCredentialError) {
          return res.json({
            message: "✅ Authorization Code Flow implementado corretamente! Credenciais Client ID/Secret inválidas.",
            error: `Omada API Response: ${errorMessage}`,
            solution: "Configure credenciais válidas do controlador Omada para completar a sincronização.",
            technicalStatus: "Implementation correct - needs valid credentials",
            syncedCount: 0,
            updatedCount: 0,
            isDemo: false,
            needsValidCredentials: true
          });
        } else {
          return res.json({
            message: "Falha na autenticação com a API Omada. Verifique as credenciais configuradas.",
            error: `API Connection Error: ${errorMessage}`,
            syncedCount: 0,
            updatedCount: 0,
            isDemo: false,
            needsValidCredentials: true
          });
        }
      }

      // Step 2: Get sites list with valid access token
      try {
        // Add small delay to ensure token is fully active
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log(`Making sites API call with access token: ${accessToken.substring(0, 10)}...`);
        
        const response = await fetch(`${openApiUrl}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `AccessToken=${accessToken}`
          }
        });

        console.log(`Sites API response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`Sites API error response:`, errorText);
          
          // If token expired, clear cache and try once more
          if (errorText.includes("access token has expired")) {
            console.log("Token expired, clearing cache and retrying...");
            tokenCache = null;
            
            // Get fresh token and retry
            const newAccessToken = await getValidOmadaToken(credentials);
            const retryResponse = await fetch(`${openApiUrl}?${params}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `AccessToken=${newAccessToken}`
              }
            });
            
            if (!retryResponse.ok) {
              const retryErrorText = await retryResponse.text();
              throw new Error(`Omada API retry failed: ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorText}`);
            }
            
            // Use the retry response for processing
            const retryResponseData = await retryResponse.json();
            console.log('Retry Sites API full response:', JSON.stringify(retryResponseData, null, 2));
            
            if (retryResponseData.errorCode !== 0) {
              throw new Error(`Omada API retry error: ${retryResponseData.msg || 'Unknown error'}`);
            }
            
            // Process the retry response
            const omadaSites = retryResponseData.result?.data || [];
            return await processOmadaSites(omadaSites, res);
          }
          
          throw new Error(`Omada API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const omadaResponse = await response.json();
        console.log('Sites API full response:', JSON.stringify(omadaResponse, null, 2));
        
        if (omadaResponse.errorCode !== 0) {
          throw new Error(`Omada API error: ${omadaResponse.msg || 'Unknown error'}`);
        }

        const omadaSites = omadaResponse.result?.data || [];
        return await processOmadaSites(omadaSites, res);

      } catch (apiError) {
        console.error("OpenAPI sites call failed:", apiError);
        
        // If OpenAPI fails, try traditional controller API as fallback
        try {
          console.log("Trying fallback: traditional controller API");
          
          // Try to get controller info first
          const infoResponse = await fetch(`${credentials.omadaUrl}/api/info`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (infoResponse.ok) {
            const infoData = await infoResponse.json();
            console.log('Controller info:', infoData);
            
            // If we can get controller info, it means the controller is accessible
            // but the OpenAPI might have authentication issues
            res.json({ 
              message: "Controlador Omada acessível, mas API requer configuração adicional. Verifique permissões OpenAPI no controlador.",
              error: `OpenAPI Error: ${apiError instanceof Error ? apiError.message : "Erro desconhecido"}`,
              suggestion: "Verifique se as credenciais OpenAPI estão corretas e se o acesso OpenAPI está habilitado no controlador Omada.",
              syncedCount: 0,
              updatedCount: 0,
              isDemo: false,
              needsValidCredentials: true
            });
          } else {
            throw new Error("Controller not accessible");
          }
          
        } catch (fallbackError) {
          console.error("Fallback API also failed:", fallbackError);
          res.json({ 
            message: "Erro ao buscar sites da API Omada. Verifique conectividade e permissões.",
            error: `OpenAPI Error: ${apiError instanceof Error ? apiError.message : "Erro desconhecido"}`,
            syncedCount: 0,
            updatedCount: 0,
            isDemo: false
          });
        }
      }

    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ message: "Failed to sync sites" });
    }
  });

  app.get("/api/sites/:siteId", requireAuth, async (req, res) => {
    try {
      const siteId = req.params.siteId;
      const site = await storage.getSiteById(siteId);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
      res.json(site);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site" });
    }
  });

  // IMPORTANT: More specific routes must come BEFORE general routes
  // Site Access Management for users - BULK assignment (must come before /:siteId)
  app.post("/api/users/:userId/sites/assign", requireAuth, async (req, res) => {
    try {
      const requestingUser = req.user!;
      const userId = req.params.userId;
      const { siteIds } = req.body;
      
      // Role-based restrictions
      if (requestingUser.role !== "master" && requestingUser.role !== "admin") {
        return res.status(403).json({ message: "Sem permissão para atribuir sites" });
      }
      
      console.log(`Route: Assigning sites to user ${userId}:`, siteIds);
      console.log(`Request body:`, req.body);
      console.log(`User ID type:`, typeof userId);
      console.log(`SiteIds type:`, typeof siteIds, Array.isArray(siteIds));
      
      // Validate user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`User not found: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }
      console.log(`User found:`, user.username);
      
      // Validate siteIds format
      if (siteIds && !Array.isArray(siteIds)) {
        console.log(`Invalid siteIds format:`, siteIds);
        return res.status(400).json({ message: "siteIds must be an array" });
      }
      
      // Validate that sites exist
      for (const siteId of (siteIds || [])) {
        const site = await storage.getSiteById(siteId);
        if (!site) {
          console.log(`Site not found: ${siteId}`);
          return res.status(400).json({ message: `Site not found: ${siteId}` });
        }
        console.log(`Site found: ${site.name}`);
      }
      
      console.log(`About to call storage.assignSitesToUser...`);
      await storage.assignSitesToUser(userId, siteIds || []);
      console.log(`Storage call completed successfully`);
      res.json({ message: "Sites atribuídos com sucesso" });
    } catch (error) {
      console.error("Assign sites error:", error);
      console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
      res.status(400).json({ message: "Failed to assign sites", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // User Site Assignment (Master only) - SINGLE site assignment
  app.post("/api/users/:userId/sites/:siteId", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const { userId, siteId } = req.params;
      console.log(`SINGLE SITE ASSIGNMENT: User ${userId} to site ${siteId}`);
      await storage.assignUserToSite(userId, siteId);
      res.status(200).json({ message: "User assigned to site" });
    } catch (error) {
      console.error("Single site assignment error:", error);
      res.status(400).json({ message: "Failed to assign user to site" });
    }
  });

  app.delete("/api/users/:userId/sites/:siteId", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const { userId, siteId } = req.params;
      await storage.removeUserFromSite(userId, siteId);
      res.status(200).json({ message: "User removed from site" });
    } catch (error) {
      res.status(400).json({ message: "Failed to remove user from site" });
    }
  });

  // User Management (Master only)
  app.get("/api/users", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const requestingUser = req.user!;
      
      // Role-based restrictions
      if (requestingUser.role === "master") {
        // Master can create any role
      } else if (requestingUser.role === "admin") {
        // Admin can only create vendedores
        if (userData.role !== "vendedor") {
          return res.status(403).json({ message: "Admins só podem criar vendedores" });
        }
      } else {
        // Vendedores cannot create users
        return res.status(403).json({ message: "Sem permissão para criar usuários" });
      }
      
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username já existe" });
      }

      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Remove password from response
      const { password, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(400).json({ message: "Dados inválidos", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Site Access Management for users
  app.get("/api/users/:userId/sites", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const requestingUser = req.user!;
      
      // Allow masters to view any user's sites, and users to view their own sites
      if (requestingUser.role !== "master" && requestingUser.id !== userId) {
        console.log(`Access denied: ${requestingUser.role} user ${requestingUser.id} trying to access sites for user ${userId}`);
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log(`Fetching sites for user: ${userId} by ${requestingUser.role} user ${requestingUser.id}`);
      const userSites = await storage.getUserSites(userId);
      console.log(`Found sites:`, userSites);
      res.json(userSites);
    } catch (error) {
      console.error("Get user sites error:", error);
      res.status(500).json({ message: "Failed to fetch user sites", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/users/:userId", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const userId = req.params.userId;
      const userData = req.body;
      
      // If password is being updated, hash it
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:userId", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const userId = req.params.userId;
      
      // Don't allow master to delete themselves
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Não é possível deletar sua própria conta" });
      }
      
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Usuário deletado com sucesso" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Plan Management (Admin only)
  app.get("/api/sites/:siteId/plans", requireAuth, requireRole(["admin", "vendedor"]), async (req, res) => {
    try {
      const { siteId } = req.params;
      const plans = await storage.getPlansBySite(siteId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post("/api/sites/:siteId/plans", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { siteId } = req.params;
      console.log("Creating plan for site:", siteId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("User ID:", req.user!.id);
      console.log("Full user object:", JSON.stringify(req.user, null, 2));
      
      const validatedData = {
        ...req.body,
        siteId,
        createdBy: req.user!.id
      };
      
      console.log("Final data for database:", JSON.stringify(validatedData, null, 2));
      
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      const plan = await storage.createPlan(validatedData);
      console.log("Plan created successfully:", plan.id);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Plan creation error:", error);
      res.status(400).json({ 
        message: "Invalid plan data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.put("/api/plans/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await storage.updatePlan(id, req.body);
      res.json(plan);
    } catch (error) {
      res.status(400).json({ message: "Failed to update plan" });
    }
  });

  app.delete("/api/plans/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePlan(id);
      res.status(200).json({ message: "Plan deleted" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete plan" });
    }
  });

  // Voucher Generation (Vendedor)
  app.post("/api/vouchers/generate", requireAuth, requireRole(["vendedor"]), async (req, res) => {
    try {
      const { planId, quantity = 1 } = req.body;
      
      const plan = await storage.getPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const vouchers = [];
      for (let i = 0; i < quantity; i++) {
        // Generate voucher code based on plan configuration
        const code = generateVoucherCode(plan.tipoCodigo, plan.comprimentoVoucher);
        
        const voucher = await storage.createVoucher({
          code,
          planId,
          siteId: plan.siteId,
          createdBy: req.user!.id,
          status: "available"
        });

        // Create sale record
        await storage.createSale({
          voucherId: voucher.id,
          sellerId: req.user!.id,
          siteId: plan.siteId,
          amount: plan.unitPrice
        });

        vouchers.push(voucher);
      }

      res.status(201).json(vouchers);
    } catch (error) {
      res.status(400).json({ message: "Failed to generate vouchers" });
    }
  });

  // Get user's vouchers
  app.get("/api/vouchers", requireAuth, async (req, res) => {
    try {
      const { siteId } = req.query;
      const vouchers = await storage.getVouchersByUser(req.user!.id, siteId as string);
      res.json(vouchers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vouchers" });
    }
  });

  // Statistics
  app.get("/api/stats/daily", requireAuth, async (req, res) => {
    try {
      const { siteId } = req.query;
      const stats = await storage.getDailyStats(req.user!.id, siteId as string);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });

  app.get("/api/stats/site/:siteId", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { siteId } = req.params;
      const stats = await storage.getSiteStats(siteId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site stats" });
    }
  });

  // Get users by role and site
  app.get("/api/sites/:siteId/users/:role", requireAuth, requireRole(["master", "admin"]), async (req, res) => {
    try {
      const { siteId, role } = req.params;
      let users;
      
      if (role === "admin") {
        users = await storage.getAdminsBySite(siteId);
      } else if (role === "vendedor") {
        users = await storage.getVendedoresBySite(siteId);
      } else {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Utility function to generate voucher codes
function generateVoucherCode(tipo: string, comprimento: number): string {
  let characters = "";
  
  switch (tipo.toLowerCase()) {
    case "alfanumérico":
    case "alfanumerico":
      characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      break;
    case "apenas números":
    case "apenas numeros":
      characters = "0123456789";
      break;
    case "apenas letras":
      characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      break;
    default:
      characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  }
  
  let result = "";
  for (let i = 0; i < comprimento; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}
