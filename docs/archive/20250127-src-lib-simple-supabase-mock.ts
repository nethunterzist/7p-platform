/**
 * SIMPLE SUPABASE MOCK - 7P Education
 * Simple drop-in replacement for Supabase with proper Promise support
 */

import { 
  ALL_COURSES, 
  COURSE_DETAILS_MAP,
  ALL_DISCUSSIONS,
  ALL_LIBRARY_RESOURCES,
  USER_PROFILE
} from '@/data';

// Simple mock user type
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  created_at: string;
  last_sign_in_at: string;
}

export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: MockUser;
}

// Mock users
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

// Simple response type
interface MockResponse<T> {
  data: T | null;
  error: Error | null;
}

// Simple delay function
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Mock admin courses data
const MOCK_ADMIN_COURSES = [
  {
    id: 'amazon-full-mentoring',
    name: 'Amazon Full Mentorluk Eğitimi',
    title: 'Amazon Full Mentorluk Eğitimi',
    description: 'Amazon FBA sürecinin A\'dan Z\'ye anlatıldığı kapsamlı eğitim programı',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-01T15:30:00Z',
    created_by: '1'
  },
  {
    id: 'amazon-ppc',
    name: 'Amazon PPC Reklam Uzmanlığı',
    title: 'Amazon PPC Reklam Uzmanlığı',
    description: 'Amazon PPC reklamcılığında uzman seviyesine çıkacağınız detaylı eğitim serisi',
    is_active: true,
    created_at: '2024-02-20T09:00:00Z',
    updated_at: '2024-11-28T14:20:00Z',
    created_by: '1'
  },
  {
    id: 'amazon-wholesale',
    name: 'Amazon Wholesale Stratejileri',
    title: 'Amazon Wholesale Stratejileri', 
    description: 'Amazon\'da wholesale satış yaparak büyük karlar elde etme yöntemleri',
    is_active: false,
    created_at: '2024-03-10T11:30:00Z',
    updated_at: '2024-11-15T16:45:00Z',
    created_by: '1'
  },
  {
    id: 'digital-marketing',
    name: 'Dijital Pazarlama Temelleri',
    title: 'Dijital Pazarlama Temelleri',
    description: 'E-ticaret ve dijital pazarlama stratejilerinin temel prensipleri',
    is_active: true,
    created_at: '2024-04-05T08:15:00Z',
    updated_at: '2024-12-02T10:20:00Z',
    created_by: '1'
  }
];

// Simple mock data getter
async function getMockData(table: string, filter?: any): Promise<any[]> {
  await delay(50);
  
  let data: any[] = [];
  
  switch (table) {
    case 'courses':
      data = MOCK_ADMIN_COURSES;
      break;
    case 'discussions':
    case 'topics':
      data = ALL_DISCUSSIONS;
      break;
    case 'library_resources':
      data = ALL_LIBRARY_RESOURCES;
      break;
    case 'users':
      data = MOCK_USERS.map(({ password, ...user }) => user);
      break;
    case 'enrollments':
    case 'payments':
    case 'transactions':
    case 'modules':
    case 'lessons':
    case 'questions':
      data = []; // Empty for admin pages
      break;
    default:
      data = [];
  }
  
  // Apply simple filter
  if (filter) {
    data = data.filter(item => {
      return Object.entries(filter).every(([key, value]) => 
        item[key] === value
      );
    });
  }
  
  return data;
}

// Simple mock client
class SimpleMockClient {
  // Auth methods
  auth = {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
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
        expires_at: Date.now() + (24 * 60 * 60 * 1000),
        user: mockUser
      };

      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      
      return { data: { user: mockUser, session }, error: null };
    },

    signUp: async ({ email, password, options }: any) => {
      await delay(500);
      
      const existingUser = MOCK_USERS.find(u => u.email === email);
      if (existingUser) {
        return { data: null, error: new Error('User already exists') };
      }

      const newUser: MockUser = {
        id: `user_${Date.now()}`,
        email,
        name: options?.data?.name || email.split('@')[0],
        role: 'student',
        created_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString()
      };

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

    getUser: async () => {
      await delay(50);
      
      try {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (!sessionStr) {
          return { data: { user: null }, error: null };
        }

        const session: MockSession = JSON.parse(sessionStr);
        if (Date.now() > session.expires_at) {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('auth_user');
          return { data: { user: null }, error: null };
        }

        return { data: { user: session.user }, error: null };
      } catch {
        return { data: { user: null }, error: null };
      }
    },

    getSession: async () => {
      await delay(50);
      
      try {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (!sessionStr) {
          return { data: { session: null }, error: null };
        }

        const session: MockSession = JSON.parse(sessionStr);
        if (Date.now() > session.expires_at) {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('auth_user');
          return { data: { session: null }, error: null };
        }

        return { data: { session }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },

    signOut: async () => {
      await delay(100);
      
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      
      return { data: null, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
      const checkAuth = () => {
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

      setTimeout(checkAuth, 100);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  };

  // Database methods with chainable query builder
  from(table: string) {
    let queryState = {
      table,
      columns: '*',
      filters: {} as any,
      orderColumn: '',
      orderDirection: 'asc' as 'asc' | 'desc',
      limitValue: null as number | null
    };

    const queryBuilder = {
      select: (columns = '*') => {
        queryState.columns = columns;
        return queryBuilder;
      },
      
      eq: (column: string, value: any) => {
        queryState.filters[column] = value;
        return queryBuilder;
      },
      
      order: (column: string, options?: { ascending?: boolean }) => {
        queryState.orderColumn = column;
        queryState.orderDirection = options?.ascending === false ? 'desc' : 'asc';
        return queryBuilder;
      },
      
      limit: (count: number) => {
        queryState.limitValue = count;
        return queryBuilder;
      },
      
      // Execute the query
      then: async (resolve: any, reject: any) => {
        try {
          let data = await getMockData(queryState.table, queryState.filters);
          
          // Apply ordering if specified
          if (queryState.orderColumn) {
            data.sort((a, b) => {
              const aVal = a[queryState.orderColumn];
              const bVal = b[queryState.orderColumn];
              
              // Handle date strings
              if (queryState.orderColumn.includes('_at')) {
                const aDate = new Date(aVal).getTime();
                const bDate = new Date(bVal).getTime();
                return queryState.orderDirection === 'asc' ? aDate - bDate : bDate - aDate;
              }
              
              // Handle regular values
              if (aVal < bVal) return queryState.orderDirection === 'asc' ? -1 : 1;
              if (aVal > bVal) return queryState.orderDirection === 'asc' ? 1 : -1;
              return 0;
            });
          }
          
          // Apply limit if specified
          if (queryState.limitValue) {
            data = data.slice(0, queryState.limitValue);
          }
          
          const result = { data, error: null };
          resolve(result);
        } catch (error) {
          const result = { data: null, error: error as Error };
          reject ? reject(result) : resolve(result);
        }
      },
      
      // For async/await support
      catch: (errorHandler: any) => {
        return queryBuilder.then(undefined, errorHandler);
      }
    };

    // Add direct execution methods for insert/update/delete
    Object.assign(queryBuilder, {
      insert: async (values: any): Promise<MockResponse<any>> => {
        await delay(200);
        const insertedData = Array.isArray(values) ? values : [values];
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
      },
      
      update: (values: any) => ({
        eq: (column: string, value: any) => ({
          then: async (resolve: any) => {
            await delay(150);
            const updatedData = {
              ...values,
              updated_at: new Date().toISOString()
            };
            resolve({ data: updatedData, error: null });
          }
        })
      }),
      
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: async (resolve: any) => {
            await delay(100);
            resolve({ data: null, error: null });
          }
        })
      })
    });

    return queryBuilder;
  }

  // Query builders that return promises directly
  async getCourses() {
    return await this.from('courses').select();
  }

  async getCourse(id: string) {
    const courses = await getMockData('courses');
    const course = courses.find(c => c.id === id);
    return { data: course || null, error: course ? null : new Error('Course not found') };
  }

  async getUsers() {
    return await this.from('users').select();
  }

  async getEnrollments() {
    return { data: [], error: null }; // Empty for mock
  }

  async getPayments() {
    return { data: [], error: null }; // Empty for mock  
  }
}

// Create and export mock client
export const simpleMockClient = new SimpleMockClient();

// Export types
export type { MockResponse };

export default simpleMockClient;