'use client';

import React from 'react';
import { MessageCenter } from '@/components/messaging';

/**
 * Messages page for the 7P Education Platform
 * 
 * Features:
 * - Full-screen messaging interface
 * - Real-time student-instructor communication
 * - File attachments and message status tracking
 * - Mobile-responsive design
 */
export default function MessagesPage() {
  return (
    <div className="h-screen bg-background">
      <MessageCenter className="h-full" />
    </div>
  );
}