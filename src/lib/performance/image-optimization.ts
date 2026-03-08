/**
 * Image Optimization Utilities
 * 
 * Provides utilities for optimizing images to improve performance.
 * 
 * Features:
 * - Responsive images with srcset
 * - WebP format with fallback
 * - Lazy loading
 * - Blur placeholder
 * - Image compression
 */

/**
 * Image size presets
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
  xlarge: { width: 2048, height: 2048 },
} as const;

/**
 * Generate srcset for responsive images
 * 
 * @param baseUrl - Base image URL
 * @param sizes - Array of sizes
 * @returns srcset string
 */
export function generateSrcSet(
  baseUrl: string,
  sizes: number[] = [300, 600, 900, 1200]
): string {
  return sizes
    .map(size => `${baseUrl}?w=${size} ${size}w`)
    .join(', ');
}

/**
 * Generate sizes attribute for responsive images
 * 
 * @param breakpoints - Breakpoints with sizes
 * @returns sizes string
 */
export function generateSizes(
  breakpoints: Array<{ breakpoint?: string; size: string }>
): string {
  return breakpoints
    .map(({ breakpoint, size }) => 
      breakpoint ? `(${breakpoint}) ${size}` : size
    )
    .join(', ');
}

/**
 * Get optimized image URL from Supabase Storage
 * 
 * @param path - Image path in storage
 * @param options - Optimization options
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  path: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): string {
  const { width, height, quality = 85, format = 'webp' } = options;

  // Supabase Storage transformation URL
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${path}`;

  const params = new URLSearchParams();
  if (width) params.append('width', width.toString());
  if (height) params.append('height', height.toString());
  params.append('quality', quality.toString());
  params.append('format', format);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate blur placeholder data URL
 * 
 * @param width - Placeholder width
 * @param height - Placeholder height
 * @param color - Placeholder color
 * @returns Data URL for blur placeholder
 */
export function generateBlurPlaceholder(
  width: number = 10,
  height: number = 10,
  color: string = '#e5e7eb'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
}

/**
 * Preload critical images
 * 
 * @param urls - Array of image URLs to preload
 */
export function preloadImages(urls: string[]): void {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Calculate optimal image dimensions
 * Maintains aspect ratio while fitting within max dimensions
 * 
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @returns Optimal dimensions
 */
export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  // Scale down if larger than max dimensions
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Detect WebP support
 * 
 * @returns Promise<boolean> - true if WebP is supported
 */
export async function supportsWebP(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Check if already cached
  const cached = sessionStorage.getItem('webp-support');
  if (cached !== null) {
    return cached === 'true';
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const supported = img.width > 0 && img.height > 0;
      sessionStorage.setItem('webp-support', String(supported));
      resolve(supported);
    };
    img.onerror = () => {
      sessionStorage.setItem('webp-support', 'false');
      resolve(false);
    };
    img.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  });
}

/**
 * Get image format based on browser support
 * 
 * @returns Promise<'webp' | 'jpeg'> - Optimal format
 */
export async function getOptimalImageFormat(): Promise<'webp' | 'jpeg'> {
  const webpSupported = await supportsWebP();
  return webpSupported ? 'webp' : 'jpeg';
}

/**
 * Image loading priority
 */
export type ImagePriority = 'high' | 'low' | 'auto';

/**
 * Get loading attribute based on priority
 * 
 * @param priority - Image priority
 * @returns Loading attribute value
 */
export function getLoadingAttribute(priority: ImagePriority): 'eager' | 'lazy' {
  return priority === 'high' ? 'eager' : 'lazy';
}

/**
 * Get fetchpriority attribute based on priority
 * 
 * @param priority - Image priority
 * @returns Fetchpriority attribute value
 */
export function getFetchPriority(priority: ImagePriority): 'high' | 'low' | 'auto' {
  return priority;
}

/**
 * Responsive image configuration
 */
export interface ResponsiveImageConfig {
  src: string;
  alt: string;
  sizes?: string;
  priority?: ImagePriority;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  className?: string;
}

/**
 * Generate responsive image props
 * 
 * @param config - Image configuration
 * @returns Props for img element
 */
export function getResponsiveImageProps(config: ResponsiveImageConfig): React.ImgHTMLAttributes<HTMLImageElement> {
  const {
    src,
    alt,
    sizes = '100vw',
    priority = 'auto',
    placeholder = 'empty',
    blurDataURL,
    className,
  } = config;

  const props: React.ImgHTMLAttributes<HTMLImageElement> = {
    src,
    alt,
    className,
    loading: getLoadingAttribute(priority),
    // @ts-expect-error - fetchpriority is not in React types yet
    fetchpriority: getFetchPriority(priority),
  };

  // Add srcset for responsive images
  if (src.includes('supabase')) {
    props.srcSet = generateSrcSet(src);
    props.sizes = sizes;
  }

  // Add blur placeholder
  if (placeholder === 'blur' && blurDataURL) {
    props.style = {
      ...props.style,
      backgroundImage: `url(${blurDataURL})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  return props;
}

/**
 * Image optimization recommendations
 */
export const IMAGE_OPTIMIZATION_TIPS = {
  formats: {
    webp: 'Use WebP format for 25-35% smaller file sizes',
    avif: 'Use AVIF format for even better compression (when supported)',
    jpeg: 'Use JPEG for photos with quality 80-85',
    png: 'Use PNG only for images requiring transparency',
  },
  
  sizing: {
    responsive: 'Always provide srcset and sizes for responsive images',
    dimensions: 'Specify width and height to prevent layout shift',
    maxSize: 'Limit maximum image size to 2048px for web',
  },

  loading: {
    lazy: 'Use lazy loading for images below the fold',
    eager: 'Use eager loading only for above-the-fold images',
    preload: 'Preload critical images (hero, logo)',
  },

  optimization: {
    compression: 'Compress images to reduce file size',
    metadata: 'Remove EXIF metadata to reduce file size',
    cdn: 'Use CDN for faster image delivery',
  },
} as const;
