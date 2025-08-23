/**
 * SEO Analytics and Performance Monitoring System
 * Integrates with Google Analytics, Search Console, and other tools
 */

import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals'

interface SEOMetrics {
  pageUrl: string
  title: string
  description: string
  h1Count: number
  imageCount: number
  imageAltMissing: number
  internalLinks: number
  externalLinks: number
  loadTime: number
  coreWebVitals: {
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
    fcp: number // First Contentful Paint
    ttfb: number // Time to First Byte
  }
  structuredDataPresent: boolean
  metaRobotsContent: string
  canonicalUrl?: string
  hreflangTags: number
  errors: string[]
  warnings: string[]
  seoScore: number
}

interface SEOAnalyticsEvent {
  event: string
  category: 'seo'
  action: string
  label?: string
  value?: number
  customParameters?: { [key: string]: any }
}

interface SearchConsoleData {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  page: string
}

class SEOAnalytics {
  private readonly gtag: any
  private readonly isProduction = process.env.NODE_ENV === 'production'
  private readonly measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.gtag = (window as any).gtag
    }
  }

  /**
   * Initialize SEO analytics tracking
   */
  initializeSEOTracking(): void {
    if (!this.isProduction || typeof window === 'undefined') return

    // Track Core Web Vitals for SEO
    this.trackCoreWebVitals()
    
    // Track SEO-specific events
    this.trackSEOEvents()
    
    // Track search visibility
    this.trackSearchVisibility()

    console.log('✅ SEO Analytics initialized')
  }

  /**
   * Track Core Web Vitals for SEO ranking factors
   */
  private trackCoreWebVitals(): void {
    const vitalsToTrack = ['CLS', 'FID', 'FCP', 'LCP', 'TTFB']
    
    getLCP((metric) => {
      this.sendSEOEvent({
        event: 'web_vital',
        category: 'seo',
        action: 'lcp',
        label: metric.name,
        value: Math.round(metric.value),
        customParameters: {
          vital_rating: metric.rating,
          page_url: window.location.pathname
        }
      })
    })

    getFID((metric) => {
      this.sendSEOEvent({
        event: 'web_vital',
        category: 'seo',
        action: 'fid',
        label: metric.name,
        value: Math.round(metric.value),
        customParameters: {
          vital_rating: metric.rating,
          page_url: window.location.pathname
        }
      })
    })

    getCLS((metric) => {
      this.sendSEOEvent({
        event: 'web_vital',
        category: 'seo',
        action: 'cls',
        label: metric.name,
        value: Math.round(metric.value * 1000), // Convert to milliseconds for GA
        customParameters: {
          vital_rating: metric.rating,
          page_url: window.location.pathname
        }
      })
    })

    getFCP((metric) => {
      this.sendSEOEvent({
        event: 'web_vital',
        category: 'seo',
        action: 'fcp',
        label: metric.name,
        value: Math.round(metric.value),
        customParameters: {
          vital_rating: metric.rating,
          page_url: window.location.pathname
        }
      })
    })

    getTTFB((metric) => {
      this.sendSEOEvent({
        event: 'web_vital',
        category: 'seo',
        action: 'ttfb',
        label: metric.name,
        value: Math.round(metric.value),
        customParameters: {
          vital_rating: metric.rating,
          page_url: window.location.pathname
        }
      })
    })
  }

  /**
   * Track SEO-specific user interactions
   */
  private trackSEOEvents(): void {
    if (typeof window === 'undefined') return

    // Track search result clicks from organic traffic
    if (document.referrer.includes('google.com') || document.referrer.includes('bing.com')) {
      this.sendSEOEvent({
        event: 'organic_traffic',
        category: 'seo',
        action: 'search_engine_visit',
        label: this.extractSearchEngine(document.referrer),
        customParameters: {
          referrer: document.referrer,
          landing_page: window.location.pathname
        }
      })
    }

    // Track structured data interactions
    this.trackStructuredDataClicks()

    // Track social media sharing (SEO signals)
    this.trackSocialSharing()
  }

  /**
   * Track search visibility and keyword rankings
   */
  private trackSearchVisibility(): void {
    // This would integrate with Search Console API
    // For now, we track basic search-related metrics
    
    const urlParams = new URLSearchParams(window.location.search)
    const searchQuery = urlParams.get('q') || urlParams.get('search') || urlParams.get('query')
    
    if (searchQuery) {
      this.sendSEOEvent({
        event: 'internal_search',
        category: 'seo',
        action: 'site_search',
        label: searchQuery,
        customParameters: {
          search_query: searchQuery,
          search_page: window.location.pathname
        }
      })
    }
  }

  /**
   * Collect comprehensive SEO metrics for a page
   */
  async collectPageSEOMetrics(url?: string): Promise<SEOMetrics> {
    const pageUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
    
    if (typeof window === 'undefined') {
      // Return empty metrics for server-side
      return this.getEmptyMetrics(pageUrl)
    }

    const doc = document
    const metrics: SEOMetrics = {
      pageUrl,
      title: doc.title || '',
      description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      h1Count: doc.querySelectorAll('h1').length,
      imageCount: doc.querySelectorAll('img').length,
      imageAltMissing: doc.querySelectorAll('img:not([alt])').length,
      internalLinks: this.countInternalLinks(doc),
      externalLinks: this.countExternalLinks(doc),
      loadTime: performance.timing?.loadEventEnd - performance.timing?.navigationStart || 0,
      coreWebVitals: {
        lcp: 0, // Will be updated by web-vitals
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0
      },
      structuredDataPresent: doc.querySelector('script[type="application/ld+json"]') !== null,
      metaRobotsContent: doc.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index,follow',
      canonicalUrl: doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      hreflangTags: doc.querySelectorAll('link[rel="alternate"][hreflang]').length,
      errors: [],
      warnings: [],
      seoScore: 0
    }

    // Calculate SEO score
    metrics.seoScore = this.calculateSEOScore(metrics)

    // Send metrics to analytics
    this.sendSEOMetrics(metrics)

    return metrics
  }

  /**
   * Calculate overall SEO score based on metrics
   */
  private calculateSEOScore(metrics: SEOMetrics): number {
    let score = 100

    // Title optimization
    if (!metrics.title) score -= 20
    else if (metrics.title.length > 60) score -= 10
    else if (metrics.title.length < 20) score -= 5

    // Description optimization
    if (!metrics.description) score -= 15
    else if (metrics.description.length > 160) score -= 8
    else if (metrics.description.length < 50) score -= 5

    // Heading structure
    if (metrics.h1Count === 0) score -= 15
    else if (metrics.h1Count > 1) score -= 8

    // Image optimization
    if (metrics.imageAltMissing > 0) {
      score -= Math.min(10, metrics.imageAltMissing * 2)
    }

    // Technical SEO
    if (!metrics.structuredDataPresent) score -= 5
    if (!metrics.canonicalUrl) score -= 5
    if (metrics.hreflangTags === 0) score -= 3

    // Performance impact on SEO
    if (metrics.loadTime > 3000) score -= 10
    else if (metrics.loadTime > 2000) score -= 5

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Track Turkish keyword performance
   */
  trackTurkishKeywordPerformance(keyword: string, ranking: number, url: string): void {
    this.sendSEOEvent({
      event: 'keyword_ranking',
      category: 'seo',
      action: 'turkish_keyword_performance',
      label: keyword,
      value: ranking,
      customParameters: {
        keyword,
        ranking,
        url,
        language: 'tr',
        market: 'turkey'
      }
    })
  }

  /**
   * Track course page SEO performance
   */
  trackCoursePageSEO(courseId: string, courseName: string, category: string): void {
    this.sendSEOEvent({
      event: 'course_page_view',
      category: 'seo',
      action: 'course_seo_tracking',
      label: courseName,
      customParameters: {
        course_id: courseId,
        course_name: courseName,
        course_category: category,
        page_type: 'course_detail'
      }
    })
  }

  /**
   * Track search engine crawl events
   */
  trackCrawlEvents(): void {
    if (typeof window === 'undefined') return

    const userAgent = navigator.userAgent.toLowerCase()
    const bots = [
      'googlebot',
      'bingbot',
      'yandexbot',
      'facebookexternalhit',
      'twitterbot'
    ]

    const detectedBot = bots.find(bot => userAgent.includes(bot))
    
    if (detectedBot) {
      this.sendSEOEvent({
        event: 'bot_visit',
        category: 'seo',
        action: 'crawler_detected',
        label: detectedBot,
        customParameters: {
          bot_name: detectedBot,
          user_agent: navigator.userAgent,
          page_url: window.location.pathname
        }
      })
    }
  }

  /**
   * Send SEO event to Google Analytics
   */
  private sendSEOEvent(event: SEOAnalyticsEvent): void {
    if (!this.isProduction || !this.gtag) return

    try {
      this.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        custom_map: event.customParameters
      })

      // Also send to custom SEO analytics endpoint
      this.sendToSEOEndpoint(event)
    } catch (error) {
      console.error('Failed to send SEO event:', error)
    }
  }

  /**
   * Send SEO metrics to custom analytics endpoint
   */
  private sendSEOMetrics(metrics: SEOMetrics): void {
    if (!this.isProduction) return

    try {
      fetch('/api/analytics/seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          metrics,
          session_id: this.getSessionId()
        })
      }).catch(error => {
        console.error('Failed to send SEO metrics:', error)
      })
    } catch (error) {
      console.error('Error sending SEO metrics:', error)
    }
  }

  /**
   * Track structured data clicks and interactions
   */
  private trackStructuredDataClicks(): void {
    // Track clicks on rich snippets elements
    const richSnippetElements = document.querySelectorAll('[data-rich-snippet]')
    
    richSnippetElements.forEach(element => {
      element.addEventListener('click', (event) => {
        const snippetType = element.getAttribute('data-rich-snippet')
        
        this.sendSEOEvent({
          event: 'rich_snippet_click',
          category: 'seo',
          action: 'structured_data_interaction',
          label: snippetType || 'unknown',
          customParameters: {
            snippet_type: snippetType,
            element_id: element.id,
            page_url: window.location.pathname
          }
        })
      })
    })
  }

  /**
   * Track social media sharing for SEO signals
   */
  private trackSocialSharing(): void {
    // Track social share button clicks
    const socialButtons = document.querySelectorAll('[data-social-share]')
    
    socialButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const platform = button.getAttribute('data-social-share')
        
        this.sendSEOEvent({
          event: 'social_share',
          category: 'seo',
          action: 'social_signal',
          label: platform || 'unknown',
          customParameters: {
            platform,
            shared_url: window.location.href,
            page_title: document.title
          }
        })
      })
    })
  }

  // Utility methods
  private extractSearchEngine(referrer: string): string {
    if (referrer.includes('google')) return 'google'
    if (referrer.includes('bing')) return 'bing'
    if (referrer.includes('yandex')) return 'yandex'
    if (referrer.includes('duckduckgo')) return 'duckduckgo'
    return 'other'
  }

  private countInternalLinks(doc: Document): number {
    const links = Array.from(doc.querySelectorAll('a[href]'))
    const baseUrl = window.location.origin
    
    return links.filter(link => {
      const href = link.getAttribute('href')
      if (!href) return false
      
      try {
        const url = new URL(href, window.location.href)
        return url.origin === baseUrl
      } catch {
        return false
      }
    }).length
  }

  private countExternalLinks(doc: Document): number {
    const links = Array.from(doc.querySelectorAll('a[href]'))
    const baseUrl = window.location.origin
    
    return links.filter(link => {
      const href = link.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return false
      
      try {
        const url = new URL(href, window.location.href)
        return url.origin !== baseUrl
      } catch {
        return false
      }
    }).length
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server'
    
    let sessionId = sessionStorage.getItem('seo_session_id')
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem('seo_session_id', sessionId)
    }
    return sessionId
  }

  private sendToSEOEndpoint(event: SEOAnalyticsEvent): void {
    // Send to custom SEO tracking endpoint
    fetch('/api/analytics/seo/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        referrer: document.referrer
      })
    }).catch(() => {
      // Silent fail for analytics
    })
  }

  private getEmptyMetrics(url: string): SEOMetrics {
    return {
      pageUrl: url,
      title: '',
      description: '',
      h1Count: 0,
      imageCount: 0,
      imageAltMissing: 0,
      internalLinks: 0,
      externalLinks: 0,
      loadTime: 0,
      coreWebVitals: { lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0 },
      structuredDataPresent: false,
      metaRobotsContent: '',
      hreflangTags: 0,
      errors: [],
      warnings: [],
      seoScore: 0
    }
  }
}

export const seoAnalytics = new SEOAnalytics()

/**
 * React hook for SEO analytics in components
 */
export function useSEOAnalytics() {
  const trackPageView = (pageName: string, customData?: { [key: string]: any }) => {
    seoAnalytics.collectPageSEOMetrics()
  }

  const trackCourseView = (courseId: string, courseName: string, category: string) => {
    seoAnalytics.trackCoursePageSEO(courseId, courseName, category)
  }

  const trackKeywordRanking = (keyword: string, ranking: number, url: string) => {
    seoAnalytics.trackTurkishKeywordPerformance(keyword, ranking, url)
  }

  return {
    trackPageView,
    trackCourseView,
    trackKeywordRanking,
    collectMetrics: seoAnalytics.collectPageSEOMetrics.bind(seoAnalytics)
  }
}

/**
 * SEO Analytics initialization component
 */
export function SEOAnalyticsProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    seoAnalytics.initializeSEOTracking()
    seoAnalytics.trackCrawlEvents()
  }, [])

  return <>{children}</>
}

export type { SEOMetrics, SEOAnalyticsEvent, SearchConsoleData }