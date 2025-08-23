import { NextResponse } from 'next/server'
import { sitemapGenerator } from '@/lib/seo/sitemap-generator'

export async function GET() {
  try {
    const instructorsSitemap = await sitemapGenerator.generateInstructorsSitemap()
    
    return new NextResponse(instructorsSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=7200, s-maxage=7200', // 2 hours - instructors change less frequently
        'CDN-Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Failed to generate instructors sitemap:', error)
    return new NextResponse('Error generating instructors sitemap', { status: 500 })
  }
}