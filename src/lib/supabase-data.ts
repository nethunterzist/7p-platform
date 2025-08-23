/**
 * SUPABASE DATA SERVICE - Production Ready
 * Real database integration replacing all mock data systems
 */

import { createClient } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin' | 'instructor';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_active: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  price: number;
  is_published: boolean;
  instructor_id: string;
  created_at: string;
  updated_at: string;
  total_lessons: number;
  duration_minutes: number;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at?: string;
  progress_percentage: number;
  last_accessed_at?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  totalRevenue: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface RecentActivity {
  id: string;
  type: 'user_registration' | 'course_completion' | 'enrollment' | 'system_alert';
  message: string;
  timestamp: string;
  user_id?: string;
  user_email?: string;
  course_title?: string;
  metadata?: any;
}

class SupabaseDataService {
  private supabase = createClient();

  // ============================================================================
  // ADMIN DASHBOARD DATA
  // ============================================================================

  async getAdminStats(): Promise<AdminStats> {
    try {
      // Fetch all data in parallel
      const [
        { data: users, error: usersError },
        { data: courses, error: coursesError },
        { data: enrollments, error: enrollmentsError }
      ] = await Promise.all([
        this.supabase.from('profiles').select('*'),
        this.supabase.from('courses').select('*'),
        this.supabase.from('enrollments').select('*')
      ]);

      if (usersError) throw usersError;
      if (coursesError) throw coursesError;
      if (enrollmentsError) throw enrollmentsError;

      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const totalUsers = users?.length || 0;
      const newUsersThisWeek = users?.filter(u => 
        new Date(u.created_at) > weekAgo
      ).length || 0;
      
      const activeUsers = users?.filter(u => 
        u.last_login_at && new Date(u.last_login_at) > weekAgo
      ).length || 0;

      const totalCourses = courses?.length || 0;
      const publishedCourses = courses?.filter(c => c.is_published).length || 0;
      
      const totalEnrollments = enrollments?.length || 0;
      const completedEnrollments = enrollments?.filter(e => e.status === 'completed').length || 0;
      const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

      // Calculate revenue (assuming price is stored in courses)
      let totalRevenue = 0;
      if (courses && enrollments) {
        for (const enrollment of enrollments) {
          const course = courses.find(c => c.id === enrollment.course_id);
          if (course && course.price) {
            totalRevenue += course.price;
          }
        }
      }

      return {
        totalUsers,
        activeUsers,
        newUsersThisWeek,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        completedEnrollments,
        completionRate,
        totalRevenue,
        systemHealth: 'healthy' // TODO: Implement health check logic
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw error;
    }
  }

  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      // Fetch recent activities from different tables
      const [
        { data: recentUsers },
        { data: recentEnrollments },
        { data: recentCompletions }
      ] = await Promise.all([
        this.supabase
          .from('profiles')
          .select('id, email, name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        
        this.supabase
          .from('enrollments')
          .select(`
            id, enrolled_at, user_id,
            profiles!user_id(email, name),
            courses!course_id(title, slug)
          `)
          .order('enrolled_at', { ascending: false })
          .limit(5),
        
        this.supabase
          .from('enrollments')
          .select(`
            id, completed_at, user_id,
            profiles!user_id(email, name),
            courses!course_id(title, slug)
          `)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5)
      ]);

      const activities: RecentActivity[] = [];

      // Add user registrations
      recentUsers?.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          type: 'user_registration',
          message: 'Yeni kullanıcı kaydoldu',
          timestamp: user.created_at,
          user_id: user.id,
          user_email: user.email
        });
      });

      // Add enrollments
      recentEnrollments?.forEach(enrollment => {
        activities.push({
          id: `enrollment_${enrollment.id}`,
          type: 'enrollment',
          message: `"${enrollment.courses?.title || 'Unknown Course'}" kursuna yeni kayıt`,
          timestamp: enrollment.enrolled_at,
          user_id: enrollment.user_id,
          user_email: enrollment.profiles?.email,
          course_title: enrollment.courses?.title
        });
      });

      // Add course completions
      recentCompletions?.forEach(completion => {
        activities.push({
          id: `completion_${completion.id}`,
          type: 'course_completion',
          message: `"${completion.courses?.title || 'Unknown Course'}" kursu tamamlandı`,
          timestamp: completion.completed_at,
          user_id: completion.user_id,
          user_email: completion.profiles?.email,
          course_title: completion.courses?.title
        });
      });

      // Sort by timestamp and limit results
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  async getAllUsers(): Promise<DatabaseUser[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getUserById(id: string): Promise<DatabaseUser | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================================================
  // COURSE MANAGEMENT
  // ============================================================================

  async getAllCourses(): Promise<Course[]> {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPublishedCourses(): Promise<Course[]> {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getCourseById(id: string): Promise<Course | null> {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================================================
  // ENROLLMENT MANAGEMENT
  // ============================================================================

  async getAllEnrollments(): Promise<Enrollment[]> {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select(`
        *,
        profiles!user_id(email, name),
        courses!course_id(title, slug, price)
      `)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select(`
        *,
        courses!course_id(title, slug, description, price, level)
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async isUserEnrolledInCourse(userId: string, courseId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data !== null;
  }

  async enrollUserInCourse(userId: string, courseId: string): Promise<Enrollment> {
    const { data, error } = await this.supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================================================
  // AUTHENTICATION HELPERS
  // ============================================================================

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  async isCurrentUserAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const { data } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return data?.role === 'admin';
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  subscribeToEnrollments(callback: (payload: any) => void) {
    return this.supabase
      .channel('enrollments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, callback)
      .subscribe();
  }

  subscribeToUsers(callback: (payload: any) => void) {
    return this.supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, callback)
      .subscribe();
  }

  subscribeToAdminStats(callback: () => void) {
    const channel = this.supabase
      .channel('admin_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, callback)
      .subscribe();

    return channel;
  }
}

// Export singleton instance
export const supabaseData = new SupabaseDataService();
export default supabaseData;