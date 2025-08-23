import { NextResponse } from 'next/server'
import { sitemapGenerator } from '@/lib/seo/sitemap-generator'

export async function GET() {
  try {
    const sitemapIndex = await sitemapGenerator.generateSitemapIndex()
    
    return new NextResponse(sitemapIndex, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour cache
        'CDN-Cache-Control': 'public, max-age=86400', // 24 hours on CDN
      },
    })
  } catch (error) {
    console.error('Failed to generate sitemap index:', error)
    return new NextResponse('Error generating sitemap index', { status: 500 })
  }
}