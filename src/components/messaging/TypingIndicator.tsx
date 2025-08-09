'use client';

import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TypingUser {
  userId: string;
  fullName: string;
  isTyping: boolean;
}

interface TypingIndicatorProps {
  users: TypingUser[];
  text: string | null;
  className?: string;
}

/**
 * Typing indicator component showing animated dots
 * Features: Multiple user support, smooth animations
 */
export const TypingIndicator = memo(function TypingIndicator({
  users,
  text,
  className
}: TypingIndicatorProps) {
  if (!users.length || !text) return null;

  return (
    <div className={cn("flex gap-3 max-w-[85%] mr-auto", className)}>
      {/* Avatar for first typing user */}
      {users.length > 0 && (
        <div className="flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
              {users[0].fullName
                .split(' ')
                .map(name => name.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2)
              }
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Typing bubble */}
      <div className="flex flex-col gap-1 min-w-0">
        {/* Typing text */}
        <div className="px-1">
          <span className="text-xs text-muted-foreground italic">
            {text}
          </span>
        </div>

        {/* Animated typing bubble */}
        <div className="bg-card border rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1">
            {/* Animated dots */}
            <div className="flex gap-1">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce",
                    "animation-delay-" + (index * 200)
                  )}
                  style={{
                    animationDelay: `${index * 0.2}s`,
                    animationDuration: '1.4s',
                    animationIterationCount: 'infinite'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});