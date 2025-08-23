import type { Metadata, ResolvingMetadata } from 'next'

// Types for different content types
export interface SEOConfig {
  title: string
  description: string
  keywords: string[]
  author?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'course' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  section?: string
  tags?: string[]
  locale?: string
  alternates?: { [key: string]: string }
}

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface Course {
  id: string
  slug: string
  title: string
  description?: string
  short_description?: string
  thumbnail_url?: string
  cover_image_url?: string
  status: string
  published_at?: string
  updated_at: string
  level: string
  duration_minutes?: number
  average_rating?: number
  review_count?: number
  tags?: string[]
  learning_objectives?: string[]
  prerequisites?: string[]
  category?: {
    name: string
    slug: string
  }
  instructor?: {
    id: string
    full_name: string
    username?: string
    avatar_url?: string
  }
  pricing?: {
    amount: number
    currency: string
  }
}

export interface User {
  id: string
  full_name: string
  username?: string
  avatar_url?: string
  bio?: string
  education?: string
  linkedin_url?: string
  twitter_url?: string
  github_url?: string
  updated_at: string
}

export interface Category {
  slug: string
  name: string
  image_url?: string
  updated_at: string
}

class MetadataGenerator {
  private readonly baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://7peducation.com'
  private readonly siteName = '7P Education Platform'
  private readonly defaultImage = '/images/og-default.jpg'
  private readonly twitterHandle = '@7peducation'

  // Core keywords for Turkish market
  private readonly coreKeywords = [
    'online kurs',
    '7P eğitim', 
    'sertifikalı kurs',
    'uzaktan eğitim',
    'profesyonel gelişim',
    'kariyer geliştirme',
    'türkiye eğitim',
    'online öğrenme'
  ]

  /**
   * Generate comprehensive metadata for course pages
   */
  async generateCourseMetadata(
    course: Course,
    params: { slug: string },
    parent: ResolvingMetadata
  ): Promise<Metadata> {
    const parentMetadata = await parent
    const courseUrl = `${this.baseUrl}/courses/${course.slug}`
    
    // Generate SEO-optimized description
    const description = this.truncateDescription(
      course.description || course.short_description || `${course.title} - 7P Education'da profesyonel ${course.category?.name} eğitimi`,
      155
    )

    // Extract and optimize keywords for Turkish market
    const keywords = this.extractKeywords([
      course.title,
      course.category?.name || '',
      ...(course.tags || []),
      course.level,
      ...this.coreKeywords
    ])

    const metadata: Metadata = {
      title: {
        default: course.title,
        template: `%s | ${course.category?.name} | ${this.siteName}`
      },
      description,
      keywords: keywords.join(', '),
      authors: [{ 
        name: course.instructor?.full_name || 'Uzman Eğitmen',
        url: course.instructor ? `/instructors/${course.instructor.id}` : undefined
      }],
      creator: course.instructor?.full_name,
      publisher: this.siteName,
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      metadataBase: new URL(this.baseUrl),
      alternates: {
        canonical: courseUrl,
        languages: {
          'tr-TR': courseUrl,
          'tr': courseUrl,
          'x-default': courseUrl
        }
      },
      openGraph: {
        title: `${course.title} | Online Kurs`,
        description,
        url: courseUrl,
        siteName: this.siteName,
        locale: 'tr_TR',
        type: 'article',
        section: 'Eğitim',
        tags: [...(course.tags || []), ...this.coreKeywords.slice(0, 5)],
        publishedTime: course.published_at,
        modifiedTime: course.updated_at,
        authors: [course.instructor?.full_name || '7P Education'],
        images: [
          {
            url: course.thumbnail_url || this.defaultImage,
            width: 1200,
            height: 630,
            alt: `${course.title} - Online Kurs Kapak Görseli`,
          },
          {
            url: course.cover_image_url || course.thumbnail_url || this.defaultImage,
            width: 1920,
            height: 1080,
            alt: `${course.title} - Detaylı Kurs Görseli`,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        site: this.twitterHandle,
        creator: course.instructor?.username ? `@${course.instructor.username}` : this.twitterHandle,
        title: `${course.title} | Online Kurs`,
        description,
        images: [course.thumbnail_url || this.defaultImage],
      },
      robots: {
        index: course.status === 'published',
        follow: course.status === 'published',
        noarchive: false,
        nosnippet: false,
        noimageindex: false,
        googleBot: {
          index: course.status === 'published',
          follow: course.status === 'published',
          'max-video-preview': 30,
          'max-image-preview': 'large',
          'max-snippet': 160,
        },
      },
      verification: {
        google: process.env.GOOGLE_VERIFICATION,
        bing: process.env.BING_VERIFICATION,
        yandex: process.env.YANDEX_VERIFICATION
      },
      other: {
        'geo.region': 'TR',
        'geo.country': 'Turkey',
        'language': 'Turkish',
        'target-audience': 'professionals, students, career-development',
        'content-language': 'tr'
      }
    }

    return metadata
  }

  /**
   * Generate metadata for course categories
   */
  async generateCategoryMetadata(
    category: Category,
    params: { slug: string }
  ): Promise<Metadata> {
    const categoryUrl = `${this.baseUrl}/courses/category/${category.slug}`
    
    const description = `${category.name} kategorisinde en iyi online kursları keşfedin. 7P Education'da uzman eğitmenler eşliğinde profesyonel gelişim fırsatları.`
    
    const keywords = this.extractKeywords([
      `${category.name} kursu`,
      `${category.name} eğitimi`,
      `online ${category.name}`,
      ...this.coreKeywords
    ])

    return {
      title: `${category.name} Kursları | En İyi Online ${category.name} Eğitimleri | ${this.siteName}`,
      description,
      keywords: keywords.join(', '),
      metadataBase: new URL(this.baseUrl),
      alternates: {
        canonical: categoryUrl,
        languages: {
          'tr-TR': categoryUrl,
          'tr': categoryUrl,
          'x-default': categoryUrl
        }
      },
      openGraph: {
        title: `${category.name} Kursları | Online Eğitim`,
        description,
        url: categoryUrl,
        siteName: this.siteName,
        locale: 'tr_TR',
        type: 'website',
        images: [
          {
            url: category.image_url || this.defaultImage,
            width: 1200,
            height: 630,
            alt: `${category.name} Online Kursları`,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        site: this.twitterHandle,
        title: `${category.name} Kursları`,
        description,
        images: [category.image_url || this.defaultImage],
      },
      other: {
        'geo.region': 'TR',
        'content-language': 'tr',
        'category': category.name
      }
    }
  }

  /**
   * Generate metadata for instructor profiles
   */
  async generateInstructorMetadata(instructor: User): Promise<Metadata> {
    const instructorUrl = `${this.baseUrl}/instructors/${instructor.id}`
    
    const description = `${instructor.full_name} ile 7P Education'da öğrenin. Deneyimli eğitmen profili, verdiği kurslar ve öğrenci yorumlarını inceleyin.`
    
    const keywords = this.extractKeywords([
      instructor.full_name,
      'eğitmen',
      'öğretmen',
      'uzman',
      'online eğitim',
      'profesyonel gelişim',
      ...this.coreKeywords
    ])

    return {
      title: `${instructor.full_name} - Uzman Eğitmen | ${this.siteName}`,
      description,
      keywords: keywords.join(', '),
      metadataBase: new URL(this.baseUrl),
      alternates: {
        canonical: instructorUrl,
        languages: {
          'tr-TR': instructorUrl,
          'tr': instructorUrl,
          'x-default': instructorUrl
        }
      },
      openGraph: {
        title: `${instructor.full_name} - Profesyonel Eğitmen`,
        description,
        url: instructorUrl,
        siteName: this.siteName,
        locale: 'tr_TR',
        type: 'profile',
        images: [
          {
            url: instructor.avatar_url || '/images/default-avatar.jpg',
            width: 400,
            height: 400,
            alt: `${instructor.full_name} - Eğitmen Profili`,
          }
        ],
      },
      twitter: {
        card: 'summary',
        site: this.twitterHandle,
        title: `${instructor.full_name} - Eğitmen`,
        description,
        images: [instructor.avatar_url || '/images/default-avatar.jpg'],
      },
      other: {
        'geo.region': 'TR',
        'content-language': 'tr',
        'profile:username': instructor.username
      }
    }
  }

  /**
   * Generate homepage metadata
   */
  generateHomepageMetadata(): Metadata {
    const description = '7P Education - Türkiye\'nin önde gelen online eğitim platformu. Uzman eğitmenler ile profesyonel gelişim kursları, sertifikalı programlar ve kariyer odaklı eğitimler.'
    
    const keywords = this.extractKeywords([
      ...this.coreKeywords,
      'online eğitim platformu',
      'türkiye eğitim',
      'mesleki gelişim',
      'digital beceriler',
      'sertifika programları'
    ])

    return {
      title: {
        default: 'Online Kurs ve Eğitim Platformu | 7P Education',
        template: `%s | ${this.siteName}`
      },
      description,
      keywords: keywords.join(', '),
      metadataBase: new URL(this.baseUrl),
      alternates: {
        canonical: this.baseUrl,
        languages: {
          'tr-TR': this.baseUrl,
          'tr': this.baseUrl,
          'x-default': this.baseUrl
        }
      },
      openGraph: {
        title: 'Online Kurs ve Eğitim Platformu | 7P Education',
        description,
        url: this.baseUrl,
        siteName: this.siteName,
        locale: 'tr_TR',
        type: 'website',
        images: [
          {
            url: this.defaultImage,
            width: 1200,
            height: 630,
            alt: '7P Education - Online Eğitim Platformu',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        site: this.twitterHandle,
        title: '7P Education - Online Eğitim Platformu',
        description,
        images: [this.defaultImage],
      },
      verification: {
        google: process.env.GOOGLE_VERIFICATION,
        bing: process.env.BING_VERIFICATION,
        yandex: process.env.YANDEX_VERIFICATION
      },
      other: {
        'geo.region': 'TR',
        'geo.country': 'Turkey',
        'geo.placename': 'Turkey',
        'language': 'Turkish',
        'content-language': 'tr',
        'target-audience': 'professionals, students, career-development',
        'classification': 'education, online learning, professional development'
      }
    }
  }

  /**
   * Utility method to truncate description to optimal length
   */
  private truncateDescription(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...'
  }

  /**
   * Extract and optimize keywords for Turkish SEO
   */
  private extractKeywords(sources: string[]): string[] {
    const keywords = new Set<string>()
    
    sources.forEach(source => {
      if (!source) return
      
      // Extract meaningful words (3+ characters), Turkish character friendly
      const words = source
        .toLowerCase()
        .replace(/[^\wçğıöşüÇĞIİÖŞÜ\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 3)
        .filter(word => !this.isStopWord(word))
      
      words.forEach(word => keywords.add(word))
    })
    
    // Prioritize Turkish keywords and limit to 20 for optimal SEO
    const keywordArray = Array.from(keywords)
    const turkishKeywords = keywordArray.filter(k => this.coreKeywords.some(ck => ck.includes(k)))
    const otherKeywords = keywordArray.filter(k => !turkishKeywords.includes(k))
    
    return [...turkishKeywords, ...otherKeywords].slice(0, 20)
  }

  /**
   * Turkish stop words filter
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'bir', 'bu', 'da', 'de', 'den', 'der', 'ile', 'in', 've', 'ya', 'da',
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
    ]
    return stopWords.includes(word.toLowerCase())
  }
}

export const metadataGenerator = new MetadataGenerator()

/**
 * Higher-order function for generating metadata in App Router pages
 */
export function createMetadataGenerator<T extends Record<string, any>>(
  generator: (data: T, params: any, parent: ResolvingMetadata) => Promise<Metadata>
) {
  return async function generateMetadata(
    { params }: { params: any },
    parent: ResolvingMetadata
  ): Promise<Metadata> {
    try {
      // This would be replaced with actual data fetching
      const data = {} as T
      return await generator(data, params, parent)
    } catch (error) {
      console.error('Failed to generate metadata:', error)
      
      return {
        title: 'Sayfa | 7P Education',
        description: 'Profesyonel online kurslar ile kariyer gelişiminizi destekleyin.',
      }
    }
  }
}