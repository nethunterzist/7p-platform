'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  mockUsers, 
  searchUsers, 
  filterUsersByRole, 
  filterUsersByStatus, 
  filterUsersBySubscription,
  filterUsersByDateRange,
  calculateUserStats,
  downloadCSV,
  type AdminUserProfile
} from '@/data/admin-users';
import * as XLSX from 'xlsx';
import UserListTable from './components/UserListTable';
import UserDetailModal from './components/UserDetailModal';
import UserFilters from './components/UserFilters';
import BulkActions from './components/BulkActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download,
  RefreshCw,
  Mail,
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface FilterState {
  search: string;
  // role: AdminUserProfile['role'] | 'all'; // Removed role filter
  status: AdminUserProfile['status'] | 'all';
  subscription: AdminUserProfile['subscription']['type'] | 'all';
  package?: 'ppc' | 'full-mentorluk' | 'urun-arastirma';
  dateRange: {
    start: string;
    end: string;
    field: 'created_at' | 'last_login';
  };
}

export interface SortConfig {
  key: keyof AdminUserProfile | 'name' | 'email' | 'created' | 'lastLogin';
  direction: 'asc' | 'desc';
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  
  const [users, setUsers] = useState<AdminUserProfile[]>(mockUsers);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<AdminUserProfile | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    // role: 'all', // Removed role filter
    status: 'all',
    subscription: 'all',
    dateRange: {
      start: '',
      end: '',
      field: 'created_at'
    }
  });
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'created',
    direction: 'desc'
  });


  // Apply filters and search
  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    // Search
    if (filters.search) {
      result = searchUsers(result, filters.search);
    }
    
    // Role filter removed
    
    // Status filter
    result = filterUsersByStatus(result, filters.status);
    
    // Subscription filter
    result = filterUsersBySubscription(result, filters.subscription);
    
    // Date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      result = filterUsersByDateRange(
        result,
        filters.dateRange.start,
        filters.dateRange.end,
        filters.dateRange.field
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortConfig.key) {
        case 'name':
          aValue = a.full_name;
          bValue = b.full_name;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'created':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'lastLogin':
          aValue = a.last_login ? new Date(a.last_login).getTime() : 0;
          bValue = b.last_login ? new Date(b.last_login).getTime() : 0;
          break;
        default:
          aValue = a[sortConfig.key as keyof AdminUserProfile];
          bValue = b[sortConfig.key as keyof AdminUserProfile];
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [users, filters, sortConfig]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Statistics
  const stats = useMemo(() => calculateUserStats(users), [users]);

  // Handlers
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  const handleViewDetails = (user: AdminUserProfile) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = async (userId: string, newStatus: AdminUserProfile['status']) => {
    setIsLoading(true);
    
    // Optimistic update
    const originalUsers = [...users];
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
    
    try {
      // Simulate API call - PATCH /api/users/:id { status: newStatus }
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Toast mesajları duruma göre
      const statusMessages = {
        'active': 'Kullanıcı aktifleştirildi.',
        'suspended': 'Kullanıcı askıya alındı.',
        'inactive': 'Kullanıcı pasifleştirildi.'
      };
      
      toast.success(statusMessages[newStatus]);
    } catch (error) {
      // Hata durumunda rollback
      setUsers(originalUsers);
      toast.error('Durum güncellenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: AdminUserProfile['status']) => {
    if (selectedUsers.size === 0) {
      toast.error('Lütfen en az bir kullanıcı seçin');
      return;
    }
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUsers(prev => prev.map(user => 
        selectedUsers.has(user.id) ? { ...user, status: newStatus } : user
      ));
      
      toast.success(`${selectedUsers.size} kullanıcının durumu güncellendi`);
      setSelectedUsers(new Set());
    } catch (error) {
      toast.error('Toplu güncelleme sırasında bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPasswordReset = async (userId: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const user = users.find(u => u.id === userId);
      toast.success(`Şifre sıfırlama linki ${user?.email} adresine gönderildi`);
    } catch (error) {
      toast.error('Şifre sıfırlama linki gönderilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerificationEmail = async (userId: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const user = users.find(u => u.id === userId);
      toast.success(`Doğrulama e-postası ${user?.email} adresine gönderildi`);
    } catch (error) {
      toast.error('Doğrulama e-postası gönderilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('Kullanıcı başarıyla silindi');
      setIsDetailModalOpen(false);
    } catch (error) {
      toast.error('Kullanıcı silinirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdminNote = async (userId: string, note: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newNote = {
        id: `note-${Date.now()}`,
        note,
        created_by: 'Admin User',
        created_at: new Date().toISOString()
      };
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              admin_notes: [newNote, ...(user.admin_notes || [])]
            } 
          : user
      ));
      
      // Update selected user if modal is open
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          admin_notes: [newNote, ...(prev.admin_notes || [])]
        } : null);
      }
      
      toast.success('Admin notu eklendi');
    } catch (error) {
      toast.error('Not eklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportXLSX = async () => {
    setIsLoading(true);
    try {
      // Prepare data for export
      const exportData = filteredUsers.map(user => {
        // Mock package data - same logic as table
        const packages = ['Amazon PPC', 'Amazon Ürün Araştırma', 'Amazon Full Mentorluk'];
        const randomPackage = packages[Math.floor(Math.random() * packages.length)];
        const userPackage = user.subscription.type === 'premium' ? randomPackage : '-';
        
        return {
          'Ad Soyad': user.full_name || '',
          'Email': user.email,
          'Durum': user.status === 'active' ? 'Aktif' : user.status === 'inactive' ? 'Pasif' : 'Askıda',
          'Abonelik': user.subscription.type === 'free' ? 'Kayıtlı Üye' : 'Premium Üye',
          'Alınan Paket': userPackage,
          'Kayıt Tarihi': new Date(user.created_at).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Ad Soyad
        { wch: 25 }, // Email
        { wch: 10 }, // Durum
        { wch: 12 }, // Abonelik
        { wch: 20 }, // Alınan Paket
        { wch: 18 }  // Kayıt Tarihi
      ];
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kullanıcılar');

      // Generate filename with current date and time
      const now = new Date();
      const filename = `kullanicilar_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);
      
      toast.success(`XLSX dosyası indirildi: ${filename}`);
    } catch (error) {
      console.error('XLSX export error:', error);
      toast.error('XLSX dosyası indirilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Simulate a real API call with cache busting
      const timestamp = Date.now();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a new array with updated timestamps to simulate real data refresh
      const refreshedUsers = mockUsers.map(user => ({
        ...user,
        // Simulate some users having new last_login times
        last_login: Math.random() > 0.7 ? new Date().toISOString() : user.last_login,
        // Add a small timestamp difference to ensure data appears "fresh"
        updated_at: new Date(Date.now() - Math.random() * 1000000).toISOString()
      }));
      
      setUsers(refreshedUsers);
      
      // Clear any existing filters to show fresh data
      setSelectedUsers(new Set());
      setCurrentPage(1);
      
      const now = new Date();
      const timeString = now.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      toast.success(`Veriler yenilendi (${timeString})`);
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Liste yenilenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Admin access control - must be after all hooks
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [isAdmin, adminLoading, router]);

  // Show loading while checking admin access
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-600">Kullanıcı Yönetimi Yükleniyor</h3>
              <p className="text-gray-600">Yetkiler kontrol ediliyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <DashboardLayout
      title="Kullanıcı Yönetimi"
      subtitle={`Toplam ${stats.totalUsers} kullanıcı yönetimi ve analizi`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Yenile
          </Button>
          <Button
            onClick={handleExportXLSX}
            variant="outline"
            disabled={isLoading || filteredUsers.length === 0}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            XLSX İndir
          </Button>
        </div>
      }
    >
      <div className="space-y-8">


        {/* Filters and Bulk Actions */}
        <div className="space-y-4">
          <UserFilters 
            filters={filters} 
            onFilterChange={setFilters}
            totalUsers={filteredUsers.length}
          />
          
          {selectedUsers.size > 0 && (
            <BulkActions
              selectedCount={selectedUsers.size}
              onStatusChange={handleBulkStatusChange}
              onClearSelection={() => setSelectedUsers(new Set())}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Users Table */}
        <UserListTable
          users={paginatedUsers}
          selectedUsers={selectedUsers}
          sortConfig={sortConfig}
          currentPage={currentPage}
          totalPages={totalPages}
          isLoading={isLoading}
          onSort={handleSort}
          onSelectUser={handleSelectUser}
          onSelectAll={handleSelectAll}
          onViewDetails={handleViewDetails}
          onStatusChange={handleStatusChange}
          onPageChange={setCurrentPage}
          onSendPasswordReset={handleSendPasswordReset}
          onSendVerificationEmail={handleSendVerificationEmail}
          onDeleteUser={handleDeleteUser}
        />

        {/* User Detail Modal */}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedUser(null);
            }}
            onStatusChange={handleStatusChange}
            onDeleteUser={handleDeleteUser}
            onAddNote={handleAddAdminNote}
            onSendPasswordReset={handleSendPasswordReset}
            onSendVerificationEmail={handleSendVerificationEmail}
            isLoading={isLoading}
          />
        )}
      </div>
    </DashboardLayout>
  );
}