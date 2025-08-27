/**
 * Network Status Indicator
 * Real-time network status feedback for authentication operations
 */

'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/context';

interface NetworkStatusIndicatorProps {
  showOfflineQueue?: boolean;
  className?: string;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showOfflineQueue = true,
  className = ''
}) => {
  const { networkStatus, offlineQueue } = useAuth();

  // Don't show indicator if online and no queued operations
  if (networkStatus.isOnline && offlineQueue.count === 0) {
    return null;
  }

  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'bg-red-500 border-red-600';
    if (offlineQueue.count > 0) return 'bg-yellow-500 border-yellow-600';
    return 'bg-green-500 border-green-600';
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) {
      return networkStatus.lastOnline 
        ? `Offline since ${networkStatus.lastOnline.toLocaleTimeString()}`
        : 'Currently offline';
    }
    
    if (offlineQueue.count > 0) {
      return `${offlineQueue.count} operation${offlineQueue.count !== 1 ? 's' : ''} queued`;
    }
    
    return 'Connected';
  };

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
        </svg>
      );
    }

    if (offlineQueue.count > 0) {
      return (
        <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    );
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`
        flex items-center px-3 py-2 rounded-lg border-2 text-white text-sm font-medium
        ${getStatusColor()}
        shadow-lg transition-all duration-300 ease-in-out
      `}>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
        
        {networkStatus.connectionType !== 'unknown' && (
          <span className="ml-2 text-xs opacity-75">
            {networkStatus.connectionType}
            {networkStatus.effectiveType && ` (${networkStatus.effectiveType})`}
          </span>
        )}
      </div>

      {/* Offline Queue Details */}
      {showOfflineQueue && offlineQueue.count > 0 && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-sm">
          <h4 className="font-semibold text-gray-900 mb-2">Queued Operations</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {offlineQueue.items.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate">{item.operation}</span>
                <div className="flex items-center space-x-1">
                  <span className={`
                    px-1 py-0.5 rounded text-xs font-medium
                    ${item.priority === 'high' ? 'bg-red-100 text-red-800' : 
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}
                  `}>
                    {item.priority}
                  </span>
                  {item.retryCount > 0 && (
                    <span className="text-gray-500">({item.retryCount})</span>
                  )}
                </div>
              </div>
            ))}
            {offlineQueue.count > 5 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                ...and {offlineQueue.count - 5} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Toast-style notification for authentication errors
 */
interface AuthErrorToastProps {
  error: string | null;
  onDismiss: () => void;
  networkStatus: any; // NetworkStatus type
}

export const AuthErrorToast: React.FC<AuthErrorToastProps> = ({
  error,
  onDismiss,
  networkStatus
}) => {
  if (!error) return null;

  const isNetworkError = error.toLowerCase().includes('network') || 
                        error.toLowerCase().includes('fetch') ||
                        error.toLowerCase().includes('offline') ||
                        !networkStatus.isOnline;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className={`
        flex items-start p-4 rounded-lg shadow-lg border-l-4
        ${isNetworkError 
          ? 'bg-yellow-50 border-yellow-400 text-yellow-800' 
          : 'bg-red-50 border-red-400 text-red-800'
        }
      `}>
        <div className="flex-shrink-0">
          {isNetworkError ? (
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {isNetworkError ? 'Connection Issue' : 'Authentication Error'}
          </h3>
          <p className="text-sm mt-1 opacity-90">{error}</p>
          
          {isNetworkError && (
            <p className="text-xs mt-2 opacity-75">
              {networkStatus.isOnline 
                ? 'Bağlantı geri geldi. İşlemler otomatik olarak yeniden denenecek.' 
                : 'İnternet bağlantınızı kontrol edin.'
              }
            </p>
          )}
        </div>
        
        <button
          onClick={onDismiss}
          className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * HOC to wrap components with network status indicator
 */
export function withNetworkStatus<P extends object>(
  Component: React.ComponentType<P>,
  indicatorProps?: Omit<NetworkStatusIndicatorProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <>
      <Component {...props} />
      <NetworkStatusIndicator {...indicatorProps} />
    </>
  );

  WrappedComponent.displayName = `withNetworkStatus(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}