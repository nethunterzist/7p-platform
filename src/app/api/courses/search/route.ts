import { NextRequest, NextResponse } from 'next/server';
import { CourseService } from '@/services/course-service';
import { rateLimit } from '@/lib/security';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  categories: z.string().optional(),
  difficulties: z.string().optional(),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
});

/**
 * GET /api/courses/search - Advanced course search
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-course-search', {
      max: 30,
      window: '1m'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // Validate search parameters
    const { q, categories, difficulties, price_min, price_max, rating } = searchSchema.parse(queryParams);

    // Parse array parameters
    const filters: any = {};
    
    if (categories) {
      filters.categories = categories.split(',');
    }
    
    if (difficulties) {
      filters.difficulties = difficulties.split(',');
    }
    
    if (price_min !== undefined || price_max !== undefined) {
      filters.priceRange = {
        min: price_min || 0,
        max: price_max || 999999
      };
    }
    
    if (rating) {
      filters.rating = rating;
    }

    // Search courses
    const courses = await CourseService.searchCourses(q, filters);

    const response = {
      success: true,
      data: {
        courses,
        total: courses.length,
        query: q,
        filters
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error searching courses:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid search parameters',
          errors: error.errors
        },
        { status: 400 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Search failed'
    };

    return NextResponse.json(response, { status: 500 });
  }
}