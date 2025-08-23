// CSS optimization utilities for 7P Education platform

export interface CSSOptimizationConfig {
  enablePurging: boolean;
  enableMinification: boolean;
  enableCriticalCSS: boolean;
  enableInlining: boolean;
  maxInlineSize: number;
}

export const defaultConfig: CSSOptimizationConfig = {
  enablePurging: true,
  enableMinification: true,
  enableCriticalCSS: true,
  enableInlining: true,
  maxInlineSize: 14 * 1024, // 14KB threshold for inlining
};

// Critical CSS extraction and inlining
export class CriticalCSSExtractor {
  private static criticalSelectors = new Set<string>();
  private static processedPages = new Set<string>();

  /**
   * Extract critical CSS for above-the-fold content
   */
  static extractCriticalCSS(html: string, css: string): string {
    // Simple CSS extraction based on selectors found in HTML
    const usedSelectors = this.findUsedSelectors(html);
    const criticalCSS = this.filterCSS(css, usedSelectors);
    
    return this.minifyCSS(criticalCSS);
  }

  /**
   * Find CSS selectors used in HTML
   */
  private static findUsedSelectors(html: string): Set<string> {
    const selectors = new Set<string>();
    
    // Extract class names
    const classMatches = html.match(/class=["']([^"']+)["']/g);
    if (classMatches) {
      classMatches.forEach(match => {
        const classes = match.replace(/class=["']([^"']+)["']/, '$1').split(/\s+/);
        classes.forEach(className => {
          if (className.trim()) {
            selectors.add(`.${className.trim()}`);
          }
        });
      });
    }
    
    // Extract ID selectors
    const idMatches = html.match(/id=["']([^"']+)["']/g);
    if (idMatches) {
      idMatches.forEach(match => {
        const id = match.replace(/id=["']([^"']+)["']/, '$1');
        selectors.add(`#${id}`);
      });
    }
    
    // Extract tag selectors for common elements
    const commonTags = ['body', 'html', 'main', 'header', 'footer', 'nav', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'input', 'form'];
    commonTags.forEach(tag => {
      if (html.includes(`<${tag}`)) {
        selectors.add(tag);
      }
    });
    
    return selectors;
  }

  /**
   * Filter CSS to include only used selectors
   */
  private static filterCSS(css: string, usedSelectors: Set<string>): string {
    const rules: string[] = [];
    
    // Simple CSS rule extraction (basic implementation)
    const ruleMatches = css.match(/[^{}]+\{[^{}]*\}/g);
    if (ruleMatches) {
      ruleMatches.forEach(rule => {
        const selectorPart = rule.split('{')[0].trim();
        
        // Check if any selector in the rule is used
        const selectors = selectorPart.split(',').map(s => s.trim());
        const isUsed = selectors.some(selector => {
          // Remove pseudo-classes and pseudo-elements for matching
          const baseSelector = selector.replace(/:+[^:\s]+/g, '').trim();
          return usedSelectors.has(baseSelector) || 
                 Array.from(usedSelectors).some(used => baseSelector.includes(used));
        });
        
        if (isUsed) {
          rules.push(rule);
        }
      });
    }
    
    return rules.join('\n');
  }

  /**
   * Minify CSS
   */
  private static minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
      .replace(/\s*{\s*/g, '{') // Clean braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*,\s*/g, ',') // Clean commas
      .replace(/\s*:\s*/g, ':') // Clean colons
      .replace(/\s*;\s*/g, ';') // Clean semicolons
      .trim();
  }

  /**
   * Inline critical CSS
   */
  static inlineCriticalCSS(html: string, criticalCSS: string): string {
    if (!criticalCSS || criticalCSS.length === 0) return html;
    
    const style = `<style data-critical-css>${criticalCSS}</style>`;
    
    // Insert critical CSS before the first stylesheet or in head
    if (html.includes('<link rel="stylesheet"')) {
      return html.replace('<link rel="stylesheet"', `${style}<link rel="stylesheet"`);
    } else if (html.includes('</head>')) {
      return html.replace('</head>', `${style}</head>`);
    }
    
    return html;
  }
}

// CSS loading optimization
export class CSSLoader {
  private static loadedStyles = new Set<string>();
  private static loadingPromises = new Map<string, Promise<void>>();

  /**
   * Load CSS asynchronously
   */
  static async loadCSS(href: string, media = 'all'): Promise<void> {
    if (this.loadedStyles.has(href)) {
      return;
    }

    if (this.loadingPromises.has(href)) {
      return this.loadingPromises.get(href)!;
    }

    const loadingPromise = this.loadCSSInternal(href, media);
    this.loadingPromises.set(href, loadingPromise);

    try {
      await loadingPromise;
      this.loadedStyles.add(href);
    } finally {
      this.loadingPromises.delete(href);
    }
  }

  private static loadCSSInternal(href: string, media: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = media;
      
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
      
      document.head.appendChild(link);
    });
  }

  /**
   * Preload CSS with resource hints
   */
  static preloadCSS(href: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  }

  /**
   * Load non-critical CSS after page load
   */
  static loadNonCriticalCSS(stylesheets: string[]): void {
    if (typeof window === 'undefined') return;

    const loadStylesheets = () => {
      stylesheets.forEach(href => {
        this.loadCSS(href).catch(error => {
          console.warn(`[CSS Loader] Failed to load ${href}:`, error);
        });
      });
    };

    if (document.readyState === 'complete') {
      loadStylesheets();
    } else {
      window.addEventListener('load', loadStylesheets);
    }
  }
}

// CSS performance monitoring
export class CSSPerformanceMonitor {
  private static metrics = new Map<string, number>();

  /**
   * Monitor CSS load times
   */
  static monitorCSS(): void {
    if (typeof window === 'undefined') return;

    // Monitor existing stylesheets
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    
    stylesheets.forEach(stylesheet => {
      const startTime = performance.now();
      
      stylesheet.addEventListener('load', () => {
        const loadTime = performance.now() - startTime;
        this.metrics.set(stylesheet.href, loadTime);
        
        // Log slow CSS loads
        if (loadTime > 1000) {
          console.warn(`[CSS Performance] Slow CSS load: ${stylesheet.href} took ${loadTime.toFixed(2)}ms`);
        }
      });
    });

    // Monitor CSSOM ready state
    this.monitorCSSOM();
  }

  /**
   * Monitor CSSOM construction
   */
  private static monitorCSSOM(): void {
    const startTime = performance.now();
    
    const checkCSSOM = () => {
      try {
        // Try to access CSSOM
        const stylesheets = Array.from(document.styleSheets);
        stylesheets.forEach(sheet => {
          if (sheet.cssRules) {
            // CSSOM is ready
            const cssomTime = performance.now() - startTime;
            console.log(`[CSS Performance] CSSOM ready in ${cssomTime.toFixed(2)}ms`);
            
            // Send to analytics
            this.reportToAnalytics('cssom_ready_time', cssomTime);
            return;
          }
        });
        
        // Not ready yet, check again
        requestAnimationFrame(checkCSSOM);
      } catch (error) {
        // CSSOM not ready, check again
        requestAnimationFrame(checkCSSOM);
      }
    };
    
    requestAnimationFrame(checkCSSOM);
  }

  /**
   * Get CSS performance metrics
   */
  static getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Report to analytics
   */
  static reportToAnalytics(eventName: string, value: number): void {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        metric_value: value,
        custom_parameter: {
          css_load_time: value,
        },
      });
    }
  }
}

// Tailwind CSS optimization configuration
export const tailwindOptimizationConfig = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  
  // Optimize for production
  ...(process.env.NODE_ENV === 'production' && {
    plugins: [
      require('@tailwindcss/aspect-ratio'),
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography'),
    ],
  }),
  
  theme: {
    extend: {
      // Custom optimizations
      screens: {
        'xs': '475px',
      },
      
      // Font optimization
      fontFamily: {
        'inter': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'poppins': ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
      
      // Color optimization (reduce unused colors)
      colors: {
        'primary': {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        'gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
    },
  },
  
  // Purge unused CSS
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './src/**/*.{js,jsx,ts,tsx}',
      './public/**/*.html',
    ],
    options: {
      safelist: [
        // Preserve dynamic classes
        /^bg-/,
        /^text-/,
        /^border-/,
        /^hover:/,
        /^focus:/,
        /^active:/,
        /^disabled:/,
        'animate-spin',
        'animate-pulse',
        'animate-bounce',
      ],
    },
  },
};

// CSS optimization utilities
export const CSSOptimizer = {
  /**
   * Initialize CSS optimization
   */
  init(config: Partial<CSSOptimizationConfig> = {}): void {
    const finalConfig = { ...defaultConfig, ...config };
    
    if (typeof window !== 'undefined') {
      // Monitor CSS performance
      CSSPerformanceMonitor.monitorCSS();
      
      // Load non-critical CSS after page load
      const nonCriticalCSS = [
        '/styles/non-critical.css',
        'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
      ];
      
      CSSLoader.loadNonCriticalCSS(nonCriticalCSS);
      
      // Report metrics after page load
      window.addEventListener('load', () => {
        setTimeout(() => {
          const metrics = CSSPerformanceMonitor.getMetrics();
          console.log('[CSS Optimizer] Performance metrics:', metrics);
        }, 1000);
      });
    }
  },
  
  /**
   * Optimize CSS delivery
   */
  optimizeDelivery(): void {
    if (typeof document === 'undefined') return;
    
    // Add resource hints for CSS
    const preconnects = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ];
    
    preconnects.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  },
  
  CriticalCSSExtractor,
  CSSLoader,
  CSSPerformanceMonitor,
};