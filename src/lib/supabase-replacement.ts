/**
 * SUPABASE REPLACEMENT - 7P Education
 * Drop-in replacement for Supabase client using mock API
 * Maintains exact same interface as original Supabase
 */

import { mockApi, type MockUser, type MockSession } from './mock-api';

// Re-export types for compatibility
export type { MockUser as User, MockSession as Session };
export type { MockUser, MockSession };

// Create a Supabase-compatible client using mock API
class SupabaseReplacement {
  // Auth methods that match Supabase interface exactly
  auth = {
    // Sign in with email and password
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      return await mockApi.auth.signInWithPassword(credentials);
    },

    // Sign up with email and password
    signUp: async (credentials: { 
      email: string; 
      password: string; 
      options?: { data?: { name?: string } } 
    }) => {
      return await mockApi.auth.signUp(credentials);
    },

    // Get current user
    getUser: async () => {
      return await mockApi.auth.getUser();
    },

    // Get current session
    getSession: async () => {
      return await mockApi.auth.getSession();
    },

    // Sign out
    signOut: async () => {
      return await mockApi.auth.signOut();
    },

    // Listen to auth state changes
    onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
      return mockApi.auth.onAuthStateChange(callback);
    }
  };

  // Database methods that match Supabase interface  
  from = (table: string) => {
    const query = mockApi.from(table);
    return {
      select: (columns?: string) => ({
        ...query.select(columns),
        eq: (column: string, value: any) => query.select(columns).eq(column, value),
        in: (column: string, values: any[]) => query.select(columns).in(column, values),
        order: (column: string, options?: { ascending?: boolean }) => query.select(columns).order(column, options),
        limit: (count: number) => query.select(columns).limit(count),
        single: () => query.select(columns).single(),
        range: (from: number, to: number) => query.select(columns).range(from, to)
      }),
      insert: (values: any | any[]) => query.insert(values),
      update: (values: any) => ({
        ...query.update(values),
        eq: (column: string, value: any) => query.update(values).eq(column, value)
      }),
      delete: () => ({
        ...query.delete(),
        eq: (column: string, value: any) => query.delete().eq(column, value)
      })
    };
  };

  // RPC methods for stored procedures (mock implementation)
  rpc = (fnName: string, params?: any) => {
    return {
      execute: async () => {
        // Mock RPC implementation
        await new Promise(resolve => setTimeout(resolve, 100));
        return { data: null, error: null };
      }
    };
  };

  // Storage methods (mock implementation)
  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        // Mock file upload
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          data: { path, fullPath: `${bucket}/${path}` },
          error: null
        };
      },
      download: async (path: string) => {
        // Mock file download
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
          data: new Blob(['mock file content']),
          error: null
        };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `/mock-storage/${bucket}/${path}` }
      }),
      remove: async (paths: string[]) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { data: null, error: null };
      }
    })
  };

  // Real-time subscriptions (mock implementation)
  channel = (channelName: string) => ({
    on: (event: string, filter: any, callback: (payload: any) => void) => {
      // Mock real-time subscription
      return {
        subscribe: () => {
          // In a real implementation, this would set up WebSocket connection
          console.log(`[Mock] Subscribed to ${channelName} for ${event}`);
          return { error: null };
        }
      };
    },
    unsubscribe: () => {
      console.log(`[Mock] Unsubscribed from ${channelName}`);
      return { error: null };
    }
  });

  // Helper methods for common operations
  // These match the exact patterns used in the existing codebase
  
  // Course operations
  async getCourses(filters?: any) {
    const { data, error } = await this.from('courses').select('*');
    return { data, error };
  }

  async getCourse(id: string) {
    const { data, error } = await this.from('courses').select('*').eq('id', id).single();
    return { data, error };
  }

  async enrollInCourse(courseId: string, userId: string) {
    const { data, error } = await this.from('enrollments').insert({
      course_id: courseId,
      user_id: userId,
      enrolled_at: new Date().toISOString()
    });
    return { data, error };
  }

  // User progress tracking
  async updateLessonProgress(lessonId: string, userId: string, progress: number) {
    const { data, error } = await this.from('lesson_progress').update({
      progress,
      updated_at: new Date().toISOString()
    }).eq('lesson_id', lessonId).eq('user_id', userId);
    return { data, error };
  }

  // Discussion/Forum operations
  async getDiscussions(categoryId?: string) {
    let query = this.from('discussions').select('*');
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    const { data, error } = await query;
    return { data, error };
  }

  async createDiscussion(discussionData: any) {
    const { data, error } = await this.from('discussions').insert(discussionData);
    return { data, error };
  }

  // Library operations  
  async getLibraryResources(categoryId?: string) {
    let query = this.from('library_resources').select('*');
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    const { data, error } = await query;
    return { data, error };
  }

  // User profile operations
  async getUserProfile(userId: string) {
    const { data, error } = await this.from('profiles').select('*').eq('id', userId).single();
    return { data, error };
  }

  async updateUserProfile(userId: string, updates: any) {
    const { data, error } = await this.from('profiles').update(updates).eq('id', userId);
    return { data, error };
  }

  // Payment/Subscription operations
  async getSubscriptions(userId: string) {
    const { data, error } = await this.from('subscriptions').select('*').eq('user_id', userId);
    return { data, error };
  }

  async getInvoices(userId: string) {
    const { data, error } = await this.from('invoices').select('*').eq('user_id', userId);
    return { data, error };
  }

  // Admin operations
  async getUsers(limit?: number) {
    let query = this.from('users').select('*');
    if (limit) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    return { data, error };
  }

  async getUserStats() {
    // Mock user statistics
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      data: {
        totalUsers: 1250,
        activeUsers: 890,
        newUsersThisMonth: 124,
        userGrowthRate: 12.5
      },
      error: null
    };
  }

  async getCourseStats() {
    // Mock course statistics
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      data: {
        totalCourses: 45,
        publishedCourses: 38,
        draftCourses: 7,
        totalEnrollments: 3240,
        averageRating: 4.6
      },
      error: null
    };
  }

  // Messaging operations
  async getConversations(userId: string) {
    const { data, error } = await this.from('conversations').select('*').eq('user_id', userId);
    return { data, error };
  }

  async getMessages(conversationId: string) {
    const { data, error } = await this.from('messages').select('*').eq('conversation_id', conversationId);
    return { data, error };
  }

  async sendMessage(messageData: any) {
    const { data, error } = await this.from('messages').insert(messageData);
    return { data, error };
  }

  // Notification operations
  async getNotifications(userId: string) {
    const { data, error } = await this.from('notifications').select('*').eq('user_id', userId);
    return { data, error };
  }

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await this.from('notifications').update({
      read: true,
      read_at: new Date().toISOString()
    }).eq('id', notificationId);
    return { data, error };
  }
}

// Create singleton instance
const supabaseReplacement = new SupabaseReplacement();

// Export as default for drop-in replacement
export default supabaseReplacement;

// Also export as named export for compatibility
export const supabase = supabaseReplacement;

// Export the class for advanced use cases
export { SupabaseReplacement };

// Utility functions that match Supabase patterns
export const createClient = () => supabaseReplacement;
export const createBrowserClient = () => supabaseReplacement;
export const createServerClient = () => supabaseReplacement;