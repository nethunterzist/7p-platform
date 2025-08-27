import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/enroll/free/route';

// Mock dependencies
jest.mock('@/lib/env', () => ({
  FEATURE_ENROLL_FREE: true,
  FREE_ENROLLMENT_CODE: null,
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_SERVICE_KEY: 'test-service-key'
}));

jest.mock('@/lib/security', () => ({
  rateLimit: {
    check: jest.fn(() => Promise.resolve({ success: true }))
  },
  getSecurityHeaders: jest.fn(() => ({})),
  validatePayload: jest.fn(),
  isValidUUID: jest.fn(() => true)
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {}
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-course-id',
              title: 'Test Course',
              status: 'published'
            },
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-enrollment-id',
              course_id: 'test-course-id',
              user_id: 'test-user-id',
              plan: 'free',
              status: 'active',
              enrolled_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('Free Enrollment API', () => {
  let mockRequest: Partial<NextRequest>;
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      json: jest.fn(() => Promise.resolve({
        courseId: 'test-course-id'
      })),
      headers: new Map([
        ['x-forwarded-for', '127.0.0.1'],
        ['user-agent', 'test-agent']
      ])
    } as any;

    mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      }
    };

    // Setup default mocks
    const { getServerSession } = require('next-auth/next');
    getServerSession.mockResolvedValue(mockSession);
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should check feature flag', async () => {
      jest.doMock('@/lib/env', () => ({
        FEATURE_ENROLL_FREE: false
      }));
      
      const { POST: PostHandler } = await import('@/app/api/enroll/free/route');
      const response = await PostHandler(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Free enrollment is not enabled');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      const { rateLimit } = require('@/lib/security');
      rateLimit.check.mockResolvedValueOnce({ success: false });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Rate limit exceeded. Please try again later.');
    });
  });

  describe('Input Validation', () => {
    it('should validate courseId format', async () => {
      const { isValidUUID } = require('@/lib/security');
      isValidUUID.mockReturnValueOnce(false);

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid course ID format');
    });

    it('should require courseId', async () => {
      mockRequest.json = jest.fn(() => Promise.resolve({}));

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  describe('Enrollment Code Validation', () => {
    it('should validate enrollment code when required', async () => {
      jest.doMock('@/lib/env', () => ({
        FEATURE_ENROLL_FREE: true,
        FREE_ENROLLMENT_CODE: 'TEST123',
        NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_SERVICE_KEY: 'test-service-key'
      }));

      mockRequest.json = jest.fn(() => Promise.resolve({
        courseId: 'test-course-id',
        code: 'WRONG_CODE'
      }));

      const { POST: PostHandler } = await import('@/app/api/enroll/free/route');
      const response = await PostHandler(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid or missing enrollment code');
    });

    it('should allow enrollment with correct code', async () => {
      jest.doMock('@/lib/env', () => ({
        FEATURE_ENROLL_FREE: true,
        FREE_ENROLLMENT_CODE: 'TEST123',
        NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_SERVICE_KEY: 'test-service-key'
      }));

      mockRequest.json = jest.fn(() => Promise.resolve({
        courseId: 'test-course-id',
        code: 'TEST123'
      }));

      const { POST: PostHandler } = await import('@/app/api/enroll/free/route');
      const response = await PostHandler(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('Course Validation', () => {
    it('should check if course exists', async () => {
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = createClient();
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Course not found' }
            }))
          }))
        }))
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Course not found');
    });

    it('should check if course is published', async () => {
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = createClient();
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'test-course-id',
                title: 'Test Course',
                status: 'draft'
              },
              error: null
            }))
          }))
        }))
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Course is not available for enrollment');
    });
  });

  describe('Duplicate Enrollment Check', () => {
    it('should prevent duplicate enrollment', async () => {
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = createClient();
      
      // First call for course check - return course
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'test-course-id',
                title: 'Test Course',
                status: 'published'
              },
              error: null
            }))
          }))
        }))
      });

      // Second call for existing enrollment check - return existing enrollment
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: {
                  id: 'existing-enrollment-id',
                  status: 'active'
                },
                error: null
              }))
            }))
          }))
        }))
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Already enrolled in this course');
    });
  });

  describe('Successful Enrollment', () => {
    it('should create free enrollment successfully', async () => {
      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Successfully enrolled in course');
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.plan).toBe('free');
      expect(data.enrollment.status).toBe('active');
    });

    it('should include correct enrollment metadata', async () => {
      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.enrollment.courseId).toBe('test-course-id');
      expect(data.enrollment.userId).toBe('test-user-id');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = createClient();
      
      // Course check succeeds
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'test-course-id',
                title: 'Test Course',
                status: 'published'
              },
              error: null
            }))
          }))
        }))
      });

      // Existing enrollment check succeeds (no existing enrollment)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: null
              }))
            }))
          }))
        }))
      });

      // Enrollment creation fails
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create enrollment');
    });

    it('should handle invalid request format', async () => {
      mockRequest.json = jest.fn(() => Promise.reject(new Error('Invalid JSON')));

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in all responses', async () => {
      const { getSecurityHeaders } = require('@/lib/security');
      getSecurityHeaders.mockReturnValue({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      });

      const response = await POST(mockRequest as NextRequest);

      expect(getSecurityHeaders).toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    it('should log successful enrollment for audit', async () => {
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = createClient();
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.status).toBe(201);
      // Verify that audit_logs insert was called
      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });
  });
});