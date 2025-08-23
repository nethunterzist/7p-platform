import winston from 'winston';
import 'winston-daily-rotate-file';
import * as Sentry from '@sentry/nextjs';

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colors for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(LOG_COLORS);

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, userId, ...meta }) => {
    const userInfo = userId ? `[User: ${userId}]` : '';
    const serviceInfo = service ? `[${service}]` : '';
    const metaInfo = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    
    return `${timestamp} ${level} ${serviceInfo}${userInfo}: ${message}${metaInfo}`;
  })
);

// Create transports
const transports: winston.transport[] = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    })
  );

  // Combined log
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: LOG_LEVELS,
  format: logFormat,
  transports,
});

// Enhanced logger interface
interface LogContext {
  userId?: string;
  userEmail?: string;
  service?: string;
  action?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  url?: string;
  [key: string]: any;
}

interface LogMethods {
  error(message: string, context?: LogContext & { error?: Error }): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  http(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  
  // Specialized logging methods
  security(message: string, context?: LogContext & { severity?: 'low' | 'medium' | 'high' | 'critical' }): void;
  audit(message: string, context?: LogContext & { before?: any; after?: any }): void;
  performance(message: string, context?: LogContext & { metrics?: Record<string, number> }): void;
  auth(message: string, context?: LogContext & { authType?: string; success?: boolean }): void;
  api(message: string, context?: LogContext & { endpoint?: string; payload?: any }): void;
}

class EnhancedLogger implements LogMethods {
  private winston: winston.Logger;

  constructor(winstonLogger: winston.Logger) {
    this.winston = winstonLogger;
  }

  private log(level: string, message: string, context: LogContext = {}) {
    const logEntry = {
      message,
      ...context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      service: context.service || '7p-education',
    };

    // Send errors to Sentry
    if (level === 'error' && context.error) {
      Sentry.captureException(context.error, {
        tags: {
          service: context.service,
          action: context.action,
          resource: context.resource,
        },
        user: {
          id: context.userId,
          email: context.userEmail,
        },
        extra: {
          ...context,
          originalMessage: message,
        },
      });
    }

    // Send security events to Sentry
    if (level === 'security' && context.severity && ['high', 'critical'].includes(context.severity)) {
      Sentry.captureMessage(`Security Alert: ${message}`, 'warning', {
        tags: {
          securityAlert: true,
          severity: context.severity,
          service: context.service,
        },
        user: {
          id: context.userId,
          email: context.userEmail,
        },
        extra: context,
      });
    }

    this.winston.log(level, logEntry);
  }

  error(message: string, context: LogContext & { error?: Error } = {}) {
    this.log('error', message, context);
  }

  warn(message: string, context: LogContext = {}) {
    this.log('warn', message, context);
  }

  info(message: string, context: LogContext = {}) {
    this.log('info', message, context);
  }

  http(message: string, context: LogContext = {}) {
    this.log('http', message, context);
  }

  debug(message: string, context: LogContext = {}) {
    this.log('debug', message, context);
  }

  security(message: string, context: LogContext & { severity?: 'low' | 'medium' | 'high' | 'critical' } = {}) {
    const severity = context.severity || 'medium';
    const enhancedContext = {
      ...context,
      logType: 'security',
      severity,
    };
    
    // Use appropriate log level based on severity
    const level = ['high', 'critical'].includes(severity) ? 'error' : 'warn';
    this.log(level, `[SECURITY-${severity.toUpperCase()}] ${message}`, enhancedContext);
  }

  audit(message: string, context: LogContext & { before?: any; after?: any } = {}) {
    this.log('info', `[AUDIT] ${message}`, {
      ...context,
      logType: 'audit',
    });
  }

  performance(message: string, context: LogContext & { metrics?: Record<string, number> } = {}) {
    this.log('info', `[PERFORMANCE] ${message}`, {
      ...context,
      logType: 'performance',
    });
  }

  auth(message: string, context: LogContext & { authType?: string; success?: boolean } = {}) {
    const level = context.success === false ? 'warn' : 'info';
    this.log(level, `[AUTH] ${message}`, {
      ...context,
      logType: 'auth',
    });
  }

  api(message: string, context: LogContext & { endpoint?: string; payload?: any } = {}) {
    this.log('http', `[API] ${message}`, {
      ...context,
      logType: 'api',
    });
  }
}

// Export the enhanced logger
export const log = new EnhancedLogger(logger);

// Helper functions for common logging patterns
export const logApiRequest = (
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  context: Partial<LogContext> = {}
) => {
  const level = statusCode >= 400 ? 'warn' : 'http';
  const message = `${method} ${url} ${statusCode} - ${duration}ms`;
  
  log[level === 'warn' ? 'warn' : 'http'](message, {
    ...context,
    method,
    url,
    statusCode,
    duration,
    logType: 'api-request',
  });
};

export const logError = (
  error: Error,
  context: Partial<LogContext> = {}
) => {
  log.error(error.message, {
    ...context,
    error,
    stack: error.stack,
  });
};

export const logSecurityEvent = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  context: Partial<LogContext> = {}
) => {
  log.security(event, {
    ...context,
    severity,
  });
};

export default log;