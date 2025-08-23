'use client';

import React, { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/lib/unified-auth';
import { createClient } from '@/utils/supabase/client';
import { 
  Download, 
  FileText, 
  Video, 
  Image, 
  CheckCircle,
  Clock,
  Eye,
  BookOpen,
  AlertCircle,
  Lock,
  Unlock,
  Play,
  Pause
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
  progress?: {
    progress_percentage: number;
    completed_at?: string;
    last_accessed_at?: string;
  };
}

interface MaterialsListProps {
  courseId: string;
  isEnrolled: boolean;
}

export default function MaterialsList({ courseId, isEnrolled }: MaterialsListProps) {
  const { user } = useUnifiedAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (courseId && user) {
      fetchMaterials();
      setupRealtimeSubscription();
    }
  }, [courseId, user]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      
      // Fetch materials
      const response = await fetch(`/api/materials/upload?courseId=${courseId}`);
      const data = await response.json();
      
      if (data.success) {
        let materialsWithProgress = data.materials;
        
        // If user is enrolled, fetch progress data
        if (isEnrolled && user) {
          const { data: progressData } = await supabase
            .from('user_material_progress')
            .select('material_id, progress_percentage, completed_at, last_accessed_at')
            .eq('user_id', user.id)
            .in('material_id', data.materials.map((m: Material) => m.id));

          // Merge progress data
          materialsWithProgress = data.materials.map((material: Material) => ({
            ...material,
            progress: progressData?.find(p => p.material_id === material.id)
          }));
        }
        
        setMaterials(materialsWithProgress);
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

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('course-materials')
      .on('broadcast', { event: 'new-material' }, (payload) => {
        if (payload.payload.course_id === courseId) {
          setMessage({ 
            type: 'success', 
            text: `Yeni materyal eklendi: ${payload.payload.filename}` 
          });
          fetchMaterials(); // Refresh materials list
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleDownload = async (materialId: string, filename: string) => {
    if (!isEnrolled) {
      setMessage({ type: 'error', text: 'Bu kursa kayıt olmanız gerekiyor' });
      return;
    }

    try {
      setDownloadingId(materialId);
      
      const response = await fetch(`/api/materials/${materialId}/download`);
      const data = await response.json();
      
      if (data.success) {
        // Open download URL in new tab
        window.open(data.download_url, '_blank');
        
        setMessage({ type: 'success', text: `${filename} indiriliyor...` });
        
        // Refresh materials to update download count
        setTimeout(() => {
          fetchMaterials();
        }, 1000);
        
      } else {
        setMessage({ type: 'error', text: data.error || 'Download failed' });
      }
      
    } catch (error) {
      console.error('Download error:', error);
      setMessage({ type: 'error', text: 'Download failed' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleMarkCompleted = async (materialId: string) => {
    if (!isEnrolled || !user) return;

    try {
      const response = await fetch(`/api/materials/${materialId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-completed' })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Material completed!' });
        fetchMaterials(); // Refresh to show updated progress
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update progress' });
      }
      
    } catch (error) {
      console.error('Error marking material as completed:', error);
      setMessage({ type: 'error', text: 'Failed to update progress' });
    }
  };

  const getFileIcon = (fileType: string, size = 'h-8 w-8') => {
    if (fileType.startsWith('video/')) {
      return <Video className={`${size} text-red-500`} />;
    }
    if (fileType.startsWith('image/')) {
      return <Image className={`${size} text-green-500`} />;
    }
    return <FileText className={`${size} text-blue-500`} />;
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
      day: 'numeric'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading materials...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`flex items-center p-4 rounded-lg ${
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

      {/* Access Status */}
      {!isEnrolled && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Lock className="h-5 w-5 mr-2 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">
                  Course Materials Locked
                </p>
                <p className="text-sm text-orange-700">
                  Enroll in this course to access downloadable materials
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Course Materials ({materials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">No materials available yet</p>
              <p className="text-sm text-gray-500">
                Materials will appear here when the instructor uploads them
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <div key={material.id} className={`border rounded-lg p-4 ${
                  isEnrolled ? 'hover:bg-gray-50' : 'opacity-60'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {getFileIcon(material.file_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {material.original_name}
                          </h3>
                          {material.progress?.completed_at && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatFileSize(material.file_size)}</span>
                          <span>
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(material.uploaded_at)}
                          </span>
                          {isEnrolled && (
                            <span>{material.download_count} downloads</span>
                          )}
                        </div>

                        {material.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {material.description}
                          </p>
                        )}

                        {/* Progress Bar */}
                        {isEnrolled && material.progress && material.progress.progress_percentage > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Progress</span>
                              <span className="text-xs text-gray-600">
                                {material.progress.progress_percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  getProgressColor(material.progress.progress_percentage)
                                }`}
                                style={{ width: `${material.progress.progress_percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {isEnrolled ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(material.id, material.original_name)}
                            disabled={downloadingId === material.id}
                          >
                            {downloadingId === material.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          
                          {!material.progress?.completed_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkCompleted(material.id)}
                              title="Mark as completed"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center text-xs text-gray-500">
                          <Lock className="h-4 w-4 mr-1" />
                          Locked
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Summary */}
      {isEnrolled && materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {materials.length}
                </div>
                <div className="text-xs text-gray-600">Total Materials</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {materials.filter(m => m.progress?.completed_at).length}
                </div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {materials.length - materials.filter(m => m.progress?.completed_at).length}
                </div>
                <div className="text-xs text-gray-600">Remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}