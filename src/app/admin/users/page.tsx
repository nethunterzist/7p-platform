"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/lib/useAdmin';

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string | null;
  auth_users: {
    email: string;
    created_at: string;
  } | null;
}

export default function AdminUsersPage() {
  const { user, isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    
    fetchUsers();
  }, [user, isAdmin, adminLoading, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // First get all user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then get auth user data for each profile
      const usersWithAuth = await Promise.all(
        (profilesData || []).map(async (profile) => {
          try {
            // Get auth user data from auth.users table
            const { data: authData, error: authError } = await supabase
              .from('auth.users')
              .select('email, created_at')
              .eq('id', profile.id)
              .single();

            return {
              ...profile,
              auth_users: authError ? null : authData
            };
          } catch {
            // If we can't get auth data, just return profile with null auth_users
            return {
              ...profile,
              auth_users: null
            };
          }
        })
      );

      setUsers(usersWithAuth);
    } catch (err: any) {
      setError('Error fetching users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentIsAdmin: boolean, userEmail: string) => {
    // Prevent user from removing their own admin status
    if (userId === user?.id && currentIsAdmin) {
      setError('You cannot remove your own admin privileges.');
      return;
    }

    const confirmMessage = currentIsAdmin 
      ? `Remove admin privileges from "${userEmail}"?`
      : `Grant admin privileges to "${userEmail}"?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_admin: !currentIsAdmin,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      setSuccess(`User admin status updated successfully!`);
      fetchUsers();
    } catch (err: any) {
      setError('Error updating user: ' + err.message);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-600">View and manage platform users</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back to Admin
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

        {/* Users List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Platform Users ({users.length})
            </h2>
          </div>

          {users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((userProfile) => (
                    <tr key={userProfile.id} className={userProfile.id === user?.id ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {userProfile.avatar_url ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={userProfile.avatar_url}
                              alt="Avatar"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {(userProfile.full_name || userProfile.auth_users?.email || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userProfile.full_name || 'No Name'}
                              {userProfile.id === user?.id && (
                                <span className="ml-2 text-xs text-blue-600">(You)</span>
                              )}
                            </div>
                            {userProfile.username && (
                              <div className="text-sm text-gray-500">@{userProfile.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {userProfile.auth_users?.email || 'No email'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          userProfile.is_admin 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {userProfile.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userProfile.auth_users?.created_at 
                          ? new Date(userProfile.auth_users.created_at).toLocaleDateString()
                          : new Date(userProfile.created_at).toLocaleDateString()
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => toggleAdminStatus(
                            userProfile.id, 
                            userProfile.is_admin,
                            userProfile.auth_users?.email || 'Unknown User'
                          )}
                          className={`${
                            userProfile.is_admin 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          } ${userProfile.id === user?.id && userProfile.is_admin ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={userProfile.id === user?.id && userProfile.is_admin}
                        >
                          {userProfile.is_admin ? 'Yöneticiyi Kaldır' : 'Yönetici Yap'}
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