// Database optimization utilities for 7P Education platform

import { createClient } from '@/utils/supabase/client';

export interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  rowsAffected: number;
  timestamp: string;
  cacheHit: boolean;
}

export interface DatabaseOptimizationConfig {
  enableQueryCache: boolean;
  cacheTTL: number;
  enableQueryLogging: boolean;
  slowQueryThreshold: number;
  maxCacheSize: number;
  enableIndexOptimization: boolean;
}

export const defaultDBConfig: DatabaseOptimizationConfig = {
  enableQueryCache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  enableQueryLogging: true,
  slowQueryThreshold: 1000, // 1 second
  maxCacheSize: 100,
  enableIndexOptimization: true,
};

// Query cache implementation
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any, ttl: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Database performance monitor
export class DatabasePerformanceMonitor {
  private static instance: DatabasePerformanceMonitor;
  private metrics: QueryPerformanceMetrics[] = [];
  private config: DatabaseOptimizationConfig;
  private queryCache: QueryCache;

  private constructor(config: DatabaseOptimizationConfig = defaultDBConfig) {
    this.config = { ...defaultDBConfig, ...config };
    this.queryCache = new QueryCache(config.maxCacheSize);
    
    // Cleanup cache periodically
    setInterval(() => {
      this.queryCache.cleanup();
    }, 60000); // Every minute
  }

  static getInstance(config?: Partial<DatabaseOptimizationConfig>): DatabasePerformanceMonitor {
    if (!DatabasePerformanceMonitor.instance) {
      DatabasePerformanceMonitor.instance = new DatabasePerformanceMonitor(config);
    }
    return DatabasePerformanceMonitor.instance;
  }

  /**
   * Execute query with performance monitoring and caching
   */
  async executeQuery<T = any>(
    queryFunc: () => Promise<T>,
    cacheKey?: string,
    customTTL?: number
  ): Promise<T> {
    const startTime = performance.now();
    let cacheHit = false;
    let result: T;

    // Try cache first if enabled and key provided
    if (this.config.enableQueryCache && cacheKey) {
      const cachedResult = this.queryCache.get(cacheKey);
      if (cachedResult !== null) {
        cacheHit = true;
        result = cachedResult;
        
        // Log cache hit
        if (this.config.enableQueryLogging) {
          console.log(`[DB] Cache hit for key: ${cacheKey}`);
        }
        
        return result;
      }
    }

    try {
      // Execute query
      result = await queryFunc();
      
      // Cache result if enabled
      if (this.config.enableQueryCache && cacheKey && result) {
        const ttl = customTTL || this.config.cacheTTL;
        this.queryCache.set(cacheKey, result, ttl);
      }

      return result;
    } finally {
      // Record performance metrics
      const duration = performance.now() - startTime;
      
      if (this.config.enableQueryLogging) {
        this.recordQueryMetrics({
          query: cacheKey || 'unknown',
          duration,
          rowsAffected: this.getRowCount(result),
          timestamp: new Date().toISOString(),
          cacheHit,
        });
      }
    }
  }

  /**
   * Record query performance metrics
   */
  private recordQueryMetrics(metrics: QueryPerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    
    // Log slow queries
    if (metrics.duration > this.config.slowQueryThreshold) {
      console.warn(`[DB] Slow query detected: ${metrics.query} took ${metrics.duration.toFixed(2)}ms`);
    }
    
    // Send to analytics
    this.reportToAnalytics(metrics);
  }

  /**
   * Get row count from result
   */
  private getRowCount(result: any): number {
    if (Array.isArray(result)) {
      return result.length;
    }
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray(result.data) ? result.data.length : 1;
    }
    return result ? 1 : 0;
  }

  /**
   * Report metrics to analytics
   */
  private reportToAnalytics(metrics: QueryPerformanceMetrics): void {
    // Send to performance monitoring service
    if (typeof gtag !== 'undefined') {
      gtag('event', 'database_query', {
        query_name: metrics.query,
        duration: metrics.duration,
        rows_affected: metrics.rowsAffected,
        cache_hit: metrics.cacheHit,
        metric_value: metrics.duration,
      });
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(timeWindow?: number): QueryPerformanceMetrics[] {
    if (!timeWindow) return [...this.metrics];
    
    const cutoff = Date.now() - timeWindow;
    return this.metrics.filter(metric => 
      new Date(metric.timestamp).getTime() > cutoff
    );
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.queryCache.size(),
      maxSize: this.config.maxCacheSize,
      hitRate: this.calculateCacheHitRate(),
    };
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    const recentMetrics = this.getMetrics(300000); // Last 5 minutes
    if (recentMetrics.length === 0) return 0;
    
    const hits = recentMetrics.filter(m => m.cacheHit).length;
    return (hits / recentMetrics.length) * 100;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }
}

// Optimized database client
export class OptimizedSupabaseClient {
  private client: ReturnType<typeof createClient>;
  private monitor: DatabasePerformanceMonitor;

  constructor() {
    this.client = createClient();
    this.monitor = DatabasePerformanceMonitor.getInstance();
  }

  /**
   * Optimized select query with automatic caching
   */
  async select<T = any>(
    table: string,
    options: {
      columns?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
      cacheTTL?: number;
    } = {}
  ): Promise<T[]> {
    // Generate cache key
    const cacheKey = `select_${table}_${JSON.stringify(options)}`;
    
    return this.monitor.executeQuery(
      async () => {
        let query = this.client.from(table).select(options.columns || '*');
        
        // Apply filters
        if (options.filters) {
          Object.entries(options.filters).forEach(([column, value]) => {
            if (Array.isArray(value)) {
              query = query.in(column, value);
            } else if (value !== undefined) {
              query = query.eq(column, value);
            }
          });
        }
        
        // Apply ordering
        if (options.orderBy) {
          query = query.order(options.orderBy.column, { 
            ascending: options.orderBy.ascending !== false 
          });
        }
        
        // Apply pagination
        if (options.limit) {
          query = query.limit(options.limit);
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw new Error(`Database query failed: ${error.message}`);
        }
        
        return data as T[];
      },
      cacheKey,
      options.cacheTTL
    );
  }

  /**
   * Optimized single record fetch
   */
  async selectOne<T = any>(
    table: string,
    filters: Record<string, any>,
    columns?: string,
    cacheTTL?: number
  ): Promise<T | null> {
    const cacheKey = `select_one_${table}_${JSON.stringify(filters)}_${columns || '*'}`;
    
    return this.monitor.executeQuery(
      async () => {
        let query = this.client.from(table).select(columns || '*');
        
        Object.entries(filters).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
        
        const { data, error } = await query.single();
        
        if (error && error.code !== 'PGRST116') { // Not found is ok
          throw new Error(`Database query failed: ${error.message}`);
        }
        
        return data as T | null;
      },
      cacheKey,
      cacheTTL
    );
  }

  /**
   * Batch select for multiple IDs
   */
  async selectByIds<T = any>(
    table: string,
    ids: string[],
    idColumn = 'id',
    columns?: string,
    cacheTTL?: number
  ): Promise<T[]> {
    if (ids.length === 0) return [];
    
    const cacheKey = `select_by_ids_${table}_${idColumn}_${ids.sort().join(',')}_${columns || '*'}`;
    
    return this.monitor.executeQuery(
      async () => {
        const { data, error } = await this.client
          .from(table)
          .select(columns || '*')
          .in(idColumn, ids);
        
        if (error) {
          throw new Error(`Database query failed: ${error.message}`);
        }
        
        return data as T[];
      },
      cacheKey,
      cacheTTL
    );
  }

  /**
   * Optimized count query
   */
  async count(
    table: string,
    filters: Record<string, any> = {},
    cacheTTL?: number
  ): Promise<number> {
    const cacheKey = `count_${table}_${JSON.stringify(filters)}`;
    
    return this.monitor.executeQuery(
      async () => {
        let query = this.client.from(table).select('*', { count: 'exact', head: true });
        
        Object.entries(filters).forEach(([column, value]) => {
          if (Array.isArray(value)) {
            query = query.in(column, value);
          } else if (value !== undefined) {
            query = query.eq(column, value);
          }
        });
        
        const { count, error } = await query;
        
        if (error) {
          throw new Error(`Database count failed: ${error.message}`);
        }
        
        return count || 0;
      },
      cacheKey,
      cacheTTL
    );
  }

  /**
   * Optimized insert with conflict handling
   */
  async insert<T = any>(
    table: string,
    data: T | T[],
    options: {
      onConflict?: string;
      returning?: string;
      ignoreDuplicates?: boolean;
    } = {}
  ): Promise<T[]> {
    return this.monitor.executeQuery(
      async () => {
        let query = this.client.from(table).insert(data);
        
        if (options.onConflict) {
          query = query.onConflict(options.onConflict);
        }
        
        if (options.ignoreDuplicates) {
          query = query.onConflict().ignoreDuplicates();
        }
        
        if (options.returning) {
          query = query.select(options.returning);
        }
        
        const { data: result, error } = await query;
        
        if (error) {
          throw new Error(`Database insert failed: ${error.message}`);
        }
        
        // Invalidate related cache entries
        this.invalidateTableCache(table);
        
        return result as T[];
      }
    );
  }

  /**
   * Optimized update
   */
  async update<T = any>(
    table: string,
    data: Partial<T>,
    filters: Record<string, any>,
    returning?: string
  ): Promise<T[]> {
    return this.monitor.executeQuery(
      async () => {
        let query = this.client.from(table).update(data);
        
        Object.entries(filters).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
        
        if (returning) {
          query = query.select(returning);
        }
        
        const { data: result, error } = await query;
        
        if (error) {
          throw new Error(`Database update failed: ${error.message}`);
        }
        
        // Invalidate related cache entries
        this.invalidateTableCache(table);
        
        return result as T[];
      }
    );
  }

  /**
   * Optimized delete
   */
  async delete(
    table: string,
    filters: Record<string, any>
  ): Promise<void> {
    return this.monitor.executeQuery(
      async () => {
        let query = this.client.from(table).delete();
        
        Object.entries(filters).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
        
        const { error } = await query;
        
        if (error) {
          throw new Error(`Database delete failed: ${error.message}`);
        }
        
        // Invalidate related cache entries
        this.invalidateTableCache(table);
      }
    );
  }

  /**
   * Invalidate cache entries for a table
   */
  private invalidateTableCache(table: string): void {
    // This is a simple implementation - in production, use more sophisticated cache invalidation
    this.monitor.clearCache();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.monitor.getMetrics();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.monitor.getCacheStats();
  }
}

// Commonly used optimized queries
export class OptimizedQueries {
  private static client = new OptimizedSupabaseClient();

  /**
   * Get courses with instructor data (optimized)
   */
  static async getCourses(options: {
    limit?: number;
    offset?: number;
    category?: string;
    instructor?: string;
    published?: boolean;
  } = {}) {
    const filters: Record<string, any> = {};
    
    if (options.category) filters.category_id = options.category;
    if (options.instructor) filters.instructor_id = options.instructor;
    if (options.published !== undefined) filters.published = options.published;
    
    return this.client.select(
      'courses',
      {
        columns: `
          id,
          title,
          description,
          thumbnail_url,
          price,
          rating,
          student_count,
          created_at,
          instructors (
            id,
            name,
            avatar_url
          ),
          categories (
            id,
            name
          )
        `,
        filters,
        orderBy: { column: 'created_at', ascending: false },
        limit: options.limit || 20,
        offset: options.offset || 0,
        cacheTTL: 5 * 60 * 1000, // 5 minutes
      }
    );
  }

  /**
   * Get user enrollments with course data (optimized)
   */
  static async getUserEnrollments(userId: string, limit = 10) {
    return this.client.select(
      'enrollments',
      {
        columns: `
          id,
          progress,
          completed_at,
          enrolled_at,
          courses (
            id,
            title,
            thumbnail_url,
            instructors (name)
          )
        `,
        filters: { user_id: userId },
        orderBy: { column: 'enrolled_at', ascending: false },
        limit,
        cacheTTL: 2 * 60 * 1000, // 2 minutes
      }
    );
  }

  /**
   * Get course statistics (heavily cached)
   */
  static async getCourseStats(courseId: string) {
    return Promise.all([
      this.client.count('enrollments', { course_id: courseId }, 15 * 60 * 1000),
      this.client.selectOne(
        'courses',
        { id: courseId },
        'rating, student_count, created_at',
        15 * 60 * 1000
      ),
    ]).then(([enrollmentCount, courseData]) => ({
      ...courseData,
      current_enrollments: enrollmentCount,
    }));
  }
}

// Export singleton instance
export const optimizedDB = new OptimizedSupabaseClient();
export const dbMonitor = DatabasePerformanceMonitor.getInstance();

// Initialize monitoring
export function initDatabaseOptimization(config?: Partial<DatabaseOptimizationConfig>): void {
  DatabasePerformanceMonitor.getInstance(config);
  console.log('[DB Optimizer] Database optimization initialized');
}