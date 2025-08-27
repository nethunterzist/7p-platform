/**
 * Auth Error Boundary
 * Handles authentication errors gracefully
 */

'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
}

export class AuthErrorBoundary extends React.Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    // Ignore Supabase key errors - use fallback auth instead
    if (error.message && error.message.includes('supabaseKey is required')) {
      console.warn('Supabase key error caught, continuing with fallback auth');
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultAuthErrorFallback;
      
      return (
        <FallbackComponent 
          error={this.state.error} 
          reset={() => this.setState({ hasError: false })} 
        />
      );
    }

    return this.props.children;
  }
}

function DefaultAuthErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Bir Hata Oluştu
        </h2>
        
        <p className="text-sm text-gray-600 mb-6">
          {error?.message || 'Kimlik doğrulama sırasında bir sorun yaşandı.'}
        </p>
        
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tekrar Dene
          </button>
          
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 font-medium"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    </div>
  );
}