// Direct test of the API endpoint to bypass authentication issues
import fetch from 'node-fetch';
import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function testDirectOmadaAPI() {
  try {
    console.log('🔧 Testing direct Omada API access...');
    
    // Get token first
    const tokenResponse = await fetch('https://omada.camstm.com:8043/openapi/authorize/token', {
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

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      console.log('✅ Token obtained successfully');
      
      if (tokenData.result?.accessToken) {
        // Test voucher summary endpoint
        const summaryResponse = await fetch(
          `https://omada.camstm.com:8043/openapi/v1/640f0d2bb72b160b90a5d4fe/sites/640f0d2bb72b160b90a5d4fe/hotspot/vouchers/statistics/summary`,
          {
            headers: {
              'Authorization': `Bearer ${tokenData.result.accessToken}`,
              'Content-Type': 'application/json',
            },
            agent
          }
        );
        
        console.log('📊 Summary response status:', summaryResponse.status);
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          console.log('📈 Summary data:', JSON.stringify(summaryData, null, 2));
        } else {
          const errorText = await summaryResponse.text();
          console.error('❌ Summary error:', errorText);
        }
      }
    } else {
      const errorData = await tokenResponse.json();
      console.error('❌ Token error:', errorData);
    }
  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

testDirectOmadaAPI();