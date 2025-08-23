// This file configures the initialization of Sentry for edge features (middleware, edge API routes, and so on)
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  
  // Performance Monitoring
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  
  // Additional SDK configuration
  debug: ENVIRONMENT === 'development',
  
  // Server-side error handling
  beforeSend(event, hint) {
    // Filter out certain server errors
    if (event.exception?.values?.[0]?.value?.includes('ECONNRESET')) {
      return null;
    }
    
    // Add server context
    event.tags = {
      ...event.tags,
      platform: 'server',
      environment: ENVIRONMENT,
    };
    
    return event;
  },
  
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
});