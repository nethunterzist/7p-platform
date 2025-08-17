/**
 * Authentication Error Boundary
 * Bulletproof error handling for auth operations
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AuthError } from '@/lib/types/auth';
import { authNetworkUtils } from './network-utils';

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isNetworkError: boolean;
  retryCount: number;
  isRetrying: boolean;
}

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<AuthErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  showNetworkStatus?: boolean;
}

export interface AuthErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retry: () => void;
  isNetworkError: boolean;
  isRetrying: boolean;
  retryCount: number;
  networkStatus: ReturnType<typeof authNetworkUtils.getNetworkStatus>;
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    // Check if this is a network-related error
    const isNetworkError = AuthErrorBoundary.isNetworkRelatedError(error);
    
    return {
      hasError: true,
      error,
      isNetworkError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Auth Error Boundary caught error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error info
    this.setState({ errorInfo });

    // Call error callback if provided
    this.props.onError?.(error, errorInfo);

    // Auto-retry network errors
    if (this.state.isNetworkError && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry();
    }

    // Log error for monitoring
    this.logError(error, errorInfo);
  }

  /**
   * Check if error is network-related
   */
  private static isNetworkRelatedError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const networkErrorPatterns = [
      'failed to fetch',
      'network request failed',
      'networkerror',
      'fetch_error',
      'connection_error',
      'timeout',
      'network error',
      'err_network',
      'err_internet_disconnected'
    ];

    return networkErrorPatterns.some(pattern => message.includes(pattern)) ||
           error.name === 'NetworkError' ||
           (error instanceof AuthError && error.message.includes('NETWORK'));
  }

  /**
   * Schedule automatic retry for network errors
   */
  private scheduleRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    console.log(`🔄 Scheduling auth error boundary retry in ${retryDelay}ms...`);
    
    this.setState({ isRetrying: true });

    this.retryTimer = setTimeout(() => {
      this.handleRetry();
    }, retryDelay);
  }

  /**
   * Handle retry attempt
   */
  private handleRetry = (): void => {
    console.log('🔄 Auth Error Boundary attempting retry...');
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false,
      retryCount: prevState.retryCount + 1,
      isRetrying: false
    }));
  };

  /**
   * Manual retry triggered by user
   */
  private handleManualRetry = (): void => {
    console.log('🔄 Manual retry requested for auth error boundary');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false,
      isRetrying: false
    });
  };

  /**
   * Log error for monitoring
   */
  private logError(error: Error, errorInfo: ErrorInfo): void {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      componentStack: errorInfo.componentStack,
      isNetworkError: this.state.isNetworkError,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      networkStatus: authNetworkUtils.getNetworkStatus(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };

    // Log to console for development
    console.error('🚨 Auth Error Boundary Error Details:', errorData);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      // errorTrackingService.captureException(error, errorData);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultAuthErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retry={this.handleManualRetry}
          isNetworkError={this.state.isNetworkError}
          isRetrying={this.state.isRetrying}
          retryCount={this.state.retryCount}
          networkStatus={authNetworkUtils.getNetworkStatus()}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
const DefaultAuthErrorFallback: React.FC<AuthErrorFallbackProps> = ({
  error,
  retry,
  isNetworkError,
  isRetrying,
  retryCount,
  networkStatus
}) => {
  const getErrorMessage = () => {
    if (isNetworkError) {
      if (!networkStatus.isOnline) {
        return "You appear to be offline. Please check your internet connection.";
      }
      return "There was a network error. This might be a temporary connectivity issue.";
    }
    
    if (error instanceof AuthError) {
      return error.message;
    }
    
    return "An unexpected error occurred during authentication.";
  };

  const getErrorTitle = () => {
    if (isNetworkError) {
      return !networkStatus.isOnline ? "Connection Lost" : "Network Error";
    }
    return "Authentication Error";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto h-12 w-12 text-red-600">
            {isNetworkError ? (
              // Network error icon
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              // Generic error icon
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Error Title */}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {getErrorTitle()}
          </h2>

          {/* Error Message */}
          <p className="mt-2 text-center text-sm text-gray-600">
            {getErrorMessage()}
          </p>

          {/* Network Status */}
          {isNetworkError && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${networkStatus.isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Status: {networkStatus.isOnline ? 'Online' : 'Offline'}
                    {networkStatus.connectionType !== 'unknown' && (
                      <span className="ml-2">({networkStatus.connectionType})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Retry Information */}
          {retryCount > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Retry attempts: {retryCount}
            </p>
          )}

          {/* Retry Button */}
          <div className="mt-6">
            <button
              onClick={retry}
              disabled={isRetrying}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying...
                </>
              ) : (
                'Try Again'
              )}
            </button>
          </div>

          {/* Additional Help */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              If the problem persists, please{' '}
              <a href="/help" className="text-indigo-600 hover:text-indigo-500">
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// HOC for wrapping components with auth error boundary
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<AuthErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AuthErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </AuthErrorBoundary>
  );

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}