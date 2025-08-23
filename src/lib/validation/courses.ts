import { z } from 'zod';

// Course query parameters schema
export const courseQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  search: z.string().min(1).optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'title', 'price', 'enrollment_count']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  published: z.coerce.boolean().optional(),
  instructor_id: z.string().uuid().optional(),
  price_min: z.coerce.number().min(0).optional(),
  price_max: z.coerce.number().min(0).optional(),
});

// Course creation schema
export const courseCreateSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_çğıöşüÇĞIİÖŞÜ]+$/, 'Title contains invalid characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  short_description: z.string()
    .max(500, 'Short description must not exceed 500 characters')
    .optional(),
  price: z.number()
    .min(0, 'Price must be non-negative')
    .max(999999, 'Price is too high'),
  category_id: z.string().uuid('Invalid category ID'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration_hours: z.number()
    .min(0.5, 'Duration must be at least 30 minutes')
    .max(500, 'Duration cannot exceed 500 hours'),
  language: z.string().min(2).max(5).default('tr'),
  thumbnail_url: z.string().url().optional(),
  preview_video_url: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(10, 'Too many tags').default([]),
  requirements: z.array(z.string().max(200)).max(20, 'Too many requirements').default([]),
  learning_objectives: z.array(z.string().max(300)).max(15, 'Too many learning objectives').default([]),
  published: z.boolean().default(false),
  max_students: z.number().min(1).max(10000).optional(),
  certificate_enabled: z.boolean().default(true),
  has_assignments: z.boolean().default(false),
  has_quizzes: z.boolean().default(false),
});

// Course update schema (partial)
export const courseUpdateSchema = courseCreateSchema.partial().extend({
  id: z.string().uuid(),
});

// Course filters for complex queries
export const courseFiltersSchema = z.object({
  categories: z.array(z.string().uuid()).optional(),
  difficulties: z.array(z.enum(['beginner', 'intermediate', 'advanced'])).optional(),
  languages: z.array(z.string()).optional(),
  price_range: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).optional(),
  duration_range: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).optional(),
  has_certificate: z.boolean().optional(),
  has_assignments: z.boolean().optional(),
  has_quizzes: z.boolean().optional(),
  instructor_ids: z.array(z.string().uuid()).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
});

// Types
export type CourseQuery = z.infer<typeof courseQuerySchema>;
export type CourseCreate = z.infer<typeof courseCreateSchema>;
export type CourseUpdate = z.infer<typeof courseUpdateSchema>;
export type CourseFilters = z.infer<typeof courseFiltersSchema>;