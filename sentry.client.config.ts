// This file configures the initialization of Sentry on the browser/client
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  
  // Performance Monitoring
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  
  // Additional SDK configuration
  debug: ENVIRONMENT === 'development',
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out certain errors
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop limit exceeded')) {
      return null;
    }
    
    // Add user context
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('user-id');
      const userEmail = localStorage.getItem('user-email');
      
      if (userId || userEmail) {
        event.user = {
          id: userId || undefined,
          email: userEmail || undefined,
        };
      }
    }
    
    return event;
  },
  
  integrations: [
    new Sentry.BrowserTracing({
      // Set sampling rate for navigation transactions
      routingInstrumentation: Sentry.nextRouterInstrumentation(
        // We need to import next/router in the component where this is used
      ),
    }),
    new Sentry.Replay({
      // Mask all text content, input values, but reveal clicks, reloads
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});