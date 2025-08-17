'use client';

import { useState, useEffect } from 'react';
import { AdminUserProfile } from '@/data/admin-users';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CreditCard,
  BookOpen,
  MessageSquare,
  Shield,
  Trash2,
  KeyRound,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trophy,
  DollarSign,
  Activity,
  Award,
  TrendingUp,
  Users,
  FileText,
  Globe,
  Smartphone,
  MapPin,
  Plus,
  Loader2,
  UserMinus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface UserDetailModalProps {
  user: AdminUserProfile;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (userId: string, status: AdminUserProfile['status']) => void;
  onDeleteUser: (userId: string) => void;
  onAddNote: (userId: string, note: string) => void;
  onSendPasswordReset: (userId: string) => void;
  onSendVerificationEmail: (userId: string) => void;
  isLoading: boolean;
}

export default function UserDetailModal({
  user,
  isOpen,
  onClose,
  onStatusChange,
  onDeleteUser,
  onAddNote,
  onSendPasswordReset,
  onSendVerificationEmail,
  isLoading
}: UserDetailModalProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  
  // Processing state'ini temizle
  useEffect(() => {
    if (processingAction && !isLoading) {
      const timer = setTimeout(() => {
        setProcessingAction(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, processingAction]);
  
  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(user.id, newNote.trim());
      setNewNote('');
    }
  };
  
  const handleDelete = () => {
    onDeleteUser(user.id);
    setShowDeleteDialog(false);
  };
  
  const getStatusColor = (status: AdminUserProfile['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-yellow-600 bg-yellow-100';
      case 'suspended': return 'text-red-600 bg-red-100';
    }
  };
  
  const getRoleColor = (role: AdminUserProfile['role']) => {
    switch (role) {
      case 'admin': return 'text-purple-600 bg-purple-100';
      case 'instructor': return 'text-blue-600 bg-blue-100';
      case 'student': return 'text-gray-600 bg-gray-100';
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatar_url} alt={user.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
                    {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl font-bold">{user.full_name}</DialogTitle>
                  <div className="flex items-center space-x-2 mt-1 text-sm text-muted-foreground">
                    <span>{user.email}</span>
                    {user.email_verified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {/* Abonelik Rozeti */}
                    <Badge className={user.subscription.type === 'premium' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : 'border border-gray-300 text-gray-700 bg-white'}>
                      {user.subscription.type === 'premium' ? 'Premium Üye' : 'Kayıtlı Üye'}
                    </Badge>
                    
                    {/* Durum Badge */}
                    <Badge 
                      className={cn(
                        "cursor-pointer transition-colors",
                        user.status === 'active' 
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : user.status === 'suspended'
                          ? "bg-red-100 text-red-700 hover:bg-red-200"  
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                      onClick={() => {
                        if (processingAction === null) {
                          setProcessingAction('toggleStatus');
                          // Toggle between active and inactive (suspended users need manual activation)
                          const newStatus = user.status === 'active' ? 'inactive' : 'active';
                          onStatusChange(user.id, newStatus);
                        }
                      }}
                    >
                      {user.status === 'active' && 'Aktif'}
                      {user.status === 'suspended' && 'Askıda'}
                      {user.status === 'inactive' && 'Pasif'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3" style={{"--tab-h": "44px", "--tab-px": "24px", "--tab-radius": "12px"} as React.CSSProperties}>
                <TabsTrigger 
                  value="overview"
                  className="h-[--tab-h] px-[--tab-px] rounded-[--tab-radius] flex items-center justify-center data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=inactive]:bg-slate-100"
                >
                  Genel
                </TabsTrigger>
                <TabsTrigger 
                  value="courses"
                  className="h-[--tab-h] px-[--tab-px] rounded-[--tab-radius] flex items-center justify-center data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=inactive]:bg-slate-100"
                >
                  Kurslar
                </TabsTrigger>
                <TabsTrigger 
                  value="payments"
                  className="h-[--tab-h] px-[--tab-px] rounded-[--tab-radius] flex items-center justify-center data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=inactive]:bg-slate-100"
                >
                  Ödemeler
                </TabsTrigger>
              </TabsList>
              
              <ScrollArea className="h-[400px] mt-4">
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Kişisel Bilgiler</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm mt-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Kullanıcı Adı:</span>
                        <span className="font-medium">@{user.username || 'Belirtilmemiş'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm mt-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm mt-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Telefon:</span>
                        <span className="font-medium">{user.phone || 'Belirtilmemiş'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm mt-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Kayıt Tarihi:</span>
                        <span className="font-medium">
                          {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: tr })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm mt-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Son Giriş:</span>
                        <span className="font-medium">
                          {user.last_login ? (
                            format(new Date(user.last_login), 'dd MMMM yyyy HH:mm', { locale: tr })
                          ) : (
                            'Hiç giriş yapmadı'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Abonelik Bilgileri</h3>
                      <div className="space-y-2">
                        {user.subscription.type === 'premium' && (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Satın Alınan Eğitim:</span>
                              <span className="font-medium">Amazon PPC Eğitimi</span>
                            </div>
                            {user.subscription.start_date && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Satın Alma Tarihi:</span>
                                <span className="font-medium">
                                  {format(new Date(user.subscription.start_date), 'dd MMMM yyyy', { locale: tr })}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Courses Tab */}
                <TabsContent value="courses" className="space-y-4">
                  <h3 className="font-semibold text-lg">Kurs Geçmişi</h3>
                  <div className="space-y-3">
                    {/* Amazon PPC */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">Amazon PPC</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              Kayıt: 15 Kas 2024
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <Progress value={75} className="w-24" />
                            <span className="text-sm font-medium">%75</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Amazon Ürün Araştırma */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">Amazon Ürün Araştırma</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              Kayıt: 20 Eki 2024
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <Progress value={100} className="w-24" />
                            <span className="text-sm font-medium">%100</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-green-600">
                        ✓ 05 Aralık 2024 tarihinde tamamlandı
                      </div>
                    </div>
                    
                    {/* Amazon Full Mentorluk */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">Amazon Full Mentorluk</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              Kayıt: 01 Ara 2024
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <Progress value={25} className="w-24" />
                            <span className="text-sm font-medium">%25</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Payments Tab */}
                <TabsContent value="payments" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Ödeme Geçmişi</h3>
                    <div className="text-sm">
                      Toplam: <span className="font-semibold text-lg text-green-600">
                        ₺{user.payment_info.total_spent.toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  {user.payment_history && user.payment_history.length > 0 ? (
                    <div className="space-y-2">
                      {user.payment_history.map((payment) => (
                        <div key={payment.id} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <CreditCard className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{payment.description}</div>
                                <div className="text-sm text-gray-600">
                                  {payment.method} • {format(new Date(payment.date), 'dd MMMM yyyy', { locale: tr })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                ₺{payment.amount.toLocaleString('tr-TR')}
                              </div>
                              {payment.status !== 'completed' && (
                                <Badge 
                                  variant={payment.status === 'failed' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {payment.status === 'failed' ? 'Başarısız' : 'İade'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Ödeme geçmişi bulunmuyor
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
          
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{user.full_name}</span> kullanıcısını silmek istediğinizden emin misiniz? 
              Bu işlem geri alınamaz ve kullanıcının tüm verileri silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Kullanıcıyı Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}