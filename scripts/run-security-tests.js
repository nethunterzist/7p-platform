#!/usr/bin/env node

/**
 * SECURITY TEST RUNNER - 7P Education
 * Comprehensive security testing automation and reporting
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  testTypes: {
    unit: {
      pattern: 'tests/security/auth-security.test.ts',
      timeout: 30000,
      description: 'Unit security tests'
    },
    penetration: {
      pattern: 'tests/security/penetration-tests.test.ts',
      timeout: 60000,
      description: 'Penetration testing scenarios'
    },
    integration: {
      pattern: 'tests/security/integration-tests.test.ts',
      timeout: 120000,
      description: 'Integration security tests'
    }
  },
  outputDir: './reports/security',
  timestamp: new Date().toISOString().replace(/[:.]/g, '-')
};

console.log('🛡️  7P Education - Security Testing Suite');
console.log('==========================================');

async function main() {
  try {
    // Prepare test environment
    await prepareTestEnvironment();
    
    // Run security tests
    const testResults = await runSecurityTests();
    
    // Generate security report
    await generateSecurityReport(testResults);
    
    // Analyze vulnerabilities
    await analyzeVulnerabilities(testResults);
    
    // Generate recommendations
    await generateRecommendations(testResults);
    
    console.log('\n✅ Security testing completed successfully!');
    console.log(`📊 Report generated: ${CONFIG.outputDir}/security-report-${CONFIG.timestamp}.html`);
    
    // Exit with appropriate code
    const hasFailures = testResults.some(result => result.failures > 0);
    process.exit(hasFailures ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Security testing failed:', error.message);
    process.exit(1);
  }
}

async function prepareTestEnvironment() {
  console.log('\n🔧 Preparing test environment...');
  
  // Create output directory
  const outputDir = CONFIG.outputDir;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Check test dependencies
  const dependencies = ['jest', '@types/jest', 'supertest', 'node-mocks-http'];
  
  for (const dep of dependencies) {
    try {
      require.resolve(dep);
    } catch (error) {
      console.log(`⚠️  Installing missing dependency: ${dep}`);
      execSync(`npm install --save-dev ${dep}`, { stdio: 'inherit' });
    }
  }
  
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.SECURITY_TESTING = 'true';
  
  console.log('✅ Test environment ready');
}

async function runSecurityTests() {
  console.log('\n🧪 Running security tests...');
  
  const testResults = [];
  
  for (const [testType, config] of Object.entries(CONFIG.testTypes)) {
    console.log(`\n📋 Running ${config.description}...`);
    
    try {
      const result = await runJestTest(config.pattern, config.timeout);
      
      testResults.push({
        type: testType,
        description: config.description,
        ...result
      });
      
      const status = result.failures === 0 ? '✅' : '❌';
      console.log(`  ${status} ${result.tests} tests, ${result.failures} failures`);
      
    } catch (error) {
      console.error(`  ❌ ${testType} tests failed:`, error.message);
      testResults.push({
        type: testType,
        description: config.description,
        tests: 0,
        failures: 1,
        error: error.message,
        duration: 0
      });
    }
  }
  
  return testResults;
}

function runJestTest(pattern, timeout) {
  return new Promise((resolve, reject) => {
    const jestArgs = [
      '--testPathPattern', pattern,
      '--testTimeout', timeout.toString(),
      '--json',
      '--coverage',
      '--verbose',
      '--detectOpenHandles',
      '--forceExit'
    ];
    
    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    jest.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    jest.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    jest.on('close', (code) => {
      try {
        // Parse Jest JSON output
        const lines = stdout.split('\n');
        const jsonLine = lines.find(line => line.startsWith('{'));
        
        if (jsonLine) {
          const result = JSON.parse(jsonLine);
          resolve({
            tests: result.numTotalTests || 0,
            failures: result.numFailedTests || 0,
            passed: result.numPassedTests || 0,
            duration: result.testResults?.[0]?.perfStats?.end - result.testResults?.[0]?.perfStats?.start || 0,
            coverage: result.coverageMap || null,
            details: result.testResults || []
          });
        } else {
          resolve({
            tests: 0,
            failures: code !== 0 ? 1 : 0,
            passed: code === 0 ? 1 : 0,
            duration: 0,
            error: stderr || 'Unknown error'
          });
        }
      } catch (parseError) {
        reject(new Error(`Failed to parse test results: ${parseError.message}`));
      }
    });
  });
}

async function generateSecurityReport(testResults) {
  console.log('\n📊 Generating security report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: calculateSummary(testResults),
    testResults: testResults,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      testEnv: process.env.NODE_ENV
    },
    securityMetrics: calculateSecurityMetrics(testResults)
  };
  
  // Generate JSON report
  const jsonReport = JSON.stringify(report, null, 2);
  fs.writeFileSync(
    path.join(CONFIG.outputDir, `security-report-${CONFIG.timestamp}.json`),
    jsonReport
  );
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(report);
  fs.writeFileSync(
    path.join(CONFIG.outputDir, `security-report-${CONFIG.timestamp}.html`),
    htmlReport
  );
  
  // Generate markdown summary
  const markdownReport = generateMarkdownReport(report);
  fs.writeFileSync(
    path.join(CONFIG.outputDir, `security-summary-${CONFIG.timestamp}.md`),
    markdownReport
  );
  
  console.log('✅ Security reports generated');
}

function calculateSummary(testResults) {
  const totalTests = testResults.reduce((sum, result) => sum + result.tests, 0);
  const totalFailures = testResults.reduce((sum, result) => sum + result.failures, 0);
  const totalPassed = totalTests - totalFailures;
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : '0';
  
  return {
    totalTests,
    totalFailures,
    totalPassed,
    successRate: parseFloat(successRate),
    status: totalFailures === 0 ? 'PASS' : 'FAIL'
  };
}

function calculateSecurityMetrics(testResults) {
  const metrics = {
    authenticationTests: 0,
    authorizationTests: 0,
    inputValidationTests: 0,
    cryptographyTests: 0,
    sessionManagementTests: 0,
    errorHandlingTests: 0,
    auditingTests: 0
  };
  
  // Analyze test categories based on test descriptions and results
  testResults.forEach(result => {
    if (result.details) {
      result.details.forEach(detail => {
        const testName = detail.testPath || '';
        
        if (testName.includes('auth') || testName.includes('login')) {
          metrics.authenticationTests += detail.numPassingTests || 0;
        }
        if (testName.includes('authorization') || testName.includes('permission')) {
          metrics.authorizationTests += detail.numPassingTests || 0;
        }
        if (testName.includes('validation') || testName.includes('input')) {
          metrics.inputValidationTests += detail.numPassingTests || 0;
        }
        if (testName.includes('crypto') || testName.includes('hash')) {
          metrics.cryptographyTests += detail.numPassingTests || 0;
        }
        if (testName.includes('session') || testName.includes('csrf')) {
          metrics.sessionManagementTests += detail.numPassingTests || 0;
        }
        if (testName.includes('error') || testName.includes('handling')) {
          metrics.errorHandlingTests += detail.numPassingTests || 0;
        }
        if (testName.includes('audit') || testName.includes('log')) {
          metrics.auditingTests += detail.numPassingTests || 0;
        }
      });
    }
  });
  
  return metrics;
}

function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>7P Education - Security Test Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 20px;
            background: #f8fafc;
        }
        .metric {
            background: white;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #1f2937;
        }
        .metric-label {
            color: #6b7280;
            font-size: 0.9em;
        }
        .status-pass { color: #10b981; }
        .status-fail { color: #ef4444; }
        .test-results {
            padding: 20px;
        }
        .test-category {
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
        }
        .test-category-header {
            background: #f9fafb;
            padding: 15px;
            font-weight: bold;
            border-bottom: 1px solid #e5e7eb;
        }
        .test-category-content {
            padding: 15px;
        }
        .test-item {
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-item:last-child {
            border-bottom: none;
        }
        .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .badge-pass {
            background: #d1fae5;
            color: #065f46;
        }
        .badge-fail {
            background: #fee2e2;
            color: #991b1b;
        }
        .recommendations {
            background: #fffbeb;
            border: 1px solid #fbbf24;
            border-radius: 6px;
            padding: 20px;
            margin: 20px;
        }
        .timestamp {
            text-align: center;
            color: #6b7280;
            font-size: 0.9em;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Security Test Report</h1>
            <p>7P Education Platform</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value ${report.summary.status === 'PASS' ? 'status-pass' : 'status-fail'}">
                    ${report.summary.status}
                </div>
                <div class="metric-label">Overall Status</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value status-pass">${report.summary.totalPassed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value status-fail">${report.summary.totalFailures}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>

        <div class="test-results">
            <h2>Test Categories</h2>
            ${report.testResults.map(result => `
                <div class="test-category">
                    <div class="test-category-header">
                        ${result.description}
                        <span class="badge ${result.failures === 0 ? 'badge-pass' : 'badge-fail'}">
                            ${result.failures === 0 ? 'PASS' : 'FAIL'}
                        </span>
                    </div>
                    <div class="test-category-content">
                        <div class="test-item">
                            <span>Tests Run</span>
                            <span>${result.tests}</span>
                        </div>
                        <div class="test-item">
                            <span>Passed</span>
                            <span class="status-pass">${result.passed || (result.tests - result.failures)}</span>
                        </div>
                        <div class="test-item">
                            <span>Failed</span>
                            <span class="status-fail">${result.failures}</span>
                        </div>
                        <div class="test-item">
                            <span>Duration</span>
                            <span>${result.duration}ms</span>
                        </div>
                        ${result.error ? `
                        <div class="test-item">
                            <span>Error</span>
                            <span class="status-fail">${result.error}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h3>🔍 Security Recommendations</h3>
            <ul>
                <li><strong>Password Security</strong>: All password validation tests should pass</li>
                <li><strong>Session Management</strong>: Verify timeout and concurrent session limits</li>
                <li><strong>Rate Limiting</strong>: Ensure brute force protection is working</li>
                <li><strong>Input Validation</strong>: Check SQL injection and XSS protection</li>
                <li><strong>Audit Logging</strong>: Verify all security events are logged</li>
                <li><strong>Email Verification</strong>: Test mandatory verification flow</li>
            </ul>
        </div>

        <div class="timestamp">
            Generated: ${new Date(report.timestamp).toLocaleString('tr-TR')}
        </div>
    </div>
</body>
</html>`;
}

function generateMarkdownReport(report) {
  return `# 🛡️ Security Test Report - 7P Education

**Generated**: ${new Date(report.timestamp).toLocaleString('tr-TR')}

## Summary

| Metric | Value |
|--------|-------|
| **Overall Status** | ${report.summary.status} |
| **Total Tests** | ${report.summary.totalTests} |
| **Passed** | ${report.summary.totalPassed} |
| **Failed** | ${report.summary.totalFailures} |
| **Success Rate** | ${report.summary.successRate}% |

## Test Results

${report.testResults.map(result => `
### ${result.description}

- **Status**: ${result.failures === 0 ? '✅ PASS' : '❌ FAIL'}
- **Tests**: ${result.tests}
- **Passed**: ${result.passed || (result.tests - result.failures)}
- **Failed**: ${result.failures}
- **Duration**: ${result.duration}ms
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('\n')}

## Security Metrics

${Object.entries(report.securityMetrics).map(([key, value]) => 
  `- **${key.replace(/([A-Z])/g, ' $1').toLowerCase()}**: ${value} tests passed`
).join('\n')}

## Recommendations

### 🔐 Critical Security Checks

1. **Authentication System**
   - Verify password strength requirements
   - Test brute force protection
   - Validate session management

2. **Input Validation**
   - SQL injection protection
   - XSS prevention
   - Command injection safeguards

3. **Authorization**
   - Role-based access control
   - Resource permission checks
   - Privilege escalation prevention

4. **Data Protection**
   - Encryption at rest and in transit
   - Secure data handling
   - GDPR compliance

### 🚨 Action Items

${report.summary.totalFailures > 0 ? `
**⚠️ FAILURES DETECTED**: ${report.summary.totalFailures} test(s) failed. Review and fix immediately before production deployment.

${report.testResults.filter(r => r.failures > 0).map(r => `
- **${r.description}**: ${r.failures} failure(s)
  ${r.error ? `  - Error: ${r.error}` : ''}
`).join('')}
` : '**✅ ALL TESTS PASSED**: Security validation successful. System ready for production deployment.'}

---

**Next Steps**:
1. Address any failed tests
2. Review security recommendations
3. Update security documentation
4. Schedule regular security testing
`;
}

async function analyzeVulnerabilities(testResults) {
  console.log('\n🔍 Analyzing security vulnerabilities...');
  
  const vulnerabilities = [];
  
  testResults.forEach(result => {
    if (result.failures > 0) {
      vulnerabilities.push({
        category: result.type,
        description: result.description,
        severity: determineSeverity(result.type),
        failureCount: result.failures,
        recommendation: getRecommendation(result.type)
      });
    }
  });
  
  if (vulnerabilities.length > 0) {
    console.log(`⚠️  Found ${vulnerabilities.length} security issue(s):`);
    vulnerabilities.forEach((vuln, index) => {
      console.log(`  ${index + 1}. ${vuln.category} - ${vuln.severity} severity`);
      console.log(`     ${vuln.description}`);
      console.log(`     Recommendation: ${vuln.recommendation}`);
    });
  } else {
    console.log('✅ No security vulnerabilities detected');
  }
  
  return vulnerabilities;
}

function determineSeverity(testType) {
  const severityMap = {
    unit: 'Medium',
    penetration: 'Critical',
    integration: 'High'
  };
  return severityMap[testType] || 'Medium';
}

function getRecommendation(testType) {
  const recommendations = {
    unit: 'Review and fix individual security component failures',
    penetration: 'Critical security vulnerabilities found - immediate action required',
    integration: 'End-to-end security flow issues detected - review system integration'
  };
  return recommendations[testType] || 'Review and address the failing tests';
}

async function generateRecommendations(testResults) {
  console.log('\n📋 Generating security recommendations...');
  
  const recommendations = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  };
  
  // Analyze test results and generate recommendations
  testResults.forEach(result => {
    if (result.failures > 0) {
      if (result.type === 'penetration') {
        recommendations.immediate.push(`Fix ${result.description} failures immediately`);
      } else if (result.type === 'integration') {
        recommendations.shortTerm.push(`Address ${result.description} integration issues`);
      } else {
        recommendations.longTerm.push(`Improve ${result.description} coverage`);
      }
    }
  });
  
  // Add general recommendations
  recommendations.longTerm.push('Schedule regular security testing');
  recommendations.longTerm.push('Update security documentation');
  recommendations.longTerm.push('Implement automated security scanning');
  
  // Save recommendations
  const recommendationsFile = path.join(CONFIG.outputDir, `security-recommendations-${CONFIG.timestamp}.json`);
  fs.writeFileSync(recommendationsFile, JSON.stringify(recommendations, null, 2));
  
  console.log('✅ Recommendations generated');
}

// Run the security testing suite
if (require.main === module) {
  main();
}

module.exports = {
  runSecurityTests: main,
  CONFIG
};