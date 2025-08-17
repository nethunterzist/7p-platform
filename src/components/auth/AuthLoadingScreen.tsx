/**
 * Auth Loading Screen
 * Clean loading state for authentication processes
 */

import React from 'react';

interface AuthLoadingScreenProps {
  message?: string;
}

export default function AuthLoadingScreen({ message = "Yükleniyor..." }: AuthLoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{message}</h2>
        <p className="text-sm text-gray-600">Lütfen bekleyin...</p>
      </div>
    </div>
  );
}