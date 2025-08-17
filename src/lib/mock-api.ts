/**
 * MOCK API SYSTEM - 7P Education
 * Replaces Supabase backend with localStorage-based mock system
 * Maintains same interface as original Supabase calls
 */

import { 
  ALL_COURSES, 
  COURSE_DETAILS,
  getFeaturedCourses,
  DEFAULT_USER_PROFILE,
  DEFAULT_NOTIFICATION_SETTINGS,
  MOCK_ACTIVE_DEVICES,
  MOCK_PAYMENT_METHODS,
  MOCK_SUBSCRIPTION,
  MOCK_INVOICES,
  MOCK_SECURITY_SETTINGS,
  type Course,
  type CourseDetail,
  type UserProfile,
  type NotificationSettings,
  type ActiveDevice,
  type PaymentMethod,
  type Subscription,
  type Invoice,
  type SecuritySettings
} from '@/data';

// Mock delay to simulate API calls
const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced User type for mock system
export interface MockUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'student' | 'instructor' | 'admin';
  created_at: string;
  last_sign_in_at: string;
}

// Mock response wrapper to match Supabase format
interface MockResponse<T> {
  data: T | null;
  error: Error | null;
}

// Mock users database
const MOCK_USERS: (MockUser & { password: string })[] = [
  {
    id: '1',
    email: 'admin@7peducation.com',
    password: '123456',
    name: 'Admin User',
    role: 'admin',
    created_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString()
  },
  {
    id: '2',
    email: 'test@test.com',
    password: '123456',
    name: 'Test User',
    role: 'student',
    created_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString()
  },
  {
    id: '3',
    email: 'furkanyy@gmail.com',
    password: '123456',
    name: 'Furkan Y',
    role: 'student',
    created_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString()
  }
];

// Enhanced Mock Session
export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: MockUser;
}

class MockAPI {
  // Auth operations
  auth = {
    // Sign in with email/password
    signInWithPassword: async ({ email, password }: { email: string; password: string }): Promise<MockResponse<{ user: MockUser; session: MockSession }>> => {
      await delay(300);
      
      const user = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (!user) {
        return { 
          data: null, 
          error: new Error('Invalid credentials') 
        };
      }

      const mockUser: MockUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        last_sign_in_at: new Date().toISOString()
      };

      const session: MockSession = {
        access_token: `mock_token_${Date.now()}`,
        refresh_token: `mock_refresh_${Date.now()}`,
        expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        user: mockUser
      };

      // Store in localStorage
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      
      return { data: { user: mockUser, session }, error: null };
    },

    // Sign up with email/password
    signUp: async ({ email, password, options }: { 
      email: string; 
      password: string; 
      options?: { data?: { name?: string } }
    }): Promise<MockResponse<{ user: MockUser; session: MockSession | null }>> => {
      await delay(500);
      
      // Check if user already exists
      const existingUser = MOCK_USERS.find(u => u.email === email);
      if (existingUser) {
        return {
          data: null,
          error: new Error('User already exists')
        };
      }

      const newUser: MockUser = {
        id: `user_${Date.now()}`,
        email,
        name: options?.data?.name || email.split('@')[0],
        role: 'student',
        created_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString()
      };

      // Add to mock users (in memory)
      MOCK_USERS.push({ ...newUser, password });

      const session: MockSession = {
        access_token: `mock_token_${Date.now()}`,
        refresh_token: `mock_refresh_${Date.now()}`,
        expires_at: Date.now() + (24 * 60 * 60 * 1000),
        user: newUser
      };

      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      localStorage.setItem('auth_user', JSON.stringify(newUser));

      return { data: { user: newUser, session }, error: null };
    },

    // Get current user
    getUser: async (): Promise<MockResponse<MockUser>> => {
      await delay(50);
      
      try {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (!sessionStr) {
          return { data: null, error: new Error('No session') };
        }

        const session: MockSession = JSON.parse(sessionStr);
        
        // Check if session expired
        if (Date.now() > session.expires_at) {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('auth_user');
          return { data: null, error: new Error('Session expired') };
        }

        return { data: session.user, error: null };
      } catch {
        return { data: null, error: new Error('Invalid session') };
      }
    },

    // Get current session
    getSession: async (): Promise<MockResponse<MockSession>> => {
      await delay(50);
      
      try {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (!sessionStr) {
          return { data: null, error: null };
        }

        const session: MockSession = JSON.parse(sessionStr);
        
        // Check if session expired
        if (Date.now() > session.expires_at) {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('auth_user');
          return { data: null, error: null };
        }

        return { data: session, error: null };
      } catch {
        return { data: null, error: null };
      }
    },

    // Sign out
    signOut: async (): Promise<MockResponse<null>> => {
      await delay(100);
      
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      
      return { data: null, error: null };
    },

    // Auth state change listener (mock)
    onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
      // Mock implementation - in real app would listen to storage changes
      const checkAuthState = () => {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            callback('SIGNED_IN', session);
          } catch {
            callback('SIGNED_OUT', null);
          }
        } else {
          callback('SIGNED_OUT', null);
        }
      };

      // Initial check
      setTimeout(checkAuthState, 100);

      // Return unsubscribe function
      return {
        data: { subscription: { unsubscribe: () => {} } }
      };
    }
  };

  // Database operations using 'from' method like Supabase
  from = (table: string) => {
    const selectChain = (columns?: string, filter?: any, orderBy?: string, ascending?: boolean, limitCount?: number) => {
      const basePromise = filter ? 
        this.select(table, columns, filter) : 
        this.select(table, columns);
      
      return {
        then: (resolve: any, reject: any) => {
          let resultPromise = basePromise;
          if (orderBy) {
            resultPromise = resultPromise.then(({ data, error }) => {
              if (error || !data) return { data, error };
              const sorted = [...data].sort((a, b) => {
                const aVal = a[orderBy];
                const bVal = b[orderBy];
                if (ascending !== false) {
                  return aVal > bVal ? 1 : -1;
                } else {
                  return aVal < bVal ? 1 : -1;
                }
              });
              return { data: sorted, error };
            });
          }
          if (limitCount) {
            resultPromise = resultPromise.then(({ data, error }) => {
              if (error || !data) return { data, error };
              return { data: data.slice(0, limitCount), error };
            });
          }
          return resultPromise.then(resolve, reject);
        },
        eq: (column: string, value: any) => 
          selectChain(columns, { ...filter, [column]: value }, orderBy, ascending, limitCount),
        in: (column: string, values: any[]) => 
          this.selectIn(table, columns, column, values),
        order: (column: string, options?: { ascending?: boolean }) => 
          selectChain(columns, filter, column, options?.ascending !== false, limitCount),
        limit: (count: number) => 
          selectChain(columns, filter, orderBy, ascending, count),
        single: () => ({
          then: (resolve: any, reject: any) => {
            const promise = filter ? 
              this.select(table, columns, filter) : 
              this.select(table, columns);
            return promise.then(({ data, error }) => {
              if (error) return resolve({ data: null, error });
              return resolve({ data: data?.[0] || null, error: null });
            }, reject);
          }
        }),
        range: (from: number, to: number) => 
          this.selectRange(table, columns, from, to)
      };
    };

    return {
      // SELECT operations
      select: (columns?: string) => selectChain(columns),

      // INSERT operations
      insert: (values: any | any[]) => ({
        select: (columns?: string) => this.insert(table, values, columns),
        then: (resolve: any, reject: any) => 
          this.insert(table, values).then(resolve, reject)
      }),

      // UPDATE operations
      update: (values: any) => ({
        eq: (column: string, value: any) => ({
          then: (resolve: any, reject: any) => 
            this.update(table, values, { [column]: value }).then(resolve, reject)
        }),
        select: (columns?: string) => this.update(table, values, {}, columns),
        then: (resolve: any, reject: any) => 
          this.update(table, values).then(resolve, reject)
      }),

      // DELETE operations
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: (resolve: any, reject: any) => 
            this.delete(table, { [column]: value }).then(resolve, reject)
        }),
        then: (resolve: any, reject: any) => 
          this.delete(table).then(resolve, reject)
      })
    };
  };

  private async select(table: string, columns?: string, filter?: any): Promise<MockResponse<any[]>> {
    await delay();

    let data: any[] = [];

    switch (table) {
      case 'courses':
        data = ALL_COURSES;
        break;
      case 'users':
        data = MOCK_USERS.map(({ password, ...user }) => user);
        break;
      default:
        data = [];
    }

    // Apply filter
    if (filter) {
      data = data.filter(item => {
        return Object.entries(filter).every(([key, value]) => item[key] === value);
      });
    }

    return { data, error: null };
  }

  private async selectIn(table: string, columns?: string, column?: string, values?: any[]): Promise<MockResponse<any[]>> {
    await delay();
    const { data } = await this.select(table, columns);
    
    if (!data || !column || !values) return { data: [], error: null };

    const filtered = data.filter(item => values.includes(item[column]));
    return { data: filtered, error: null };
  }

  private async selectOrdered(table: string, columns?: string, orderBy?: string, ascending = true): Promise<MockResponse<any[]>> {
    const { data, error } = await this.select(table, columns);
    if (error || !data) return { data: [], error };

    if (orderBy) {
      data.sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        
        if (ascending) {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return { data, error: null };
  }

  private async selectLimited(table: string, columns?: string, limit?: number): Promise<MockResponse<any[]>> {
    const { data, error } = await this.select(table, columns);
    if (error || !data) return { data: [], error };

    return { data: limit ? data.slice(0, limit) : data, error: null };
  }

  private async selectSingle(table: string, columns?: string): Promise<MockResponse<any>> {
    const { data, error } = await this.select(table, columns);
    if (error || !data) return { data: null, error };

    return { data: data[0] || null, error: null };
  }

  private async selectRange(table: string, columns?: string, from?: number, to?: number): Promise<MockResponse<any[]>> {
    const { data, error } = await this.select(table, columns);
    if (error || !data) return { data: [], error };

    const start = from || 0;
    const end = to ? to + 1 : data.length;

    return { data: data.slice(start, end), error: null };
  }

  private async insert(table: string, values: any | any[], columns?: string): Promise<MockResponse<any>> {
    await delay(200);
    
    // For mock API, just return the inserted values
    const insertedData = Array.isArray(values) ? values : [values];
    
    // Add IDs and timestamps
    const dataWithMetadata = insertedData.map(item => ({
      ...item,
      id: item.id || `${table}_${Date.now()}_${Math.random()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    return { 
      data: Array.isArray(values) ? dataWithMetadata : dataWithMetadata[0], 
      error: null 
    };
  }

  private async update(table: string, values: any, filter?: any, columns?: string): Promise<MockResponse<any>> {
    await delay(150);
    
    // Mock update - return updated values
    const updatedData = {
      ...values,
      updated_at: new Date().toISOString()
    };

    return { data: updatedData, error: null };
  }

  private async delete(table: string, filter?: any): Promise<MockResponse<any>> {
    await delay(100);
    
    // Mock delete - return success
    return { data: null, error: null };
  }

  // Course-specific methods
  courses = {
    getAll: async (): Promise<MockResponse<Course[]>> => {
      await delay();
      return { data: ALL_COURSES, error: null };
    },

    getById: async (id: string): Promise<MockResponse<CourseDetail | null>> => {
      await delay();
      const course = COURSE_DETAILS[id];
      return { data: course || null, error: course ? null : new Error('Course not found') };
    },

    getFeatured: async (): Promise<MockResponse<Course[]>> => {
      await delay();
      return { data: getFeaturedCourses(), error: null };
    },

    getMarketplace: async (): Promise<MockResponse<Course[]>> => {
      await delay();
      return { data: ALL_COURSES, error: null };
    },

    enroll: async (courseId: string, userId: string): Promise<MockResponse<any>> => {
      await delay(300);
      return { 
        data: { 
          course_id: courseId, 
          user_id: userId, 
          enrolled_at: new Date().toISOString() 
        }, 
        error: null 
      };
    }
  };

  // Discussion/Forum methods - placeholder for future implementation
  discussions = {
    getAll: async (): Promise<MockResponse<any[]>> => {
      await delay();
      return { data: [], error: null };
    },

    getCategories: async (): Promise<MockResponse<any[]>> => {
      await delay();
      return { data: [], error: null };
    },

    getByCategory: async (categoryId: string): Promise<MockResponse<any[]>> => {
      await delay();
      return { data: [], error: null };
    }
  };

  // Library methods - placeholder for future implementation
  library = {
    getAll: async (): Promise<MockResponse<any[]>> => {
      await delay();
      return { data: [], error: null };
    },

    getCategories: async (): Promise<MockResponse<any[]>> => {
      await delay();
      return { data: [], error: null };
    },

    getFeatured: async (): Promise<MockResponse<any[]>> => {
      await delay();
      return { data: [], error: null };
    }
  };

  // User profile methods
  profile = {
    get: async (): Promise<MockResponse<UserProfile>> => {
      await delay();
      return { data: DEFAULT_USER_PROFILE, error: null };
    },

    update: async (updates: Partial<UserProfile>): Promise<MockResponse<UserProfile>> => {
      await delay(200);
      const updated = { ...DEFAULT_USER_PROFILE, ...updates };
      return { data: updated, error: null };
    }
  };

  // Settings methods
  settings = {
    getNotifications: async (): Promise<MockResponse<NotificationSettings>> => {
      await delay();
      return { data: DEFAULT_NOTIFICATION_SETTINGS, error: null };
    },

    updateNotifications: async (settings: Partial<NotificationSettings>): Promise<MockResponse<NotificationSettings>> => {
      await delay(200);
      const updated = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };
      return { data: updated, error: null };
    },

    getDevices: async (): Promise<MockResponse<ActiveDevice[]>> => {
      await delay();
      return { data: MOCK_ACTIVE_DEVICES, error: null };
    },

    getPaymentMethods: async (): Promise<MockResponse<PaymentMethod[]>> => {
      await delay();
      return { data: MOCK_PAYMENT_METHODS, error: null };
    },

    getSubscriptions: async (): Promise<MockResponse<Subscription[]>> => {
      await delay();
      return { data: [MOCK_SUBSCRIPTION], error: null };
    },

    getInvoices: async (): Promise<MockResponse<Invoice[]>> => {
      await delay();
      return { data: MOCK_INVOICES, error: null };
    },

    getSecurity: async (): Promise<MockResponse<SecuritySettings>> => {
      await delay();
      return { data: MOCK_SECURITY_SETTINGS, error: null };
    }
  };
}

// Create singleton instance
export const mockApi = new MockAPI();

// Default export for easy importing
export default mockApi;

// Utility function to check authentication
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const sessionStr = localStorage.getItem('supabase.auth.token');
    if (!sessionStr) return false;

    const session: MockSession = JSON.parse(sessionStr);
    return Date.now() <= session.expires_at;
  } catch {
    return false;
  }
};

// Get current user from session
export const getCurrentUser = (): MockUser | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const sessionStr = localStorage.getItem('supabase.auth.token');
    if (!sessionStr) return null;

    const session: MockSession = JSON.parse(sessionStr);
    
    // Check if session expired
    if (Date.now() > session.expires_at) {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('auth_user');
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
};