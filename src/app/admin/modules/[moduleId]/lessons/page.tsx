"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/lib/useAdmin';
import FileUpload from '@/components/FileUpload';
import QuizBuilder from '@/components/QuizBuilder';

interface ModuleWithCourse {
  id: string;
  title: string;
  course_id: string;
  courses: {
    id: string;
    name: string;
  };
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  video_url: string | null;
  content: string | null;
  position: number;
  type: string;
  created_at: string;
  updated_at: string;
}

interface LessonMaterial {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
}

export default function AdminLessonsPage() {
  const { user, isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const params = useParams();
  const moduleId = params.moduleId as string;
  
  const [module, setModule] = useState<ModuleWithCourse | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Materials states
  const [materials, setMaterials] = useState<Record<string, LessonMaterial[]>>({});
  const [showMaterials, setShowMaterials] = useState<Record<string, boolean>>({});
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [quizBuilderOpen, setQuizBuilderOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    content: '',
    position: 0,
    type: 'video'
  });

  useEffect(() => {
    if (adminLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    fetchModuleAndLessons();
  }, [user, isAdmin, adminLoading, router, moduleId]);

  const fetchModuleAndLessons = async () => {
    try {
      setLoading(true);
      
      // Fetch module info with course
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select(`
          *,
          courses (
            id,
            name
          )
        `)
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      setModule(moduleData);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', moduleId)
        .order('position', { ascending: true });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);
      
      // Fetch materials for all lessons
      if (lessonsData && lessonsData.length > 0) {
        const materialsPromises = lessonsData.map(lesson => 
          supabase
            .from('lesson_materials')
            .select('*')
            .eq('lesson_id', lesson.id)
            .order('created_at', { ascending: true })
        );
        
        const materialsResults = await Promise.all(materialsPromises);
        const materialsMap: Record<string, LessonMaterial[]> = {};
        
        lessonsData.forEach((lesson, index) => {
          const result = materialsResults[index];
          materialsMap[lesson.id] = result.data || [];
        });
        
        setMaterials(materialsMap);
      }
    } catch (err: any) {
      setError('Error fetching data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingLesson) {
        // Update existing lesson
        const { error } = await supabase
          .from('lessons')
          .update({
            title: formData.title,
            video_url: formData.video_url || null,
            content: formData.content || null,
            position: formData.position,
            type: formData.type,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLesson.id);

        if (error) throw error;
        setSuccess('Lesson updated successfully!');
      } else {
        // Create new lesson
        const { error } = await supabase
          .from('lessons')
          .insert({
            module_id: moduleId,
            title: formData.title,
            video_url: formData.video_url || null,
            content: formData.content || null,
            position: formData.position,
            type: formData.type
          });

        if (error) throw error;
        setSuccess('Lesson created successfully!');
      }

      // Reset form and refresh data
      setFormData({ title: '', video_url: '', content: '', position: 0, type: 'video' });
      setEditingLesson(null);
      setIsFormOpen(false);
      fetchModuleAndLessons();
    } catch (err: any) {
      setError('Error saving lesson: ' + err.message);
    }
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      video_url: lesson.video_url || '',
      content: lesson.content || '',
      position: lesson.position,
      type: lesson.type
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${lessonTitle}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      setSuccess('Lesson deleted successfully!');
      fetchModuleAndLessons();
    } catch (err: any) {
      setError('Error deleting lesson: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', video_url: '', content: '', position: 0, type: 'video' });
    setEditingLesson(null);
    setIsFormOpen(false);
    setError('');
    setSuccess('');
  };

  const handleUploadComplete = async (lessonId: string, materialData: any) => {
    try {
      // ✅ DETAYLI DEBUG LOGGING
      console.log('🔍 Upload Debug Start:');
      console.log('📝 lessonId:', lessonId);
      console.log('📝 materialData received:', materialData);
      console.log('📝 materialData keys:', Object.keys(materialData || {}));
      console.log('📝 materialData values:', Object.values(materialData || {}));
      
      // ✅ Veri kontrolü
      const requiredFields = ['title', 'file_name', 'file_path', 'file_size', 'file_type'];
      const missingFields = requiredFields.filter(field => !materialData[field]);
      
      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // ✅ Insert data hazırlama
      const insertData = {
        lesson_id: lessonId,
        title: materialData.title,
        description: materialData.description || null,
        file_name: materialData.file_name,
        file_path: materialData.file_path,
        file_url: materialData.file_url || null,
        storage_path: materialData.storage_path || materialData.file_path,
        file_size: materialData.file_size,
        file_type: materialData.file_type,
        mime_type: materialData.mime_type || null,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id
      };
      
      console.log('📝 Final insert data:', insertData);
      
      const { error } = await supabase
        .from('lesson_materials')
        .insert(insertData);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Upload successful!');
      setSuccess('Material uploaded successfully!');
      setUploadingFor(null);
      
      // Refresh materials for this lesson
      const { data: newMaterials } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });
      
      setMaterials(prev => ({
        ...prev,
        [lessonId]: newMaterials || []
      }));
    } catch (err: any) {
      console.error('💥 Upload error details:', err);
      console.error('💥 Error message:', err.message);
      console.error('💥 Error stack:', err.stack);
      setError('Error saving material: ' + err.message);
      setUploadingFor(null);
    }
  };

  const handleDeleteMaterial = async (materialId: string, lessonId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('lesson-materials')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('lesson_materials')
        .delete()
        .eq('id', materialId);

      if (dbError) throw dbError;

      setSuccess('Material deleted successfully!');
      
      // Refresh materials
      setMaterials(prev => ({
        ...prev,
        [lessonId]: prev[lessonId]?.filter(m => m.id !== materialId) || []
      }));
    } catch (err: any) {
      setError('Error deleting material: ' + err.message);
    }
  };

  const toggleMaterials = (lessonId: string) => {
    setShowMaterials(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin || !module) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lesson Management</h1>
              <p className="text-sm text-gray-600">
                Course: <span className="font-medium">{module.courses.name}</span> → 
                Module: <span className="font-medium">{module.title}</span>
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Add New Lesson
              </button>
              <button
                onClick={() => router.push(`/admin/courses/${module.course_id}/modules`)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back to Modules
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* File Upload Modal */}
        {uploadingFor && (
          <FileUpload
            lessonId={uploadingFor}
            onUploadComplete={(materialData) => handleUploadComplete(uploadingFor, materialData)}
            onClose={() => setUploadingFor(null)}
          />
        )}

        {/* Quiz Builder Modal */}
        {quizBuilderOpen && (
          <QuizBuilder
            lessonId={quizBuilderOpen}
            onSave={() => {
              setSuccess('Quiz saved successfully!');
              setQuizBuilderOpen(null);
            }}
            onClose={() => setQuizBuilderOpen(null)}
          />
        )}

        {/* Lesson Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter lesson title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="video">Video</option>
                    <option value="text">Text</option>
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter lesson content (supports markdown)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position (Order)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter position (0, 1, 2...)"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lessons List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Module Lessons ({lessons.length})
            </h2>
          </div>

          {lessons.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No lessons found. Create your first lesson to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lesson
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lessons.map((lesson) => (
                    <React.Fragment key={lesson.id}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          #{lesson.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{lesson.title}</h3>
                            {lesson.video_url && (
                              <p className="text-xs text-blue-600 truncate max-w-xs">
                                {lesson.video_url}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                            lesson.type === 'video' ? 'bg-blue-100 text-blue-800' :
                            lesson.type === 'text' ? 'bg-green-100 text-green-800' :
                            lesson.type === 'quiz' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {lesson.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(lesson.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => toggleMaterials(lesson.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Materials ({materials[lesson.id]?.length || 0})
                          </button>
                          <button
                            onClick={() => setUploadingFor(lesson.id)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Upload
                          </button>
                          {lesson.type === 'quiz' && (
                            <button
                              onClick={() => setQuizBuilderOpen(lesson.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Build Quiz
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(lesson)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(lesson.id, lesson.title)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {/* Materials Row */}
                      {showMaterials[lesson.id] && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-900 mb-3">Lesson Materials:</h4>
                              {materials[lesson.id]?.length === 0 ? (
                                <p className="text-gray-500 text-sm">No materials uploaded yet.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {materials[lesson.id]?.map((material) => (
                                    <div key={material.id} className="bg-white p-3 rounded-md border border-gray-200">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <h5 className="font-medium text-gray-900 text-sm">{material.title}</h5>
                                          {material.description && (
                                            <p className="text-xs text-gray-600 mt-1">{material.description}</p>
                                          )}
                                          <div className="text-xs text-gray-500 mt-2">
                                            <span>{formatFileSize(material.file_size)}</span>
                                            <span className="mx-2">•</span>
                                            <span>{material.file_type}</span>
                                          </div>
                                        </div>
                                        <div className="flex space-x-2 ml-3">
                                          <a
                                            href={material.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-900 text-xs"
                                          >
                                            Download
                                          </a>
                                          <button
                                            onClick={() => handleDeleteMaterial(material.id, lesson.id, material.storage_path)}
                                            className="text-red-600 hover:text-red-900 text-xs"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}