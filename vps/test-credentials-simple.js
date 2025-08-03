// Test new credentials directly
import fetch from 'node-fetch';
import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function testNewCredentials() {
  console.log('🔧 Testing new Omada credentials...');
  
  try {
    const response = await fetch('https://omada.camstm.com:8043/openapi/authorize/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: 'a72febf8cc2647e2a74737f4c500268b',
        client_secret: 'b4e60e503bb943b7ab7172f2f6f1669e',
      }),
      agent
    });

    console.log('📊 Response status:', response.status);
    const data = await response.json();
    console.log('📈 Response data:', JSON.stringify(data, null, 2));
    
    if (data.result?.accessToken) {
      console.log('✅ NEW CREDENTIALS WORK! Token obtained successfully');
      return true;
    } else {
      console.log('❌ New credentials failed');
      return false;
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  }
}

testNewCredentials();