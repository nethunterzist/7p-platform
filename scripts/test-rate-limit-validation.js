#!/usr/bin/env node

/**
 * Rate Limit Validation Test for /api/enroll/free
 * Tests the 5 requests per minute rate limiting
 */

const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = 'https://7p-platform.vercel.app';
const ENDPOINT = '/api/enroll/free';
const RATE_LIMIT = 5; // requests per minute
const TEST_TIMEOUT = 70000; // 70 seconds

console.log('🧪 Rate Limit Validation Test Starting');
console.log(`📍 Target: ${BASE_URL}${ENDPOINT}`);
console.log(`⚡ Rate Limit: ${RATE_LIMIT} requests/minute`);
console.log(`⏱️  Test Duration: ${TEST_TIMEOUT / 1000}s\n`);

// Test data payload
const testPayload = JSON.stringify({
  email: `test+${Date.now()}@example.com`,
  firstName: 'Test',
  lastName: 'User',
  courseId: 'test-course',
  enrollmentCode: 'BETA2025'
});

const requestOptions = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testPayload),
    'User-Agent': 'RateLimitTest/1.0'
  }
};

function makeRequest(requestNumber) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    const req = https.request(`${BASE_URL}${ENDPOINT}`, requestOptions, (res) => {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          requestNumber,
          statusCode: res.statusCode,
          responseTime,
          headers: res.headers,
          data: data.slice(0, 200) + (data.length > 200 ? '...' : '')
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        requestNumber,
        statusCode: 'ERROR',
        responseTime: 0,
        error: error.message
      });
    });
    
    req.write(testPayload);
    req.end();
  });
}

async function runTest() {
  const results = [];
  const startTime = Date.now();
  
  console.log('🚀 Sending requests...\n');
  
  // Send requests rapidly to trigger rate limit
  for (let i = 1; i <= 8; i++) {
    const result = await makeRequest(i);
    results.push(result);
    
    const status = result.statusCode === 429 ? '🔴 RATE LIMITED' : 
                  result.statusCode === 200 ? '✅ SUCCESS' :
                  result.statusCode === 'ERROR' ? '❌ ERROR' : 
                  `🟡 HTTP ${result.statusCode}`;
    
    console.log(`Request ${i}: ${status} (${result.responseTime}ms)`);
    
    // Small delay between requests to simulate real usage
    if (i < 8) await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n📊 Analysis Results:\n');
  
  // Analyze results
  const successCount = results.filter(r => r.statusCode === 200).length;
  const rateLimitedCount = results.filter(r => r.statusCode === 429).length;
  const errorCount = results.filter(r => r.statusCode === 'ERROR').length;
  const otherCount = results.length - successCount - rateLimitedCount - errorCount;
  
  console.log(`✅ Successful requests: ${successCount}`);
  console.log(`🔴 Rate limited (429): ${rateLimitedCount}`);
  console.log(`❌ Error requests: ${errorCount}`);
  console.log(`🟡 Other responses: ${otherCount}`);
  
  // Rate limit validation
  console.log('\n🎯 Rate Limit Validation:');
  
  if (rateLimitedCount > 0) {
    console.log('✅ PASS: Rate limiting is working');
    console.log(`   → Blocked ${rateLimitedCount} requests after limit reached`);
  } else {
    console.log('⚠️  WARNING: No rate limiting detected');
    console.log('   → All requests succeeded, rate limit may not be active');
  }
  
  // Performance analysis
  const responseTimes = results.filter(r => r.responseTime > 0).map(r => r.responseTime);
  if (responseTimes.length > 0) {
    const avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length);
    const maxResponseTime = Math.max(...responseTimes);
    
    console.log('\n⚡ Performance Metrics:');
    console.log(`   → Average response time: ${avgResponseTime}ms`);
    console.log(`   → Maximum response time: ${maxResponseTime}ms`);
    
    if (avgResponseTime > 2000) {
      console.log('   🟡 WARNING: High response times detected');
    } else {
      console.log('   ✅ Response times within acceptable range');
    }
  }
  
  // Rate limit headers analysis
  console.log('\n🔍 Rate Limit Headers:');
  const firstResult = results[0];
  if (firstResult && firstResult.headers) {
    const rateLimitHeaders = Object.entries(firstResult.headers)
      .filter(([key]) => key.toLowerCase().includes('rate') || key.toLowerCase().includes('limit'))
      .map(([key, value]) => `   → ${key}: ${value}`);
    
    if (rateLimitHeaders.length > 0) {
      rateLimitHeaders.forEach(header => console.log(header));
    } else {
      console.log('   → No rate limit headers detected in response');
    }
  }
  
  // Security validation
  console.log('\n🛡️  Security Check:');
  const rateLimitedResults = results.filter(r => r.statusCode === 429);
  if (rateLimitedResults.length > 0) {
    const rateLimitResponse = rateLimitedResults[0];
    try {
      const responseData = JSON.parse(rateLimitResponse.data);
      if (responseData.error && responseData.error.includes('rate limit')) {
        console.log('✅ PASS: Proper rate limit error messages');
      } else {
        console.log('⚠️  INFO: Rate limit response format differs from expected');
      }
    } catch (e) {
      console.log('⚠️  INFO: Non-JSON rate limit response');
    }
  }
  
  // Summary
  console.log('\n📋 Test Summary:');
  const testDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   → Test duration: ${testDuration}s`);
  console.log(`   → Total requests: ${results.length}`);
  
  if (rateLimitedCount > 0 && successCount <= RATE_LIMIT) {
    console.log('   🟢 OVERALL: Rate limiting is functioning correctly');
  } else if (rateLimitedCount === 0) {
    console.log('   🟡 OVERALL: Rate limiting may need investigation');
  } else {
    console.log('   🔴 OVERALL: Rate limiting behavior unexpected');
  }
  
  console.log('\n✅ Rate limit validation test completed');
  
  return {
    success: rateLimitedCount > 0,
    totalRequests: results.length,
    successfulRequests: successCount,
    rateLimitedRequests: rateLimitedCount,
    averageResponseTime: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length) : 0,
    testDuration: parseFloat(testDuration)
  };
}

// Run the test
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = { runTest };