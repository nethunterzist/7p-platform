/**
 * Turkish SEO Optimization Library
 * Handles Turkish-specific SEO requirements, keywords, and localization
 */

interface TurkishKeywordData {
  primary: string[]
  secondary: string[]
  longTail: string[]
  local: string[]
  seasonal: string[]
}

interface TurkishContentOptimization {
  title: string
  description: string
  keywords: string[]
  hreflang: { [key: string]: string }
  localSignals: {
    region: string
    language: string
    currency: string
    timezone: string
  }
}

class TurkishSEOOptimizer {
  private readonly baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://7peducation.com'
  
  // Comprehensive Turkish keywords for education sector
  private readonly turkishKeywords: TurkishKeywordData = {
    primary: [
      'online kurs',
      '7P eğitim',
      'sertifikalı kurs',
      'uzaktan eğitim',
      'profesyonel gelişim',
      'kariyer geliştirme',
      'online öğrenme',
      'eğitim platformu'
    ],
    secondary: [
      'meslek edindirme kursu',
      'beceri geliştirme',
      'iş becerisi',
      'kişisel gelişim',
      'teknik eğitim',
      'mesleki eğitim',
      'uzaktan öğretim',
      'e-öğrenme',
      'dijital eğitim',
      'online sertifika'
    ],
    longTail: [
      'türkiye\'de en iyi online kurs',
      'sertifikalı online eğitim programları',
      'profesyonel gelişim kursları türkiye',
      'kariyer değişimi için kurslar',
      'evden çalışma becerileri',
      'dijital pazarlama eğitimi türkiye',
      'yazılım geliştirme kursu online',
      'iş hayatında başarı için kurslar'
    ],
    local: [
      'istanbul online kurs',
      'ankara eğitim kursu',
      'izmir profesyonel gelişim',
      'türkiye eğitim platformu',
      'turkish online education',
      'tr online courses'
    ],
    seasonal: [
      'yeni yıl kariyer planları',
      'yaz dönemi kursları',
      'üniversite hazırlık kursları',
      'tatil döneminde öğrenme',
      'okul dönemi ek eğitim'
    ]
  }

  // Turkish character mapping for URL and SEO-friendly slugs
  private readonly turkishCharacterMap: { [key: string]: string } = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'I': 'I',
    'İ': 'I', 'i': 'i',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  }

  // Turkish stop words to exclude from SEO keywords
  private readonly turkishStopWords = [
    'bir', 'bu', 'şu', 've', 'veya', 'ile', 'için', 'gibi', 'kadar', 
    'daha', 'en', 'çok', 'az', 'da', 'de', 'ta', 'te', 'den', 'dan',
    'nin', 'nun', 'nın', 'nün', 'yi', 'yu', 'yı', 'yü', 'ye', 'ya',
    'i', 'ı', 'u', 'ü', 'e', 'a', 'o', 'ö', 'lar', 'ler', 'lik', 'lık',
    'luk', 'lük', 'siz', 'sız', 'suz', 'süz', 'li', 'lı', 'lu', 'lü'
  ]

  /**
   * Generate Turkish-optimized content with proper hreflang
   */
  generateTurkishOptimizedContent(
    title: string,
    description: string,
    category?: string,
    tags?: string[]
  ): TurkishContentOptimization {
    
    // Optimize title for Turkish SEO
    const optimizedTitle = this.optimizeTurkishTitle(title, category)
    
    // Optimize description with Turkish keywords
    const optimizedDescription = this.optimizeTurkishDescription(description, category)
    
    // Generate Turkish SEO keywords
    const keywords = this.generateTurkishKeywords(title, description, category, tags)
    
    // Generate hreflang tags
    const hreflang = this.generateHreflangTags('')
    
    return {
      title: optimizedTitle,
      description: optimizedDescription,
      keywords,
      hreflang,
      localSignals: {
        region: 'TR',
        language: 'tr',
        currency: 'TRY',
        timezone: 'Europe/Istanbul'
      }
    }
  }

  /**
   * Optimize title for Turkish search patterns
   */
  private optimizeTurkishTitle(title: string, category?: string): string {
    let optimizedTitle = title

    // Add category context if available
    if (category) {
      if (!title.toLowerCase().includes(category.toLowerCase())) {
        optimizedTitle = `${title} | ${category} Kursu`
      }
    }

    // Add brand and localization
    if (!optimizedTitle.includes('7P Education')) {
      optimizedTitle += ' | 7P Education'
    }

    // Add Turkish context if missing
    if (!this.containsTurkishKeywords(optimizedTitle)) {
      optimizedTitle = `${optimizedTitle} - Online Kurs`
    }

    // Ensure optimal length (50-60 characters for Turkish)
    if (optimizedTitle.length > 60) {
      optimizedTitle = this.truncateTurkishText(optimizedTitle, 57) + '...'
    }

    return optimizedTitle
  }

  /**
   * Optimize description for Turkish SEO patterns
   */
  private optimizeTurkishDescription(description: string, category?: string): string {
    let optimizedDescription = description

    // Ensure Turkish keywords are present
    const missingKeywords = this.findMissingTurkishKeywords(description, category)
    
    if (missingKeywords.length > 0) {
      const keywordPhrase = missingKeywords.slice(0, 2).join(' ve ')
      optimizedDescription = `${description} ${keywordPhrase} konularında uzman eğitmenlerle öğrenin.`
    }

    // Add call-to-action in Turkish
    if (!optimizedDescription.includes('hemen') && !optimizedDescription.includes('başla')) {
      optimizedDescription += ' Hemen başlayın!'
    }

    // Ensure optimal length (140-160 characters for Turkish)
    if (optimizedDescription.length > 160) {
      optimizedDescription = this.truncateTurkishText(optimizedDescription, 157) + '...'
    }

    return optimizedDescription
  }

  /**
   * Generate comprehensive Turkish keywords
   */
  private generateTurkishKeywords(
    title: string, 
    description: string, 
    category?: string, 
    tags?: string[]
  ): string[] {
    const keywords = new Set<string>()

    // Add primary Turkish keywords
    this.turkishKeywords.primary.forEach(keyword => keywords.add(keyword))

    // Add category-specific keywords
    if (category) {
      keywords.add(`${category} kursu`)
      keywords.add(`online ${category}`)
      keywords.add(`${category} eğitimi`)
    }

    // Extract keywords from title and description
    const extractedKeywords = this.extractTurkishKeywords(title + ' ' + description)
    extractedKeywords.forEach(keyword => keywords.add(keyword))

    // Add tags as keywords
    if (tags) {
      tags.forEach(tag => keywords.add(tag.toLowerCase()))
    }

    // Add secondary keywords based on context
    const contextKeywords = this.getContextualTurkishKeywords(category)
    contextKeywords.forEach(keyword => keywords.add(keyword))

    // Add local keywords
    this.turkishKeywords.local.slice(0, 3).forEach(keyword => keywords.add(keyword))

    // Convert to array and limit to 25 keywords for optimal SEO
    return Array.from(keywords)
      .filter(keyword => keyword.length >= 3)
      .filter(keyword => !this.turkishStopWords.includes(keyword.toLowerCase()))
      .slice(0, 25)
  }

  /**
   * Generate hreflang tags for Turkish localization
   */
  generateHreflangTags(path: string): { [key: string]: string } {
    const fullUrl = `${this.baseUrl}${path}`
    
    return {
      'tr-TR': fullUrl,
      'tr': fullUrl,
      'x-default': fullUrl,
      // Add English variant if available
      'en': `${fullUrl}?lang=en`,
      'en-US': `${fullUrl}?lang=en`
    }
  }

  /**
   * Create SEO-friendly slugs from Turkish text
   */
  createTurkishSlug(text: string): string {
    let slug = text.toLowerCase()
    
    // Replace Turkish characters
    Object.keys(this.turkishCharacterMap).forEach(turkishChar => {
      const latinChar = this.turkishCharacterMap[turkishChar]
      slug = slug.replace(new RegExp(turkishChar, 'g'), latinChar.toLowerCase())
    })

    // Replace spaces and special characters
    slug = slug
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, '')

    return slug
  }

  /**
   * Optimize content for Turkish search intent
   */
  optimizeForTurkishSearchIntent(content: string, intent: 'informational' | 'commercial' | 'navigational'): string {
    let optimizedContent = content

    switch (intent) {
      case 'informational':
        // Add question-answering format
        if (!content.includes('nasıl') && !content.includes('nedir')) {
          optimizedContent = `${content} Bu makalede detayları öğreneceksiniz.`
        }
        break

      case 'commercial':
        // Add commercial keywords and CTA
        const commercialKeywords = ['satın al', 'fiyat', 'indirim', 'kayıt ol']
        if (!commercialKeywords.some(keyword => content.includes(keyword))) {
          optimizedContent = `${content} Uygun fiyatlarla hemen kayıt olun.`
        }
        break

      case 'navigational':
        // Add brand and location information
        if (!content.includes('7P Education')) {
          optimizedContent = `7P Education'da ${content.toLowerCase()}`
        }
        break
    }

    return optimizedContent
  }

  /**
   * Generate local SEO signals for Turkey
   */
  generateLocalSEOSignals(): {
    structuredData: object
    businessInfo: object
  } {
    return {
      structuredData: {
        "@type": "LocalBusiness",
        "@id": `${this.baseUrl}#business`,
        "name": "7P Education Platform",
        "description": "Türkiye'nin önde gelen online eğitim platformu",
        "url": this.baseUrl,
        "areaServed": {
          "@type": "Country",
          "name": "Turkey",
          "sameAs": "https://en.wikipedia.org/wiki/Turkey"
        },
        "availableLanguage": ["Turkish", "English"],
        "currenciesAccepted": "TRY",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "TR",
          "addressRegion": "İstanbul"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 41.0082,
          "longitude": 28.9784
        }
      },
      businessInfo: {
        region: 'TR',
        language: 'tr-TR',
        currency: 'TRY',
        timezone: 'Europe/Istanbul',
        phoneFormat: '+90',
        dateFormat: 'DD.MM.YYYY',
        numberFormat: '1.234,56'
      }
    }
  }

  // Utility methods
  private containsTurkishKeywords(text: string): boolean {
    const lowerText = text.toLowerCase()
    return this.turkishKeywords.primary.some(keyword => lowerText.includes(keyword))
  }

  private findMissingTurkishKeywords(text: string, category?: string): string[] {
    const lowerText = text.toLowerCase()
    const missingKeywords: string[] = []

    // Check for primary keywords
    this.turkishKeywords.primary.forEach(keyword => {
      if (!lowerText.includes(keyword)) {
        missingKeywords.push(keyword)
      }
    })

    // Add category-specific keywords
    if (category) {
      const categoryKeywords = [`${category} kursu`, `online ${category}`]
      categoryKeywords.forEach(keyword => {
        if (!lowerText.includes(keyword)) {
          missingKeywords.push(keyword)
        }
      })
    }

    return missingKeywords.slice(0, 5) // Return top 5 missing keywords
  }

  private extractTurkishKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\wçğıöşüÇĞIİÖŞÜ\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .filter(word => !this.turkishStopWords.includes(word))

    return Array.from(new Set(words))
  }

  private getContextualTurkishKeywords(category?: string): string[] {
    if (!category) return this.turkishKeywords.secondary.slice(0, 5)

    const categoryLower = category.toLowerCase()
    
    // Return category-specific keywords
    if (categoryLower.includes('yazılım') || categoryLower.includes('teknoloji')) {
      return ['yazılım geliştirme', 'programlama', 'teknoloji', 'web tasarım', 'mobil uygulama']
    } else if (categoryLower.includes('pazarlama') || categoryLower.includes('marketing')) {
      return ['dijital pazarlama', 'sosyal medya', 'reklam', 'satış', 'müşteri ilişkileri']
    } else if (categoryLower.includes('tasarım') || categoryLower.includes('design')) {
      return ['grafik tasarım', 'web tasarım', 'ui ux', 'kreatif', 'görsel tasarım']
    }

    return this.turkishKeywords.secondary.slice(0, 5)
  }

  private truncateTurkishText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    // Avoid breaking Turkish words
    return lastSpace > maxLength * 0.8 
      ? truncated.substring(0, lastSpace)
      : truncated
  }
}

export const turkishSEO = new TurkishSEOOptimizer()

/**
 * Turkish SEO utilities for common operations
 */
export class TurkishSEOUtils {
  /**
   * Validate Turkish content for SEO compliance
   */
  static validateTurkishContent(title: string, description: string): {
    isValid: boolean
    warnings: string[]
    suggestions: string[]
  } {
    const warnings: string[] = []
    const suggestions: string[] = []

    // Title validation
    if (title.length < 20) {
      warnings.push('Başlık çok kısa (min 20 karakter)')
      suggestions.push('Başlığa kategori ve marka bilgisi ekleyin')
    }
    if (title.length > 60) {
      warnings.push('Başlık çok uzun (max 60 karakter)')
      suggestions.push('Başlığı kısaltın, önemli kelimeleri koruyun')
    }

    // Description validation
    if (description.length < 50) {
      warnings.push('Açıklama çok kısa (min 50 karakter)')
      suggestions.push('Açıklamaya kurs detayları ve faydaları ekleyin')
    }
    if (description.length > 160) {
      warnings.push('Açıklama çok uzun (max 160 karakter)')
      suggestions.push('Açıklamayı kısaltın, core mesajınızı koruyun')
    }

    // Turkish keyword presence
    const turkishKeywords = ['kurs', 'eğitim', 'öğren', 'sertifika']
    const hasTurkishKeywords = turkishKeywords.some(keyword => 
      title.toLowerCase().includes(keyword) || description.toLowerCase().includes(keyword)
    )

    if (!hasTurkishKeywords) {
      warnings.push('Türkçe anahtar kelime eksik')
      suggestions.push('Başlık ve açıklamaya Türkçe eğitim terimleri ekleyin')
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions
    }
  }

  /**
   * Generate Turkish breadcrumbs
   */
  static generateTurkishBreadcrumbs(path: string): Array<{ name: string; url: string }> {
    const pathSegments = path.split('/').filter(Boolean)
    const breadcrumbs: Array<{ name: string; url: string }> = []

    // Add home
    breadcrumbs.push({ name: 'Ana Sayfa', url: '/' })

    // Map path segments to Turkish names
    const segmentMap: { [key: string]: string } = {
      'courses': 'Kurslar',
      'instructors': 'Eğitmenler',
      'categories': 'Kategoriler',
      'category': 'Kategori',
      'about': 'Hakkımızda',
      'contact': 'İletişim',
      'blog': 'Blog',
      'help': 'Yardım'
    }

    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += '/' + segment
      const displayName = segmentMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      
      breadcrumbs.push({
        name: displayName,
        url: currentPath
      })
    })

    return breadcrumbs
  }
}

export type { TurkishKeywordData, TurkishContentOptimization }