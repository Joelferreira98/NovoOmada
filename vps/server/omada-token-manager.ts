// Omada Token Manager - Gerenciador de tokens de acesso para API Omada
// Baseado no sistema existente da VPS

interface OmadaCredentials {
  omadaUrl: string;
  omadacId: string;
  clientId: string;
  clientSecret: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

// Cache de token em memória
let tokenCache: TokenCache | null = null;

/**
 * Obtém um token de acesso válido para a API Omada
 * Reutiliza token em cache se ainda válido, senão solicita novo
 */
export async function getValidOmadaToken(credentials: OmadaCredentials): Promise<string> {
  // Verificar se token em cache ainda é válido (com margem de 30 segundos)
  if (tokenCache && Date.now() < (tokenCache.expiresAt - 30000)) {
    console.log('🔑 Usando token de acesso em cache');
    return tokenCache.accessToken;
  }

  console.log('🔄 Solicitando novo token de acesso Omada...');

  try {
    // Usar node-fetch para SSL compatibility
    const nodeFetch = (await import('node-fetch')).default;
    const https = await import('https');
    
    const agent = process.env.NODE_ENV === 'development' 
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;

    const tokenUrl = `${credentials.omadaUrl}/openapi/authorize/token`;
    const tokenData = {
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret
    };

    const response = await nodeFetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenData),
      agent
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();

    if (responseData.errorCode !== 0) {
      throw new Error(`Omada token error: ${responseData.msg || 'Unknown error'}`);
    }

    const accessToken = responseData.result.accessToken;
    const expiresIn = responseData.result.expiresIn || 3600; // Default 1 hora

    // Armazenar em cache
    tokenCache = {
      accessToken,
      expiresAt: Date.now() + (expiresIn * 1000)
    };

    console.log('✅ Token de acesso obtido com sucesso');
    return accessToken;

  } catch (error) {
    console.error('❌ Erro ao obter token Omada:', error);
    throw error;
  }
}

/**
 * Limpa o cache de token (força renovação no próximo uso)
 */
export function clearTokenCache(): void {
  tokenCache = null;
  console.log('🗑️ Cache de token limpo');
}

/**
 * Verifica se existe um token em cache válido
 */
export function hasValidToken(): boolean {
  return tokenCache !== null && Date.now() < (tokenCache.expiresAt - 30000);
}