import { NextResponse } from 'next/server'
import { sitemapGenerator } from '@/lib/seo/sitemap-generator'

export async function GET() {
  try {
    const categoriesSitemap = await sitemapGenerator.generateCategoriesSitemap()
    
    return new NextResponse(categoriesSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Failed to generate categories sitemap:', error)
    return new NextResponse('Error generating categories sitemap', { status: 500 })
  }
}