'use client';

import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  className?: string;
}

// Lazy loading wrapper with intersection observer
export function LazyLoader({
  children,
  fallback = <LazyLoadingSkeleton />,
  threshold = 0.1,
  rootMargin = '100px',
  delay = 0,
  className = '',
}: LazyComponentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          // Add delay if specified
          if (delay > 0) {
            setTimeout(() => {
              setShouldRender(true);
            }, delay);
          } else {
            setShouldRender(true);
          }
          
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, delay]);

  return (
    <div ref={elementRef} className={className}>
      {shouldRender ? (
        <ErrorBoundary fallback={<LazyErrorFallback />}>
          <Suspense fallback={fallback}>
            {children}
          </Suspense>
        </ErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}

// Dynamic component loader
export function DynamicLoader<T extends Record<string, any>>({
  importFunc,
  fallback,
  errorFallback,
  ...props
}: {
  importFunc: () => Promise<{ default: React.ComponentType<T> }>;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
} & T) {
  const LazyComponent = lazy(importFunc);

  return (
    <ErrorBoundary fallback={errorFallback || <LazyErrorFallback />}>
      <Suspense fallback={fallback || <LazyLoadingSkeleton />}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Progressive loading for lists
export function ProgressiveList({
  items,
  renderItem,
  batchSize = 10,
  loadMoreThreshold = 2,
  className = '',
  itemClassName = '',
}: {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  batchSize?: number;
  loadMoreThreshold?: number;
  className?: string;
  itemClassName?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const loadMore = () => {
    if (visibleCount >= items.length) return;
    
    setIsLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + batchSize, items.length));
      setIsLoading(false);
    }, 300);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoading) {
            loadMore();
          }
        });
      },
      { rootMargin: '100px' }
    );

    // Observe items near the end
    const elements = listRef.current?.children;
    if (elements) {
      const threshold = Math.max(elements.length - loadMoreThreshold, 0);
      const targetElement = elements[threshold] as HTMLElement;
      if (targetElement) {
        observer.observe(targetElement);
      }
    }

    return () => observer.disconnect();
  }, [visibleCount, isLoading, loadMoreThreshold]);

  return (
    <div ref={listRef} className={className}>
      {items.slice(0, visibleCount).map((item, index) => (
        <LazyLoader
          key={index}
          className={itemClassName}
          fallback={<ItemSkeleton />}
          threshold={0.1}
        >
          {renderItem(item, index)}
        </LazyLoader>
      ))}
      
      {isLoading && (
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      )}
      
      {visibleCount < items.length && !isLoading && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Daha Fazla Yükle ({items.length - visibleCount} kalan)
          </button>
        </div>
      )}
    </div>
  );
}

// Optimized tab loader
export function LazyTabs({
  tabs,
  defaultTab = 0,
  className = '',
}: {
  tabs: Array<{
    label: string;
    content: () => Promise<{ default: React.ComponentType }>;
  }>;
  defaultTab?: number;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loadedTabs, setLoadedTabs] = useState(new Set([defaultTab]));

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    if (!loadedTabs.has(index)) {
      setLoadedTabs(prev => new Set([...prev, index]));
    }
  };

  return (
    <div className={className}>
      {/* Tab navigation */}
      <div className="flex space-x-1 border-b">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabClick(index)}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === index
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tabs.map((tab, index) => (
          <div
            key={index}
            className={`${activeTab === index ? 'block' : 'hidden'}`}
          >
            {loadedTabs.has(index) ? (
              <DynamicLoader
                importFunc={tab.content}
                fallback={<TabContentSkeleton />}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                Tab içeriği yükleniyor...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeletons
function LazyLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );
}

function ItemSkeleton() {
  return (
    <div className="animate-pulse p-4 border rounded-md mb-4">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

function TabContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  );
}

function LazyErrorFallback() {
  return (
    <div className="p-4 border border-red-200 rounded-md bg-red-50">
      <p className="text-red-600 text-sm">
        İçerik yüklenirken bir hata oluştu. Sayfayı yenilemeyi deneyin.
      </p>
    </div>
  );
}