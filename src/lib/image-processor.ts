/**
 * Image Processing Service
 * 
 * Provides image processing capabilities including:
 * - EXIF metadata removal (privacy protection)
 * - Image optimization (compression, resizing)
 * - Format conversion
 * - Validation
 * 
 * Uses Sharp library for high-performance image processing.
 * 
 * @example
 * ```typescript
 * import { removeExifData, processImage } from '@/lib/image-processor';
 * 
 * // Remove EXIF data from image
 * const cleanImage = await removeExifData(imageBuffer);
 * 
 * // Process and optimize image
 * const optimized = await processImage(imageBuffer, {
 *   maxWidth: 1920,
 *   quality: 85
 * });
 * ```
 */

import sharp from 'sharp';
import { logInfo, logError, logWarn } from './logger';

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  /** Maximum width in pixels (maintains aspect ratio) */
  maxWidth?: number;
  /** Maximum height in pixels (maintains aspect ratio) */
  maxHeight?: number;
  /** JPEG/WebP quality (1-100) */
  quality?: number;
  /** Output format */
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  /** Remove EXIF metadata */
  removeExif?: boolean;
  /** Enable progressive rendering */
  progressive?: boolean;
}

/**
 * Image metadata (safe subset without sensitive data)
 */
export interface SafeImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
}

/**
 * Default processing options
 */
const DEFAULT_OPTIONS: ImageProcessingOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 85,
  format: 'jpeg',
  removeExif: true,
  progressive: true,
};

/**
 * Maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed image formats
 */
const ALLOWED_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif'];

/**
 * Remove EXIF metadata from image
 * 
 * EXIF data can contain sensitive information:
 * - GPS coordinates (location where photo was taken)
 * - Camera make and model
 * - Date and time
 * - Software used
 * - Copyright information
 * 
 * @param imageBuffer - Image buffer
 * @returns Image buffer without EXIF data
 * 
 * @example
 * ```typescript
 * const imageFile = await fetch('/image.jpg').then(r => r.arrayBuffer());
 * const cleanImage = await removeExifData(Buffer.from(imageFile));
 * ```
 */
export async function removeExifData(imageBuffer: Buffer): Promise<Buffer> {
  try {
    logInfo('Removing EXIF data from image', { size: imageBuffer.length }, 'image-processor');

    // Process image and strip all metadata
    const processed = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF orientation, then remove EXIF
      .withMetadata({
        // Remove all EXIF, ICC, XMP, and IPTC metadata
        exif: {},
        icc: undefined,
        xmp: undefined,
        iptc: undefined,
      })
      .toBuffer();

    logInfo('EXIF data removed successfully', 
      { originalSize: imageBuffer.length, newSize: processed.length }, 
      'image-processor');

    return processed;
  } catch (error) {
    logError('Failed to remove EXIF data', error, 'image-processor');
    throw new Error(`Failed to remove EXIF data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process and optimize image
 * 
 * @param imageBuffer - Image buffer
 * @param options - Processing options
 * @returns Processed image buffer
 * 
 * @example
 * ```typescript
 * const optimized = await processImage(imageBuffer, {
 *   maxWidth: 1200,
 *   quality: 80,
 *   format: 'webp',
 *   removeExif: true
 * });
 * ```
 */
export async function processImage(
  imageBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<Buffer> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    logInfo('Processing image', { 
      size: imageBuffer.length, 
      options: opts 
    }, 'image-processor');

    // Validate file size
    if (imageBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`Image too large: ${imageBuffer.length} bytes (max: ${MAX_FILE_SIZE})`);
    }

    // Create sharp instance
    let pipeline = sharp(imageBuffer);

    // Get metadata
    const metadata = await pipeline.metadata();

    // Validate format
    if (metadata.format && !ALLOWED_FORMATS.includes(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }

    // Auto-rotate based on EXIF orientation
    pipeline = pipeline.rotate();

    // Resize if needed
    if (opts.maxWidth || opts.maxHeight) {
      pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Remove EXIF if requested
    if (opts.removeExif) {
      pipeline = pipeline.withMetadata({
        exif: {},
        icc: undefined,
        xmp: undefined,
        iptc: undefined,
      });
    }

    // Convert format and optimize
    switch (opts.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality: opts.quality,
          progressive: opts.progressive,
          mozjpeg: true, // Use mozjpeg for better compression
        });
        break;

      case 'png':
        pipeline = pipeline.png({
          compressionLevel: 9,
          progressive: opts.progressive,
        });
        break;

      case 'webp':
        pipeline = pipeline.webp({
          quality: opts.quality,
        });
        break;

      case 'avif':
        pipeline = pipeline.avif({
          quality: opts.quality,
        });
        break;
    }

    // Process image
    const processed = await pipeline.toBuffer();

    logInfo('Image processed successfully', {
      originalSize: imageBuffer.length,
      newSize: processed.length,
      reduction: `${((1 - processed.length / imageBuffer.length) * 100).toFixed(1)}%`,
      format: opts.format,
    }, 'image-processor');

    return processed;
  } catch (error) {
    logError('Failed to process image', error, 'image-processor');
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get safe image metadata (without sensitive EXIF data)
 * 
 * @param imageBuffer - Image buffer
 * @returns Safe metadata
 * 
 * @example
 * ```typescript
 * const metadata = await getSafeMetadata(imageBuffer);
 * console.log(`Image: ${metadata.width}x${metadata.height} ${metadata.format}`);
 * ```
 */
export async function getSafeMetadata(imageBuffer: Buffer): Promise<SafeImageMetadata> {
  try {
    const metadata = await sharp(imageBuffer).metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: imageBuffer.length,
      hasAlpha: metadata.hasAlpha || false,
    };
  } catch (error) {
    logError('Failed to get image metadata', error, 'image-processor');
    throw new Error(`Failed to get metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate image file
 * 
 * @param imageBuffer - Image buffer
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const validation = await validateImage(imageBuffer);
 * if (!validation.valid) {
 *   console.error(validation.error);
 * }
 * ```
 */
export async function validateImage(imageBuffer: Buffer): Promise<{
  valid: boolean;
  error?: string;
  metadata?: SafeImageMetadata;
}> {
  try {
    // Check file size
    if (imageBuffer.length > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Image too large: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB (max: ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      };
    }

    // Check if it's a valid image
    const metadata = await getSafeMetadata(imageBuffer);

    // Check format
    if (!ALLOWED_FORMATS.includes(metadata.format)) {
      return {
        valid: false,
        error: `Unsupported format: ${metadata.format}`,
      };
    }

    // Check dimensions
    if (metadata.width === 0 || metadata.height === 0) {
      return {
        valid: false,
        error: 'Invalid image dimensions',
      };
    }

    // Check if dimensions are reasonable
    const maxDimension = 10000; // 10k pixels
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      return {
        valid: false,
        error: `Image dimensions too large: ${metadata.width}x${metadata.height} (max: ${maxDimension}x${maxDimension})`,
      };
    }

    return {
      valid: true,
      metadata,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create thumbnail from image
 * 
 * @param imageBuffer - Image buffer
 * @param size - Thumbnail size (width and height)
 * @returns Thumbnail buffer
 * 
 * @example
 * ```typescript
 * const thumbnail = await createThumbnail(imageBuffer, 200);
 * ```
 */
export async function createThumbnail(
  imageBuffer: Buffer,
  size: number = 200
): Promise<Buffer> {
  try {
    logInfo('Creating thumbnail', { size }, 'image-processor');

    const thumbnail = await sharp(imageBuffer)
      .rotate()
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      })
      .withMetadata({
        exif: {},
        icc: undefined,
        xmp: undefined,
        iptc: undefined,
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer();

    logInfo('Thumbnail created', {
      originalSize: imageBuffer.length,
      thumbnailSize: thumbnail.length,
    }, 'image-processor');

    return thumbnail;
  } catch (error) {
    logError('Failed to create thumbnail', error, 'image-processor');
    throw new Error(`Failed to create thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert image to WebP format
 * WebP provides better compression than JPEG/PNG
 * 
 * @param imageBuffer - Image buffer
 * @param quality - Quality (1-100)
 * @returns WebP image buffer
 * 
 * @example
 * ```typescript
 * const webp = await convertToWebP(imageBuffer, 85);
 * ```
 */
export async function convertToWebP(
  imageBuffer: Buffer,
  quality: number = 85
): Promise<Buffer> {
  return processImage(imageBuffer, {
    format: 'webp',
    quality,
    removeExif: true,
  });
}

/**
 * Batch process multiple images
 * 
 * @param images - Array of image buffers
 * @param options - Processing options
 * @returns Array of processed images
 * 
 * @example
 * ```typescript
 * const processed = await batchProcessImages(imageBuffers, {
 *   maxWidth: 1200,
 *   quality: 80
 * });
 * ```
 */
export async function batchProcessImages(
  images: Buffer[],
  options: ImageProcessingOptions = {}
): Promise<Buffer[]> {
  logInfo('Batch processing images', { count: images.length }, 'image-processor');

  const results = await Promise.allSettled(
    images.map(img => processImage(img, options))
  );

  const processed: Buffer[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      processed.push(result.value);
    } else {
      errors.push(`Image ${index}: ${result.reason}`);
      logWarn(`Failed to process image ${index}`, result.reason, 'image-processor');
    }
  });

  if (errors.length > 0) {
    logWarn('Some images failed to process', { errors }, 'image-processor');
  }

  logInfo('Batch processing completed', {
    total: images.length,
    successful: processed.length,
    failed: errors.length,
  }, 'image-processor');

  return processed;
}
