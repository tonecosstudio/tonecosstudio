import {
  ErrorSeverity,
  ValidationError,
  errorTracking,
} from "@/lib/error-tracking";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  validateFileUpload,
} from "./input-sanitizer";

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
  removeMetadata?: boolean;
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 85,
  format: "webp",
  removeMetadata: true,
};

const IMAGE_MAGIC_HEADERS = [
  [0xff, 0xd8, 0xff], // JPEG
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0x47, 0x49, 0x46], // GIF
] as const;

function hasValidWebpHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  return (
    riff.every((byte, index) => bytes[index] === byte) &&
    webp.every((byte, index) => bytes[index + 8] === byte)
  );
}

function hasKnownImageHeader(bytes: Uint8Array): boolean {
  return (
    IMAGE_MAGIC_HEADERS.some((header) =>
      header.every((byte, index) => bytes[index] === byte),
    ) || hasValidWebpHeader(bytes)
  );
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  return validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
}

/**
 * Client-side prefilter only. The canonical upload path still performs the
 * server-side secure-upload scanner; browser checks are defense in depth.
 */
export async function detectPotentialMalware(file: File): Promise<boolean> {
  try {
    if (file.size === 0) {
      errorTracking.log("Empty file detected", ErrorSeverity.WARNING, {
        filename: file.name,
      });
      return true;
    }

    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!hasKnownImageHeader(bytes)) {
      errorTracking.log("Invalid image header detected", ErrorSeverity.WARNING, {
        filename: file.name,
        header: Array.from(bytes.slice(0, 12)),
      });
      return true;
    }

    if (/\.(?:exe|bat|cmd|sh|php|asp|jsp|js|vbs|scr)$/i.test(file.name)) {
      errorTracking.log("Suspicious filename pattern detected", ErrorSeverity.WARNING, {
        filename: file.name,
      });
      return true;
    }

    return false;
  } catch (error) {
    errorTracking.trackError(
      new ValidationError("Error during malware detection", {
        error,
        filename: file.name,
      }),
    );
    return true;
  }
}

/**
 * Reencodes the image in the browser. Reencoding with preserveExif=false
 * strips EXIF metadata and avoids shipping Node-native `sharp` to the SPA.
 */
export async function processImage(
  file: File,
  options: ImageProcessingOptions = {},
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new ValidationError(
      validation.error || "Invalid image file",
      { filename: file.name },
      validation.error,
    );
  }

  if (await detectPotentialMalware(file)) {
    throw new ValidationError(
      "Potentially malicious file detected",
      { filename: file.name },
      "Arquivo suspeito detectado. Por favor, use uma imagem válida.",
    );
  }

  try {
    const imageCompression = (await import("browser-image-compression")).default;
    const maxDimension = Math.max(opts.maxWidth, opts.maxHeight);

    return await imageCompression(file, {
      maxSizeMB: Math.min(1, MAX_IMAGE_SIZE / (1024 * 1024)),
      maxWidthOrHeight: maxDimension,
      useWebWorker: true,
      fileType: `image/${opts.format}`,
      initialQuality: Math.min(1, Math.max(0.01, opts.quality / 100)),
      preserveExif: !opts.removeMetadata,
    });
  } catch (error) {
    errorTracking.trackError(
      new ValidationError("Failed to process image", {
        error,
        filename: file.name,
      }),
    );
    throw new ValidationError(
      "Failed to process image",
      { error },
      "Erro ao processar imagem. Tente novamente.",
    );
  }
}

export async function generateThumbnail(
  file: File,
  size: number = 200,
): Promise<Blob> {
  if (!Number.isFinite(size) || size <= 0 || size > 4096) {
    throw new ValidationError("Invalid thumbnail size", { size });
  }

  return processImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 80,
    format: "webp",
    removeMetadata: true,
  });
}

export async function validateImageDimensions(
  file: File,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number,
): Promise<{ valid: boolean; width: number; height: number; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const finish = (
      result: { valid: boolean; width: number; height: number; error?: string },
    ) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };

    img.onload = () => {
      const { width, height } = img;

      if (minWidth && width < minWidth) {
        finish({
          valid: false,
          width,
          height,
          error: `Largura mínima: ${minWidth}px (atual: ${width}px)`,
        });
        return;
      }
      if (minHeight && height < minHeight) {
        finish({
          valid: false,
          width,
          height,
          error: `Altura mínima: ${minHeight}px (atual: ${height}px)`,
        });
        return;
      }
      if (maxWidth && width > maxWidth) {
        finish({
          valid: false,
          width,
          height,
          error: `Largura máxima: ${maxWidth}px (atual: ${width}px)`,
        });
        return;
      }
      if (maxHeight && height > maxHeight) {
        finish({
          valid: false,
          width,
          height,
          error: `Altura máxima: ${maxHeight}px (atual: ${height}px)`,
        });
        return;
      }

      finish({ valid: true, width, height });
    };

    img.onerror = () =>
      finish({
        valid: false,
        width: 0,
        height: 0,
        error: "Não foi possível carregar a imagem",
      });

    img.src = url;
  });
}
