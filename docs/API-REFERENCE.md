# 7P Education - API Reference

> Complete REST API documentation with examples

## 🎯 API Overview

- **Base URL**: `https://your-domain.vercel.app/api`
- **Authentication**: NextAuth session-based
- **Rate Limiting**: Varies by endpoint (5-100 req/min)
- **Response Format**: JSON

## 🔐 Authentication APIs

### POST `/api/auth/login`
Direct login with credentials.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "student"
  },
  "sessionToken": "jwt_token"
}
```

**cURL Example**:
```bash
curl -X POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'
```

### POST `/api/auth/register`  
User registration.

**Request**:
```json
{
  "email": "new@example.com",
  "password": "securepass123",
  "name": "John Doe"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "new@example.com"
  }
}
```

## 💳 Payment APIs (PAYMENTS_MODE=stripe)

### POST `/api/payments/create-checkout-session`
Create Stripe checkout session.

**Headers**: `Authorization: Bearer session_token`

**Request**:
```json
{
  "type": "course",
  "courseId": "course-uuid",
  "successUrl": "https://app.com/success",
  "cancelUrl": "https://app.com/cancel"
}
```

**Success Response (200)**:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

**Error Response (501) - Payments Disabled**:
```json
{
  "success": false,
  "message": "payments_disabled",
  "error": "Payment processing is currently disabled"
}
```

## 🎓 Course APIs

### GET `/api/courses`
List all published courses.

**Query Parameters**:
- `search` (optional): Search term
- `category` (optional): Course category
- `limit` (optional): Max results (default: 20)

**Success Response (200)**:
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "Introduction to React",
      "description": "Learn React basics",
      "instructor": {
        "id": "uuid",
        "name": "Jane Instructor"
      },
      "price": 9900,
      "currency": "USD",
      "published": true,
      "createdAt": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20
}
```

### GET `/api/courses/[courseId]`
Get course details.

**Success Response (200)**:
```json
{
  "id": "uuid",
  "title": "Introduction to React",
  "description": "Learn React from scratch",
  "modules": [
    {
      "id": "uuid",
      "title": "Getting Started",
      "lessons": [
        {
          "id": "uuid", 
          "title": "What is React?",
          "videoUrl": "https://video.url",
          "materials": [
            {
              "id": "uuid",
              "title": "React Slides",
              "fileUrl": "https://file.url",
              "fileType": "pdf"
            }
          ]
        }
      ]
    }
  ],
  "instructor": {
    "name": "Jane Instructor"
  }
}
```

## 🆓 Enrollment APIs

### POST `/api/enroll/free`
Free course enrollment.

**Headers**: `Authorization: Bearer session_token`  
**Rate Limit**: 5 requests/minute

**Request**:
```json
{
  "courseId": "course-uuid",
  "code": "BETA2025"  // Optional if FREE_ENROLLMENT_CODE is set
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Successfully enrolled in course",
  "enrollment": {
    "id": "enrollment-uuid",
    "courseId": "course-uuid", 
    "userId": "user-uuid",
    "plan": "free",
    "status": "active",
    "enrolledAt": "2025-01-27T10:30:00Z"
  }
}
```

**Error Responses**:
```json
// 429 Rate Limited
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}

// 403 Invalid Code  
{
  "success": false,
  "error": "Invalid or missing enrollment code"
}

// 409 Already Enrolled
{
  "success": false, 
  "error": "Already enrolled in this course"
}
```

## 👨‍🎓 Student APIs

### GET `/api/student/progress`
Get student's overall progress.

**Headers**: `Authorization: Bearer session_token`

**Success Response (200)**:
```json
{
  "enrollments": [
    {
      "courseId": "uuid",
      "courseTitle": "React Basics",
      "progress": 75,
      "lastAccessed": "2025-01-27T09:00:00Z",
      "completed": false
    }
  ],
  "stats": {
    "totalEnrollments": 3,
    "completedCourses": 1,
    "averageProgress": 68
  }
}
```

### POST `/api/student/progress/lesson`
Update lesson progress.

**Request**:
```json
{
  "lessonId": "lesson-uuid",
  "completed": true,
  "watchedDuration": 180  // seconds
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "progress": {
    "lessonId": "lesson-uuid",
    "completed": true,
    "completedAt": "2025-01-27T10:45:00Z"
  },
  "courseProgress": 85  // Updated course progress percentage
}
```

## 👑 Admin APIs

### GET `/api/admin/courses`
Admin course management.

**Headers**: `Authorization: Bearer admin_session_token`

**Success Response (200)**:
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "Course Title", 
      "published": true,
      "enrollments": 150,
      "revenue": 14850,
      "instructor": {
        "name": "Instructor Name"
      }
    }
  ],
  "stats": {
    "totalCourses": 25,
    "publishedCourses": 18,
    "totalRevenue": 285000
  }
}
```

### POST `/api/admin/qna/[id]/reply`
Admin reply to Q&A.

**Request**:
```json
{
  "reply": "Here's the answer to your question..."
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "reply": {
    "id": "reply-uuid",
    "content": "Here's the answer...",
    "authorRole": "admin",
    "createdAt": "2025-01-27T11:00:00Z"
  }
}
```

## ⚙️ System APIs

### GET `/api/health`
System health check.

**Success Response (200)**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T11:15:00Z",
  "environment": "production",
  "paymentsMode": "disabled",
  "checks": {
    "basic": true,
    "memory": true,
    "stripe": null
  },
  "metrics": {
    "responseTime": 45,
    "memoryUsage": 128
  }
}
```

**Unhealthy Response (503)**:
```json
{
  "status": "unhealthy", 
  "checks": {
    "basic": true,
    "memory": false  // Memory usage too high
  }
}
```

### GET `/api/diag`
System diagnostics (development).

**Success Response (200)**:
```json
{
  "environment": {
    "NODE_ENV": "development",
    "PAYMENTS_MODE": "disabled"
  },
  "database": {
    "connected": true,
    "tables": ["users", "courses", "enrollments"]
  },
  "features": {
    "paymentsEnabled": false,
    "freeEnrollmentEnabled": true
  }
}
```

## 🔗 Webhooks

### POST `/api/webhooks/stripe`
Stripe webhook handler.

**Headers**: 
- `Stripe-Signature: webhook_signature`
- `Content-Type: application/json`

**Request**: Raw Stripe webhook payload

**Success Response (200)**:
```json
{
  "received": true
}
```

**Error Response (400)**:
```json
{
  "error": "Invalid signature"
}
```

## 📊 Error Codes & Messages

### Standard HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |  
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 501 | Not Implemented | Feature disabled (payments) |

### Custom Error Responses

```json
// Authentication Error
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}

// Validation Error  
{
  "success": false,
  "error": "Invalid course ID format",
  "field": "courseId",
  "code": "VALIDATION_ERROR"
}

// Rate Limit Error
{
  "success": false, 
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60,
  "code": "RATE_LIMITED"
}
```

## 🧪 Testing Examples

### Testing with cURL

```bash
# Test health endpoint
curl -X GET http://localhost:3000/api/health

# Test course listing  
curl -X GET "http://localhost:3000/api/courses?limit=5"

# Test authenticated endpoint
curl -X GET http://localhost:3000/api/student/progress \
  -H "Cookie: next-auth.session-token=your_session_token"

# Test free enrollment
curl -X POST http://localhost:3000/api/enroll/free \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your_session_token" \
  -d '{"courseId":"course-uuid","code":"BETA2025"}'
```

### Testing with JavaScript

```javascript
// API client example
class API {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }
  
  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      credentials: 'include', // Include session cookie
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  // Course methods
  async getCourses(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/courses${query ? '?' + query : ''}`);
  }
  
  async enrollFree(courseId, code) {
    return this.request('/enroll/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, code })
    });
  }
}

// Usage
const api = new API();
const courses = await api.getCourses({ limit: 10 });
```

---

**Related Docs**: [ROUTEMAP.md](./ROUTEMAP.md) | [AUTH.md](./AUTH.md) | [PAYMENTS.md](./PAYMENTS.md)  
*Last updated: 2025-01-27*