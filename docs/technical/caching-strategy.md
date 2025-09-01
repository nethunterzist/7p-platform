# Caching Strategy Design - 7P Education Platform

## 📋 Özet

7P Education Platform'un caching stratejisi, Next.js 15 ve modern web teknolojilerini kullanarak maksimum performans ve kullanıcı deneyimi sağlamak için tasarlanmış çok katmanlı bir yaklaşımdır. Bu dokümantasyon, frontend cache'lerinden database cache'lere, CDN optimizasyonundan Redis entegrasyonuna kadar tüm caching katmanlarını detaylandırır.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun amaçları:
- Çok katmanlı caching mimarisinin tasarımı
- Next.js 15 App Router caching mekanizmalarının optimizasyonu
- Redis cluster setup ve optimization strategies
- Database query caching ve connection pooling
- CDN integration ve global content distribution
- Real-time data invalidation strategies
- Performance monitoring ve cache hit rate optimization
- Memory management ve garbage collection strategies

## 🏗️ Mevcut Durum Analizi

### ✅ Aktif Caching Bileşenleri
- **Next.js App Router Cache**: Route segments ve layout caching
- **React Server Components Cache**: Component-level caching
- **Supabase Client Cache**: Database query caching
- **Browser Cache**: Static assets ve API responses
- **Service Worker Cache**: Offline-first approach için PWA cache

### ⚠️ Geliştirilmesi Gereken Alanlar
- Redis cluster implementation eksikliği
- Advanced database query caching strategies
- Real-time cache invalidation mechanisms
- CDN optimization ve global distribution
- Memory usage optimization
- Cache warming strategies

## 🔧 Teknik Detaylar

### 🚀 Multi-Layer Caching Architecture

#### 1. Browser-Level Caching
```typescript
// types/cache.ts
export interface CacheConfig {
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate'
  maxAge: number
  staleWhileRevalidate?: number
  cacheKey: string
  tags?: string[]
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  version: string
  tags: string[]
}

// lib/cache/browser-cache.ts
class BrowserCacheManager {
  private cache: Map<string, CacheEntry> = new Map()
  private maxSize: number = 100
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes

  constructor(config?: { maxSize?: number; defaultTTL?: number }) {
    this.maxSize = config?.maxSize || this.maxSize
    this.defaultTTL = config?.defaultTTL || this.defaultTTL
    
    // Initialize from localStorage if available
    this.loadFromStorage()
    
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60000)
  }

  set<T>(key: string, data: T, options?: Partial<CacheConfig>): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options?.maxAge || this.defaultTTL,
      version: '1.0',
      tags: options?.tags || []
    }

    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, entry)
    this.saveToStorage()
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Move to end for LRU
    this.cache.delete(key)
    this.cache.set(key, entry)
    
    return entry.data as T
  }

  invalidateByTags(tags: string[]): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key)
      }
    }
    this.saveToStorage()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
    this.saveToStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('app-cache')
      if (stored) {
        const data = JSON.parse(stored)
        for (const [key, entry] of Object.entries(data)) {
          this.cache.set(key, entry as CacheEntry)
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache.entries())
      localStorage.setItem('app-cache', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save cache to storage:', error)
    }
  }
}

export const browserCache = new BrowserCacheManager()
```

#### 2. Next.js App Router Caching
```typescript
// lib/cache/route-cache.ts
import { unstable_cache } from 'next/cache'
import { revalidateTag, revalidatePath } from 'next/cache'

// Course data caching with fine-grained invalidation
export const getCachedCourse = unstable_cache(
  async (courseId: string) => {
    const { data: course } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:user_profiles(*),
        category:categories(*),
        modules:course_modules(
          *,
          lessons:lessons(*)
        )
      `)
      .eq('id', courseId)
      .single()

    return course
  },
  ['course-detail'],
  {
    tags: ['courses'],
    revalidate: 3600, // 1 hour
  }
)

// User enrollment caching with shorter TTL
export const getCachedUserEnrollments = unstable_cache(
  async (userId: string) => {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses(*),
        progress:lesson_progress(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')

    return enrollments
  },
  ['user-enrollments'],
  {
    tags: ['enrollments'],
    revalidate: 300, // 5 minutes
  }
)

// Dynamic course listing with pagination support
export const getCachedCourses = unstable_cache(
  async (filters: CourseFilters, page = 1, limit = 12) => {
    let query = supabase
      .from('courses')
      .select(`
        id,
        title,
        slug,
        short_description,
        thumbnail_url,
        level,
        pricing,
        enrollment_count,
        average_rating,
        instructor:user_profiles(full_name, avatar_url),
        category:categories(name, slug)
      `)
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('enrollment_count', { ascending: false })

    // Apply filters
    if (filters.category) {
      query = query.eq('category_id', filters.category)
    }
    if (filters.level) {
      query = query.eq('level', filters.level)
    }
    if (filters.priceRange) {
      query = query.gte('pricing->amount', filters.priceRange.min)
      query = query.lte('pricing->amount', filters.priceRange.max)
    }

    const { data: courses, count } = await query
      .range((page - 1) * limit, page * limit - 1)

    return {
      courses,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page
    }
  },
  ['courses-listing'],
  {
    tags: ['courses', 'course-listings'],
    revalidate: 1800, // 30 minutes
  }
)

// Cache invalidation utilities
export const invalidateCourseCache = async (courseId?: string) => {
  if (courseId) {
    revalidateTag(`course-${courseId}`)
  } else {
    revalidateTag('courses')
  }
  revalidateTag('course-listings')
}

export const invalidateUserCache = async (userId: string) => {
  revalidateTag(`user-${userId}`)
  revalidateTag('enrollments')
}
```

#### 3. Server-Side Cache Implementation
```typescript
// lib/cache/server-cache.ts
import Redis from 'ioredis'
import { z } from 'zod'

// Redis cluster configuration
const redisConfig = {
  port: parseInt(process.env.REDIS_PORT || '6379'),
  host: process.env.REDIS_HOST || 'localhost',
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}

// Initialize Redis client with cluster support
class RedisCache {
  private client: Redis
  private isConnected: boolean = false

  constructor() {
    if (process.env.REDIS_CLUSTER_NODES) {
      // Cluster mode
      const nodes = process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
        const [host, port] = node.split(':')
        return { host, port: parseInt(port) }
      })
      
      this.client = new Redis.Cluster(nodes, {
        redisOptions: redisConfig,
        enableOfflineQueue: false,
      })
    } else {
      // Single instance
      this.client = new Redis(redisConfig)
    }

    this.client.on('connect', () => {
      this.isConnected = true
      console.log('Redis connected successfully')
    })

    this.client.on('error', (error) => {
      this.isConnected = false
      console.error('Redis connection error:', error)
    })
  }

  async get<T>(key: string, schema?: z.ZodType<T>): Promise<T | null> {
    try {
      if (!this.isConnected) await this.client.connect()
      
      const value = await this.client.get(key)
      if (!value) return null

      const parsed = JSON.parse(value)
      
      // Validate with Zod schema if provided
      if (schema) {
        const result = schema.safeParse(parsed)
        return result.success ? result.data : null
      }

      return parsed as T
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error)
      return null
    }
  }

  async set(
    key: string, 
    value: any, 
    ttlSeconds: number = 3600
  ): Promise<boolean> {
    try {
      if (!this.isConnected) await this.client.connect()
      
      const result = await this.client.setex(
        key, 
        ttlSeconds, 
        JSON.stringify(value)
      )
      return result === 'OK'
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error)
      return false
    }
  }

  async del(keys: string | string[]): Promise<number> {
    try {
      if (!this.isConnected) await this.client.connect()
      
      const keysArray = Array.isArray(keys) ? keys : [keys]
      return await this.client.del(...keysArray)
    } catch (error) {
      console.error('Redis DEL error:', error)
      return 0
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) await this.client.connect()
      
      const keys = await this.client.keys(pattern)
      if (keys.length === 0) return 0
      
      return await this.client.del(...keys)
    } catch (error) {
      console.error(`Redis pattern invalidation error for ${pattern}:`, error)
      return 0
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.isConnected) await this.client.connect()
      
      const values = await this.client.mget(...keys)
      return values.map(value => {
        if (!value) return null
        try {
          return JSON.parse(value) as T
        } catch {
          return null
        }
      })
    } catch (error) {
      console.error('Redis MGET error:', error)
      return keys.map(() => null)
    }
  }

  async mset(entries: Array<[string, any, number?]>): Promise<boolean> {
    try {
      if (!this.isConnected) await this.client.connect()
      
      const pipeline = this.client.pipeline()
      
      for (const [key, value, ttl] of entries) {
        if (ttl) {
          pipeline.setex(key, ttl, JSON.stringify(value))
        } else {
          pipeline.set(key, JSON.stringify(value))
        }
      }
      
      const results = await pipeline.exec()
      return results?.every(([err]) => !err) ?? false
    } catch (error) {
      console.error('Redis MSET error:', error)
      return false
    }
  }

  // Cache warming utilities
  async warmCache(entries: Array<[string, () => Promise<any>, number]>): Promise<void> {
    const pipeline = this.client.pipeline()
    
    for (const [key, fetcher, ttl] of entries) {
      try {
        const data = await fetcher()
        pipeline.setex(key, ttl, JSON.stringify(data))
      } catch (error) {
        console.error(`Cache warming failed for key ${key}:`, error)
      }
    }
    
    await pipeline.exec()
  }
}

export const redisCache = new RedisCache()

// High-level cache wrapper with fallback
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    tags?: string[]
    fallbackToMemory?: boolean
  } = {}
): Promise<T> {
  const { ttl = 3600, fallbackToMemory = true } = options

  // Try Redis first
  let cached = await redisCache.get<T>(key)
  
  // Fallback to memory cache if Redis fails
  if (cached === null && fallbackToMemory) {
    cached = browserCache.get<T>(key)
  }

  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()

  // Store in Redis
  await redisCache.set(key, data, ttl)

  // Store in memory cache as fallback
  if (fallbackToMemory) {
    browserCache.set(key, data, { maxAge: ttl * 1000, tags: options.tags })
  }

  return data
}
```

#### 4. Database Query Caching
```typescript
// lib/cache/database-cache.ts
import { createClient } from '@supabase/supabase-js'

interface QueryCacheOptions {
  ttl?: number
  tags?: string[]
  revalidateOnMutation?: boolean
  staleWhileRevalidate?: boolean
}

class DatabaseQueryCache {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async cachedQuery<T>(
    tableName: string,
    queryFn: (client: typeof this.supabase) => Promise<{ data: T; error: any }>,
    cacheKey: string,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const { ttl = 3600, tags = [], staleWhileRevalidate = true } = options

    // Try cache first
    const cached = await redisCache.get<T>(`db:${cacheKey}`)
    
    if (cached) {
      // Return cached data immediately
      if (staleWhileRevalidate) {
        // Refresh in background
        this.refreshInBackground(queryFn, cacheKey, ttl)
      }
      return cached
    }

    // Fetch fresh data
    const { data, error } = await queryFn(this.supabase)
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    // Cache the result
    await redisCache.set(`db:${cacheKey}`, data, ttl)

    return data
  }

  private async refreshInBackground<T>(
    queryFn: (client: typeof this.supabase) => Promise<{ data: T; error: any }>,
    cacheKey: string,
    ttl: number
  ): Promise<void> {
    try {
      const { data, error } = await queryFn(this.supabase)
      if (!error && data) {
        await redisCache.set(`db:${cacheKey}`, data, ttl)
      }
    } catch (error) {
      console.error('Background refresh failed:', error)
    }
  }

  async invalidateTableCache(tableName: string): Promise<void> {
    await redisCache.invalidatePattern(`db:${tableName}:*`)
  }

  // Optimized course queries
  async getCourseWithDetails(courseId: string): Promise<any> {
    return this.cachedQuery(
      'courses',
      (client) => client
        .from('courses')
        .select(`
          *,
          instructor:user_profiles!courses_instructor_id_fkey(*),
          category:categories(*),
          modules:course_modules(
            *,
            lessons:lessons(
              *,
              progress:lesson_progress(progress_percentage, completed_at)
            )
          )
        `)
        .eq('id', courseId)
        .single(),
      `courses:${courseId}:detailed`,
      { ttl: 1800, tags: ['courses', `course:${courseId}`] }
    )
  }

  async getUserEnrollmentsWithProgress(userId: string): Promise<any> {
    return this.cachedQuery(
      'enrollments',
      (client) => client
        .from('enrollments')
        .select(`
          *,
          course:courses(
            id, title, slug, thumbnail_url,
            total_lessons:(lessons.count())
          ),
          progress:lesson_progress(
            lesson_id, status, progress_percentage, completed_at
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active'),
      `enrollments:${userId}:active`,
      { ttl: 300, tags: ['enrollments', `user:${userId}`] }
    )
  }

  // Course search with advanced caching
  async searchCourses(
    searchTerm: string,
    filters: any,
    page: number = 1,
    limit: number = 12
  ): Promise<any> {
    const cacheKey = `search:${Buffer.from(JSON.stringify({ 
      searchTerm, filters, page, limit 
    })).toString('base64')}`

    return this.cachedQuery(
      'courses',
      async (client) => {
        let query = client
          .from('courses')
          .select(`
            id, title, slug, short_description, thumbnail_url,
            level, pricing, enrollment_count, average_rating,
            instructor:user_profiles(id, full_name, avatar_url),
            category:categories(id, name, slug)
          `, { count: 'exact' })
          .eq('status', 'published')

        // Apply search
        if (searchTerm) {
          query = query.textSearch('title,description,short_description', searchTerm)
        }

        // Apply filters
        if (filters.category_id) {
          query = query.eq('category_id', filters.category_id)
        }
        if (filters.level) {
          query = query.in('level', filters.level)
        }
        if (filters.price_range) {
          query = query.gte('pricing->amount', filters.price_range.min)
            .lte('pricing->amount', filters.price_range.max)
        }

        // Pagination
        const from = (page - 1) * limit
        const to = from + limit - 1

        return query
          .range(from, to)
          .order('featured', { ascending: false })
          .order('enrollment_count', { ascending: false })
      },
      cacheKey,
      { ttl: 900, tags: ['courses', 'search'] }
    )
  }
}

export const dbCache = new DatabaseQueryCache()
```

#### 5. CDN and Static Asset Caching
```typescript
// lib/cache/cdn-cache.ts
import { ImageResponse } from 'next/server'

// Dynamic image optimization with caching
export async function generateOptimizedImage(
  url: string,
  width: number,
  height: number,
  quality: number = 80
): Promise<Response> {
  const cacheKey = `image:${url}:${width}x${height}:q${quality}`
  
  // Check cache first
  const cached = await redisCache.get<string>(cacheKey)
  if (cached) {
    return new Response(Buffer.from(cached, 'base64'), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  try {
    // Fetch and optimize image
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    
    // Use Sharp for image optimization
    const sharp = (await import('sharp')).default
    const optimized = await sharp(buffer)
      .resize(width, height, { 
        fit: 'cover', 
        position: 'center' 
      })
      .jpeg({ quality })
      .toBuffer()

    // Cache optimized image
    const base64 = optimized.toString('base64')
    await redisCache.set(cacheKey, base64, 86400) // 24 hours

    return new Response(optimized, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Image optimization failed:', error)
    throw new Error('Failed to optimize image')
  }
}

// Service Worker cache strategy
export const cacheStrategies = {
  // Static assets - Cache First
  staticAssets: {
    cacheName: 'static-assets-v1',
    strategy: 'CacheFirst' as const,
    maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
    maxEntries: 100,
  },

  // API responses - Network First
  apiResponses: {
    cacheName: 'api-responses-v1',
    strategy: 'NetworkFirst' as const,
    maxAgeSeconds: 5 * 60, // 5 minutes
    maxEntries: 50,
  },

  // Course content - Stale While Revalidate
  courseContent: {
    cacheName: 'course-content-v1',
    strategy: 'StaleWhileRevalidate' as const,
    maxAgeSeconds: 60 * 60, // 1 hour
    maxEntries: 200,
  },
}

// Generate service worker cache config
export function generateSWConfig() {
  return `
    import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
    import { registerRoute } from 'workbox-routing'
    import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
    import { ExpirationPlugin } from 'workbox-expiration'
    import { CacheableResponsePlugin } from 'workbox-cacheable-response'

    cleanupOutdatedCaches()
    precacheAndRoute(self.__WB_MANIFEST)

    // Static assets
    registerRoute(
      ({ request }) => 
        request.destination === 'image' || 
        request.destination === 'script' || 
        request.destination === 'style',
      new CacheFirst({
        cacheName: '${cacheStrategies.staticAssets.cacheName}',
        plugins: [
          new ExpirationPlugin({
            maxEntries: ${cacheStrategies.staticAssets.maxEntries},
            maxAgeSeconds: ${cacheStrategies.staticAssets.maxAgeSeconds},
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      })
    )

    // API routes
    registerRoute(
      ({ url }) => url.pathname.startsWith('/api/'),
      new NetworkFirst({
        cacheName: '${cacheStrategies.apiResponses.cacheName}',
        plugins: [
          new ExpirationPlugin({
            maxEntries: ${cacheStrategies.apiResponses.maxEntries},
            maxAgeSeconds: ${cacheStrategies.apiResponses.maxAgeSeconds},
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      })
    )

    // Course pages
    registerRoute(
      ({ url }) => url.pathname.startsWith('/courses/'),
      new StaleWhileRevalidate({
        cacheName: '${cacheStrategies.courseContent.cacheName}',
        plugins: [
          new ExpirationPlugin({
            maxEntries: ${cacheStrategies.courseContent.maxEntries},
            maxAgeSeconds: ${cacheStrategies.courseContent.maxAgeSeconds},
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      })
    )
  `
}
```

#### 6. Real-time Cache Invalidation
```typescript
// lib/cache/invalidation.ts
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'

class CacheInvalidationManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  constructor() {
    this.setupRealtimeListeners()
  }

  private setupRealtimeListeners() {
    // Course updates
    this.supabase
      .channel('course-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'courses' },
        async (payload) => {
          await this.handleCourseChange(payload)
        }
      )
      .subscribe()

    // Enrollment updates
    this.supabase
      .channel('enrollment-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments' },
        async (payload) => {
          await this.handleEnrollmentChange(payload)
        }
      )
      .subscribe()

    // User profile updates
    this.supabase
      .channel('profile-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        async (payload) => {
          await this.handleProfileChange(payload)
        }
      )
      .subscribe()

    // Lesson progress updates
    this.supabase
      .channel('progress-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_progress' },
        async (payload) => {
          await this.handleProgressChange(payload)
        }
      )
      .subscribe()
  }

  private async handleCourseChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    const courseId = newRecord?.id || oldRecord?.id

    console.log(`Course ${eventType}: ${courseId}`)

    // Invalidate specific course caches
    await Promise.all([
      redisCache.invalidatePattern(`db:courses:${courseId}*`),
      redisCache.invalidatePattern(`search:*`),
      revalidateTag('courses'),
      revalidateTag(`course:${courseId}`),
    ])

    // If course status changed to published, warm up cache
    if (eventType === 'UPDATE' && 
        newRecord?.status === 'published' && 
        oldRecord?.status !== 'published') {
      await this.warmCourseCache(courseId)
    }

    // Broadcast to connected clients
    await this.broadcastInvalidation('course', courseId, eventType)
  }

  private async handleEnrollmentChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    const userId = newRecord?.user_id || oldRecord?.user_id
    const courseId = newRecord?.course_id || oldRecord?.course_id

    console.log(`Enrollment ${eventType}: user ${userId}, course ${courseId}`)

    await Promise.all([
      redisCache.invalidatePattern(`db:enrollments:${userId}*`),
      redisCache.invalidatePattern(`db:courses:${courseId}*`),
      revalidateTag('enrollments'),
      revalidateTag(`user:${userId}`),
      revalidateTag(`course:${courseId}`),
    ])

    await this.broadcastInvalidation('enrollment', { userId, courseId }, eventType)
  }

  private async handleProfileChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    const userId = newRecord?.id || oldRecord?.id

    await Promise.all([
      redisCache.invalidatePattern(`db:*:${userId}*`),
      revalidateTag(`user:${userId}`),
    ])

    await this.broadcastInvalidation('profile', userId, eventType)
  }

  private async handleProgressChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    const userId = newRecord?.user_id || oldRecord?.user_id
    const enrollmentId = newRecord?.enrollment_id || oldRecord?.enrollment_id

    await Promise.all([
      redisCache.invalidatePattern(`db:enrollments:${userId}*`),
      redisCache.invalidatePattern(`db:progress:${enrollmentId}*`),
      revalidateTag(`user:${userId}`),
      revalidateTag('progress'),
    ])

    await this.broadcastInvalidation('progress', { userId, enrollmentId }, eventType)
  }

  private async warmCourseCache(courseId: string) {
    try {
      // Pre-populate frequently accessed course data
      await dbCache.getCourseWithDetails(courseId)
      
      // Pre-generate course thumbnails in different sizes
      const course = await redisCache.get(`db:courses:${courseId}:detailed`)
      if (course?.thumbnail_url) {
        const sizes = [[300, 200], [600, 400], [1200, 800]]
        await Promise.all(
          sizes.map(([w, h]) => 
            generateOptimizedImage(course.thumbnail_url, w, h, 85)
          )
        )
      }
    } catch (error) {
      console.error('Cache warming failed:', error)
    }
  }

  private async broadcastInvalidation(
    type: string,
    identifier: any,
    eventType: string
  ) {
    try {
      // Send cache invalidation message to all connected clients
      await fetch('/api/cache/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          identifier,
          eventType,
          timestamp: Date.now(),
        }),
      })
    } catch (error) {
      console.error('Cache invalidation broadcast failed:', error)
    }
  }

  // Manual invalidation methods
  async invalidateUser(userId: string) {
    await Promise.all([
      redisCache.invalidatePattern(`db:*${userId}*`),
      revalidateTag(`user:${userId}`),
      this.broadcastInvalidation('user', userId, 'MANUAL'),
    ])
  }

  async invalidateCourse(courseId: string) {
    await Promise.all([
      redisCache.invalidatePattern(`db:courses:${courseId}*`),
      redisCache.invalidatePattern(`search:*`),
      revalidateTag('courses'),
      revalidateTag(`course:${courseId}`),
      this.broadcastInvalidation('course', courseId, 'MANUAL'),
    ])
  }

  async invalidateAll() {
    await Promise.all([
      redisCache.invalidatePattern('db:*'),
      redisCache.invalidatePattern('search:*'),
      revalidateTag('courses'),
      revalidateTag('enrollments'),
      revalidateTag('users'),
      this.broadcastInvalidation('all', null, 'MANUAL'),
    ])
  }
}

export const cacheInvalidation = new CacheInvalidationManager()
```

### 🔧 Cache Configuration & Monitoring

#### Performance Monitoring
```typescript
// lib/cache/monitoring.ts
interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  averageLatency: number
  memoryUsage: number
  errors: number
}

class CacheMonitor {
  private metrics: Map<string, CacheMetrics> = new Map()
  private startTime: number = Date.now()

  recordHit(cacheLayer: string, latency: number) {
    const metrics = this.getMetrics(cacheLayer)
    metrics.hits++
    this.updateLatency(metrics, latency)
    this.updateHitRate(metrics)
  }

  recordMiss(cacheLayer: string, latency: number) {
    const metrics = this.getMetrics(cacheLayer)
    metrics.misses++
    this.updateLatency(metrics, latency)
    this.updateHitRate(metrics)
  }

  recordError(cacheLayer: string) {
    const metrics = this.getMetrics(cacheLayer)
    metrics.errors++
  }

  private getMetrics(cacheLayer: string): CacheMetrics {
    if (!this.metrics.has(cacheLayer)) {
      this.metrics.set(cacheLayer, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageLatency: 0,
        memoryUsage: 0,
        errors: 0
      })
    }
    return this.metrics.get(cacheLayer)!
  }

  private updateLatency(metrics: CacheMetrics, latency: number) {
    const total = metrics.hits + metrics.misses
    metrics.averageLatency = 
      (metrics.averageLatency * (total - 1) + latency) / total
  }

  private updateHitRate(metrics: CacheMetrics) {
    const total = metrics.hits + metrics.misses
    metrics.hitRate = total > 0 ? (metrics.hits / total) * 100 : 0
  }

  getReport(): Record<string, CacheMetrics> {
    return Object.fromEntries(this.metrics.entries())
  }

  async generateReport(): Promise<string> {
    const report = this.getReport()
    const uptime = Date.now() - this.startTime
    
    let output = `Cache Performance Report (Uptime: ${Math.round(uptime / 1000)}s)\n`
    output += '='.repeat(60) + '\n\n'
    
    for (const [layer, metrics] of Object.entries(report)) {
      output += `${layer.toUpperCase()} Cache:\n`
      output += `  Hits: ${metrics.hits}\n`
      output += `  Misses: ${metrics.misses}\n`
      output += `  Hit Rate: ${metrics.hitRate.toFixed(2)}%\n`
      output += `  Avg Latency: ${metrics.averageLatency.toFixed(2)}ms\n`
      output += `  Errors: ${metrics.errors}\n\n`
    }
    
    return output
  }
}

export const cacheMonitor = new CacheMonitor()

// Middleware to track cache performance
export function withCacheMetrics<T>(
  cacheLayer: string,
  operation: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now()
    
    try {
      const result = await operation()
      const latency = Date.now() - startTime
      
      if (result !== null && result !== undefined) {
        cacheMonitor.recordHit(cacheLayer, latency)
      } else {
        cacheMonitor.recordMiss(cacheLayer, latency)
      }
      
      resolve(result)
    } catch (error) {
      const latency = Date.now() - startTime
      cacheMonitor.recordError(cacheLayer)
      cacheMonitor.recordMiss(cacheLayer, latency)
      reject(error)
    }
  })
}
```

## 💡 Öneriler ve Best Practices

### 🔄 Cache Warming Strategies
- **Critical Path Warming**: Anasayfa ve popüler kurslar için proactive caching
- **User Behavior Analysis**: Kullanıcı davranışlarına göre predictive caching
- **Background Jobs**: Off-peak saatlerde cache warming işlemleri
- **CDN Edge Warming**: Global edge locations'a content pre-population

### ⚡ Performance Optimization
- **Multi-tier Architecture**: Browser → Redis → Database cascade
- **Intelligent Eviction**: LRU ve access pattern based eviction policies
- **Compression**: Gzip compression for larger cached objects
- **Batch Operations**: Multiple cache operations'ı single request'te birleştirme

### 🔍 Monitoring ve Analytics
- **Real-time Metrics**: Hit rates, latency, memory usage tracking
- **Alert Thresholds**: Critical performance degradation alarms
- **Cache Efficiency Reports**: Weekly performance optimization reports
- **A/B Testing**: Farklı caching strategies'in performance comparison

## 📊 Implementation Roadmap

### Phase 1: Foundation Setup (1 week)
- [ ] Redis cluster kurulumu ve configuration
- [ ] Basic Next.js cache optimization
- [ ] Browser cache management implementation
- [ ] Performance monitoring setup

### Phase 2: Advanced Caching (2 weeks)
- [ ] Database query caching layer
- [ ] Real-time invalidation system
- [ ] CDN integration ve optimization
- [ ] Service Worker cache implementation

### Phase 3: Optimization & Monitoring (1 week)
- [ ] Cache warming strategies
- [ ] Advanced monitoring dashboard
- [ ] Performance tuning ve benchmarking
- [ ] Documentation ve training materials

### Phase 4: Advanced Features (1 week)
- [ ] Edge computing integration
- [ ] AI-powered cache prediction
- [ ] Multi-region cache synchronization
- [ ] Advanced analytics ve reporting

## 🔗 İlgili Dosyalar

- [Performance Optimization](./performance-optimization.md) - Genel performance strategies
- [CDN Configuration](../devops/cdn-setup.md) - CDN setup ve configuration
- [Redis Cluster Setup](../database/redis-cluster.md) - Redis infrastructure
- [Service Worker Implementation](./pwa-implementation.md) - PWA ve offline caching
- [Monitoring Setup](../analytics/performance-monitoring.md) - Performance tracking
- [API Optimization](./backend-api-design.md) - API-level caching strategies

## 📚 Kaynaklar

### 📖 Next.js Caching
- [Next.js App Router Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Data Cache Strategies](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)
- [Static Generation](https://nextjs.org/docs/pages/building-your-application/rendering/static-site-generation)

### 🛠️ Redis & Caching
- [Redis Documentation](https://redis.io/documentation)
- [Redis Cluster Tutorial](https://redis.io/topics/cluster-tutorial)
- [Caching Best Practices](https://redis.io/docs/manual/patterns/)

### 📊 Performance & Monitoring
- [Web Performance Metrics](https://web.dev/metrics/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Cache Performance Analysis](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*