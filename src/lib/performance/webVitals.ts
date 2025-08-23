import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Web Vitals configuration and thresholds
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // ms
  FID: { good: 100, needsImprovement: 300 },   // ms
  CLS: { good: 0.1, needsImprovement: 0.25 },  // score
  FCP: { good: 1800, needsImprovement: 3000 }, // ms
  TTFB: { good: 600, needsImprovement: 1500 }, // ms
};

export interface WebVitalData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface WebVitalsReport {
  LCP?: WebVitalData;
  FID?: WebVitalData;
  CLS?: WebVitalData;
  FCP?: WebVitalData;
  TTFB?: WebVitalData;
  timestamp: string;
  url: string;
  userAgent: string;
  connection?: any;
}

// Rate vitals based on thresholds
function rateVital(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

// Enhanced Web Vitals tracking
export class WebVitalsTracker {
  private static instance: WebVitalsTracker;
  private vitals: Partial<WebVitalsReport> = {};
  private callbacks: Array<(report: WebVitalsReport) => void> = [];
  private isTracking = false;

  private constructor() {
    this.vitals = {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      connection: this.getConnectionInfo(),
    };
  }

  static getInstance(): WebVitalsTracker {
    if (!WebVitalsTracker.instance) {
      WebVitalsTracker.instance = new WebVitalsTracker();
    }
    return WebVitalsTracker.instance;
  }

  // Start tracking Web Vitals
  startTracking(): void {
    if (this.isTracking) return;
    this.isTracking = true;

    // Track Core Web Vitals
    getLCP(this.handleVital.bind(this));
    getFID(this.handleVital.bind(this));
    getCLS(this.handleVital.bind(this));
    getFCP(this.handleVital.bind(this));
    getTTFB(this.handleVital.bind(this));

    // Additional performance tracking
    this.trackNavigationTiming();
    this.trackResourceTiming();
    this.trackMemoryUsage();
  }

  // Handle individual vital measurements
  private handleVital(vital: any): void {
    const vitalData: WebVitalData = {
      name: vital.name,
      value: vital.value,
      rating: rateVital(vital.name, vital.value),
      delta: vital.delta,
      id: vital.id,
      navigationType: vital.navigationType || 'navigate',
    };

    this.vitals[vital.name as keyof WebVitalsReport] = vitalData;

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${vital.name}:`, {
        value: vital.value,
        rating: vitalData.rating,
        threshold: WEB_VITALS_THRESHOLDS[vital.name as keyof typeof WEB_VITALS_THRESHOLDS],
      });
    }

    // Send to analytics
    this.sendToAnalytics(vitalData);
    
    // Notify callbacks
    this.callbacks.forEach(callback => callback(this.vitals as WebVitalsReport));
  }

  // Add callback for vital updates
  onVitalUpdate(callback: (report: WebVitalsReport) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  // Get current vitals report
  getReport(): WebVitalsReport {
    return this.vitals as WebVitalsReport;
  }

  // Get connection information
  private getConnectionInfo(): any {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return null;
  }

  // Track navigation timing
  private trackNavigationTiming(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const timings = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            ssl: navigation.connectEnd - navigation.secureConnectionStart,
            ttfb: navigation.responseStart - navigation.requestStart,
            download: navigation.responseEnd - navigation.responseStart,
            dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            render: navigation.loadEventEnd - navigation.loadEventStart,
          };

          this.sendToAnalytics({
            name: 'navigation-timing',
            value: 0,
            rating: 'good' as const,
            delta: 0,
            id: 'navigation',
            navigationType: 'navigate',
            timings,
          });
        }
      }, 0);
    });
  }

  // Track resource timing
  private trackResourceTiming(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const resources = performance.getEntriesByType('resource');
        const resourceData = resources.map((resource: PerformanceResourceTiming) => ({
          name: resource.name,
          type: resource.initiatorType,
          duration: resource.duration,
          size: resource.transferSize,
          cached: resource.transferSize === 0 && resource.decodedBodySize > 0,
        }));

        // Find slow resources
        const slowResources = resourceData.filter(r => r.duration > 1000);
        if (slowResources.length > 0) {
          this.sendToAnalytics({
            name: 'slow-resources',
            value: slowResources.length,
            rating: 'poor' as const,
            delta: 0,
            id: 'resources',
            navigationType: 'navigate',
            slowResources,
          });
        }
      }, 1000);
    });
  }

  // Track memory usage
  private trackMemoryUsage(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const memory = (performance as any).memory;
    const memoryData = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
    };

    // Check for memory pressure
    if (memoryData.usageRatio > 0.8) {
      this.sendToAnalytics({
        name: 'memory-pressure',
        value: memoryData.usageRatio,
        rating: 'poor' as const,
        delta: 0,
        id: 'memory',
        navigationType: 'navigate',
        memory: memoryData,
      });
    }
  }

  // Send data to analytics services
  private sendToAnalytics(data: any): void {
    try {
      // Send to Google Analytics 4
      if (typeof gtag !== 'undefined') {
        gtag('event', data.name, {
          metric_value: data.value,
          metric_rating: data.rating,
          custom_parameter: data,
        });
      }

      // Send to Vercel Analytics
      if (typeof window !== 'undefined' && 'va' in window) {
        (window as any).va('track', data.name, {
          value: data.value,
          rating: data.rating,
          ...data,
        });
      }

      // Send to custom analytics endpoint
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      }).catch(error => {
        console.warn('[Web Vitals] Failed to send analytics:', error);
      });

    } catch (error) {
      console.warn('[Web Vitals] Analytics error:', error);
    }
  }

  // Performance monitoring utilities
  static measurePerformance<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    // Log slow operations
    if (duration > 16) { // More than 1 frame at 60fps
      console.warn(`[Performance] Slow operation "${name}": ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    // Log slow async operations
    if (duration > 100) {
      console.warn(`[Performance] Slow async operation "${name}": ${duration.toFixed(2)}ms`);
    }

    return result;
  }
}

// React hook for Web Vitals
export function useWebVitals() {
  const [vitals, setVitals] = useState<Partial<WebVitalsReport>>({});

  useEffect(() => {
    const tracker = WebVitalsTracker.getInstance();
    tracker.startTracking();

    const unsubscribe = tracker.onVitalUpdate((report) => {
      setVitals(report);
    });

    return unsubscribe;
  }, []);

  return vitals;
}

// Initialize tracking
export function initWebVitals(): void {
  if (typeof window !== 'undefined') {
    const tracker = WebVitalsTracker.getInstance();
    tracker.startTracking();
  }
}

// Export singleton instance
export const webVitalsTracker = WebVitalsTracker.getInstance();

declare global {
  function gtag(...args: any[]): void;
}