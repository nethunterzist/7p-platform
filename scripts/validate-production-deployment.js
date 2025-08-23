#!/usr/bin/env node

/**
 * 🔍 7P Education Production Deployment Validation
 * 
 * This script validates that the production deployment is working correctly
 */

const https = require('https');
const http = require('http');

// Console colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.bold}${colors.blue}🔍 ${msg}${colors.reset}`)
};

// Get base URL from command line or environment
const BASE_URL = process.argv[2] || process.env.DEPLOYMENT_URL || 'https://7p-education.vercel.app';

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': '7P-Education-Deployment-Validator/1.0',
        ...options.headers
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          url: url
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test cases
const tests = [
  {
    name: 'Homepage Load',
    url: '',
    expectedStatus: 200,
    checkContent: (data) => data.includes('7P Education') || data.includes('html'),
    critical: true
  },
  {
    name: 'API Health Check',
    url: '/api/health',
    expectedStatus: 200,
    checkContent: (data) => {
      try {
        const json = JSON.parse(data);
        return json.status === 'ok';
      } catch {
        return false;
      }
    },
    critical: true
  },
  {
    name: 'Public API Test',
    url: '/api/test-public',
    expectedStatus: 200,
    checkContent: (data) => {
      try {
        const json = JSON.parse(data);
        return json.message && json.timestamp;
      } catch {
        return false;
      }
    },
    critical: true
  },
  {
    name: 'Login Page',
    url: '/login',
    expectedStatus: 200,
    checkContent: (data) => data.includes('Login') || data.includes('Sign'),
    critical: false
  },
  {
    name: 'Register Page',
    url: '/register',
    expectedStatus: 200,
    checkContent: (data) => data.includes('Register') || data.includes('Sign up'),
    critical: false
  },
  {
    name: 'Admin Page (Should redirect or show login)',
    url: '/admin',
    expectedStatus: [200, 302, 401],
    checkContent: () => true, // Any content is fine
    critical: false
  }
];

// Security header tests
const securityHeaderTests = [
  {
    name: 'Strict-Transport-Security',
    check: (headers) => headers['strict-transport-security']?.includes('max-age'),
    critical: true
  },
  {
    name: 'X-Content-Type-Options',
    check: (headers) => headers['x-content-type-options'] === 'nosniff',
    critical: true
  },
  {
    name: 'X-Frame-Options',
    check: (headers) => headers['x-frame-options'] === 'DENY',
    critical: true
  },
  {
    name: 'X-XSS-Protection',
    check: (headers) => headers['x-xss-protection']?.includes('1'),
    critical: false
  },
  {
    name: 'Referrer-Policy',
    check: (headers) => headers['referrer-policy']?.includes('origin'),
    critical: false
  }
];

// Performance tests
const performanceTests = [
  {
    name: 'Response Time (Homepage)',
    url: '',
    maxTime: 3000,
    critical: false
  },
  {
    name: 'Response Time (API)',
    url: '/api/health',
    maxTime: 1000,
    critical: true
  }
];

// Run endpoint tests
async function runEndpointTests() {
  log.step('Testing API Endpoints...');
  
  let passed = 0;
  let failed = 0;
  const failures = [];
  
  for (const test of tests) {
    try {
      const startTime = Date.now();
      const response = await makeRequest(BASE_URL + test.url);
      const responseTime = Date.now() - startTime;
      
      // Check status code
      const statusOk = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus.includes(response.status)
        : response.status === test.expectedStatus;
      
      // Check content if specified
      const contentOk = test.checkContent ? test.checkContent(response.data) : true;
      
      if (statusOk && contentOk) {
        log.success(`${test.name} (${response.status}, ${responseTime}ms)`);
        passed++;
      } else {
        const reason = !statusOk 
          ? `Expected status ${test.expectedStatus}, got ${response.status}`
          : 'Content check failed';
        log.error(`${test.name}: ${reason}`);
        failed++;
        if (test.critical) {
          failures.push({ test: test.name, reason, critical: true });
        }
      }
      
    } catch (error) {
      log.error(`${test.name}: ${error.message}`);
      failed++;
      if (test.critical) {
        failures.push({ test: test.name, reason: error.message, critical: true });
      }
    }
  }
  
  return { passed, failed, failures };
}

// Run security header tests
async function runSecurityTests() {
  log.step('Testing Security Headers...');
  
  let passed = 0;
  let failed = 0;
  const failures = [];
  
  try {
    const response = await makeRequest(BASE_URL);
    
    for (const test of securityHeaderTests) {
      if (test.check(response.headers)) {
        log.success(`${test.name} header present`);
        passed++;
      } else {
        log.error(`${test.name} header missing or incorrect`);
        failed++;
        if (test.critical) {
          failures.push({ test: test.name, reason: 'Security header missing', critical: true });
        }
      }
    }
  } catch (error) {
    log.error(`Security header test failed: ${error.message}`);
    return { passed: 0, failed: securityHeaderTests.length, failures: [{ test: 'Security Headers', reason: error.message, critical: true }] };
  }
  
  return { passed, failed, failures };
}

// Run performance tests
async function runPerformanceTests() {
  log.step('Testing Performance...');
  
  let passed = 0;
  let failed = 0;
  const failures = [];
  
  for (const test of performanceTests) {
    try {
      const startTime = Date.now();
      await makeRequest(BASE_URL + test.url);
      const responseTime = Date.now() - startTime;
      
      if (responseTime <= test.maxTime) {
        log.success(`${test.name}: ${responseTime}ms (target: <${test.maxTime}ms)`);
        passed++;
      } else {
        log.warning(`${test.name}: ${responseTime}ms (exceeds ${test.maxTime}ms target)`);
        if (test.critical) {
          failed++;
          failures.push({ test: test.name, reason: `Response time ${responseTime}ms exceeds ${test.maxTime}ms`, critical: true });
        } else {
          passed++; // Non-critical performance issues don't fail the test
        }
      }
    } catch (error) {
      log.error(`${test.name}: ${error.message}`);
      failed++;
      if (test.critical) {
        failures.push({ test: test.name, reason: error.message, critical: true });
      }
    }
  }
  
  return { passed, failed, failures };
}

// Generate report
function generateReport(endpointResults, securityResults, performanceResults) {
  const totalPassed = endpointResults.passed + securityResults.passed + performanceResults.passed;
  const totalFailed = endpointResults.failed + securityResults.failed + performanceResults.failed;
  const totalTests = totalPassed + totalFailed;
  
  const criticalFailures = [
    ...endpointResults.failures,
    ...securityResults.failures,
    ...performanceResults.failures
  ].filter(f => f.critical);
  
  console.log(`\n${colors.bold}${colors.blue}📊 DEPLOYMENT VALIDATION REPORT${colors.reset}\n`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Date: ${new Date().toISOString()}\n`);
  
  console.log(`${colors.green}✅ Passed: ${totalPassed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${totalFailed}${colors.reset}`);
  console.log(`📊 Total: ${totalTests}\n`);
  
  // Detailed results
  console.log(`${colors.blue}📋 Test Categories:${colors.reset}`);
  console.log(`   Endpoints: ${endpointResults.passed}/${endpointResults.passed + endpointResults.failed}`);
  console.log(`   Security: ${securityResults.passed}/${securityResults.passed + securityResults.failed}`);
  console.log(`   Performance: ${performanceResults.passed}/${performanceResults.passed + performanceResults.failed}\n`);
  
  // Critical failures
  if (criticalFailures.length > 0) {
    console.log(`${colors.red}🚨 CRITICAL FAILURES:${colors.reset}`);
    criticalFailures.forEach(failure => {
      console.log(`   ❌ ${failure.test}: ${failure.reason}`);
    });
    console.log('');
  }
  
  // Overall status
  const success = criticalFailures.length === 0;
  
  if (success) {
    console.log(`${colors.bold}${colors.green}`);
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║            ✅ DEPLOYMENT VALIDATION PASSED               ║');
    console.log('║                                                          ║');
    console.log('║          Your production deployment is healthy!         ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(colors.reset);
  } else {
    console.log(`${colors.bold}${colors.red}`);
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║            ❌ DEPLOYMENT VALIDATION FAILED               ║');
    console.log('║                                                          ║');
    console.log('║          Please fix critical issues above               ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(colors.reset);
  }
  
  return success;
}

// Main validation function
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║        🔍 7P Education Deployment Validation            ║');
  console.log('║                                                          ║');
  console.log('║               Comprehensive Health Check                 ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  log.info(`Testing deployment at: ${BASE_URL}`);
  console.log('');
  
  try {
    const endpointResults = await runEndpointTests();
    console.log('');
    
    const securityResults = await runSecurityTests();
    console.log('');
    
    const performanceResults = await runPerformanceTests();
    console.log('');
    
    const success = generateReport(endpointResults, securityResults, performanceResults);
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    log.error(`Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run validation if script is called directly
if (require.main === module) {
  main();
}

module.exports = { main };