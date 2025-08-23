// Bundle optimization and code splitting utilities

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  recommendations: string[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  isAsync: boolean;
  isEntry: boolean;
}

export interface DependencyInfo {
  name: string;
  size: number;
  version: string;
  usage: 'critical' | 'important' | 'optional';
  alternative?: string;
}

// Bundle analyzer class
export class BundleAnalyzer {
  private static readonly CRITICAL_SIZE_THRESHOLD = 244 * 1024; // 244KB
  private static readonly CHUNK_SIZE_THRESHOLD = 100 * 1024;   // 100KB

  /**
   * Analyze webpack bundle stats
   */
  static analyzeBundleStats(stats: any): BundleAnalysis {
    const chunks = this.extractChunkInfo(stats);
    const dependencies = this.extractDependencyInfo(stats);
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const gzippedSize = chunks.reduce((sum, chunk) => sum + chunk.gzippedSize, 0);
    
    return {
      totalSize,
      gzippedSize,
      chunks,
      dependencies,
      recommendations: this.generateRecommendations(chunks, dependencies, totalSize),
    };
  }

  private static extractChunkInfo(stats: any): ChunkInfo[] {
    if (!stats.chunks) return [];
    
    return stats.chunks.map((chunk: any) => ({
      name: chunk.names ? chunk.names.join(', ') : `chunk-${chunk.id}`,
      size: chunk.size || 0,
      gzippedSize: Math.round((chunk.size || 0) * 0.3), // Estimate gzip compression
      modules: chunk.modules ? chunk.modules.map((m: any) => m.name) : [],
      isAsync: !chunk.entry,
      isEntry: chunk.entry || false,
    }));
  }

  private static extractDependencyInfo(stats: any): DependencyInfo[] {
    const dependencies: DependencyInfo[] = [];
    
    // Extract from modules
    if (stats.modules) {
      const depMap = new Map<string, { size: number; critical: boolean }>();
      
      stats.modules.forEach((module: any) => {
        if (module.name && module.name.includes('node_modules')) {
          const depMatch = module.name.match(/node_modules\/([^\/]+)/);
          if (depMatch) {
            const depName = depMatch[1];
            const existing = depMap.get(depName);
            depMap.set(depName, {
              size: (existing?.size || 0) + (module.size || 0),
              critical: existing?.critical || module.name.includes('react') || module.name.includes('next'),
            });
          }
        }
      });
      
      depMap.forEach((info, name) => {
        dependencies.push({
          name,
          size: info.size,
          version: 'unknown',
          usage: info.critical ? 'critical' : info.size > 50000 ? 'important' : 'optional',
        });
      });
    }
    
    return dependencies.sort((a, b) => b.size - a.size);
  }

  private static generateRecommendations(
    chunks: ChunkInfo[],
    dependencies: DependencyInfo[],
    totalSize: number
  ): string[] {
    const recommendations: string[] = [];
    
    // Check total bundle size
    if (totalSize > this.CRITICAL_SIZE_THRESHOLD) {
      recommendations.push(
        `Bundle size (${(totalSize / 1024).toFixed(1)}KB) exceeds recommended 244KB. Consider code splitting.`
      );
    }
    
    // Check large chunks
    const largeChunks = chunks.filter(chunk => chunk.size > this.CHUNK_SIZE_THRESHOLD);
    if (largeChunks.length > 0) {
      recommendations.push(
        `Large chunks detected: ${largeChunks.map(c => `${c.name} (${(c.size / 1024).toFixed(1)}KB)`).join(', ')}`
      );
    }
    
    // Check heavy dependencies
    const heavyDeps = dependencies.filter(dep => dep.size > 100000);
    if (heavyDeps.length > 0) {
      recommendations.push(
        `Heavy dependencies: ${heavyDeps.map(d => `${d.name} (${(d.size / 1024).toFixed(1)}KB)`).join(', ')}`
      );
    }
    
    // Suggest alternatives for heavy dependencies
    const alternatives = this.suggestAlternatives(dependencies);
    recommendations.push(...alternatives);
    
    return recommendations;
  }

  private static suggestAlternatives(dependencies: DependencyInfo[]): string[] {
    const alternatives: string[] = [];
    const heavyDeps = dependencies.filter(dep => dep.size > 50000);
    
    const knownAlternatives: Record<string, string> = {
      'moment': 'date-fns (smaller, tree-shakeable)',
      'lodash': 'lodash-es (tree-shakeable) or native JS methods',
      'axios': 'fetch API or smaller alternatives like ky',
      'jquery': 'Vanilla JS or smaller alternatives',
      'bootstrap': 'Tailwind CSS (utility-first, smaller)',
      'material-ui': 'Headless UI or smaller component libraries',
      'recharts': 'Lightweight charting libraries like chart.js',
      'react-router-dom': 'Next.js built-in routing',
    };
    
    heavyDeps.forEach(dep => {
      if (knownAlternatives[dep.name]) {
        alternatives.push(`Consider replacing ${dep.name} with ${knownAlternatives[dep.name]}`);
      }
    });
    
    return alternatives;
  }
}

// Code splitting utilities
export class CodeSplitter {
  /**
   * Dynamic import with retry logic
   */
  static async dynamicImport<T = any>(
    importFunc: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFunc();
      } catch (error) {
        lastError = error as Error;
        
        if (i < retries - 1) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          console.warn(`[Code Splitter] Import failed, retrying (${i + 1}/${retries}):`, error);
        }
      }
    }
    
    throw new Error(`Dynamic import failed after ${retries} attempts: ${lastError?.message}`);
  }

  /**
   * Lazy load component with error boundary
   */
  static lazyComponent<T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ): React.LazyExoticComponent<T> {
    const LazyComponent = React.lazy(async () => {
      try {
        return await this.dynamicImport(importFunc);
      } catch (error) {
        console.error('[Code Splitter] Component import failed:', error);
        
        // Return fallback component or error component
        if (fallback) {
          return { default: fallback as T };
        }
        
        // Return error component
        return {
          default: (() => (
            <div className="p-4 border border-red-200 rounded-md bg-red-50">
              <p className="text-red-600 text-sm">
                Bileşen yüklenirken bir hata oluştu. Sayfayı yenileyip tekrar deneyin.
              </p>
            </div>
          )) as T,
        };
      }
    });
    
    return LazyComponent;
  }

  /**
   * Preload component for faster subsequent loading
   */
  static preloadComponent(importFunc: () => Promise<any>): void {
    // Preload on idle or interaction
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFunc().catch(error => {
          console.warn('[Code Splitter] Preload failed:', error);
        });
      });
    } else {
      setTimeout(() => {
        importFunc().catch(error => {
          console.warn('[Code Splitter] Preload failed:', error);
        });
      }, 1000);
    }
  }

  /**
   * Smart component loading based on viewport intersection
   */
  static lazyLoadOnIntersection<T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    options: IntersectionObserverInit = {}
  ): React.LazyExoticComponent<T> {
    let hasLoaded = false;
    
    const LazyComponent = React.lazy(async () => {
      if (!hasLoaded) {
        // Wait for intersection
        await new Promise<void>((resolve) => {
          const observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting) {
                hasLoaded = true;
                observer.disconnect();
                resolve();
              }
            },
            { threshold: 0.1, ...options }
          );
          
          // Start observing a placeholder element
          const placeholder = document.createElement('div');
          document.body.appendChild(placeholder);
          observer.observe(placeholder);
          
          // Cleanup placeholder after a delay
          setTimeout(() => {
            if (placeholder.parentNode) {
              placeholder.parentNode.removeChild(placeholder);
            }
          }, 100);
        });
      }
      
      return await this.dynamicImport(importFunc);
    });
    
    return LazyComponent;
  }
}

// Webpack optimization configuration
export const webpackOptimizationConfig = {
  splitChunks: {
    chunks: 'all',
    minSize: 20000,
    maxSize: 244000, // 244KB
    minChunks: 1,
    maxAsyncRequests: 30,
    maxInitialRequests: 30,
    cacheGroups: {
      // Framework chunk (React, Next.js)
      framework: {
        chunks: 'all',
        name: 'framework',
        test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
        priority: 40,
        enforce: true,
      },
      
      // Libraries chunk (large third-party libraries)
      lib: {
        test(module: any) {
          return (
            module.size() > 160000 &&
            /node_modules[/\\]/.test(module.identifier())
          );
        },
        name(module: any) {
          const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
          return `lib-${packageName?.replace('@', '')}`;
        },
        chunks: 'all',
        priority: 30,
        enforce: true,
      },
      
      // Commons chunk (shared code)
      commons: {
        name: 'commons',
        chunks: 'all',
        minChunks: 2,
        priority: 20,
        enforce: true,
      },
      
      // Shared chunk (shared between pages)
      shared: {
        name: 'shared',
        chunks: 'all',
        minChunks: 2,
        priority: 10,
        enforce: true,
      },
    },
  },
  
  // Runtime chunk
  runtimeChunk: {
    name: 'runtime',
  },
  
  // Module concatenation (scope hoisting)
  concatenateModules: true,
  
  // Tree shaking
  usedExports: true,
  sideEffects: false,
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    minimize: true,
    removeAvailableModules: true,
    removeEmptyChunks: true,
    mergeDuplicateChunks: true,
    flagIncludedChunks: true,
    occurrenceOrder: true,
  }),
};

// Bundle performance monitoring
export class BundlePerformanceMonitor {
  private static loadTimes = new Map<string, number>();

  /**
   * Monitor chunk loading performance
   */
  static monitorChunkLoading(): void {
    if (typeof window === 'undefined') return;

    // Monitor dynamic imports
    const originalImport = window.__webpack_require__?.e;
    if (originalImport) {
      window.__webpack_require__.e = function(chunkId: string) {
        const startTime = performance.now();
        
        return originalImport.call(this, chunkId).then(
          (result: any) => {
            const loadTime = performance.now() - startTime;
            BundlePerformanceMonitor.recordChunkLoadTime(chunkId, loadTime);
            return result;
          },
          (error: any) => {
            const loadTime = performance.now() - startTime;
            console.error(`[Bundle Monitor] Chunk ${chunkId} failed to load in ${loadTime.toFixed(2)}ms:`, error);
            throw error;
          }
        );
      };
    }
  }

  /**
   * Record chunk load time
   */
  static recordChunkLoadTime(chunkId: string, loadTime: number): void {
    this.loadTimes.set(chunkId, loadTime);
    
    // Log slow chunks
    if (loadTime > 3000) {
      console.warn(`[Bundle Monitor] Slow chunk load: ${chunkId} took ${loadTime.toFixed(2)}ms`);
    }
    
    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'chunk_load_time', {
        chunk_id: chunkId,
        load_time: loadTime,
        metric_value: loadTime,
      });
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): Record<string, number> {
    return Object.fromEntries(this.loadTimes);
  }
}

// Export React lazy import wrapper
export const React = require('react');

// Initialize bundle optimization
export function initBundleOptimization(): void {
  if (typeof window !== 'undefined') {
    // Monitor chunk loading
    BundlePerformanceMonitor.monitorChunkLoading();
    
    // Report metrics after page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const metrics = BundlePerformanceMonitor.getMetrics();
        console.log('[Bundle Optimizer] Performance metrics:', metrics);
      }, 2000);
    });
  }
}

// Export all utilities
export const BundleOptimizer = {
  BundleAnalyzer,
  CodeSplitter,
  BundlePerformanceMonitor,
  webpackOptimizationConfig,
  init: initBundleOptimization,
};