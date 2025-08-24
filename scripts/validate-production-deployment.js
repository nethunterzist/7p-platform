#!/usr/bin/env node

/**
 * 🚀 7P Education - Production Deployment Validation Script
 * 
 * Comprehensive validation suite for production deployment
 * Tests critical functionality, security, and performance
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const PRODUCTION_URL = process.argv[2] || 'https://7p-education.vercel.app';
const TIMEOUT = 10000; // 10 seconds
const MAX_LOAD_TIME = 3000; // 3 seconds for acceptable load time

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

// Test results tracking
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

/**
 * HTTP request wrapper with timeout and error handling
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const request = https.request(url, {
            timeout: TIMEOUT,
            ...options
        }, (response) => {
            const duration = Date.now() - startTime;
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                resolve({
                    statusCode: response.statusCode,
                    headers: response.headers,
                    data,
                    duration
                });
            });
        });
        
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.end();
    });
}

/**
 * Test runner with result tracking
 */
async function runTest(name, testFunction) {
    results.total++;
    console.log(`${colors.cyan}🧪 Testing:${colors.reset} ${name}`);
    
    try {
        const startTime = Date.now();
        const result = await testFunction();
        const duration = Date.now() - startTime;
        
        if (result.status === 'pass') {
            results.passed++;
            console.log(`${colors.green}✅ PASSED:${colors.reset} ${name} ${colors.yellow}(${duration}ms)${colors.reset}`);
            if (result.message) {
                console.log(`   ${colors.white}${result.message}${colors.reset}`);
            }
        } else if (result.status === 'warning') {
            results.warnings++;
            console.log(`${colors.yellow}⚠️  WARNING:${colors.reset} ${name} ${colors.yellow}(${duration}ms)${colors.reset}`);
            console.log(`   ${colors.yellow}${result.message}${colors.reset}`);
        } else {
            results.failed++;
            console.log(`${colors.red}❌ FAILED:${colors.reset} ${name} ${colors.yellow}(${duration}ms)${colors.reset}`);
            console.log(`   ${colors.red}${result.message}${colors.reset}`);
        }
        
        results.tests.push({
            name,
            status: result.status,
            duration,
            message: result.message || '',
            details: result.details || {}
        });
        
    } catch (error) {
        results.failed++;
        console.log(`${colors.red}❌ ERROR:${colors.reset} ${name}`);
        console.log(`   ${colors.red}${error.message}${colors.reset}`);
        
        results.tests.push({
            name,
            status: 'error',
            duration: 0,
            message: error.message,
            details: {}
        });
    }
    
    console.log(''); // Empty line for readability
}

/**
 * Basic connectivity test
 */
async function testBasicConnectivity() {
    try {
        const response = await makeRequest(PRODUCTION_URL);
        
        if (response.statusCode === 200) {
            return {
                status: 'pass',
                message: `Site accessible (${response.duration}ms)`,
                details: { statusCode: response.statusCode, duration: response.duration }
            };
        } else {
            return {
                status: 'fail',
                message: `Unexpected status code: ${response.statusCode}`,
                details: { statusCode: response.statusCode }
            };
        }
    } catch (error) {
        return {
            status: 'fail',
            message: `Connection failed: ${error.message}`,
            details: { error: error.message }
        };
    }
}

/**
 * Security headers validation
 */
async function testSecurityHeaders() {
    try {
        const response = await makeRequest(PRODUCTION_URL);
        const headers = response.headers;
        
        const requiredHeaders = {
            'strict-transport-security': 'HSTS header missing',
            'x-content-type-options': 'Content type options header missing',
            'x-frame-options': 'Frame options header missing',
            'x-xss-protection': 'XSS protection header missing',
            'referrer-policy': 'Referrer policy header missing'
        };
        
        const missingHeaders = [];
        const presentHeaders = [];
        
        for (const [header, description] of Object.entries(requiredHeaders)) {
            if (headers[header]) {
                presentHeaders.push(header);
            } else {
                missingHeaders.push(description);
            }
        }
        
        if (missingHeaders.length === 0) {
            return {
                status: 'pass',
                message: `All security headers present (${presentHeaders.length}/5)`,
                details: { presentHeaders, missingHeaders }
            };
        } else if (presentHeaders.length >= 3) {
            return {
                status: 'warning',
                message: `Some security headers missing: ${missingHeaders.join(', ')}`,
                details: { presentHeaders, missingHeaders }
            };
        } else {
            return {
                status: 'fail',
                message: `Critical security headers missing: ${missingHeaders.join(', ')}`,
                details: { presentHeaders, missingHeaders }
            };
        }
    } catch (error) {
        return {
            status: 'fail',
            message: `Security headers test failed: ${error.message}`,
            details: { error: error.message }
        };
    }
}

/**
 * API endpoint functionality test
 */
async function testAPIEndpoint() {
    try {
        const apiUrl = new URL('/api/test-public', PRODUCTION_URL).toString();
        const response = await makeRequest(apiUrl);
        
        if (response.statusCode === 200) {
            try {
                const data = JSON.parse(response.data);
                return {
                    status: 'pass',
                    message: `API endpoint functional (${response.duration}ms)`,
                    details: { 
                        statusCode: response.statusCode, 
                        duration: response.duration,
                        responseData: data
                    }
                };
            } catch (parseError) {
                return {
                    status: 'warning',
                    message: 'API responds but invalid JSON',
                    details: { statusCode: response.statusCode, parseError: parseError.message }
                };
            }
        } else {
            return {
                status: 'fail',
                message: `API endpoint returned status ${response.statusCode}`,
                details: { statusCode: response.statusCode }
            };
        }
    } catch (error) {
        return {
            status: 'fail',
            message: `API endpoint test failed: ${error.message}`,
            details: { error: error.message }
        };
    }
}

/**
 * Performance test - load time measurement
 */
async function testPerformance() {
    try {
        const response = await makeRequest(PRODUCTION_URL);
        const loadTime = response.duration;
        
        if (loadTime <= MAX_LOAD_TIME) {
            return {
                status: 'pass',
                message: `Page load time excellent: ${loadTime}ms (≤ ${MAX_LOAD_TIME}ms target)`,
                details: { loadTime, target: MAX_LOAD_TIME }
            };
        } else if (loadTime <= MAX_LOAD_TIME * 1.5) {
            return {
                status: 'warning',
                message: `Page load time acceptable: ${loadTime}ms (target: ≤ ${MAX_LOAD_TIME}ms)`,
                details: { loadTime, target: MAX_LOAD_TIME }
            };
        } else {
            return {
                status: 'fail',
                message: `Page load time too slow: ${loadTime}ms (target: ≤ ${MAX_LOAD_TIME}ms)`,
                details: { loadTime, target: MAX_LOAD_TIME }
            };
        }
    } catch (error) {
        return {
            status: 'fail',
            message: `Performance test failed: ${error.message}`,
            details: { error: error.message }
        };
    }
}

/**
 * Generate test report
 */
function generateReport() {
    console.log(`${colors.bright}${colors.cyan}🚀 7P Education - Production Deployment Validation Report${colors.reset}`);
    console.log(`${colors.cyan}=================================================================${colors.reset}\n`);
    
    console.log(`${colors.bright}Target URL:${colors.reset} ${PRODUCTION_URL}`);
    console.log(`${colors.bright}Test Date:${colors.reset} ${new Date().toISOString()}`);
    console.log(`${colors.bright}Total Tests:${colors.reset} ${results.total}\n`);
    
    // Results summary
    const passRate = ((results.passed / results.total) * 100).toFixed(1);
    console.log(`${colors.bright}📊 Results Summary:${colors.reset}`);
    console.log(`${colors.green}✅ Passed:${colors.reset} ${results.passed}`);
    console.log(`${colors.yellow}⚠️  Warnings:${colors.reset} ${results.warnings}`);
    console.log(`${colors.red}❌ Failed:${colors.reset} ${results.failed}`);
    console.log(`${colors.bright}📈 Pass Rate:${colors.reset} ${passRate}%\n`);
    
    // Overall status
    let overallStatus = 'UNKNOWN';
    let statusColor = colors.white;
    
    if (results.failed === 0 && results.warnings <= 2) {
        overallStatus = 'EXCELLENT';
        statusColor = colors.green;
    } else if (results.failed <= 1 && results.warnings <= 4) {
        overallStatus = 'GOOD';
        statusColor = colors.yellow;
    } else if (results.failed <= 3) {
        overallStatus = 'NEEDS ATTENTION';
        statusColor = colors.yellow;
    } else {
        overallStatus = 'CRITICAL ISSUES';
        statusColor = colors.red;
    }
    
    console.log(`${colors.bright}🎯 Overall Status:${colors.reset} ${statusColor}${overallStatus}${colors.reset}\n`);
    
    // Recommendations
    console.log(`${colors.bright}💡 Recommendations:${colors.reset}`);
    
    if (results.failed === 0) {
        console.log(`${colors.green}✅ Deployment is production-ready!${colors.reset}`);
        console.log(`   - All critical systems operational`);
        console.log(`   - Security measures active`);
        console.log(`   - Performance within acceptable ranges`);
    } else {
        console.log(`${colors.red}❌ Critical issues need to be resolved:${colors.reset}`);
        
        const failedTests = results.tests.filter(t => t.status === 'fail' || t.status === 'error');
        failedTests.forEach(test => {
            console.log(`   - ${test.name}: ${test.message}`);
        });
    }
    
    console.log(`\n${colors.bright}🔗 Quick Links:${colors.reset}`);
    console.log(`   - Site: ${PRODUCTION_URL}`);
    console.log(`   - Admin: ${PRODUCTION_URL}/admin`);
    console.log(`   - API Health: ${PRODUCTION_URL}/api/health`);
    console.log(`   - API Test: ${PRODUCTION_URL}/api/test-public`);
    
    console.log(`\n${colors.cyan}=================================================================${colors.reset}`);
    console.log(`${colors.bright}Validation completed at ${new Date().toLocaleString()}${colors.reset}`);
}

/**
 * Main execution
 */
async function main() {
    console.log(`${colors.bright}${colors.blue}🚀 Starting Production Deployment Validation${colors.reset}`);
    console.log(`${colors.blue}Target: ${PRODUCTION_URL}${colors.reset}\n`);
    
    // Run core tests
    await runTest('Basic Connectivity', testBasicConnectivity);
    await runTest('Security Headers', testSecurityHeaders);
    await runTest('API Functionality', testAPIEndpoint);
    await runTest('Performance (Load Time)', testPerformance);
    
    // Generate and display report
    generateReport();
}

// Run the validation
main().catch((error) => {
    console.error(`${colors.red}💥 Validation script failed:${colors.reset}`, error.message);
    process.exit(1);
});