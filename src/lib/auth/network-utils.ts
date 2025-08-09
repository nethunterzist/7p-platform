/**
 * Network Utility with Exponential Backoff for Supabase Auth
 * Bulletproof error handling for "Failed to fetch" scenarios
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
}

export interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

// Retry configurations for different operation types
export const RETRY_CONFIGS = {
  critical: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
  },
  standard: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffFactor: 1.5,
    jitter: true,
  },
  optional: {
    maxAttempts: 2,
    baseDelay: 250,
    maxDelay: 2000,
    backoffFactor: 1.2,
    jitter: false,
  },
} as const;

// Network error types that should trigger retries
const RETRYABLE_ERRORS = [
  'Failed to fetch',
  'Network request failed',
  'TypeError: Failed to fetch',
  'ERR_NETWORK',
  'ERR_INTERNET_DISCONNECTED',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ECONNRESET',
  'Connection timeout',
  'Request timeout',
];

/**
 * Check if error is retryable network error
 */
export function isRetryableNetworkError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  const errorName = error.name || '';
  
  return RETRYABLE_ERRORS.some(retryableError => 
    errorMessage.includes(retryableError) || 
    errorName.includes(retryableError)
  );
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
    config.maxDelay
  );
  
  if (config.jitter) {
    // Add random jitter (±25%)
    const jitterRange = exponentialDelay * 0.25;
    return exponentialDelay + (Math.random() - 0.5) * 2 * jitterRange;
  }
  
  return exponentialDelay;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current network status
 */
export function getNetworkStatus(): NetworkStatus {
  if (typeof window === 'undefined') {
    return { online: true }; // Assume online on server
  }
  
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  return {
    online: navigator.onLine,
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
  };
}

/**
 * Generic retry function with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  operationName: string = 'unknown'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      // Check network status before attempting
      const networkStatus = getNetworkStatus();
      if (!networkStatus.online && attempt > 1) {
        console.log(`[${operationName}] Waiting for network connection (attempt ${attempt})`);
        // Wait a bit longer if offline
        await sleep(2000);
        continue;
      }
      
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`[${operationName}] Successfully completed after ${attempt} attempts`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      console.warn(`[${operationName}] Attempt ${attempt}/${config.maxAttempts} failed:`, error);
      
      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Only retry if it's a retryable network error
      if (!isRetryableNetworkError(error)) {
        console.log(`[${operationName}] Non-retryable error, not retrying:`, error);
        throw error;
      }
      
      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, config);
      console.log(`[${operationName}] Retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
  
  console.error(`[${operationName}] All ${config.maxAttempts} attempts failed. Last error:`, lastError);
  throw lastError;
}

/**
 * Retry critical auth operations (token refresh, session management)
 */
export async function retryCriticalAuthOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  return retryOperation(operation, RETRY_CONFIGS.critical, operationName);
}

/**
 * Retry standard auth operations (user data, security checks)
 */
export async function retryAuthOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  return retryOperation(operation, RETRY_CONFIGS.standard, operationName);
}

/**
 * Retry optional operations (audit logging, analytics)
 */
export async function retryOptionalOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  return retryOperation(operation, RETRY_CONFIGS.optional, operationName);
}

/**
 * Enhanced error class for network operations
 */
export class NetworkError extends Error {
  public readonly isRetryable: boolean;
  public readonly attempt: number;
  public readonly maxAttempts: number;
  public readonly originalError?: any;
  
  constructor(
    message: string, 
    originalError?: any, 
    attempt: number = 1, 
    maxAttempts: number = 1
  ) {
    super(message);
    this.name = 'NetworkError';
    this.isRetryable = isRetryableNetworkError(originalError);
    this.attempt = attempt;
    this.maxAttempts = maxAttempts;
    this.originalError = originalError;
  }
}

/**
 * Network status event emitter for real-time monitoring
 */
class NetworkStatusMonitor {
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private currentStatus: NetworkStatus;
  
  constructor() {
    this.currentStatus = getNetworkStatus();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleStatusChange);
      window.addEventListener('offline', this.handleStatusChange);
      
      // Monitor connection changes if available
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', this.handleStatusChange);
      }
    }
  }
  
  private handleStatusChange = () => {
    const newStatus = getNetworkStatus();
    const statusChanged = 
      newStatus.online !== this.currentStatus.online ||
      newStatus.effectiveType !== this.currentStatus.effectiveType;
    
    if (statusChanged) {
      this.currentStatus = newStatus;
      this.listeners.forEach(listener => listener(newStatus));
    }
  };
  
  public subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately notify with current status
    listener(this.currentStatus);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  public getStatus(): NetworkStatus {
    return this.currentStatus;
  }
  
  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleStatusChange);
      window.removeEventListener('offline', this.handleStatusChange);
    }
    this.listeners = [];
  }
}

// Global network monitor instance
export const networkMonitor = new NetworkStatusMonitor();