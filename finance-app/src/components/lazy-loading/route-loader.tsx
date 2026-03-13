'use client';

import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Loading fallback components with different levels of detail
 */
export function PageLoadingSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}

export function ComponentLoadingSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  );
}

export function ChartLoadingSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  );
}

export function TableLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 bg-gray-200 rounded mb-4"></div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded mb-2"></div>
      ))}
    </div>
  );
}

/**
 * Error fallback component
 */
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
      <p className="text-gray-600 mb-4">Failed to load this component. Please try again.</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Try again
      </button>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-gray-500">Error details</summary>
          <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Higher-order component for lazy loading with error boundaries
 */
export function withLazyLoading<T extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  fallback: React.ComponentType = PageLoadingSkeleton,
  errorFallback: React.ComponentType<any> = ErrorFallback
) {
  const LazyComponent = lazy(importFn);

  return function LazyLoadedComponent(props: T) {
    return (
      <ErrorBoundary FallbackComponent={errorFallback}>
        <Suspense fallback={<fallback />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

/**
 * Preload utility for critical routes
 */
export function preloadComponent(importFn: () => Promise<any>) {
  // Start loading the component
  const componentImport = importFn();
  
  // Return a function that can be called to ensure the component is loaded
  return () => componentImport;
}

/**
 * Route-based lazy loading with preloading
 */
export class RoutePreloader {
  private static preloadedRoutes = new Set<string>();
  private static preloadPromises = new Map<string, Promise<any>>();

  static preload(routePath: string, importFn: () => Promise<any>) {
    if (this.preloadedRoutes.has(routePath)) {
      return this.preloadPromises.get(routePath);
    }

    const promise = importFn();
    this.preloadPromises.set(routePath, promise);
    this.preloadedRoutes.add(routePath);

    return promise;
  }

  static async preloadCriticalRoutes() {
    // Preload most commonly accessed routes
    const criticalRoutes = [
      '/dashboard',
      '/transactions',
      '/accounts',
    ];

    const preloadPromises = criticalRoutes.map(route => {
      switch (route) {
        case '/dashboard':
          return this.preload(route, () => import('@/app/dashboard/page'));
        case '/transactions':
          return this.preload(route, () => import('@/app/transactions/page'));
        case '/accounts':
          return this.preload(route, () => import('@/app/accounts/page'));
        default:
          return Promise.resolve();
      }
    });

    await Promise.allSettled(preloadPromises);
  }
}

/**
 * Intersection-based preloading for links
 */
export function useLinkPreloader() {
  const preloadOnHover = (routePath: string) => {
    switch (routePath) {
      case '/dashboard':
        RoutePreloader.preload(routePath, () => import('@/app/dashboard/page'));
        break;
      case '/transactions':
        RoutePreloader.preload(routePath, () => import('@/app/transactions/page'));
        break;
      case '/accounts':
        RoutePreloader.preload(routePath, () => import('@/app/accounts/page'));
        break;
      case '/documents':
        RoutePreloader.preload(routePath, () => import('@/app/documents/page'));
        break;
      case '/settings':
        RoutePreloader.preload(routePath, () => import('@/app/settings/page'));
        break;
    }
  };

  const preloadOnVisible = (routePath: string, element: Element) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            preloadOnHover(routePath);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(element);
  };

  return { preloadOnHover, preloadOnVisible };
}

/**
 * Performance monitoring for lazy loaded components
 */
export function withPerformanceMonitoring<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function MonitoredComponent(props: T) {
    React.useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log component render time
        if (duration > 100) {
          console.warn(`Slow component render: ${componentName} took ${duration.toFixed(2)}ms`);
        }
        
        // Send to analytics if available
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'component_render_time', {
            component_name: componentName,
            duration_ms: Math.round(duration)
          });
        }
      };
    }, []);

    return <Component {...props} />;
  };
}

/**
 * Bundle splitting utility
 */
export const BundleSplitter = {
  // Lazy load dashboard components
  DashboardChart: withLazyLoading(
    () => import('@/components/dashboard/dashboard-chart'),
    ChartLoadingSkeleton
  ),
  
  TransactionTable: withLazyLoading(
    () => import('@/components/transactions/transaction-table'),
    TableLoadingSkeleton
  ),
  
  AccountSummary: withLazyLoading(
    () => import('@/components/accounts/account-summary'),
    ComponentLoadingSkeleton
  ),
  
  DocumentUploader: withLazyLoading(
    () => import('@/components/documents/document-uploader'),
    ComponentLoadingSkeleton
  ),
  
  // Lazy load heavy third-party components
  PdfViewer: withLazyLoading(
    () => import('@/components/documents/pdf-viewer'),
    ComponentLoadingSkeleton
  ),
  
  DataVisualization: withLazyLoading(
    () => import('@/components/analytics/data-visualization'),
    ChartLoadingSkeleton
  ),
};

// Initialize critical route preloading on app start
if (typeof window !== 'undefined') {
  // Preload critical routes after initial page load
  setTimeout(() => {
    RoutePreloader.preloadCriticalRoutes().catch(console.error);
  }, 2000);
}