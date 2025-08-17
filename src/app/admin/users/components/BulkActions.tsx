'use client';

import { useState } from 'react';
import { AdminUserProfile } from '@/data/admin-users';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ChevronDown,
  UserCheck,
  UserX,
  Shield,
  X,
  Mail,
  KeyRound,
  Download,
  Trash2,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionsProps {
  selectedCount: number;
  onStatusChange: (status: AdminUserProfile['status']) => void;
  onClearSelection: () => void;
  isLoading: boolean;
}

export default function BulkActions({
  selectedCount,
  onStatusChange,
  onClearSelection,
  isLoading
}: BulkActionsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'status';
    status: AdminUserProfile['status'];
    title: string;
    description: string;
  } | null>(null);
  
  const handleStatusChangeClick = (status: AdminUserProfile['status']) => {
    const actionMap = {
      active: {
        title: 'Seçili Kullanıcıları Aktif Yap',
        description: `${selectedCount} kullanıcıyı aktif duruma getirmek istediğinizden emin misiniz?`
      },
      inactive: {
        title: 'Seçili Kullanıcıları Pasif Yap',
        description: `${selectedCount} kullanıcıyı pasif duruma getirmek istediğinizden emin misiniz?`
      },
      suspended: {
        title: 'Seçili Kullanıcıları Askıya Al',
        description: `${selectedCount} kullanıcıyı askıya almak istediğinizden emin misiniz? Bu işlem sonrası kullanıcılar platforma erişemeyecekler.`
      }
    };
    
    setPendingAction({
      type: 'status',
      status,
      title: actionMap[status].title,
      description: actionMap[status].description
    });
    setShowConfirmDialog(true);
  };
  
  const handleConfirmAction = () => {
    if (pendingAction?.type === 'status') {
      onStatusChange(pendingAction.status);
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };
  
  if (selectedCount === 0) {
    return null;
  }
  
  return (
    <>
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4",
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
        "animate-in slide-in-from-bottom-2 duration-200"
      )}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="font-medium">
              <Badge className="bg-blue-100 text-blue-700 mr-2">
                {selectedCount}
              </Badge>
              kullanıcı seçildi
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Temizle
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Status Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={isLoading}
                className="bg-white dark:bg-gray-800"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Durum Değiştir
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Durum Seçenekleri</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleStatusChangeClick('active')}
                className="text-green-600"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Aktif Yap
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleStatusChangeClick('suspended')}
                className="text-red-600"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Askıya Al
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Communication Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={isLoading}
                className="bg-white dark:bg-gray-800"
              >
                <Mail className="h-4 w-4 mr-2" />
                E-posta İşlemleri
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>E-posta Seçenekleri</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <KeyRound className="mr-2 h-4 w-4" />
                Şifre Sıfırlama Gönder
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="mr-2 h-4 w-4" />
                Doğrulama E-postası Gönder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Export Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={isLoading}
                className="bg-white dark:bg-gray-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Dışa Aktar
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Dışa Aktarma Seçenekleri</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Seçili Kullanıcıları Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Dangerous Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={isLoading}
                className="bg-white dark:bg-gray-800 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Tehlikeli İşlemler
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-red-600">Dikkatli Olun!</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Seçili Kullanıcıları Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={cn(
                pendingAction?.status === 'suspended' && "bg-red-600 hover:bg-red-700"
              )}
            >
              {pendingAction?.status === 'active' && 'Aktif Yap'}
              {pendingAction?.status === 'inactive' && 'Pasif Yap'}
              {pendingAction?.status === 'suspended' && 'Askıya Al'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}