#!/usr/bin/env tsx

/**
 * 7P Education - Production Smoke Testing Script
 * 
 * Comprehensive post-deployment smoke testing for production environment
 * Usage: npm run prod-smoke [url]
 */

import { performance } from 'perf_hooks';
import { HealthChecker } from './ping-health.js';

interface SmokeTest {
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  category: 'infrastructure' | 'authentication' | 'api' | 'security' | 'performance';
  testFn: (baseUrl: string) => Promise<TestResult>;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  responseTime?: number;
  recommendations?: string[];
}

interface SmokeTestReport {
  timestamp: string;
  target_url: string;
  duration: number;
  overall_status: 'passed' | 'failed' | 'warning';
  summary: {
    total: number;
    passed: number;
    failed: number;
    p0_failed: number;
    p1_failed: number;
  };
  results: {
    test: string;
    category: string;
    priority: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    responseTime?: number;
    recommendations?: string[];
  }[];
}

// Utility functions
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function measureResponseTime<T>(asyncFn: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = await asyncFn();
  const time = Math.round(performance.now() - start);
  return { result, time };
}

// Test definitions
const SMOKE_TESTS: SmokeTest[] = [
  // P0 Critical Tests
  {
    name: 'Health Endpoint',
    description: 'Verify application health endpoint returns healthy status',
    priority: 'P0',
    category: 'infrastructure',
    testFn: async (baseUrl: string): Promise<TestResult> => {
      const { result, time } = await measureResponseTime(async () => {
        const response = await fetchWithTimeout(`${baseUrl}/api/health`, {}, 5000);
        return response;
      });

      if (!result.ok) {
        return {
          success: false,
          message: `Health endpoint returned ${result.status}`,
          responseTime: time,
          recommendations: ['Check application logs', 'Verify database connectivity', 'Consider rollback'],
        };
      }

      try {
        const data = await result.json();
        if (data.status !== 'healthy') {
          return {
            success: false,
            message: `Health status is '${data.status}', expected 'healthy'`,
            responseTime: time,
            details: data,
            recommendations: ['Check database connection', 'Verify environment variables'],
          };
        }

        return {
          success: true,
          message: `Health endpoint operational (${time}ms)`,
          responseTime: time,
          details: data,
        };
      } catch (error) {
        return {
          success: false,
          message: 'Health endpoint returned invalid JSON',
          responseTime: time,
          recommendations: ['Check API route implementation'],
        };
      }
    },
  },

  {
    name: 'Homepage Load',
    description: 'Verify homepage loads successfully with proper status',
    priority: 'P0',
    category: 'infrastructure',
    testFn: async (baseUrl: string): Promise<TestResult> => {
      const { result, time } = await measureResponseTime(async () => {
        return fetchWithTimeout(baseUrl, {}, 10000);
      });

      if (!result.ok) {
        return {
          success: false,
          message: `Homepage returned ${result.status}`,
          responseTime: time,
          recommendations: ['Check routing configuration', 'Verify build succeeded'],
        };
      }

      return {
        success: true,
        message: `Homepage loads successfully (${time}ms)`,
        responseTime: time,
        recommendations: time > 3000 ? ['Consider performance optimization'] : undefined,
      };
    },
  },

  {
    name: 'API Endpoints',
    description: 'Verify core API endpoints are accessible',
    priority: 'P0',
    category: 'api',
    testFn: async (baseUrl: string): Promise<TestResult> => {
      const endpoints = ['/api/courses', '/api/auth/providers'];
      const results: Array<{ endpoint: string; status: number; time: number }> = [];

      for (const endpoint of endpoints) {
        const { result, time } = await measureResponseTime(async () => {
          return fetchWithTimeout(`${baseUrl}${endpoint}`, {}, 5000);
        });
        
        results.push({
          endpoint,
          status: result.status,
          time,
        });
      }

      const failed = results.filter(r => r.status >= 500);
      
      if (failed.length > 0) {
        return {
          success: false,
          message: `${failed.length} API endpoints returning 500 errors`,
          details: results,
          recommendations: ['Check API route implementations', 'Verify environment variables'],
        };
      }

      const avgTime = Math.round(results.reduce((sum, r) => sum + r.time, 0) / results.length);
      
      return {
        success: true,
        message: `API endpoints operational (avg ${avgTime}ms)`,
        responseTime: avgTime,
        details: results,
      };
    },
  },

  {
    name: 'Authentication System',
    description: 'Verify authentication providers endpoint',
    priority: 'P0',
    category: 'authentication',
    testFn: async (baseUrl: string): Promise<TestResult> => {
      const { result, time } = await measureResponseTime(async () => {
        return fetchWithTimeout(`${baseUrl}/api/auth/providers`, {}, 5000);
      });

      if (!result.ok) {
        return {
          success: false,
          message: `Auth providers endpoint returned ${result.status}`,
          responseTime: time,
          recommendations: ['Check NextAuth configuration', 'Verify NEXTAUTH_SECRET'],
        };
      }

      try {
        const data = await result.json();
        if (!data || Object.keys(data).length === 0) {
          return {
            success: false,
            message: 'No authentication providers configured',
            responseTime: time,
            recommendations: ['Configure authentication providers'],
          };
        }

        return {
          success: true,
          message: `Authentication system operational (${time}ms)`,
          responseTime: time,
          details: Object.keys(data),
        };
      } catch (error) {
        return {
          success: false,
          message: 'Auth providers returned invalid JSON',
          responseTime: time,
        };
      }
    },
  },

  // P1 Essential Tests
  {
    name: 'Payment Configuration',
    description: 'Verify Stripe integration is properly configured',
    priority: 'P1',
    category: 'api',
    testFn: async (baseUrl: string): Promise<TestResult> => {
      const { result, time } = await measureResponseTime(async () => {
        return fetchWithTimeout(`${baseUrl}/api/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true }),
        }, 5000);
      });

      // We expect this to fail with authentication error (not 500)
      if (result.status >= 500) {
        return {
          success: false,
          message: `Payment endpoint returning server error (${result.status})`,
          responseTime: time,
          recommendations: ['Check Stripe configuration', 'Verify STRIPE_SECRET_KEY'],
        };
      }

      return {
        success: true,
        message: `Payment system configured (${time}ms)`,
        responseTime: time,
      };
    },
  },

  {
    name: 'Database Connectivity',
    description: 'Verify database is accessible through health endpoint',
    priority: 'P1',
    category: 'infrastructure',
    testFn: async (baseUrl: string): Promise<TestResult> => {
      const { result, time } = await measureResponseTime(async () => {
        const response = await fetchWithTimeout(`${baseUrl}/api/health`, {}, 5000);
        return response.json();
      });

      if (result.database === 'connected') {
        return {
          success: true,
          message: `Database connectivity verified (${time}ms)`,
          responseTime: time,
        };
      } else if (result.database === 'error') {
        return {
          success: false,
          message: 'Database connection failed',
          responseTime: time,
          recommendations: ['Check Supabase configuration', 'Verify database credentials'],
        };
      } else {
        return {
          success: result.status === 'healthy',
          message: `Database status unknown but health check ${result.status}`,
          responseTime: time,
        };
      }
    },
  },

  // P2 Security Tests
  {
    name: 'Security Headers',
    description: 'Verify security headers are properly configured',
    priority: 'P2',
    category: 'security',
    testFn: async (baseUrl: string): Promise<TestResult> => {
      const { result, time } = await measureResponseTime(async () => {
        return fetchWithTimeout(baseUrl, {}, 5000);
      });

      const requiredHeaders = [
        'strict-transport-security',
        'x-content-type-options',
        'x-frame-options',
        'content-security-policy',
      ];

      const missingHeaders = requiredHeaders.filter(header => 
        !result.headers.get(header)
      );

      if (missingHeaders.length > 0) {
        return {
          success: false,
          message: `Missing security headers: ${missingHeaders.join(', ')}`,
          responseTime: time,
          recommendations: ['Check next.config.ts security headers configuration'],
        };
      }

      return {
        success: true,
        message: `Security headers properly configured (${time}ms)`,
        responseTime: time,
      };
    },
  },

  {
    name: 'Performance Check',
    description: 'Verify response times are within acceptable limits',
    priority: 'P2',
    category: 'performance',
    testFn: async (baseUrl: string): Promise<TestResult> => {
      const endpoints = [
        { url: '', name: 'Homepage', threshold: 3000 },
        { url: '/api/health', name: 'Health API', threshold: 1000 },
        { url: '/api/courses', name: 'Courses API', threshold: 2000 },
      ];

      const results: Array<{ name: string; time: number; threshold: number; passed: boolean }> = [];

      for (const endpoint of endpoints) {
        const { result, time } = await measureResponseTime(async () => {
          return fetchWithTimeout(`${baseUrl}${endpoint.url}`, {}, 10000);
        });
        
        results.push({
          name: endpoint.name,
          time,
          threshold: endpoint.threshold,
          passed: time <= endpoint.threshold,
        });
      }

      const slowEndpoints = results.filter(r => !r.passed);
      const avgTime = Math.round(results.reduce((sum, r) => sum + r.time, 0) / results.length);

      if (slowEndpoints.length > 0) {
        return {
          success: false,
          message: `${slowEndpoints.length} endpoints exceed performance thresholds`,
          responseTime: avgTime,
          details: results,
          recommendations: ['Consider performance optimization', 'Review database queries'],
        };
      }

      return {
        success: true,
        message: `Performance within acceptable limits (avg ${avgTime}ms)`,
        responseTime: avgTime,
        details: results,
      };
    },
  },

  {
    name: 'Error Handling',
    description: 'Verify proper error handling for non-existent endpoints',
    priority: 'P2',
    category: 'api',
    testFn: async (baseUrl: string): Promise<TestResult> => {
      const { result, time } = await measureResponseTime(async () => {
        return fetchWithTimeout(`${baseUrl}/api/nonexistent-endpoint`, {}, 5000);
      });

      if (result.status !== 404) {
        return {
          success: false,
          message: `Expected 404 for non-existent endpoint, got ${result.status}`,
          responseTime: time,
          recommendations: ['Check API error handling configuration'],
        };
      }

      try {
        const contentType = result.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          await result.json(); // Verify it's valid JSON
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error response is not valid JSON',
          responseTime: time,
          recommendations: ['Ensure error responses return valid JSON'],
        };
      }

      return {
        success: true,
        message: `Error handling working correctly (${time}ms)`,
        responseTime: time,
      };
    },
  },
];

class SmokeTestRunner {
  private baseUrl: string;
  private verbose: boolean;

  constructor(baseUrl: string, options: { verbose?: boolean } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.verbose = options.verbose || false;
  }

  async runAllTests(): Promise<SmokeTestReport> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    console.log('🔥 7P Education - Production Smoke Tests');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log(`🕐 Started: ${timestamp}`);
    console.log(`📊 Total Tests: ${SMOKE_TESTS.length}`);
    console.log('=' .repeat(70));

    const results: SmokeTestReport['results'] = [];
    let passed = 0;
    let failed = 0;
    let p0Failed = 0;
    let p1Failed = 0;

    // Run tests sequentially to avoid overwhelming the server
    for (const test of SMOKE_TESTS) {
      if (this.verbose) {
        console.log(`\n🔍 Running: ${test.name}`);
      }

      try {
        const result = await test.testFn(this.baseUrl);
        const status = result.success ? 'passed' : 'failed';
        
        if (result.success) {
          passed++;
        } else {
          failed++;
          if (test.priority === 'P0') p0Failed++;
          if (test.priority === 'P1') p1Failed++;
        }

        results.push({
          test: test.name,
          category: test.category,
          priority: test.priority,
          status,
          message: result.message,
          responseTime: result.responseTime,
          recommendations: result.recommendations,
        });

        // Display result
        const emoji = result.success ? '✅' : (test.priority === 'P0' ? '🚨' : '⚠️');
        const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';
        console.log(`${emoji} ${test.name}${timeStr}: ${result.message}`);

        if (!result.success && result.recommendations && this.verbose) {
          result.recommendations.forEach(rec => {
            console.log(`    💡 ${rec}`);
          });
        }

      } catch (error) {
        failed++;
        if (test.priority === 'P0') p0Failed++;
        if (test.priority === 'P1') p1Failed++;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.push({
          test: test.name,
          category: test.category,
          priority: test.priority,
          status: 'failed',
          message: `Test execution failed: ${errorMessage}`,
          recommendations: ['Check network connectivity', 'Verify target URL'],
        });

        console.log(`🚨 ${test.name}: Test execution failed - ${errorMessage}`);
      }
    }

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    // Determine overall status
    let overallStatus: 'passed' | 'failed' | 'warning';
    if (p0Failed > 0) {
      overallStatus = 'failed';
    } else if (p1Failed > 0 || failed > 0) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'passed';
    }

    const report: SmokeTestReport = {
      timestamp,
      target_url: this.baseUrl,
      duration,
      overall_status: overallStatus,
      summary: {
        total: SMOKE_TESTS.length,
        passed,
        failed,
        p0_failed: p0Failed,
        p1_failed: p1Failed,
      },
      results,
    };

    this.printSummary(report);
    return report;
  }

  private printSummary(report: SmokeTestReport): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 SMOKE TEST SUMMARY');
    console.log('='.repeat(70));

    const statusEmoji = report.overall_status === 'passed' ? '✅' : 
                       report.overall_status === 'warning' ? '⚠️' : '🚨';
    
    console.log(`Status: ${statusEmoji} ${report.overall_status.toUpperCase()}`);
    console.log(`Duration: ${report.duration}ms`);
    console.log(`Passed: ${report.summary.passed}/${report.summary.total}`);
    console.log(`Failed: ${report.summary.failed}/${report.summary.total}`);
    
    if (report.summary.p0_failed > 0) {
      console.log(`🚨 Critical (P0) failures: ${report.summary.p0_failed}`);
    }
    
    if (report.summary.p1_failed > 0) {
      console.log(`⚠️  High (P1) failures: ${report.summary.p1_failed}`);
    }

    // Category breakdown
    const categories = ['infrastructure', 'authentication', 'api', 'security', 'performance'];
    console.log('\n📈 Results by Category:');
    categories.forEach(category => {
      const categoryTests = report.results.filter(r => r.category === category);
      const categoryPassed = categoryTests.filter(r => r.status === 'passed').length;
      const categoryTotal = categoryTests.length;
      
      if (categoryTotal > 0) {
        const emoji = categoryPassed === categoryTotal ? '✅' : '⚠️';
        console.log(`  ${emoji} ${category}: ${categoryPassed}/${categoryTotal}`);
      }
    });

    console.log('='.repeat(70));

    // Recommendations based on status
    if (report.overall_status === 'failed') {
      console.log('\n🚨 IMMEDIATE ACTION REQUIRED:');
      console.log('• Critical systems are not functioning properly');
      console.log('• Consider immediate rollback to previous deployment');
      console.log('• Check application logs: vercel logs --tail');
      console.log('• Verify all environment variables are configured');
    } else if (report.overall_status === 'warning') {
      console.log('\n⚠️  ACTION RECOMMENDED:');
      console.log('• Some systems need attention but core functionality works');
      console.log('• Monitor for user impact');
      console.log('• Schedule maintenance for failing tests');
    } else {
      console.log('\n🎉 DEPLOYMENT SUCCESSFUL:');
      console.log('• All critical systems are operational');
      console.log('• Ready for production traffic');
      
      // Performance recommendations
      const slowTests = report.results.filter(r => r.responseTime && r.responseTime > 2000);
      if (slowTests.length > 0) {
        console.log('\n⚡ Performance optimization opportunities:');
        slowTests.forEach(test => {
          console.log(`  • ${test.test}: ${test.responseTime}ms`);
        });
      }
    }
  }
}

// CLI functionality
function parseArgs(args: string[]): {
  url?: string;
  verbose: boolean;
  json: boolean;
  help: boolean;
} {
  const result = {
    url: undefined as string | undefined,
    verbose: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--url':
      case '-u':
        result.url = args[++i];
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--json':
      case '-j':
        result.json = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
      default:
        if (!result.url && arg.startsWith('http')) {
          result.url = arg;
        }
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
🔥 7P Education Production Smoke Tests

Comprehensive post-deployment validation for production environments.
Tests include infrastructure, authentication, API, security, and performance.

Usage: npm run prod-smoke [options] [url]

Options:
  -u, --url <url>    Target URL (default: from environment or localhost:3000)
  -v, --verbose      Show detailed output and recommendations
  -j, --json         Output results as JSON
  -h, --help         Show this help

Examples:
  npm run prod-smoke                                   # Test localhost:3000
  npm run prod-smoke https://your-domain.com          # Test production
  npm run prod-smoke --verbose --json > results.json  # Save detailed results

Test Priorities:
  P0 (Critical): Must pass - deployment failure if any fail
  P1 (High):     Should pass - may indicate issues requiring attention  
  P2 (Medium):   Nice to pass - optimization opportunities

Exit Codes:
  0: All tests passed
  1: Critical (P0) tests failed
  2: High (P1) tests failed (but P0 passed)
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  // Determine target URL
  const targetUrl = args.url || 
                   process.env.PROD_SMOKE_URL || 
                   process.env.NEXTAUTH_URL || 
                   'http://localhost:3000';

  const runner = new SmokeTestRunner(targetUrl, { 
    verbose: args.verbose,
  });

  try {
    const report = await runner.runAllTests();
    
    if (args.json) {
      console.log('\n' + JSON.stringify(report, null, 2));
    }
    
    // Exit with appropriate code
    if (report.summary.p0_failed > 0) {
      process.exit(1); // Critical failure
    } else if (report.summary.p1_failed > 0) {
      process.exit(2); // High priority failure
    } else {
      process.exit(0); // Success
    }
    
  } catch (error) {
    console.error('🚨 Smoke test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('🚨 Unexpected error:', error);
    process.exit(1);
  });
}

export { SmokeTestRunner, type SmokeTestReport };