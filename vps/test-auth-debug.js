// Test authentication debugging
import fetch from 'node-fetch';

async function testAuth() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'master',
        password: 'master123'
      })
    });

    console.log('Login status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login data:', loginData);

    // Get cookies from response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies:', cookies);

    if (cookies) {
      // Test user endpoint
      const userResponse = await fetch('http://localhost:5000/api/user', {
        headers: {
          'Cookie': cookies
        }
      });

      console.log('User endpoint status:', userResponse.status);
      const userData = await userResponse.json();
      console.log('User data:', userData);

      // Test reports endpoint
      const reportsResponse = await fetch('http://localhost:5000/api/reports/voucher-summary/3db43e5b-b8f1-4d2e-a5bb-5f6e8c9d0a1b', {
        headers: {
          'Cookie': cookies
        }
      });

      console.log('Reports endpoint status:', reportsResponse.status);
      const reportsData = await reportsResponse.json();
      console.log('Reports data:', reportsData);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testAuth();