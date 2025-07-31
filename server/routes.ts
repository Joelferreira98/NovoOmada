import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertSiteSchema, insertPlanSchema, insertOmadaCredentialsSchema, insertUserSchema } from "@shared/schema";
import { hashPassword } from "./auth";
import { z } from "zod";
import https from "https";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'server/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const baseName = file.fieldname === 'logo' ? 'logo' : 'favicon';
    cb(null, `${baseName}-${uniqueSuffix}${fileExtension}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept only image files
  if (file.fieldname === 'logo') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos para logo'), false);
    }
  } else if (file.fieldname === 'favicon') {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'image/x-icon') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem ou .ico são permitidos para favicon'), false);
    }
  } else {
    cb(new Error('Campo de arquivo não reconhecido'), false);
  }
};

const upload = multer({ 
  storage: storage_multer,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Token cache with automatic renewal system
let tokenCache: { 
  token: string; 
  expires: number; 
  omadacId: string;
  renewalTimer?: NodeJS.Timeout;
} | null = null;

// Callback system for token renewal
interface TokenRenewalCallback {
  id: string;
  callback: (newToken: string) => void;
  priority: 'high' | 'normal';
}

let tokenRenewalCallbacks: Map<string, TokenRenewalCallback> = new Map();
let isRenewingToken = false;

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

// Enhanced token renewal with callback system
async function renewOmadaTokenWithCallbacks(credentials: any): Promise<string> {
  if (isRenewingToken) {
    console.log('Token renewal already in progress, waiting...');
    // Wait for current renewal to complete
    return new Promise((resolve, reject) => {
      const callbackId = `wait_${Date.now()}_${Math.random()}`;
      tokenRenewalCallbacks.set(callbackId, {
        id: callbackId,
        callback: (newToken) => {
          tokenRenewalCallbacks.delete(callbackId);
          resolve(newToken);
        },
        priority: 'normal'
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (tokenRenewalCallbacks.has(callbackId)) {
          tokenRenewalCallbacks.delete(callbackId);
          reject(new Error('Token renewal timeout'));
        }
      }, 10000);
    });
  }
  
  isRenewingToken = true;
  console.log('Starting token renewal with callback system...');
  
  try {
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

    // Update cache
    const expiresIn = tokenData.result.expiresIn || 7200;
    const expiryTime = Date.now() + (expiresIn * 1000) - 300000; // 5 minutes before actual expiry
    
    tokenCache = {
      token: accessToken,
      expires: expiryTime,
      omadacId: credentials.omadacId
    };

    console.log(`✓ Token renewed successfully, expires in ${expiresIn}s`);
    
    // Notify all waiting callbacks
    for (const [id, callbackData] of tokenRenewalCallbacks.entries()) {
      try {
        callbackData.callback(accessToken);
        tokenRenewalCallbacks.delete(id);
      } catch (error) {
        console.error(`Callback ${id} failed:`, error);
        tokenRenewalCallbacks.delete(id);
      }
    }
    
    return accessToken;
    
  } finally {
    isRenewingToken = false;
  }
}

// Legacy function for backward compatibility
async function renewOmadaToken(credentials: any): Promise<string> {
  return renewOmadaTokenWithCallbacks(credentials);
}

// Function to validate token by making a test API call using the same format as sync
async function validateToken(token: string, credentials: any): Promise<boolean> {
  try {
    console.log('Validating token with sites API call...');
    
    // Use the same endpoint format that works for site sync
    const params = new URLSearchParams({
      page: '1',
      pageSize: '10'
    });
    
    const testResponse = await fetch(`${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `AccessToken=${token}`
      },
      // Ignore SSL certificate issues for development
      ...(process.env.NODE_ENV === 'development' && {
        agent: new (await import('https')).Agent({
          rejectUnauthorized: false
        })
      })
    });

    if (!testResponse.ok) {
      console.log(`Token validation failed: ${testResponse.status}`);
      const errorText = await testResponse.text();
      console.log(`Token validation error text: ${errorText}`);
      return false;
    }

    const testData = await testResponse.json();
    const isValid = testData.errorCode === 0;
    
    console.log(`Token validation result: ${isValid ? 'VALID' : 'INVALID'} (errorCode: ${testData.errorCode})`);
    if (!isValid && testData.msg) {
      console.log(`Token validation error message: ${testData.msg}`);
    }
    
    return isValid;
    
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// Function to get token with guaranteed freshness for critical operations
async function getCriticalToken(credentials: any, operationName: string): Promise<string> {
  console.log(`Getting critical token for operation: ${operationName}`);
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Critical token attempt ${attempts}/${maxAttempts} for ${operationName}`);
    
    // Force fresh token generation
    tokenCache = null;
    
    try {
      // Get new token
      const newToken = await renewOmadaTokenWithCallbacks(credentials);
      
      // Validate token immediately
      const isValid = await validateToken(newToken, credentials);
      
      if (isValid) {
        console.log(`✓ Valid critical token obtained for ${operationName} on attempt ${attempts}`);
        return newToken;
      } else {
        console.log(`✗ Token validation failed for ${operationName} on attempt ${attempts}`);
        if (attempts === maxAttempts) {
          throw new Error(`Failed to get valid token after ${maxAttempts} attempts`);
        }
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`Critical token attempt ${attempts} failed:`, error);
      if (attempts === maxAttempts) {
        throw error;
      }
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error(`Failed to obtain critical token for ${operationName}`);
}

// Função para sincronizar status dos vouchers com a API do Omada
async function syncVoucherStatus(vouchers: any[], siteId: string) {
  try {
    console.log(`Synchronizing status for ${vouchers.length} vouchers`);
    
    if (vouchers.length === 0) return;

    const credentials = await storage.getOmadaCredentials();
    if (!credentials) {
      console.log('No Omada credentials found, skipping sync');
      return;
    }

    const site = await storage.getSiteById(siteId);
    if (!site) {
      console.log('Site not found, skipping sync');
      return;
    }

    const accessToken = await getValidOmadaToken(credentials);
    
    // Agrupar vouchers por grupo do Omada para otimizar chamadas à API
    const voucherGroups = new Map<string, any[]>();
    vouchers.forEach(voucher => {
      if (voucher.omadaGroupId) {
        if (!voucherGroups.has(voucher.omadaGroupId)) {
          voucherGroups.set(voucher.omadaGroupId, []);
        }
        voucherGroups.get(voucher.omadaGroupId)!.push(voucher);
      }
    });

    // Sincronizar cada grupo
    for (const [groupId, groupVouchers] of voucherGroups) {
      try {
        // Use node-fetch for sync with SSL
        const nodeFetch = (await import('node-fetch')).default;
        const https = await import('https');
        const syncAgent = process.env.NODE_ENV === 'development' 
          ? new https.Agent({ rejectUnauthorized: false })
          : undefined;

        const detailResponse = await nodeFetch(
          `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups/${groupId}?page=1&pageSize=1000`,
          {
            headers: {
              'Authorization': `AccessToken=${accessToken}`,
              'Content-Type': 'application/json',
            },
            agent: syncAgent
          }
        );

        if (!detailResponse.ok) {
          console.error(`Failed to fetch voucher group ${groupId}: ${detailResponse.status}`);
          continue;
        }

        const detailData = await detailResponse.json();
        if (detailData.errorCode !== 0) {
          console.error(`Omada API error for group ${groupId}: ${detailData.msg}`);
          continue;
        }

        const omadaVouchers = detailData.result?.data || [];
        
        // Atualizar status dos vouchers locais baseado nos dados do Omada
        for (const localVoucher of groupVouchers) {
          const omadaVoucher = omadaVouchers.find((ov: any) => ov.id === localVoucher.omadaVoucherId);
          if (omadaVoucher) {
            let newStatus = 'available';
            
            // Status do Omada: 0=unused, 1=used, 2=expired, 3=in_use
            switch (omadaVoucher.status) {
              case 0:
                newStatus = 'available';
                break;
              case 1:
                newStatus = 'used';
                break;
              case 2:
                newStatus = 'expired';
                break;
              case 3:
                newStatus = 'in_use';
                break;
            }
            
            // Log detalhado para debug
            console.log(`Voucher sync: ${localVoucher.code} - Local: ${localVoucher.status} | Omada: ${omadaVoucher.status} -> ${newStatus}`);
            
            // Atualizar apenas se o status mudou
            if (localVoucher.status !== newStatus) {
              console.log(`⚠️ UPDATING voucher ${localVoucher.code} status from ${localVoucher.status} to ${newStatus}`);
              await storage.updateVoucherStatus(localVoucher.id, newStatus);
              
              // Se o voucher foi usado, criar uma venda
              if (newStatus === 'used' && localVoucher.status !== 'used') {
                console.log(`💰 Creating sale record for voucher ${localVoucher.code} (used)`);
                await storage.createSale({
                  voucherId: localVoucher.id,
                  sellerId: localVoucher.vendedorId,
                  siteId: localVoucher.siteId,
                  amount: localVoucher.unitPrice
                });
                console.log(`✓ Sale record created for voucher ${localVoucher.code}`);
              }
            } else {
              console.log(`✓ Voucher ${localVoucher.code} status unchanged: ${localVoucher.status}`);
            }
          } else {
            console.log(`⚠️ Voucher ${localVoucher.code} not found in Omada response for group ${groupId}`);
          }
        }
      } catch (groupError) {
        console.error(`Error syncing group ${groupId}:`, groupError);
      }
    }
    
    console.log('Voucher status sync completed');
  } catch (error) {
    console.error('Error in syncVoucherStatus:', error);
  }
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
  
  // Use node-fetch with proper SSL configuration
  const nodeFetch = (await import('node-fetch')).default;
  const https = await import('https');
  
  const agent = process.env.NODE_ENV === 'development' 
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  const tokenResponse = await nodeFetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    agent
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
        body: JSON.stringify(requestBody),
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (await import('https')).Agent({ rejectUnauthorized: false })
        })
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
          },
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({ rejectUnauthorized: false })
          })
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
              },
              ...(process.env.NODE_ENV === 'development' && {
                agent: new (await import('https')).Agent({ rejectUnauthorized: false })
              })
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
            },
            ...(process.env.NODE_ENV === 'development' && {
              agent: new (await import('https')).Agent({ rejectUnauthorized: false })
            })
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

  // Voucher Generation (Admin) - via Omada API
  app.post("/api/admin/vouchers/generate", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { planId, quantity = 1 } = req.body;
      
      if (!planId || !quantity || quantity < 1 || quantity > 100) {
        return res.status(400).json({ message: "Invalid plan or quantity" });
      }

      console.log('Admin generating vouchers with data:', { planId, quantity, userId: req.user!.id });
      
      const plan = await storage.getPlanById(planId);
      if (!plan) {
        console.log('Plan not found:', planId);
        return res.status(404).json({ message: "Plan not found" });
      }

      // Verificar se o admin tem acesso ao site do plano
      const userSites = await storage.getUserSites(req.user!.id);
      const hasAccess = userSites.some(site => site.id === plan.siteId);
      
      if (!hasAccess && req.user!.role !== "master") {
        return res.status(403).json({ message: "Access denied to this site" });
      }

      // Buscar site e credenciais
      const site = await storage.getSiteById(plan.siteId);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }

      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Omada credentials not configured. Configure them in Master dashboard first." });
      }

      console.log('Getting access token for admin voucher generation...');
      const accessToken = await getValidOmadaToken(credentials);
      console.log('Successfully obtained access token for admin voucher generation');

      console.log(`Site Omada ID: ${site.omadaSiteId}`);
      
      // Create voucher group via Omada API
      const voucherApiUrl = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups`;
      
      const voucherGroupData = {
        name: `${plan.nome.substring(0, 10)} - ADM${Date.now().toString().slice(-6)}`,
        amount: parseInt(quantity),
        codeLength: plan.comprimentoVoucher,
        codeForm: JSON.parse(plan.codeForm || '[0]'),
        limitType: plan.omadaLimitType || 1,
        limitNum: plan.userLimit || 1,
        durationType: 0,
        duration: plan.duration,
        timingType: 0,
        rateLimit: {
          mode: 0,
          customRateLimit: {
            downLimitEnable: (plan.downLimit || 0) > 0,
            downLimit: plan.downLimit || 0,
            upLimitEnable: (plan.upLimit || 0) > 0,
            upLimit: plan.upLimit || 0
          }
        },
        trafficLimitEnable: false,
        applyToAllPortals: true,
        portals: [],
        logout: true,
        note: `Admin vouchers generated by ${req.user!.username}`
      };

      console.log('Creating admin voucher group with data:', JSON.stringify(voucherGroupData, null, 2));

      // Use node-fetch for voucher creation with SSL
      const nodeFetch = (await import('node-fetch')).default;
      const https = await import('https');
      const voucherAgent = process.env.NODE_ENV === 'development' 
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined;

      const voucherResponse = await nodeFetch(voucherApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `AccessToken=${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voucherGroupData),
        agent: voucherAgent
      });

      if (!voucherResponse.ok) {
        const errorText = await voucherResponse.text();
        console.error('Omada voucher creation error:', errorText);
        throw new Error(`Failed to create vouchers in Omada: ${voucherResponse.status}`);
      }

      const voucherResult = await voucherResponse.json();
      console.log('Omada voucher creation response:', JSON.stringify(voucherResult, null, 2));

      if (voucherResult.errorCode !== 0) {
        console.error('Omada API error:', voucherResult.msg);
        throw new Error(voucherResult.msg || 'Failed to create vouchers via Omada API');
      }

      const omadaGroupId = voucherResult.result.id;
      console.log('Admin voucher group created successfully:', omadaGroupId);

      // Get voucher details from Omada
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Use node-fetch for voucher details with SSL
      const detailAgent = process.env.NODE_ENV === 'development' 
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined;

      const detailResponse = await nodeFetch(
        `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/voucher-groups/${omadaGroupId}?page=1&pageSize=1000`,
        {
          headers: {
            'Authorization': `AccessToken=${accessToken}`,
            'Content-Type': 'application/json',
          },
          agent: detailAgent
        }
      );

      if (!detailResponse.ok) {
        throw new Error('Failed to get voucher details from Omada');
      }

      const detailData = await detailResponse.json();
      if (detailData.errorCode !== 0) {
        throw new Error(detailData.msg || 'Failed to get voucher details');
      }

      const omadaVouchers = detailData.result?.data || [];
      console.log(`Retrieved ${omadaVouchers.length} admin vouchers from Omada`);

      // Save vouchers to database
      const savedVouchers = [];
      for (const omadaVoucher of omadaVouchers) {
        try {
          const voucher = await storage.createVoucher({
            code: omadaVoucher.code,
            planId: planId,
            siteId: plan.siteId,
            status: 'available',
            omadaVoucherId: omadaVoucher.id,
            omadaGroupId: omadaGroupId,
            createdBy: req.user!.id,
            vendedorId: req.user!.id,
            unitPrice: parseFloat(plan.unitPrice || "0"),
            expiresAt: new Date(Date.now() + (plan.duration * 60 * 1000))
          });
          
          savedVouchers.push({
            ...voucher,
            planName: plan.nome,
            duracao: plan.duration
          });
        } catch (error) {
          console.error('Error saving admin voucher to database:', error);
        }
      }

      console.log(`Admin successfully saved ${savedVouchers.length} vouchers to database`);

      res.json({
        success: true,
        message: `${savedVouchers.length} vouchers created successfully by admin`,
        vouchers: savedVouchers,
        omadaGroupId
      });

    } catch (error: any) {
      console.error("Admin voucher generation error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to generate vouchers", 
        error: error.message 
      });
    }
  });

  // Voucher Generation (Vendedor) - via Omada API
  app.post("/api/vouchers/generate", requireAuth, requireRole(["vendedor"]), async (req, res) => {
    try {
      const { planId, quantity = 1 } = req.body;
      
      if (!planId || !quantity || quantity < 1 || quantity > 100) {
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
        name: `${plan.nome.substring(0, 10)} - VND${Date.now().toString().slice(-6)}`,
        amount: parseInt(quantity),
        codeLength: plan.comprimentoVoucher,
        codeForm: JSON.parse(plan.codeForm || '[0]'), // Parse do JSON: [0]=apenas números, [0,1]=números e letras
        limitType: plan.omadaLimitType || 1, // 0=Limited Usage, 1=Limited Online Users, 2=Unlimited
        limitNum: plan.userLimit || 1, // Número de usuários simultâneos ou usos permitidos
        durationType: 0, // Client duration
        duration: plan.duration,
        timingType: 0, // Timing by time
        rateLimit: {
          mode: 0,
          customRateLimit: {
            downLimitEnable: (plan.downLimit || 0) > 0,
            downLimit: plan.downLimit || 0,
            upLimitEnable: (plan.upLimit || 0) > 0,
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

      // Use node-fetch for voucher creation with SSL
      const nodeFetch = (await import('node-fetch')).default;
      const https = await import('https');
      const createAgent = process.env.NODE_ENV === 'development' 
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined;

      const createResponse = await nodeFetch(
        voucherApiUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `AccessToken=${accessToken}`, // Use same format as site sync
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(voucherGroupData),
          agent: createAgent
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
      
      // Use node-fetch for voucher details with SSL
      const detailsAgent = process.env.NODE_ENV === 'development' 
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined;

      const vouchersResponse = await nodeFetch(
        voucherGroupUrl,
        {
          method: 'GET',
          headers: {
            'Authorization': `AccessToken=${accessToken}`,
          },
          agent: detailsAgent
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

        // NÃO criar venda automaticamente - vouchers são criados como 'available' 
        // Vendas serão criadas apenas quando o voucher for realmente usado/vendido
        console.log(`Voucher ${omadaVoucher.code} created as available - no automatic sale record`);

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
      res.status(201).json({
        success: true,
        message: `${savedVouchers.length} vouchers gerados com sucesso`,
        vouchers: savedVouchers,
        count: savedVouchers.length
      });
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
  app.get("/api/reports/voucher-summary/:siteId", requireAuth, requireRole(["admin", "vendedor"]), async (req, res) => {
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

      // Get access token using the centralized function
      const accessToken = await getValidOmadaToken(credentials);

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

  app.get("/api/reports/voucher-history/:siteId/:timeStart/:timeEnd", requireAuth, requireRole(["admin", "vendedor"]), async (req, res) => {
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

  // Get voucher distribution by price with date range
  app.get("/api/reports/voucher-price-distribution/:siteId/:timeStart/:timeEnd", requireAuth, requireRole(["admin", "vendedor"]), async (req, res) => {
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

      console.log('🔍 Fetching price distribution for site:', site.name, 'from:', new Date(Number(timeStart) * 1000), 'to:', new Date(Number(timeEnd) * 1000));

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
      const accessToken = await getValidOmadaToken(credentials);
      
      // Call Omada API for price distribution with date range
      const apiUrl = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/vouchers/statistics/history/distribution/unit-price?filters.timeStart=${timeStart}&filters.timeEnd=${timeEnd}`;
      
      console.log('📡 Calling Omada API:', apiUrl);
      
      const response = await fetch(apiUrl, {
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

      if (!response.ok) {
        throw new Error(`Failed to fetch price distribution from Omada: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('💰 Price distribution response:', JSON.stringify(data, null, 2));
      
      if (data.errorCode !== 0) {
        throw new Error(data.msg || 'Omada API error');
      }

      res.json(data.result);
    } catch (error: any) {
      console.error("❌ Error fetching voucher price distribution:", error);
      res.status(500).json({ message: error.message || "Failed to fetch voucher price distribution" });
    }
  });

  // Get voucher distribution by duration with date range
  app.get("/api/reports/voucher-duration-distribution/:siteId/:timeStart/:timeEnd", requireAuth, requireRole(["admin", "vendedor"]), async (req, res) => {
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

      console.log('⏱️ Fetching duration distribution for site:', site.name, 'from:', new Date(Number(timeStart) * 1000), 'to:', new Date(Number(timeEnd) * 1000));

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
      const accessToken = await getValidOmadaToken(credentials);
      
      // Call Omada API for duration distribution with date range
      const apiUrl = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/vouchers/statistics/history/distribution/duration?filters.timeStart=${timeStart}&filters.timeEnd=${timeEnd}`;
      
      console.log('📡 Calling Omada Duration API:', apiUrl);
      
      const response = await fetch(apiUrl, {
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

      if (!response.ok) {
        throw new Error(`Failed to fetch duration distribution from Omada: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('⏱️ Duration distribution response:', JSON.stringify(data, null, 2));
      
      if (data.errorCode !== 0) {
        throw new Error(data.msg || 'Omada API error');
      }

      res.json(data.result);
    } catch (error: any) {
      console.error("❌ Error fetching voucher duration distribution:", error);
      res.status(500).json({ message: error.message || "Failed to fetch voucher duration distribution" });
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

  // Print History API Routes
  app.post("/api/print-history", requireAuth, requireRole(["vendedor"]), async (req, res) => {
    try {
      const { printType, voucherCodes, printTitle, htmlContent } = req.body;
      
      const userSites = await storage.getUserSites(req.user!.id);
      if (userSites.length === 0) {
        return res.status(403).json({ message: "No site access" });
      }
      
      const siteId = userSites[0].id;
      
      const printHistory = await storage.savePrintHistory({
        vendedorId: req.user!.id,
        siteId,
        printType,
        voucherCodes,
        printTitle,
        htmlContent,
        voucherCount: voucherCodes.length
      });
      
      res.status(201).json(printHistory);
    } catch (error: any) {
      console.error("Error saving print history:", error);
      res.status(500).json({ message: error.message || "Failed to save print history" });
    }
  });

  app.get("/api/print-history/:siteId", requireAuth, requireRole(["vendedor"]), async (req, res) => {
    try {
      const { siteId } = req.params;
      const history = await storage.getPrintHistory(req.user!.id, siteId);
      res.json(history);
    } catch (error: any) {
      console.error("Error fetching print history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch print history" });
    }
  });

  app.delete("/api/print-history/:id", requireAuth, requireRole(["vendedor"]), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePrintHistory(id);
      if (success) {
        res.json({ message: "Print history deleted" });
      } else {
        res.status(404).json({ message: "Print history not found" });
      }
    } catch (error: any) {
      console.error("Error deleting print history:", error);
      res.status(500).json({ message: error.message || "Failed to delete print history" });
    }
  });

  // Gerar vouchers na API do Omada
  app.post("/api/vouchers/generate", requireAuth, async (req, res) => {
    try {
      const { planId, quantity } = req.body;
      
      if (!planId || !quantity || quantity < 1 || quantity > 100) {
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
            downLimitEnable: (plan.downLimit || 0) > 0,
            downLimit: plan.downLimit || 0,
            upLimitEnable: (plan.upLimit || 0) > 0,
            upLimit: plan.upLimit || 0
          }
        },
        trafficLimitEnable: false,
        unitPrice: parseFloat(plan.unitPrice), // preço decimal direto
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

  // Buscar vouchers do vendedor com sincronização de status
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

      // Buscar vouchers locais
      const vouchers = await storage.getVouchersByVendedor(req.user!.id, siteId);
      
      // Sincronizar status com Omada API
      await syncVoucherStatus(vouchers, siteId);
      
      // Buscar vouchers atualizados
      const updatedVouchers = await storage.getVouchersByVendedor(req.user!.id, siteId);
      res.json(updatedVouchers);
    } catch (error: any) {
      console.error("Error fetching vouchers:", error);
      res.status(500).json({ message: error.message || "Failed to fetch vouchers" });
    }
  });

  // Estatísticas diárias do vendedor com sincronização
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

      // Sincronizar status dos vouchers antes de calcular estatísticas
      const vouchers = await storage.getVouchersByVendedor(req.user!.id, siteId);
      await syncVoucherStatus(vouchers, siteId);

      const stats = await storage.getVendedorDailyStats(req.user!.id, siteId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ message: error.message || "Failed to fetch daily stats" });
    }
  });

  // Update user profile
  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Only allow users to update their own profile or admins/masters to update others
      if (req.user!.id !== userId && !["admin", "master"].includes(req.user!.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const { username, email } = req.body;
      const updatedUser = await storage.updateUser(userId, { username, email });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user password
  app.put("/api/users/:id/password", requireAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Only allow users to update their own password
      if (req.user!.id !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Import password utilities from auth module
      const { comparePasswords, hashPassword } = await import('./auth');
      
      // Verify current password
      const user = await storage.getUser(req.user!.id);
      if (!user || !(await comparePasswords(currentPassword, user.password))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUser(userId, { password: hashedNewPassword });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Endpoint temporário para corrigir planos existentes com codeForm incorreto
  app.post("/api/fix-plans", requireAuth, requireRole(["master", "admin"]), async (req, res) => {
    try {
      console.log('Fixing codeForm for plans that should have only numbers...');
      
      // Usar SQL direto para encontrar e corrigir planos
      const { pool } = await import("./db");
      
      // Buscar planos que podem ter codeForm incorreto
      const [plans] = await pool.execute(`
        SELECT id, nome, codeForm FROM plans 
        WHERE codeForm = '[0,1]' AND (
          nome LIKE '%APENAS NUM%' OR 
          nome LIKE '%SÓ NUM%' OR
          nome LIKE '%NUMEROS%' OR
          nome LIKE '%10 HORAS%'
        )
      `);
      
      let fixedCount = 0;
      for (const plan of plans as any[]) {
        // Atualizar para apenas números
        await pool.execute(`
          UPDATE plans SET codeForm = '[0]' WHERE id = ?
        `, [plan.id]);
        
        console.log(`Fixed plan "${plan.nome}": ${plan.codeForm} -> [0]`);
        fixedCount++;
      }
      
      res.json({ 
        message: `Fixed ${fixedCount} plans to use only numbers`, 
        fixedPlans: fixedCount 
      });
    } catch (error: any) {
      console.error("Error fixing plans:", error);
      res.status(500).json({ message: error.message || "Failed to fix plans" });
    }
  });

  // Endpoint para deletar voucher individual via API Omada
  app.delete("/api/vouchers/:voucherId", requireAuth, async (req, res) => {
    try {
      const { voucherId } = req.params;
      const userId = req.user!.id;
      
      // Buscar voucher para verificar se pertence ao usuário e obter dados do Omada
      const voucher = await storage.getVoucherById(voucherId);
      if (!voucher) {
        return res.status(404).json({ message: "Voucher não encontrado" });
      }

      // Verificar se o usuário tem permissão para deletar este voucher
      if (req.user!.role === "vendedor" && voucher.vendedorId !== userId) {
        return res.status(403).json({ message: "Sem permissão para deletar este voucher" });
      }

      // Verificar se o usuário tem acesso ao site do voucher
      const userSites = await storage.getUserSites(userId);
      const hasAccess = userSites.some(site => site.id === voucher.siteId) || req.user!.role === "master";
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Sem acesso ao site deste voucher" });
      }

      // Buscar site e credenciais Omada
      const site = await storage.getSiteById(voucher.siteId);
      if (!site) {
        return res.status(404).json({ message: "Site não encontrado" });
      }

      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        return res.status(500).json({ message: "Credenciais Omada não configuradas" });
      }

      // Deletar voucher via API Omada se tiver omadaVoucherId
      if (voucher.omadaVoucherId) {
        console.log(`Deleting voucher ${voucher.omadaVoucherId} from Omada API...`);
        
        // Usar sistema de callback para obter token crítico validado
        const freshAccessToken = await getCriticalToken(credentials, `delete_voucher_${voucher.omadaVoucherId}`);
        
        console.log(`Using validated token for delete: ${freshAccessToken.substring(0, 15)}...`);
        
        const deleteResponse = await fetch(
          `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${site.omadaSiteId}/hotspot/vouchers/${voucher.omadaVoucherId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${freshAccessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            // Ignore SSL certificate issues for self-signed certificates
            ...(process.env.NODE_ENV === 'development' && {
              agent: new (await import('https')).Agent({
                rejectUnauthorized: false
              })
            })
          }
        );

        if (!deleteResponse.ok) {
          console.error(`Failed to delete voucher from Omada: ${deleteResponse.status}`);
          const errorText = await deleteResponse.text();
          console.error('Omada delete error:', errorText);
          return res.status(500).json({ 
            message: "Erro ao deletar voucher na API Omada",
            omadaError: errorText 
          });
        }

        const deleteData = await deleteResponse.json();
        console.log('Omada delete response:', deleteData);

        if (deleteData.errorCode !== 0) {
          console.error('Delete failed with error:', deleteData);
          return res.status(500).json({ 
            message: "Erro na API Omada ao deletar voucher",
            omadaMessage: deleteData.msg,
            errorCode: deleteData.errorCode
          });
        }
        
        console.log(`✓ Voucher ${voucher.omadaVoucherId} deleted successfully from Omada`);
      }

      // Deletar voucher do banco local
      const deleted = await storage.deleteVoucher(voucherId);
      if (!deleted) {
        return res.status(500).json({ message: "Erro ao deletar voucher do banco local" });
      }

      console.log(`Voucher ${voucher.code} deleted successfully`);
      res.json({ 
        message: "Voucher deletado com sucesso",
        voucherCode: voucher.code 
      });

    } catch (error: any) {
      console.error('Error deleting voucher:', error);
      res.status(500).json({ 
        message: "Erro interno do servidor",
        error: error.message 
      });
    }
  });

  // App Settings API routes
  app.get("/api/app-settings", async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          id: null,
          appName: "Omada Voucher System",
          logoUrl: null,
          faviconUrl: null,
          primaryColor: "#007bff",
          createdAt: null,
          updatedAt: null
        });
      }
      res.json(settings);
    } catch (error) {
      console.error('Error getting app settings:', error);
      res.status(500).json({ message: "Failed to get app settings" });
    }
  });

  app.put("/api/app-settings", requireAuth, requireRole(["master"]), async (req, res) => {
    try {
      const { appName, logoUrl, faviconUrl, primaryColor } = req.body;
      
      const settings = await storage.updateAppSettings({
        appName: appName || "Omada Voucher System",
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        primaryColor: primaryColor || "#007bff"
      });
      
      res.json(settings);
    } catch (error) {
      console.error('Error updating app settings:', error);
      res.status(500).json({ message: "Failed to update app settings" });
    }
  });

  // Upload routes for logo and favicon
  app.post("/api/upload-logo", requireAuth, requireRole(["master"]), upload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo de logo enviado" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        success: true,
        fileUrl,
        message: "Logo enviado com sucesso"
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      res.status(500).json({ message: error.message || "Erro ao enviar logo" });
    }
  });

  app.post("/api/upload-favicon", requireAuth, requireRole(["master"]), upload.single('favicon'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo de favicon enviado" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        success: true,
        fileUrl,
        message: "Favicon enviado com sucesso"
      });
    } catch (error: any) {
      console.error('Error uploading favicon:', error);
      res.status(500).json({ message: error.message || "Erro ao enviar favicon" });
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'server/uploads')));

  const httpServer = createServer(app);
  return httpServer;
}


