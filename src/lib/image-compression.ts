// @ts-nocheck
/**
 * Image Compression Utilities
 * Requirements: 18.1-18.15
 * Task: 25.2 Otimizar operações de arquivo
 */

import imageCompression from 'browser-image-compression';

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1, // 1MB
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  quality: 0.8,
};

/**
 * Compress an image file before upload
 * Requirements: 18.6, 18.7
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Only compress images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip compression for small files (< 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  try {
    const compressedFile = await imageCompression(file, {
      ...DEFAULT_OPTIONS,
      ...options,
    });

    console.log(
      `Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(
        compressedFile.size /
        1024 /
        1024
      ).toFixed(2)}MB`
    );

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}

/**
 * Compress multiple images
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (index: number, total: number) => void
): Promise<File[]> {
  const compressed: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const compressedFile = await compressImage(file, options);
    compressed.push(compressedFile);

    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return compressed;
}

/**
 * Generate thumbnail from image
 * Requirements: 18.8
 */
export async function generateThumbnail(
  file: File,
  maxSize: number = 300
): Promise<File | null> {
  if (!file.type.startsWith('image/')) {
    return null;
  }

  try {
    const thumbnail = await imageCompression(file, {
      maxSizeMB: 0.1,
      maxWidthOrHeight: maxSize,
      useWebWorker: true,
      quality: 0.7,
    });

    return thumbnail;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
}
