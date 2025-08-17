# API Reference - 7P Education Platform

## 📋 Overview

Complete API documentation for the 7P Education Platform. The platform provides RESTful APIs for authentication, course management, payment processing, and user interactions.

**Base URL:** `https://7peducation.com/api`  
**Documentation Version:** 1.0  
**Last Updated:** August 2025

### 🔐 Authentication

All API endpoints require authentication unless otherwise specified. The platform uses JWT-based authentication with optional 2FA.

```http
Authorization: Bearer <your-jwt-token>
```

---

## 🔑 Authentication API

### Login User

Authenticate user with email and password, returns JWT tokens.

```http
POST /api/auth/login
```

**Request Body:**
```typescript
{
  email: string;           // User email address
  password: string;        // User password
  mfa_code?: string;       // MFA code if enabled
  remember_me?: boolean;   // Extended session (7 days)
}
```

**Response (Success):**
```typescript
{
  success: true;
  access_token: string;    // JWT access token
  refresh_token: string;   // JWT refresh token
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    mfa_enabled: boolean;
  };
}
```

**Response (MFA Required):**
```typescript
{
  success: false;
  mfa_required: true;
  message: "MFA code is required";
}
```

**Error Responses:**
- `400` - Missing email/password
- `401` - Invalid credentials
- `423` - Account locked
- `429` - Rate limit exceeded

**Example:**
```bash
curl -X POST https://7peducation.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePassword123!",
    "remember_me": true
  }'
```

### Register User

Create a new user account.

```http
POST /api/auth/register
```

**Request Body:**
```typescript
{
  email: string;           // Valid email address
  password: string;        // Min 8 chars, mixed case, numbers
  full_name: string;       // User's full name
  phone?: string;          // Optional phone number
}
```

**Response:**
```typescript
{
  success: true;
  message: "Registration successful. Please verify your email.";
  user_id: string;
}
```

### Logout User

Invalidate current session and tokens.

```http
POST /api/auth/logout
```

**Headers:**
```http
Authorization: Bearer <access-token>
```

**Response:**
```typescript
{
  success: true;
  message: "Logged out successfully";
}
```

### Refresh Token

Refresh expired access token using refresh token.

```http
POST /api/auth/refresh
```

**Request Body:**
```typescript
{
  refresh_token: string;
}
```

**Response:**
```typescript
{
  success: true;
  access_token: string;
  expires_in: number;
}
```

### Reset Password

Send password reset email to user.

```http
POST /api/auth/reset-password
```

**Request Body:**
```typescript
{
  email: string;
}
```

**Response:**
```typescript
{
  success: true;
  message: "Password reset email sent";
}
```

---

## 🏫 Courses API

### Get User Courses

Retrieve user's enrolled courses.

```http
GET /api/courses
```

**Headers:**
```http
Authorization: Bearer <access-token>
```

**Response:**
```typescript
{
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnail_url: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    duration_hours: number;
    total_lessons: number;
    rating: number;
    progress: number;         // 0-100
    enrolled_at: string;
    last_accessed: string;
    instructor: {
      display_name: string;
      avatar_url: string;
    };
    category: {
      name: string;
    };
  }>;
}
```

### Get Course Details

Get detailed information about a specific course.

```http
GET /api/courses/{courseId}
```

**Parameters:**
- `courseId` (string): Course identifier

**Response:**
```typescript
{
  course: {
    id: string;
    title: string;
    slug: string;
    description: string;
    short_description: string;
    thumbnail_url: string;
    level: string;
    duration_hours: number;
    total_lessons: number;
    rating: number;
    price: number;
    is_free: boolean;
    modules: Array<{
      id: string;
      title: string;
      description: string;
      order_index: number;
      lessons: Array<{
        id: string;
        title: string;
        type: 'video' | 'text' | 'quiz';
        duration_minutes: number;
        order_index: number;
        is_completed: boolean;
      }>;
    }>;
    instructor: {
      id: string;
      display_name: string;
      bio: string;
      avatar_url: string;
    };
    requirements: string[];
    what_you_learn: string[];
    target_audience: string[];
  };
}
```

### Enroll in Course

Enroll user in a course (for free courses).

```http
POST /api/courses/{courseId}/enroll
```

**Headers:**
```http
Authorization: Bearer <access-token>
```

**Response:**
```typescript
{
  success: true;
  message: "Successfully enrolled in course";
  enrollment: {
    user_id: string;
    course_id: string;
    enrolled_at: string;
    access_until: string;
  };
}
```

### Update Course Progress

Update user's progress in a course.

```http
PUT /api/courses/{courseId}/progress
```

**Request Body:**
```typescript
{
  lesson_id: string;
  progress_percentage: number;  // 0-100
  completed: boolean;
  time_spent_seconds: number;
}
```

**Response:**
```typescript
{
  success: true;
  updated_progress: {
    course_progress: number;    // Overall course progress
    lesson_progress: number;    // Specific lesson progress
    total_time_spent: number;
    completed_lessons: number;
  };
}
```

---

## 📚 Lessons API

### Update Lesson Progress

Track individual lesson progress and completion.

```http
POST /api/lessons/{lessonId}/progress
```

**Request Body:**
```typescript
{
  progress_percentage: number;  // 0-100
  time_spent_seconds: number;
  completed: boolean;
  quiz_score?: number;         // For quiz lessons
  notes?: string;              // User notes
}
```

**Response:**
```typescript
{
  success: true;
  lesson_progress: {
    lesson_id: string;
    progress_percentage: number;
    time_spent_seconds: number;
    completed: boolean;
    last_accessed: string;
    quiz_score?: number;
  };
}
```

---

## 🛒 Marketplace API

### Get Marketplace Courses

Retrieve available courses for purchase.

```http
GET /api/marketplace
```

**Query Parameters:**
- `category` (string): Filter by category
- `level` (string): Filter by difficulty level
- `price_range` (string): Filter by price range
- `search` (string): Search term
- `sort` (string): Sort order (price, rating, popularity)
- `page` (number): Page number for pagination
- `limit` (number): Items per page (max 50)

**Response:**
```typescript
{
  courses: Array<{
    id: string;
    title: string;
    short_description: string;
    thumbnail_url: string;
    level: string;
    price: number;
    original_price?: number;
    is_free: boolean;
    rating: number;
    total_students: number;
    duration_hours: number;
    instructor: {
      display_name: string;
      avatar_url: string;
    };
    category: {
      name: string;
    };
    tags: string[];
  }>;
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
```

---

## 💳 Payments API

### Create Checkout Session

Create Stripe checkout session for course/subscription purchase.

```http
POST /api/payments/create-checkout-session
```

**Request Body:**
```typescript
{
  type: 'subscription' | 'course' | 'bundle';
  planId?: string;          // For subscription type
  courseId?: string;        // For course type
  bundleId?: string;        // For bundle type
  successUrl?: string;      // Redirect after success
  cancelUrl?: string;       // Redirect after cancel
}
```

**Response:**
```typescript
{
  sessionId: string;        // Stripe session ID
  url: string;             // Checkout URL
}
```

### Create Payment Intent

Create payment intent for custom payment flow.

```http
POST /api/payments/create-payment-intent
```

**Request Body:**
```typescript
{
  amount: number;           // Amount in cents
  currency: string;         // Currency code (e.g., 'try')
  course_id?: string;       // For course purchase
  metadata?: object;        // Additional metadata
}
```

**Response:**
```typescript
{
  client_secret: string;    // For Stripe Elements
  payment_intent_id: string;
}
```

### Get Payment History

Retrieve user's payment history.

```http
GET /api/payments/history
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by payment status

**Response:**
```typescript
{
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'pending' | 'failed';
    payment_method: string;
    created_at: string;
    description: string;
    course?: {
      id: string;
      title: string;
    };
    invoice_url?: string;
  }>;
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
  };
}
```

### Get Customer Portal

Get Stripe customer portal URL for subscription management.

```http
POST /api/payments/customer-portal
```

**Response:**
```typescript
{
  url: string;             // Customer portal URL
}
```

### Get Subscriptions

Get user's active subscriptions.

```http
GET /api/payments/subscriptions
```

**Response:**
```typescript
{
  subscriptions: Array<{
    id: string;
    plan_name: string;
    status: 'active' | 'canceled' | 'past_due';
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
  }>;
}
```

---

## ⚙️ MFA (Multi-Factor Authentication) API

### Setup MFA

Initialize MFA setup for user account.

```http
POST /api/auth/mfa/setup
```

**Headers:**
```http
Authorization: Bearer <access-token>
```

**Response:**
```typescript
{
  success: true;
  qr_code: string;          // Base64 QR code image
  secret: string;           // TOTP secret for manual entry
  backup_codes: string[];   // Emergency backup codes
}
```

### Verify MFA Setup

Verify and activate MFA with TOTP code.

```http
POST /api/auth/mfa/verify-activate
```

**Request Body:**
```typescript
{
  token: string;            // TOTP code from authenticator app
}
```

**Response:**
```typescript
{
  success: true;
  message: "MFA activated successfully";
  backup_codes: string[];   // New backup codes
}
```

### Verify MFA Code

Verify MFA code during login.

```http
POST /api/auth/mfa/verify
```

**Request Body:**
```typescript
{
  token: string;            // TOTP code or backup code
  type: 'totp' | 'backup'; // Code type
}
```

**Response:**
```typescript
{
  success: true;
  message: "MFA verification successful";
}
```

---

## 🎓 Admin API

### Refund Payment

Process refund for a payment (Admin only).

```http
POST /api/admin/payments/refund
```

**Headers:**
```http
Authorization: Bearer <admin-access-token>
```

**Request Body:**
```typescript
{
  payment_intent_id: string;
  amount?: number;          // Partial refund amount
  reason?: string;          // Refund reason
}
```

**Response:**
```typescript
{
  success: true;
  refund: {
    id: string;
    amount: number;
    status: string;
    created: number;
  };
}
```

---

## 🔗 Webhooks API

### Stripe Webhook

Handle Stripe webhook events.

```http
POST /api/webhooks/stripe
```

**Headers:**
```http
Stripe-Signature: <stripe-signature>
```

**Handled Events:**
- `payment_intent.succeeded` - Payment completion
- `payment_intent.payment_failed` - Payment failure
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Subscription cancellation
- `invoice.payment_succeeded` - Recurring payment success
- `invoice.payment_failed` - Recurring payment failure

**Response:**
```typescript
{
  received: true;
}
```

---

## 📊 Error Handling

### Error Response Format

All API endpoints return errors in the following format:

```typescript
{
  success: false;
  error: string;           // Error message
  code?: string;           // Error code
  details?: object;        // Additional error details
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `409` | Conflict |
| `422` | Unprocessable Entity |
| `423` | Locked (Account locked) |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

### Common Error Codes

```typescript
// Authentication Errors
"AUTH_INVALID_CREDENTIALS"     // Invalid email/password
"AUTH_TOKEN_EXPIRED"           // JWT token expired
"AUTH_MFA_REQUIRED"            // MFA code needed
"AUTH_ACCOUNT_LOCKED"          // Account temporarily locked
"AUTH_RATE_LIMIT_EXCEEDED"     // Too many login attempts

// Course Errors
"COURSE_NOT_FOUND"             // Course doesn't exist
"COURSE_ACCESS_DENIED"         // No access to course
"COURSE_ALREADY_ENROLLED"      // Already enrolled

// Payment Errors
"PAYMENT_FAILED"               // Payment processing failed
"PAYMENT_INSUFFICIENT_FUNDS"   // Insufficient funds
"PAYMENT_CARD_DECLINED"        // Card declined
"SUBSCRIPTION_NOT_FOUND"       // Subscription doesn't exist

// General Errors
"VALIDATION_ERROR"             // Input validation failed
"INTERNAL_ERROR"               // Server error
"RATE_LIMIT_EXCEEDED"          // API rate limit exceeded
```

---

## 🔐 Security Features

### Rate Limiting

API endpoints are rate limited to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| `/api/auth/login` | 5 attempts per 15 minutes |
| `/api/auth/register` | 3 attempts per hour |
| `/api/auth/reset-password` | 3 attempts per hour |
| General API calls | 100 requests per minute |
| Payment operations | 10 requests per minute |

### Authentication Security

- **JWT Tokens**: Short-lived access tokens (1 hour default)
- **Refresh Tokens**: Long-lived refresh tokens (7 days)
- **2FA Support**: TOTP-based multi-factor authentication
- **Session Management**: Device tracking and concurrent session limits
- **Account Locking**: Automatic lockout after failed attempts

### Data Protection

- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Output encoding and CSP headers
- **HTTPS Only**: All API calls must use HTTPS
- **CORS Configuration**: Strict origin validation

---

## 📱 SDK and Client Libraries

### JavaScript/TypeScript SDK

```bash
npm install @7peducation/api-client
```

```typescript
import { EducationAPI } from '@7peducation/api-client';

const api = new EducationAPI({
  baseURL: 'https://7peducation.com/api',
  apiKey: 'your-api-key'
});

// Login
const { user, tokens } = await api.auth.login({
  email: 'student@example.com',
  password: 'password'
});

// Get courses
const courses = await api.courses.list();

// Enroll in course
await api.courses.enroll('course-id');
```

### React Hooks

```typescript
import { useAuth, useCourses } from '@7peducation/react-hooks';

function Dashboard() {
  const { user, login, logout } = useAuth();
  const { courses, loading, error } = useCourses();

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      {loading ? <p>Loading...</p> : (
        <CourseList courses={courses} />
      )}
    </div>
  );
}
```

---

## 🧪 Testing

### Postman Collection

Download our Postman collection for easy API testing:

```bash
curl -O https://7peducation.com/api/postman-collection.json
```

### Test Environment

**Base URL:** `https://staging.7peducation.com/api`

**Test Credentials:**
```
Student Account:
Email: test-student@7peducation.com
Password: TestPassword123!

Admin Account:
Email: test-admin@7peducation.com
Password: AdminPassword123!
```

### API Key Testing

For testing purposes, you can use API keys instead of JWT tokens:

```http
Authorization: Bearer test_pk_1234567890abcdef
```

---

## 📊 Rate Limits and Quotas

### Free Tier Limits

- **API Calls**: 1,000 requests per day
- **Course Access**: 3 free courses
- **Storage**: 100MB file uploads
- **Support**: Community forum only

### Premium Tier Limits

- **API Calls**: 10,000 requests per day
- **Course Access**: Unlimited
- **Storage**: 5GB file uploads
- **Support**: Email support (24h response)

### Enterprise Tier

- **API Calls**: Unlimited
- **Course Access**: Unlimited + custom content
- **Storage**: Unlimited
- **Support**: Priority support (4h response) + phone

---

## 📚 Additional Resources

### API Documentation Tools

- **Swagger UI**: https://7peducation.com/api/docs
- **Redoc**: https://7peducation.com/api/redoc
- **OpenAPI Spec**: https://7peducation.com/api/openapi.json

### Developer Resources

- **Developer Portal**: https://developers.7peducation.com
- **Community Forum**: https://community.7peducation.com
- **GitHub Examples**: https://github.com/7peducation/api-examples
- **Status Page**: https://status.7peducation.com

### Support

- **API Support**: api-support@7peducation.com
- **Bug Reports**: bugs@7peducation.com
- **Feature Requests**: features@7peducation.com
- **Emergency**: +90 XXX XXX XXXX (Enterprise only)

---

## 📈 Changelog

### Version 1.0 (August 2025)
- Initial API release
- Authentication with JWT + 2FA
- Course management endpoints
- Payment processing with Stripe
- Webhook support
- Rate limiting implementation

### Upcoming Features
- **v1.1**: WebSocket support for real-time features
- **v1.2**: Advanced analytics APIs
- **v1.3**: Bulk operations support
- **v1.4**: GraphQL endpoint

---

**🎯 Getting Started:** Begin with authentication endpoints, then explore course management. Use our Postman collection for quick testing and refer to the SDK documentation for integration examples.

**📞 Need Help?** Contact our API support team or visit our developer community for assistance with integration and best practices.

---

**📅 Last Updated:** August 2025  
**📄 Version:** 1.0  
**🔗 Base URL:** https://7peducation.com/api