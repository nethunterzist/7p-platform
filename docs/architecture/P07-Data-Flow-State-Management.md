# P07 - Data Flow and State Management Analysis

## Executive Summary

This document provides a comprehensive analysis of the 7P Education Platform's data flow and state management architecture, examining current patterns, synchronization mechanisms, state persistence strategies, and providing detailed recommendations for optimal data consistency, performance, and scalability.

## Current State Management Assessment

### Technology Stack Analysis

**Current Implementation:**
- **Client State**: React Context API, useState, useReducer hooks
- **Server State**: React Query (TanStack Query) for caching
- **Form State**: React Hook Form with controlled components
- **URL State**: Next.js router state management
- **Local Storage**: Browser localStorage for persistence
- **Session Storage**: Session tokens and temporary data
- **Global State**: Custom context providers
- **Real-time State**: WebSocket connections for live updates

### Current State Architecture

**State Hierarchy:**
```
Application State
├── Authentication State
│   ├── User Profile
│   ├── Session Tokens
│   └── Permissions
├── UI State
│   ├── Theme Settings
│   ├── Navigation State
│   ├── Modal States
│   └── Notification Queue
├── Domain State
│   ├── Course Data
│   ├── Enrollment Status
│   ├── Progress Tracking
│   └── Assessment Results
├── Cache State
│   ├── API Response Cache
│   ├── Image Cache
│   └── Computed Values
└── Transient State
    ├── Form Data
    ├── Search Filters
    └── Pagination
```

**Strengths Identified:**
1. **Separation of Concerns**: Clear distinction between UI and domain state
2. **Modern Tooling**: React Query for efficient server state management
3. **Type Safety**: TypeScript ensures type-safe state operations
4. **Performance**: Built-in caching and memoization strategies
5. **Developer Experience**: Hot module replacement preserves state

**Areas for Improvement:**
1. **State Synchronization**: Inconsistent sync between client and server
2. **Complex State Logic**: Scattered state logic across components
3. **Performance Issues**: Unnecessary re-renders from poor state organization
4. **Persistence Strategy**: Limited offline support and state recovery
5. **Real-time Updates**: Basic WebSocket implementation needs enhancement

## Detailed Data Flow Analysis

### 1. Authentication State Management

**Current Implementation:**

```typescript
// Current: Basic auth context
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const user = await fetchUser(token);
          setUser(user);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Enhanced Authentication State Architecture:**

```typescript
// Enhanced: Comprehensive auth state management with Zustand
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  
  // Token management
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setPermissions: (permissions: Permission[]) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // Initial state
          user: null,
          session: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
          error: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          
          // Login action with optimistic updates
          login: async (credentials) => {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });
            
            try {
              const response = await authService.login(credentials);
              
              set((state) => {
                state.user = response.user;
                state.session = response.session;
                state.accessToken = response.accessToken;
                state.refreshToken = response.refreshToken;
                state.tokenExpiry = new Date(response.expiresAt);
                state.isAuthenticated = true;
                state.isLoading = false;
              });
              
              // Set up token refresh
              get().scheduleTokenRefresh();
              
              // Load permissions
              await get().loadPermissions();
              
            } catch (error) {
              set((state) => {
                state.error = error as AuthError;
                state.isLoading = false;
                state.isAuthenticated = false;
              });
              throw error;
            }
          },
          
          // Logout with cleanup
          logout: async () => {
            const { accessToken } = get();
            
            try {
              if (accessToken) {
                await authService.logout(accessToken);
              }
            } finally {
              set((state) => {
                state.user = null;
                state.session = null;
                state.permissions = [];
                state.isAuthenticated = false;
                state.accessToken = null;
                state.refreshToken = null;
                state.tokenExpiry = null;
              });
              
              // Clear persisted data
              localStorage.removeItem('auth-storage');
            }
          },
          
          // Token refresh logic
          refreshSession: async () => {
            const { refreshToken } = get();
            if (!refreshToken) throw new Error('No refresh token');
            
            try {
              const response = await authService.refreshToken(refreshToken);
              
              set((state) => {
                state.accessToken = response.accessToken;
                state.tokenExpiry = new Date(response.expiresAt);
              });
              
              // Reschedule next refresh
              get().scheduleTokenRefresh();
              
            } catch (error) {
              // Token refresh failed, logout user
              await get().logout();
              throw error;
            }
          },
          
          // Update user profile
          updateUser: (updates) => {
            set((state) => {
              if (state.user) {
                Object.assign(state.user, updates);
              }
            });
          },
          
          // Permission management
          setPermissions: (permissions) => {
            set((state) => {
              state.permissions = permissions;
            });
          },
          
          // Error handling
          clearError: () => {
            set((state) => {
              state.error = null;
            });
          },
          
          // Helper methods
          scheduleTokenRefresh: () => {
            const { tokenExpiry } = get();
            if (!tokenExpiry) return;
            
            const now = new Date();
            const expiryTime = tokenExpiry.getTime();
            const refreshTime = expiryTime - (5 * 60 * 1000); // Refresh 5 minutes before expiry
            const timeout = refreshTime - now.getTime();
            
            if (timeout > 0) {
              setTimeout(() => {
                get().refreshSession();
              }, timeout);
            }
          },
          
          loadPermissions: async () => {
            const { user } = get();
            if (!user) return;
            
            const permissions = await permissionService.getUserPermissions(user.id);
            get().setPermissions(permissions);
          }
        })),
        {
          name: 'auth-storage',
          partialize: (state) => ({
            user: state.user,
            refreshToken: state.refreshToken,
            tokenExpiry: state.tokenExpiry
          })
        }
      )
    ),
    { name: 'Auth Store' }
  )
);

// Selectors for optimized re-renders
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const usePermissions = () => useAuthStore((state) => state.permissions);

// Permission check hook
export const useHasPermission = (permission: string) => {
  const permissions = usePermissions();
  return permissions.some(p => p.name === permission || p.name === '*');
};
```

### 2. Global Application State

**Enhanced Global State Management:**

```typescript
// Comprehensive application state with Zustand
interface AppState {
  // UI State
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  activeModal: string | null;
  notifications: Notification[];
  
  // Navigation State
  breadcrumbs: Breadcrumb[];
  navigationHistory: string[];
  
  // Feature Flags
  features: Record<string, boolean>;
  
  // Preferences
  preferences: UserPreferences;
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setFeatureFlag: (flag: string, enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: 'system',
        sidebarCollapsed: false,
        activeModal: null,
        notifications: [],
        breadcrumbs: [],
        navigationHistory: [],
        features: {},
        preferences: defaultPreferences,
        
        // Theme management
        setTheme: (theme) => {
          set({ theme });
          
          // Apply theme to DOM
          const root = document.documentElement;
          root.classList.remove('light', 'dark');
          
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
              ? 'dark' 
              : 'light';
            root.classList.add(systemTheme);
          } else {
            root.classList.add(theme);
          }
        },
        
        // Sidebar toggle
        toggleSidebar: () => set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        })),
        
        // Modal management
        openModal: (modalId) => set({ activeModal: modalId }),
        closeModal: () => set({ activeModal: null }),
        
        // Notification system
        addNotification: (notification) => {
          const id = notification.id || generateId();
          const notificationWithId = { ...notification, id };
          
          set((state) => ({
            notifications: [...state.notifications, notificationWithId]
          }));
          
          // Auto-dismiss after timeout
          if (notification.autoDismiss !== false) {
            setTimeout(() => {
              get().removeNotification(id);
            }, notification.duration || 5000);
          }
        },
        
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        
        // Preferences
        updatePreferences: (preferences) => set((state) => ({
          preferences: { ...state.preferences, ...preferences }
        })),
        
        // Feature flags
        setFeatureFlag: (flag, enabled) => set((state) => ({
          features: { ...state.features, [flag]: enabled }
        }))
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          preferences: state.preferences
        })
      }
    ),
    { name: 'App Store' }
  )
);
```

### 3. Domain State Management

**Course State Management:**

```typescript
// Course state with optimistic updates and caching
interface CourseState {
  // Data
  courses: Course[];
  enrolledCourses: EnrolledCourse[];
  currentCourse: Course | null;
  currentLesson: Lesson | null;
  
  // Progress tracking
  progress: Record<string, CourseProgress>;
  completedLessons: Set<string>;
  
  // UI State
  filters: CourseFilters;
  sortBy: SortOption;
  viewMode: 'grid' | 'list';
  
  // Loading states
  isLoading: boolean;
  isEnrolling: boolean;
  isSavingProgress: boolean;
  
  // Actions
  fetchCourses: (filters?: CourseFilters) => Promise<void>;
  enrollInCourse: (courseId: string) => Promise<void>;
  updateProgress: (courseId: string, lessonId: string, progress: number) => void;
  completeLesson: (courseId: string, lessonId: string) => Promise<void>;
  setCurrentCourse: (course: Course | null) => void;
  setCurrentLesson: (lesson: Lesson | null) => void;
  setFilters: (filters: CourseFilters) => void;
  setSortBy: (sortBy: SortOption) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
}

export const useCourseStore = create<CourseState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        courses: [],
        enrolledCourses: [],
        currentCourse: null,
        currentLesson: null,
        progress: {},
        completedLessons: new Set(),
        filters: {},
        sortBy: 'popular',
        viewMode: 'grid',
        isLoading: false,
        isEnrolling: false,
        isSavingProgress: false,
        
        // Fetch courses with caching
        fetchCourses: async (filters) => {
          set((state) => {
            state.isLoading = true;
          });
          
          try {
            const courses = await courseService.getCourses(filters || get().filters);
            
            set((state) => {
              state.courses = courses;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.isLoading = false;
            });
            throw error;
          }
        },
        
        // Optimistic enrollment
        enrollInCourse: async (courseId) => {
          const course = get().courses.find(c => c.id === courseId);
          if (!course) throw new Error('Course not found');
          
          // Optimistic update
          set((state) => {
            state.isEnrolling = true;
            state.enrolledCourses.push({
              ...course,
              enrolledAt: new Date(),
              progress: 0
            });
          });
          
          try {
            await courseService.enrollInCourse(courseId);
            
            // Initialize progress tracking
            set((state) => {
              state.progress[courseId] = {
                courseId,
                totalLessons: course.lessonCount,
                completedLessons: 0,
                progressPercentage: 0,
                lastAccessedAt: new Date()
              };
              state.isEnrolling = false;
            });
            
          } catch (error) {
            // Revert optimistic update
            set((state) => {
              state.enrolledCourses = state.enrolledCourses.filter(
                c => c.id !== courseId
              );
              state.isEnrolling = false;
            });
            throw error;
          }
        },
        
        // Progress tracking with debounced saving
        updateProgress: debounce((courseId, lessonId, progress) => {
          set((state) => {
            if (!state.progress[courseId]) {
              state.progress[courseId] = {
                courseId,
                totalLessons: 0,
                completedLessons: 0,
                progressPercentage: 0,
                lastAccessedAt: new Date()
              };
            }
            
            // Update progress
            const courseProgress = state.progress[courseId];
            courseProgress.lastAccessedAt = new Date();
            
            // Mark lesson as completed if progress >= 90%
            if (progress >= 90 && !state.completedLessons.has(lessonId)) {
              state.completedLessons.add(lessonId);
              courseProgress.completedLessons++;
              courseProgress.progressPercentage = 
                (courseProgress.completedLessons / courseProgress.totalLessons) * 100;
            }
          });
          
          // Save to server
          get().saveProgressToServer(courseId, lessonId, progress);
        }, 1000),
        
        // Save progress to server
        saveProgressToServer: async (courseId, lessonId, progress) => {
          set((state) => {
            state.isSavingProgress = true;
          });
          
          try {
            await progressService.saveProgress(courseId, lessonId, progress);
            
            set((state) => {
              state.isSavingProgress = false;
            });
          } catch (error) {
            console.error('Failed to save progress:', error);
            
            set((state) => {
              state.isSavingProgress = false;
            });
            
            // Retry logic
            setTimeout(() => {
              get().saveProgressToServer(courseId, lessonId, progress);
            }, 5000);
          }
        },
        
        // Complete lesson
        completeLesson: async (courseId, lessonId) => {
          // Optimistic update
          set((state) => {
            state.completedLessons.add(lessonId);
            
            if (state.progress[courseId]) {
              state.progress[courseId].completedLessons++;
              state.progress[courseId].progressPercentage = 
                (state.progress[courseId].completedLessons / 
                 state.progress[courseId].totalLessons) * 100;
            }
          });
          
          try {
            await progressService.completeLesson(courseId, lessonId);
          } catch (error) {
            // Revert on failure
            set((state) => {
              state.completedLessons.delete(lessonId);
              
              if (state.progress[courseId]) {
                state.progress[courseId].completedLessons--;
                state.progress[courseId].progressPercentage = 
                  (state.progress[courseId].completedLessons / 
                   state.progress[courseId].totalLessons) * 100;
              }
            });
            throw error;
          }
        },
        
        // UI state setters
        setCurrentCourse: (course) => set({ currentCourse: course }),
        setCurrentLesson: (lesson) => set({ currentLesson: lesson }),
        setFilters: (filters) => set({ filters }),
        setSortBy: (sortBy) => set({ sortBy }),
        setViewMode: (viewMode) => set({ viewMode })
      }))
    ),
    { name: 'Course Store' }
  )
);
```

### 4. Server State Management with React Query

**Enhanced React Query Configuration:**

```typescript
// React Query setup with advanced caching
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Create query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error instanceof NetworkError) {
          return failureCount < 3;
        }
        if (error instanceof ServerError) {
          return error.status >= 500 && failureCount < 2;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always'
    },
    mutations: {
      retry: false,
      onError: (error) => {
        // Global error handling
        if (error instanceof AuthError) {
          // Redirect to login
          router.push('/login');
        }
      }
    }
  }
});

// Persist cache to localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'react-query-cache',
  throttleTime: 1000
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Only persist successful queries
      return query.state.status === 'success';
    }
  }
});

// Custom hooks for data fetching
export function useCourses(filters?: CourseFilters) {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: () => courseService.getCourses(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => {
      // Transform and sort data
      return data.sort((a, b) => b.rating - a.rating);
    }
  });
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseService.getCourse(courseId),
    enabled: !!courseId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Optimistic updates
export function useEnrollCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: courseService.enrollInCourse,
    onMutate: async (courseId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['courses'] });
      
      // Snapshot previous value
      const previousCourses = queryClient.getQueryData(['courses']);
      
      // Optimistically update
      queryClient.setQueryData(['courses'], (old: Course[]) => {
        return old.map(course => 
          course.id === courseId 
            ? { ...course, isEnrolled: true }
            : course
        );
      });
      
      return { previousCourses };
    },
    onError: (err, courseId, context) => {
      // Rollback on error
      if (context?.previousCourses) {
        queryClient.setQueryData(['courses'], context.previousCourses);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['enrolled-courses'] });
    }
  });
}

// Infinite queries for pagination
export function useInfiniteCourses(filters?: CourseFilters) {
  return useInfiniteQuery({
    queryKey: ['infinite-courses', filters],
    queryFn: ({ pageParam = 1 }) => 
      courseService.getCourses({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000
  });
}
```

### 5. Real-time State Synchronization

**WebSocket State Management:**

```typescript
// Real-time state synchronization
interface RealtimeState {
  socket: WebSocket | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscriptions: Map<string, Subscription>;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribe: (channel: string, handler: MessageHandler) => () => void;
  send: (channel: string, data: any) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  socket: null,
  connectionStatus: 'disconnected',
  subscriptions: new Map(),
  
  connect: () => {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);
    
    socket.onopen = () => {
      set({ socket, connectionStatus: 'connected' });
      
      // Resubscribe to channels
      const { subscriptions } = get();
      subscriptions.forEach((sub, channel) => {
        socket.send(JSON.stringify({
          type: 'subscribe',
          channel
        }));
      });
    };
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { subscriptions } = get();
      
      // Route message to subscribers
      const subscription = subscriptions.get(message.channel);
      if (subscription) {
        subscription.handlers.forEach(handler => handler(message.data));
      }
    };
    
    socket.onerror = () => {
      set({ connectionStatus: 'error' });
    };
    
    socket.onclose = () => {
      set({ socket: null, connectionStatus: 'disconnected' });
      
      // Reconnect after delay
      setTimeout(() => get().connect(), 5000);
    };
    
    set({ socket, connectionStatus: 'connecting' });
  },
  
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, connectionStatus: 'disconnected' });
    }
  },
  
  subscribe: (channel, handler) => {
    const { subscriptions, socket } = get();
    
    // Get or create subscription
    let subscription = subscriptions.get(channel);
    if (!subscription) {
      subscription = {
        channel,
        handlers: new Set()
      };
      subscriptions.set(channel, subscription);
      
      // Subscribe on server
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'subscribe',
          channel
        }));
      }
    }
    
    // Add handler
    subscription.handlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      subscription!.handlers.delete(handler);
      
      // Unsubscribe if no handlers left
      if (subscription!.handlers.size === 0) {
        subscriptions.delete(channel);
        
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'unsubscribe',
            channel
          }));
        }
      }
    };
  },
  
  send: (channel, data) => {
    const { socket } = get();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'message',
        channel,
        data
      }));
    }
  }
}));

// Hook for real-time course updates
export function useRealtimeCourseUpdates(courseId: string) {
  const queryClient = useQueryClient();
  const subscribe = useRealtimeStore((state) => state.subscribe);
  
  useEffect(() => {
    const unsubscribe = subscribe(`course:${courseId}`, (data) => {
      // Update React Query cache
      queryClient.setQueryData(['course', courseId], (old: Course) => ({
        ...old,
        ...data.updates
      }));
      
      // Handle specific events
      switch (data.type) {
        case 'lesson_added':
          queryClient.invalidateQueries(['course', courseId, 'lessons']);
          break;
        case 'price_changed':
          // Show notification
          useAppStore.getState().addNotification({
            type: 'info',
            title: 'Price Updated',
            message: `Course price changed to $${data.newPrice}`
          });
          break;
      }
    });
    
    return unsubscribe;
  }, [courseId, subscribe, queryClient]);
}
```

### 6. Form State Management

**Advanced Form State with Validation:**

```typescript
// Form state management with React Hook Form
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Course creation form schema
const courseFormSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  price: z.number()
    .min(0, 'Price must be non-negative')
    .max(9999, 'Price must not exceed $9999'),
  categoryId: z.string().uuid('Invalid category'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  prerequisites: z.array(z.string()).optional(),
  learningOutcomes: z.array(z.string()).min(1, 'At least one learning outcome is required'),
  thumbnail: z.instanceof(File).optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed')
});

type CourseFormData = z.infer<typeof courseFormSchema>;

// Form state hook with persistence
export function useCourseForm(defaultValues?: Partial<CourseFormData>) {
  const [savedDraft, setSavedDraft] = useState<Partial<CourseFormData> | null>(() => {
    // Load draft from localStorage
    const draft = localStorage.getItem('course-form-draft');
    return draft ? JSON.parse(draft) : null;
  });
  
  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: defaultValues || savedDraft || {
      level: 'beginner',
      price: 0,
      prerequisites: [],
      learningOutcomes: [''],
      tags: []
    },
    mode: 'onChange'
  });
  
  // Auto-save draft
  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem('course-form-draft', JSON.stringify(value));
      setSavedDraft(value as Partial<CourseFormData>);
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);
  
  // Clear draft
  const clearDraft = () => {
    localStorage.removeItem('course-form-draft');
    setSavedDraft(null);
    form.reset();
  };
  
  // Submit handler
  const handleSubmit = async (data: CourseFormData) => {
    try {
      // Upload thumbnail if provided
      let thumbnailUrl;
      if (data.thumbnail) {
        thumbnailUrl = await uploadFile(data.thumbnail);
      }
      
      // Create course
      await courseService.createCourse({
        ...data,
        thumbnail: thumbnailUrl
      });
      
      // Clear draft on success
      clearDraft();
      
      // Show success notification
      useAppStore.getState().addNotification({
        type: 'success',
        title: 'Course Created',
        message: 'Your course has been created successfully'
      });
      
    } catch (error) {
      // Show error notification
      useAppStore.getState().addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: error.message
      });
      
      throw error;
    }
  };
  
  return {
    form,
    savedDraft,
    clearDraft,
    handleSubmit: form.handleSubmit(handleSubmit)
  };
}

// Multi-step form state
export function useMultiStepForm<T extends Record<string, any>>(
  steps: FormStep<T>[],
  defaultValues?: Partial<T>
) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<T>>(defaultValues || {});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  const currentStepConfig = steps[currentStep];
  
  const form = useForm({
    resolver: zodResolver(currentStepConfig.schema),
    defaultValues: formData,
    mode: 'onChange'
  });
  
  const nextStep = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    
    // Save current step data
    const stepData = form.getValues();
    setFormData(prev => ({ ...prev, ...stepData }));
    setCompletedSteps(prev => new Set(prev).add(currentStep));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };
  
  const submitForm = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    
    const finalData = { ...formData, ...form.getValues() };
    return finalData as T;
  };
  
  return {
    form,
    currentStep,
    currentStepConfig,
    completedSteps,
    formData,
    nextStep,
    previousStep,
    goToStep,
    submitForm,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    progress: ((currentStep + 1) / steps.length) * 100
  };
}
```

## Performance Optimization

### 1. State Optimization Strategies

```typescript
// Optimized selectors with memoization
import { shallow } from 'zustand/shallow';
import { createSelector } from 'reselect';

// Memoized selector for filtered courses
export const useFilteredCourses = () => {
  const courses = useCourseStore((state) => state.courses);
  const filters = useCourseStore((state) => state.filters, shallow);
  const sortBy = useCourseStore((state) => state.sortBy);
  
  return useMemo(() => {
    let filtered = courses;
    
    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(c => c.categoryId === filters.category);
    }
    if (filters.level) {
      filtered = filtered.filter(c => c.level === filters.level);
    }
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(c => c.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(c => c.price <= filters.maxPrice!);
    }
    
    // Apply sorting
    return sortCourses(filtered, sortBy);
  }, [courses, filters, sortBy]);
};

// Atomic selectors for fine-grained updates
export const useCourseById = (courseId: string) => {
  return useCourseStore(
    useCallback((state) => state.courses.find(c => c.id === courseId), [courseId])
  );
};

// Subscription with selector
export const useCourseProgress = (courseId: string) => {
  return useCourseStore(
    (state) => state.progress[courseId],
    (prev, next) => prev?.progressPercentage === next?.progressPercentage
  );
};
```

### 2. State Persistence and Hydration

```typescript
// Advanced persistence with versioning and migration
interface PersistConfig {
  version: number;
  migrate: (persistedState: any, version: number) => any;
}

const persistConfig: PersistConfig = {
  version: 2,
  migrate: (persistedState, version) => {
    if (version === 0) {
      // Migration from v0 to v1
      delete persistedState.deprecatedField;
    }
    if (version === 1) {
      // Migration from v1 to v2
      persistedState.preferences = {
        ...defaultPreferences,
        ...persistedState.preferences
      };
    }
    return persistedState;
  }
};

// Hydration helper
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    // Wait for all stores to hydrate
    const unsubscribes = [
      useAuthStore.persist.onFinishHydration(() => setIsHydrated(true)),
      useAppStore.persist.onFinishHydration(() => setIsHydrated(true)),
      useCourseStore.persist.onFinishHydration(() => setIsHydrated(true))
    ];
    
    return () => unsubscribes.forEach(fn => fn());
  }, []);
  
  return isHydrated;
}
```

## Recommendations and Implementation Roadmap

### Immediate Priorities (1-2 weeks)

1. **Migrate to Zustand**
   - Replace Context API with Zustand stores
   - Implement proper state persistence
   - Add development tools integration

2. **Optimize React Query**
   - Configure proper cache times
   - Implement optimistic updates
   - Add offline support

3. **Improve State Organization**
   - Separate UI and domain state
   - Implement atomic selectors
   - Add memoization for expensive computations

### Medium-term Goals (2-4 weeks)

1. **Real-time Synchronization**
   - Implement WebSocket management
   - Add conflict resolution strategies
   - Deploy server-sent events for updates

2. **Advanced Caching**
   - Implement cache invalidation strategies
   - Add background refetching
   - Deploy predictive prefetching

3. **State DevTools**
   - Add time-travel debugging
   - Implement state snapshots
   - Deploy performance monitoring

### Long-term Objectives (1-3 months)

1. **Offline-First Architecture**
   - Implement service worker caching
   - Add offline queue for mutations
   - Deploy sync strategies

2. **State Machine Integration**
   - Implement XState for complex flows
   - Add visual state debugging
   - Deploy state validation

3. **Performance Optimization**
   - Implement virtual stores for large datasets
   - Add state splitting strategies
   - Deploy lazy state loading

## Conclusion

The current data flow and state management architecture provides a foundation but requires significant improvements for scalability and performance. The recommended enhancements focus on centralized state management, efficient caching strategies, real-time synchronization, and offline support.

Key success metrics include:
- Reduced re-render count (target: 50% reduction)
- Improved cache hit rate (target: >80%)
- Better offline support (target: full offline functionality)
- Faster state updates (target: <16ms for UI updates)
- Reduced memory usage (target: 30% reduction)

The phased implementation approach ensures stability while delivering immediate performance improvements and enhanced developer experience.