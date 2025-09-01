# Error Handling & Logging - 7P Education Platform

## 📋 Özet

7P Education Platform'un error handling ve logging stratejisi, resilient system architecture'ı sağlayan, comprehensive error tracking, centralized logging, real-time monitoring ve proactive error prevention mekanizmalarını içeren modern yaklaşımı detaylandırır. Bu dokümantasyon, Next.js 15, React 19 error boundaries, structured logging, ve advanced monitoring integration'ı kapsar.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun amaçları:
- Comprehensive error boundary implementation with React 19
- Centralized logging system with structured data
- Real-time error monitoring ve alerting mechanisms
- Advanced error recovery strategies ve fallback systems
- Performance monitoring ve error correlation analysis
- Security-focused error handling ve sensitive data protection
- Multi-environment logging configuration (dev, staging, production)
- Error analytics ve reporting dashboard integration
- Proactive error detection ve prevention systems

## 🏗️ Mevcut Durum Analizi

### ✅ Aktif Error Handling Bileşenleri
- **React Error Boundaries**: Basic error catching mechanism
- **Next.js Error Pages**: Custom 404 ve 500 error pages
- **Console Logging**: Development environment logging
- **Try-Catch Blocks**: Manual error handling in components
- **Supabase Error Handling**: Database error management

### ⚠️ Geliştirilmesi Gereken Alanlar
- Centralized error tracking system
- Structured logging implementation
- Real-time error monitoring
- Advanced error recovery mechanisms
- Performance error correlation
- Security error handling
- Cross-environment consistency
- Error analytics dashboard

## 🔧 Teknik Detaylar

### 🛡️ Advanced Error Boundary System

#### 1. Hierarchical Error Boundaries
```typescript
// lib/errors/error-boundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorBoundaryFallback } from '@/components/error-fallback'
import { errorLogger } from './error-logger'
import { errorRecovery } from './error-recovery'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
  isRecovering: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  enableRetry?: boolean
  maxRetries?: number
  level?: 'page' | 'section' | 'component'
  identifier?: string
}

export interface ErrorFallbackProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  onRetry: () => void
  canRetry: boolean
  level: string
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null
  
  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.generateErrorId()
    
    this.setState({
      errorInfo,
      errorId
    })

    // Log error with context
    await errorLogger.logError({
      error,
      errorInfo,
      errorId,
      level: this.props.level || 'component',
      identifier: this.props.identifier,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION,
      environment: process.env.NODE_ENV
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo, errorId)

    // Attempt automatic recovery for certain error types
    if (this.shouldAttemptRecovery(error)) {
      await this.attemptRecovery(error, errorInfo)
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getCurrentUserId(): string | null {
    // Get current user ID from auth context
    return localStorage.getItem('user_id') || null
  }

  private getSessionId(): string {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('session_id', sessionId)
    }
    return sessionId
  }

  private shouldAttemptRecovery(error: Error): boolean {
    // Define which errors are recoverable
    const recoverableErrors = [
      'ChunkLoadError',
      'Loading chunk',
      'Loading failed for',
      'NetworkError',
      'Failed to fetch'
    ]

    return recoverableErrors.some(pattern => 
      error.message.includes(pattern) || error.name.includes(pattern)
    )
  }

  private async attemptRecovery(error: Error, errorInfo: ErrorInfo): Promise<void> {
    this.setState({ isRecovering: true })

    try {
      const recovered = await errorRecovery.attemptRecovery({
        error,
        errorInfo,
        level: this.props.level || 'component',
        retryCount: this.state.retryCount
      })

      if (recovered) {
        this.handleRetry()
      }
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError)
      await errorLogger.logError({
        error: recoveryError,
        context: 'recovery_failed',
        originalError: error,
        errorId: this.state.errorId
      })
    } finally {
      this.setState({ isRecovering: false })
    }
  }

  private handleRetry = (): void => {
    const { maxRetries = 3 } = this.props
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false
      }))

      // Log retry attempt
      errorLogger.logInfo({
        message: 'Error boundary retry attempt',
        retryCount: this.state.retryCount + 1,
        errorId: this.state.errorId,
        level: this.props.level
      })
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorBoundaryFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          canRetry={this.props.enableRetry !== false && this.state.retryCount < (this.props.maxRetries || 3)}
          level={this.props.level || 'component'}
        />
      )
    }

    return this.props.children
  }
}

// Specialized error boundaries for different contexts
export class PageErrorBoundary extends ErrorBoundary {
  constructor(props: Omit<ErrorBoundaryProps, 'level'>) {
    super({ ...props, level: 'page' })
  }
}

export class ComponentErrorBoundary extends ErrorBoundary {
  constructor(props: Omit<ErrorBoundaryProps, 'level'>) {
    super({ ...props, level: 'component' })
  }
}

export class SectionErrorBoundary extends ErrorBoundary {
  constructor(props: Omit<ErrorBoundaryProps, 'level'>) {
    super({ ...props, level: 'section' })
  }
}

// HOC for automatic error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default ErrorBoundary
```

#### 2. Error Fallback Components
```typescript
// components/error-fallback/index.tsx
import React from 'react'
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react'
import type { ErrorFallbackProps } from '@/lib/errors/error-boundary'

export function ErrorBoundaryFallback({
  error,
  errorInfo,
  errorId,
  onRetry,
  canRetry,
  level
}: ErrorFallbackProps) {
  const [isReporting, setIsReporting] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  const handleReportError = async () => {
    if (isReporting || reportSent) return

    setIsReporting(true)
    try {
      await errorLogger.reportUserFeedback({
        errorId,
        feedback: 'User encountered error and chose to report it',
        context: {
          level,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      })
      setReportSent(true)
    } catch (reportError) {
      console.error('Failed to report error:', reportError)
    } finally {
      setIsReporting(false)
    }
  }

  const getErrorMessage = () => {
    switch (level) {
      case 'page':
        return 'Bu sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin.'
      case 'section':
        return 'Bu bölüm yüklenirken bir sorun yaşandı. İçerik kısmen görüntülenemeyebilir.'
      case 'component':
        return 'Bu öğe şu anda kullanılamıyor. Lütfen tekrar deneyin.'
      default:
        return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
    }
  }

  const getErrorIcon = () => {
    switch (level) {
      case 'page':
        return <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
      case 'section':
        return <AlertTriangle className="w-12 h-12 text-orange-500 mb-3" />
      case 'component':
        return <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
      default:
        return <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
    }
  }

  const containerClasses = {
    page: 'min-h-screen flex items-center justify-center bg-gray-50 px-4',
    section: 'min-h-[400px] flex items-center justify-center bg-gray-50 rounded-lg p-8 m-4',
    component: 'min-h-[200px] flex items-center justify-center bg-gray-100 rounded-lg p-4'
  }

  return (
    <div className={containerClasses[level] || containerClasses.component}>
      <div className="text-center max-w-md">
        {getErrorIcon()}
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Bir Sorun Oluştu
        </h2>
        
        <p className="text-gray-600 mb-6">
          {getErrorMessage()}
        </p>

        {/* Error ID for support reference */}
        {errorId && (
          <p className="text-xs text-gray-400 mb-4 font-mono">
            Hata ID: {errorId}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tekrar Dene
            </button>
          )}
          
          {level === 'page' && (
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Ana Sayfa
            </button>
          )}
          
          <button
            onClick={handleReportError}
            disabled={isReporting || reportSent}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {isReporting ? 'Bildiriliyor...' : reportSent ? 'Bildirildi' : 'Hata Bildir'}
          </button>
        </div>

        {/* Development mode error details */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-red-600 font-semibold">
              Geliştirici Detayları
            </summary>
            <div className="mt-2 p-3 bg-red-50 rounded border text-sm">
              <strong>Error:</strong> {error.message}
              <br />
              <strong>Stack:</strong>
              <pre className="mt-2 text-xs overflow-auto">
                {error.stack}
              </pre>
              {errorInfo && (
                <>
                  <strong>Component Stack:</strong>
                  <pre className="mt-2 text-xs overflow-auto">
                    {errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// Specialized fallback components
export function CourseErrorFallback(props: ErrorFallbackProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 m-4">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Kurs Yüklenemedi
        </h3>
        <p className="text-gray-600 mb-4">
          Bu kurs şu anda görüntülenemiyor. Lütfen daha sonra tekrar deneyin.
        </p>
        {props.canRetry && (
          <button
            onClick={props.onRetry}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Kursu Yeniden Yükle
          </button>
        )}
      </div>
    </div>
  )
}

export function VideoErrorFallback(props: ErrorFallbackProps) {
  return (
    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-gray-600 text-sm mb-3">Video yüklenemedi</p>
        {props.canRetry && (
          <button
            onClick={props.onRetry}
            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Tekrar Dene
          </button>
        )}
      </div>
    </div>
  )
}
```

#### 3. Centralized Error Logger
```typescript
// lib/errors/error-logger.ts
interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  timestamp: string
  errorId?: string
  userId?: string | null
  sessionId?: string
  url?: string
  userAgent?: string
  buildVersion?: string
  environment?: string
  context?: Record<string, any>
  error?: Error
  errorInfo?: ErrorInfo
  stack?: string
}

interface ErrorLogData {
  error: Error
  errorInfo?: ErrorInfo
  errorId?: string
  level?: string
  identifier?: string
  userId?: string | null
  sessionId?: string
  url?: string
  userAgent?: string
  timestamp?: string
  buildVersion?: string
  environment?: string
  context?: Record<string, any>
}

interface UserFeedback {
  errorId: string | null
  feedback: string
  userEmail?: string
  context?: Record<string, any>
}

class ErrorLogger {
  private readonly maxRetries = 3
  private readonly retryDelay = 1000
  private readonly batchSize = 10
  private readonly flushInterval = 10000 // 10 seconds
  
  private logQueue: LogEntry[] = []
  private isOnline = navigator?.onLine ?? true
  private flushTimer: NodeJS.Timeout | null = null

  constructor() {
    this.initializeLogger()
  }

  private initializeLogger() {
    // Setup online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.flushLogs()
      })
      
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }

    // Setup periodic log flushing
    this.flushTimer = setInterval(() => {
      this.flushLogs()
    }, this.flushInterval)

    // Setup beforeunload to flush remaining logs
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushLogs()
      })
    }
  }

  async logError(data: ErrorLogData): Promise<void> {
    const logEntry: LogEntry = {
      level: 'error',
      message: data.error.message,
      timestamp: data.timestamp || new Date().toISOString(),
      errorId: data.errorId,
      userId: data.userId,
      sessionId: data.sessionId,
      url: data.url || (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: data.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      buildVersion: data.buildVersion,
      environment: data.environment,
      context: {
        ...data.context,
        level: data.level,
        identifier: data.identifier,
        errorName: data.error.name,
        errorStack: data.error.stack,
        componentStack: data.errorInfo?.componentStack
      },
      error: data.error,
      errorInfo: data.errorInfo,
      stack: data.error.stack
    }

    await this.addToQueue(logEntry)
  }

  async logWarn(message: string, context?: Record<string, any>): Promise<void> {
    const logEntry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      context
    }

    await this.addToQueue(logEntry)
  }

  async logInfo(context: Record<string, any> & { message: string }): Promise<void> {
    const logEntry: LogEntry = {
      level: 'info',
      message: context.message,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      context: { ...context, message: undefined }
    }

    await this.addToQueue(logEntry)
  }

  async logDebug(message: string, context?: Record<string, any>): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return

    const logEntry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      context
    }

    console.debug(`[DEBUG] ${message}`, context)
    await this.addToQueue(logEntry)
  }

  async reportUserFeedback(feedback: UserFeedback): Promise<void> {
    try {
      const response = await fetch('/api/errors/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...feedback,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to report user feedback: ${response.statusText}`)
      }

      await this.logInfo({
        message: 'User feedback reported successfully',
        errorId: feedback.errorId,
        feedbackLength: feedback.feedback.length
      })
    } catch (error) {
      console.error('Failed to report user feedback:', error)
      // Store feedback locally for later retry
      this.storeOfflineFeedback(feedback)
    }
  }

  private async addToQueue(logEntry: LogEntry): Promise<void> {
    this.logQueue.push(logEntry)

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = logEntry.level === 'error' ? 'error' :
                          logEntry.level === 'warn' ? 'warn' :
                          logEntry.level === 'debug' ? 'debug' : 'log'
      
      console[consoleMethod](`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, {
        errorId: logEntry.errorId,
        context: logEntry.context,
        error: logEntry.error
      })
    }

    // Flush immediately for errors in production
    if (logEntry.level === 'error' && process.env.NODE_ENV === 'production') {
      await this.flushLogs()
    }

    // Auto-flush when queue is full
    if (this.logQueue.length >= this.batchSize) {
      await this.flushLogs()
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0 || !this.isOnline) return

    const logsToSend = [...this.logQueue]
    this.logQueue = []

    try {
      await this.sendLogs(logsToSend)
    } catch (error) {
      console.error('Failed to flush logs:', error)
      
      // Re-add failed logs to queue for retry
      this.logQueue.unshift(...logsToSend)
      
      // Retry with exponential backoff
      setTimeout(() => {
        this.flushLogs()
      }, this.retryDelay)
    }
  }

  private async sendLogs(logs: LogEntry[], retryCount = 0): Promise<void> {
    try {
      const response = await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logs.map(log => ({
            ...log,
            // Serialize error objects
            error: log.error ? {
              name: log.error.name,
              message: log.error.message,
              stack: log.error.stack
            } : undefined
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Log successful transmission
      console.info(`Successfully sent ${logs.length} log entries`)

    } catch (error) {
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount)
        console.warn(`Retrying log transmission in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`)
        
        setTimeout(() => {
          this.sendLogs(logs, retryCount + 1)
        }, delay)
      } else {
        console.error('Max retries exceeded, storing logs offline:', error)
        this.storeOfflineLogs(logs)
        throw error
      }
    }
  }

  private storeOfflineLogs(logs: LogEntry[]): void {
    try {
      const existingLogs = localStorage.getItem('offline_logs')
      const offlineLogs = existingLogs ? JSON.parse(existingLogs) : []
      
      offlineLogs.push(...logs)
      
      // Limit offline storage
      const maxOfflineLogs = 1000
      if (offlineLogs.length > maxOfflineLogs) {
        offlineLogs.splice(0, offlineLogs.length - maxOfflineLogs)
      }
      
      localStorage.setItem('offline_logs', JSON.stringify(offlineLogs))
    } catch (error) {
      console.error('Failed to store offline logs:', error)
    }
  }

  private storeOfflineFeedback(feedback: UserFeedback): void {
    try {
      const existingFeedback = localStorage.getItem('offline_feedback')
      const offlineFeedback = existingFeedback ? JSON.parse(existingFeedback) : []
      
      offlineFeedback.push({
        ...feedback,
        timestamp: new Date().toISOString()
      })
      
      localStorage.setItem('offline_feedback', JSON.stringify(offlineFeedback))
    } catch (error) {
      console.error('Failed to store offline feedback:', error)
    }
  }

  async flushOfflineLogs(): Promise<void> {
    try {
      // Flush offline logs
      const offlineLogs = localStorage.getItem('offline_logs')
      if (offlineLogs) {
        const logs = JSON.parse(offlineLogs)
        if (logs.length > 0) {
          await this.sendLogs(logs)
          localStorage.removeItem('offline_logs')
          console.info(`Flushed ${logs.length} offline log entries`)
        }
      }

      // Flush offline feedback
      const offlineFeedback = localStorage.getItem('offline_feedback')
      if (offlineFeedback) {
        const feedback = JSON.parse(offlineFeedback)
        for (const item of feedback) {
          await this.reportUserFeedback(item)
        }
        localStorage.removeItem('offline_feedback')
        console.info(`Flushed ${feedback.length} offline feedback items`)
      }
    } catch (error) {
      console.error('Failed to flush offline data:', error)
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }
}

export const errorLogger = new ErrorLogger()

// Initialize offline data flushing when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    errorLogger.flushOfflineLogs()
  })
}
```

#### 4. Error Recovery System
```typescript
// lib/errors/error-recovery.ts
interface RecoveryContext {
  error: Error
  errorInfo?: ErrorInfo
  level?: string
  retryCount: number
  timestamp?: string
}

interface RecoveryStrategy {
  name: string
  condition: (error: Error) => boolean
  recover: (context: RecoveryContext) => Promise<boolean>
  maxRetries: number
  delay: number
}

class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = []

  constructor() {
    this.initializeStrategies()
  }

  private initializeStrategies() {
    // Chunk loading error recovery
    this.strategies.push({
      name: 'chunk_reload',
      condition: (error) => 
        error.name === 'ChunkLoadError' || 
        error.message.includes('Loading chunk') ||
        error.message.includes('Loading failed for'),
      recover: async (context) => {
        console.log('Attempting chunk reload recovery...')
        
        // Clear module cache
        if (typeof window !== 'undefined' && 'webpackChunkName' in window) {
          delete (window as any).webpackChunkName
        }
        
        // Force page reload after delay
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        
        return true
      },
      maxRetries: 1,
      delay: 1000
    })

    // Network error recovery
    this.strategies.push({
      name: 'network_retry',
      condition: (error) => 
        error.name === 'NetworkError' ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('Network request failed'),
      recover: async (context) => {
        console.log('Attempting network recovery...')
        
        // Wait for network to be available
        if (!navigator.onLine) {
          return new Promise((resolve) => {
            const handleOnline = () => {
              window.removeEventListener('online', handleOnline)
              resolve(true)
            }
            window.addEventListener('online', handleOnline)
            
            // Timeout after 30 seconds
            setTimeout(() => {
              window.removeEventListener('online', handleOnline)
              resolve(false)
            }, 30000)
          })
        }
        
        // Test network connectivity
        try {
          const response = await fetch('/api/health', { 
            method: 'HEAD',
            cache: 'no-cache'
          })
          return response.ok
        } catch {
          return false
        }
      },
      maxRetries: 3,
      delay: 2000
    })

    // Memory error recovery
    this.strategies.push({
      name: 'memory_cleanup',
      condition: (error) => 
        error.name === 'RangeError' ||
        error.message.includes('Maximum call stack') ||
        error.message.includes('out of memory'),
      recover: async (context) => {
        console.log('Attempting memory cleanup recovery...')
        
        // Clear caches
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys()
            const oldCaches = cacheNames.filter(name => 
              name.includes('old') || name.includes('v1') || name.includes('v2')
            )
            
            for (const cacheName of oldCaches) {
              await caches.delete(cacheName)
            }
          } catch (error) {
            console.warn('Failed to clear caches:', error)
          }
        }
        
        // Clear local storage of non-essential data
        try {
          const keysToRemove = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (
              key.startsWith('cache_') || 
              key.startsWith('temp_') || 
              key.startsWith('preview_')
            )) {
              keysToRemove.push(key)
            }
          }
          
          keysToRemove.forEach(key => localStorage.removeItem(key))
        } catch (error) {
          console.warn('Failed to clear localStorage:', error)
        }
        
        // Force garbage collection if available
        if ('gc' in window && typeof (window as any).gc === 'function') {
          try {
            (window as any).gc()
          } catch (error) {
            console.warn('Garbage collection failed:', error)
          }
        }
        
        return true
      },
      maxRetries: 1,
      delay: 500
    })

    // Authentication error recovery
    this.strategies.push({
      name: 'auth_refresh',
      condition: (error) => 
        error.message.includes('401') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('Authentication failed'),
      recover: async (context) => {
        console.log('Attempting authentication recovery...')
        
        try {
          // Attempt token refresh
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
          })
          
          if (response.ok) {
            console.log('Authentication refreshed successfully')
            return true
          } else {
            // Redirect to login
            window.location.href = '/login?returnTo=' + encodeURIComponent(window.location.pathname)
            return false
          }
        } catch (error) {
          console.error('Auth refresh failed:', error)
          return false
        }
      },
      maxRetries: 1,
      delay: 0
    })

    // Component state error recovery
    this.strategies.push({
      name: 'state_reset',
      condition: (error) => 
        error.message.includes('Cannot read properties of undefined') ||
        error.message.includes('Cannot read property') ||
        error.message.includes('is not a function'),
      recover: async (context) => {
        console.log('Attempting state reset recovery...')
        
        // Clear component-specific session storage
        try {
          const keysToRemove = []
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && key.startsWith('component_')) {
              keysToRemove.push(key)
            }
          }
          
          keysToRemove.forEach(key => sessionStorage.removeItem(key))
        } catch (error) {
          console.warn('Failed to clear sessionStorage:', error)
        }
        
        return true
      },
      maxRetries: 2,
      delay: 100
    })
  }

  async attemptRecovery(context: RecoveryContext): Promise<boolean> {
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.condition(context.error) && context.retryCount < strategy.maxRetries
    )

    for (const strategy of applicableStrategies) {
      try {
        console.log(`Attempting recovery with strategy: ${strategy.name}`)
        
        await errorLogger.logInfo({
          message: 'Recovery attempt started',
          strategy: strategy.name,
          retryCount: context.retryCount,
          errorMessage: context.error.message
        })

        // Apply delay if specified
        if (strategy.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, strategy.delay))
        }

        const recovered = await strategy.recover(context)
        
        if (recovered) {
          await errorLogger.logInfo({
            message: 'Recovery successful',
            strategy: strategy.name,
            retryCount: context.retryCount
          })
          return true
        }
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError)
        
        await errorLogger.logError({
          error: recoveryError as Error,
          context: {
            recoveryStrategy: strategy.name,
            originalError: context.error.message,
            retryCount: context.retryCount
          }
        })
      }
    }

    return false
  }

  // Register custom recovery strategy
  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy)
  }

  // Remove recovery strategy
  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter(strategy => strategy.name !== name)
  }

  // Get available strategies
  getStrategies(): RecoveryStrategy[] {
    return [...this.strategies]
  }
}

export const errorRecovery = new ErrorRecoveryManager()
```

## 💡 Öneriler ve Best Practices

### 🛡️ Error Handling Best Practices
- **Graceful Degradation**: Critical functionality'yi koruma ve alternative flows
- **User-Friendly Messages**: Technical jargon yerine anlaşılır error messages
- **Contextual Recovery**: Error type'a göre specific recovery strategies
- **Performance Impact**: Error handling overhead'ini minimize etme

### 📊 Logging Strategy
- **Structured Logging**: Machine-readable format ile centralized analysis
- **Privacy Compliance**: Sensitive data'yı log'lardan exclude etme
- **Storage Optimization**: Log retention policies ve cost management
- **Real-time Monitoring**: Critical errors için immediate alerting

### 🔧 Monitoring Integration
- **Error Rate Tracking**: Threshold-based alerting ve trend analysis
- **Performance Correlation**: Error occurrence ile performance metrics correlation
- **User Impact Analysis**: Error'ların user experience'e etkisini measure etme
- **Proactive Prevention**: Error patterns'dan prevention strategies çıkarma

## 📊 Implementation Roadmap

### Phase 1: Core Infrastructure (2 weeks)
- [ ] Error boundary hierarchy implementation
- [ ] Centralized logging system setup
- [ ] Basic error recovery mechanisms
- [ ] Development environment error handling

### Phase 2: Advanced Features (2 weeks)
- [ ] Real-time error monitoring integration
- [ ] Advanced recovery strategies
- [ ] User feedback collection system
- [ ] Performance correlation analysis

### Phase 3: Production Optimization (1 week)
- [ ] Production logging configuration
- [ ] Error analytics dashboard
- [ ] Alerting system setup
- [ ] Cross-environment consistency

### Phase 4: Monitoring & Analytics (1 week)
- [ ] Error trend analysis
- [ ] Proactive error prevention
- [ ] User experience impact measurement
- [ ] Continuous improvement processes

## 🔗 İlgili Dosyalar

- [Performance Monitoring](../analytics/performance-monitoring.md) - Error performance correlation
- [Security Implementation](../security/security-framework.md) - Secure error handling
- [Testing Strategy](./testing-strategy.md) - Error scenario testing
- [API Error Handling](../backend/api-error-handling.md) - Server-side error management
- [User Experience](../ux/error-experience.md) - Error UX design patterns
- [Monitoring Dashboard](../analytics/monitoring-dashboard.md) - Error analytics visualization

## 📚 Kaynaklar

### 📖 Error Handling Standards
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Next.js Error Handling](https://nextjs.org/docs/advanced-features/error-handling)
- [Web Platform Error Events](https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent)

### 🛠️ Monitoring Tools
- [Sentry Error Tracking](https://sentry.io/welcome/)
- [LogRocket Session Replay](https://logrocket.com/)
- [DataDog Application Monitoring](https://www.datadoghq.com/product/apm/)

### 📊 Analytics & Reporting
- [Error Tracking Best Practices](https://blog.sentry.io/error-monitoring-best-practices/)
- [Structured Logging Guide](https://www.elastic.co/guide/en/ecs/current/ecs-logging.html)
- [Error Recovery Patterns](https://martinfowler.com/articles/patterns-of-resilience.html)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*