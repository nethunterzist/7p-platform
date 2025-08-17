'use client';

import { AdminUserProfile } from '@/data/admin-users';
import { SortConfig } from '../page';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  UserCog,
  Mail,
  KeyRound,
  Shield,
  AlertCircle,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
// Date formatting imports removed - no longer showing relative dates

interface UserListTableProps {
  users: AdminUserProfile[];
  selectedUsers: Set<string>;
  sortConfig: SortConfig;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onSort: (key: SortConfig['key']) => void;
  onSelectUser: (userId: string) => void;
  onSelectAll: () => void;
  onViewDetails: (user: AdminUserProfile) => void;
  onStatusChange: (userId: string, status: AdminUserProfile['status']) => void;
  onPageChange: (page: number) => void;
  onSendPasswordReset: (userId: string) => void;
  onSendVerificationEmail: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

export default function UserListTable({
  users,
  selectedUsers,
  sortConfig,
  currentPage,
  totalPages,
  isLoading,
  onSort,
  onSelectUser,
  onSelectAll,
  onViewDetails,
  onStatusChange,
  onPageChange,
  onSendPasswordReset,
  onSendVerificationEmail,
  onDeleteUser,
}: UserListTableProps) {
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  
  // Processing state'ini temizle
  useEffect(() => {
    if (processingUserId && !isLoading) {
      const timer = setTimeout(() => {
        setProcessingUserId(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, processingUserId]);
  
  const handleDeleteClick = (userId: string) => {
    setDeleteUserId(userId);
  };
  
  const handleDeleteConfirm = () => {
    if (deleteUserId) {
      onDeleteUser(deleteUserId);
      setDeleteUserId(null);
    }
  };
  
  const allSelected = users.length > 0 && selectedUsers.size === users.length;
  const someSelected = selectedUsers.size > 0 && !allSelected;
  
  const SortIcon = ({ column }: { column: SortConfig['key'] }) => {
    if (sortConfig.key !== column) {
      return <ChevronUp className="h-4 w-4 opacity-20" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };
  
  // Role badge removed as requested
  
  const getStatusBadge = (status: AdminUserProfile['status']) => {
    // Map suspended to inactive for display purposes
    const displayStatus = status === 'suspended' ? 'inactive' : status;
    
    switch (displayStatus) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aktif
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200">
            <UserMinus className="h-3 w-3 mr-1" />
            Pasif
          </Badge>
        );
    }
  };
  
  const getSubscriptionBadge = (type: AdminUserProfile['subscription']['type']) => {
    switch (type) {
      case 'premium':
        return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">Premium Üye</Badge>;
      default:
        return <Badge variant="outline">Kayıtlı Üye</Badge>;
    }
  };

  const getPackageBadge = (user: AdminUserProfile) => {
    // Mock data - normally would come from user.package or user.purchased_course
    const packages = ['Amazon PPC', 'Amazon Ürün Araştırma', 'Amazon Full Mentorluk'];
    const randomPackage = packages[Math.floor(Math.random() * packages.length)];
    
    if (user.subscription.type === 'premium') {
      return <span className="text-sm font-medium">{randomPackage}</span>;
    }
    return <span className="text-sm text-gray-400">-</span>;
  };
  
  if (users.length === 0 && !isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-12 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Kullanıcı bulunamadı
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Arama kriterlerinize uygun kullanıcı bulunamadı.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected || someSelected}
                    onCheckedChange={onSelectAll}
                    aria-label="Tümünü seç"
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => onSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Kullanıcı</span>
                    <SortIcon column="name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => onSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    <SortIcon column="email" />
                  </div>
                </TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Abonelik</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => onSort('created')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Kayıt Tarihi</span>
                    <SortIcon column="created" />
                  </div>
                </TableHead>
                <TableHead>Alınan Paket</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow 
                  key={user.id}
                  className={cn(
                    "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                    selectedUsers.has(user.id) && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => onSelectUser(user.id)}
                      aria-label={`${user.full_name} seç`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url} alt={user.full_name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {user.full_name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{user.email}</span>
                      {user.email_verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{getSubscriptionBadge(user.subscription.type)}</TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(user.created_at).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </div>
                  </TableCell>
                  <TableCell>{getPackageBadge(user)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={isLoading}
                        >
                          <span className="sr-only">Menüyü aç</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onViewDetails(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Detayları Görüntüle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        
                        {/* Aktif Yap - Sadece pasif ve askıdaki kullanıcılar için */}
                        <DropdownMenuItem 
                          onClick={() => {
                            setProcessingUserId(user.id);
                            onStatusChange(user.id, 'active');
                          }}
                          disabled={user.status === 'active' || processingUserId === user.id}
                          className={cn(
                            user.status === 'active' && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {processingUserId === user.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                          )}
                          Aktif Yap
                        </DropdownMenuItem>
                        
                        {/* Askıya Al - Sadece aktif kullanıcılar için */}
                        <DropdownMenuItem 
                          onClick={() => {
                            setProcessingUserId(user.id);
                            onStatusChange(user.id, 'suspended');
                          }}
                          disabled={user.status !== 'active' || processingUserId === user.id}
                          className={cn(
                            "text-red-600",
                            user.status !== 'active' && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {processingUserId === user.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Shield className="mr-2 h-4 w-4" />
                          )}
                          Askıya Al
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onSendPasswordReset(user.id)}
                          disabled={processingUserId === user.id}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Şifre Sıfırlama Gönder
                        </DropdownMenuItem>
                        {!user.email_verified && (
                          <DropdownMenuItem 
                            onClick={() => onSendVerificationEmail(user.id)}
                            disabled={processingUserId === user.id}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Doğrulama E-postası Gönder
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => {
                                e.preventDefault();
                                handleDeleteClick(user.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Kullanıcıyı Sil
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?
                                Bu işlem geri alınamaz.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleDeleteConfirm}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Sil
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Sayfa {currentPage} / {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </Button>
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNumber)}
                    disabled={isLoading}
                    className="w-8"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}