"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/lib/useAdmin';

interface Course {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export default function AdminModulesPage() {
  const { user, isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    position: 0
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
    
    fetchCourseAndModules();
  }, [user, isAdmin, adminLoading, router, courseId]);

  const fetchCourseAndModules = async () => {
    try {
      setLoading(true);
      
      // Fetch course info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);
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
      if (editingModule) {
        // Update existing module
        const { error } = await supabase
          .from('modules')
          .update({
            title: formData.title,
            position: formData.position,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingModule.id);

        if (error) throw error;
        setSuccess('Module updated successfully!');
      } else {
        // Create new module
        const { error } = await supabase
          .from('modules')
          .insert({
            course_id: courseId,
            title: formData.title,
            position: formData.position
          });

        if (error) throw error;
        setSuccess('Module created successfully!');
      }

      // Reset form and refresh data
      setFormData({ title: '', position: 0 });
      setEditingModule(null);
      setIsFormOpen(false);
      fetchCourseAndModules();
    } catch (err: any) {
      setError('Error saving module: ' + err.message);
    }
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      position: module.position
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (moduleId: string, moduleTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${moduleTitle}"? This will also delete all lessons in this module.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      setSuccess('Module deleted successfully!');
      fetchCourseAndModules();
    } catch (err: any) {
      setError('Error deleting module: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', position: 0 });
    setEditingModule(null);
    setIsFormOpen(false);
    setError('');
    setSuccess('');
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin || !course) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Module Management</h1>
              <p className="text-sm text-gray-600">
                Course: <span className="font-medium">{course.name}</span>
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Add New Module
              </button>
              <button
                onClick={() => router.push('/admin/courses')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back to Courses
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

        {/* Module Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingModule ? 'Edit Module' : 'Create New Module'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter module title"
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
                    {editingModule ? 'Update Module' : 'Create Module'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modules List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Course Modules ({modules.length})
            </h2>
          </div>

          {modules.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No modules found. Create your first module to get started.
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
                      Module Title
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
                  {modules.map((module) => (
                    <tr key={module.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{module.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <h3 className="text-sm font-medium text-gray-900">{module.title}</h3>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(module.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => router.push(`/admin/modules/${module.id}/lessons`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Lessons
                        </button>
                        <button
                          onClick={() => handleEdit(module)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(module.id, module.title)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
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