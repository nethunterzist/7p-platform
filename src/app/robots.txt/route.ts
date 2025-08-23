import { NextResponse } from 'next/server'
import { SitemapUtils } from '@/lib/seo/sitemap-generator'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://7peducation.com'
  
  try {
    const robotsTxt = SitemapUtils.generateRobotsTxt(baseUrl)
    
    return new NextResponse(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 24 hours cache
        'CDN-Cache-Control': 'public, max-age=604800', // 7 days on CDN
      },
    })
  } catch (error) {
    console.error('Failed to generate robots.txt:', error)
    return new NextResponse('Error generating robots.txt', { status: 500 })
  }
}