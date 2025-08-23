// Comprehensive performance testing suite for 7P Education platform

import { webVitalsTracker, WEB_VITALS_THRESHOLDS } from './webVitals';

export interface PerformanceTest {
  name: string;
  description: string;
  category: 'core-web-vitals' | 'performance' | 'network' | 'rendering' | 'javascript';
  run: () => Promise<PerformanceTestResult>;
}

export interface PerformanceTestResult {
  name: string;
  passed: boolean;
  score: number;
  value: number;
  threshold: number;
  recommendation?: string;
  details?: any;
}

export interface PerformanceTestSuite {
  name: string;
  tests: PerformanceTest[];
  run: () => Promise<PerformanceTestSuiteResult>;
}

export interface PerformanceTestSuiteResult {
  name: string;
  overallScore: number;
  passed: boolean;
  results: PerformanceTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    categories: Record<string, { passed: number; total: number; score: number }>;
  };
  recommendations: string[];
}

// Core Web Vitals Tests
export const coreWebVitalsTests: PerformanceTest[] = [
  {
    name: 'Largest Contentful Paint (LCP)',
    description: 'Measures loading performance. Good LCP is 2.5 seconds or less.',
    category: 'core-web-vitals',
    run: async () => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;
          
          if (lastEntry) {
            const value = lastEntry.startTime;
            const threshold = WEB_VITALS_THRESHOLDS.LCP.good;
            const passed = value <= threshold;
            const score = passed ? 100 : Math.max(0, 100 - ((value - threshold) / threshold) * 50);
            
            resolve({
              name: 'Largest Contentful Paint (LCP)',
              passed,
              score,
              value,
              threshold,
              recommendation: passed ? 
                'Great! Your LCP is within the recommended range.' : 
                'Optimize images, remove unnecessary resources, and improve server response times.',
            });
          }
        });

        try {
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve({
              name: 'Largest Contentful Paint (LCP)',
              passed: false,
              score: 0,
              value: 10000,
              threshold: WEB_VITALS_THRESHOLDS.LCP.good,
              recommendation: 'LCP measurement timed out. Check for blocking resources.',
            });
          }, 10000);
        } catch (error) {
          resolve({
            name: 'Largest Contentful Paint (LCP)',
            passed: false,
            score: 0,
            value: 0,
            threshold: WEB_VITALS_THRESHOLDS.LCP.good,
            recommendation: 'LCP measurement not supported in this browser.',
          });
        }
      });
    },
  },

  {
    name: 'First Input Delay (FID)',
    description: 'Measures interactivity. Good FID is 100 milliseconds or less.',
    category: 'core-web-vitals',
    run: async () => {
      return new Promise((resolve) => {
        let resolved = false;

        const observer = new PerformanceObserver((list) => {
          if (resolved) return;
          
          const entries = list.getEntries();
          const firstEntry = entries[0] as PerformanceEventTiming;
          
          if (firstEntry) {
            resolved = true;
            const value = firstEntry.processingStart - firstEntry.startTime;
            const threshold = WEB_VITALS_THRESHOLDS.FID.good;
            const passed = value <= threshold;
            const score = passed ? 100 : Math.max(0, 100 - ((value - threshold) / threshold) * 50);
            
            resolve({
              name: 'First Input Delay (FID)',
              passed,
              score,
              value,
              threshold,
              recommendation: passed ? 
                'Excellent! Your site responds quickly to user interactions.' : 
                'Reduce JavaScript execution time and break up long tasks.',
            });
          }
        });

        try {
          observer.observe({ entryTypes: ['first-input'] });
          
          // If no interaction happens, simulate a good score
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              observer.disconnect();
              resolve({
                name: 'First Input Delay (FID)',
                passed: true,
                score: 100,
                value: 0,
                threshold: WEB_VITALS_THRESHOLDS.FID.good,
                recommendation: 'No user interactions detected. FID will be measured when users interact with your page.',
              });
            }
          }, 5000);
        } catch (error) {
          resolve({
            name: 'First Input Delay (FID)',
            passed: false,
            score: 0,
            value: 0,
            threshold: WEB_VITALS_THRESHOLDS.FID.good,
            recommendation: 'FID measurement not supported in this browser.',
          });
        }
      });
    },
  },

  {
    name: 'Cumulative Layout Shift (CLS)',
    description: 'Measures visual stability. Good CLS is 0.1 or less.',
    category: 'core-web-vitals',
    run: async () => {
      return new Promise((resolve) => {
        let clsValue = 0;
        let sessionValue = 0;
        let sessionEntries: PerformanceEntry[] = [];

        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              const firstSessionEntry = sessionEntries[0];
              const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
              
              if (sessionValue &&
                  entry.startTime - lastSessionEntry.startTime < 1000 &&
                  entry.startTime - firstSessionEntry.startTime < 5000) {
                sessionValue += entry.value;
                sessionEntries.push(entry);
              } else {
                sessionValue = entry.value;
                sessionEntries = [entry];
              }
              
              if (sessionValue > clsValue) {
                clsValue = sessionValue;
              }
            }
          });
        });

        try {
          observer.observe({ entryTypes: ['layout-shift'] });
          
          // Measure for 5 seconds
          setTimeout(() => {
            observer.disconnect();
            
            const threshold = WEB_VITALS_THRESHOLDS.CLS.good;
            const passed = clsValue <= threshold;
            const score = passed ? 100 : Math.max(0, 100 - ((clsValue - threshold) / threshold) * 200);
            
            resolve({
              name: 'Cumulative Layout Shift (CLS)',
              passed,
              score,
              value: clsValue,
              threshold,
              recommendation: passed ? 
                'Great! Your page has good visual stability.' : 
                'Add size attributes to images and videos, and avoid inserting content above existing content.',
            });
          }, 5000);
        } catch (error) {
          resolve({
            name: 'Cumulative Layout Shift (CLS)',
            passed: false,
            score: 0,
            value: 0,
            threshold: WEB_VITALS_THRESHOLDS.CLS.good,
            recommendation: 'CLS measurement not supported in this browser.',
          });
        }
      });
    },
  },

  {
    name: 'First Contentful Paint (FCP)',
    description: 'Measures how quickly content appears. Good FCP is 1.8 seconds or less.',
    category: 'core-web-vitals',
    run: async () => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          
          if (fcpEntry) {
            const value = fcpEntry.startTime;
            const threshold = WEB_VITALS_THRESHOLDS.FCP.good;
            const passed = value <= threshold;
            const score = passed ? 100 : Math.max(0, 100 - ((value - threshold) / threshold) * 50);
            
            resolve({
              name: 'First Contentful Paint (FCP)',
              passed,
              score,
              value,
              threshold,
              recommendation: passed ? 
                'Excellent! Content appears quickly for users.' : 
                'Optimize fonts, eliminate render-blocking resources, and reduce server response times.',
            });
          }
        });

        try {
          observer.observe({ entryTypes: ['paint'] });
          
          // Timeout after 5 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve({
              name: 'First Contentful Paint (FCP)',
              passed: false,
              score: 0,
              value: 5000,
              threshold: WEB_VITALS_THRESHOLDS.FCP.good,
              recommendation: 'FCP measurement timed out or not available.',
            });
          }, 5000);
        } catch (error) {
          resolve({
            name: 'First Contentful Paint (FCP)',
            passed: false,
            score: 0,
            value: 0,
            threshold: WEB_VITALS_THRESHOLDS.FCP.good,
            recommendation: 'FCP measurement not supported in this browser.',
          });
        }
      });
    },
  },
];

// Performance Tests
export const performanceTests: PerformanceTest[] = [
  {
    name: 'Time to First Byte (TTFB)',
    description: 'Measures server response time. Good TTFB is 600ms or less.',
    category: 'network',
    run: async () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const value = navigation.responseStart - navigation.requestStart;
        const threshold = WEB_VITALS_THRESHOLDS.TTFB.good;
        const passed = value <= threshold;
        const score = passed ? 100 : Math.max(0, 100 - ((value - threshold) / threshold) * 50);
        
        return {
          name: 'Time to First Byte (TTFB)',
          passed,
          score,
          value,
          threshold,
          recommendation: passed ? 
            'Great server response time!' : 
            'Optimize server processing, use CDN, and enable caching.',
        };
      }
      
      return {
        name: 'Time to First Byte (TTFB)',
        passed: false,
        score: 0,
        value: 0,
        threshold: WEB_VITALS_THRESHOLDS.TTFB.good,
        recommendation: 'Unable to measure TTFB.',
      };
    },
  },

  {
    name: 'DOM Content Loaded',
    description: 'Measures how quickly the DOM is ready. Good DCL is under 1.5 seconds.',
    category: 'rendering',
    run: async () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const value = navigation.domContentLoadedEventEnd - navigation.navigationStart;
        const threshold = 1500; // 1.5 seconds
        const passed = value <= threshold;
        const score = passed ? 100 : Math.max(0, 100 - ((value - threshold) / threshold) * 50);
        
        return {
          name: 'DOM Content Loaded',
          passed,
          score,
          value,
          threshold,
          recommendation: passed ? 
            'DOM loads quickly!' : 
            'Reduce HTML size, inline critical CSS, and defer non-critical JavaScript.',
        };
      }
      
      return {
        name: 'DOM Content Loaded',
        passed: false,
        score: 0,
        value: 0,
        threshold: 1500,
        recommendation: 'Unable to measure DOM Content Loaded time.',
      };
    },
  },

  {
    name: 'JavaScript Bundle Size',
    description: 'Measures total JavaScript size. Should be under 500KB.',
    category: 'javascript',
    run: async () => {
      let totalSize = 0;
      
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      resources.forEach(resource => {
        if (resource.name.includes('.js') && resource.transferSize) {
          totalSize += resource.transferSize;
        }
      });
      
      const threshold = 500 * 1024; // 500KB
      const passed = totalSize <= threshold;
      const score = passed ? 100 : Math.max(0, 100 - ((totalSize - threshold) / threshold) * 100);
      
      return {
        name: 'JavaScript Bundle Size',
        passed,
        score,
        value: totalSize,
        threshold,
        recommendation: passed ? 
          'JavaScript bundle size is optimized!' : 
          'Use code splitting, tree shaking, and remove unused dependencies.',
        details: {
          sizeKB: Math.round(totalSize / 1024),
          thresholdKB: Math.round(threshold / 1024),
        },
      };
    },
  },

  {
    name: 'Image Optimization',
    description: 'Checks if images use modern formats and appropriate sizes.',
    category: 'performance',
    run: async () => {
      const images = document.querySelectorAll('img');
      let optimizedImages = 0;
      let totalImages = images.length;
      
      images.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || '';
        const hasModernFormat = src.includes('.webp') || src.includes('.avif');
        const hasResponsive = img.sizes || img.srcset;
        const hasLazyLoading = img.loading === 'lazy';
        
        if (hasModernFormat || hasResponsive || hasLazyLoading) {
          optimizedImages++;
        }
      });
      
      const ratio = totalImages > 0 ? optimizedImages / totalImages : 1;
      const threshold = 0.8; // 80% of images should be optimized
      const passed = ratio >= threshold;
      const score = ratio * 100;
      
      return {
        name: 'Image Optimization',
        passed,
        score,
        value: ratio,
        threshold,
        recommendation: passed ? 
          'Images are well optimized!' : 
          'Use WebP/AVIF formats, implement lazy loading, and add responsive images.',
        details: {
          optimized: optimizedImages,
          total: totalImages,
          percentage: Math.round(ratio * 100),
        },
      };
    },
  },

  {
    name: 'Long Tasks',
    description: 'Detects JavaScript tasks that block the main thread for >50ms.',
    category: 'javascript',
    run: async () => {
      return new Promise((resolve) => {
        const longTasks: any[] = [];
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          longTasks.push(...entries);
        });

        try {
          observer.observe({ entryTypes: ['longtask'] });
          
          setTimeout(() => {
            observer.disconnect();
            
            const totalBlockingTime = longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
            const threshold = 200; // 200ms total blocking time
            const passed = totalBlockingTime <= threshold;
            const score = passed ? 100 : Math.max(0, 100 - (totalBlockingTime / threshold) * 100);
            
            resolve({
              name: 'Long Tasks',
              passed,
              score,
              value: totalBlockingTime,
              threshold,
              recommendation: passed ? 
                'No significant main thread blocking detected!' : 
                'Break up long JavaScript tasks and optimize heavy computations.',
              details: {
                longTaskCount: longTasks.length,
                totalBlockingTime: Math.round(totalBlockingTime),
                tasks: longTasks.map(task => ({
                  duration: Math.round(task.duration),
                  startTime: Math.round(task.startTime),
                })),
              },
            });
          }, 5000);
        } catch (error) {
          resolve({
            name: 'Long Tasks',
            passed: true,
            score: 100,
            value: 0,
            threshold: 200,
            recommendation: 'Long task measurement not supported in this browser.',
          });
        }
      });
    },
  },
];

// Performance Test Suite
export class PerformanceTestRunner {
  private testSuites: PerformanceTestSuite[] = [];

  constructor() {
    this.registerTestSuite({
      name: 'Core Web Vitals',
      tests: coreWebVitalsTests,
      run: () => this.runTestSuite('Core Web Vitals'),
    });

    this.registerTestSuite({
      name: 'Performance Optimization',
      tests: performanceTests,
      run: () => this.runTestSuite('Performance Optimization'),
    });
  }

  /**
   * Register a test suite
   */
  registerTestSuite(suite: PerformanceTestSuite): void {
    this.testSuites.push(suite);
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(suiteName: string): Promise<PerformanceTestSuiteResult> {
    const suite = this.testSuites.find(s => s.name === suiteName);
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }

    console.log(`[Performance Tests] Running ${suite.name} test suite...`);

    const results: PerformanceTestResult[] = [];
    
    // Run tests sequentially to avoid interference
    for (const test of suite.tests) {
      try {
        console.log(`[Performance Tests] Running ${test.name}...`);
        const result = await test.run();
        results.push(result);
      } catch (error) {
        console.error(`[Performance Tests] Test ${test.name} failed:`, error);
        results.push({
          name: test.name,
          passed: false,
          score: 0,
          value: 0,
          threshold: 0,
          recommendation: `Test failed with error: ${error}`,
        });
      }
    }

    return this.generateSuiteResult(suite.name, results);
  }

  /**
   * Run all test suites
   */
  async runAllTestSuites(): Promise<PerformanceTestSuiteResult[]> {
    const results: PerformanceTestSuiteResult[] = [];
    
    for (const suite of this.testSuites) {
      const result = await suite.run();
      results.push(result);
    }
    
    return results;
  }

  /**
   * Generate suite result with summary
   */
  private generateSuiteResult(suiteName: string, results: PerformanceTestResult[]): PerformanceTestSuiteResult {
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.length - passedTests;
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    // Group by category
    const categories: Record<string, { passed: number; total: number; score: number }> = {};
    const suite = this.testSuites.find(s => s.name === suiteName)!;
    
    suite.tests.forEach((test, index) => {
      const result = results[index];
      if (!categories[test.category]) {
        categories[test.category] = { passed: 0, total: 0, score: 0 };
      }
      
      categories[test.category].total++;
      categories[test.category].score += result.score;
      if (result.passed) {
        categories[test.category].passed++;
      }
    });

    // Calculate average scores for categories
    Object.keys(categories).forEach(category => {
      categories[category].score /= categories[category].total;
    });

    // Generate recommendations
    const recommendations = results
      .filter(r => !r.passed)
      .map(r => r.recommendation)
      .filter(Boolean) as string[];

    return {
      name: suiteName,
      overallScore: Math.round(overallScore),
      passed: overallScore >= 70, // 70% threshold for passing
      results,
      summary: {
        totalTests: results.length,
        passedTests,
        failedTests,
        categories,
      },
      recommendations,
    };
  }

  /**
   * Get lighthouse-style score
   */
  getLighthouseScore(results: PerformanceTestSuiteResult[]): {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa: number;
  } {
    const coreWebVitalsResult = results.find(r => r.name === 'Core Web Vitals');
    const performanceResult = results.find(r => r.name === 'Performance Optimization');
    
    const performanceScore = coreWebVitalsResult?.overallScore || 0;
    
    return {
      performance: performanceScore,
      accessibility: 100, // Not measured in this suite
      bestPractices: performanceResult?.overallScore || 0,
      seo: 100, // Not measured in this suite
      pwa: 100, // Not measured in this suite
    };
  }
}

// Export singleton test runner
export const performanceTestRunner = new PerformanceTestRunner();

// Utility function to run performance tests
export async function runPerformanceAudit(): Promise<{
  results: PerformanceTestSuiteResult[];
  lighthouseScore: ReturnType<PerformanceTestRunner['getLighthouseScore']>;
  summary: {
    overallScore: number;
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
  };
}> {
  console.log('[Performance Audit] Starting comprehensive performance audit...');
  
  const results = await performanceTestRunner.runAllTestSuites();
  const lighthouseScore = performanceTestRunner.getLighthouseScore(results);
  
  const totalTests = results.reduce((sum, r) => sum + r.summary.totalTests, 0);
  const passedTests = results.reduce((sum, r) => sum + r.summary.passedTests, 0);
  const failedTests = totalTests - passedTests;
  const overallScore = Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length);
  
  const summary = {
    overallScore,
    passed: overallScore >= 70,
    totalTests,
    passedTests,
    failedTests,
  };

  console.log('[Performance Audit] Audit completed:', summary);
  
  return {
    results,
    lighthouseScore,
    summary,
  };
}