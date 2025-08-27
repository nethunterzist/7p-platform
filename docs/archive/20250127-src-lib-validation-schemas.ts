/**
 * 🛡️ Comprehensive Input Validation Schemas
 * 7P Education Platform - Zod-based API Input Security
 * 
 * Implements OWASP API Security Top 10 compliant input validation
 */

import { z } from 'zod';

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

const SECURITY_LIMITS = {
  EMAIL_MAX_LENGTH: 254,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MAX_LENGTH: 100,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 5000,
  TEXT_CONTENT_MAX_LENGTH: 50000,
  URL_MAX_LENGTH: 2083,
  PHONE_MAX_LENGTH: 20,
  ID_MAX_LENGTH: 36, // UUID length
  SEARCH_QUERY_MAX_LENGTH: 100,
  FILENAME_MAX_LENGTH: 255,
  FILE_SIZE_MAX_MB: 10,
  COURSE_PRICE_MAX: 999999.99, // $999,999.99
  RATING_MIN: 1,
  RATING_MAX: 5
} as const;

// =============================================================================
// COMMON FIELD VALIDATORS
// =============================================================================

/**
 * 📧 Email Validation
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(SECURITY_LIMITS.EMAIL_MAX_LENGTH, `Email must be less than ${SECURITY_LIMITS.EMAIL_MAX_LENGTH} characters`)
  .email('Invalid email format')
  .toLowerCase()
  .refine(
    (email) => !email.includes('<') && !email.includes('>') && !email.includes('"'),
    'Email contains invalid characters'
  );

/**
 * 🔐 Password Validation
 */
export const passwordSchema = z
  .string()
  .min(SECURITY_LIMITS.PASSWORD_MIN_LENGTH, `Password must be at least ${SECURITY_LIMITS.PASSWORD_MIN_LENGTH} characters`)
  .max(SECURITY_LIMITS.PASSWORD_MAX_LENGTH, `Password must be less than ${SECURITY_LIMITS.PASSWORD_MAX_LENGTH} characters`)
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /\d/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    'Password must contain at least one special character'
  )
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    'Password cannot contain repeated characters'
  );

/**
 * 👤 Name Validation (XSS Protected)
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(SECURITY_LIMITS.NAME_MAX_LENGTH, `Name must be less than ${SECURITY_LIMITS.NAME_MAX_LENGTH} characters`)
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .refine(
    (name) => !/<[^>]*>/.test(name),
    'Name cannot contain HTML tags'
  )
  .transform((name) => name.trim());

/**
 * 🆔 UUID Validation
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format');

/**
 * 🔢 Positive Integer
 */
export const positiveIntSchema = z
  .number()
  .int('Must be an integer')
  .positive('Must be a positive number');

/**
 * 💰 Price/Money Validation
 */
export const priceSchema = z
  .number()
  .min(0, 'Price cannot be negative')
  .max(SECURITY_LIMITS.COURSE_PRICE_MAX, `Price cannot exceed $${SECURITY_LIMITS.COURSE_PRICE_MAX}`)
  .multipleOf(0.01, 'Price can only have 2 decimal places');

/**
 * ⭐ Rating Validation
 */
export const ratingSchema = z
  .number()
  .int('Rating must be an integer')
  .min(SECURITY_LIMITS.RATING_MIN, `Rating must be at least ${SECURITY_LIMITS.RATING_MIN}`)
  .max(SECURITY_LIMITS.RATING_MAX, `Rating cannot exceed ${SECURITY_LIMITS.RATING_MAX}`);

/**
 * 🔗 URL Validation
 */
export const urlSchema = z
  .string()
  .max(SECURITY_LIMITS.URL_MAX_LENGTH, `URL must be less than ${SECURITY_LIMITS.URL_MAX_LENGTH} characters`)
  .url('Invalid URL format')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must use HTTP or HTTPS protocol'
  );

/**
 * 🔍 Search Query Validation
 */
export const searchQuerySchema = z
  .string()
  .max(SECURITY_LIMITS.SEARCH_QUERY_MAX_LENGTH, `Search query must be less than ${SECURITY_LIMITS.SEARCH_QUERY_MAX_LENGTH} characters`)
  .refine(
    (query) => !/<[^>]*>/.test(query),
    'Search query cannot contain HTML tags'
  )
  .refine(
    (query) => !/[<>'"&]/.test(query),
    'Search query contains invalid characters'
  )
  .transform((query) => query.trim());

/**
 * 📝 Text Content Validation (XSS Protected)
 */
export const textContentSchema = z
  .string()
  .max(SECURITY_LIMITS.TEXT_CONTENT_MAX_LENGTH, `Content must be less than ${SECURITY_LIMITS.TEXT_CONTENT_MAX_LENGTH} characters`)
  .refine(
    (content) => !/<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(content),
    'Content cannot contain script tags'
  )
  .refine(
    (content) => !/on\w+\s*=/gi.test(content),
    'Content cannot contain event handlers'
  )
  .transform((content) => content.trim());

// =============================================================================
// AUTHENTICATION SCHEMAS
// =============================================================================

/**
 * 🔑 Login Request Schema
 */
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  mfa_code: z.string().optional(),
  remember_me: z.boolean().optional().default(false)
});

/**
 * 📝 Registration Request Schema
 */
export const registrationRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  confirm_password: z.string(),
  terms_accepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
}).refine(
  (data) => data.password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password']
  }
);

/**
 * 🔄 Password Reset Schema
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: passwordSchema,
  confirm_password: z.string()
}).refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password']
  }
);

/**
 * 👤 Profile Update Schema
 */
export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  phone: z.string()
    .max(SECURITY_LIMITS.PHONE_MAX_LENGTH, `Phone must be less than ${SECURITY_LIMITS.PHONE_MAX_LENGTH} characters`)
    .regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .optional(),
  bio: z.string()
    .max(SECURITY_LIMITS.DESCRIPTION_MAX_LENGTH, `Bio must be less than ${SECURITY_LIMITS.DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),
  avatar_url: urlSchema.optional()
});

// =============================================================================
// COURSE SCHEMAS
// =============================================================================

/**
 * 📚 Course Creation Schema
 */
export const courseCreateSchema = z.object({
  title: z.string()
    .min(1, 'Course title is required')
    .max(SECURITY_LIMITS.TITLE_MAX_LENGTH, `Title must be less than ${SECURITY_LIMITS.TITLE_MAX_LENGTH} characters`)
    .refine((title) => !/<[^>]*>/.test(title), 'Title cannot contain HTML tags'),
  
  description: textContentSchema,
  
  price: priceSchema,
  
  category: z.enum(['programming', 'design', 'business', 'marketing', 'personal-development', 'other']),
  
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  
  duration_hours: z.number()
    .min(0.5, 'Duration must be at least 0.5 hours')
    .max(1000, 'Duration cannot exceed 1000 hours'),
    
  thumbnail_url: urlSchema.optional(),
  
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed').optional()
});

/**
 * 📝 Course Update Schema
 */
export const courseUpdateSchema = courseCreateSchema.partial();

/**
 * 🔍 Course Search Schema
 */
export const courseSearchSchema = z.object({
  query: searchQuerySchema.optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  min_price: priceSchema.optional(),
  max_price: priceSchema.optional(),
  page: positiveIntSchema.optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20)
});

// =============================================================================
// PAYMENT SCHEMAS
// =============================================================================

/**
 * 💳 Payment Intent Schema
 */
export const paymentIntentSchema = z.object({
  course_id: uuidSchema,
  amount: priceSchema,
  currency: z.enum(['usd', 'eur', 'try']).default('usd'),
  payment_method: z.enum(['card', 'bank_transfer', 'paypal']).default('card')
});

/**
 * 🛒 Checkout Session Schema
 */
export const checkoutSessionSchema = z.object({
  course_ids: z.array(uuidSchema).min(1, 'At least one course is required').max(10, 'Maximum 10 courses allowed'),
  success_url: urlSchema,
  cancel_url: urlSchema,
  coupon_code: z.string().max(50, 'Coupon code must be less than 50 characters').optional()
});

// =============================================================================
// ASSESSMENT SCHEMAS
// =============================================================================

/**
 * 📝 Assessment Submission Schema
 */
export const assessmentSubmissionSchema = z.object({
  assessment_id: uuidSchema,
  answers: z.array(z.object({
    question_id: uuidSchema,
    answer: z.union([
      z.string().max(SECURITY_LIMITS.TEXT_CONTENT_MAX_LENGTH, 'Answer too long'),
      z.array(z.string().max(200, 'Option too long')).max(10, 'Too many options'),
      z.number(),
      z.boolean()
    ])
  })).min(1, 'At least one answer is required').max(100, 'Too many answers'),
  time_spent: positiveIntSchema.max(86400, 'Time spent cannot exceed 24 hours') // seconds
});

// =============================================================================
// ADMIN SCHEMAS
// =============================================================================

/**
 * 👑 Admin User Creation Schema
 */
export const adminUserCreateSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: z.enum(['admin', 'instructor', 'student']),
  send_invitation: z.boolean().default(true)
});

// =============================================================================
// FILE UPLOAD SCHEMAS
// =============================================================================

/**
 * 📁 File Upload Schema
 */
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(SECURITY_LIMITS.FILENAME_MAX_LENGTH, `Filename must be less than ${SECURITY_LIMITS.FILENAME_MAX_LENGTH} characters`)
    .refine(
      (filename) => /^[a-zA-Z0-9._-]+$/.test(filename),
      'Filename can only contain alphanumeric characters, dots, hyphens, and underscores'
    )
    .refine(
      (filename) => !filename.includes('..'),
      'Filename cannot contain directory traversal sequences'
    ),
    
  file_type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4']),
  
  file_size: z.number()
    .int('File size must be an integer')
    .min(1, 'File cannot be empty')
    .max(SECURITY_LIMITS.FILE_SIZE_MAX_MB * 1024 * 1024, `File cannot exceed ${SECURITY_LIMITS.FILE_SIZE_MAX_MB}MB`)
});

// =============================================================================
// REQUEST VALIDATION MIDDLEWARE
// =============================================================================

/**
 * 🛡️ API Request Validation Middleware
 */
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: Request): Promise<{ data: T; errors?: never } | { data?: never; errors: string[] }> => {
    try {
      const body = await request.json();
      const data = schema.parse(body);
      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { errors };
      }
      return { errors: ['Invalid request format'] };
    }
  };
}

/**
 * 🔍 Query Parameter Validation
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): 
  { data: T; errors?: never } | { data?: never; errors: string[] } {
  try {
    const queryObject = Object.fromEntries(searchParams.entries());
    
    // Convert numeric strings to numbers for validation
    for (const [key, value] of Object.entries(queryObject)) {
      if (value && !isNaN(Number(value))) {
        queryObject[key] = Number(value);
      }
    }
    
    const data = schema.parse(queryObject);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { errors };
    }
    return { errors: ['Invalid query parameters'] };
  }
}

// =============================================================================
// SANITIZATION UTILITIES
// =============================================================================

/**
 * 🧹 HTML Sanitization
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[#\w]+;/g, '')
    .trim();
}

/**
 * 🔐 SQL Injection Prevention
 */
export function sanitizeSql(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim();
}

/**
 * 🌐 URL Validation and Sanitization
 */
export function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input);
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    return url.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegistrationRequest = z.infer<typeof registrationRequestSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type ProfileUpdateRequest = z.infer<typeof profileUpdateSchema>;
export type CourseCreateRequest = z.infer<typeof courseCreateSchema>;
export type CourseSearchRequest = z.infer<typeof courseSearchSchema>;
export type PaymentIntentRequest = z.infer<typeof paymentIntentSchema>;
export type AssessmentSubmissionRequest = z.infer<typeof assessmentSubmissionSchema>;

export default {
  // Auth schemas
  loginRequestSchema,
  registrationRequestSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  profileUpdateSchema,
  
  // Course schemas
  courseCreateSchema,
  courseUpdateSchema,
  courseSearchSchema,
  
  // Payment schemas
  paymentIntentSchema,
  checkoutSessionSchema,
  
  // Assessment schemas
  assessmentSubmissionSchema,
  
  // Admin schemas
  adminUserCreateSchema,
  
  // File upload schemas
  fileUploadSchema,
  
  // Validation utilities
  validateRequest,
  validateQuery,
  
  // Sanitization utilities
  sanitizeHtml,
  sanitizeSql,
  sanitizeUrl,
  
  // Common field validators
  emailSchema,
  passwordSchema,
  nameSchema,
  uuidSchema,
  priceSchema,
  ratingSchema,
  urlSchema,
  searchQuerySchema,
  textContentSchema
};