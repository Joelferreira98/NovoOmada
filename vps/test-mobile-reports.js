// Test mobile reports functionality
import fetch from 'node-fetch';

async function testMobileReports() {
  try {
    console.log('🧪 Testing mobile reports functionality...');
    
    // Test direct endpoint without authentication to verify data structure
    const reportResponse = await fetch('http://localhost:5000/api/reports/voucher-summary/3db43e5b-b8f1-4d2e-a5bb-5f6e8c9d0a1b');
    
    console.log('📊 Report Response Status:', reportResponse.status);
    
    if (reportResponse.status === 200) {
      const reportData = await reportResponse.json();
      console.log('✅ Report Data Structure:', JSON.stringify(reportData, null, 2));
      
      // Check if mobile-friendly data is present
      if (reportData.totalCount !== undefined) {
        console.log('✅ Mobile-friendly fields present:');
        console.log('  - totalCount:', reportData.totalCount);
        console.log('  - usedCount:', reportData.usedCount);
        console.log('  - unusedCount:', reportData.unusedCount);
        console.log('  - inUseCount:', reportData.inUseCount);
        console.log('  - totalAmount:', reportData.totalAmount);
        console.log('  - currency:', reportData.currency);
      } else {
        console.log('❌ Mobile-friendly fields missing');
      }
    } else {
      const errorData = await reportResponse.text();
      console.log('❌ Error response:', errorData);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

testMobileReports();