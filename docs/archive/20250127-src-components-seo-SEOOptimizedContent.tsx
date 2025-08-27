'use client'

import React from 'react'
import Image from 'next/image'
import { StructuredData, StructuredDataCombinations } from '@/lib/seo/structured-data'
import { useSEOAnalytics } from '@/lib/seo/seo-analytics'
import { TurkishSEOUtils } from '@/lib/seo/turkish-seo'

interface SEOOptimizedContentProps {
  children: React.ReactNode
  pageType: 'homepage' | 'course' | 'category' | 'instructor' | 'blog' | 'generic'
  title: string
  description: string
  breadcrumbs?: Array<{ name: string; url: string }>
  structuredData?: any[]
  className?: string
}

/**
 * SEO-optimized content wrapper with semantic HTML structure
 */
export function SEOOptimizedContent({
  children,
  pageType,
  title,
  description,
  breadcrumbs = [],
  structuredData = [],
  className = ''
}: SEOOptimizedContentProps) {
  const { trackPageView } = useSEOAnalytics()

  React.useEffect(() => {
    trackPageView(pageType, { title, description })
  }, [pageType, title, description, trackPageView])

  return (
    <>
      {/* Structured Data */}
      {structuredData.map((data, index) => (
        <StructuredData
          key={`structured-data-${index}`}
          id={`structured-data-${pageType}-${index}`}
          data={data}
        />
      ))}

      {/* Main Content with Semantic HTML */}
      <main 
        className={`seo-optimized-content ${className}`}
        role="main"
        itemScope
        itemType="https://schema.org/WebPage"
      >
        {/* Breadcrumb Navigation */}
        {breadcrumbs.length > 0 && (
          <SEOBreadcrumbs breadcrumbs={breadcrumbs} />
        )}

        {/* Page Header */}
        <header className="page-header" itemProp="headline">
          <SEOHeading level={1} text={title} />
          {description && (
            <p className="page-description" itemProp="description">
              {description}
            </p>
          )}
        </header>

        {/* Page Content */}
        <section className="page-content" itemProp="mainContentOfPage">
          {children}
        </section>
      </main>
    </>
  )
}

interface SEOHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  id?: string
  className?: string
  itemProp?: string
}

/**
 * SEO-optimized heading component with proper hierarchy
 */
export function SEOHeading({ 
  level, 
  text, 
  id, 
  className = '', 
  itemProp 
}: SEOHeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  const headingId = id || text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return (
    <Tag
      id={headingId}
      className={`seo-heading seo-heading--h${level} ${className}`}
      itemProp={itemProp}
    >
      {text}
    </Tag>
  )
}

interface SEOImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  sizes?: string
  quality?: number
  title?: string
  loading?: 'lazy' | 'eager'
}

/**
 * SEO-optimized image component with proper alt text and structured data
 */
export function SEOImage({
  src,
  alt,
  width = 800,
  height = 600,
  className = '',
  priority = false,
  sizes,
  quality = 85,
  title,
  loading = 'lazy'
}: SEOImageProps) {
  return (
    <figure className={`seo-image ${className}`} itemScope itemType="https://schema.org/ImageObject">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="seo-image__img"
        priority={priority}
        sizes={sizes}
        quality={quality}
        title={title}
        loading={loading}
        itemProp="contentUrl"
      />
      <meta itemProp="url" content={src} />
      <meta itemProp="width" content={width.toString()} />
      <meta itemProp="height" content={height.toString()} />
      <meta itemProp="description" content={alt} />
      {alt && (
        <figcaption className="seo-image__caption sr-only" itemProp="caption">
          {alt}
        </figcaption>
      )}
    </figure>
  )
}

interface SEOBreadcrumbsProps {
  breadcrumbs: Array<{ name: string; url: string }>
  className?: string
}

/**
 * SEO-optimized breadcrumb navigation with structured data
 */
export function SEOBreadcrumbs({ breadcrumbs, className = '' }: SEOBreadcrumbsProps) {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": process.env.NEXT_PUBLIC_BASE_URL + crumb.url
    }))
  }

  return (
    <>
      <StructuredData data={breadcrumbStructuredData} />
      <nav
        className={`seo-breadcrumbs ${className}`}
        aria-label="Breadcrumb navigation"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        <ol className="seo-breadcrumbs__list">
          {breadcrumbs.map((crumb, index) => (
            <li
              key={`breadcrumb-${index}`}
              className="seo-breadcrumbs__item"
              itemScope
              itemType="https://schema.org/ListItem"
              itemProp="itemListElement"
            >
              {index < breadcrumbs.length - 1 ? (
                <a
                  href={crumb.url}
                  className="seo-breadcrumbs__link"
                  itemProp="item"
                >
                  <span itemProp="name">{crumb.name}</span>
                </a>
              ) : (
                <span 
                  className="seo-breadcrumbs__current"
                  itemProp="name"
                  aria-current="page"
                >
                  {crumb.name}
                </span>
              )}
              <meta itemProp="position" content={(index + 1).toString()} />
              {index < breadcrumbs.length - 1 && (
                <span className="seo-breadcrumbs__separator" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}

interface SEOArticleProps {
  title: string
  content: string
  author?: string
  publishedDate?: string
  modifiedDate?: string
  category?: string
  tags?: string[]
  image?: string
  className?: string
}

/**
 * SEO-optimized article component with Article structured data
 */
export function SEOArticle({
  title,
  content,
  author,
  publishedDate,
  modifiedDate,
  category,
  tags = [],
  image,
  className = ''
}: SEOArticleProps) {
  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "articleBody": content,
    "author": author ? {
      "@type": "Person",
      "name": author
    } : undefined,
    "datePublished": publishedDate,
    "dateModified": modifiedDate || publishedDate,
    "articleSection": category,
    "keywords": tags.join(', '),
    "image": image ? {
      "@type": "ImageObject",
      "url": image
    } : undefined,
    "publisher": {
      "@type": "Organization",
      "name": "7P Education Platform",
      "logo": {
        "@type": "ImageObject",
        "url": `${process.env.NEXT_PUBLIC_BASE_URL}/images/logo.png`
      }
    }
  }

  return (
    <>
      <StructuredData data={articleStructuredData} />
      <article
        className={`seo-article ${className}`}
        itemScope
        itemType="https://schema.org/Article"
      >
        <header className="seo-article__header">
          <SEOHeading 
            level={1} 
            text={title} 
            itemProp="headline"
            className="seo-article__title"
          />
          
          {(author || publishedDate) && (
            <div className="seo-article__meta">
              {author && (
                <span 
                  className="seo-article__author"
                  itemProp="author"
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  <span itemProp="name">{author}</span>
                </span>
              )}
              {publishedDate && (
                <time 
                  className="seo-article__date"
                  dateTime={publishedDate}
                  itemProp="datePublished"
                >
                  {new Date(publishedDate).toLocaleDateString('tr-TR')}
                </time>
              )}
              {modifiedDate && modifiedDate !== publishedDate && (
                <time 
                  className="seo-article__modified sr-only"
                  dateTime={modifiedDate}
                  itemProp="dateModified"
                >
                  {modifiedDate}
                </time>
              )}
            </div>
          )}
        </header>

        <div 
          className="seo-article__content"
          itemProp="articleBody"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {tags.length > 0 && (
          <footer className="seo-article__footer">
            <div className="seo-article__tags">
              <span className="seo-article__tags-label">Etiketler:</span>
              {tags.map((tag, index) => (
                <span 
                  key={`tag-${index}`}
                  className="seo-article__tag"
                  itemProp="keywords"
                >
                  {tag}
                </span>
              ))}
            </div>
          </footer>
        )}
      </article>
    </>
  )
}

interface SEOListProps {
  items: Array<{
    title: string
    description?: string
    url?: string
    image?: string
  }>
  listType?: 'course' | 'instructor' | 'generic'
  className?: string
}

/**
 * SEO-optimized list component with ItemList structured data
 */
export function SEOList({ 
  items, 
  listType = 'generic', 
  className = '' 
}: SEOListProps) {
  const listStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "numberOfItems": items.length,
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.title,
      "description": item.description,
      "url": item.url ? `${process.env.NEXT_PUBLIC_BASE_URL}${item.url}` : undefined,
      "image": item.image
    }))
  }

  return (
    <>
      <StructuredData data={listStructuredData} />
      <div 
        className={`seo-list seo-list--${listType} ${className}`}
        itemScope
        itemType="https://schema.org/ItemList"
      >
        <meta itemProp="numberOfItems" content={items.length.toString()} />
        {items.map((item, index) => (
          <div
            key={`list-item-${index}`}
            className="seo-list__item"
            itemScope
            itemType="https://schema.org/ListItem"
            itemProp="itemListElement"
          >
            <meta itemProp="position" content={(index + 1).toString()} />
            
            {item.url ? (
              <a 
                href={item.url}
                className="seo-list__link"
                itemProp="url"
              >
                <span itemProp="name">{item.title}</span>
              </a>
            ) : (
              <span itemProp="name">{item.title}</span>
            )}
            
            {item.description && (
              <p className="seo-list__description" itemProp="description">
                {item.description}
              </p>
            )}

            {item.image && (
              <meta itemProp="image" content={item.image} />
            )}
          </div>
        ))}
      </div>
    </>
  )
}

/**
 * SEO-optimized FAQ component with FAQ structured data
 */
interface FAQProps {
  faqs: Array<{ question: string; answer: string }>
  className?: string
}

export function SEOFAQ({ faqs, className = '' }: FAQProps) {
  const faqStructuredData = {
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

  return (
    <>
      <StructuredData data={faqStructuredData} />
      <section 
        className={`seo-faq ${className}`}
        itemScope
        itemType="https://schema.org/FAQPage"
      >
        <SEOHeading level={2} text="Sıkça Sorulan Sorular" />
        
        {faqs.map((faq, index) => (
          <div
            key={`faq-${index}`}
            className="seo-faq__item"
            itemScope
            itemType="https://schema.org/Question"
            itemProp="mainEntity"
          >
            <SEOHeading 
              level={3} 
              text={faq.question}
              className="seo-faq__question"
              itemProp="name"
            />
            
            <div
              className="seo-faq__answer"
              itemScope
              itemType="https://schema.org/Answer"
              itemProp="acceptedAnswer"
            >
              <p itemProp="text">{faq.answer}</p>
            </div>
          </div>
        ))}
      </section>
    </>
  )
}