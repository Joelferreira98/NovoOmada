// Quick test script for Omada API connection
import https from 'https';
import fetch from 'node-fetch';

// Custom agent to ignore SSL certificates
const agent = new https.Agent({
  rejectUnauthorized: false
});

async function testOmadaConnection() {
  try {
    console.log('🔧 Testing Omada connection...');
    
    // Test basic connectivity
    const response = await fetch('https://omada.camstm.com:8043/openapi/authorize/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.OMADA_CLIENT_ID,
        client_secret: process.env.OMADA_CLIENT_SECRET,
      }),
      agent
    });

    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connection successful!');
      console.log('🎫 Token received:', data.access_token ? 'Yes' : 'No');
      
      if (data.access_token) {
        // Test a simple API call
        const testResponse = await fetch(
          `https://omada.camstm.com:8043/openapi/v1/${process.env.OMADA_OMADAC_ID}/sites`,
          {
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
              'Content-Type': 'application/json',
            },
            agent
          }
        );
        
        console.log('🏢 Sites API status:', testResponse.status);
        if (testResponse.ok) {
          const sitesData = await testResponse.json();
          console.log('📍 Sites found:', sitesData.result?.data?.length || 0);
        }
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Connection failed:', errorText);
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

testOmadaConnection();