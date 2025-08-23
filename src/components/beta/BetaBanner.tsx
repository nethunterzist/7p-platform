"use client";

import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

const BetaBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white relative">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-center">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <div>
            <span className="font-semibold text-lg">BETA SÜRÜMÜ</span>
            <span className="hidden sm:inline ml-2 text-sm opacity-90">
              - Platform test aşamasında, tüm kurslar geçici olarak ücretsiz!
            </span>
            <div className="sm:hidden text-xs mt-1 opacity-90">
              Platform test aşamasında - Tüm kurslar ücretsiz!
            </div>
          </div>
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
      </div>
      
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Kapat"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default BetaBanner;