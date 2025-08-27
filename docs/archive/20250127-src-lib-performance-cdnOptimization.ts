// CDN and static asset optimization for 7P Education platform

export interface CDNConfig {
  enabled: boolean;
  baseURL: string;
  imageOptimization: {
    enabled: boolean;
    formats: string[];
    quality: number;
    sizes: number[];
  };
  assetOptimization: {
    enableCompression: boolean;
    enableCaching: boolean;
    maxAge: number;
  };
  geolocation: {
    enabled: boolean;
    regions: string[];
  };
}

export const defaultCDNConfig: CDNConfig = {
  enabled: process.env.NODE_ENV === 'production',
  baseURL: process.env.NEXT_PUBLIC_CDN_URL || '',
  imageOptimization: {
    enabled: true,
    formats: ['webp', 'avif', 'jpeg', 'png'],
    quality: 85,
    sizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
  assetOptimization: {
    enableCompression: true,
    enableCaching: true,
    maxAge: 31536000, // 1 year
  },
  geolocation: {
    enabled: true,
    regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
  },
};

// CDN URL generator
export class CDNUrlGenerator {
  private config: CDNConfig;
  private userRegion: string | null = null;

  constructor(config: CDNConfig = defaultCDNConfig) {
    this.config = { ...defaultCDNConfig, ...config };
    this.detectUserRegion();
  }

  /**
   * Generate optimized image URL
   */
  getImageUrl(
    src: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      position?: string;
    } = {}
  ): string {
    if (!this.config.enabled || !this.config.baseURL) {
      return src;
    }

    // Don't CDN external URLs
    if (src.startsWith('http') && !src.startsWith(window.location.origin)) {
      return src;
    }

    const params = new URLSearchParams();

    // Set image transformation parameters
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);
    if (options.fit) params.set('fit', options.fit);
    if (options.position) params.set('pos', options.position);

    // Auto-detect best format
    if (!options.format && this.config.imageOptimization.enabled) {
      const bestFormat = this.getBestImageFormat();
      if (bestFormat) {
        params.set('f', bestFormat);
      }
    }

    // Use default quality if not specified
    if (!options.quality) {
      params.set('q', this.config.imageOptimization.quality.toString());
    }

    const cdnUrl = this.getCDNBaseUrl();
    const cleanSrc = src.startsWith('/') ? src.substring(1) : src;
    
    return `${cdnUrl}/${cleanSrc}?${params.toString()}`;
  }

  /**
   * Generate asset URL with optimization
   */
  getAssetUrl(src: string, options: {
    version?: string;
    compress?: boolean;
    cache?: boolean;
  } = {}): string {
    if (!this.config.enabled || !this.config.baseURL) {
      return src;
    }

    const params = new URLSearchParams();

    if (options.version) params.set('v', options.version);
    if (options.compress !== false && this.config.assetOptimization.enableCompression) {
      params.set('compress', 'true');
    }
    if (options.cache !== false && this.config.assetOptimization.enableCaching) {
      params.set('cache', this.config.assetOptimization.maxAge.toString());
    }

    const cdnUrl = this.getCDNBaseUrl();
    const cleanSrc = src.startsWith('/') ? src.substring(1) : src;
    
    return `${cdnUrl}/${cleanSrc}${params.toString() ? `?${params.toString()}` : ''}`;
  }

  /**
   * Generate responsive image srcset
   */
  getResponsiveSrcSet(
    src: string,
    options: {
      sizes?: number[];
      format?: string;
      quality?: number;
    } = {}
  ): string {
    if (!this.config.enabled) {
      return src;
    }

    const sizes = options.sizes || this.config.imageOptimization.sizes;
    const format = options.format || this.getBestImageFormat();
    const quality = options.quality || this.config.imageOptimization.quality;

    return sizes
      .map(size => {
        const url = this.getImageUrl(src, {
          width: size,
          format,
          quality,
        });
        return `${url} ${size}w`;
      })
      .join(', ');
  }

  /**
   * Get best image format for current browser
   */
  private getBestImageFormat(): string | null {
    if (typeof window === 'undefined') return null;

    // Check for AVIF support
    if (this.supportsFormat('avif')) {
      return 'avif';
    }

    // Check for WebP support
    if (this.supportsFormat('webp')) {
      return 'webp';
    }

    return null; // Use original format
  }

  /**
   * Check if browser supports image format
   */
  private supportsFormat(format: string): boolean {
    if (typeof window === 'undefined') return false;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    try {
      return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get CDN base URL based on user region
   */
  private getCDNBaseUrl(): string {
    if (!this.config.geolocation.enabled || !this.userRegion) {
      return this.config.baseURL;
    }

    // Use region-specific CDN endpoint if available
    return `${this.config.baseURL.replace('cdn', `${this.userRegion}-cdn`)}`;
  }

  /**
   * Detect user's region for optimal CDN selection
   */
  private detectUserRegion(): void {
    if (typeof window === 'undefined') return;

    // Try to detect from timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      if (timezone.includes('America')) {
        this.userRegion = 'us-east-1';
      } else if (timezone.includes('Europe') || timezone.includes('Africa')) {
        this.userRegion = 'eu-west-1';
      } else if (timezone.includes('Asia') || timezone.includes('Pacific')) {
        this.userRegion = 'ap-southeast-1';
      }
    } catch {
      // Fallback to default region
      this.userRegion = 'us-east-1';
    }

    // Use connection info if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        // Use closest region for slow connections
        this.userRegion = 'us-east-1';
      }
    }
  }
}

// Asset preloader for critical resources
export class AssetPreloader {
  private preloadedAssets = new Set<string>();

  /**
   * Preload critical images
   */
  preloadImages(images: Array<{
    src: string;
    priority?: 'high' | 'low';
    crossOrigin?: boolean;
  }>): void {
    images.forEach(({ src, priority = 'low', crossOrigin = false }) => {
      if (this.preloadedAssets.has(src)) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      
      if (crossOrigin) {
        link.crossOrigin = 'anonymous';
      }
      
      // Set fetch priority
      if ('fetchPriority' in link) {
        (link as any).fetchPriority = priority;
      }

      document.head.appendChild(link);
      this.preloadedAssets.add(src);
    });
  }

  /**
   * Preload CSS files
   */
  preloadCSS(stylesheets: Array<{
    href: string;
    priority?: 'high' | 'low';
    media?: string;
  }>): void {
    stylesheets.forEach(({ href, priority = 'low', media = 'all' }) => {
      if (this.preloadedAssets.has(href)) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      link.media = media;
      
      if ('fetchPriority' in link) {
        (link as any).fetchPriority = priority;
      }

      // Convert to stylesheet after load
      link.onload = () => {
        link.rel = 'stylesheet';
      };

      document.head.appendChild(link);
      this.preloadedAssets.add(href);
    });
  }

  /**
   * Preload JavaScript modules
   */
  preloadScripts(scripts: Array<{
    src: string;
    priority?: 'high' | 'low';
    crossOrigin?: boolean;
  }>): void {
    scripts.forEach(({ src, priority = 'low', crossOrigin = false }) => {
      if (this.preloadedAssets.has(src)) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = src;
      
      if (crossOrigin) {
        link.crossOrigin = 'anonymous';
      }
      
      if ('fetchPriority' in link) {
        (link as any).fetchPriority = priority;
      }

      document.head.appendChild(link);
      this.preloadedAssets.add(src);
    });
  }

  /**
   * Preload fonts
   */
  preloadFonts(fonts: Array<{
    href: string;
    type?: string;
    crossOrigin?: boolean;
  }>): void {
    fonts.forEach(({ href, type = 'font/woff2', crossOrigin = true }) => {
      if (this.preloadedAssets.has(href)) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = type;
      link.href = href;
      
      if (crossOrigin) {
        link.crossOrigin = 'anonymous';
      }

      document.head.appendChild(link);
      this.preloadedAssets.add(href);
    });
  }

  /**
   * Clear preloaded assets tracking
   */
  clear(): void {
    this.preloadedAssets.clear();
  }
}

// Resource hints manager
export class ResourceHintsManager {
  private addedHints = new Set<string>();

  /**
   * Add DNS prefetch hints
   */
  dnsPrefetch(domains: string[]): void {
    domains.forEach(domain => {
      if (this.addedHints.has(`dns-prefetch:${domain}`)) return;

      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      
      document.head.appendChild(link);
      this.addedHints.add(`dns-prefetch:${domain}`);
    });
  }

  /**
   * Add preconnect hints
   */
  preconnect(origins: Array<{
    href: string;
    crossOrigin?: boolean;
  }>): void {
    origins.forEach(({ href, crossOrigin = false }) => {
      if (this.addedHints.has(`preconnect:${href}`)) return;

      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      
      if (crossOrigin) {
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
      this.addedHints.add(`preconnect:${href}`);
    });
  }

  /**
   * Add module preload hints
   */
  modulePreload(modules: string[]): void {
    modules.forEach(module => {
      if (this.addedHints.has(`modulepreload:${module}`)) return;

      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = module;
      
      document.head.appendChild(link);
      this.addedHints.add(`modulepreload:${module}`);
    });
  }

  /**
   * Clear added hints tracking
   */
  clear(): void {
    this.addedHints.clear();
  }
}

// Main CDN optimization manager
export class CDNOptimizer {
  private static instance: CDNOptimizer;
  private urlGenerator: CDNUrlGenerator;
  private assetPreloader: AssetPreloader;
  private resourceHints: ResourceHintsManager;

  private constructor(config?: Partial<CDNConfig>) {
    this.urlGenerator = new CDNUrlGenerator(config);
    this.assetPreloader = new AssetPreloader();
    this.resourceHints = new ResourceHintsManager();
  }

  static getInstance(config?: Partial<CDNConfig>): CDNOptimizer {
    if (!CDNOptimizer.instance) {
      CDNOptimizer.instance = new CDNOptimizer(config);
    }
    return CDNOptimizer.instance;
  }

  /**
   * Initialize CDN optimizations
   */
  init(): void {
    if (typeof window === 'undefined') return;

    // Add resource hints for common external domains
    this.resourceHints.dnsPrefetch([
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://www.google-analytics.com',
      'https://www.googletagmanager.com',
    ]);

    // Preconnect to critical origins
    this.resourceHints.preconnect([
      { href: 'https://fonts.googleapis.com' },
      { href: 'https://fonts.gstatic.com', crossOrigin: true },
    ]);

    // Preload critical fonts
    this.assetPreloader.preloadFonts([
      {
        href: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
        type: 'font/woff2',
      },
    ]);

    console.log('[CDN Optimizer] CDN optimization initialized');
  }

  /**
   * Get optimized image URL
   */
  getImageUrl(src: string, options?: Parameters<CDNUrlGenerator['getImageUrl']>[1]): string {
    return this.urlGenerator.getImageUrl(src, options);
  }

  /**
   * Get optimized asset URL
   */
  getAssetUrl(src: string, options?: Parameters<CDNUrlGenerator['getAssetUrl']>[1]): string {
    return this.urlGenerator.getAssetUrl(src, options);
  }

  /**
   * Get responsive srcset
   */
  getResponsiveSrcSet(src: string, options?: Parameters<CDNUrlGenerator['getResponsiveSrcSet']>[1]): string {
    return this.urlGenerator.getResponsiveSrcSet(src, options);
  }

  /**
   * Preload critical resources
   */
  preloadCriticalResources(resources: {
    images?: Parameters<AssetPreloader['preloadImages']>[0];
    css?: Parameters<AssetPreloader['preloadCSS']>[0];
    scripts?: Parameters<AssetPreloader['preloadScripts']>[0];
    fonts?: Parameters<AssetPreloader['preloadFonts']>[0];
  }): void {
    if (resources.images) {
      this.assetPreloader.preloadImages(resources.images);
    }
    if (resources.css) {
      this.assetPreloader.preloadCSS(resources.css);
    }
    if (resources.scripts) {
      this.assetPreloader.preloadScripts(resources.scripts);
    }
    if (resources.fonts) {
      this.assetPreloader.preloadFonts(resources.fonts);
    }
  }

  /**
   * Add resource hints
   */
  addResourceHints(hints: {
    dnsPrefetch?: string[];
    preconnect?: Parameters<ResourceHintsManager['preconnect']>[0];
    modulePreload?: string[];
  }): void {
    if (hints.dnsPrefetch) {
      this.resourceHints.dnsPrefetch(hints.dnsPrefetch);
    }
    if (hints.preconnect) {
      this.resourceHints.preconnect(hints.preconnect);
    }
    if (hints.modulePreload) {
      this.resourceHints.modulePreload(hints.modulePreload);
    }
  }
}

// React hooks for CDN optimization
export function useCDNOptimization(config?: Partial<CDNConfig>) {
  const [optimizer, setOptimizer] = useState<CDNOptimizer | null>(null);

  useEffect(() => {
    const cdnOptimizer = CDNOptimizer.getInstance(config);
    cdnOptimizer.init();
    setOptimizer(cdnOptimizer);
  }, []);

  const getOptimizedImageUrl = useCallback((src: string, options?: any) => {
    return optimizer?.getImageUrl(src, options) || src;
  }, [optimizer]);

  const getOptimizedAssetUrl = useCallback((src: string, options?: any) => {
    return optimizer?.getAssetUrl(src, options) || src;
  }, [optimizer]);

  const getResponsiveSrcSet = useCallback((src: string, options?: any) => {
    return optimizer?.getResponsiveSrcSet(src, options) || src;
  }, [optimizer]);

  return {
    optimizer,
    getOptimizedImageUrl,
    getOptimizedAssetUrl,
    getResponsiveSrcSet,
  };
}

// Export singleton instance
export const cdnOptimizer = CDNOptimizer.getInstance();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  cdnOptimizer.init();
}

// React imports
const React = require('react');
const { useState, useEffect, useCallback } = React;