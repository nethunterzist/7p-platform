# Performance Optimization Guide for 7P Education Platform

## Overview and Performance Philosophy

Performance optimization is critical for educational platforms where user experience directly impacts learning outcomes. The 7P Education Platform implements a comprehensive performance strategy covering frontend optimization, backend scaling, database tuning, caching strategies, and infrastructure optimization to deliver sub-second response times and seamless user experiences.

### Performance Objectives

**Response Time Targets**
- **Page Load Time**: <2 seconds on 3G networks, <1 second on WiFi
- **API Response Time**: <200ms for standard queries, <500ms for complex operations
- **Database Query Time**: <50ms for simple queries, <200ms for complex analytics
- **Video Streaming**: <3 seconds to first frame, <1 second buffer time

**Scalability Targets**
- **Concurrent Users**: Support 10,000+ simultaneous active users
- **Database Connections**: Handle 1,000+ concurrent database connections
- **Request Throughput**: Process 50,000+ requests per minute
- **Storage Performance**: 3,000+ IOPS for database operations

**Resource Efficiency Targets**
- **CPU Utilization**: <70% average, <90% peak across application servers
- **Memory Usage**: <80% average, <95% peak across all services
- **Network Bandwidth**: <80% of available bandwidth during peak usage
- **Cost Optimization**: 30% improvement in performance per dollar spent

## Frontend Performance Optimization

### Next.js Application Optimization

**Build Configuration Optimization**
```javascript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  swcMinify: true,
  compress: true,
  
  // Image optimization
  images: {
    domains: ['cdn.education.example.com', 's3.amazonaws.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Experimental features for performance
  experimental: {
    esmExternals: true,
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'lodash-es'
    ],
  },
  
  // Bundle analyzer for development
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle optimization
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
            enforce: true,
          },
          styles: {
            name: 'styles',
            test: /\.(css|scss|sass)$/,
            chunks: 'all',
            enforce: true,
          },
        },
      },
    };
    
    // Production optimizations
    if (!dev && !isServer) {
      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Compression
      const CompressionPlugin = require('compression-webpack-plugin');
      config.plugins.push(
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
        }),
        new CompressionPlugin({
          filename: '[path][base].br',
          algorithm: 'brotliCompress',
          test: /\.(js|css|html|svg)$/,
          compressionOptions: {
            params: {
              [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11,
            },
          },
          threshold: 8192,
          minRatio: 0.8,
        })
      );
    }
    
    // Bundle analyzer in development
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      );
    }
    
    return config;
  },
  
  // HTTP headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
        ],
      },
    ];
  },
  
  // Rewrites for API optimization
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health',
      },
      {
        source: '/api/metrics',
        destination: '/api/metrics',
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
});
```

**React Component Optimization**
```typescript
// components/optimized/CourseCard.tsx
import React, { memo, useMemo, lazy, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useVirtualizer } from '@tanstack/react-virtual';

// Lazy load heavy components
const CourseVideo = lazy(() => import('./CourseVideo'));
const CourseAnalytics = lazy(() => import('./CourseAnalytics'));

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    instructor: string;
    duration: number;
    enrollmentCount: number;
    rating: number;
    price: number;
  };
  onEnroll: (courseId: string) => void;
  isVisible: boolean;
}

// Memoized course card component
const CourseCard = memo<CourseCardProps>(({ course, onEnroll, isVisible }) => {
  // Memoize expensive calculations
  const formattedDuration = useMemo(() => {
    const hours = Math.floor(course.duration / 3600);
    const minutes = Math.floor((course.duration % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }, [course.duration]);
  
  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(course.price);
  }, [course.price]);
  
  // Optimize click handler
  const handleEnrollClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onEnroll(course.id);
  }, [course.id, onEnroll]);
  
  // Don't render if not visible (for virtualization)
  if (!isVisible) {
    return <div style={{ height: '320px' }} />;
  }
  
  return (
    <article className="course-card" data-testid={`course-${course.id}`}>
      <div className="course-thumbnail">
        <Image
          src={course.thumbnail}
          alt={`${course.title} thumbnail`}
          width={320}
          height={180}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          className="object-cover rounded-lg"
        />
      </div>
      
      <div className="course-content">
        <h3 className="course-title">
          <Link href={`/courses/${course.id}`}>
            {course.title}
          </Link>
        </h3>
        
        <p className="course-description">{course.description}</p>
        
        <div className="course-meta">
          <span className="instructor">{course.instructor}</span>
          <span className="duration">{formattedDuration}</span>
          <span className="rating">⭐ {course.rating.toFixed(1)}</span>
          <span className="enrollment">{course.enrollmentCount} students</span>
        </div>
        
        <div className="course-actions">
          <span className="price">{formattedPrice}</span>
          <button
            onClick={handleEnrollClick}
            className="enroll-button"
            aria-label={`Enroll in ${course.title}`}
          >
            Enroll Now
          </button>
        </div>
      </div>
      
      {/* Lazy load heavy components when needed */}
      <Suspense fallback={<div className="loading-placeholder" />}>
        <CourseVideo courseId={course.id} />
      </Suspense>
    </article>
  );
});

CourseCard.displayName = 'CourseCard';

export default CourseCard;

// Virtualized course list for performance
export const VirtualizedCourseList: React.FC<{
  courses: CourseCardProps['course'][];
  onEnroll: (courseId: string) => void;
}> = ({ courses, onEnroll }) => {
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: courses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320,
    overscan: 5,
  });
  
  return (
    <div
      ref={parentRef}
      className="virtual-list-container"
      style={{
        height: '600px',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const course = courses[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <CourseCard
                course={course}
                onEnroll={onEnroll}
                isVisible={true}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

**State Management Optimization**
```typescript
// lib/store/optimized-store.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';

// Optimized store with selectors and middleware
export interface AppState {
  // User state
  user: {
    id: string;
    name: string;
    email: string;
    preferences: UserPreferences;
  } | null;
  
  // Course state
  courses: {
    data: Course[];
    loading: boolean;
    error: string | null;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
  
  // Performance tracking
  performance: {
    pageLoadTime: number;
    apiResponseTimes: Record<string, number>;
    renderTimes: Record<string, number>;
  };
}

export interface AppActions {
  // User actions
  setUser: (user: AppState['user']) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  
  // Course actions
  setCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Performance actions
  recordPageLoadTime: (time: number) => void;
  recordApiResponseTime: (endpoint: string, time: number) => void;
  recordRenderTime: (component: string, time: number) => void;
}

// Create optimized store with middleware
export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        user: null,
        courses: {
          data: [],
          loading: false,
          error: null,
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
          },
        },
        performance: {
          pageLoadTime: 0,
          apiResponseTimes: {},
          renderTimes: {},
        },
        
        // Actions
        setUser: (user) =>
          set((state) => {
            state.user = user;
          }),
          
        updateUserPreferences: (preferences) =>
          set((state) => {
            if (state.user) {
              state.user.preferences = { ...state.user.preferences, ...preferences };
            }
          }),
          
        setCourses: (courses) =>
          set((state) => {
            state.courses.data = courses;
            state.courses.loading = false;
            state.courses.error = null;
          }),
          
        addCourse: (course) =>
          set((state) => {
            state.courses.data.push(course);
          }),
          
        updateCourse: (id, updates) =>
          set((state) => {
            const index = state.courses.data.findIndex((course) => course.id === id);
            if (index !== -1) {
              state.courses.data[index] = { ...state.courses.data[index], ...updates };
            }
          }),
          
        setLoading: (loading) =>
          set((state) => {
            state.courses.loading = loading;
          }),
          
        setError: (error) =>
          set((state) => {
            state.courses.error = error;
            state.courses.loading = false;
          }),
          
        recordPageLoadTime: (time) =>
          set((state) => {
            state.performance.pageLoadTime = time;
          }),
          
        recordApiResponseTime: (endpoint, time) =>
          set((state) => {
            state.performance.apiResponseTimes[endpoint] = time;
          }),
          
        recordRenderTime: (component, time) =>
          set((state) => {
            state.performance.renderTimes[component] = time;
          }),
      })),
      {
        name: 'education-platform-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          courses: {
            data: state.courses.data.slice(0, 100), // Limit stored courses
            pagination: state.courses.pagination,
          },
        }),
      }
    )
  )
);

// Optimized selectors to prevent unnecessary re-renders
export const useUser = () => useAppStore((state) => state.user);
export const useCourses = () => useAppStore((state) => state.courses.data);
export const useCoursesLoading = () => useAppStore((state) => state.courses.loading);
export const useCoursesError = () => useAppStore((state) => state.courses.error);
export const usePerformanceMetrics = () => useAppStore((state) => state.performance);

// Selective course selector to avoid re-renders
export const useCourse = (courseId: string) =>
  useAppStore((state) => state.courses.data.find((course) => course.id === courseId));

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const recordPageLoadTime = useAppStore((state) => state.recordPageLoadTime);
  const recordApiResponseTime = useAppStore((state) => state.recordApiResponseTime);
  const recordRenderTime = useAppStore((state) => state.recordRenderTime);
  
  React.useEffect(() => {
    // Record page load time
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const loadTime = navigationEntry.loadEventEnd - navigationEntry.navigationStart;
      recordPageLoadTime(loadTime);
    }
  }, [recordPageLoadTime]);
  
  return {
    recordApiResponseTime,
    recordRenderTime,
  };
};
```

### CDN and Static Asset Optimization

**CDN Configuration**
```yaml
# terraform/modules/cdn/main.tf
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = var.origin_domain_name
    origin_id   = "education-platform-origin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  # Additional origin for static assets
  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_domain_name
    origin_id   = "education-platform-s3-origin"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.static_assets.cloudfront_access_identity_path
    }
  }
  
  enabled = true
  is_ipv6_enabled = true
  comment = "Education Platform CDN"
  default_root_object = "index.html"
  
  aliases = [var.domain_name, "www.${var.domain_name}"]
  
  # Default cache behavior for dynamic content
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "education-platform-origin"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "CloudFront-Forwarded-Proto", "Host"]
      
      cookies {
        forward = "whitelist"
        whitelisted_names = ["session", "csrf-token"]
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400   # 1 day
    max_ttl                = 31536000 # 1 year
    compress               = true
  }
  
  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "education-platform-s3-origin"
    
    forwarded_values {
      query_string = false
      headers      = []
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400     # 1 day
    default_ttl            = 31536000  # 1 year
    max_ttl                = 31536000  # 1 year
    compress               = true
  }
  
  # Cache behavior for Next.js static assets
  ordered_cache_behavior {
    path_pattern     = "/_next/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "education-platform-origin"
    
    forwarded_values {
      query_string = false
      headers      = []
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 31536000  # 1 year
    default_ttl            = 31536000  # 1 year
    max_ttl                = 31536000  # 1 year
    compress               = true
  }
  
  # Cache behavior for API endpoints
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "education-platform-origin"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Accept"]
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 86400
    compress               = true
  }
  
  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  # SSL certificate
  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  # Custom error pages
  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
    error_caching_min_ttl = 300
  }
  
  custom_error_response {
    error_code         = 500
    response_code      = 500
    response_page_path = "/500.html"
    error_caching_min_ttl = 60
  }
  
  # Logging
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.logs.bucket_domain_name
    prefix          = "cloudfront-logs/"
  }
  
  tags = var.common_tags
}

# S3 bucket for static assets
resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.project_name}-${var.environment}-static-assets"
  
  tags = var.common_tags
}

resource "aws_s3_bucket_versioning" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "static_assets" {
  comment = "OAI for static assets bucket"
}

# S3 bucket policy for CloudFront access
resource "aws_s3_bucket_policy" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  policy = jsonencode({
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.static_assets.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
      }
    ]
  })
}
```

## Backend Performance Optimization

### Node.js API Optimization

**Express.js Performance Configuration**
```typescript
// src/server/performance-config.ts
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { createClient } from 'redis';
import RedisStore from 'rate-limit-redis';

export class PerformanceMiddleware {
  private redisClient: ReturnType<typeof createClient>;
  
  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });
  }
  
  // Compression middleware with intelligent content-type detection
  compression() {
    return compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        
        // Compress based on content type
        const contentType = res.getHeader('content-type') as string;
        if (contentType) {
          return /json|text|javascript|css|xml|svg/.test(contentType);
        }
        
        return compression.filter(req, res);
      },
      level: 6, // Balanced compression level
      threshold: 1024, // Only compress responses > 1KB
      windowBits: 15,
      memLevel: 8,
    });
  }
  
  // Security headers with performance considerations
  security() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https://cdn.education.example.com"],
          scriptSrc: ["'self'", "'unsafe-eval'"], // Required for Next.js
          connectSrc: ["'self'", "https://api.education.example.com"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });
  }
  
  // CORS with caching
  cors() {
    return cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'https://education.example.com',
          'https://www.education.example.com',
          'https://admin.education.example.com',
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
      maxAge: 86400, // Cache preflight for 24 hours
    });
  }
  
  // Intelligent rate limiting
  rateLimit() {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args: string[]) => this.redisClient.sendCommand(args),
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: (req) => {
        // Different limits based on endpoint and user type
        if (req.path.startsWith('/api/auth')) {
          return 5; // Strict limit for auth endpoints
        }
        if (req.path.startsWith('/api/upload')) {
          return 10; // Limited uploads
        }
        if (req.user?.type === 'premium') {
          return 1000; // Higher limit for premium users
        }
        return 100; // Default limit
      },
      message: {
        error: 'Too many requests, please try again later.',
        retryAfter: 15 * 60,
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
      },
    });
  }
  
  // Progressive delay for repeated requests
  slowDown() {
    return slowDown({
      store: new RedisStore({
        sendCommand: (...args: string[]) => this.redisClient.sendCommand(args),
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // Allow 50 requests per window without delay
      delayMs: 100, // Add 100ms delay per request after delayAfter
      maxDelayMs: 2000, // Maximum delay of 2 seconds
    });
  }
  
  // Request/response optimization
  optimization() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Remove unnecessary headers
      res.removeHeader('X-Powered-By');
      
      // Add performance headers
      res.set('X-Response-Time', Date.now().toString());
      
      // Enable HTTP/2 server push for critical resources
      if (req.httpVersion === '2.0' && req.path === '/') {
        res.set('Link', [
          '</static/css/critical.css>; rel=preload; as=style',
          '</static/js/runtime.js>; rel=preload; as=script',
          '</api/user/profile>; rel=prefetch',
        ].join(', '));
      }
      
      // Optimize JSON responses
      const originalJson = res.json;
      res.json = function(obj) {
        // Remove null values to reduce payload size
        const cleanObj = JSON.parse(JSON.stringify(obj, (key, value) => 
          value === null ? undefined : value
        ));
        
        return originalJson.call(this, cleanObj);
      };
      
      next();
    };
  }
  
  // Connection pooling and keep-alive
  keepAlive() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.set('Connection', 'keep-alive');
      res.set('Keep-Alive', 'timeout=5, max=1000');
      next();
    };
  }
}

// Application setup with performance middleware
export function setupPerformanceMiddleware(app: express.Application) {
  const performanceMiddleware = new PerformanceMiddleware();
  
  // Apply middleware in optimal order
  app.use(performanceMiddleware.security());
  app.use(performanceMiddleware.compression());
  app.use(performanceMiddleware.cors());
  app.use(performanceMiddleware.optimization());
  app.use(performanceMiddleware.keepAlive());
  app.use(performanceMiddleware.rateLimit());
  app.use(performanceMiddleware.slowDown());
  
  // Request logging with performance metrics
  app.use((req, res, next) => {
    const startTime = process.hrtime.bigint();
    
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      console.log({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
    });
    
    next();
  });
}
```

**Database Connection Optimization**
```typescript
// src/lib/database/optimized-pool.ts
import { Pool, PoolConfig } from 'pg';
import { createClient } from 'redis';

export class OptimizedDatabasePool {
  private pool: Pool;
  private redisClient: ReturnType<typeof createClient>;
  private connectionMetrics: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingClients: number;
  };
  
  constructor() {
    // Optimized PostgreSQL connection pool
    const poolConfig: PoolConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      
      // Connection pool optimization
      min: 5, // Minimum connections
      max: 50, // Maximum connections based on RDS limits
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // 5s connection timeout
      
      // Query optimization
      statement_timeout: 30000, // 30s query timeout
      query_timeout: 30000,
      
      // SSL configuration
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
      } : false,
      
      // Application name for monitoring
      application_name: 'education-platform',
    };
    
    this.pool = new Pool(poolConfig);
    
    // Connection pool event handlers
    this.pool.on('connect', (client) => {
      console.log('New database connection established');
      this.updateConnectionMetrics();
    });
    
    this.pool.on('error', (err, client) => {
      console.error('Database connection error:', err);
      this.updateConnectionMetrics();
    });
    
    this.pool.on('remove', (client) => {
      console.log('Database connection removed');
      this.updateConnectionMetrics();
    });
    
    // Redis client for caching
    this.redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });
    
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
    };
  }
  
  // Optimized query execution with caching
  async query<T = any>(
    text: string,
    params?: any[],
    options?: {
      cacheKey?: string;
      cacheTTL?: number;
      readonly?: boolean;
    }
  ): Promise<T[]> {
    const { cacheKey, cacheTTL = 300, readonly = false } = options || {};
    
    // Check cache first for read-only queries
    if (cacheKey && readonly) {
      const cached = await this.getFromCache<T[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const startTime = process.hrtime.bigint();
    
    try {
      // Use read replica for read-only queries in production
      const client = readonly && process.env.READ_REPLICA_URL 
        ? await this.getReadReplicaClient() 
        : await this.pool.connect();
      
      try {
        const result = await client.query(text, params);
        
        // Cache the result if cache key provided
        if (cacheKey && readonly) {
          await this.setCache(cacheKey, result.rows, cacheTTL);
        }
        
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Database query error:', {
        query: text,
        params,
        error: error.message,
      });
      throw error;
    } finally {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn('Slow query detected:', {
          query: text,
          duration: `${duration.toFixed(2)}ms`,
          params: params?.length,
        });
      }
    }
  }
  
  // Transaction support with retry logic
  async transaction<T>(
    queries: Array<{ text: string; params?: any[] }>,
    retries = 3
  ): Promise<T[]> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results: T[] = [];
      
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result.rows);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Retry logic for transient failures
      if (retries > 0 && this.isTransientError(error)) {
        console.warn(`Transaction failed, retrying... (${retries} attempts left)`);
        await this.delay(100 * (4 - retries)); // Exponential backoff
        return this.transaction(queries, retries - 1);
      }
      
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Bulk operations optimization
  async bulkInsert<T>(
    table: string,
    columns: string[],
    data: T[][],
    options?: {
      onConflict?: string;
      returning?: string[];
    }
  ): Promise<T[]> {
    const { onConflict, returning } = options || {};
    
    if (data.length === 0) return [];
    
    // Use COPY for large datasets (>1000 rows)
    if (data.length > 1000) {
      return this.bulkCopy(table, columns, data);
    }
    
    // Generate parameterized query
    const placeholders = data.map((_, index) => {
      const start = index * columns.length + 1;
      const end = start + columns.length - 1;
      return `(${Array.from({ length: columns.length }, (_, i) => `$${start + i}`).join(', ')})`;
    }).join(', ');
    
    const values = data.flat();
    
    let query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
    
    if (onConflict) {
      query += ` ${onConflict}`;
    }
    
    if (returning && returning.length > 0) {
      query += ` RETURNING ${returning.join(', ')}`;
    }
    
    const result = await this.query<T>(query, values);
    return result;
  }
  
  // Optimized bulk copy for large datasets
  private async bulkCopy<T>(
    table: string,
    columns: string[],
    data: T[][]
  ): Promise<T[]> {
    const client = await this.pool.connect();
    
    try {
      const copyQuery = `COPY ${table} (${columns.join(', ')}) FROM STDIN WITH CSV`;
      const stream = client.query(copyQuery);
      
      // Convert data to CSV format
      for (const row of data) {
        const csvRow = row.map(value => 
          value === null ? '' : `"${String(value).replace(/"/g, '""')}"`
        ).join(',');
        stream.write(csvRow + '\n');
      }
      
      await stream.end();
      return data as T[];
    } finally {
      client.release();
    }
  }
  
  // Cache operations
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }
  
  private async setCache(key: string, value: any, ttl: number): Promise<void> {
    try {
      await this.redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }
  
  // Connection metrics
  private updateConnectionMetrics(): void {
    this.connectionMetrics = {
      totalConnections: this.pool.totalCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
    };
  }
  
  getConnectionMetrics() {
    this.updateConnectionMetrics();
    return this.connectionMetrics;
  }
  
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
  
  // Graceful shutdown
  async close(): Promise<void> {
    await Promise.all([
      this.pool.end(),
      this.redisClient.quit(),
    ]);
  }
  
  // Utility methods
  private isTransientError(error: any): boolean {
    const transientErrors = [
      'connection timeout',
      'connection reset',
      'temporary failure',
      'lock timeout',
    ];
    
    return transientErrors.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async getReadReplicaClient() {
    // Implementation for read replica connection
    // This would use a separate pool for read replicas
    return this.pool.connect();
  }
}

// Singleton instance
export const db = new OptimizedDatabasePool();
```

## Database Performance Optimization

### PostgreSQL Query Optimization

**Advanced Indexing Strategy**
```sql
-- indexes-optimization.sql
-- Comprehensive indexing strategy for education platform

-- User table indexes
CREATE INDEX CONCURRENTLY idx_users_email_active 
ON users (email) 
WHERE active = true;

CREATE INDEX CONCURRENTLY idx_users_created_at_desc 
ON users (created_at DESC);

CREATE INDEX CONCURRENTLY idx_users_last_login 
ON users (last_login) 
WHERE last_login IS NOT NULL;

-- Course table indexes
CREATE INDEX CONCURRENTLY idx_courses_published_category 
ON courses (category_id, published_at) 
WHERE published = true;

CREATE INDEX CONCURRENTLY idx_courses_instructor_published 
ON courses (instructor_id, published_at DESC) 
WHERE published = true;

CREATE INDEX CONCURRENTLY idx_courses_search_vector 
ON courses USING gin(search_vector);

-- Full-text search index for courses
ALTER TABLE courses 
ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION update_course_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.tags, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_search_vector_trigger
BEFORE INSERT OR UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_course_search_vector();

-- Enrollment table indexes
CREATE INDEX CONCURRENTLY idx_enrollments_user_course 
ON enrollments (user_id, course_id);

CREATE INDEX CONCURRENTLY idx_enrollments_course_enrolled 
ON enrollments (course_id, enrolled_at DESC);

CREATE INDEX CONCURRENTLY idx_enrollments_user_progress 
ON enrollments (user_id, progress) 
WHERE progress > 0;

-- Video progress table with partitioning
CREATE TABLE video_progress (
  id SERIAL,
  user_id INTEGER NOT NULL,
  video_id INTEGER NOT NULL,
  progress_seconds INTEGER DEFAULT 0,
  watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for video progress
CREATE TABLE video_progress_2024_01 PARTITION OF video_progress
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE video_progress_2024_02 PARTITION OF video_progress
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Continue creating partitions...

-- Indexes on partitioned table
CREATE INDEX idx_video_progress_user_video 
ON video_progress (user_id, video_id, watched_at DESC);

CREATE INDEX idx_video_progress_video_recent 
ON video_progress (video_id, watched_at DESC) 
WHERE watched_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Analytics and reporting indexes
CREATE MATERIALIZED VIEW course_analytics AS
SELECT 
  c.id as course_id,
  c.title,
  COUNT(DISTINCT e.user_id) as total_enrollments,
  AVG(e.progress) as average_progress,
  COUNT(DISTINCT CASE WHEN e.progress >= 100 THEN e.user_id END) as completions,
  AVG(r.rating) as average_rating,
  COUNT(r.id) as total_reviews,
  c.created_at,
  CURRENT_TIMESTAMP as refreshed_at
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN reviews r ON c.id = r.course_id
WHERE c.published = true
GROUP BY c.id, c.title, c.created_at;

CREATE UNIQUE INDEX idx_course_analytics_course_id 
ON course_analytics (course_id);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_course_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY course_analytics;
END;
$$ LANGUAGE plpgsql;

-- Schedule regular refresh (to be called by cron job)
-- SELECT cron.schedule('refresh-analytics', '0 */6 * * *', 'SELECT refresh_course_analytics();');

-- Query optimization functions
CREATE OR REPLACE FUNCTION get_user_dashboard_data(p_user_id INTEGER)
RETURNS TABLE (
  enrolled_courses_count INTEGER,
  in_progress_courses_count INTEGER,
  completed_courses_count INTEGER,
  total_watch_time_seconds INTEGER,
  recent_activity JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      COUNT(*) as enrolled_count,
      COUNT(CASE WHEN e.progress > 0 AND e.progress < 100 THEN 1 END) as in_progress_count,
      COUNT(CASE WHEN e.progress >= 100 THEN 1 END) as completed_count
    FROM enrollments e
    WHERE e.user_id = p_user_id
  ),
  watch_time AS (
    SELECT COALESCE(SUM(vp.progress_seconds), 0) as total_seconds
    FROM video_progress vp
    WHERE vp.user_id = p_user_id
      AND vp.watched_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  ),
  recent_activity AS (
    SELECT json_agg(
      json_build_object(
        'course_id', e.course_id,
        'course_title', c.title,
        'progress', e.progress,
        'last_accessed', e.last_accessed_at
      ) ORDER BY e.last_accessed_at DESC
    ) as activities
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = p_user_id
      AND e.last_accessed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
    LIMIT 10
  )
  SELECT 
    us.enrolled_count::INTEGER,
    us.in_progress_count::INTEGER,
    us.completed_count::INTEGER,
    wt.total_seconds::INTEGER,
    COALESCE(ra.activities, '[]'::jsonb)
  FROM user_stats us
  CROSS JOIN watch_time wt
  CROSS JOIN recent_activity ra;
END;
$$ LANGUAGE plpgsql;

-- Course search optimization
CREATE OR REPLACE FUNCTION search_courses(
  search_query TEXT DEFAULT '',
  category_filter INTEGER DEFAULT NULL,
  difficulty_filter TEXT DEFAULT NULL,
  price_filter TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  page_offset INTEGER DEFAULT 0,
  page_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  course_id INTEGER,
  title TEXT,
  description TEXT,
  instructor_name TEXT,
  category_name TEXT,
  difficulty TEXT,
  price DECIMAL,
  rating NUMERIC,
  enrollment_count INTEGER,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  relevance_score REAL
) AS $$
DECLARE
  search_vector_query tsquery;
BEGIN
  -- Prepare search query
  IF search_query != '' THEN
    search_vector_query := plainto_tsquery('english', search_query);
  END IF;
  
  RETURN QUERY
  WITH filtered_courses AS (
    SELECT 
      c.id,
      c.title,
      c.description,
      u.name as instructor_name,
      cat.name as category_name,
      c.difficulty,
      c.price,
      COALESCE(ca.average_rating, 0) as rating,
      COALESCE(ca.total_enrollments, 0) as enrollment_count,
      c.duration_seconds,
      c.thumbnail_url,
      CASE 
        WHEN search_query != '' THEN ts_rank(c.search_vector, search_vector_query)
        ELSE 1.0
      END as relevance_score
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN course_analytics ca ON c.id = ca.course_id
    WHERE c.published = true
      AND (search_query = '' OR c.search_vector @@ search_vector_query)
      AND (category_filter IS NULL OR c.category_id = category_filter)
      AND (difficulty_filter IS NULL OR c.difficulty = difficulty_filter)
      AND (
        price_filter IS NULL OR
        (price_filter = 'free' AND c.price = 0) OR
        (price_filter = 'paid' AND c.price > 0)
      )
  )
  SELECT 
    fc.id,
    fc.title,
    fc.description,
    fc.instructor_name,
    fc.category_name,
    fc.difficulty,
    fc.price,
    fc.rating,
    fc.enrollment_count,
    fc.duration_seconds,
    fc.thumbnail_url,
    fc.relevance_score
  FROM filtered_courses fc
  ORDER BY 
    CASE 
      WHEN sort_by = 'relevance' THEN fc.relevance_score
      WHEN sort_by = 'rating' THEN fc.rating
      WHEN sort_by = 'enrollment' THEN fc.enrollment_count::REAL
      WHEN sort_by = 'newest' THEN EXTRACT(EPOCH FROM c.created_at)::REAL
      ELSE fc.relevance_score
    END DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$ LANGUAGE plpgsql;
```

### Connection Pooling and Caching

**Redis Caching Strategy**
```typescript
// src/lib/cache/redis-optimization.ts
import { createClient, RedisClientType } from 'redis';
import { promisify } from 'util';

export class OptimizedCacheManager {
  private client: RedisClientType;
  private connected: boolean = false;
  
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Redis connection failed');
          return Math.min(retries * 50, 1000);
        },
      },
      // Connection pooling
      poolSize: 10,
      enableOfflineQueue: false,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis connected');
      this.connected = true;
    });
    
    this.client.on('error', (err) => {
      console.error('Redis error:', err);
      this.connected = false;
    });
    
    this.client.on('end', () => {
      console.log('Redis connection closed');
      this.connected = false;
    });
  }
  
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }
  
  // Intelligent caching with different strategies
  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }
  
  async set(
    key: string, 
    value: any, 
    options?: {
      ttl?: number;
      nx?: boolean; // Set only if key doesn't exist
      strategy?: 'write-through' | 'write-behind' | 'write-around';
    }
  ): Promise<boolean> {
    if (!this.connected) return false;
    
    const { ttl = 3600, nx = false, strategy = 'write-through' } = options || {};
    
    try {
      const serialized = JSON.stringify(value);
      
      if (nx) {
        const result = await this.client.setNX(key, serialized);
        if (result && ttl > 0) {
          await this.client.expire(key, ttl);
        }
        return result;
      } else {
        if (ttl > 0) {
          await this.client.setEx(key, ttl, serialized);
        } else {
          await this.client.set(key, serialized);
        }
        return true;
      }
    } catch (error) {
      console.warn('Cache set error:', error);
      return false;
    }
  }
  
  // Batch operations for performance
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.connected || keys.length === 0) return [];
    
    try {
      const values = await this.client.mGet(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.warn('Cache mget error:', error);
      return keys.map(() => null);
    }
  }
  
  async mset(
    keyValuePairs: Array<{ key: string; value: any; ttl?: number }>,
    defaultTTL: number = 3600
  ): Promise<boolean> {
    if (!this.connected || keyValuePairs.length === 0) return false;
    
    try {
      // Use pipeline for atomic operations
      const pipeline = this.client.multi();
      
      for (const { key, value, ttl = defaultTTL } of keyValuePairs) {
        const serialized = JSON.stringify(value);
        if (ttl > 0) {
          pipeline.setEx(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.warn('Cache mset error:', error);
      return false;
    }
  }
  
  // Cache warming strategies
  async warmCache(
    keys: string[],
    dataFetcher: (key: string) => Promise<any>,
    options?: {
      concurrency?: number;
      ttl?: number;
      skipExisting?: boolean;
    }
  ): Promise<void> {
    const { concurrency = 5, ttl = 3600, skipExisting = true } = options || {};
    
    // Check existing keys if skipExisting is true
    let keysToWarm = keys;
    if (skipExisting) {
      const existingValues = await this.mget(keys);
      keysToWarm = keys.filter((_, index) => existingValues[index] === null);
    }
    
    // Process in batches for memory efficiency
    const batches = this.chunkArray(keysToWarm, concurrency);
    
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (key) => {
          try {
            const data = await dataFetcher(key);
            if (data !== null && data !== undefined) {
              await this.set(key, data, { ttl });
            }
          } catch (error) {
            console.warn(`Cache warming failed for key ${key}:`, error);
          }
        })
      );
    }
  }
  
  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.connected) return 0;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      console.warn('Cache invalidation error:', error);
      return 0;
    }
  }
  
  // Cache-aside pattern implementation
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      ttl?: number;
      refreshThreshold?: number; // Refresh when TTL is below this
    }
  ): Promise<T> {
    const { ttl = 3600, refreshThreshold = 300 } = options || {};
    
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      // Check if we need to refresh in background
      if (refreshThreshold > 0) {
        const remainingTTL = await this.client.ttl(key);
        if (remainingTTL > 0 && remainingTTL < refreshThreshold) {
          // Refresh in background
          setImmediate(async () => {
            try {
              const fresh = await fetcher();
              await this.set(key, fresh, { ttl });
            } catch (error) {
              console.warn('Background cache refresh failed:', error);
            }
          });
        }
      }
      return cached;
    }
    
    // Cache miss - fetch and store
    const fresh = await fetcher();
    await this.set(key, fresh, { ttl });
    return fresh;
  }
  
  // Distributed locking for cache coherence
  async withLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    options?: {
      ttl?: number;
      retryDelay?: number;
      maxRetries?: number;
    }
  ): Promise<T> {
    const { ttl = 30, retryDelay = 100, maxRetries = 10 } = options || {};
    
    let retries = 0;
    while (retries < maxRetries) {
      const acquired = await this.client.setNX(`lock:${lockKey}`, '1');
      
      if (acquired) {
        try {
          await this.client.expire(`lock:${lockKey}`, ttl);
          return await operation();
        } finally {
          await this.client.del(`lock:${lockKey}`);
        }
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * (retries + 1)));
      retries++;
    }
    
    throw new Error(`Failed to acquire lock for ${lockKey} after ${maxRetries} retries`);
  }
  
  // Cache metrics and monitoring
  async getStats(): Promise<{
    memory: string;
    connections: number;
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    if (!this.connected) {
      return { memory: '0', connections: 0, hits: 0, misses: 0, hitRate: 0 };
    }
    
    try {
      const info = await this.client.info('memory');
      const stats = await this.client.info('stats');
      
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const connectionsMatch = info.match(/connected_clients:(\d+)/);
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      
      const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
      const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;
      
      return {
        memory: memoryMatch ? memoryMatch[1].trim() : '0',
        connections: connectionsMatch ? parseInt(connectionsMatch[1]) : 0,
        hits,
        misses,
        hitRate: Math.round(hitRate * 100) / 100,
      };
    } catch (error) {
      console.warn('Cache stats error:', error);
      return { memory: '0', connections: 0, hits: 0, misses: 0, hitRate: 0 };
    }
  }
  
  // Utility methods
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
    }
  }
}

// Singleton instance
export const cache = new OptimizedCacheManager();

// Cache key patterns for consistency
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:${id}:profile`,
  course: (id: string) => `course:${id}`,
  courseList: (filters: string) => `courses:list:${filters}`,
  enrollment: (userId: string, courseId: string) => `enrollment:${userId}:${courseId}`,
  videoProgress: (userId: string, videoId: string) => `video:${userId}:${videoId}`,
  analytics: (type: string, period: string) => `analytics:${type}:${period}`,
  search: (query: string, filters: string) => `search:${query}:${filters}`,
};
```

This comprehensive performance optimization guide provides the complete foundation for achieving exceptional performance across all layers of the 7P Education Platform, ensuring fast load times, efficient resource utilization, and scalable architecture that can handle growing user demands while maintaining optimal user experience.