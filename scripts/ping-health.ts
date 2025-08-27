#!/usr/bin/env tsx

/**
 * 7P Education - Health Check Monitoring Script
 * 
 * Monitors application health endpoints and reports status
 * Usage: npm run ping-health [options]
 */

import { performance } from 'perf_hooks';

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'error';
  timestamp: string;
  database?: string;
  environment?: string;
  uptime?: number;
  [key: string]: any;
}

interface EndpointCheck {
  url: string;
  name: string;
  timeout: number;
  retries: number;
  expectedStatus?: number;
  critical: boolean;
}

interface CheckResult {
  endpoint: string;
  name: string;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  data?: any;
  critical: boolean;
}

interface HealthReport {
  timestamp: string;
  duration: number;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  total_checks: number;
  passed: number;
  failed: number;
  critical_failed: number;
  results: CheckResult[];
}

const DEFAULT_ENDPOINTS: EndpointCheck[] = [
  {
    url: '/api/health',
    name: 'Health Endpoint',
    timeout: 5000,
    retries: 2,
    expectedStatus: 200,
    critical: true,
  },
  {
    url: '/api/auth/providers',
    name: 'Authentication System',
    timeout: 5000,
    retries: 1,
    expectedStatus: 200,
    critical: true,
  },
  {
    url: '/api/courses',
    name: 'Courses API',
    timeout: 5000,
    retries: 1,
    expectedStatus: 200,
    critical: true,
  },
  {
    url: '/',
    name: 'Homepage',
    timeout: 10000,
    retries: 1,
    expectedStatus: 200,
    critical: true,
  },
  {
    url: '/auth/signin',
    name: 'Sign In Page',
    timeout: 10000,
    retries: 1,
    expectedStatus: 200,
    critical: false,
  },
];

class HealthChecker {
  private baseUrl: string;
  private userAgent: string;
  private verbose: boolean;

  constructor(baseUrl: string, options: { verbose?: boolean; userAgent?: string } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.userAgent = options.userAgent || '7P-Education-Health-Checker/1.0';
    this.verbose = options.verbose || false;
  }

  async checkEndpoint(endpoint: EndpointCheck): Promise<CheckResult> {
    const url = `${this.baseUrl}${endpoint.url}`;
    const startTime = performance.now();
    
    if (this.verbose) {
      console.log(`🔍 Checking ${endpoint.name} (${url})`);
    }

    let lastError: string | undefined;
    
    for (let attempt = 0; attempt <= endpoint.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json, text/html, */*',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        // Parse response data if possible
        let data: any = null;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            data = await response.json();
          }
        } catch {
          // Ignore JSON parsing errors
        }

        const success = endpoint.expectedStatus ? 
          response.status === endpoint.expectedStatus : 
          response.status >= 200 && response.status < 300;

        if (success || attempt === endpoint.retries) {
          return {
            endpoint: endpoint.url,
            name: endpoint.name,
            success,
            responseTime,
            statusCode: response.status,
            data,
            critical: endpoint.critical,
            error: success ? undefined : `HTTP ${response.status}`,
          };
        }

        lastError = `HTTP ${response.status}`;
        
      } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt === endpoint.retries) {
          return {
            endpoint: endpoint.url,
            name: endpoint.name,
            success: false,
            responseTime,
            critical: endpoint.critical,
            error: lastError,
          };
        }
      }

      // Wait before retry
      if (attempt < endpoint.retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Should not reach here');
  }

  async checkAll(endpoints: EndpointCheck[] = DEFAULT_ENDPOINTS): Promise<HealthReport> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    
    console.log(`🏥 7P Education - Health Check Report`);
    console.log(`🕐 Started at: ${timestamp}`);
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log(`📊 Endpoints: ${endpoints.length}`);
    console.log('=' .repeat(60));

    const results: CheckResult[] = [];
    
    // Run checks in parallel for better performance
    const checkPromises = endpoints.map(endpoint => this.checkEndpoint(endpoint));
    const checkResults = await Promise.all(checkPromises);
    results.push(...checkResults);

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    // Analyze results
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const criticalFailed = results.filter(r => !r.success && r.critical).length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (criticalFailed > 0) {
      overallStatus = 'unhealthy';
    } else if (failed > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const report: HealthReport = {
      timestamp,
      duration,
      overall_status: overallStatus,
      total_checks: endpoints.length,
      passed,
      failed,
      critical_failed: criticalFailed,
      results,
    };

    this.printReport(report);
    return report;
  }

  private printReport(report: HealthReport): void {
    console.log('\n📊 INDIVIDUAL CHECK RESULTS:');
    console.log('-'.repeat(60));

    report.results.forEach(result => {
      const status = result.success ? '✅' : (result.critical ? '🚨' : '⚠️');
      const time = `${result.responseTime}ms`;
      const statusCode = result.statusCode ? ` (${result.statusCode})` : '';
      const error = result.error ? ` - ${result.error}` : '';
      
      console.log(`${status} ${result.name.padEnd(20)} ${time.padStart(8)}${statusCode}${error}`);
      
      // Show additional data for health endpoint
      if (result.data && result.endpoint === '/api/health' && result.success) {
        const healthData = result.data as HealthResponse;
        if (healthData.database) {
          console.log(`    Database: ${healthData.database}`);
        }
        if (healthData.environment) {
          console.log(`    Environment: ${healthData.environment}`);
        }
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('📈 SUMMARY:');
    console.log(`Status: ${this.getStatusEmoji(report.overall_status)} ${report.overall_status.toUpperCase()}`);
    console.log(`Duration: ${report.duration}ms`);
    console.log(`Passed: ${report.passed}/${report.total_checks}`);
    console.log(`Failed: ${report.failed}/${report.total_checks}`);
    
    if (report.critical_failed > 0) {
      console.log(`🚨 Critical failures: ${report.critical_failed}`);
    }

    console.log('='.repeat(60));

    // Recommendations
    if (report.overall_status !== 'healthy') {
      console.log('\n💡 RECOMMENDATIONS:');
      
      if (report.critical_failed > 0) {
        console.log('• 🚨 IMMEDIATE ACTION REQUIRED - Critical systems are down');
        console.log('• Check application logs: vercel logs --tail');
        console.log('• Verify environment variables are configured');
        console.log('• Consider rollback if recent deployment');
      } else {
        console.log('• ⚠️  Some non-critical systems need attention');
        console.log('• Monitor for user impact');
        console.log('• Schedule maintenance for failing endpoints');
      }
    }

    // Performance warnings
    const slowEndpoints = report.results.filter(r => r.success && r.responseTime > 2000);
    if (slowEndpoints.length > 0) {
      console.log('\n⚡ PERFORMANCE WARNINGS:');
      slowEndpoints.forEach(endpoint => {
        console.log(`• ${endpoint.name}: ${endpoint.responseTime}ms (consider optimization)`);
      });
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '🚨';
      default: return '❓';
    }
  }
}

// CLI functionality
function parseArgs(args: string[]): {
  url?: string;
  verbose: boolean;
  json: boolean;
  watch: boolean;
  interval: number;
  help: boolean;
} {
  const result = {
    url: undefined as string | undefined,
    verbose: false,
    json: false,
    watch: false,
    interval: 30,
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
      case '--watch':
      case '-w':
        result.watch = true;
        break;
      case '--interval':
      case '-i':
        result.interval = parseInt(args[++i]) || 30;
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
🏥 7P Education Health Checker

Usage: npm run ping-health [options] [url]

Options:
  -u, --url <url>        Target URL (default: http://localhost:3000)
  -v, --verbose          Show detailed output
  -j, --json             Output results as JSON
  -w, --watch            Continuous monitoring mode
  -i, --interval <sec>   Watch interval in seconds (default: 30)
  -h, --help             Show this help

Examples:
  npm run ping-health                                    # Check localhost:3000
  npm run ping-health https://your-domain.com           # Check production
  npm run ping-health --watch --interval 60             # Monitor every 60 seconds
  npm run ping-health --verbose --json > health.json    # Save detailed results
  
Environment Variables:
  HEALTH_CHECK_URL      Default URL to check
  HEALTH_CHECK_TIMEOUT  Request timeout in milliseconds (default: 5000)
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
                   process.env.HEALTH_CHECK_URL || 
                   process.env.NEXTAUTH_URL || 
                   'http://localhost:3000';

  const checker = new HealthChecker(targetUrl, { 
    verbose: args.verbose,
  });

  if (args.watch) {
    console.log(`🔄 Starting continuous monitoring (interval: ${args.interval}s)`);
    console.log('Press Ctrl+C to stop\n');
    
    while (true) {
      try {
        const report = await checker.checkAll();
        
        if (args.json) {
          console.log(JSON.stringify(report, null, 2));
        }
        
        console.log(`\n⏳ Next check in ${args.interval} seconds...\n`);
        await new Promise(resolve => setTimeout(resolve, args.interval * 1000));
        
      } catch (error) {
        console.error('❌ Health check failed:', error);
        await new Promise(resolve => setTimeout(resolve, args.interval * 1000));
      }
    }
  } else {
    try {
      const report = await checker.checkAll();
      
      if (args.json) {
        console.log(JSON.stringify(report, null, 2));
      }
      
      // Exit with error code if unhealthy
      process.exit(report.overall_status === 'unhealthy' ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { HealthChecker, type HealthReport, type CheckResult };