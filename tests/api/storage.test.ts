/**
 * Storage API Integration Tests
 * Tests file upload/download functionality with Supabase Storage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@/utils/supabase/client';
import { createServiceClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Storage API', () => {
  let supabase: SupabaseClient;
  let serviceClient: SupabaseClient;
  let instructorUserId: string;
  let studentUserId: string;
  let testCourseId: string;
  let uploadedFiles: string[] = [];

  const testInstructor = {
    email: `instructor-storage-${Date.now()}@test.com`,
    password: 'Test123!@#',
    full_name: 'Storage Test Instructor'
  };

  const testStudent = {
    email: `student-storage-${Date.now()}@test.com`,
    password: 'Test123!@#',
    full_name: 'Storage Test Student'
  };

  // Create test file buffer
  const createTestFile = (content: string, filename: string) => {
    const buffer = Buffer.from(content);
    return new File([buffer], filename, { type: 'text/plain' });
  };

  const createTestPDFFile = (filename: string) => {
    // Simple PDF header for testing
    const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000125 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n%%EOF';
    const buffer = Buffer.from(pdfContent);
    return new File([buffer], filename, { type: 'application/pdf' });
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

    // Create test course
    await supabase.auth.signInWithPassword({
      email: testInstructor.email,
      password: testInstructor.password,
    });

    const { data: course } = await supabase
      .from('courses')
      .insert({
        title: 'Storage Test Course',
        description: 'Course for testing storage functionality',
        instructor_id: instructorUserId,
        price: 99.99,
        currency: 'USD',
        level: 'beginner',
        category: 'programming',
        is_published: true
      })
      .select()
      .single();

    testCourseId = course!.id;
    await supabase.auth.signOut();
  });

  afterAll(async () => {
    // Cleanup uploaded files
    for (const filePath of uploadedFiles) {
      try {
        await serviceClient.storage
          .from('course-materials')
          .remove([filePath]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Cleanup test data
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

  describe('Course Materials Bucket', () => {
    beforeEach(async () => {
      // Sign in as instructor
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });
    });

    it('should allow instructor to upload course materials', async () => {
      const testFile = createTestPDFFile('test-material.pdf');
      const filePath = `course-${testCourseId}/materials/test-material-${Date.now()}.pdf`;

      const { data, error } = await supabase.storage
        .from('course-materials')
        .upload(filePath, testFile);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.path).toBe(filePath);

      uploadedFiles.push(filePath);
    });

    it('should reject uploads from students to course materials', async () => {
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      const testFile = createTestFile('Student upload attempt', 'student-file.txt');
      const filePath = `course-${testCourseId}/materials/student-attempt-${Date.now()}.txt`;

      const { data, error } = await supabase.storage
        .from('course-materials')
        .upload(filePath, testFile);

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should allow instructor to list course materials', async () => {
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      // Upload a test file first
      const testFile = createTestPDFFile('list-test.pdf');
      const filePath = `course-${testCourseId}/materials/list-test-${Date.now()}.pdf`;

      await supabase.storage
        .from('course-materials')
        .upload(filePath, testFile);

      uploadedFiles.push(filePath);

      // List files
      const { data: files, error } = await supabase.storage
        .from('course-materials')
        .list(`course-${testCourseId}/materials`);

      expect(error).toBeNull();
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should allow enrolled student to download course materials', async () => {
      // First, instructor uploads a file
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      const testFile = createTestPDFFile('download-test.pdf');
      const filePath = `course-${testCourseId}/materials/download-test-${Date.now()}.pdf`;

      await supabase.storage
        .from('course-materials')
        .upload(filePath, testFile);

      uploadedFiles.push(filePath);

      // Create course material record
      const { data: material } = await supabase
        .from('course_materials')
        .insert({
          course_id: testCourseId,
          title: 'Download Test Material',
          file_path: filePath,
          file_type: 'pdf',
          file_size: testFile.size
        })
        .select()
        .single();

      // Enroll student in course
      await supabase
        .from('course_enrollments')
        .upsert({
          user_id: studentUserId,
          course_id: testCourseId,
          status: 'active'
        });

      // Switch to student
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      // Student should be able to download
      const { data: downloadData, error } = await supabase.storage
        .from('course-materials')
        .download(filePath);

      expect(error).toBeNull();
      expect(downloadData).toBeDefined();
      expect(downloadData).toBeInstanceOf(Blob);

      // Cleanup material record
      await serviceClient
        .from('course_materials')
        .delete()
        .eq('id', material!.id);
    });

    it('should prevent non-enrolled student from downloading materials', async () => {
      // Create another student
      const anotherStudent = {
        email: `non-enrolled-${Date.now()}@test.com`,
        password: 'Test123!@#'
      };

      const { data: userData } = await supabase.auth.signUp({
        email: anotherStudent.email,
        password: anotherStudent.password
      });

      // Upload file as instructor
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      const testFile = createTestPDFFile('restricted-download.pdf');
      const filePath = `course-${testCourseId}/materials/restricted-${Date.now()}.pdf`;

      await supabase.storage
        .from('course-materials')
        .upload(filePath, testFile);

      uploadedFiles.push(filePath);

      // Switch to non-enrolled student
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: anotherStudent.email,
        password: anotherStudent.password
      });

      // Should not be able to download
      const { data, error } = await supabase.storage
        .from('course-materials')
        .download(filePath);

      expect(error).toBeDefined();
      expect(data).toBeNull();

      // Cleanup
      await serviceClient
        .from('user_profiles')
        .delete()
        .eq('user_id', userData!.user!.id);
    });
  });

  describe('User Avatars Bucket', () => {
    it('should allow users to upload their own avatar', async () => {
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      const avatarContent = 'fake-image-data';
      const avatarFile = new File([avatarContent], 'avatar.jpg', { type: 'image/jpeg' });
      const filePath = `${studentUserId}/avatar.jpg`;

      const { data, error } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, avatarFile, { upsert: true });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.path).toBe(filePath);

      // Cleanup
      await supabase.storage
        .from('user-avatars')
        .remove([filePath]);
    });

    it('should prevent users from uploading to other user folders', async () => {
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      const avatarContent = 'malicious-upload';
      const avatarFile = new File([avatarContent], 'malicious.jpg', { type: 'image/jpeg' });
      const filePath = `${instructorUserId}/malicious-avatar.jpg`; // Different user's folder

      const { data, error } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, avatarFile);

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should allow public read access to avatars', async () => {
      // First, upload an avatar as a user
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      const avatarContent = 'public-avatar-data';
      const avatarFile = new File([avatarContent], 'public-avatar.jpg', { type: 'image/jpeg' });
      const filePath = `${studentUserId}/public-avatar.jpg`;

      await supabase.storage
        .from('user-avatars')
        .upload(filePath, avatarFile);

      // Sign out and try to access publicly
      await supabase.auth.signOut();

      const { data: publicUrl } = await supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      expect(publicUrl).toBeDefined();
      expect(publicUrl.publicUrl).toContain(filePath);

      // Cleanup
      await serviceClient.storage
        .from('user-avatars')
        .remove([filePath]);
    });
  });

  describe('Course Thumbnails Bucket', () => {
    it('should allow instructor to upload course thumbnail', async () => {
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      const thumbnailContent = 'fake-thumbnail-data';
      const thumbnailFile = new File([thumbnailContent], 'thumbnail.jpg', { type: 'image/jpeg' });
      const filePath = `course-${testCourseId}/thumbnail.jpg`;

      const { data, error } = await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, thumbnailFile);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.path).toBe(filePath);

      // Cleanup
      await supabase.storage
        .from('course-thumbnails')
        .remove([filePath]);
    });

    it('should allow public read access to course thumbnails', async () => {
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      const thumbnailContent = 'public-thumbnail-data';
      const thumbnailFile = new File([thumbnailContent], 'public-thumbnail.jpg', { type: 'image/jpeg' });
      const filePath = `course-${testCourseId}/public-thumbnail.jpg`;

      await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, thumbnailFile);

      // Sign out and access publicly
      await supabase.auth.signOut();

      const { data: publicUrl } = await supabase.storage
        .from('course-thumbnails')
        .getPublicUrl(filePath);

      expect(publicUrl).toBeDefined();
      expect(publicUrl.publicUrl).toContain(filePath);

      // Cleanup
      await serviceClient.storage
        .from('course-thumbnails')
        .remove([filePath]);
    });

    it('should prevent students from uploading course thumbnails', async () => {
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      const thumbnailContent = 'student-thumbnail-attempt';
      const thumbnailFile = new File([thumbnailContent], 'student-thumbnail.jpg', { type: 'image/jpeg' });
      const filePath = `course-${testCourseId}/student-thumbnail.jpg`;

      const { data, error } = await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, thumbnailFile);

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('File Type and Size Validation', () => {
    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });
    });

    it('should reject unsupported file types in course materials', async () => {
      const executableContent = 'fake-executable-data';
      const executableFile = new File([executableContent], 'malicious.exe', { type: 'application/x-msdownload' });
      const filePath = `course-${testCourseId}/materials/malicious.exe`;

      const { data, error } = await supabase.storage
        .from('course-materials')
        .upload(filePath, executableFile);

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should enforce file size limits', async () => {
      // Create a large file (simulate 100MB - exceeds 50MB limit for course-materials)
      const largeContent = 'x'.repeat(100 * 1024 * 1024); // 100MB
      const largeFile = new File([largeContent], 'large-file.pdf', { type: 'application/pdf' });
      const filePath = `course-${testCourseId}/materials/large-file.pdf`;

      const { data, error } = await supabase.storage
        .from('course-materials')
        .upload(filePath, largeFile);

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('Storage Helper Functions', () => {
    let materialId: string;

    beforeEach(async () => {
      // Setup test material
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      const testFile = createTestPDFFile('helper-test.pdf');
      const filePath = `course-${testCourseId}/materials/helper-test-${Date.now()}.pdf`;

      await supabase.storage
        .from('course-materials')
        .upload(filePath, testFile);

      uploadedFiles.push(filePath);

      const { data: material } = await supabase
        .from('course_materials')
        .insert({
          course_id: testCourseId,
          title: 'Helper Test Material',
          file_path: filePath,
          file_type: 'pdf',
          file_size: testFile.size
        })
        .select()
        .single();

      materialId = material!.id;

      // Enroll student
      await supabase
        .from('course_enrollments')
        .upsert({
          user_id: studentUserId,
          course_id: testCourseId,
          status: 'active'
        });
    });

    it('should validate download permissions with helper function', async () => {
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: testStudent.email,
        password: testStudent.password,
      });

      // Call the helper function via RPC
      const { data: downloadUrl, error } = await supabase
        .rpc('get_material_download_url', { material_id: materialId });

      expect(error).toBeNull();
      expect(downloadUrl).toBeDefined();
      expect(typeof downloadUrl).toBe('string');
    });

    it('should validate upload permissions with helper function', async () => {
      await supabase.auth.signInWithPassword({
        email: testInstructor.email,
        password: testInstructor.password,
      });

      // Call the permission check function
      const { data: canUpload, error } = await supabase
        .rpc('can_upload_material', { course_id: testCourseId });

      expect(error).toBeNull();
      expect(canUpload).toBe(true);
    });

    afterEach(async () => {
      // Cleanup material record
      if (materialId) {
        await serviceClient
          .from('course_materials')
          .delete()
          .eq('id', materialId);
      }
    });
  });
});