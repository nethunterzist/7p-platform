import { NextResponse } from 'next/server'
import { sitemapGenerator } from '@/lib/seo/sitemap-generator'

export async function GET() {
  try {
    const tagsSitemap = await sitemapGenerator.generateTagsSitemap()
    
    return new NextResponse(tagsSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Failed to generate tags sitemap:', error)
    return new NextResponse('Error generating tags sitemap', { status: 500 })
  }
}