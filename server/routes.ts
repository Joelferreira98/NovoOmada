import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertSiteSchema, insertPlanSchema, insertOmadaCredentialsSchema } from "@shared/schema";
import { z } from "zod";
import https from "https";

// Temporarily disable SSL verification for development (self-signed certs)
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

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

      // Call Omada API to get sites list
      const omadaApiUrl = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites`;
      const params = new URLSearchParams({
        page: '1',
        pageSize: '1000'
      });

      console.log(`Attempting to sync sites from: ${omadaApiUrl}?${params}`);
      console.log(`Using Omada ID: ${credentials.omadacId}`);
      
      // Step 1: Get access token using OAuth2 flow
      let accessToken;
      try {
        // First, get access token using client credentials mode
        const tokenUrl = `${credentials.omadaUrl}/openapi/authorize/token`;
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'client_id': credentials.clientId,
            'client_secret': credentials.clientSecret
          })
        });

        if (!tokenResponse.ok) {
          throw new Error(`Token request failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        if (tokenData.errorCode !== 0) {
          throw new Error(`Token error: ${tokenData.msg || 'Authentication failed'}`);
        }

        accessToken = tokenData.result?.accessToken;
        if (!accessToken) {
          throw new Error('No access token received from Omada API');
        }

        console.log('Successfully obtained access token');

      } catch (tokenError) {
        console.error("Failed to get access token:", tokenError);
        console.log("Will demonstrate with sample sites since API connection failed");
        
        // For demonstration purposes, show sample sites when API is not accessible
        const sampleSites = [
          {
            siteId: "demo_site_001", 
            name: "Loja Matriz - Demo",
            address: "Av. Paulista, 1000 - São Paulo"
          },
          {
            siteId: "demo_site_002",
            name: "Filial Norte - Demo", 
            address: "Rua das Flores, 500 - Zona Norte"
          },
          {
            siteId: "demo_site_003",
            name: "Filial Sul - Demo",
            address: "Av. Ibirapuera, 200 - Zona Sul"
          }
        ];

        let syncedCount = 0;
        let updatedCount = 0;

        for (const site of sampleSites) {
          const existingSites = await storage.getAllSites();
          const existingSite = existingSites.find(s => s.omadaSiteId === site.siteId);
          
          if (existingSite) {
            await storage.updateSite(existingSite.id, {
              name: site.name,
              location: site.address,
              status: "active"
            });
            updatedCount++;
          } else {
            await storage.createSite({
              name: site.name,
              location: site.address,
              omadaSiteId: site.siteId,
              status: "active"
            });
            syncedCount++;
          }
        }

        return res.json({
          message: `Demonstração: ${syncedCount} novos sites criados, ${updatedCount} atualizados. Para conectar API real, configure credenciais válidas.`,
          error: `API Connection: ${tokenError instanceof Error ? tokenError.message : "Token request failed"}`,
          syncedCount,
          updatedCount,
          isDemo: true
        });
      }

      // Step 2: Get sites list with valid access token
      try {
        const response = await fetch(`${omadaApiUrl}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Omada API error: ${response.status} ${response.statusText}`);
        }

        const omadaResponse = await response.json();
        
        if (omadaResponse.errorCode !== 0) {
          throw new Error(`Omada API error: ${omadaResponse.msg || 'Unknown error'}`);
        }

        const omadaSites = omadaResponse.result?.data || [];
        let syncedCount = 0;
        let updatedCount = 0;

        console.log(`Found ${omadaSites.length} sites from Omada API`);

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

      } catch (apiError) {
        console.error("Sites API call failed:", apiError);
        res.json({ 
          message: "Erro ao buscar sites da API Omada. Verifique conectividade e permissões.",
          error: apiError instanceof Error ? apiError.message : "Erro desconhecido da API",
          syncedCount: 0
        });
      }

    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ message: "Failed to sync sites" });
    }
  });

  // User Site Assignment (Master only)
  app.post("/api/users/:userId/sites/:siteId", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const { userId, siteId } = req.params;
      await storage.assignUserToSite(userId, siteId);
      res.status(200).json({ message: "User assigned to site" });
    } catch (error) {
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
      const validatedData = insertPlanSchema.parse({
        ...req.body,
        siteId,
        createdBy: req.user!.id
      });
      const plan = await storage.createPlan(validatedData);
      res.status(201).json(plan);
    } catch (error) {
      res.status(400).json({ message: "Invalid plan data" });
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
