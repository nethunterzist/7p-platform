"use client";

import React, { useEffect, useState } from 'react';

/**
 * Mobile Performance Optimizations Component
 * 
 * This component handles various mobile-specific optimizations:
 * - Lazy loading for better performance
 * - Touch gesture enhancements
 * - Viewport meta tag optimization
 * - Performance monitoring
 */

interface MobileOptimizationsProps {
  children: React.ReactNode;
  enableLazyLoading?: boolean;
  enableTouchOptimizations?: boolean;
  enablePerformanceMonitoring?: boolean;
}

// Hook for detecting mobile devices
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

// Hook for touch optimization
function useTouchOptimization() {
  const [isTouch, setIsTouch] = useState(false);
  
  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(hasTouch);
    
    if (hasTouch) {
      // Add touch-optimized classes to body
      document.body.classList.add('touch-device');
      
      // Prevent double-tap zoom on buttons
      let lastTouchEnd = 0;
      document.addEventListener('touchend', (event) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    }
  }, []);
  
  return isTouch;
}

// Hook for performance monitoring
function usePerformanceMonitoring() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Monitor Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          // Log performance metrics for mobile optimization
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('LCP:', entry.startTime);
          }
          if (entry.entryType === 'first-input') {
            console.log('FID:', entry.processingStart - entry.startTime);
          }
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
            console.log('CLS:', entry.value);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (e) {
        // Fallback for browsers that don't support all entry types
        console.log('Performans izleme tam olarak desteklenmiyor');
      }
      
      return () => observer.disconnect();
    }
  }, []);
}

// Hook for lazy loading optimization
function useLazyLoading() {
  useEffect(() => {
    if ('IntersectionObserver' in window) {
      const lazyLoadObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            
            // Load images
            if (target.tagName === 'IMG' && target.hasAttribute('data-src')) {
              const img = target as HTMLImageElement;
              img.src = img.getAttribute('data-src') || '';
              img.removeAttribute('data-src');
              lazyLoadObserver.unobserve(target);
            }
            
            // Load components with data-lazy attribute
            if (target.hasAttribute('data-lazy')) {
              target.classList.add('loaded');
              lazyLoadObserver.unobserve(target);
            }
          }
        });
      }, {
        rootMargin: '50px'
      });
      
      // Observe all lazy-loadable elements
      document.querySelectorAll('[data-src], [data-lazy]').forEach((el) => {
        lazyLoadObserver.observe(el);
      });
      
      return () => lazyLoadObserver.disconnect();
    }
  }, []);
}

// Component for mobile-optimized image loading
function MobileOptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  [key: string]: any;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  
  useEffect(() => {
    if (!priority && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        },
        { rootMargin: '50px' }
      );
      
      const element = document.getElementById(`img-${src.replace(/[^a-zA-Z0-9]/g, '')}`);
      if (element) {
        observer.observe(element);
      }
      
      return () => observer.disconnect();
    }
  }, [src, priority]);
  
  return (
    <div
      id={`img-${src.replace(/[^a-zA-Z0-9]/g, '')}`}
      className={`relative overflow-hidden ${className || ''}`}
      style={{ width, height }}
    >
      {isInView && (
        <>
          <img
            src={src}
            alt={alt}
            className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className || ''}`}
            onLoad={() => setIsLoaded(true)}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            {...props}
          />
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-corporate-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Main component
export default function MobileOptimizations({
  children,
  enableLazyLoading = true,
  enableTouchOptimizations = true,
  enablePerformanceMonitoring = false
}: MobileOptimizationsProps) {
  const isMobile = useIsMobile();
  const isTouch = useTouchOptimization();
  
  // Enable optimizations based on props
  if (enableLazyLoading) {
    useLazyLoading();
  }
  
  if (enablePerformanceMonitoring) {
    usePerformanceMonitoring();
  }
  
  useEffect(() => {
    if (isMobile) {
      // Add mobile-specific optimizations
      document.body.classList.add('mobile-optimized');
      
      // Prevent zoom on double-tap for better UX
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
      
      // Add CSS for better mobile performance
      const style = document.createElement('style');
      style.textContent = `
        .mobile-optimized {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        
        .mobile-optimized * {
          -webkit-tap-highlight-color: transparent;
        }
        
        .mobile-optimized img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        @media (max-width: 768px) {
          .mobile-optimized {
            font-size: 16px; /* Prevent iOS zoom */
          }
          
          .mobile-optimized input,
          .mobile-optimized textarea,
          .mobile-optimized select {
            font-size: 16px; /* Prevent iOS zoom */
          }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.body.classList.remove('mobile-optimized');
        document.head.removeChild(style);
      };
    }
  }, [isMobile]);
  
  return (
    <>
      {children}
      {/* Add mobile-specific meta tags if needed */}
      {isMobile && (
        <>
          <meta name="theme-color" content="#1a365d" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="7P Education" />
        </>
      )}
    </>
  );
}

// Export utility functions for use in other components
export {
  useIsMobile,
  useTouchOptimization,
  usePerformanceMonitoring,
  useLazyLoading,
  MobileOptimizedImage
};