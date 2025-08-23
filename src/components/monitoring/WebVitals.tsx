'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVitals } from '@/lib/monitoring/performance';
import * as Sentry from '@sentry/nextjs';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Report to our performance monitoring
    reportWebVitals(metric);
    
    // Send to Vercel Analytics (automatically handled)
    // Send to Sentry for poor performance
    if (metric.rating === 'poor') {
      Sentry.addBreadcrumb({
        category: 'web-vitals',
        message: `Poor ${metric.name} performance`,
        level: 'warning',
        data: metric,
      });
    }

    // Custom analytics tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  });

  useEffect(() => {
    // Track page load performance
    const startTime = performance.now();
    
    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      
      // Report page load time
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'page_load_time', {
          event_category: 'Performance',
          value: Math.round(loadTime),
          custom_map: {
            dimension1: window.location.pathname,
          },
        });
      }
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  return null; // This component doesn't render anything
}

// Custom hook for tracking user interactions
export function useUserInteractionTracking() {
  useEffect(() => {
    const trackInteraction = (event: Event) => {
      const target = event.target as HTMLElement;
      const interaction = {
        type: event.type,
        element: target.tagName,
        text: target.textContent?.slice(0, 50),
        pathname: window.location.pathname,
        timestamp: Date.now(),
      };

      // Send to analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'user_interaction', {
          event_category: 'User Behavior',
          event_label: `${interaction.element}_${interaction.type}`,
          custom_map: {
            dimension2: interaction.pathname,
            dimension3: interaction.text,
          },
        });
      }
    };

    // Track clicks and key interactions
    document.addEventListener('click', trackInteraction);
    document.addEventListener('keydown', trackInteraction);
    
    return () => {
      document.removeEventListener('click', trackInteraction);
      document.removeEventListener('keydown', trackInteraction);
    };
  }, []);
}

// Custom hook for tracking page views
export function usePageViewTracking() {
  useEffect(() => {
    const trackPageView = () => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!, {
          page_title: document.title,
          page_location: window.location.href,
        });
      }
    };

    trackPageView();
  }, []);
}

// Error tracking component
export function ErrorTracking() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Log unhandled errors
      console.error('Unhandled error:', event.error);
      
      // Send to Sentry
      Sentry.captureException(event.error);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      // Log unhandled promise rejections
      console.error('Unhandled promise rejection:', event.reason);
      
      // Send to Sentry
      Sentry.captureException(event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}