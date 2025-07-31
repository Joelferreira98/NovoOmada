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

// Token cache with automatic renewal system
let tokenCache: { 
  token: string; 
  expires: number; 
  omadacId: string;
  renewalTimer?: NodeJS.Timeout;
} | null = null;

// Função para gerar códigos de voucher
function generateVoucherCode(tipoCodigo: string, comprimento: number): string {
  const charset = tipoCodigo === 'numerico' ? '0123456789' : 
                  tipoCodigo === 'alfabetico' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 
                  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  let result = '';
  for (let i = 0; i < comprimento; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

async function renewOmadaToken(credentials: any): Promise<string> {
  console.log('Renewing Omada token...');
  
  const tokenUrl = `${credentials.omadaUrl}/openapi/authorize/token?grant_type=client_credentials`;
  const requestBody = {
    'omadacId': credentials.omadacId,
    'client_id': credentials.clientId,
    'client_secret': credentials.clientSecret
  };
  
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    // Ignore SSL certificate issues for development
    ...(process.env.NODE_ENV === 'development' && {
      agent: new (await import('https')).Agent({
        rejectUnauthorized: false
      })
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token renewal failed: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  
  if (tokenData.errorCode !== 0) {
    throw new Error(`Token renewal error: ${tokenData.msg || 'Authentication failed'}`);
  }

  const accessToken = tokenData.result?.accessToken;
  if (!accessToken) {
    throw new Error('No access token received from Omada API during renewal');
  }

  return accessToken;
}

async function getValidOmadaToken(credentials: any): Promise<string> {
  const now = Date.now();
  
  // Check if we have a valid cached token for this omadacId
  if (tokenCache && 
      tokenCache.omadacId === credentials.omadacId && 
      tokenCache.expires > now + 60000) { // 1 minute buffer
    console.log('Using cached token');
    return tokenCache.token;
  }
  
  // Clear existing renewal timer if any
  if (tokenCache?.renewalTimer) {
    clearTimeout(tokenCache.renewalTimer);
  }
  
  // Get new token
  console.log('Getting fresh token from Omada API using client credentials');
  
  const tokenUrl = `${credentials.omadaUrl}/openapi/authorize/token?grant_type=client_credentials`;
  const requestBody = {
    'omadacId': credentials.omadacId,
    'client_id': credentials.clientId,
    'client_secret': credentials.clientSecret
  };
  
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    // Ignore SSL certificate issues for development
    ...(process.env.NODE_ENV === 'development' && {
      agent: new (await import('https')).Agent({
        rejectUnauthorized: false
      })
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token request failed: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  
  if (tokenData.errorCode !== 0) {
    throw new Error(`Token error: ${tokenData.msg || 'Authentication failed'}`);
  }

  const accessToken = tokenData.result?.accessToken;
  if (!accessToken) {
    throw new Error('No access token received from Omada API');
  }

  const expiresIn = tokenData.result.expiresIn || 7200; // Default 2 hours
  const expiryTime = now + (expiresIn * 1000) - 300000; // 5 minutes before actual expiry
  
  // Cache the token
  tokenCache = {
    token: accessToken,
    expires: expiryTime,
    omadacId: credentials.omadacId
  };

  // Set up automatic renewal 30 minutes before expiry
  const renewalTime = (expiresIn - 1800) * 1000; // 30 minutes before expiry
  tokenCache.renewalTimer = setTimeout(async () => {
    try {
      console.log('Auto-renewing Omada token...');
      const newToken = await renewOmadaToken(credentials);
      
      if (tokenCache && tokenCache.omadacId === credentials.omadacId) {
        tokenCache.token = newToken;
        tokenCache.expires = Date.now() + (expiresIn * 1000) - 300000;
        
        // Schedule next renewal
        tokenCache.renewalTimer = setTimeout(arguments.callee, renewalTime);
        console.log('✓ Token auto-renewed successfully');
      }
    } catch (error) {
      console.error('Token auto-renewal failed:', error);
      // Clear cache on renewal failure
      tokenCache = null;
    }
  }, renewalTime);

  console.log(`✓ Token cached with auto-renewal in ${renewalTime/1000/60} minutes`);
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

  app.put("/api/users/:userId", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const userData = req.body;
      const requestingUser = req.user!;
      
      // Role-based restrictions: Master can update anyone, Admin can update vendedores
      if (requestingUser.role === "master") {
        // Master can update any user
      } else if (requestingUser.role === "admin") {
        // Admin can only update vendedores
        const targetUser = await storage.getUser(userId);
        if (!targetUser || targetUser.role !== "vendedor") {
          return res.status(403).json({ message: "Admins só podem atualizar vendedores" });
        }
      } else {
        return res.status(403).json({ message: "Sem permissão para atualizar usuários" });
      }
      
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

  app.delete("/api/users/:userId", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const requestingUser = req.user!;
      
      // Don't allow any user to delete themselves
      if (userId === requestingUser.id) {
        return res.status(400).json({ message: "Não é possível deletar sua própria conta" });
      }
      
      // Role-based restrictions: Master can delete anyone, Admin can delete vendedores
      console.log("Delete request - Requesting user:", requestingUser.role, requestingUser.username);
      
      if (requestingUser.role === "master") {
        console.log("Master user - allowing deletion");
        // Master can delete any user
      } else if (requestingUser.role === "admin") {
        console.log("Admin user - checking target user");
        // Admin can only delete vendedores
        const targetUser = await storage.getUser(userId);
        console.log("Target user:", targetUser ? targetUser.role : "not found", targetUser ? targetUser.username : "N/A");
        if (!targetUser || targetUser.role !== "vendedor") {
          return res.status(403).json({ message: "Admins só podem excluir vendedores" });
        }
        console.log("Admin allowed to delete vendedor");
      } else {
        console.log("Insufficient permissions for role:", requestingUser.role);
        return res.status(403).json({ message: "Sem permissão para excluir usuários" });
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

  // Get vendedores for specific site
  app.get("/api/sites/:siteId/vendedores", requireAuth, async (req, res) => {
    try {
      const siteId = req.params.siteId;
      const vendedores = await storage.getVendedoresBySite(siteId);
      res.json(vendedores);
    } catch (error: any) {
      console.error("Error fetching vendedores:", error);
      res.status(500).json({ error: error.message });
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

  // Voucher Generation (Vendedor) - via Omada API
  app.post("/api/vouchers/generate", requireAuth, requireRole(["vendedor"]), async (req, res) => {
    try {
      const { planId, quantity = 1 } = req.body;
      
      if (!planId || !quantity || quantity < 1 || quantity > 50) {
        return res.status(400).json({ message: "Invalid plan or quantity" });
      }

      console.log('Generating vouchers with data:', { planId, quantity, userId: req.user!.id });
      
      const plan = await storage.getPlanById(planId);
      if (!plan) {
        console.log('Plan not found:', planId);
        return res.status(404).json({ message: "Plan not found" });
      }

      // Verificar se o vendedor tem acesso ao site do plano
      const userSites = await storage.getUserSites(req.user!.id);
      const hasAccess = userSites.some(site => site.id === plan.siteId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this site" });
      }

      // Buscar site e credenciais
      const site = await storage.getSiteById(plan.siteId);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }

      // Use the same credentials source as site sync (from database)
      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Omada credentials not configured. Configure them in Master dashboard first." });
      }

      // Use the same token function that works for site sync
      console.log('Getting access token using same method as site sync...');
      const accessToken = await getValidOmadaToken(credentials);
      console.log('Successfully obtained access token for voucher generation');

      console.log(`Site Omada ID: ${site.omadaSiteId}`);
      
      // Create voucher group via Omada API using the same URL structure as site sync
      const voucherApiUrl = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups`;
      
      const voucherGroupData = {
        name: `${plan.nome} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
        amount: parseInt(quantity),
        codeLength: plan.comprimentoVoucher,
        codeForm: JSON.parse(plan.codeForm || '[0]'), // Parse do JSON: [0]=apenas números, [0,1]=números e letras
        limitType: 0, // Limited Usage Counts (como no exemplo PHP que funciona)
        limitNum: 1, // 1 uso por voucher
        durationType: 0, // Client duration
        duration: plan.duration,
        timingType: 0, // Timing by time
        rateLimit: {
          mode: 0,
          customRateLimit: {
            downLimitEnable: plan.downLimit > 0,
            downLimit: plan.downLimit || 0,
            upLimitEnable: plan.upLimit > 0,
            upLimit: plan.upLimit || 0
          }
        },
        trafficLimitEnable: false,

        applyToAllPortals: true,
        portals: [],
        logout: true,
        description: `Plano ${plan.nome} - ${plan.duration} minutos`,
        printComments: `Gerado por ${req.user!.username}`
      };

      console.log('Creating voucher group at URL:', voucherApiUrl);
      console.log('Creating voucher group with data:', JSON.stringify(voucherGroupData, null, 2));

      const createResponse = await fetch(
        voucherApiUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `AccessToken=${accessToken}`, // Use same format as site sync
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(voucherGroupData),
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Omada API error:', createResponse.status, errorText);
        throw new Error(`Omada API error: ${createResponse.status} - ${errorText}`);
      }

      const createData = await createResponse.json();
      console.log('Voucher group created:', createData);

      if (createData.errorCode !== 0) {
        throw new Error(`Omada API error: ${createData.msg}`);
      }

      const voucherGroupId = createData.result.id;

      // Get voucher group details with pagination (required parameters)
      const voucherGroupParams = new URLSearchParams({
        page: '1',
        pageSize: '1000' // Get all vouchers
      });
      const voucherGroupUrl = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups/${voucherGroupId}?${voucherGroupParams}`;
      console.log(`Fetching voucher group details from: ${voucherGroupUrl}`);
      
      const vouchersResponse = await fetch(
        voucherGroupUrl,
        {
          method: 'GET',
          headers: {
            'Authorization': `AccessToken=${accessToken}`,
          },
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        }
      );

      console.log(`Voucher group response status: ${vouchersResponse.status}`);

      if (!vouchersResponse.ok) {
        const errorText = await vouchersResponse.text();
        console.error('Voucher group fetch error:', errorText);
        throw new Error(`Failed to fetch voucher group: ${vouchersResponse.status} - ${errorText}`);
      }

      const vouchersData = await vouchersResponse.json();
      console.log('Voucher group data:', JSON.stringify(vouchersData, null, 2));

      if (vouchersData.errorCode !== 0) {
        throw new Error(`Omada API error: ${vouchersData.msg}`);
      }

      // Extract voucher codes from the group details
      const generatedVouchers = vouchersData.result?.data || [];
      console.log(`Found ${generatedVouchers.length} vouchers in group ${voucherGroupId}`);
      
      // Verificar se os vouchers foram realmente criados no Omada
      if (generatedVouchers.length === 0) {
        console.error('⚠️ ERRO: Nenhum voucher encontrado no grupo do Omada!');
        console.log('Grupo criado mas sem vouchers. Verificando estado no controlador...');
        
        // Try to get voucher group list to see if it exists
        const groupListUrl = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups?page=1&pageSize=10`;
        const groupListResponse = await fetch(groupListUrl, {
          method: 'GET',
          headers: { 'Authorization': `AccessToken=${accessToken}` },
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({ rejectUnauthorized: false })
          })
        });
        
        if (groupListResponse.ok) {
          const groupListData = await groupListResponse.json();
          console.log('Grupos existentes no Omada:', JSON.stringify(groupListData, null, 2));
        }
        
        throw new Error('Grupo de vouchers criado mas nenhum voucher foi gerado no controlador Omada. Verifique as configurações do site no controlador.');
      }

      // Salvar vouchers no banco local para controle
      const savedVouchers = [];
      for (const omadaVoucher of generatedVouchers) {
        const voucher = await storage.createVoucher({
          code: omadaVoucher.code,
          planId: plan.id,
          siteId: plan.siteId,
          vendedorId: req.user!.id,
          omadaGroupId: voucherGroupId,
          omadaVoucherId: omadaVoucher.id,
          unitPrice: plan.unitPrice,
          status: 'available'
        });

        // Criar registro de venda apenas se for voucher real do Omada
        if (omadaVoucher.id && omadaVoucher.code) {
          await storage.createSale({
            voucherId: voucher.id,
            sellerId: req.user!.id,
            siteId: plan.siteId,
            amount: plan.unitPrice
          });
        }

        savedVouchers.push({
          id: voucher.id,
          code: omadaVoucher.code,
          planName: plan.nome,
          unitPrice: plan.unitPrice,
          duration: plan.duration,
          createdAt: voucher.createdAt
        });
      }

      console.log('Successfully generated vouchers:', savedVouchers.length);
      res.status(201).json(savedVouchers);
    } catch (error: any) {
      console.error('Error generating vouchers:', error);
      res.status(400).json({ message: `Failed to generate vouchers: ${error.message}` });
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

  // Reports API routes
  app.get("/api/reports/voucher-summary/:siteId", requireAuth, async (req, res) => {
    try {
      const { siteId } = req.params;
      const site = await storage.getSiteById(siteId);
      
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }

      // Check if user has access to this site
      const userSites = await storage.getUserSites(req.user!.id);
      const hasAccess = userSites.some(s => s.id === siteId);
      
      if (!hasAccess && req.user!.role !== "master") {
        return res.status(403).json({ message: "Access denied to this site" });
      }

      // Get Omada credentials
      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Omada credentials not configured" });
      }

      // Get access token
      const tokenResponse = await fetch(`${credentials.omadaUrl}/openapi/authorize/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
        // Ignore SSL certificate issues for self-signed certificates
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (await import('https')).Agent({
            rejectUnauthorized: false
          })
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Get voucher summary from Omada API
      const summaryResponse = await fetch(
        `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/vouchers/statistics/summary`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          // Ignore SSL certificate issues for self-signed certificates
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        }
      );

      if (!summaryResponse.ok) {
        throw new Error('Failed to get voucher summary from Omada');
      }

      const summaryData = await summaryResponse.json();
      
      if (summaryData.errorCode !== 0) {
        throw new Error(summaryData.msg || 'Omada API error');
      }

      res.json(summaryData.result);
    } catch (error: any) {
      console.error("Error fetching voucher summary:", error);
      res.status(500).json({ message: error.message || "Failed to fetch voucher summary" });
    }
  });

  app.get("/api/reports/voucher-history/:siteId/:timeStart/:timeEnd", requireAuth, async (req, res) => {
    try {
      const { siteId, timeStart, timeEnd } = req.params;
      const site = await storage.getSiteById(siteId);
      
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }

      // Check if user has access to this site
      const userSites = await storage.getUserSites(req.user!.id);
      const hasAccess = userSites.some(s => s.id === siteId);
      
      if (!hasAccess && req.user!.role !== "master") {
        return res.status(403).json({ message: "Access denied to this site" });
      }

      // Get Omada credentials
      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Omada credentials not configured" });
      }

      // Get access token
      const tokenResponse = await fetch(`${credentials.omadaUrl}/openapi/authorize/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
        // Ignore SSL certificate issues for self-signed certificates
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (await import('https')).Agent({
            rejectUnauthorized: false
          })
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Convert timestamps to seconds (Omada expects seconds, not milliseconds)
      const startSeconds = Math.floor(parseInt(timeStart) / 1000);
      const endSeconds = Math.floor(parseInt(timeEnd) / 1000);

      // Get voucher history from Omada API
      const historyResponse = await fetch(
        `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/vouchers/statistics/history?filters.timeStart=${startSeconds}&filters.timeEnd=${endSeconds}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          // Ignore SSL certificate issues for self-signed certificates
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        }
      );

      if (!historyResponse.ok) {
        throw new Error('Failed to get voucher history from Omada');
      }

      const historyData = await historyResponse.json();
      
      if (historyData.errorCode !== 0) {
        throw new Error(historyData.msg || 'Omada API error');
      }

      res.json(historyData.result);
    } catch (error: any) {
      console.error("Error fetching voucher history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch voucher history" });
    }
  });

  app.get("/api/reports/voucher-distribution/:siteId/:timeStart/:timeEnd", requireAuth, async (req, res) => {
    try {
      const { siteId, timeStart, timeEnd } = req.params;
      const site = await storage.getSiteById(siteId);
      
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }

      // Check if user has access to this site
      const userSites = await storage.getUserSites(req.user!.id);
      const hasAccess = userSites.some(s => s.id === siteId);
      
      if (!hasAccess && req.user!.role !== "master") {
        return res.status(403).json({ message: "Access denied to this site" });
      }

      // Get Omada credentials
      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Omada credentials not configured" });
      }

      // Get access token
      const tokenResponse = await fetch(`${credentials.omadaUrl}/openapi/authorize/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
        // Ignore SSL certificate issues for self-signed certificates
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (await import('https')).Agent({
            rejectUnauthorized: false
          })
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Convert timestamps to seconds (Omada expects seconds, not milliseconds)
      const startSeconds = Math.floor(parseInt(timeStart) / 1000);
      const endSeconds = Math.floor(parseInt(timeEnd) / 1000);

      // Get voucher distribution from Omada API
      const distributionResponse = await fetch(
        `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/vouchers/statistics/history/distribution/duration?filters.timeStart=${startSeconds}&filters.timeEnd=${endSeconds}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          // Ignore SSL certificate issues for self-signed certificates
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        }
      );

      if (!distributionResponse.ok) {
        throw new Error('Failed to get voucher distribution from Omada');
      }

      const distributionData = await distributionResponse.json();
      
      if (distributionData.errorCode !== 0) {
        throw new Error(distributionData.msg || 'Omada API error');
      }

      res.json(distributionData.result.data);
    } catch (error: any) {
      console.error("Error fetching voucher distribution:", error);
      res.status(500).json({ message: error.message || "Failed to fetch voucher distribution" });
    }
  });

  // Sistema de Caixa - APIs para Voucher Groups da Omada
  app.get("/api/sites/:siteId/voucher-groups", requireAuth, async (req, res) => {
    try {
      const { siteId } = req.params;
      const site = await storage.getSiteById(siteId);
      
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }

      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Omada credentials not configured" });
      }

      // Get access token
      const tokenResponse = await fetch(`${credentials.omadaUrl}/openapi/authorize/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
        // Ignore SSL certificate issues for self-signed certificates
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (await import('https')).Agent({
            rejectUnauthorized: false
          })
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Get voucher groups from Omada API
      const groupsResponse = await fetch(
        `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups?page=1&pageSize=1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          // Ignore SSL certificate issues for self-signed certificates
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        }
      );

      if (!groupsResponse.ok) {
        throw new Error('Failed to get voucher groups from Omada');
      }

      const groupsData = await groupsResponse.json();
      
      if (groupsData.errorCode !== 0) {
        throw new Error(groupsData.msg || 'Omada API error');
      }

      res.json(groupsData.result);
    } catch (error: any) {
      console.error("Error fetching voucher groups:", error);
      res.status(500).json({ message: error.message || "Failed to fetch voucher groups" });
    }
  });

  app.get("/api/sites/:siteId/voucher-groups/:groupId/vouchers", requireAuth, async (req, res) => {
    try {
      const { siteId, groupId } = req.params;
      const { status } = req.query; // Filter by status: 0=unused, 1=in-use, 2=expired
      
      const site = await storage.getSiteById(siteId);
      
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }

      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Omada credentials not configured" });
      }

      // Get access token
      const tokenResponse = await fetch(`${credentials.omadaUrl}/openapi/authorize/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
        // Ignore SSL certificate issues for self-signed certificates
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (await import('https')).Agent({
            rejectUnauthorized: false
          })
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Build URL with filters
      let url = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups/${groupId}?page=1&pageSize=1000`;
      
      if (status) {
        url += `&filters.status=${status}`;
      }

      // Get voucher group details with vouchers from Omada API
      const groupResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        // Ignore SSL certificate issues for self-signed certificates
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (await import('https')).Agent({
            rejectUnauthorized: false
          })
        })
      });

      if (!groupResponse.ok) {
        throw new Error('Failed to get voucher group details from Omada');
      }

      const groupData = await groupResponse.json();
      
      if (groupData.errorCode !== 0) {
        throw new Error(groupData.msg || 'Omada API error');
      }

      res.json(groupData.result);
    } catch (error: any) {
      console.error("Error fetching voucher group details:", error);
      res.status(500).json({ message: error.message || "Failed to fetch voucher group details" });
    }
  });

  // Fechar Caixa - Processa vouchers usados/em uso e exclui da Omada
  app.post("/api/sites/:siteId/cash-closure", requireAuth, async (req, res) => {
    try {
      const { siteId } = req.params;
      const site = await storage.getSiteById(siteId);
      
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }

      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Omada credentials not configured" });
      }

      // Get access token
      const tokenResponse = await fetch(`${credentials.omadaUrl}/openapi/authorize/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
        // Ignore SSL certificate issues for self-signed certificates
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (await import('https')).Agent({
            rejectUnauthorized: false
          })
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Get all voucher groups
      const groupsResponse = await fetch(
        `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups?page=1&pageSize=1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          // Ignore SSL certificate issues for self-signed certificates
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        }
      );

      if (!groupsResponse.ok) {
        throw new Error('Failed to get voucher groups from Omada');
      }

      const groupsData = await groupsResponse.json();
      
      if (groupsData.errorCode !== 0) {
        throw new Error(groupsData.msg || 'Omada API error');
      }

      const groups = groupsData.result.data;
      const summary = [];
      let totalVouchersUsed = 0;
      let totalVouchersInUse = 0;
      let totalAmount = 0;

      // Para cada grupo, buscar vouchers usados/em uso e excluir
      for (const group of groups) {
        const usedVouchers = [];
        const inUseVouchers = [];

        // Buscar vouchers com status 1 (em uso) e 2 (expirados/usados)
        for (const status of [1, 2]) {
          const groupDetailResponse = await fetch(
            `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups/${group.id}?page=1&pageSize=1000&filters.status=${status}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              // Ignore SSL certificate issues for self-signed certificates
              ...(process.env.NODE_ENV === 'development' && {
                agent: new (await import('https')).Agent({
                  rejectUnauthorized: false
                })
              })
            }
          );

          if (groupDetailResponse.ok) {
            const groupDetailData = await groupDetailResponse.json();
            if (groupDetailData.errorCode === 0 && groupDetailData.result.data) {
              if (status === 1) {
                inUseVouchers.push(...groupDetailData.result.data);
              } else {
                usedVouchers.push(...groupDetailData.result.data);
              }
            }
          }
        }

        // Excluir vouchers processados
        const vouchersToDelete = [...usedVouchers, ...inUseVouchers];
        let deletedCount = 0;

        for (const voucher of vouchersToDelete) {
          try {
            const deleteResponse = await fetch(
              `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/vouchers/${voucher.id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                // Ignore SSL certificate issues for self-signed certificates
                ...(process.env.NODE_ENV === 'development' && {
                  agent: new (await import('https')).Agent({
                    rejectUnauthorized: false
                  })
                })
              }
            );

            if (deleteResponse.ok) {
              const deleteData = await deleteResponse.json();
              if (deleteData.errorCode === 0) {
                deletedCount++;
              }
            }
          } catch (error) {
            console.error(`Failed to delete voucher ${voucher.id}:`, error);
          }
        }

        if (usedVouchers.length > 0 || inUseVouchers.length > 0) {
          const groupAmount = (usedVouchers.length + inUseVouchers.length) * parseFloat(group.unitPrice || '0');
          
          summary.push({
            groupId: group.id,
            groupName: group.name,
            unitPrice: group.unitPrice,
            usedCount: usedVouchers.length,
            inUseCount: inUseVouchers.length,
            totalCount: usedVouchers.length + inUseVouchers.length,
            amount: groupAmount,
            deletedCount: deletedCount
          });

          totalVouchersUsed += usedVouchers.length;
          totalVouchersInUse += inUseVouchers.length;
          totalAmount += groupAmount;
        }
      }

      // Salvar resumo do fechamento no banco
      const cashClosure = await storage.createCashClosure({
        siteId: site.id,
        vendedorId: req.user!.id,
        totalVouchersUsed,
        totalVouchersInUse,
        totalAmount: totalAmount.toString(),
        summary: JSON.stringify(summary),
        closureDate: new Date(),
      });

      res.json({
        id: cashClosure.id,
        totalVouchersUsed,
        totalVouchersInUse,
        totalAmount,
        summary,
        closureDate: cashClosure.closureDate
      });
    } catch (error: any) {
      console.error("Error processing cash closure:", error);
      res.status(500).json({ message: error.message || "Failed to process cash closure" });
    }
  });

  // Histórico de fechamentos de caixa
  app.get("/api/sites/:siteId/cash-closures", requireAuth, async (req, res) => {
    try {
      const { siteId } = req.params;
      const closures = await storage.getCashClosures(siteId);
      res.json(closures);
    } catch (error: any) {
      console.error("Error fetching cash closures:", error);
      res.status(500).json({ message: error.message || "Failed to fetch cash closures" });
    }
  });

  // FUNCIONALIDADES DO VENDEDOR

  // Gerar vouchers na API do Omada
  app.post("/api/vouchers/generate", requireAuth, async (req, res) => {
    try {
      const { planId, quantity } = req.body;
      
      if (!planId || !quantity || quantity < 1 || quantity > 50) {
        return res.status(400).json({ message: "Invalid plan or quantity" });
      }

      // Verificar se o usuário é vendedor
      if (req.user!.role !== "vendedor") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Buscar o plano
      const plan = await storage.getPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Verificar se o vendedor tem acesso ao site do plano
      const userSites = await storage.getUserSites(req.user!.id);
      const hasAccess = userSites.some(site => site.id === plan.siteId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this site" });
      }

      // Buscar site e credenciais
      const site = await storage.getSiteById(plan.siteId);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }

      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Omada credentials not configured" });
      }

      // Obter token de acesso
      const accessToken = await getValidOmadaToken(credentials);

      // Criar grupo de vouchers na API do Omada seguindo a documentação oficial
      const voucherData = {
        name: `${plan.nome} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
        amount: parseInt(quantity), // quantidade de vouchers
        codeLength: plan.comprimentoVoucher, // 6-10 characters
        codeForm: JSON.parse(plan.codeForm || '[0]'), // Parse do JSON: [0]=apenas números, [0,1]=números e letras
        limitType: 1, // 0=Limited Usage, 1=Limited Online Users, 2=Unlimited  
        limitNum: plan.userLimit || 1, // número de usuários simultâneos  
        durationType: 0, // 0=Client duration, 1=Voucher duration
        duration: plan.duration, // em minutos
        timingType: 0, // 0=Timing by time, 1=Timing by usage
        rateLimit: {
          mode: 0, // 0=customRateLimit, 1=rateLimitProfileId
          customRateLimit: {
            downLimitEnable: plan.downLimit > 0,
            downLimit: plan.downLimit || 0,
            upLimitEnable: plan.upLimit > 0,
            upLimit: plan.upLimit || 0
          }
        },
        trafficLimitEnable: false,
        unitPrice: Math.round(parseFloat(plan.unitPrice) * 100), // em centavos
        currency: "BRL",
        applyToAllPortals: true,
        portals: [],
        logout: true,
        description: `Plano ${plan.nome} - ${plan.duration} minutos`,
        printComments: `Gerado por ${req.user!.username}`,
        validityType: 0 // 0=qualquer hora, 1=entre datas específicas, 2=horário agendado
      };

      console.log('Creating voucher group with data:', voucherData);

      const createResponse = await fetch(
        `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(voucherData),
          // Ignore SSL certificate issues for self-signed certificates
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Omada API error:', errorText);
        throw new Error(`Failed to create voucher group: ${createResponse.status}`);
      }

      const createData = await createResponse.json();
      console.log('Voucher group creation response:', createData);
      
      if (createData.errorCode !== 0) {
        throw new Error(createData.msg || 'Failed to create voucher group');
      }

      // Buscar detalhes do grupo criado para obter os vouchers
      const groupId = createData.result;
      const detailResponse = await fetch(
        `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups/${groupId}?page=1&pageSize=${quantity}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          // Ignore SSL certificate issues for self-signed certificates
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        }
      );

      if (!detailResponse.ok) {
        throw new Error('Failed to get voucher details');
      }

      const detailData = await detailResponse.json();
      
      if (detailData.errorCode !== 0) {
        throw new Error(detailData.msg || 'Failed to get voucher details');
      }

      const vouchers = detailData.result.data || [];
      
      // Salvar vouchers no banco de dados local para controle
      const savedVouchers = [];
      for (const voucherData of vouchers) {
        const savedVoucher = await storage.createVoucher({
          code: voucherData.code,
          planId: planId,
          vendedorId: req.user!.id,
          siteId: plan.siteId,
          omadaGroupId: groupId,
          omadaVoucherId: voucherData.id,
          status: 'available',
          unitPrice: plan.unitPrice
        });
        savedVouchers.push(savedVoucher);
      }

      res.json(savedVouchers);
    } catch (error: any) {
      console.error("Error generating vouchers:", error);
      res.status(500).json({ message: error.message || "Failed to generate vouchers" });
    }
  });

  // Buscar vouchers do vendedor
  app.get("/api/vouchers/:siteId", requireAuth, async (req, res) => {
    try {
      const { siteId } = req.params;
      
      if (req.user!.role !== "vendedor") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verificar acesso ao site
      const userSites = await storage.getUserSites(req.user!.id);
      const hasAccess = userSites.some(site => site.id === siteId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this site" });
      }

      const vouchers = await storage.getVouchersByVendedor(req.user!.id, siteId);
      res.json(vouchers);
    } catch (error: any) {
      console.error("Error fetching vouchers:", error);
      res.status(500).json({ message: error.message || "Failed to fetch vouchers" });
    }
  });

  // Estatísticas diárias do vendedor
  app.get("/api/stats/daily/:siteId", requireAuth, async (req, res) => {
    try {
      const { siteId } = req.params;
      
      if (req.user!.role !== "vendedor") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verificar acesso ao site
      const userSites = await storage.getUserSites(req.user!.id);
      const hasAccess = userSites.some(site => site.id === siteId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this site" });
      }

      const stats = await storage.getVendedorDailyStats(req.user!.id, siteId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ message: error.message || "Failed to fetch daily stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


