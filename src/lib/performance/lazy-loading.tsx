/**
 * Lazy Loading Utilities
 * 
 * Provides utilities for code splitting and lazy loading components
 * to reduce initial bundle size and improve performance.
 * 
 * Features:
 * - Lazy component loading with suspense
 * - Route-based code splitting
 * - Retry logic for failed loads
 * - Loading states
 */

import { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { errorTracking, ErrorSeverity } from '@/lib/error-tracking';

/**
 * Lazy load options
 */
export interface LazyLoadOptions {
  fallback?: ReactNode;
  retries?: number;
  retryDelay?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<LazyLoadOptions> = {
  fallback: <div>Loading...</div>,
  retries: 3,
  retryDelay: 1000,
};

/**
 * Retry import with exponential backoff
 * 
 * @param importFn - Dynamic import function
 * @param retries - Number of retries
 * @param delay - Initial delay in ms
 * @returns Promise with component
 */
async function retryImport<T>(
  importFn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (retries === 0) {
      errorTracking.log(
        'Failed to load component after all retries',
        ErrorSeverity.ERROR,
        { error }
      );
      throw error;
    }

    errorTracking.log(
      `Failed to load component, retrying... (${retries} attempts left)`,
      ErrorSeverity.WARNING,
      { error, retriesLeft: retries }
    );

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));

    // Retry with exponential backoff
    return retryImport(importFn, retries - 1, delay * 2);
  }
}

/**
 * Create lazy component with retry logic
 * 
 * @param importFn - Dynamic import function
 * @param options - Lazy load options
 * @returns Lazy component
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): ComponentType<any> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const LazyComponent = lazy(() => retryImport(importFn, opts.retries, opts.retryDelay));

  return (props: any) => (
    <Suspense fallback={opts.fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Preload a lazy component
 * Useful for prefetching on hover or route change
 * 
 * @param importFn - Dynamic import function
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  importFn().catch(error => {
    errorTracking.log(
      'Failed to preload component',
      ErrorSeverity.WARNING,
      { error }
    );
  });
}

/**
 * Create lazy route component
 * Optimized for route-based code splitting
 * 
 * @param importFn - Dynamic import function
 * @param fallback - Loading fallback
 * @returns Lazy route component
 */
export function lazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ReactNode
): ComponentType<any> {
  return lazyWithRetry(importFn, {
    fallback: fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    ),
    retries: 3,
    retryDelay: 1000,
  });
}

/**
 * Lazy load admin pages
 * Separate bundle for admin routes
 */
export const LazyAdminPages = {
  AdminHome: lazyRoute(() => import('@/pages/admin/AdminHome')),
  AdminUsers: lazyRoute(() => import('@/pages/admin/AdminUsers')),
  AdminCollections: lazyRoute(() => import('@/pages/admin/AdminCollections')),
  AdminSubscriptions: lazyRoute(() => import('@/pages/admin/AdminSubscriptions')),
  AdminPayments: lazyRoute(() => import('@/pages/admin/AdminPayments')),
  AdminAnalytics: lazyRoute(() => import('@/pages/admin/AdminAnalytics')),
  AdminSettings: lazyRoute(() => import('@/pages/admin/AdminSettings')),
};

/**
 * Lazy load customer pages
 */
export const LazyCustomerPages = {
  Profile: lazyRoute(() => import('@/pages/Profile')),
  Dashboard: lazyRoute(() => import('@/pages/Dashboard')),
  MySubscriptions: lazyRoute(() => import('@/pages/MySubscriptions')),
  MyPaymentsPage: lazyRoute(() => import('@/pages/MyPaymentsPage')),
  Wishlist: lazyRoute(() => import('@/pages/Wishlist')),
};

/**
 * Lazy load heavy components
 */
export const LazyComponents = {
  // Charts (heavy library)
  Charts: lazyWithRetry(() => import('@/components/admin/Charts'), {
    fallback: <div className="h-64 bg-muted animate-pulse rounded-lg"></div>,
  }),

  // Rich text editor (heavy library)
  RichTextEditor: lazyWithRetry(() => import('@/components/RichTextEditor'), {
    fallback: <div className="h-32 bg-muted animate-pulse rounded-lg"></div>,
  }),

  // PDF viewer (heavy library)
  PDFViewer: lazyWithRetry(() => import('@/components/PDFViewer'), {
    fallback: <div className="h-96 bg-muted animate-pulse rounded-lg"></div>,
  }),

  // Image editor (heavy library)
  ImageEditor: lazyWithRetry(() => import('@/components/ImageEditor'), {
    fallback: <div className="h-96 bg-muted animate-pulse rounded-lg"></div>,
  }),
};

/**
 * Intersection Observer based lazy loading
 * For images and components that should load when visible
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  options: IntersectionObserverInit = {}
): void {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px', // Start loading 50px before element is visible
    threshold: 0.01,
    ...options,
  };

  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    // Fallback for browsers without IntersectionObserver
    callback();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback();
        observer.disconnect();
      }
    });
  }, defaultOptions);

  if (ref.current) {
    observer.observe(ref.current);
  }

  return () => {
    observer.disconnect();
  };
}

/**
 * Lazy image component
 * Loads image only when visible
 */
export function LazyImage({
  src,
  alt,
  className,
  placeholder,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  placeholder?: string;
}) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');

  React.useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && src) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      onLoad={() => setIsLoaded(true)}
      {...props}
    />
  );
}

/**
 * Prefetch routes on hover
 * Improves perceived performance
 */
export function usePrefetchOnHover(
  importFn: () => Promise<any>
): {
  onMouseEnter: () => void;
  onTouchStart: () => void;
} {
  const prefetch = () => {
    preloadComponent(importFn);
  };

  return {
    onMouseEnter: prefetch,
    onTouchStart: prefetch,
  };
}

/**
 * Bundle size analyzer helper
 * Logs component size in development
 */
export function logBundleSize(componentName: string, importFn: () => Promise<any>): void {
  if (import.meta.env.DEV) {
    const start = performance.now();
    importFn().then(() => {
      const end = performance.now();
      console.log(`[Bundle] ${componentName} loaded in ${(end - start).toFixed(2)}ms`);
    });
  }
}
