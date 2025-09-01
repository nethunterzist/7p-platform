# Backend API Design Patterns - 7P Education Platform

## 📋 Özet

7P Education Platform'un backend API mimarisi, RESTful principles ve modern GraphQL yaklaşımlarını harmanlayarak tasarlanmış, ölçeklenebilir ve güvenli bir sistem sunar. Bu dokümantasyon, API design patterns, endpoint structures, authentication flows ve data management stratejilerini kapsamlı olarak inceleyerek, backend geliştirme süreçlerinde rehberlik sağlar.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun kapsamı:
- RESTful API design principles ve implementation
- Next.js 15 App Router API routes architecture
- Authentication ve authorization strategies
- Data validation ve sanitization approaches
- Error handling ve logging mechanisms
- API versioning ve backward compatibility
- Performance optimization ve caching strategies
- Security best practices ve threat mitigation

## 🏗️ Mevcut Durum Analizi

### ✅ Mevcut API Endpoints
- **Authentication API**: 5 endpoint (login, register, logout, refresh, reset-password)
- **Courses API**: 3 endpoint (list, detail, enroll)
- **Payments API**: 5 endpoint (create-checkout, payment-intent, customer-portal, subscriptions, history)
- **Admin API**: 8 endpoint (users, courses, payments, Q&A management)
- **Student API**: 2 endpoint (materials, questions)
- **Webhooks**: 1 endpoint (Stripe webhooks)

### ⚠️ Geliştirilmesi Gereken Alanlar
- GraphQL endpoint implementation
- Real-time API endpoints (WebSocket/SSE)
- Advanced caching middleware
- API rate limiting enhancements
- Comprehensive audit logging
- API documentation auto-generation

## 🔧 Teknik Detaylar

### 🛣️ API Route Structure

#### Next.js App Router API Architecture
```typescript
// src/app/api/structure
api/
├── auth/
│   ├── login/route.ts           # POST /api/auth/login
│   ├── register/route.ts        # POST /api/auth/register
│   ├── logout/route.ts          # POST /api/auth/logout
│   ├── refresh/route.ts         # POST /api/auth/refresh
│   └── reset-password/route.ts  # POST /api/auth/reset-password
├── courses/
│   ├── route.ts                 # GET /api/courses
│   └── [courseId]/
│       ├── route.ts             # GET /api/courses/:id
│       ├── enroll/route.ts      # POST /api/courses/:id/enroll
│       └── progress/route.ts    # GET/PUT /api/courses/:id/progress
├── payments/
│   ├── create-checkout-session/route.ts
│   ├── create-payment-intent/route.ts
│   ├── customer-portal/route.ts
│   ├── subscriptions/route.ts
│   └── history/route.ts
├── admin/
│   ├── payments/refund/route.ts
│   └── qna/
│       ├── route.ts
│       └── [id]/
│           ├── route.ts
│           └── reply/route.ts
├── student/
│   └── questions/route.ts
└── webhooks/
    └── stripe/route.ts
```

### 🔐 Authentication API Implementation

#### JWT-Based Authentication
```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { hashPassword, verifyPassword } from '@/lib/crypto'
import { generateTokenPair, setTokenCookies } from '@/lib/auth/jwt'
import { auditLog } from '@/lib/audit'

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    })

    if (!rateLimitResult.success) {
      await auditLog({
        action: 'LOGIN_RATE_LIMITED',
        ip: request.ip,
        userAgent: request.headers.get('user-agent')
      })
      
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Request validation
    const body = await request.json()
    const validatedData = LoginSchema.parse(body)

    // User lookup
    const user = await getUserByEmail(validatedData.email)
    if (!user) {
      await auditLog({
        action: 'LOGIN_FAILED',
        reason: 'USER_NOT_FOUND',
        email: validatedData.email,
        ip: request.ip
      })
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Password verification
    const isPasswordValid = await verifyPassword(
      validatedData.password, 
      user.hashedPassword
    )

    if (!isPasswordValid) {
      await auditLog({
        action: 'LOGIN_FAILED',
        reason: 'INVALID_PASSWORD',
        userId: user.id,
        ip: request.ip
      })
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    }, {
      accessTokenExpiry: validatedData.rememberMe ? '7d' : '1h',
      refreshTokenExpiry: validatedData.rememberMe ? '30d' : '7d'
    })

    // Set secure cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

    setTokenCookies(response, { accessToken, refreshToken })

    await auditLog({
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      ip: request.ip,
      userAgent: request.headers.get('user-agent')
    })

    return response

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Middleware for Route Protection
```typescript
// src/app/api/middleware/auth.ts
import { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getUserById } from '@/lib/database/users'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
    role: string
  }
}

export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<Response>
) {
  return async (request: NextRequest) => {
    try {
      // Extract token from cookie or Authorization header
      let token = request.cookies.get('access-token')?.value
      
      if (!token) {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7)
        }
      }

      if (!token) {
        return new Response('Unauthorized', { status: 401 })
      }

      // Verify token
      const payload = verifyAccessToken(token)
      if (!payload) {
        return new Response('Invalid token', { status: 401 })
      }

      // Fetch current user data
      const user = await getUserById(payload.userId)
      if (!user) {
        return new Response('User not found', { status: 401 })
      }

      // Attach user to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = {
        id: user.id,
        email: user.email,
        role: user.role
      }

      return handler(authenticatedRequest)

    } catch (error) {
      console.error('Auth middleware error:', error)
      return new Response('Authentication failed', { status: 401 })
    }
  }
}

// Role-based access control
export function requireRole(allowedRoles: string[]) {
  return (handler: (req: AuthenticatedRequest) => Promise<Response>) => {
    return withAuth(async (request: AuthenticatedRequest) => {
      if (!allowedRoles.includes(request.user.role)) {
        return new Response('Forbidden', { status: 403 })
      }
      return handler(request)
    })
  }
}
```

### 📚 Courses API Implementation

#### Course Management Endpoints
```typescript
// src/app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, requireRole } from '../middleware/auth'
import { getCourses, createCourse } from '@/lib/database/courses'
import { validatePagination } from '@/lib/validation'

const CourseQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'createdAt', 'popularity', 'price']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

const CreateCourseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().min(2).max(50),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  price: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3)
  }),
  modules: z.array(z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(1000),
    order: z.number().int().positive(),
    lessons: z.array(z.object({
      title: z.string().min(3).max(200),
      content: z.string().min(10),
      duration: z.number().int().positive(),
      resources: z.array(z.object({
        type: z.enum(['video', 'document', 'link', 'quiz']),
        title: z.string(),
        url: z.string().url()
      })).optional()
    }))
  }))
})

// GET /api/courses - List courses with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams)
    const validatedQuery = CourseQuerySchema.parse(queryParams)

    const { courses, totalCount, hasMore } = await getCourses({
      ...validatedQuery,
      offset: (validatedQuery.page - 1) * validatedQuery.limit
    })

    return NextResponse.json({
      success: true,
      data: {
        courses,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / validatedQuery.limit),
          hasMore
        }
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Get courses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

// POST /api/courses - Create new course (Admin only)
export const POST = requireRole(['admin', 'instructor'])(
  async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json()
      const validatedData = CreateCourseSchema.parse(body)

      const course = await createCourse({
        ...validatedData,
        instructorId: request.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        published: false
      })

      return NextResponse.json({
        success: true,
        data: { course }
      }, { status: 201 })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid course data', details: error.errors },
          { status: 400 }
        )
      }

      console.error('Create course error:', error)
      return NextResponse.json(
        { error: 'Failed to create course' },
        { status: 500 }
      )
    }
  }
)
```

### 💳 Payment API Integration

#### Stripe Payment Processing
```typescript
// src/app/api/payments/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { withAuth } from '../../middleware/auth'
import { getCourseById } from '@/lib/database/courses'
import { createPaymentRecord } from '@/lib/database/payments'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const CreateCheckoutSchema = z.object({
  courseId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.string()).optional()
})

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json()
    const { courseId, successUrl, cancelUrl, metadata } = CreateCheckoutSchema.parse(body)

    // Validate course exists and is available for purchase
    const course = await getCourseById(courseId)
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    if (!course.published) {
      return NextResponse.json(
        { error: 'Course is not available for purchase' },
        { status: 400 }
      )
    }

    // Check if user already enrolled
    const existingEnrollment = await getUserCourseEnrollment(
      request.user.id, 
      courseId
    )
    
    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Already enrolled in this course' },
        { status: 409 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: request.user.email,
      line_items: [
        {
          price_data: {
            currency: course.pricing.currency,
            product_data: {
              name: course.title,
              description: course.description,
              images: course.thumbnail ? [course.thumbnail] : [],
              metadata: {
                courseId: course.id,
                instructorId: course.instructorId
              }
            },
            unit_amount: course.pricing.amount * 100 // Convert to cents
          },
          quantity: 1
        }
      ],
      metadata: {
        userId: request.user.id,
        courseId: course.id,
        type: 'course_purchase',
        ...metadata
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
    })

    // Create payment record
    await createPaymentRecord({
      userId: request.user.id,
      courseId: course.id,
      stripeSessionId: session.id,
      amount: course.pricing.amount,
      currency: course.pricing.currency,
      status: 'pending',
      metadata: {
        checkoutSessionUrl: session.url,
        ...metadata
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        checkoutUrl: session.url
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payment data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create checkout session error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
})
```

### 🔔 Webhook Implementation

#### Stripe Webhook Handler
```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { updatePaymentStatus, createEnrollment } from '@/lib/database'
import { sendEnrollmentConfirmation } from '@/lib/email'
import { auditLog } from '@/lib/audit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')!

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    await auditLog({
      action: 'WEBHOOK_RECEIVED',
      type: 'stripe',
      eventType: event.type,
      eventId: event.id
    })

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    
    await auditLog({
      action: 'WEBHOOK_FAILED',
      type: 'stripe',
      error: error.message
    })

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, courseId } = session.metadata!

  try {
    // Update payment status
    await updatePaymentStatus(session.id, {
      status: 'completed',
      stripePaymentIntentId: session.payment_intent as string,
      completedAt: new Date()
    })

    // Create course enrollment
    const enrollment = await createEnrollment({
      userId,
      courseId,
      enrolledAt: new Date(),
      paymentId: session.id
    })

    // Send confirmation email
    await sendEnrollmentConfirmation({
      userId,
      courseId,
      enrollmentId: enrollment.id
    })

    await auditLog({
      action: 'ENROLLMENT_CREATED',
      userId,
      courseId,
      paymentId: session.id
    })

  } catch (error) {
    console.error('Error handling checkout completed:', error)
    throw error
  }
}
```

### 📊 API Response Standardization

#### Standard Response Format
```typescript
// src/lib/api/responses.ts
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errors?: ValidationError[]
  metadata?: {
    timestamp: string
    requestId: string
    version: string
  }
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasMore: boolean
  }
}

export function createSuccessResponse<T>(
  data: T,
  metadata?: Record<string, any>
): APIResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0.0',
      ...metadata
    }
  }
}

export function createErrorResponse(
  error: string,
  errors?: ValidationError[]
): APIResponse {
  return {
    success: false,
    error,
    errors,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0.0'
    }
  }
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0.0'
    }
  }
}
```

## 💡 Öneriler ve Best Practices

### 🚀 API Performance Optimization

#### Response Caching Strategy
```typescript
// src/lib/cache/api-cache.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

export interface CacheConfig {
  ttl: number // seconds
  tags?: string[]
  version?: string
}

export async function getCachedResponse<T>(
  key: string,
  config?: CacheConfig
): Promise<T | null> {
  try {
    const cached = await redis.get(key)
    if (!cached) return null

    const parsed = JSON.parse(cached)
    
    // Check version compatibility
    if (config?.version && parsed.version !== config.version) {
      await redis.del(key)
      return null
    }

    return parsed.data as T
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

export async function setCachedResponse<T>(
  key: string,
  data: T,
  config: CacheConfig
): Promise<void> {
  try {
    const cacheData = {
      data,
      version: config.version || '1.0.0',
      cachedAt: Date.now(),
      tags: config.tags || []
    }

    await redis.setex(key, config.ttl, JSON.stringify(cacheData))

    // Add to tag sets for invalidation
    if (config.tags) {
      for (const tag of config.tags) {
        await redis.sadd(`tag:${tag}`, key)
      }
    }
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

// Cache invalidation by tags
export async function invalidateByTags(tags: string[]): Promise<void> {
  try {
    const pipeline = redis.pipeline()
    
    for (const tag of tags) {
      const keys = await redis.smembers(`tag:${tag}`)
      if (keys.length > 0) {
        pipeline.del(...keys)
        pipeline.del(`tag:${tag}`)
      }
    }
    
    await pipeline.exec()
  } catch (error) {
    console.error('Cache invalidation error:', error)
  }
}
```

#### Request/Response Compression
```typescript
// src/lib/middleware/compression.ts
import { NextRequest, NextResponse } from 'next/server'
import { gzipSync, brotliCompressSync } from 'zlib'

export function withCompression(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const response = await handler(request)
    
    // Check if client accepts compression
    const acceptEncoding = request.headers.get('accept-encoding') || ''
    const shouldCompress = response.headers.get('content-type')?.includes('application/json')
    
    if (!shouldCompress || response.body === null) {
      return response
    }

    const body = await response.text()
    let compressedBody: Buffer
    let encoding: string

    if (acceptEncoding.includes('br')) {
      compressedBody = brotliCompressSync(body)
      encoding = 'br'
    } else if (acceptEncoding.includes('gzip')) {
      compressedBody = gzipSync(body)
      encoding = 'gzip'
    } else {
      return response
    }

    const compressedResponse = new NextResponse(compressedBody, {
      status: response.status,
      headers: response.headers
    })

    compressedResponse.headers.set('content-encoding', encoding)
    compressedResponse.headers.set('content-length', compressedBody.length.toString())

    return compressedResponse
  }
}
```

### 🔒 Advanced Security Implementations

#### API Rate Limiting
```typescript
// src/lib/rate-limit.ts
import { Redis } from 'ioredis'
import { NextRequest } from 'next/server'

const redis = new Redis(process.env.REDIS_URL!)

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  skipIf?: (request: NextRequest) => boolean
  keyGenerator?: (request: NextRequest) => string
  onLimitReached?: (request: NextRequest) => void
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number; reset: Date }> {
  // Skip if condition is met
  if (config.skipIf?.(request)) {
    return { success: true, remaining: config.maxRequests, reset: new Date() }
  }

  // Generate rate limit key
  const key = config.keyGenerator?.(request) || 
    `ratelimit:${request.ip}:${request.nextUrl.pathname}`

  const window = Math.floor(Date.now() / config.windowMs)
  const windowKey = `${key}:${window}`

  try {
    const current = await redis.incr(windowKey)
    
    if (current === 1) {
      await redis.expire(windowKey, Math.ceil(config.windowMs / 1000))
    }

    const remaining = Math.max(0, config.maxRequests - current)
    const reset = new Date((window + 1) * config.windowMs)

    if (current > config.maxRequests) {
      config.onLimitReached?.(request)
      return { success: false, remaining: 0, reset }
    }

    return { success: true, remaining, reset }

  } catch (error) {
    console.error('Rate limit error:', error)
    // Fail open - allow request if rate limiting fails
    return { success: true, remaining: config.maxRequests, reset: new Date() }
  }
}

// Sliding window rate limiter
export async function slidingWindowRateLimit(
  request: NextRequest,
  config: RateLimitConfig & { windowSize: number }
): Promise<{ success: boolean; remaining: number; reset: Date }> {
  const key = `sliding:${request.ip}:${request.nextUrl.pathname}`
  const now = Date.now()
  const windowStart = now - config.windowMs

  try {
    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart)
    
    // Count current requests
    const current = await redis.zcard(key)
    
    if (current >= config.maxRequests) {
      return { 
        success: false, 
        remaining: 0, 
        reset: new Date(now + config.windowMs) 
      }
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`)
    await redis.expire(key, Math.ceil(config.windowMs / 1000))

    return {
      success: true,
      remaining: config.maxRequests - current - 1,
      reset: new Date(now + config.windowMs)
    }

  } catch (error) {
    console.error('Sliding window rate limit error:', error)
    return { success: true, remaining: config.maxRequests, reset: new Date() }
  }
}
```

### 📝 API Documentation Auto-Generation

#### OpenAPI Schema Generation
```typescript
// src/lib/api/documentation.ts
import { z } from 'zod'

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  summary: string
  description?: string
  tags: string[]
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses: Record<number, ResponseSchema>
  security?: SecurityRequirement[]
}

export function generateOpenAPISpec(endpoints: APIEndpoint[]) {
  return {
    openapi: '3.0.0',
    info: {
      title: '7P Education Platform API',
      version: '1.0.0',
      description: 'Comprehensive API for the 7P Education Platform'
    },
    servers: [
      {
        url: 'https://api.7peducation.com',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.7peducation.com',
        description: 'Staging server'
      }
    ],
    paths: generatePaths(endpoints),
    components: {
      schemas: generateSchemas(),
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access-token'
        }
      }
    }
  }
}

// Schema validation to OpenAPI conversion
export function zodToOpenAPI(schema: z.ZodSchema): any {
  if (schema instanceof z.ZodString) {
    return { type: 'string' }
  }
  
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' }
  }
  
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' }
  }
  
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToOpenAPI(schema.element)
    }
  }
  
  if (schema instanceof z.ZodObject) {
    const properties = {}
    const required = []
    
    for (const [key, value] of Object.entries(schema.shape)) {
      properties[key] = zodToOpenAPI(value as z.ZodSchema)
      if (!value.isOptional?.()) {
        required.push(key)
      }
    }
    
    return {
      type: 'object',
      properties,
      required
    }
  }
  
  return { type: 'any' }
}
```

## 📊 Implementation Roadmap

### Phase 1: Core API Enhancement (3 weeks)
- [ ] GraphQL endpoint implementation
- [ ] Advanced caching middleware
- [ ] Comprehensive API documentation
- [ ] Enhanced error handling and logging

### Phase 2: Real-time Features (2 weeks)
- [ ] WebSocket API endpoints
- [ ] Server-Sent Events implementation
- [ ] Real-time notification system
- [ ] Live course updates

### Phase 3: Advanced Security (2 weeks)
- [ ] API key management system
- [ ] Advanced rate limiting strategies
- [ ] Request/response encryption
- [ ] Audit logging enhancements

### Phase 4: Performance & Monitoring (1 week)
- [ ] API performance monitoring
- [ ] Response time optimization
- [ ] Database query optimization
- [ ] Load testing and optimization

## 🔗 İlgili Dosyalar

- [Frontend Architecture](frontend-architecture.md) - Frontend API integration
- [Authentication Security](authentication-security.md) - Auth implementation details
- [Database Schema](database-schema.md) - Database design and integration
- [Payment Integration](payment-integration.md) - Payment API details
- [Real-time Features](realtime-features.md) - WebSocket and SSE implementation
- [API Rate Limiting](../database/api-rate-limiting.md) - Rate limiting strategies
- [Security Audit](../security/security-audit.md) - API security review

## 📚 Kaynaklar

### 📖 Framework Documentation
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Next.js App Router](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Zod Validation](https://zod.dev/)
- [Stripe API Documentation](https://stripe.com/docs/api)

### 🛠️ Development Tools
- [Postman API Testing](https://www.postman.com/)
- [Insomnia REST Client](https://insomnia.rest/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

### 📊 Performance & Monitoring
- [Redis Documentation](https://redis.io/documentation)
- [API Performance Best Practices](https://www.nginx.com/blog/rate-limiting-nginx/)
- [REST API Design Guidelines](https://restfulapi.net/)

### 🔒 Security Resources
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [API Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*