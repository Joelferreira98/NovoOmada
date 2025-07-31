import fetch from 'node-fetch';
import https from 'https';

// Custom HTTPS agent that ignores SSL certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method'
});

// Custom fetch function for Omada API calls
export async function omadaFetch(url: string, options: any = {}) {
  const fetchOptions = {
    ...options,
    agent: url.startsWith('https:') ? httpsAgent : undefined,
  };

  console.log('🔗 Making request to:', url);
  
  try {
    const response = await fetch(url, fetchOptions);
    return response;
  } catch (error: any) {
    console.error('❌ Fetch error:', error.message);
    throw error;
  }
}

// Helper function to make authenticated Omada API calls
export async function makeOmadaRequest(url: string, options: any = {}, token?: string) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return omadaFetch(url, {
    ...options,
    headers,
  });
}