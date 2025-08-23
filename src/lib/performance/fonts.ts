import { Inter, Poppins, Source_Sans_3, Roboto } from 'next/font/google';
import localFont from 'next/font/local';

// Primary font - Inter for body text
export const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
  preload: true,
  fallback: ['system-ui', 'arial', 'sans-serif'],
});

// Display font - Poppins for headings
export const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700', '800'],
  preload: false, // Load on demand
  fallback: ['system-ui', 'arial', 'sans-serif'],
});

// Alternative body font - Source Sans 3
export const sourceSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-source-sans',
  weight: ['400', '500', '600', '700'],
  preload: false,
  fallback: ['system-ui', 'arial', 'sans-serif'],
});

// System font for UI elements
export const roboto = Roboto({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-roboto',
  weight: ['300', '400', '500', '700'],
  preload: false,
  fallback: ['system-ui', 'arial', 'sans-serif'],
});

// Local custom font (if any)
export const customFont = localFont({
  src: [
    {
      path: '../../assets/fonts/custom-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../assets/fonts/custom-medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../assets/fonts/custom-bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-custom',
  fallback: ['system-ui', 'arial', 'sans-serif'],
  preload: false,
});

// Font loading optimization utilities
export class FontLoader {
  private static loadedFonts = new Set<string>();
  private static loadingPromises = new Map<string, Promise<void>>();

  /**
   * Preload critical fonts
   */
  static preloadCriticalFonts(): void {
    if (typeof window === 'undefined') return;

    const criticalFonts = [
      {
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
        as: 'style',
      },
    ];

    criticalFonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font.href;
      link.as = font.as;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  /**
   * Load font dynamically with caching
   */
  static async loadFont(fontFamily: string, fontWeight = '400'): Promise<void> {
    const fontKey = `${fontFamily}-${fontWeight}`;
    
    if (this.loadedFonts.has(fontKey)) {
      return;
    }

    if (this.loadingPromises.has(fontKey)) {
      return this.loadingPromises.get(fontKey)!;
    }

    const loadingPromise = this.loadFontInternal(fontFamily, fontWeight);
    this.loadingPromises.set(fontKey, loadingPromise);

    try {
      await loadingPromise;
      this.loadedFonts.add(fontKey);
    } finally {
      this.loadingPromises.delete(fontKey);
    }
  }

  private static async loadFontInternal(fontFamily: string, fontWeight: string): Promise<void> {
    if (!('FontFace' in window)) return;

    try {
      // Create font face
      const fontFace = new FontFace(
        fontFamily,
        `url(https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@${fontWeight}&display=swap)`,
        {
          weight: fontWeight,
          display: 'swap',
        }
      );

      // Load and add to document
      await fontFace.load();
      document.fonts.add(fontFace);

      console.log(`[Font Loader] Loaded ${fontFamily} ${fontWeight}`);
    } catch (error) {
      console.warn(`[Font Loader] Failed to load ${fontFamily}:`, error);
    }
  }

  /**
   * Check if font is loaded
   */
  static isFontLoaded(fontFamily: string, fontWeight = '400'): boolean {
    return this.loadedFonts.has(`${fontFamily}-${fontWeight}`);
  }

  /**
   * Wait for font to be ready
   */
  static async waitForFont(fontFamily: string, text = 'test', timeout = 3000): Promise<boolean> {
    if (typeof document === 'undefined') return false;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve(false), timeout);

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          clearTimeout(timeoutId);
          resolve(document.fonts.check(`1em ${fontFamily}`));
        });
      } else {
        // Fallback for older browsers
        const testElement = document.createElement('div');
        testElement.style.fontFamily = fontFamily;
        testElement.style.fontSize = '1em';
        testElement.style.position = 'absolute';
        testElement.style.visibility = 'hidden';
        testElement.textContent = text;
        document.body.appendChild(testElement);

        const originalWidth = testElement.offsetWidth;

        const checkFont = () => {
          if (testElement.offsetWidth !== originalWidth) {
            clearTimeout(timeoutId);
            document.body.removeChild(testElement);
            resolve(true);
          } else {
            setTimeout(checkFont, 50);
          }
        };

        checkFont();
      }
    });
  }

  /**
   * Optimize font loading with resource hints
   */
  static optimizeFontLoading(): void {
    if (typeof document === 'undefined') return;

    // Add DNS prefetch for Google Fonts
    this.addResourceHint('dns-prefetch', 'https://fonts.googleapis.com');
    this.addResourceHint('dns-prefetch', 'https://fonts.gstatic.com');

    // Preconnect to font CDNs
    this.addResourceHint('preconnect', 'https://fonts.googleapis.com', true);
    this.addResourceHint('preconnect', 'https://fonts.gstatic.com', true);
  }

  private static addResourceHint(rel: string, href: string, crossorigin = false): void {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (crossorigin) {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  }
}

// Font performance metrics
export class FontMetrics {
  private static metrics: Map<string, number> = new Map();

  /**
   * Measure font load time
   */
  static async measureFontLoadTime(fontFamily: string): Promise<number> {
    const startTime = performance.now();
    
    try {
      await FontLoader.waitForFont(fontFamily);
      const loadTime = performance.now() - startTime;
      this.metrics.set(fontFamily, loadTime);
      
      // Log slow font loads
      if (loadTime > 2000) {
        console.warn(`[Font Metrics] Slow font load: ${fontFamily} took ${loadTime.toFixed(2)}ms`);
      }
      
      return loadTime;
    } catch (error) {
      console.error(`[Font Metrics] Failed to measure ${fontFamily}:`, error);
      return -1;
    }
  }

  /**
   * Get font load metrics
   */
  static getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Report font performance to analytics
   */
  static reportToAnalytics(): void {
    const metrics = this.getMetrics();
    
    Object.entries(metrics).forEach(([font, loadTime]) => {
      // Send to analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'font_load_time', {
          font_family: font,
          load_time: loadTime,
          metric_value: loadTime,
        });
      }
    });
  }
}

// CSS variables for font families
export const fontVariables = [
  inter.variable,
  poppins.variable,
  sourceSans.variable,
  roboto.variable,
  customFont.variable,
].join(' ');

// Font class utilities
export const fontClasses = {
  inter: inter.className,
  poppins: poppins.className,
  sourceSans: sourceSans.className,
  roboto: roboto.className,
  custom: customFont.className,
};

// Tailwind CSS font configuration
export const tailwindFontConfig = {
  fontFamily: {
    'inter': ['var(--font-inter)', 'system-ui', 'sans-serif'],
    'poppins': ['var(--font-poppins)', 'system-ui', 'sans-serif'],
    'source-sans': ['var(--font-source-sans)', 'system-ui', 'sans-serif'],
    'roboto': ['var(--font-roboto)', 'system-ui', 'sans-serif'],
    'custom': ['var(--font-custom)', 'system-ui', 'sans-serif'],
    'system': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  },
};

// Initialize font optimization
export function initFontOptimization(): void {
  if (typeof window !== 'undefined') {
    // Optimize font loading
    FontLoader.optimizeFontLoading();
    
    // Preload critical fonts
    FontLoader.preloadCriticalFonts();
    
    // Measure font performance
    document.addEventListener('DOMContentLoaded', () => {
      FontMetrics.measureFontLoadTime('Inter');
    });
    
    // Report metrics after page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        FontMetrics.reportToAnalytics();
      }, 1000);
    });
  }
}