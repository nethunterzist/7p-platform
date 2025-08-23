import { z } from 'zod';

// Enrollment request schema
export const enrollmentRequestSchema = z.object({
  paymentIntentId: z.string().optional(),
  paymentMethod: z.enum(['free', 'paid', 'coupon']).default('free'),
  couponCode: z.string().min(3).max(50).optional(),
});

// Progress update schema
export const progressUpdateSchema = z.object({
  progress_percentage: z.number().min(0).max(100),
  last_accessed_lesson_id: z.string().uuid().optional(),
});

// Enrollment query schema
export const enrollmentQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'all']).default('all'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Cancellation request schema
export const cancellationRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Types
export type EnrollmentRequest = z.infer<typeof enrollmentRequestSchema>;
export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;
export type EnrollmentQuery = z.infer<typeof enrollmentQuerySchema>;
export type CancellationRequest = z.infer<typeof cancellationRequestSchema>;