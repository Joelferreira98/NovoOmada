// Quick debug script to check credentials
import { storage } from './server/storage.js';

async function debugCredentials() {
  try {
    console.log('🔍 Checking Omada credentials...');
    
    const credentials = await storage.getOmadaCredentials();
    
    if (!credentials) {
      console.log('❌ No credentials found in database');
      
      // Check environment variables
      console.log('🌍 Environment variables:');
      console.log('OMADA_URL:', process.env.OMADA_URL);
      console.log('OMADA_CLIENT_ID:', process.env.OMADA_CLIENT_ID?.substring(0, 8) + '...');
      console.log('OMADA_CLIENT_SECRET:', process.env.OMADA_CLIENT_SECRET?.substring(0, 8) + '...');
      console.log('OMADA_OMADAC_ID:', process.env.OMADA_OMADAC_ID);
    } else {
      console.log('✅ Credentials found in database:');
      console.log('omadaUrl:', credentials.omadaUrl);
      console.log('omadacId:', credentials.omadacId);
      console.log('clientId:', credentials.clientId?.substring(0, 8) + '...');
      console.log('clientSecret:', credentials.clientSecret?.substring(0, 8) + '...');
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

debugCredentials();