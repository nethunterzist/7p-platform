import { createClient } from '@/utils/supabase/server'
import type { Course, User, Category } from './metadata-generator'

interface SitemapUrl {
  url: string
  lastModified?: Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

interface SitemapConfig {
  maxUrlsPerSitemap: number
  defaultChangeFreq: string
  defaultPriority: number
  baseUrl: string
}

class SitemapGenerator {
  private readonly config: SitemapConfig = {
    maxUrlsPerSitemap: 50000,
    defaultChangeFreq: 'weekly',
    defaultPriority: 0.5,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://7peducation.com'
  }

  /**
   * Generate main sitemap with static pages
   */
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
      },
      {
        url: '/privacy',
        changeFrequency: 'yearly',
        priority: 0.3,
        lastModified: new Date()
      },
      {
        url: '/terms',
        changeFrequency: 'yearly',
        priority: 0.3,
        lastModified: new Date()
      },
      {
        url: '/help',
        changeFrequency: 'monthly',
        priority: 0.4,
        lastModified: new Date()
      },
      {
        url: '/blog',
        changeFrequency: 'daily',
        priority: 0.7,
        lastModified: new Date()
      }
    ]

    return this.generateSitemapXml(staticUrls)
  }

  /**
   * Generate courses sitemap with all published courses
   */
  async generateCoursesSitemap(): Promise<string> {
    try {
      const courses = await this.getAllPublishedCourses()
      
      const courseUrls: SitemapUrl[] = courses.map(course => ({
        url: `/courses/${course.slug}`,
        lastModified: new Date(course.updated_at),
        changeFrequency: 'weekly',
        priority: this.calculateCoursePriority(course)
      }))

      return this.generateSitemapXml(courseUrls)
    } catch (error) {
      console.error('Failed to generate courses sitemap:', error)
      return this.generateSitemapXml([])
    }
  }

  /**
   * Generate categories sitemap
   */
  async generateCategoriesSitemap(): Promise<string> {
    try {
      const categories = await this.getAllCategories()
      
      const categoryUrls: SitemapUrl[] = categories.map(category => ({
        url: `/courses/category/${category.slug}`,
        lastModified: new Date(category.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7
      }))

      // Add category overview pages
      categoryUrls.push({
        url: '/categories',
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8
      })

      return this.generateSitemapXml(categoryUrls)
    } catch (error) {
      console.error('Failed to generate categories sitemap:', error)
      return this.generateSitemapXml([])
    }
  }

  /**
   * Generate instructors sitemap
   */
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

  /**
   * Generate blog posts sitemap (if blog exists)
   */
  async generateBlogSitemap(): Promise<string> {
    try {
      // This would fetch blog posts from your blog system
      const blogPosts = await this.getAllBlogPosts()
      
      const blogUrls: SitemapUrl[] = blogPosts.map(post => ({
        url: `/blog/${post.slug}`,
        lastModified: new Date(post.updated_at),
        changeFrequency: 'monthly',
        priority: 0.6
      }))

      return this.generateSitemapXml(blogUrls)
    } catch (error) {
      console.error('Failed to generate blog sitemap:', error)
      return this.generateSitemapXml([])
    }
  }

  /**
   * Generate search-friendly tag pages sitemap
   */
  async generateTagsSitemap(): Promise<string> {
    try {
      const tags = await this.getAllCourseTags()
      
      const tagUrls: SitemapUrl[] = tags.map(tag => ({
        url: `/courses/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.4
      }))

      return this.generateSitemapXml(tagUrls)
    } catch (error) {
      console.error('Failed to generate tags sitemap:', error)
      return this.generateSitemapXml([])
    }
  }

  /**
   * Generate comprehensive sitemap index
   */
  async generateSitemapIndex(): Promise<string> {
    const sitemaps = [
      {
        url: `${this.config.baseUrl}/sitemap-main.xml`,
        lastModified: new Date()
      },
      {
        url: `${this.config.baseUrl}/sitemap-courses.xml`,
        lastModified: new Date()
      },
      {
        url: `${this.config.baseUrl}/sitemap-categories.xml`,
        lastModified: new Date()
      },
      {
        url: `${this.config.baseUrl}/sitemap-instructors.xml`,
        lastModified: new Date()
      },
      {
        url: `${this.config.baseUrl}/sitemap-blog.xml`,
        lastModified: new Date()
      },
      {
        url: `${this.config.baseUrl}/sitemap-tags.xml`,
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

  /**
   * Generate XML sitemap from URL array
   */
  private generateSitemapXml(urls: SitemapUrl[]): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls.map(url => `  <url>
    <loc>${this.config.baseUrl}${url.url}</loc>
    ${url.lastModified ? `<lastmod>${url.lastModified.toISOString()}</lastmod>` : ''}
    ${url.changeFrequency ? `<changefreq>${url.changeFrequency}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority.toFixed(1)}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`

    return xml
  }

  /**
   * Calculate course priority based on popularity and rating
   */
  private calculateCoursePriority(course: Course): number {
    let priority = 0.5 // Base priority

    // Boost priority for highly rated courses
    if (course.average_rating && course.average_rating >= 4.5) {
      priority += 0.3
    } else if (course.average_rating && course.average_rating >= 4.0) {
      priority += 0.2
    }

    // Boost priority for popular courses (based on review count)
    if (course.review_count && course.review_count >= 100) {
      priority += 0.2
    } else if (course.review_count && course.review_count >= 50) {
      priority += 0.1
    }

    // Boost priority for recently updated courses
    const updatedDate = new Date(course.updated_at)
    const now = new Date()
    const daysSinceUpdate = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceUpdate <= 30) {
      priority += 0.1
    }

    return Math.min(1.0, priority)
  }

  // Data fetching methods that integrate with Supabase
  private async getAllPublishedCourses(): Promise<Course[]> {
    try {
      const supabase = createClient()
      const { data: courses, error } = await supabase
        .from('courses')
        .select(`
          id,
          slug, 
          title,
          updated_at,
          average_rating,
          review_count,
          category:categories(name, slug),
          instructor:users!courses_instructor_id_fkey(id, full_name)
        `)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching courses for sitemap:', error)
        return []
      }

      return courses || []
    } catch (error) {
      console.error('Failed to fetch courses:', error)
      return []
    }
  }

  private async getAllCategories(): Promise<Category[]> {
    try {
      const supabase = createClient()
      const { data: categories, error } = await supabase
        .from('categories')
        .select('slug, name, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching categories for sitemap:', error)
        return []
      }

      return categories || []
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      return []
    }
  }

  private async getAllInstructors(): Promise<User[]> {
    try {
      const supabase = createClient()
      const { data: instructors, error } = await supabase
        .from('users')
        .select('id, full_name, updated_at')
        .eq('role', 'instructor')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching instructors for sitemap:', error)
        return []
      }

      return instructors || []
    } catch (error) {
      console.error('Failed to fetch instructors:', error)
      return []
    }
  }

  private async getAllBlogPosts(): Promise<Array<{ slug: string; updated_at: string }>> {
    // Placeholder for blog posts - implement based on your blog system
    return []
  }

  private async getAllCourseTags(): Promise<string[]> {
    try {
      const supabase = createClient()
      const { data: courses, error } = await supabase
        .from('courses')
        .select('tags')
        .eq('status', 'published')
        .not('tags', 'is', null)
      
      if (error) {
        console.error('Error fetching course tags for sitemap:', error)
        return []
      }

      // Extract and flatten all tags
      const allTags = new Set<string>()
      courses?.forEach(course => {
        if (course.tags && Array.isArray(course.tags)) {
          course.tags.forEach(tag => allTags.add(tag))
        }
      })

      return Array.from(allTags)
    } catch (error) {
      console.error('Failed to fetch course tags:', error)
      return []
    }
  }

  /**
   * Validate sitemap URLs before generation
   */
  private validateUrls(urls: SitemapUrl[]): SitemapUrl[] {
    return urls.filter(url => {
      // Check if URL is valid
      if (!url.url || url.url.length === 0) return false
      
      // Ensure URL starts with /
      if (!url.url.startsWith('/')) return false
      
      // Check priority is within valid range
      if (url.priority !== undefined && (url.priority < 0 || url.priority > 1)) {
        url.priority = Math.max(0, Math.min(1, url.priority))
      }
      
      return true
    })
  }

  /**
   * Split large sitemaps into multiple files if needed
   */
  async generateMultipleSitemaps(urls: SitemapUrl[], prefix: string): Promise<string[]> {
    const validUrls = this.validateUrls(urls)
    
    if (validUrls.length <= this.config.maxUrlsPerSitemap) {
      return [this.generateSitemapXml(validUrls)]
    }

    const sitemaps: string[] = []
    for (let i = 0; i < validUrls.length; i += this.config.maxUrlsPerSitemap) {
      const chunk = validUrls.slice(i, i + this.config.maxUrlsPerSitemap)
      sitemaps.push(this.generateSitemapXml(chunk))
    }

    return sitemaps
  }
}

export const sitemapGenerator = new SitemapGenerator()

/**
 * Utility functions for sitemap management
 */
export class SitemapUtils {
  /**
   * Generate robots.txt content with sitemap references
   */
  static generateRobotsTxt(baseUrl: string): string {
    return `User-agent: *
Allow: /

# Block admin areas
Disallow: /admin
Disallow: /dashboard
Disallow: /api/

# Block search result pages with parameters
Disallow: /*?*

# Block development files
Disallow: /*.json
Disallow: /*.xml
Disallow: /*.txt

# Allow important static files
Allow: /sitemap*.xml
Allow: /.well-known/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay to be respectful
Crawl-delay: 1

# Specific rules for major search engines
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: YandexBot
Allow: /
Crawl-delay: 2`
  }

  /**
   * Generate comprehensive canonical URL rules
   */
  static generateCanonicalRules(baseUrl: string): { [path: string]: string } {
    return {
      '/': baseUrl,
      '/courses': `${baseUrl}/courses`,
      '/categories': `${baseUrl}/categories`,
      '/instructors': `${baseUrl}/instructors`,
      '/about': `${baseUrl}/about`,
      '/contact': `${baseUrl}/contact`,
      '/help': `${baseUrl}/help`,
      '/blog': `${baseUrl}/blog`
    }
  }
}

export type { SitemapUrl, SitemapConfig }