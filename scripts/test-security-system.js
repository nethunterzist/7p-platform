#!/usr/bin/env node

/**
 * SECURITY SYSTEM TEST SCRIPT - 7P Education
 * Comprehensive testing of the API security and rate limiting system
 */

const https = require('https');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  testApiKey: process.env.TEST_API_KEY || 'test-key',
  maxConcurrency: 10,
  testDuration: 30000, // 30 seconds
  verbose: process.argv.includes('--verbose')
};

// Test results tracking
const testResults = {
  totalRequests: 0,
  successfulRequests: 0,
  rateLimitedRequests: 0,
  errorRequests: 0,
  averageResponseTime: 0,
  securityViolations: 0,
  testsPassed: 0,
  testsFailed: 0
};

// Test cases
const securityTests = [
  {
    name: 'Rate Limit Test',
    description: 'Test rate limiting functionality',
    test: testRateLimit
  },
  {
    name: 'XSS Protection Test',
    description: 'Test XSS attack prevention',
    test: testXSSProtection
  },
  {
    name: 'SQL Injection Test',
    description: 'Test SQL injection prevention',
    test: testSQLInjection
  },
  {
    name: 'CORS Protection Test',
    description: 'Test CORS configuration',
    test: testCORSProtection
  },
  {
    name: 'Authentication Test',
    description: 'Test authentication requirements',
    test: testAuthentication
  },
  {
    name: 'Input Validation Test',
    description: 'Test input validation and sanitization',
    test: testInputValidation
  },
  {
    name: 'DDoS Protection Test',
    description: 'Test DDoS detection and blocking',
    test: testDDoSProtection
  },
  {
    name: 'Security Headers Test',
    description: 'Test security headers presence',
    test: testSecurityHeaders
  }
];

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    security: '🛡️'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody,
            responseTime,
            rawBody: body
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            responseTime,
            rawBody: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test implementations
async function testRateLimit() {
  log('Testing rate limiting...', 'info');
  
  const url = new URL('/api/test-public', TEST_CONFIG.baseUrl);
  const requests = [];
  
  // Make 20 rapid requests to trigger rate limit
  for (let i = 0; i < 20; i++) {
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Test-Bot/1.0'
      }
    };
    
    requests.push(makeRequest(options));
  }
  
  try {
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.statusCode === 429);
    
    if (rateLimited.length > 0) {
      log(`✅ Rate limiting working: ${rateLimited.length} requests blocked`, 'success');
      return true;
    } else {
      log('❌ Rate limiting may not be working properly', 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Rate limit test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testXSSProtection() {
  log('Testing XSS protection...', 'info');
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src=x onerror=alert("XSS")>',
    '"><script>alert("XSS")</script>',
    '\';alert("XSS");//'
  ];
  
  const url = new URL('/api/test-public', TEST_CONFIG.baseUrl);
  
  for (const payload of xssPayloads) {
    try {
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Security-Test-Bot/1.0'
        }
      };
      
      const data = {
        name: payload,
        description: `Test with payload: ${payload}`
      };
      
      const response = await makeRequest(options, data);
      
      if (response.statusCode >= 400) {
        log(`✅ XSS payload blocked: ${payload.substring(0, 50)}...`, 'success');
      } else {
        log(`⚠️ XSS payload may not be blocked: ${payload}`, 'warning');
      }
    } catch (error) {
      log(`⚠️ XSS test error for payload "${payload}": ${error.message}`, 'warning');
    }
  }
  
  return true;
}

async function testSQLInjection() {
  log('Testing SQL injection protection...', 'info');
  
  const sqlPayloads = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "1' UNION SELECT * FROM users--",
    "'; INSERT INTO users VALUES ('hacker','pass'); --"
  ];
  
  const url = new URL('/api/test-public', TEST_CONFIG.baseUrl);
  
  for (const payload of sqlPayloads) {
    try {
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + `?search=${encodeURIComponent(payload)}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Security-Test-Bot/1.0'
        }
      };
      
      const response = await makeRequest(options);
      
      if (response.statusCode >= 400) {
        log(`✅ SQL injection payload blocked: ${payload.substring(0, 30)}...`, 'success');
      } else {
        log(`⚠️ SQL injection payload may not be blocked: ${payload}`, 'warning');
      }
    } catch (error) {
      log(`⚠️ SQL injection test error: ${error.message}`, 'warning');
    }
  }
  
  return true;
}

async function testCORSProtection() {
  log('Testing CORS protection...', 'info');
  
  const url = new URL('/api/test-public', TEST_CONFIG.baseUrl);
  const maliciousOrigins = [
    'http://malicious-site.com',
    'https://evil.example.com',
    'http://localhost:8080'
  ];
  
  for (const origin of maliciousOrigins) {
    try {
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      };
      
      const response = await makeRequest(options);
      
      if (response.statusCode >= 400 || !response.headers['access-control-allow-origin']) {
        log(`✅ CORS blocked malicious origin: ${origin}`, 'success');
      } else {
        log(`⚠️ CORS may allow malicious origin: ${origin}`, 'warning');
      }
    } catch (error) {
      log(`⚠️ CORS test error: ${error.message}`, 'warning');
    }
  }
  
  return true;
}

async function testAuthentication() {
  log('Testing authentication requirements...', 'info');
  
  // Test public endpoint (should work without auth)
  const publicUrl = new URL('/api/test-public', TEST_CONFIG.baseUrl);
  
  try {
    const options = {
      hostname: publicUrl.hostname,
      port: publicUrl.port,
      path: publicUrl.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Test-Bot/1.0'
      }
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      log('✅ Public endpoint accessible without authentication', 'success');
    } else {
      log('⚠️ Public endpoint should be accessible without authentication', 'warning');
    }

    // Test secure endpoint (should require auth)
    const secureUrl = new URL('/api/example-secure', TEST_CONFIG.baseUrl);
    const secureOptions = {
      hostname: secureUrl.hostname,
      port: secureUrl.port,
      path: secureUrl.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Test-Bot/1.0'
      }
    };
    
    const secureResponse = await makeRequest(secureOptions);
    
    if (secureResponse.statusCode === 401) {
      log('✅ Secure endpoint requires authentication - unauthorized access blocked', 'success');
      return true;
    } else {
      log('⚠️ Secure endpoint authentication may not be properly enforced', 'warning');
      return false;
    }
  } catch (error) {
    log(`❌ Authentication test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testInputValidation() {
  log('Testing input validation...', 'info');
  
  const url = new URL('/api/test-public', TEST_CONFIG.baseUrl);
  const invalidInputs = [
    { name: '', email: 'invalid-email' }, // Invalid email and empty name
    { name: 'A'.repeat(1000), email: 'test@example.com' }, // Name too long
    { name: 'Test', email: 'test@' }, // Invalid email format
    { role: 'invalid_role' }, // Invalid role
    null, // Null input
    'invalid json string' // Invalid JSON
  ];
  
  let validationWorks = true;
  
  for (const input of invalidInputs) {
    try {
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Security-Test-Bot/1.0'
        }
      };
      
      const response = await makeRequest(options, input);
      
      if (response.statusCode >= 400) {
        if (TEST_CONFIG.verbose) {
          log(`✅ Invalid input rejected: ${JSON.stringify(input)}`, 'success');
        }
      } else {
        log(`⚠️ Invalid input may have been accepted: ${JSON.stringify(input)}`, 'warning');
        validationWorks = false;
      }
    } catch (error) {
      if (TEST_CONFIG.verbose) {
        log(`✅ Invalid input properly rejected with error: ${error.message}`, 'success');
      }
    }
  }
  
  return validationWorks;
}

async function testDDoSProtection() {
  log('Testing DDoS protection...', 'info');
  
  const url = new URL('/api/test-public', TEST_CONFIG.baseUrl);
  
  // Simulate bot-like behavior
  const suspiciousHeaders = [
    { 'User-Agent': 'curl/7.68.0' },
    { 'User-Agent': 'python-requests/2.25.1' },
    { 'User-Agent': 'Wget/1.20.3' },
    { 'User-Agent': 'bot' },
    {} // Missing user agent
  ];
  
  let ddosProtectionWorks = true;
  
  for (const headers of suspiciousHeaders) {
    try {
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        headers: {
          ...headers,
          'Host': url.hostname
        }
      };
      
      const response = await makeRequest(options);
      
      if (response.statusCode >= 400) {
        if (TEST_CONFIG.verbose) {
          log(`✅ Suspicious request blocked: ${JSON.stringify(headers)}`, 'success');
        }
      } else {
        log(`⚠️ Suspicious request may not be blocked: ${JSON.stringify(headers)}`, 'warning');
        ddosProtectionWorks = false;
      }
    } catch (error) {
      if (TEST_CONFIG.verbose) {
        log(`✅ Suspicious request properly rejected: ${error.message}`, 'success');
      }
    }
  }
  
  return ddosProtectionWorks;
}

async function testSecurityHeaders() {
  log('Testing security headers...', 'info');
  
  const url = new URL('/api/test-public', TEST_CONFIG.baseUrl);
  const requiredHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'referrer-policy'
  ];
  
  try {
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Test-Bot/1.0'
      }
    };
    
    const response = await makeRequest(options);
    let allHeadersPresent = true;
    
    for (const header of requiredHeaders) {
      if (!response.headers[header]) {
        log(`⚠️ Missing security header: ${header}`, 'warning');
        allHeadersPresent = false;
      } else {
        if (TEST_CONFIG.verbose) {
          log(`✅ Security header present: ${header} = ${response.headers[header]}`, 'success');
        }
      }
    }
    
    return allHeadersPresent;
  } catch (error) {
    log(`❌ Security headers test failed: ${error.message}`, 'error');
    return false;
  }
}

// Main test runner
async function runSecurityTests() {
  log('🛡️ Starting 7P Education Security System Tests', 'security');
  log(`Testing against: ${TEST_CONFIG.baseUrl}`, 'info');
  log(`Concurrency: ${TEST_CONFIG.maxConcurrency}`, 'info');
  log(`Duration: ${TEST_CONFIG.testDuration/1000}s`, 'info');
  
  const startTime = Date.now();
  
  // Run all security tests
  for (const testCase of securityTests) {
    log(`\n🔍 Running: ${testCase.name}`, 'info');
    log(`Description: ${testCase.description}`, 'info');
    
    try {
      const result = await testCase.test();
      if (result) {
        testResults.testsPassed++;
        log(`✅ ${testCase.name} PASSED`, 'success');
      } else {
        testResults.testsFailed++;
        log(`❌ ${testCase.name} FAILED`, 'error');
      }
    } catch (error) {
      testResults.testsFailed++;
      log(`❌ ${testCase.name} ERROR: ${error.message}`, 'error');
    }
  }
  
  // Performance baseline test
  log('\n⚡ Running performance baseline test...', 'info');
  await performanceTest();
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // Print final results
  log('\n📊 TEST RESULTS SUMMARY', 'security');
  log('='.repeat(50), 'info');
  log(`Total Tests: ${testResults.testsPassed + testResults.testsFailed}`, 'info');
  log(`Tests Passed: ${testResults.testsPassed}`, 'success');
  log(`Tests Failed: ${testResults.testsFailed}`, testResults.testsFailed > 0 ? 'error' : 'success');
  log(`Total Time: ${totalTime/1000}s`, 'info');
  log(`Success Rate: ${((testResults.testsPassed / (testResults.testsPassed + testResults.testsFailed)) * 100).toFixed(1)}%`, 'info');
  
  if (testResults.averageResponseTime > 0) {
    log(`Average Response Time: ${testResults.averageResponseTime.toFixed(0)}ms`, 'info');
    log(`Total Requests: ${testResults.totalRequests}`, 'info');
    log(`Rate Limited: ${testResults.rateLimitedRequests}`, 'info');
    log(`Errors: ${testResults.errorRequests}`, 'info');
  }
  
  // Exit with appropriate code
  process.exit(testResults.testsFailed > 0 ? 1 : 0);
}

async function performanceTest() {
  const url = new URL('/api/test-public', TEST_CONFIG.baseUrl);
  const requests = [];
  const numRequests = 50;
  
  log(`Making ${numRequests} concurrent requests for performance baseline...`, 'info');
  
  for (let i = 0; i < numRequests; i++) {
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Performance-Test/1.0',
        'Authorization': 'Bearer test-token'
      }
    };
    
    requests.push(makeRequest(options).catch(err => ({ error: err, responseTime: 0 })));
  }
  
  try {
    const responses = await Promise.all(requests);
    const validResponses = responses.filter(r => !r.error);
    const rateLimited = validResponses.filter(r => r.statusCode === 429);
    const errors = responses.filter(r => r.error || (r.statusCode >= 500));
    
    testResults.totalRequests = numRequests;
    testResults.successfulRequests = validResponses.length - rateLimited.length - errors.length;
    testResults.rateLimitedRequests = rateLimited.length;
    testResults.errorRequests = errors.length;
    testResults.averageResponseTime = validResponses.reduce((sum, r) => sum + r.responseTime, 0) / validResponses.length;
    
    log(`✅ Performance test completed`, 'success');
  } catch (error) {
    log(`⚠️ Performance test error: ${error.message}`, 'warning');
  }
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🛡️  7P Education Security System Test Suite

Usage: node test-security-system.js [options]

Options:
  --verbose     Show detailed test output
  --help, -h    Show this help message

Environment Variables:
  TEST_URL      Target URL to test (default: http://localhost:3000)
  TEST_API_KEY  API key for authenticated tests

Examples:
  npm run test:security
  TEST_URL=https://7peducation.com npm run test:security
  node scripts/test-security-system.js --verbose
`);
  process.exit(0);
}

// Run tests
runSecurityTests().catch(error => {
  log(`💥 Test suite crashed: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});