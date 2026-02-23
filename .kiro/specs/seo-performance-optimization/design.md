# Design Document: SEO and Performance Optimization

## Overview

This design document outlines the technical approach for implementing comprehensive SEO and performance optimization for the Tonecos Studios catalog application. The solution integrates seamlessly with the existing React + TypeScript + Vite architecture, adding SEO capabilities through React Helmet Async, implementing performance optimizations via code splitting and lazy loading, and providing image optimization through modern web standards.

The design follows a modular approach with dedicated managers for SEO, performance, and analytics, ensuring separation of concerns and maintainability. The implementation leverages Vite's built-in optimization capabilities while adding custom solutions for sitemap generation, structured data, and Core Web Vitals monitoring.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SEO Manager  │  │ Performance  │  │   Analytics  │      │
│  │              │  │  Optimizer   │  │   Tracker    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         ├──────────────────┼──────────────────┤              │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │           Route Components (Lazy Loaded)           │    │
│  │  Catalog │ Quote │ QuoteCart │ Login │ Admin      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Image Optimizer                          │  │
│  │  - Lazy Loading  - WebP Support  - Responsive        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    Build Layer (Vite)                        │
│  - Code Splitting  - Minification  - Cache Headers          │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   Sitemap.xml          robots.txt          Service Worker
```

### Component Interaction Flow

1. **Page Load**: User navigates to a route
2. **SEO Manager**: Injects meta tags, Open Graph tags, and structured data
3. **Performance Optimizer**: Loads only required code chunks
4. **Image Optimizer**: Lazy loads images and serves optimal formats
5. **Analytics Tracker** (optional): Records page view event
6. **Core Web Vitals**: Monitors and reports performance metrics

## Components and Interfaces

### 1. SEO Manager Component

**Purpose**: Centralized management of all SEO-related metadata, tags, and structured data.

**Location**: `src/utils/seo/SEOManager.tsx`

**Interface**:
```typescript
interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  structuredData?: object;
}

interface SEOManagerProps {
  config: SEOConfig;
  children?: React.ReactNode;
}

// React component that wraps pages
function SEOManager({ config, children }: SEOManagerProps): JSX.Element;

// Helper function to generate product structured data
function generateProductSchema(product: Product): object;

// Helper function to generate ItemList structured data
function generateItemListSchema(products: Product[]): object;
```

**Implementation Details**:
- Uses `react-helmet-async` for managing document head
- Generates meta tags dynamically based on page context
- Ensures proper Open Graph and Twitter Card tags
- Validates structured data against Schema.org specifications
- Prevents duplicate meta tags through Helmet's deduplication

**Key Features**:
- Default fallback values for all meta tags
- Automatic canonical URL generation
- Brand name appending to titles
- Image URL validation and fallback

### 2. Performance Optimizer

**Purpose**: Implements code splitting, lazy loading, and performance monitoring.

**Location**: `src/utils/performance/`

**Interface**:
```typescript
// Route-based lazy loading wrapper
function lazyLoadRoute(
  importFn: () => Promise<{ default: ComponentType<any> }>
): LazyExoticComponent<ComponentType<any>>;

// Core Web Vitals monitoring
interface WebVitalsMetrics {
  lcp: number;  // Largest Contentful Paint
  fid: number;  // First Input Delay
  cls: number;  // Cumulative Layout Shift
}

function reportWebVitals(onPerfEntry?: (metric: WebVitalsMetrics) => void): void;

// Performance observer for custom metrics
function observePerformance(metricName: string, callback: (value: number) => void): void;
```

**Implementation Details**:
- Wraps React.lazy() with error boundaries
- Implements loading states for lazy-loaded components
- Uses `web-vitals` library for Core Web Vitals measurement
- Provides development-mode console logging
- Configures Vite for optimal code splitting

**Code Splitting Strategy**:
- Route-level splitting: Each page is a separate chunk
- Vendor splitting: React, React Router, and large libraries in separate chunks
- Admin splitting: All admin components in a separate chunk
- Component-level splitting: Heavy components (charts, editors) loaded on demand

### 3. Image Optimizer Component

**Purpose**: Optimizes image loading, format, and sizing for performance.

**Location**: `src/components/OptimizedImage.tsx`

**Interface**:
```typescript
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  className?: string;
  sizes?: string;
  priority?: boolean;
}

function OptimizedImage(props: OptimizedImageProps): JSX.Element;

// Hook for responsive image sizing
function useResponsiveImage(
  src: string,
  breakpoints: { width: number; size: string }[]
): string;
```

**Implementation Details**:
- Generates `srcset` for responsive images
- Detects WebP support and serves appropriate format
- Implements Intersection Observer for lazy loading
- Provides blur-up placeholder to prevent CLS
- Adds explicit width/height to prevent layout shift
- Prioritizes above-the-fold images

**Image Loading Strategy**:
```typescript
// Priority images (above the fold)
<OptimizedImage src="hero.jpg" priority={true} loading="eager" />

// Standard images (lazy loaded)
<OptimizedImage src="product.jpg" loading="lazy" />

// With responsive sizing
<OptimizedImage 
  src="product.jpg" 
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 4. Sitemap Generator

**Purpose**: Generates XML sitemap and robots.txt for search engine crawlers.

**Location**: `scripts/generateSitemap.ts`

**Interface**:
```typescript
interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

interface SitemapConfig {
  baseUrl: string;
  routes: SitemapEntry[];
  outputPath: string;
}

async function generateSitemap(config: SitemapConfig): Promise<void>;
async function generateRobotsTxt(sitemapUrl: string, outputPath: string): Promise<void>;
```

**Implementation Details**:
- Runs as a build script (pre-build or post-build)
- Fetches dynamic routes from Supabase (product pages)
- Generates XML following sitemap protocol 0.9
- Creates robots.txt with sitemap reference
- Outputs to `public/` directory for static serving

**Sitemap Structure**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tonecos.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://tonecos.com/catalog</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Dynamic product pages -->
</urlset>
```

### 5. Analytics Tracker (Optional)

**Purpose**: Tracks user interactions and page views for business insights.

**Location**: `src/utils/analytics/AnalyticsTracker.tsx`

**Interface**:
```typescript
interface AnalyticsConfig {
  enabled: boolean;
  trackingId?: string;
  debug?: boolean;
}

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

class AnalyticsTracker {
  initialize(config: AnalyticsConfig): void;
  trackPageView(path: string): void;
  trackEvent(event: AnalyticsEvent): void;
  trackConversion(conversionId: string, value?: number): void;
}

// React hook for analytics
function useAnalytics(): AnalyticsTracker;
```

**Implementation Details**:
- Lazy loads analytics script to avoid blocking
- Respects user privacy preferences (Do Not Track)
- Provides consent management integration points
- Supports Google Analytics 4 or alternative providers
- Includes development mode with console logging
- Tracks SPA route changes automatically

**Privacy Considerations**:
- Checks for DNT (Do Not Track) header
- Provides opt-out mechanism
- Anonymizes IP addresses
- Complies with GDPR requirements

### 6. Route Configuration with SEO

**Purpose**: Centralized route configuration with SEO metadata.

**Location**: `src/routes/routeConfig.ts`

**Interface**:
```typescript
interface RouteConfig {
  path: string;
  component: LazyExoticComponent<ComponentType<any>>;
  seo: SEOConfig;
  preload?: boolean;
}

const routes: RouteConfig[] = [
  {
    path: '/',
    component: lazyLoadRoute(() => import('../pages/Home')),
    seo: {
      title: 'Premium Collectibles',
      description: 'Discover premium collectibles from Tonecos Studios...',
      keywords: ['collectibles', 'premium', 'tonecos'],
      type: 'website'
    }
  },
  // ... more routes
];
```

## Data Models

### SEO Configuration Model

```typescript
interface SEOConfig {
  // Basic meta tags
  title: string;                    // Page title (max 60 chars recommended)
  description: string;              // Meta description (max 160 chars)
  keywords?: string[];              // Meta keywords (optional, less important)
  
  // Open Graph tags
  image?: string;                   // OG image URL (1200x630px recommended)
  url?: string;                     // Canonical URL
  type?: 'website' | 'article' | 'product';  // OG type
  
  // Twitter Card tags
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;             // @username
  twitterCreator?: string;          // @username
  
  // Structured data
  structuredData?: ProductSchema | ItemListSchema | OrganizationSchema;
  
  // Additional meta
  robots?: string;                  // 'index,follow' or 'noindex,nofollow'
  canonical?: string;               // Canonical URL override
}
```

### Product Schema Model (JSON-LD)

```typescript
interface ProductSchema {
  '@context': 'https://schema.org';
  '@type': 'Product';
  name: string;
  description: string;
  image: string[];
  brand: {
    '@type': 'Brand';
    name: string;
  };
  offers?: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
    availability: 'https://schema.org/InStock' | 'https://schema.org/OutOfStock';
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: string;
    reviewCount: string;
  };
}
```

### Performance Metrics Model

```typescript
interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number;                      // Largest Contentful Paint (ms)
  fid: number;                      // First Input Delay (ms)
  cls: number;                      // Cumulative Layout Shift (score)
  
  // Additional metrics
  ttfb: number;                     // Time to First Byte (ms)
  fcp: number;                      // First Contentful Paint (ms)
  
  // Resource timing
  bundleSize: number;               // Initial bundle size (bytes)
  totalResources: number;           // Total resources loaded
  
  // Timestamps
  timestamp: Date;
  url: string;
}
```

### Image Optimization Model

```typescript
interface ImageConfig {
  src: string;                      // Original image source
  alt: string;                      // Alt text for accessibility
  width?: number;                   // Explicit width
  height?: number;                  // Explicit height
  loading: 'lazy' | 'eager';        // Loading strategy
  sizes?: string;                   // Responsive sizes attribute
  srcset?: string;                  // Responsive srcset
  placeholder?: string;             // Blur-up placeholder (base64)
  priority: boolean;                // Above-the-fold priority
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

