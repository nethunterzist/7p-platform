'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useUnifiedAuth } from '@/lib/unified-auth';
import { 
  Upload, 
  FileText, 
  Video, 
  Image, 
  Download, 
  Trash2, 
  Eye, 
  AlertCircle,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Material {
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
  description?: string;
  uploader?: {
    name: string;
    email: string;
  };
}

export default function CoursematerialsPage() {
  const params = useParams();
  const courseId = params.courseId as string; // Updated from params.id to params.courseId
  const { isAdmin, user } = useUnifiedAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [course, setCourse] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (courseId && user) {
      fetchCourseInfo();
      fetchMaterials();
    }
  }, [courseId, user]);

  const fetchCourseInfo = async () => {
    try {
      const response = await fetch(`/api/admin/courses`);
      const data = await response.json();
      
      if (data.success) {
        const courseData = data.courses.find((c: any) => c.id === courseId);
        setCourse(courseData);
      }
    } catch (error) {
      console.error('Error fetching course info:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/materials/upload?courseId=${courseId}`);
      const data = await response.json();
      
      if (data.success) {
        setMaterials(data.materials);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch materials' });
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMessage({ type: 'error', text: 'Failed to fetch materials' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setUploadProgress(0);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', courseId);
      formData.append('description', ''); // Could be added from a form

      // Simulate progress (real progress tracking would need more complex setup)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'File uploaded successfully!' });
        await fetchMaterials(); // Refresh materials list
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
      }

    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: 'Upload failed' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteMaterial = async (materialId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/materials/upload?materialId=${materialId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Material deleted successfully' });
        await fetchMaterials(); // Refresh materials list
      } else {
        setMessage({ type: 'error', text: data.error || 'Delete failed' });
      }

    } catch (error) {
      console.error('Delete error:', error);
      setMessage({ type: 'error', text: 'Delete failed' });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('video/')) {
      return <Video className="h-8 w-8 text-red-500" />;
    }
    if (fileType.startsWith('image/')) {
      return <Image className="h-8 w-8 text-green-500" />;
    }
    return <FileText className="h-8 w-8 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-gray-600">You need admin permissions to manage course materials.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Course Materials Management
        </h1>
        {course && (
          <p className="text-gray-600">
            Managing materials for: <span className="font-medium">{course.title}</span>
          </p>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 flex items-center p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload New Material
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                accept=".pdf,.mp4,.avi,.mov,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
              />
              
              {uploading ? (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Upload Course Material
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Supported formats: PDF, Video (MP4, AVI, MOV), Documents (PPT, DOC), Images, ZIP
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-corporate-primary hover:bg-corporate-deep"
                  >
                    Choose File
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum file size: 100MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Course Materials ({materials.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading materials...</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">No materials uploaded yet</p>
              <p className="text-sm text-gray-500">Upload your first material using the form above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getFileIcon(material.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {material.original_name}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(material.file_size)}
                        </span>
                        <span className="text-xs text-gray-500">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDate(material.uploaded_at)}
                        </span>
                        <span className="text-xs text-gray-500">
                          <Users className="h-3 w-3 inline mr-1" />
                          {material.download_count} downloads
                        </span>
                      </div>
                      {material.uploader && (
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded by: {material.uploader.name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Preview functionality could be added here
                        window.open(`/api/materials/${material.id}/download`, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMaterial(material.id, material.original_name)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}