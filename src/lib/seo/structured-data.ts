import type { Course, User, Category } from './metadata-generator'

interface StructuredDataConfig {
  type: 'Course' | 'Person' | 'Organization' | 'WebSite' | 'BreadcrumbList' | 'Article' | 'FAQPage' | 'Review'
  data: any
}

interface FAQItem {
  question: string
  answer: string
}

interface Review {
  author: string
  rating: number
  reviewBody: string
  datePublished: string
}

class StructuredDataGenerator {
  private readonly baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://7peducation.com'
  
  // Organization data for 7P Education
  private readonly organizationData = {
    "@type": "Organization",
    "@id": `${this.baseUrl}#organization`,
    "name": "7P Education Platform",
    "alternateName": "7P Eğitim",
    "url": this.baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${this.baseUrl}/images/logo.png`,
      "width": 200,
      "height": 60
    },
    "image": `${this.baseUrl}/images/logo.png`,
    "description": "Türkiye'nin önde gelen online eğitim platformu. Profesyonel gelişim ve kariyer odaklı kurslar.",
    "sameAs": [
      "https://twitter.com/7peducation",
      "https://linkedin.com/company/7peducation",
      "https://facebook.com/7peducation",
      "https://instagram.com/7peducation",
      "https://youtube.com/@7peducation"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+90-212-555-0123",
      "contactType": "Müşteri Hizmetleri",
      "areaServed": "TR",
      "availableLanguage": ["Turkish", "English"],
      "hoursAvailable": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00",
        "timeZone": "Europe/Istanbul"
      }
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "TR",
      "addressRegion": "İstanbul",
      "postalCode": "34000",
      "streetAddress": "İstanbul, Türkiye"
    },
    "foundingDate": "2024",
    "numberOfEmployees": "10-50",
    "industry": "Education Technology",
    "keywords": "online eğitim, kurs, sertifika, profesyonel gelişim, kariyer, uzaktan öğrenme"
  }

  /**
   * Generate Course structured data with comprehensive educational information
   */
  generateCourseStructuredData(course: Course): object {
    const courseData = {
      "@context": "https://schema.org",
      "@type": "Course",
      "@id": `${this.baseUrl}/courses/${course.slug}`,
      "name": course.title,
      "description": course.description || course.short_description,
      "provider": this.organizationData,
      "image": {
        "@type": "ImageObject",
        "url": course.thumbnail_url || `${this.baseUrl}/images/default-course.jpg`,
        "width": 1200,
        "height": 630
      },
      "url": `${this.baseUrl}/courses/${course.slug}`,
      "courseCode": course.id,
      "educationalLevel": this.mapCourseLevel(course.level),
      "inLanguage": "tr-TR",
      "availableLanguage": ["tr", "en"],
      "teaches": course.learning_objectives || [],
      "coursePrerequisites": course.prerequisites || [],
      "timeRequired": `PT${Math.floor((course.duration_minutes || 0) / 60)}H${(course.duration_minutes || 0) % 60}M`,
      "totalTime": `PT${Math.floor((course.duration_minutes || 0) / 60)}H${(course.duration_minutes || 0) % 60}M`,
      "numberOfCredits": this.calculateCredits(course.duration_minutes || 0),
      "educationalCredentialAwarded": {
        "@type": "EducationalOccupationalCredential",
        "name": "Tamamlama Sertifikası",
        "description": "Course completion certificate",
        "credentialCategory": "Certificate"
      },
      "instructor": course.instructor ? {
        "@type": "Person",
        "@id": `${this.baseUrl}/instructors/${course.instructor.id}`,
        "name": course.instructor.full_name,
        "image": course.instructor.avatar_url,
        "url": `${this.baseUrl}/instructors/${course.instructor.id}`,
        "jobTitle": "Profesyonel Eğitmen",
        "worksFor": this.organizationData
      } : undefined,
      "aggregateRating": course.average_rating ? {
        "@type": "AggregateRating",
        "ratingValue": course.average_rating,
        "reviewCount": course.review_count || 0,
        "bestRating": 5,
        "worstRating": 1,
        "ratingExplanation": "Öğrenci değerlendirmeleri"
      } : undefined,
      "offers": {
        "@type": "Offer",
        "price": course.pricing?.amount || 0,
        "priceCurrency": course.pricing?.currency || "TRY",
        "availability": "https://schema.org/InStock",
        "validFrom": course.published_at,
        "seller": this.organizationData,
        "category": course.category?.name,
        "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        "url": `${this.baseUrl}/courses/${course.slug}`
      },
      "isAccessibleForFree": (course.pricing?.amount || 0) === 0,
      "learningResourceType": "Course",
      "educationalAlignment": {
        "@type": "AlignmentObject",
        "alignmentType": "teaches",
        "targetName": course.category?.name,
        "educationalFramework": "7P Education Curriculum"
      },
      "datePublished": course.published_at,
      "dateModified": course.updated_at,
      "keywords": course.tags?.join(', ') || course.category?.name,
      "about": course.category?.name,
      "accountablePerson": course.instructor?.full_name,
      "educationalUse": "professional development, skill enhancement, career advancement",
      "interactivityType": "mixed",
      "typicalAgeRange": "18-65",
      "audience": {
        "@type": "EducationalAudience",
        "audienceType": "Professionals, Students",
        "educationalRole": "student"
      }
    }

    // Remove undefined properties
    return JSON.parse(JSON.stringify(courseData))
  }

  /**
   * Generate Instructor (Person) structured data
   */
  generateInstructorStructuredData(instructor: User, courses: Course[] = []): object {
    const instructorData = {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${this.baseUrl}/instructors/${instructor.id}`,
      "name": instructor.full_name,
      "image": {
        "@type": "ImageObject",
        "url": instructor.avatar_url || `${this.baseUrl}/images/default-avatar.jpg`,
        "width": 400,
        "height": 400
      },
      "url": `${this.baseUrl}/instructors/${instructor.id}`,
      "jobTitle": "Profesyonel Eğitmen",
      "description": instructor.bio || `${instructor.full_name} - 7P Education uzman eğitmeni`,
      "worksFor": this.organizationData,
      "alumniOf": instructor.education ? {
        "@type": "Organization",
        "name": instructor.education
      } : undefined,
      "knowsAbout": courses
        .map(course => course.category?.name)
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index), // Remove duplicates
      "teaches": courses.map(course => ({
        "@type": "Course",
        "@id": `${this.baseUrl}/courses/${course.slug}`,
        "name": course.title,
        "url": `${this.baseUrl}/courses/${course.slug}`,
        "provider": this.organizationData
      })),
      "sameAs": [
        instructor.linkedin_url,
        instructor.twitter_url,
        instructor.github_url
      ].filter(Boolean),
      "affiliation": this.organizationData,
      "hasOccupation": {
        "@type": "Occupation",
        "name": "Online Course Instructor",
        "occupationLocation": {
          "@type": "Country",
          "name": "Turkey"
        }
      }
    }

    return JSON.parse(JSON.stringify(instructorData))
  }

  /**
   * Generate breadcrumb navigation structured data
   */
  generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>): object {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": `${this.baseUrl}${item.url}`
      }))
    }
  }

  /**
   * Generate website structured data with search functionality
   */
  generateWebSiteStructuredData(): object {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${this.baseUrl}#website`,
      "url": this.baseUrl,
      "name": "7P Education Platform",
      "alternateName": "7P Eğitim",
      "description": "Türkiye'nin önde gelen online eğitim platformu. Profesyonel gelişim ve kariyer odaklı kurslar.",
      "publisher": this.organizationData,
      "inLanguage": "tr-TR",
      "copyrightYear": 2024,
      "potentialAction": [
        {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${this.baseUrl}/search?q={search_term_string}`,
            "actionPlatform": [
              "https://schema.org/DesktopWebPlatform",
              "https://schema.org/MobileWebPlatform"
            ]
          },
          "query-input": "required name=search_term_string"
        }
      ],
      "about": {
        "@type": "Thing",
        "name": "Online Education",
        "sameAs": "https://en.wikipedia.org/wiki/Online_education"
      },
      "keywords": "online eğitim, kurs, sertifika, profesyonel gelişim, kariyer, uzaktan öğrenme, türkiye"
    }
  }

  /**
   * Generate FAQ structured data for better search visibility
   */
  generateFAQStructuredData(faqs: FAQItem[]): object {
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

  /**
   * Generate review structured data for course reviews
   */
  generateReviewStructuredData(reviews: Review[], course: Course): object {
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${this.baseUrl}/courses/${course.slug}`,
      "name": course.title,
      "review": reviews.map(review => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": review.author
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": review.rating,
          "bestRating": 5,
          "worstRating": 1
        },
        "reviewBody": review.reviewBody,
        "datePublished": review.datePublished
      })),
      "aggregateRating": course.average_rating ? {
        "@type": "AggregateRating",
        "ratingValue": course.average_rating,
        "reviewCount": course.review_count || 0,
        "bestRating": 5,
        "worstRating": 1
      } : undefined
    }
  }

  /**
   * Generate organization structured data
   */
  generateOrganizationStructuredData(): object {
    return {
      "@context": "https://schema.org",
      ...this.organizationData
    }
  }

  /**
   * Generate educational organization specific data
   */
  generateEducationalOrganizationStructuredData(): object {
    return {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      ...this.organizationData,
      "hasCredential": {
        "@type": "EducationalOccupationalCredential",
        "name": "Course Completion Certificates",
        "credentialCategory": "Certificate"
      },
      "offers": {
        "@type": "EducationalOccupationalProgram",
        "name": "Professional Development Programs",
        "programType": "Online Courses",
        "provider": this.organizationData
      }
    }
  }

  // Utility methods
  private mapCourseLevel(level: string): string {
    const levelMap: { [key: string]: string } = {
      'beginner': 'Başlangıç',
      'intermediate': 'Orta',
      'advanced': 'İleri',
      'expert': 'Uzman'
    }
    return levelMap[level] || 'Başlangıç'
  }

  private calculateCredits(minutes: number): number {
    // 1 credit per 15 hours of content
    return Math.max(1, Math.round(minutes / (15 * 60)))
  }
}

export const structuredDataGenerator = new StructuredDataGenerator()

/**
 * React component for injecting structured data into pages
 */
interface StructuredDataProps {
  data: object
  id?: string
}

export function StructuredData({ data, id }: StructuredDataProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 2)
      }}
    />
  )
}

/**
 * Hook for multiple structured data injection
 */
export function useStructuredData(items: StructuredDataConfig[]) {
  return (
    <>
      {items.map((item, index) => (
        <StructuredData 
          key={`${item.type}-${index}`}
          id={`structured-data-${item.type.toLowerCase()}-${index}`}
          data={item.data} 
        />
      ))}
    </>
  )
}

/**
 * Pre-built structured data combinations for common pages
 */
export class StructuredDataCombinations {
  /**
   * Course page structured data combination
   */
  static coursePageData(
    course: Course, 
    breadcrumbs: Array<{ name: string; url: string }>,
    reviews: Review[] = [],
    faqs: FAQItem[] = []
  ): StructuredDataConfig[] {
    const configs: StructuredDataConfig[] = [
      {
        type: 'Course',
        data: structuredDataGenerator.generateCourseStructuredData(course)
      },
      {
        type: 'BreadcrumbList',
        data: structuredDataGenerator.generateBreadcrumbStructuredData(breadcrumbs)
      },
      {
        type: 'Organization',
        data: structuredDataGenerator.generateOrganizationStructuredData()
      }
    ]

    if (course.instructor) {
      configs.push({
        type: 'Person',
        data: structuredDataGenerator.generateInstructorStructuredData(course.instructor, [course])
      })
    }

    if (reviews.length > 0) {
      configs.push({
        type: 'Review',
        data: structuredDataGenerator.generateReviewStructuredData(reviews, course)
      })
    }

    if (faqs.length > 0) {
      configs.push({
        type: 'FAQPage',
        data: structuredDataGenerator.generateFAQStructuredData(faqs)
      })
    }

    return configs
  }

  /**
   * Homepage structured data combination
   */
  static homepageData(): StructuredDataConfig[] {
    return [
      {
        type: 'WebSite',
        data: structuredDataGenerator.generateWebSiteStructuredData()
      },
      {
        type: 'Organization',
        data: structuredDataGenerator.generateEducationalOrganizationStructuredData()
      }
    ]
  }

  /**
   * Instructor profile structured data combination
   */
  static instructorPageData(
    instructor: User,
    courses: Course[],
    breadcrumbs: Array<{ name: string; url: string }>
  ): StructuredDataConfig[] {
    return [
      {
        type: 'Person',
        data: structuredDataGenerator.generateInstructorStructuredData(instructor, courses)
      },
      {
        type: 'BreadcrumbList',
        data: structuredDataGenerator.generateBreadcrumbStructuredData(breadcrumbs)
      },
      {
        type: 'Organization',
        data: structuredDataGenerator.generateOrganizationStructuredData()
      }
    ]
  }
}

export type { StructuredDataConfig, FAQItem, Review }