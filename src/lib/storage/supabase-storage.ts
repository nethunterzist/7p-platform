/**
 * SUPABASE STORAGE SERVICE - Course Materials Management
 * Secure file upload/download with RLS policies and validation
 */

import { createClient } from '@/utils/supabase/client';
import { createServiceClient } from '@/utils/supabase/server';

export interface FileUploadConfig {
  maxSize: number; // bytes
  allowedTypes: string[];
  bucket: string;
}

export interface MaterialFile {
  id: string;
  course_id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  download_count: number;
  is_active: boolean;
}

export interface UploadResult {
  success: boolean;
  file?: MaterialFile;
  error?: string;
  storage_path?: string;
}

export class SupabaseStorageService {
  private static readonly BUCKET_NAME = 'course-materials';
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly ALLOWED_TYPES = [
    'application/pdf',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-rar-compressed'
  ];

  // ============================================================================
  // BUCKET INITIALIZATION
  // ============================================================================

  static async initializeBucket(): Promise<boolean> {
    try {
      const supabase = createServiceClient();
      
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        // Create bucket
        const { error: createError } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false,
          allowedMimeTypes: this.ALLOWED_TYPES,
          fileSizeLimit: this.MAX_FILE_SIZE
        });
        
        if (createError) {
          console.error('Error creating storage bucket:', createError);
          return false;
        }
        
        console.log('Storage bucket created successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing storage bucket:', error);
      return false;
    }
  }

  // ============================================================================
  // FILE UPLOAD
  // ============================================================================

  static async uploadMaterial(
    file: File,
    courseId: string,
    uploadedBy: string
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const supabase = createServiceClient();
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = this.sanitizeFilename(file.name);
      const filename = `${timestamp}-${sanitizedName}`;
      const storagePath = `courses/${courseId}/materials/${filename}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return { success: false, error: 'File upload failed' };
      }

      // Save file metadata to database
      const { data: materialData, error: dbError } = await supabase
        .from('course_materials')
        .insert({
          course_id: courseId,
          filename: filename,
          original_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          uploaded_by: uploadedBy,
          uploaded_at: new Date().toISOString(),
          download_count: 0,
          is_active: true
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([storagePath]);
          
        return { success: false, error: 'Failed to save file metadata' };
      }

      return {
        success: true,
        file: materialData,
        storage_path: storagePath
      };

    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, error: 'Upload failed' };
    }
  }

  // ============================================================================
  // FILE DOWNLOAD
  // ============================================================================

  static async downloadMaterial(
    materialId: string,
    userId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const supabase = createClient();
      
      // Check if user has access to this material (enrolled in course)
      const hasAccess = await this.checkDownloadPermission(materialId, userId);
      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      // Get material info
      const { data: material, error: materialError } = await supabase
        .from('course_materials')
        .select('*')
        .eq('id', materialId)
        .eq('is_active', true)
        .single();

      if (materialError || !material) {
        return { success: false, error: 'Material not found' };
      }

      // Generate signed URL for download (valid for 1 hour)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(material.storage_path, 3600); // 1 hour

      if (urlError || !signedUrlData) {
        console.error('Error creating signed URL:', urlError);
        return { success: false, error: 'Failed to generate download link' };
      }

      // Increment download count
      await supabase
        .from('course_materials')
        .update({ 
          download_count: material.download_count + 1,
          last_downloaded_at: new Date().toISOString()
        })
        .eq('id', materialId);

      // Log download activity
      await this.logDownloadActivity(materialId, userId);

      return {
        success: true,
        url: signedUrlData.signedUrl
      };

    } catch (error) {
      console.error('Download error:', error);
      return { success: false, error: 'Download failed' };
    }
  }

  // ============================================================================
  // FILE MANAGEMENT
  // ============================================================================

  static async getCourseMaterials(courseId: string): Promise<MaterialFile[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('course_materials')
        .select(`
          *,
          uploader:profiles!uploaded_by(name, email)
        `)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching materials:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching materials:', error);
      return [];
    }
  }

  static async deleteMaterial(materialId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createServiceClient();
      
      // Get material info
      const { data: material } = await supabase
        .from('course_materials')
        .select('storage_path, uploaded_by, course_id')
        .eq('id', materialId)
        .single();

      if (!material) {
        return false;
      }

      // Check permissions (only uploader or course instructor/admin can delete)
      const hasPermission = await this.checkDeletePermission(material.course_id, userId);
      if (!hasPermission && material.uploaded_by !== userId) {
        return false;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([material.storage_path]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
      }

      // Mark as inactive in database (soft delete)
      const { error: dbError } = await supabase
        .from('course_materials')
        .update({ 
          is_active: false,
          deleted_at: new Date().toISOString()
        })
        .eq('id', materialId);

      return !dbError;
    } catch (error) {
      console.error('Error deleting material:', error);
      return false;
    }
  }

  // ============================================================================
  // PERMISSION CHECKS
  // ============================================================================

  private static async checkDownloadPermission(materialId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      // Get material and check if user is enrolled in the course
      const { data, error } = await supabase
        .from('course_materials')
        .select(`
          course_id,
          courses!course_id(
            instructor_id
          )
        `)
        .eq('id', materialId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return false;
      }

      // Check if user is the instructor
      if (data.courses?.instructor_id === userId) {
        return true;
      }

      // Check if user is enrolled in the course
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', data.course_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return !!enrollment;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  private static async checkDeletePermission(courseId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      // Check if user is course instructor or admin
      const { data: course } = await supabase
        .from('courses')
        .select('instructor_id')
        .eq('id', courseId)
        .single();

      if (course?.instructor_id === userId) {
        return true;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      return profile?.role === 'admin';
    } catch (error) {
      console.error('Delete permission check error:', error);
      return false;
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds ${Math.round(this.MAX_FILE_SIZE / (1024 * 1024))}MB limit`
      };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    // Check filename
    if (!file.name || file.name.length > 255) {
      return {
        valid: false,
        error: 'Invalid filename'
      };
    }

    return { valid: true };
  }

  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  private static async logDownloadActivity(materialId: string, userId: string): Promise<void> {
    try {
      const supabase = createServiceClient();
      
      await supabase
        .from('material_download_logs')
        .insert({
          material_id: materialId,
          user_id: userId,
          downloaded_at: new Date().toISOString(),
          ip_address: 'unknown' // Could be populated from request headers
        });
    } catch (error) {
      console.error('Error logging download activity:', error);
    }
  }

  // ============================================================================
  // ADMIN FUNCTIONS
  // ============================================================================

  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
  }> {
    try {
      const supabase = createServiceClient();
      
      const { data, error } = await supabase
        .from('course_materials')
        .select('file_type, file_size')
        .eq('is_active', true);

      if (error || !data) {
        return { totalFiles: 0, totalSize: 0, filesByType: {} };
      }

      const totalFiles = data.length;
      const totalSize = data.reduce((sum, file) => sum + file.file_size, 0);
      const filesByType: Record<string, number> = {};

      data.forEach(file => {
        filesByType[file.file_type] = (filesByType[file.file_type] || 0) + 1;
      });

      return { totalFiles, totalSize, filesByType };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { totalFiles: 0, totalSize: 0, filesByType: {} };
    }
  }
}

export default SupabaseStorageService;