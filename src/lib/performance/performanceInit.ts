// Performance optimization initialization for 7P Education platform

import { initWebVitals } from './webVitals';
import { initFontOptimization } from './fonts';
import { CSSOptimizer } from './cssOptimization';
import { initBundleOptimization } from './bundleOptimization';
import { serviceWorkerManager } from './serviceWorker';
import { initDatabaseOptimization } from './databaseOptimization';

export interface PerformanceConfig {
  webVitals: {
    enabled: boolean;
    sendToAnalytics: boolean;
  };
  fonts: {
    preloadCritical: boolean;
    enableOptimization: boolean;
  };
  css: {
    enableCritical: boolean;
    enablePurging: boolean;
    enableMinification: boolean;
  };
  bundles: {
    enableCodeSplitting: boolean;
    enableTreeShaking: boolean;
    enableCompression: boolean;
  };
  serviceWorker: {
    enabled: boolean;
    enableCaching: boolean;
    enableBackgroundSync: boolean;
  };
  database: {
    enableQueryCache: boolean;
    enableQueryLogging: boolean;
    slowQueryThreshold: number;
  };
  monitoring: {
    enablePerformanceObserver: boolean;
    enableResourceTiming: boolean;
    enableLongTasks: boolean;
  };
}

export const defaultPerformanceConfig: PerformanceConfig = {
  webVitals: {
    enabled: true,
    sendToAnalytics: true,
  },
  fonts: {
    preloadCritical: true,
    enableOptimization: true,
  },
  css: {
    enableCritical: true,
    enablePurging: process.env.NODE_ENV === 'production',
    enableMinification: process.env.NODE_ENV === 'production',
  },
  bundles: {
    enableCodeSplitting: true,
    enableTreeShaking: process.env.NODE_ENV === 'production',
    enableCompression: process.env.NODE_ENV === 'production',
  },
  serviceWorker: {
    enabled: process.env.NODE_ENV === 'production',
    enableCaching: true,
    enableBackgroundSync: true,
  },
  database: {
    enableQueryCache: true,
    enableQueryLogging: process.env.NODE_ENV === 'development',
    slowQueryThreshold: 1000,
  },
  monitoring: {
    enablePerformanceObserver: true,
    enableResourceTiming: true,
    enableLongTasks: true,
  },
};

// Performance metrics collector
export class PerformanceMetricsCollector {
  private static instance: PerformanceMetricsCollector;
  private metrics = new Map<string, any[]>();
  private observers: PerformanceObserver[] = [];

  private constructor() {}

  static getInstance(): PerformanceMetricsCollector {
    if (!PerformanceMetricsCollector.instance) {
      PerformanceMetricsCollector.instance = new PerformanceMetricsCollector();
    }
    return PerformanceMetricsCollector.instance;
  }

  /**
   * Initialize performance monitoring
   */
  init(config: PerformanceConfig['monitoring']): void {
    if (typeof window === 'undefined') return;

    // Performance Observer for various entry types
    if (config.enablePerformanceObserver && 'PerformanceObserver' in window) {
      this.initPerformanceObservers(config);
    }

    // Monitor memory usage
    this.monitorMemoryUsage();

    // Monitor frame rate
    this.monitorFrameRate();

    // Monitor network information
    this.monitorNetworkInfo();
  }

  /**
   * Initialize performance observers
   */
  private initPerformanceObservers(config: PerformanceConfig['monitoring']): void {
    const entryTypes = [];

    if (config.enableResourceTiming) entryTypes.push('resource');
    if (config.enableLongTasks) entryTypes.push('longtask');
    
    // Add other supported entry types
    entryTypes.push('navigation', 'measure', 'mark');

    entryTypes.forEach(entryType => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          this.processPerformanceEntries(entryType, entries);
        });
        
        observer.observe({ entryTypes: [entryType] });
        this.observers.push(observer);
      } catch (error) {
        console.warn(`[Performance] Failed to observe ${entryType}:`, error);
      }
    });
  }

  /**
   * Process performance entries
   */
  private processPerformanceEntries(type: string, entries: PerformanceEntry[]): void {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }

    const typeMetrics = this.metrics.get(type)!;

    entries.forEach(entry => {
      const metric = this.formatPerformanceEntry(entry);
      typeMetrics.push(metric);

      // Log problematic entries
      if (type === 'longtask' && entry.duration > 50) {
        console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`);
      }

      if (type === 'resource' && entry.duration > 2000) {
        console.warn(`[Performance] Slow resource: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
      }

      // Send to analytics for critical metrics
      this.sendToAnalytics(type, metric);
    });

    // Keep only recent metrics (last 1000)
    if (typeMetrics.length > 1000) {
      typeMetrics.splice(0, typeMetrics.length - 1000);
    }
  }

  /**
   * Format performance entry for storage
   */
  private formatPerformanceEntry(entry: PerformanceEntry): any {
    const baseEntry = {
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
      timestamp: Date.now(),
    };

    // Add type-specific properties
    if (entry.entryType === 'resource') {
      const resourceEntry = entry as PerformanceResourceTiming;
      return {
        ...baseEntry,
        initiatorType: resourceEntry.initiatorType,
        transferSize: resourceEntry.transferSize,
        encodedBodySize: resourceEntry.encodedBodySize,
        decodedBodySize: resourceEntry.decodedBodySize,
        responseStart: resourceEntry.responseStart,
        responseEnd: resourceEntry.responseEnd,
      };
    }

    if (entry.entryType === 'longtask') {
      const longTaskEntry = entry as PerformanceLongTaskTiming;
      return {
        ...baseEntry,
        attribution: longTaskEntry.attribution,
      };
    }

    if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      return {
        ...baseEntry,
        type: navEntry.type,
        redirectCount: navEntry.redirectCount,
        domContentLoadedEventEnd: navEntry.domContentLoadedEventEnd,
        loadEventEnd: navEntry.loadEventEnd,
      };
    }

    return baseEntry;
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if (!('memory' in performance)) return;

    setInterval(() => {
      const memory = (performance as any).memory;
      const memoryMetric = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        timestamp: Date.now(),
      };

      if (!this.metrics.has('memory')) {
        this.metrics.set('memory', []);
      }

      const memoryMetrics = this.metrics.get('memory')!;
      memoryMetrics.push(memoryMetric);

      // Keep only last 100 memory samples
      if (memoryMetrics.length > 100) {
        memoryMetrics.splice(0, memoryMetrics.length - 100);
      }

      // Warn on high memory usage
      if (memoryMetric.usagePercent > 80) {
        console.warn(`[Performance] High memory usage: ${memoryMetric.usagePercent.toFixed(1)}%`);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Monitor frame rate
   */
  private monitorFrameRate(): void {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let totalFrameTime = 0;

    const measureFrame = (currentTime: number) => {
      const frameTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      frameCount++;
      totalFrameTime += frameTime;

      // Calculate FPS every second
      if (frameCount % 60 === 0) {
        const avgFrameTime = totalFrameTime / frameCount;
        const fps = 1000 / avgFrameTime;

        if (!this.metrics.has('fps')) {
          this.metrics.set('fps', []);
        }

        const fpsMetrics = this.metrics.get('fps')!;
        fpsMetrics.push({
          fps: fps,
          avgFrameTime: avgFrameTime,
          timestamp: Date.now(),
        });

        // Keep only last 100 FPS samples
        if (fpsMetrics.length > 100) {
          fpsMetrics.splice(0, fpsMetrics.length - 100);
        }

        // Warn on low FPS
        if (fps < 30) {
          console.warn(`[Performance] Low FPS detected: ${fps.toFixed(1)} FPS`);
        }

        // Reset counters
        frameCount = 0;
        totalFrameTime = 0;
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  /**
   * Monitor network information
   */
  private monitorNetworkInfo(): void {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    
    const recordNetworkInfo = () => {
      const networkMetric = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        timestamp: Date.now(),
      };

      if (!this.metrics.has('network')) {
        this.metrics.set('network', []);
      }

      this.metrics.get('network')!.push(networkMetric);
    };

    // Record initial network info
    recordNetworkInfo();

    // Listen for changes
    connection.addEventListener('change', recordNetworkInfo);
  }

  /**
   * Send metrics to analytics
   */
  private sendToAnalytics(type: string, metric: any): void {
    // Send to Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        metric_type: type,
        metric_name: metric.name || type,
        metric_value: metric.duration || metric.value || 1,
        custom_parameter: metric,
      });
    }

    // Send to custom analytics endpoint
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        metric,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {
      // Ignore analytics failures
    });
  }

  /**
   * Get collected metrics
   */
  getMetrics(type?: string): any {
    if (type) {
      return this.metrics.get(type) || [];
    }
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    const summary: any = {};

    // Memory summary
    const memoryMetrics = this.metrics.get('memory') || [];
    if (memoryMetrics.length > 0) {
      const latest = memoryMetrics[memoryMetrics.length - 1];
      summary.memory = {
        current: latest.usagePercent,
        peak: Math.max(...memoryMetrics.map((m: any) => m.usagePercent)),
      };
    }

    // FPS summary
    const fpsMetrics = this.metrics.get('fps') || [];
    if (fpsMetrics.length > 0) {
      summary.fps = {
        current: fpsMetrics[fpsMetrics.length - 1].fps,
        average: fpsMetrics.reduce((sum: number, m: any) => sum + m.fps, 0) / fpsMetrics.length,
        min: Math.min(...fpsMetrics.map((m: any) => m.fps)),
      };
    }

    // Long tasks summary
    const longTaskMetrics = this.metrics.get('longtask') || [];
    summary.longTasks = {
      count: longTaskMetrics.length,
      totalDuration: longTaskMetrics.reduce((sum: number, m: any) => sum + m.duration, 0),
    };

    // Resource summary
    const resourceMetrics = this.metrics.get('resource') || [];
    summary.resources = {
      count: resourceMetrics.length,
      slowResources: resourceMetrics.filter((m: any) => m.duration > 1000).length,
      totalTransferSize: resourceMetrics.reduce((sum: number, m: any) => sum + (m.transferSize || 0), 0),
    };

    return summary;
  }

  /**
   * Clean up observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Main performance initialization function
export function initPerformanceOptimizations(config: Partial<PerformanceConfig> = {}): void {
  const finalConfig = { ...defaultPerformanceConfig, ...config };

  console.log('[Performance] Initializing performance optimizations...');

  // Initialize Web Vitals tracking
  if (finalConfig.webVitals.enabled) {
    initWebVitals();
    console.log('[Performance] ✅ Web Vitals tracking initialized');
  }

  // Initialize font optimization
  if (finalConfig.fonts.enableOptimization) {
    initFontOptimization();
    console.log('[Performance] ✅ Font optimization initialized');
  }

  // Initialize CSS optimization
  if (finalConfig.css.enableCritical || finalConfig.css.enablePurging) {
    CSSOptimizer.init(finalConfig.css);
    console.log('[Performance] ✅ CSS optimization initialized');
  }

  // Initialize bundle optimization
  if (finalConfig.bundles.enableCodeSplitting) {
    initBundleOptimization();
    console.log('[Performance] ✅ Bundle optimization initialized');
  }

  // Initialize service worker
  if (finalConfig.serviceWorker.enabled) {
    serviceWorkerManager.init();
    console.log('[Performance] ✅ Service worker initialized');
  }

  // Initialize database optimization
  if (finalConfig.database.enableQueryCache) {
    initDatabaseOptimization({
      enableQueryCache: finalConfig.database.enableQueryCache,
      enableQueryLogging: finalConfig.database.enableQueryLogging,
      slowQueryThreshold: finalConfig.database.slowQueryThreshold,
    });
    console.log('[Performance] ✅ Database optimization initialized');
  }

  // Initialize performance monitoring
  if (finalConfig.monitoring.enablePerformanceObserver) {
    const metricsCollector = PerformanceMetricsCollector.getInstance();
    metricsCollector.init(finalConfig.monitoring);
    console.log('[Performance] ✅ Performance monitoring initialized');
  }

  console.log('[Performance] 🚀 All performance optimizations initialized successfully!');
}

// Export performance utilities
export const performanceUtils = {
  metricsCollector: PerformanceMetricsCollector.getInstance(),
  init: initPerformanceOptimizations,
  getPerformanceSummary: () => PerformanceMetricsCollector.getInstance().getPerformanceSummary(),
};

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initPerformanceOptimizations();
    });
  } else {
    initPerformanceOptimizations();
  }
}