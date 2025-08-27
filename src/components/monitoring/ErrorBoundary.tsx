'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'critical';
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  eventId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Ignore Supabase key errors - continue with fallback auth
    if (error.message && error.message.includes('supabaseKey is required')) {
      console.warn('Main ErrorBoundary: Ignoring Supabase key error, using fallback auth');
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', context } = this.props;
    
    // Ignore Supabase key errors - they're handled by fallback auth
    if (error.message && error.message.includes('supabaseKey is required')) {
      console.warn('Main ErrorBoundary: Supabase key error ignored in componentDidCatch');
      return;
    }
    
    // Log to Sentry with context
    const eventId = Sentry.captureException(error, {
      tags: {
        errorBoundary: true,
        level,
        context: context || 'unknown',
      },
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    this.setState({
      error,
      errorInfo,
      eventId,
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReportFeedback = () => {
    if (this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;
      const isDevelopment = process.env.NODE_ENV === 'development';

      // Critical error - full page fallback
      if (level === 'critical') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-6 p-8 max-w-md">
              <div className="flex justify-center">
                <AlertCircle className="h-16 w-16 text-destructive" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Something went wrong</h1>
                <p className="text-muted-foreground">
                  We've encountered a critical error. Our team has been notified.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()} variant="default">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
                <Button onClick={() => window.location.href = '/'} variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
              {this.state.eventId && (
                <Button onClick={this.handleReportFeedback} variant="ghost" size="sm">
                  Report Issue
                </Button>
              )}
              {isDevelopment && this.state.error && (
                <details className="text-left text-xs bg-muted p-4 rounded mt-4">
                  <summary className="cursor-pointer font-medium mb-2">
                    Error Details (Development Only)
                  </summary>
                  <pre className="whitespace-pre-wrap text-xs">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      }

      // Page-level error
      if (level === 'page') {
        return (
          <div className="flex items-center justify-center min-h-[400px] p-8">
            <div className="text-center space-y-4 max-w-sm">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Page Error</h2>
                <p className="text-muted-foreground text-sm">
                  This page couldn't load properly. Try refreshing or go back.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={this.handleRetry} size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={() => window.history.back()} variant="outline" size="sm">
                  Go Back
                </Button>
              </div>
              {isDevelopment && (
                <details className="text-left text-xs bg-muted p-2 rounded">
                  <summary className="cursor-pointer">Debug Info</summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error?.toString()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      }

      // Component-level error (default)
      return (
        <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-destructive">
                Component Error
              </p>
              <p className="text-xs text-muted-foreground">
                {this.props.context ? 
                  `Error in ${this.props.context}. Click retry to reload this section.` :
                  'This component failed to load. Click retry to reload it.'
                }
              </p>
              <Button onClick={this.handleRetry} size="sm" variant="outline">
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping pages
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  level: 'page' | 'component' | 'critical' = 'page',
  context?: string
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary level={level} context={context}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};