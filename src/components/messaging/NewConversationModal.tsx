'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  GraduationCap, 
  User, 
  Loader2, 
  MessageCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  is_admin: boolean;
}

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

/**
 * New conversation creation modal
 * Features: User search, role filtering, initial message composition
 */
export function NewConversationModal({
  open,
  onOpenChange,
  onConversationCreated
}: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Get current user info
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, is_admin')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            setCurrentUser(profile);
          }
        }
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };

    if (open) {
      getCurrentUser();
    }
  }, [open]);

  // Load available users (opposite role only)
  useEffect(() => {
    const loadUsers = async () => {
      if (!currentUser) return;

      setLoading(true);
      setError(null);

      try {
        // Load users with opposite role
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, is_admin')
          .neq('id', currentUser.id)
          .eq('is_admin', !currentUser.is_admin) // Opposite role
          .order('full_name');

        if (error) throw error;

        setUsers(data || []);
      } catch (error) {
        console.error('Failed to load users:', error);
        setError('Kullanıcılar yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    if (open && currentUser) {
      loadUsers();
    }
  }, [open, currentUser]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    setSearching(true);
    
    const searchTimeout = setTimeout(() => {
      const filtered = users.filter(user =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
      setSearching(false);
    }, 300);

    return () => {
      clearTimeout(searchTimeout);
      setSearching(false);
    };
  }, [searchQuery, users]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedUser(null);
      setInitialMessage('');
      setError(null);
    }
  }, [open]);

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.full_name);
  };

  // Handle conversation creation
  const handleCreateConversation = async () => {
    if (!selectedUser || creating) return;

    setCreating(true);
    setError(null);

    try {
      // Create conversation
      const { createConversation, sendMessage } = await import('@/lib/messaging');
      
      const conversation = await createConversation(selectedUser.id);
      
      // Send initial message if provided
      if (initialMessage.trim()) {
        await sendMessage(conversation.id, {
          content: initialMessage.trim()
        });
      }

      onConversationCreated(conversation.id);
    } catch (error: any) {
      console.error('Konuşma oluşturulamadı:', error);
      setError(error.message || 'Konuşma oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  // Generate user initials
  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get role text
  const getRoleText = (isAdmin: boolean): string => {
    return isAdmin ? 'Eğitmen' : 'Öğrenci';
  };

  const canCreate = selectedUser && !creating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Yeni Konuşma Başlat
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Search input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {currentUser?.is_admin ? 'Öğrenci Seç' : 'Eğitmen Seç'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`${currentUser?.is_admin ? 'Öğrenci' : 'Eğitmen'} ara...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {selectedUser && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedUser(null);
                    setSearchQuery('');
                  }}
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* User list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {searching ? 'Aranıyor...' : `${filteredUsers.length} kişi bulundu`}
              </span>
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>

            <ScrollArea className="h-48 border rounded-lg">
              <div className="p-2 space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Yükleniyor...</span>
                    </div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <User className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Sonuç bulunamadı' : 'Kullanıcı bulunamadı'}
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        "hover:bg-accent",
                        selectedUser?.id === user.id && "bg-accent border border-accent-foreground/20"
                      )}
                      onClick={() => handleUserSelect(user)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getUserInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {user.full_name}
                          </span>
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            {getRoleText(user.is_admin)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {user.is_admin ? (
                          <GraduationCap className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Initial message */}
          {selectedUser && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                İlk Mesaj (İsteğe Bağlı)
              </label>
              <Textarea
                placeholder={`${selectedUser.full_name} kişisine ilk mesajınızı yazın...`}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground text-right">
                {initialMessage.length}/1000 karakter
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            İptal
          </Button>
          
          <Button
            onClick={handleCreateConversation}
            disabled={!canCreate}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Konuşma Başlat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}