import { NextResponse } from 'next/server'
import { sitemapGenerator } from '@/lib/seo/sitemap-generator'

export async function GET() {
  try {
    const blogSitemap = await sitemapGenerator.generateBlogSitemap()
    
    return new NextResponse(blogSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Failed to generate blog sitemap:', error)
    return new NextResponse('Error generating blog sitemap', { status: 500 })
  }
}