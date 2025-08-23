import { NextResponse } from 'next/server'
import { sitemapGenerator } from '@/lib/seo/sitemap-generator'

export async function GET() {
  try {
    const coursesSitemap = await sitemapGenerator.generateCoursesSitemap()
    
    return new NextResponse(coursesSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800', // 30 minutes - courses update more frequently
        'CDN-Cache-Control': 'public, max-age=3600', // 1 hour on CDN
      },
    })
  } catch (error) {
    console.error('Failed to generate courses sitemap:', error)
    return new NextResponse('Error generating courses sitemap', { status: 500 })
  }
}