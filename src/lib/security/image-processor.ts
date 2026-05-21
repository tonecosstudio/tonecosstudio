/**
 * Image Processing and Security Service
 *
 * Handles image uploads with security features:
 * - EXIF metadata removal
 * - Image validation
 * - Compression and optimization
 * - Malware detection (basic)
 *
 * Uses sharp library for image processing
 */

import { ValidationError, ErrorCategory, errorTracking } from '@/lib/error-tracking';
import { validateFileUpload, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from './input-sanitizer';

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  removeMetadata?: boolean;
}

/**
 * Default image processing options
 */
const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 85,
  format: 'webp',
  removeMetadata: true
};

const SHARP_MODULE = 'sharp';

/**
 * Validate image file before processing
 *
 * @param file - Image file to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  return validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
}

/**
 * Check if file might contain malware (basic checks)
 *
 * This is a basic check. For production, integrate with a proper
 * malware scanning service like ClamAV.
 *
 * @param file - File to check
 * @returns true if file appears suspicious
 */
export async function detectPotentialMalware(file: File): Promise<boolean> {
  try {
    // Check 1: File size anomalies
    if (file.size === 0) {
      errorTracking.log('Empty file detected', 'warning', { filename: file.name });
      return true;
    }

    // Check 2: Read file header (magic bytes)
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Valid image magic bytes
    const validHeaders = {
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46] // RIFF
    };

    // Check if file starts with valid image header
    const hasValidHeader = Object.values(validHeaders).some(header => {
      return header.every((byte, index) => bytes[index] === byte);
    });

    if (!hasValidHeader) {
      errorTracking.log(
        'Invalid image header detected',
        'warning',
        { filename: file.name, header: Array.from(bytes.slice(0, 4)) }
      );
      return true;
    }

    // Check 3: Look for suspicious patterns in filename
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.sh$/i,
      /\.php$/i,
      /\.asp$/i,
      /\.jsp$/i,
      /\.js$/i,
      /\.vbs$/i,
      /\.scr$/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errorTracking.log(
        'Suspicious filename pattern detected',
        'warning',
        { filename: file.name }
      );
      return true;
    }

    return false;
  } catch (error) {
    errorTracking.trackError(
      new ValidationError(
        'Error during malware detection',
        ErrorCategory.VALIDATION,
        { error, filename: file.name }
      )
    );
    // Fail safe: reject file if we can't scan it
    return true;
  }
}

/**
 * Process image: remove EXIF, resize, compress
 *
 * Note: This function requires sharp library to be installed.
 * For browser-side processing, use browser-image-compression instead.
 *
 * @param file - Image file to process
 * @param options - Processing options
 * @returns Processed image as Blob
 */
export async function processImage(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<Blob> {
  // Merge with defaults
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new ValidationError(
      validation.error || 'Invalid image file',
      ErrorCategory.VALIDATION,
      { filename: file.name },
      validation.error
    );
  }

  // Check for malware
  const isSuspicious = await detectPotentialMalware(file);
  if (isSuspicious) {
    throw new ValidationError(
      'Potentially malicious file detected',
      ErrorCategory.VALIDATION,
      { filename: file.name },
      'Arquivo suspeito detectado. Por favor, use uma imagem válida.'
    );
  }

  try {
    // For browser-side processing, use browser-image-compression
    // This is a placeholder - actual implementation depends on environment

    // In browser environment:
    if (typeof window !== 'undefined') {
      return await procesImageInBrowser(file, opts);
    }

    // In Node.js environment (Edge Functions):
    return await processImageInNode(file, opts);
  } catch (error) {
    errorTracking.trackError(
      new ValidationError(
        'Failed to process image',
        ErrorCategory.VALIDATION,
        { error, filename: file.name }
      )
    );
    throw new ValidationError(
      'Failed to process image',
      ErrorCategory.VALIDATION,
      { error },
      'Erro ao processar imagem. Tente novamente.'
    );
  }
}

/**
 * Process image in browser using browser-image-compression
 *
 * @param file - Image file
 * @param options - Processing options
 * @returns Processed image blob
 */
async function procesImageInBrowser(
  file: File,
  options: Required<ImageProcessingOptions>
): Promise<Blob> {
  // Dynamic import to avoid bundling if not used
  const imageCompression = (await import('browser-image-compression')).default;

  const compressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: Math.max(options.maxWidth, options.maxHeight),
    useWebWorker: true,
    fileType: `image/${options.format}`,
    initialQuality: options.quality / 100,
    // Remove EXIF data
    exifOrientation: undefined
  };

  const compressed = await imageCompression(file, compressionOptions);

  // Additional EXIF removal (browser-image-compression should handle this)
  // but we double-check
  if (options.removeMetadata) {
    return await removeEXIFData(compressed);
  }

  return compressed;
}

/**
 * Process image in Node.js using sharp
 *
 * @param file - Image file
 * @param options - Processing options
 * @returns Processed image blob
 */
async function processImageInNode(
  file: File,
  options: Required<ImageProcessingOptions>
): Promise<Blob> {
  // This would be used in Supabase Edge Functions
  // Dynamic import sharp
  const sharp = (await import(/* @vite-ignore */ SHARP_MODULE)).default;

  const buffer = await file.arrayBuffer();

  let pipeline = sharp(Buffer.from(buffer));

  // Remove metadata (including EXIF)
  if (options.removeMetadata) {
    pipeline = pipeline.rotate(); // Auto-rotate based on EXIF
    pipeline = pipeline.withMetadata({
      exif: {},
      icc: undefined,
      iptc: undefined,
      xmp: undefined
    });
  }

  // Resize if needed
  pipeline = pipeline.resize({
    width: options.maxWidth,
    height: options.maxHeight,
    fit: 'inside',
    withoutEnlargement: true
  });

  // Convert format and compress
  switch (options.format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: options.quality });
      break;
    case 'png':
      pipeline = pipeline.png({ quality: options.quality });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: options.quality });
      break;
  }

  const processed = await pipeline.toBuffer();
  return new Blob([processed], { type: `image/${options.format}` });
}

/**
 * Remove EXIF data from image blob
 *
 * @param blob - Image blob
 * @returns Blob without EXIF data
 */
async function removeEXIFData(blob: Blob): Promise<Blob> {
  // For JPEG images, EXIF data is in APP1 marker
  // This is a simplified implementation

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Check if JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    // Find and remove EXIF marker (0xFFE1)
    let i = 2;
    const newBytes: number[] = [0xFF, 0xD8]; // Start with SOI marker

    while (i < bytes.length - 1) {
      if (bytes[i] === 0xFF) {
        const marker = bytes[i + 1];

        // Skip EXIF marker (APP1)
        if (marker === 0xE1) {
          const length = (bytes[i + 2] << 8) | bytes[i + 3];
          i += length + 2;
          continue;
        }

        // Copy other markers
        newBytes.push(bytes[i], bytes[i + 1]);

        // If marker has length, copy it
        if (marker >= 0xC0 && marker <= 0xFE && marker !== 0xD8 && marker !== 0xD9) {
          const length = (bytes[i + 2] << 8) | bytes[i + 3];
          for (let j = 0; j < length; j++) {
            newBytes.push(bytes[i + 2 + j]);
          }
          i += length + 2;
        } else {
          i += 2;
        }
      } else {
        newBytes.push(bytes[i]);
        i++;
      }
    }

    return new Blob([new Uint8Array(newBytes)], { type: blob.type });
  }

  // For non-JPEG, return as-is (PNG, WebP handle metadata differently)
  return blob;
}

/**
 * Generate thumbnail from image
 *
 * @param file - Original image file
 * @param size - Thumbnail size (width and height)
 * @returns Thumbnail blob
 */
export async function generateThumbnail(
  file: File,
  size: number = 200
): Promise<Blob> {
  return processImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 80,
    format: 'webp',
    removeMetadata: true
  });
}

/**
 * Validate image dimensions
 *
 * @param file - Image file
 * @param minWidth - Minimum width
 * @param minHeight - Minimum height
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @returns Validation result with dimensions
 */
export async function validateImageDimensions(
  file: File,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<{ valid: boolean; width: number; height: number; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;

      if (minWidth && width < minWidth) {
        resolve({
          valid: false,
          width,
          height,
          error: `Largura mínima: ${minWidth}px (atual: ${width}px)`
        });
        return;
      }

      if (minHeight && height < minHeight) {
        resolve({
          valid: false,
          width,
          height,
          error: `Altura mínima: ${minHeight}px (atual: ${height}px)`
        });
        return;
      }

      if (maxWidth && width > maxWidth) {
        resolve({
          valid: false,
          width,
          height,
          error: `Largura máxima: ${maxWidth}px (atual: ${width}px)`
        });
        return;
      }

      if (maxHeight && height > maxHeight) {
        resolve({
          valid: false,
          width,
          height,
          error: `Altura máxima: ${maxHeight}px (atual: ${height}px)`
        });
        return;
      }

      resolve({ valid: true, width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        width: 0,
        height: 0,
        error: 'Não foi possível carregar a imagem'
      });
    };

    img.src = url;
  });
}
