/**
 * Courses API Integration Tests
 * Tests course management functionality with real database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@/utils/supabase/client';
import { createServiceClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Courses API', () => {
  let supabase: SupabaseClient;
  let serviceClient: SupabaseClient;
  let instructorUserId: string;
  let studentUserId: string;
  let testCourseId: string;

  const testInstructor = {
    email: `instructor-${Date.now()}@test.com`,
    password: 'Test123!@#',
    full_name: 'Test Instructor'
  };

  const testStudent = {
    email: `student-${Date.now()}@test.com`,
    password: 'Test123!@#',
    full_name: 'Test Student'
  };

  const testCourse = {
    title: 'Test Course',
    description: 'A comprehensive test course',
    price: 99.99,
    currency: 'USD',
    level: 'beginner' as const,
    category: 'programming',
    is_published: true
  };

  beforeAll(async () => {
    supabase = createClient();
    serviceClient = createServiceClient();

    // Create test instructor
    const { data: instructorData } = await supabase.auth.signUp({
      email: testInstructor.email,
      password: testInstructor.password,
      options: {
        data: {
          full_name: testInstructor.full_name
        }
      }
    });
    instructorUserId = instructorData.user!.id;

    // Set instructor role
    await serviceClient
      .from('user_profiles')
      .update({ role: 'instructor' })
      .eq('user_id', instructorUserId);

    // Create test student
    const { data: studentData } = await supabase.auth.signUp({
      email: testStudent.email,
      password: testStudent.password,
      options: {
        data: {
          full_name: testStudent.full_name
        }
      }
    });
    studentUserId = studentData.user!.id;

    await supabase.auth.signOut();
  });

  afterAll(async () => {
    // Cleanup
    if (testCourseId) {
      await serviceClient
        .from('courses')
        .delete()
        .eq('id', testCourseId);
    }

    await serviceClient
      .from('user_profiles')
      .delete()
      .in('user_id', [instructorUserId, studentUserId]);

    await supabase.auth.signOut();
  });

  describe('Course Creation', () => {
    beforeEach(async () => {
      // Sign in as instructor
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });
    });

    it('should allow instructor to create a course', async () => {
      const { data: course, error } = await supabase
        .from('courses')
        .insert({
          ...testCourse,
          instructor_id: instructorUserId
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(course).toBeDefined();
      expect(course.title).toBe(testCourse.title);
      expect(course.instructor_id).toBe(instructorUserId);

      testCourseId = course.id;
    });

    it('should validate required course fields', async () => {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          instructor_id: instructorUserId
          // Missing required fields
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should prevent student from creating courses', async () => {
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      const { data, error } = await supabase
        .from('courses')
        .insert({
          ...testCourse,
          instructor_id: studentUserId
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('Course Retrieval', () => {
    beforeEach(async () => {
      // Ensure test course exists
      if (!testCourseId) {
        await supabase.auth.signInWithPassword({
          email: testInstructor.email,
          password: testInstructor.password,
        });

        const { data: course } = await supabase
          .from('courses')
          .insert({
            ...testCourse,
            instructor_id: instructorUserId
          })
          .select()
          .single();

        testCourseId = course!.id;
      }
    });

    it('should retrieve published courses for anonymous users', async () => {
      await supabase.auth.signOut();

      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true);

      expect(error).toBeNull();
      expect(courses).toBeDefined();
      expect(courses.length).toBeGreaterThan(0);

      const testCourseInResults = courses.find(c => c.id === testCourseId);
      expect(testCourseInResults).toBeDefined();
    });

    it('should retrieve course details with instructor info', async () => {
      const { data: course, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:user_profiles!instructor_id(
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('id', testCourseId)
        .single();

      expect(error).toBeNull();
      expect(course).toBeDefined();
      expect(course.instructor).toBeDefined();
      expect(course.instructor.full_name).toBe(testInstructor.full_name);
    });

    it('should allow instructor to see own unpublished courses', async () => {
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      // Create unpublished course
      const { data: unpublishedCourse } = await supabase
        .from('courses')
        .insert({
          ...testCourse,
          title: 'Unpublished Course',
          instructor_id: instructorUserId,
          is_published: false
        })
        .select()
        .single();

      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', instructorUserId);

      expect(error).toBeNull();
      expect(courses).toBeDefined();
      expect(courses.some(c => c.id === unpublishedCourse!.id)).toBe(true);

      // Cleanup
      await supabase
        .from('courses')
        .delete()
        .eq('id', unpublishedCourse!.id);
    });
  });

  describe('Course Enrollment', () => {
    beforeEach(async () => {
      // Sign in as student
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });
    });

    it('should allow student to enroll in course', async () => {
      const { data: enrollment, error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: studentUserId,
          course_id: testCourseId,
          status: 'active'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(enrollment).toBeDefined();
      expect(enrollment.user_id).toBe(studentUserId);
      expect(enrollment.course_id).toBe(testCourseId);
      expect(enrollment.status).toBe('active');
    });

    it('should prevent duplicate enrollments', async () => {
      // First enrollment should succeed
      await supabase
        .from('course_enrollments')
        .insert({
          user_id: studentUserId,
          course_id: testCourseId,
          status: 'active'
        });

      // Second enrollment should fail
      const { data, error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: studentUserId,
          course_id: testCourseId,
          status: 'active'
        });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should allow student to view enrolled courses', async () => {
      // Ensure enrollment exists
      await supabase
        .from('course_enrollments')
        .upsert({
          user_id: studentUserId,
          course_id: testCourseId,
          status: 'active'
        });

      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          course:courses(
            title,
            description,
            instructor_id
          )
        `)
        .eq('user_id', studentUserId)
        .eq('status', 'active');

      expect(error).toBeNull();
      expect(enrollments).toBeDefined();
      expect(enrollments.length).toBeGreaterThan(0);

      const testEnrollment = enrollments.find(e => e.course_id === testCourseId);
      expect(testEnrollment).toBeDefined();
      expect(testEnrollment!.course.title).toBe(testCourse.title);
    });
  });

  describe('Course Content Access', () => {
    let moduleId: string;
    let lessonId: string;

    beforeEach(async () => {
      // Ensure student is enrolled
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      await supabase
        .from('course_enrollments')
        .upsert({
          user_id: studentUserId,
          course_id: testCourseId,
          status: 'active'
        });

      // Create test module and lesson as instructor
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      const { data: module } = await supabase
        .from('course_modules')
        .insert({
          course_id: testCourseId,
          title: 'Test Module',
          description: 'Test module description',
          sort_order: 1
        })
        .select()
        .single();

      moduleId = module!.id;

      const { data: lesson } = await supabase
        .from('course_lessons')
        .insert({
          module_id: moduleId,
          title: 'Test Lesson',
          content: 'Test lesson content',
          sort_order: 1,
          lesson_type: 'text'
        })
        .select()
        .single();

      lessonId = lesson!.id;

      // Switch back to student
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });
    });

    it('should allow enrolled student to access course modules', async () => {
      const { data: modules, error } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', testCourseId)
        .order('sort_order');

      expect(error).toBeNull();
      expect(modules).toBeDefined();
      expect(modules.length).toBeGreaterThan(0);
      expect(modules[0].id).toBe(moduleId);
    });

    it('should allow enrolled student to access lessons', async () => {
      const { data: lessons, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('module_id', moduleId)
        .order('sort_order');

      expect(error).toBeNull();
      expect(lessons).toBeDefined();
      expect(lessons.length).toBeGreaterThan(0);
      expect(lessons[0].id).toBe(lessonId);
    });

    it('should prevent non-enrolled student access to content', async () => {
      // Create another student
      const { data: anotherStudent } = await supabase.auth.signUp({
        email: `another-student-${Date.now()}@test.com`,
        password: 'Test123!@#'
      });

      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: `another-student-${Date.now()}@test.com`,
        password: 'Test123!@#'
      });

      const { data: modules, error } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', testCourseId);

      // Should return empty due to RLS
      expect(modules).toEqual([]);

      // Cleanup
      await serviceClient
        .from('user_profiles')
        .delete()
        .eq('user_id', anotherStudent!.user!.id);
    });

    afterEach(async () => {
      // Cleanup lesson and module
      if (lessonId) {
        await serviceClient
          .from('course_lessons')
          .delete()
          .eq('id', lessonId);
      }
      if (moduleId) {
        await serviceClient
          .from('course_modules')
          .delete()
          .eq('id', moduleId);
      }
    });
  });

  describe('Course Progress Tracking', () => {
    let materialId: string;

    beforeEach(async () => {
      // Sign in as instructor and create material
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      const { data: material } = await supabase
        .from('course_materials')
        .insert({
          course_id: testCourseId,
          title: 'Test Material',
          file_path: 'test-material.pdf',
          file_type: 'pdf',
          file_size: 1024
        })
        .select()
        .single();

      materialId = material!.id;

      // Switch to student and enroll
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      await supabase
        .from('course_enrollments')
        .upsert({
          user_id: studentUserId,
          course_id: testCourseId,
          status: 'active'
        });
    });

    it('should track material progress for students', async () => {
      const { data: progress, error } = await supabase
        .from('user_material_progress')
        .insert({
          user_id: studentUserId,
          material_id: materialId,
          status: 'completed',
          progress_percentage: 100
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(progress).toBeDefined();
      expect(progress.status).toBe('completed');
      expect(progress.progress_percentage).toBe(100);
    });

    it('should calculate overall course progress', async () => {
      // Add progress record
      await supabase
        .from('user_material_progress')
        .upsert({
          user_id: studentUserId,
          material_id: materialId,
          status: 'completed',
          progress_percentage: 100
        });

      // Query progress
      const { data: progressRecords, error } = await supabase
        .from('user_material_progress')
        .select(`
          *,
          material:course_materials(
            course_id
          )
        `)
        .eq('user_id', studentUserId);

      expect(error).toBeNull();
      expect(progressRecords).toBeDefined();
      expect(progressRecords.length).toBeGreaterThan(0);

      const courseProgress = progressRecords.filter(
        p => p.material.course_id === testCourseId
      );
      expect(courseProgress.length).toBeGreaterThan(0);
    });

    afterEach(async () => {
      // Cleanup material
      if (materialId) {
        await serviceClient
          .from('course_materials')
          .delete()
          .eq('id', materialId);
      }
    });
  });
});