# SEO & Meta Optimization - 7P Education Platform

## 📋 Özet

7P Education Platform'un SEO ve Meta Optimization stratejisi, modern Next.js 15 App Router architecture'ını kullanarak search engine visibility'yi maksimize eden, structured data implementation'ı ile zenginleştirilmiş, performance-optimized approach'ı detaylandırır. Bu dokümantasyon, technical SEO, content optimization, social media integration, ve advanced schema markup'ı kapsar.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun amaçları:
- Next.js 15 App Router ile advanced SEO implementation
- Dynamic meta tag generation ve optimization
- Structured data (Schema.org) implementation
- Open Graph ve Twitter Cards integration
- Technical SEO optimization (sitemap, robots.txt, canonical URLs)
- Core Web Vitals optimization for SEO ranking
- Multi-language SEO support ve hreflang implementation
- Local SEO optimization for educational content
- Advanced analytics ve SEO monitoring setup

## 🏗️ Mevcut Durum Analizi

### ✅ Aktif SEO Bileşenleri
- **Next.js Metadata API**: Built-in meta tag management
- **Dynamic Route Generation**: Automatic page creation
- **Image Optimization**: Next.js Image component with SEO benefits
- **Core Web Vitals**: Performance optimization infrastructure
- **HTTPS**: Secure connection requirement

### ⚠️ Geliştirilmesi Gereken Alanlar
- Advanced structured data implementation
- Comprehensive sitemap generation
- Social media optimization
- Multi-language hreflang setup
- Local SEO optimization
- Advanced analytics integration
- Content optimization automation
- Technical SEO monitoring

## 🔧 Teknik Detaylar

### 🔍 Next.js 15 SEO Architecture

#### 1. Dynamic Metadata Generation System
```typescript
// lib/seo/metadata-generator.ts
import type { Metadata, ResolvingMetadata } from 'next'
import type { Course, User, Category } from '@/types'

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

class MetadataGenerator {
  private readonly baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://7peducation.com'
  private readonly siteName = '7P Education Platform'
  private readonly defaultImage = '/images/og-default.jpg'
  private readonly twitterHandle = '@7peducation'

  // Generate comprehensive metadata for courses
  async generateCourseMetadata(
    course: Course,
    params: { slug: string },
    parent: ResolvingMetadata
  ): Promise<Metadata> {
    const parentMetadata = await parent
    const courseUrl = `${this.baseUrl}/courses/${course.slug}`
    
    // Generate rich description
    const description = this.truncateDescription(
      course.description || course.short_description || '',
      160
    )

    // Extract keywords from course content
    const keywords = this.extractKeywords([
      course.title,
      course.category?.name || '',
      ...(course.tags || []),
      course.level,
      'online course',
      'education',
      '7p education'
    ])

    const metadata: Metadata = {
      title: {
        default: course.title,
        template: `%s | ${course.category?.name} | ${this.siteName}`
      },
      description,
      keywords: keywords.join(', '),
      authors: [{ 
        name: course.instructor?.full_name || 'Instructor',
        url: `/instructors/${course.instructor?.id}`
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
          'tr': courseUrl,
          'en': `${courseUrl}?lang=en`
        }
      },
      openGraph: {
        title: course.title,
        description,
        url: courseUrl,
        siteName: this.siteName,
        locale: 'tr_TR',
        type: 'article',
        section: 'Education',
        tags: course.tags || [],
        publishedTime: course.published_at,
        modifiedTime: course.updated_at,
        authors: [course.instructor?.full_name || ''],
        images: [
          {
            url: course.thumbnail_url || this.defaultImage,
            width: 1200,
            height: 630,
            alt: course.title,
          },
          {
            url: course.cover_image_url || course.thumbnail_url || this.defaultImage,
            width: 1920,
            height: 1080,
            alt: `${course.title} - Course Cover`,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        site: this.twitterHandle,
        creator: `@${course.instructor?.username || '7peducation'}`,
        title: course.title,
        description,
        images: [course.thumbnail_url || this.defaultImage],
      },
      robots: {
        index: course.status === 'published',
        follow: course.status === 'published',
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
      }
    }

    return metadata
  }

  // Generate metadata for course categories
  async generateCategoryMetadata(
    category: Category,
    params: { slug: string }
  ): Promise<Metadata> {
    const categoryUrl = `${this.baseUrl}/courses/category/${category.slug}`
    
    const description = `Discover ${category.name.toLowerCase()} courses on 7P Education Platform. Professional development courses with expert instructors and hands-on projects.`
    
    const keywords = this.extractKeywords([
      category.name,
      'online courses',
      'professional development',
      'education',
      'learning',
      '7p education',
      'certification'
    ])

    return {
      title: `${category.name} Courses | ${this.siteName}`,
      description,
      keywords: keywords.join(', '),
      metadataBase: new URL(this.baseUrl),
      alternates: {
        canonical: categoryUrl,
      },
      openGraph: {
        title: `${category.name} Courses`,
        description,
        url: categoryUrl,
        siteName: this.siteName,
        type: 'website',
        images: [
          {
            url: category.image_url || this.defaultImage,
            width: 1200,
            height: 630,
            alt: `${category.name} Courses`,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        site: this.twitterHandle,
        title: `${category.name} Courses`,
        description,
        images: [category.image_url || this.defaultImage],
      }
    }
  }

  // Generate metadata for instructor profiles
  async generateInstructorMetadata(instructor: User): Promise<Metadata> {
    const instructorUrl = `${this.baseUrl}/instructors/${instructor.id}`
    
    const description = `Learn from ${instructor.full_name}, professional instructor at 7P Education Platform. View courses, expertise, and student reviews.`
    
    const keywords = this.extractKeywords([
      instructor.full_name,
      'instructor',
      'teacher',
      'online education',
      'professional development',
      '7p education'
    ])

    return {
      title: `${instructor.full_name} - Instructor | ${this.siteName}`,
      description,
      keywords: keywords.join(', '),
      metadataBase: new URL(this.baseUrl),
      alternates: {
        canonical: instructorUrl,
      },
      openGraph: {
        title: `${instructor.full_name} - Professional Instructor`,
        description,
        url: instructorUrl,
        siteName: this.siteName,
        type: 'profile',
        images: [
          {
            url: instructor.avatar_url || '/images/default-avatar.jpg',
            width: 400,
            height: 400,
            alt: instructor.full_name,
          }
        ],
      },
      twitter: {
        card: 'summary',
        site: this.twitterHandle,
        title: `${instructor.full_name} - Instructor`,
        description,
        images: [instructor.avatar_url || '/images/default-avatar.jpg'],
      }
    }
  }

  // Utility methods
  private truncateDescription(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...'
  }

  private extractKeywords(sources: string[]): string[] {
    const keywords = new Set<string>()
    
    sources.forEach(source => {
      if (!source) return
      
      // Extract meaningful words (3+ characters)
      const words = source
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 3)
      
      words.forEach(word => keywords.add(word))
    })
    
    return Array.from(keywords).slice(0, 15) // Limit to 15 keywords
  }
}

export const metadataGenerator = new MetadataGenerator()

// App Router metadata implementation
// app/courses/[slug]/page.tsx
export async function generateMetadata(
  { params }: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  try {
    const course = await getCourse(params.slug)
    
    if (!course) {
      return {
        title: 'Course Not Found',
        description: 'The requested course could not be found.',
      }
    }
    
    return await metadataGenerator.generateCourseMetadata(course, params, parent)
  } catch (error) {
    console.error('Failed to generate course metadata:', error)
    
    return {
      title: 'Course | 7P Education',
      description: 'Professional online courses for career development.',
    }
  }
}
```

#### 2. Structured Data Implementation
```typescript
// lib/seo/structured-data.ts
interface StructuredDataConfig {
  type: 'Course' | 'Person' | 'Organization' | 'WebSite' | 'BreadcrumbList' | 'Article'
  data: any
}

class StructuredDataGenerator {
  private readonly baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://7peducation.com'
  private readonly organizationData = {
    "@type": "Organization",
    "@id": `${this.baseUrl}#organization`,
    "name": "7P Education Platform",
    "url": this.baseUrl,
    "logo": `${this.baseUrl}/images/logo.png`,
    "sameAs": [
      "https://twitter.com/7peducation",
      "https://linkedin.com/company/7peducation",
      "https://facebook.com/7peducation"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+90-212-555-0123",
      "contactType": "Customer Service",
      "availableLanguage": ["Turkish", "English"]
    }
  }

  generateCourseStructuredData(course: Course): object {
    const courseData = {
      "@context": "https://schema.org",
      "@type": "Course",
      "@id": `${this.baseUrl}/courses/${course.slug}`,
      "name": course.title,
      "description": course.description || course.short_description,
      "provider": this.organizationData,
      "image": course.thumbnail_url || `${this.baseUrl}/images/default-course.jpg`,
      "url": `${this.baseUrl}/courses/${course.slug}`,
      "courseCode": course.id,
      "educationalLevel": this.mapCourseLevel(course.level),
      "inLanguage": "tr-TR",
      "availableLanguage": ["tr", "en"],
      "teaches": course.learning_objectives || [],
      "coursePrerequisites": course.prerequisites || [],
      "timeRequired": `PT${Math.floor((course.duration_minutes || 0) / 60)}H${(course.duration_minutes || 0) % 60}M`,
      "numberOfCredits": this.calculateCredits(course.duration_minutes || 0),
      "educationalCredentialAwarded": "Certificate of Completion",
      "instructor": {
        "@type": "Person",
        "@id": `${this.baseUrl}/instructors/${course.instructor?.id}`,
        "name": course.instructor?.full_name,
        "image": course.instructor?.avatar_url,
        "url": `${this.baseUrl}/instructors/${course.instructor?.id}`,
        "jobTitle": "Professional Instructor",
        "worksFor": this.organizationData
      },
      "aggregateRating": course.average_rating ? {
        "@type": "AggregateRating",
        "ratingValue": course.average_rating,
        "reviewCount": course.review_count || 0,
        "bestRating": 5,
        "worstRating": 1
      } : undefined,
      "offers": {
        "@type": "Offer",
        "price": course.pricing?.amount || 0,
        "priceCurrency": course.pricing?.currency || "TRY",
        "availability": "https://schema.org/InStock",
        "validFrom": course.published_at,
        "seller": this.organizationData,
        "category": course.category?.name
      },
      "isAccessibleForFree": (course.pricing?.amount || 0) === 0,
      "learningResourceType": "Course",
      "educationalAlignment": {
        "@type": "AlignmentObject",
        "alignmentType": "teaches",
        "targetName": course.category?.name
      },
      "datePublished": course.published_at,
      "dateModified": course.updated_at,
      "keywords": course.tags?.join(', ') || course.category?.name
    }

    // Remove undefined properties
    return JSON.parse(JSON.stringify(courseData))
  }

  generateInstructorStructuredData(instructor: User, courses: Course[] = []): object {
    const instructorData = {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${this.baseUrl}/instructors/${instructor.id}`,
      "name": instructor.full_name,
      "image": instructor.avatar_url,
      "url": `${this.baseUrl}/instructors/${instructor.id}`,
      "jobTitle": "Professional Instructor",
      "worksFor": this.organizationData,
      "alumniOf": instructor.education || undefined,
      "knowsAbout": courses.map(course => course.category?.name).filter(Boolean),
      "teaches": courses.map(course => ({
        "@type": "Course",
        "@id": `${this.baseUrl}/courses/${course.slug}`,
        "name": course.title,
        "url": `${this.baseUrl}/courses/${course.slug}`
      })),
      "sameAs": [
        instructor.linkedin_url,
        instructor.twitter_url,
        instructor.github_url
      ].filter(Boolean)
    }

    return JSON.parse(JSON.stringify(instructorData))
  }

  generateBreadcrumbStructuredData(items: BreadcrumbItem[]): object {
    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": `${this.baseUrl}${item.url}`
      }))
    }

    return breadcrumbData
  }

  generateWebSiteStructuredData(): object {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${this.baseUrl}#website`,
      "url": this.baseUrl,
      "name": "7P Education Platform",
      "description": "Professional online education platform for career development and skill enhancement",
      "publisher": this.organizationData,
      "inLanguage": "tr-TR",
      "potentialAction": [
        {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${this.baseUrl}/search?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      ]
    }
  }

  generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>): object {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    }
  }

  // Utility methods
  private mapCourseLevel(level: string): string {
    const levelMap: { [key: string]: string } = {
      'beginner': 'https://schema.org/Beginner',
      'intermediate': 'https://schema.org/Intermediate',
      'advanced': 'https://schema.org/Advanced',
      'expert': 'https://schema.org/Expert'
    }
    return levelMap[level] || 'https://schema.org/Beginner'
  }

  private calculateCredits(minutes: number): number {
    // Rough calculation: 1 credit per 15 hours of content
    return Math.round(minutes / (15 * 60))
  }
}

export const structuredDataGenerator = new StructuredDataGenerator()

// React component for structured data injection
interface StructuredDataProps {
  data: object
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 2)
      }}
    />
  )
}

// Hook for multiple structured data
export function useStructuredData(items: StructuredDataConfig[]) {
  return (
    <>
      {items.map((item, index) => (
        <StructuredData 
          key={`${item.type}-${index}`} 
          data={item.data} 
        />
      ))}
    </>
  )
}
```

#### 3. Advanced Sitemap Generation
```typescript
// lib/seo/sitemap-generator.ts
interface SitemapUrl {
  url: string
  lastModified?: Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

class SitemapGenerator {
  private readonly baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://7peducation.com'
  private readonly maxUrlsPerSitemap = 50000

  async generateMainSitemap(): Promise<string> {
    const staticUrls: SitemapUrl[] = [
      {
        url: '/',
        changeFrequency: 'daily',
        priority: 1.0,
        lastModified: new Date()
      },
      {
        url: '/courses',
        changeFrequency: 'daily',
        priority: 0.9,
        lastModified: new Date()
      },
      {
        url: '/categories',
        changeFrequency: 'weekly',
        priority: 0.8,
        lastModified: new Date()
      },
      {
        url: '/instructors',
        changeFrequency: 'weekly',
        priority: 0.7,
        lastModified: new Date()
      },
      {
        url: '/about',
        changeFrequency: 'monthly',
        priority: 0.6,
        lastModified: new Date()
      },
      {
        url: '/contact',
        changeFrequency: 'monthly',
        priority: 0.5,
        lastModified: new Date()
      }
    ]

    return this.generateSitemapXml(staticUrls)
  }

  async generateCoursesSitemap(): Promise<string> {
    try {
      const courses = await this.getAllPublishedCourses()
      
      const courseUrls: SitemapUrl[] = courses.map(course => ({
        url: `/courses/${course.slug}`,
        lastModified: new Date(course.updated_at),
        changeFrequency: 'weekly',
        priority: 0.8
      }))

      return this.generateSitemapXml(courseUrls)
    } catch (error) {
      console.error('Failed to generate courses sitemap:', error)
      return this.generateSitemapXml([])
    }
  }

  async generateCategoriesSitemap(): Promise<string> {
    try {
      const categories = await this.getAllCategories()
      
      const categoryUrls: SitemapUrl[] = categories.map(category => ({
        url: `/courses/category/${category.slug}`,
        lastModified: new Date(category.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7
      }))

      return this.generateSitemapXml(categoryUrls)
    } catch (error) {
      console.error('Failed to generate categories sitemap:', error)
      return this.generateSitemapXml([])
    }
  }

  async generateInstructorsSitemap(): Promise<string> {
    try {
      const instructors = await this.getAllInstructors()
      
      const instructorUrls: SitemapUrl[] = instructors.map(instructor => ({
        url: `/instructors/${instructor.id}`,
        lastModified: new Date(instructor.updated_at),
        changeFrequency: 'monthly',
        priority: 0.6
      }))

      return this.generateSitemapXml(instructorUrls)
    } catch (error) {
      console.error('Failed to generate instructors sitemap:', error)
      return this.generateSitemapXml([])
    }
  }

  async generateSitemapIndex(): Promise<string> {
    const sitemaps = [
      {
        url: `${this.baseUrl}/sitemap-main.xml`,
        lastModified: new Date()
      },
      {
        url: `${this.baseUrl}/sitemap-courses.xml`,
        lastModified: new Date()
      },
      {
        url: `${this.baseUrl}/sitemap-categories.xml`,
        lastModified: new Date()
      },
      {
        url: `${this.baseUrl}/sitemap-instructors.xml`,
        lastModified: new Date()
      }
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${sitemap.url}</loc>
    <lastmod>${sitemap.lastModified.toISOString()}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`

    return xml
  }

  private generateSitemapXml(urls: SitemapUrl[]): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${this.baseUrl}${url.url}</loc>
    ${url.lastModified ? `<lastmod>${url.lastModified.toISOString()}</lastmod>` : ''}
    ${url.changeFrequency ? `<changefreq>${url.changeFrequency}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority.toFixed(1)}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`

    return xml
  }

  // Data fetching methods (these would integrate with your actual data layer)
  private async getAllPublishedCourses(): Promise<Course[]> {
    // Implementation would fetch from Supabase
    const { data: courses } = await supabase
      .from('courses')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
    
    return courses || []
  }

  private async getAllCategories(): Promise<Category[]> {
    const { data: categories } = await supabase
      .from('categories')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
    
    return categories || []
  }

  private async getAllInstructors(): Promise<User[]> {
    const { data: instructors } = await supabase
      .from('user_profiles')
      .select('id, updated_at')
      .eq('role', 'instructor')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
    
    return instructors || []
  }
}

export const sitemapGenerator = new SitemapGenerator()

// Next.js App Router sitemap implementation
// app/sitemap.xml/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const sitemapIndex = await sitemapGenerator.generateSitemapIndex()
    
    return new NextResponse(sitemapIndex, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour
      },
    })
  } catch (error) {
    console.error('Failed to generate sitemap index:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}

// app/sitemap-courses.xml/route.ts
export async function GET() {
  try {
    const coursesSitemap = await sitemapGenerator.generateCoursesSitemap()
    
    return new NextResponse(coursesSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Failed to generate courses sitemap:', error)
    return new NextResponse('Error generating courses sitemap', { status: 500 })
  }
}
```

#### 4. SEO Monitoring and Analytics
```typescript
// lib/seo/seo-monitor.ts
interface SEOMetrics {
  url: string
  title: string
  description: string
  h1Count: number
  h2Count: number
  imageCount: number
  imageAltMissing: number
  internalLinks: number
  externalLinks: number
  pageSize: number
  loadTime: number
  coreWebVitals: {
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
  }
  structuredDataPresent: boolean
  metaRobotsContent: string
  canonicalUrl?: string
  errors: string[]
  warnings: string[]
}

interface SEOAuditResult {
  score: number
  metrics: SEOMetrics
  recommendations: SEORecommendation[]
}

interface SEORecommendation {
  type: 'error' | 'warning' | 'info'
  message: string
  impact: 'high' | 'medium' | 'low'
  fix?: string
}

class SEOMonitor {
  private readonly maxTitleLength = 60
  private readonly maxDescriptionLength = 160
  private readonly minDescriptionLength = 50

  async auditPage(url: string): Promise<SEOAuditResult> {
    try {
      const metrics = await this.collectPageMetrics(url)
      const recommendations = this.generateRecommendations(metrics)
      const score = this.calculateSEOScore(metrics, recommendations)

      return {
        score,
        metrics,
        recommendations
      }
    } catch (error) {
      console.error('SEO audit failed:', error)
      throw new Error(`Failed to audit page: ${url}`)
    }
  }

  private async collectPageMetrics(url: string): Promise<SEOMetrics> {
    // This would typically run in a headless browser environment
    const response = await fetch(url)
    const html = await response.text()
    
    // Parse HTML using a library like Cheerio or similar
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    const metrics: SEOMetrics = {
      url,
      title: doc.title || '',
      description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      h1Count: doc.querySelectorAll('h1').length,
      h2Count: doc.querySelectorAll('h2').length,
      imageCount: doc.querySelectorAll('img').length,
      imageAltMissing: doc.querySelectorAll('img:not([alt])').length,
      internalLinks: this.countInternalLinks(doc, url),
      externalLinks: this.countExternalLinks(doc, url),
      pageSize: html.length,
      loadTime: 0, // Would be measured using Performance API
      coreWebVitals: {
        lcp: 0, // Would be measured using Web Vitals library
        fid: 0,
        cls: 0
      },
      structuredDataPresent: doc.querySelector('script[type="application/ld+json"]') !== null,
      metaRobotsContent: doc.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index,follow',
      canonicalUrl: doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      errors: [],
      warnings: []
    }

    return metrics
  }

  private generateRecommendations(metrics: SEOMetrics): SEORecommendation[] {
    const recommendations: SEORecommendation[] = []

    // Title optimization
    if (!metrics.title) {
      recommendations.push({
        type: 'error',
        message: 'Page is missing a title tag',
        impact: 'high',
        fix: 'Add a descriptive title tag to the page'
      })
    } else if (metrics.title.length > this.maxTitleLength) {
      recommendations.push({
        type: 'warning',
        message: `Title is too long (${metrics.title.length} chars). Optimal length is under ${this.maxTitleLength} characters`,
        impact: 'medium',
        fix: 'Shorten the title while keeping it descriptive'
      })
    } else if (metrics.title.length < 20) {
      recommendations.push({
        type: 'warning',
        message: 'Title is too short. Consider making it more descriptive',
        impact: 'medium',
        fix: 'Expand the title with relevant keywords'
      })
    }

    // Description optimization
    if (!metrics.description) {
      recommendations.push({
        type: 'error',
        message: 'Page is missing a meta description',
        impact: 'high',
        fix: 'Add a compelling meta description that summarizes the page content'
      })
    } else if (metrics.description.length > this.maxDescriptionLength) {
      recommendations.push({
        type: 'warning',
        message: `Meta description is too long (${metrics.description.length} chars)`,
        impact: 'medium',
        fix: `Keep meta description under ${this.maxDescriptionLength} characters`
      })
    } else if (metrics.description.length < this.minDescriptionLength) {
      recommendations.push({
        type: 'warning',
        message: 'Meta description is too short',
        impact: 'medium',
        fix: `Expand meta description to at least ${this.minDescriptionLength} characters`
      })
    }

    // Heading structure
    if (metrics.h1Count === 0) {
      recommendations.push({
        type: 'error',
        message: 'Page is missing an H1 tag',
        impact: 'high',
        fix: 'Add a single, descriptive H1 tag that summarizes the page content'
      })
    } else if (metrics.h1Count > 1) {
      recommendations.push({
        type: 'warning',
        message: `Page has multiple H1 tags (${metrics.h1Count})`,
        impact: 'medium',
        fix: 'Use only one H1 tag per page and use H2-H6 for subheadings'
      })
    }

    // Image optimization
    if (metrics.imageAltMissing > 0) {
      recommendations.push({
        type: 'warning',
        message: `${metrics.imageAltMissing} images are missing alt attributes`,
        impact: 'medium',
        fix: 'Add descriptive alt attributes to all images for accessibility and SEO'
      })
    }

    // Structured data
    if (!metrics.structuredDataPresent) {
      recommendations.push({
        type: 'info',
        message: 'Page lacks structured data markup',
        impact: 'low',
        fix: 'Add relevant Schema.org structured data to enhance search results'
      })
    }

    // Core Web Vitals
    if (metrics.coreWebVitals.lcp > 2500) {
      recommendations.push({
        type: 'error',
        message: `Largest Contentful Paint is slow (${metrics.coreWebVitals.lcp}ms)`,
        impact: 'high',
        fix: 'Optimize images, reduce server response time, and eliminate render-blocking resources'
      })
    }

    if (metrics.coreWebVitals.cls > 0.1) {
      recommendations.push({
        type: 'warning',
        message: `Cumulative Layout Shift is too high (${metrics.coreWebVitals.cls})`,
        impact: 'medium',
        fix: 'Add size attributes to images and reserve space for dynamic content'
      })
    }

    // Canonical URL
    if (!metrics.canonicalUrl) {
      recommendations.push({
        type: 'warning',
        message: 'Page lacks a canonical URL',
        impact: 'medium',
        fix: 'Add a canonical link tag to prevent duplicate content issues'
      })
    }

    return recommendations
  }

  private calculateSEOScore(metrics: SEOMetrics, recommendations: SEORecommendation[]): number {
    let score = 100

    // Deduct points based on issues
    recommendations.forEach(rec => {
      switch (rec.impact) {
        case 'high':
          score -= rec.type === 'error' ? 20 : 15
          break
        case 'medium':
          score -= rec.type === 'error' ? 10 : 7
          break
        case 'low':
          score -= rec.type === 'error' ? 5 : 3
          break
      }
    })

    // Bonus points for good practices
    if (metrics.structuredDataPresent) score += 5
    if (metrics.h1Count === 1) score += 3
    if (metrics.imageAltMissing === 0 && metrics.imageCount > 0) score += 3
    if (metrics.canonicalUrl) score += 2

    return Math.max(0, Math.min(100, score))
  }

  private countInternalLinks(doc: Document, currentUrl: string): number {
    const links = Array.from(doc.querySelectorAll('a[href]'))
    const baseUrl = new URL(currentUrl).origin
    
    return links.filter(link => {
      const href = link.getAttribute('href')
      if (!href) return false
      
      try {
        const url = new URL(href, currentUrl)
        return url.origin === baseUrl
      } catch {
        return false
      }
    }).length
  }

  private countExternalLinks(doc: Document, currentUrl: string): number {
    const links = Array.from(doc.querySelectorAll('a[href]'))
    const baseUrl = new URL(currentUrl).origin
    
    return links.filter(link => {
      const href = link.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return false
      }
      
      try {
        const url = new URL(href, currentUrl)
        return url.origin !== baseUrl
      } catch {
        return false
      }
    }).length
  }

  // Batch audit multiple pages
  async auditWebsite(urls: string[]): Promise<{ [url: string]: SEOAuditResult }> {
    const results: { [url: string]: SEOAuditResult } = {}
    
    // Process URLs in batches to avoid overwhelming the server
    const batchSize = 5
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async url => {
        try {
          const result = await this.auditPage(url)
          results[url] = result
        } catch (error) {
          console.error(`Failed to audit ${url}:`, error)
          results[url] = {
            score: 0,
            metrics: {} as SEOMetrics,
            recommendations: [{
              type: 'error',
              message: 'Failed to audit page',
              impact: 'high'
            }]
          }
        }
      })
      
      await Promise.all(batchPromises)
      
      // Add delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }

  // Generate SEO report
  generateReport(results: { [url: string]: SEOAuditResult }): string {
    const urls = Object.keys(results)
    const averageScore = urls.reduce((sum, url) => sum + results[url].score, 0) / urls.length
    
    let report = `SEO Audit Report - ${new Date().toISOString()}\n`
    report += `${'='.repeat(50)}\n\n`
    report += `Overall Score: ${averageScore.toFixed(1)}/100\n`
    report += `Pages Audited: ${urls.length}\n\n`
    
    urls.forEach(url => {
      const result = results[url]
      report += `${url}\n`
      report += `Score: ${result.score}/100\n`
      report += `Issues: ${result.recommendations.length}\n`
      
      if (result.recommendations.length > 0) {
        report += `Top Issues:\n`
        result.recommendations
          .filter(rec => rec.type === 'error' || rec.impact === 'high')
          .slice(0, 3)
          .forEach(rec => {
            report += `  - ${rec.message}\n`
          })
      }
      
      report += `\n`
    })
    
    return report
  }
}

export const seoMonitor = new SEOMonitor()
```

## 💡 Öneriler ve Best Practices

### 🔍 Technical SEO Best Practices
- **URL Structure**: Clean, descriptive URLs with proper hierarchy
- **Internal Linking**: Strategic internal link distribution for PageRank flow
- **Site Speed**: Core Web Vitals optimization for ranking benefits
- **Mobile-First**: Mobile-optimized content and performance

### 📊 Content Optimization
- **Keyword Research**: Data-driven keyword strategy implementation
- **Content Quality**: E-A-T (Expertise, Authoritativeness, Trustworthiness) focus
- **User Intent Matching**: Content aligned with search intent
- **Regular Updates**: Fresh content signals for search engines

### 🌐 International SEO
- **Hreflang Implementation**: Multi-language site structure
- **Localized Content**: Region-specific content optimization
- **Cultural Adaptation**: Local search behavior understanding
- **Technical Implementation**: Proper subdirectory/subdomain structure

## 📊 Implementation Roadmap

### Phase 1: Technical Foundation (2 weeks)
- [ ] Next.js metadata API implementation
- [ ] Structured data generation system
- [ ] Sitemap automation
- [ ] Basic SEO monitoring setup

### Phase 2: Content Optimization (2 weeks)
- [ ] Dynamic meta tag optimization
- [ ] Schema markup implementation
- [ ] Open Graph ve Twitter Cards
- [ ] Image SEO optimization

### Phase 3: Advanced Features (1 week)
- [ ] Multi-language SEO implementation
- [ ] Advanced analytics integration
- [ ] Performance optimization for SEO
- [ ] Local SEO features

### Phase 4: Monitoring & Optimization (1 week)
- [ ] SEO audit automation
- [ ] Performance tracking dashboard
- [ ] Keyword ranking monitoring
- [ ] Continuous optimization workflows

## 🔗 İlgili Dosyalar

- [Performance Optimization](./performance-optimization.md) - Core Web Vitals optimization
- [CDN Configuration](./cdn-performance-optimization.md) - Global content delivery
- [Analytics Setup](../analytics/web-analytics.md) - SEO metrics tracking
- [Content Management](../cms/content-optimization.md) - Content SEO strategies
- [Social Media Integration](../marketing/social-media.md) - Social signals optimization
- [Schema Markup Guide](../technical/structured-data.md) - Advanced schema implementation

## 📚 Kaynaklar

### 📖 SEO Standards
- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)

### 🛠️ SEO Tools
- [Google Search Console](https://search.google.com/search-console)
- [Core Web Vitals](https://web.dev/vitals/)
- [Structured Data Testing](https://search.google.com/test/rich-results)

### 📊 Analytics & Monitoring
- [Google Analytics 4](https://analytics.google.com/analytics/academy/)
- [SEO Performance Metrics](https://web.dev/seo/)
- [Technical SEO Guide](https://developers.google.com/search/docs/advanced/guidelines/webmaster-guidelines)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*