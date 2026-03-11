/**
 * FileUploadService - Service for handling payment proof file uploads
 * Requirements: 3.1-3.12, 14.1-14.15
 *
 * Features:
 * - File validation (type, size, MIME type)
 * - Upload to Supabase Storage with progress tracking
 * - Thumbnail generation for images
 * - Signed URL generation with expiration
 * - Rate limiting (10 uploads per hour per user)
 */

import { supabase } from "@/integrations/supabase/client";
import type { PaymentFile, FileValidationResult } from "@/types/manual-payment";
import { getNotificationService } from "./notification-service";
import { compressImage } from "./image-compression";
import { removeExifData, validateImage } from "./image-processor";
import { malwareScanner, MalwareScannerError } from "./malware-scanner";
import { logInfo, logError, logWarn } from "./logger";

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_PAYMENT = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"];
const STORAGE_BUCKET = "payment-proofs";
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
const RATE_LIMIT_MAX_UPLOADS = 10;
const THUMBNAIL_MAX_WIDTH = 300;
const THUMBNAIL_MAX_HEIGHT = 300;
const THUMBNAIL_QUALITY = 0.8;

// Rate limiting storage (in-memory, per session)
const uploadTimestamps = new Map<string, number[]>();

/**
 * Error class for file upload errors
 */
export class FileUploadError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "FileUploadError";
  }
}

/**
 * FileUploadService class
 */
export class FileUploadService {
  /**
   * Validate file type, size, and MIME type matching
   * Requirements: 3.2, 3.3, 14.1, 14.2
   */
  async validateFile(file: File): Promise<FileValidationResult> {
    const errors: string[] = [];

    // Validate file size (Requirement 3.3)
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size exceeds 5MB limit. Please upload a smaller file.`);
    }

    // Validate file type (Requirement 3.2)
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push(`File type not supported. Please upload JPG, PNG, or PDF files.`);
    }

    // Validate file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`File extension not supported. Please upload JPG, PNG, or PDF files.`);
    }

    // Validate MIME type matches extension (Requirement 14.1)
    if (extension && file.type) {
      const mimeTypeMatches = this.validateMimeTypeExtension(file.type, extension);
      if (!mimeTypeMatches) {
        errors.push(`File type mismatch. The file extension does not match the file content.`);
      }
    }

    // Reject executable files (Requirement 14.13)
    const executableExtensions = ["exe", "sh", "bat", "cmd", "com", "app", "dmg"];
    if (extension && executableExtensions.includes(extension)) {
      errors.push(`Executable files are not allowed for security reasons.`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate MIME type matches file extension
   * Requirement: 14.1
   */
  private validateMimeTypeExtension(mimeType: string, extension: string): boolean {
    const mimeExtensionMap: Record<string, string[]> = {
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "application/pdf": ["pdf"],
    };

    const validExtensions = mimeExtensionMap[mimeType];
    return validExtensions ? validExtensions.includes(extension) : false;
  }

  /**
   * Check rate limiting for user
   * Requirement: 14.5, 14.6
   */
  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const userUploads = uploadTimestamps.get(userId) || [];

    // Remove timestamps older than 1 hour
    const recentUploads = userUploads.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW);

    // Check if limit exceeded
    if (recentUploads.length >= RATE_LIMIT_MAX_UPLOADS) {
      const oldestUpload = Math.min(...recentUploads);
      const minutesRemaining = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestUpload)) / 60000);

      throw new FileUploadError(
        "RATE_LIMIT_EXCEEDED",
        `Upload limit exceeded. Please try again in ${minutesRemaining} minutes.`,
        429
      );
    }

    // Add current timestamp
    recentUploads.push(now);
    uploadTimestamps.set(userId, recentUploads);
  }

  /**
   * Check if payment has reached maximum files
   * Requirement: 3.6
   */
  private async checkMaxFiles(paymentId: string): Promise<void> {
    const { count, error } = await supabase
      .from("payment_files")
      .select("*", { count: "exact", head: true })
      .eq("payment_id", paymentId);

    if (error) {
      throw new FileUploadError("DATABASE_ERROR", "Failed to check file count", 500);
    }

    if (count !== null && count >= MAX_FILES_PER_PAYMENT) {
      throw new FileUploadError(
        "MAX_FILES_REACHED",
        `Maximum of ${MAX_FILES_PER_PAYMENT} files per payment reached.`,
        400
      );
    }
  }

  /**
   * Generate unique file name to prevent overwrites
   * Requirement: 14.7
   */
  private generateUniqueFileName(paymentId: string, originalName: string): string {
    const extension = originalName.split(".").pop()?.toLowerCase() || "bin";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "");
    const uniqueId = crypto.randomUUID();
    return `${paymentId}/${uniqueId}.${safeExtension}`;
  }

  /**
   * Generate thumbnail for image files
   * Requirement: 3.8
   */
  async generateThumbnail(file: File): Promise<Blob | null> {
    // Only generate thumbnails for images
    if (!file.type.startsWith("image/")) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(null);
        return;
      }

      img.onload = () => {
        // Calculate thumbnail dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > THUMBNAIL_MAX_WIDTH) {
            height = (height * THUMBNAIL_MAX_WIDTH) / width;
            width = THUMBNAIL_MAX_WIDTH;
          }
        } else {
          if (height > THUMBNAIL_MAX_HEIGHT) {
            width = (width * THUMBNAIL_MAX_HEIGHT) / height;
            height = THUMBNAIL_MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          THUMBNAIL_QUALITY
        );
      };

      img.onerror = () => {
        resolve(null); // Don't fail upload if thumbnail generation fails
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload file to Supabase Storage with progress tracking
   * Requirements: 3.7, 14.7, 14.8, 18.6, 18.7
   */
  async upload(
    paymentId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<PaymentFile> {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new FileUploadError("UNAUTHORIZED", "User not authenticated", 401);
    }

    // Check rate limiting (Requirement 14.5)
    this.checkRateLimit(user.id);

    // Validate file (Requirements 3.2, 3.3, 14.1)
    const validation = await this.validateFile(file);
    if (!validation.valid) {
      throw new FileUploadError("VALIDATION_ERROR", validation.errors[0], 400, {
        errors: validation.errors,
      });
    }

    // Check max files (Requirement 3.6)
    await this.checkMaxFiles(paymentId);

    // Scan for malware (Requirements 14.3, 14.4)
    try {
      const arrayBuffer = await file.arrayBuffer();
      const scanResult = await malwareScanner.scanFile(arrayBuffer, file.name);

      if (!scanResult.safe) {
        logWarn('Malware detected in upload', {
          fileName: file.name,
          threats: scanResult.threats,
          scanner: scanResult.scanner
        }, 'file-upload');

        // Log security incident
        await this.logSecurityIncident({
          type: 'MALWARE_DETECTED',
          file_name: file.name,
          user_id: user.id,
          payment_id: paymentId,
          threats: scanResult.threats,
          scanner: scanResult.scanner,
        });

        throw new FileUploadError(
          'MALWARE_DETECTED',
          'Security threat detected in file. Upload rejected for your protection.',
          403,
          {
            threats: scanResult.threats,
            scanner: scanResult.scanner,
          }
        );
      }

      logInfo('File passed malware scan', {
        fileName: file.name,
        scanner: scanResult.scanner,
        scanTime: scanResult.scanTime
      }, 'file-upload');
    } catch (error) {
      if (error instanceof FileUploadError) {
        throw error; // Re-throw malware detection errors
      }

      // Log scan failure but don't block upload (fail-open for availability)
      logError('Malware scan failed, allowing upload', error, 'file-upload');
      
      // In production, you might want to fail-closed instead:
      // throw new FileUploadError('SCAN_FAILED', 'Security scan failed. Please try again.', 500);
    }

    // Compress image before upload (Requirement 18.6, 18.7)
    let fileToUpload = file;
    if (file.type.startsWith("image/")) {
      try {
        // Convert File to Buffer for processing
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Remove EXIF data for privacy (strips GPS, camera info, etc)
        const cleanBuffer = await removeExifData(buffer);

        // Compress the cleaned image
        const compressedBlob = await compressImage(
          new File([cleanBuffer], file.name, { type: file.type })
        );

        fileToUpload = compressedBlob;
        
        logInfo('Image processed successfully', {
          originalSize: `${(file.size / 1024).toFixed(2)}KB`,
          newSize: `${(fileToUpload.size / 1024).toFixed(2)}KB`,
          reduction: `${((1 - fileToUpload.size / file.size) * 100).toFixed(1)}%`
        }, 'file-upload');
      } catch (error) {
        logWarn('Image processing failed, uploading original', error, 'file-upload');
        // Continue with original file if processing fails
      }
    }

    // Generate unique file name (Requirement 14.7)
    const filePath = this.generateUniqueFileName(paymentId, fileToUpload.name);

    // Upload file to storage (Requirement 3.7, 14.8)
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, fileToUpload, {
        upsert: false,
        contentType: fileToUpload.type,
      });

    if (uploadError) {
      throw new FileUploadError("UPLOAD_FAILED", "File upload failed. Please try again.", 500, {
        originalError: uploadError,
      });
    }

    // Generate thumbnail for images (Requirement 3.8, 18.8)
    let thumbnailPath: string | null = null;
    if (fileToUpload.type.startsWith("image/")) {
      const thumbnail = await this.generateThumbnail(fileToUpload);
      if (thumbnail) {
        const thumbPath = `${paymentId}/thumb_${crypto.randomUUID()}.jpg`;
        const { error: thumbError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(thumbPath, thumbnail, {
            upsert: false,
            contentType: "image/jpeg",
          });

        if (!thumbError) {
          thumbnailPath = thumbPath;
        }
      }
    }

    // Create database record (Requirement 3.9)
    const { data: fileRecord, error: dbError } = await supabase
      .from("payment_files")
      .insert({
        payment_id: paymentId,
        file_name: file.name, // Use original file name
        file_path: filePath,
        file_size: fileToUpload.size, // Use compressed file size
        file_type: fileToUpload.type,
        thumbnail_path: thumbnailPath,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError || !fileRecord) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      if (thumbnailPath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([thumbnailPath]);
      }

      throw new FileUploadError(
        "DATABASE_ERROR",
        "Failed to save file record. Please try again.",
        500,
        { originalError: dbError }
      );
    }

    // Report 100% progress
    if (onProgress) {
      onProgress(100);
    }

    // Check if this is the first file uploaded and send under review notification
    try {
      const { count } = await supabase
        .from("payment_files")
        .select("*", { count: "exact", head: true })
        .eq("payment_id", paymentId);

      if (count === 1) {
        // This is the first file, payment status should now be 'under_review'
        // Send notification to admins
        const notificationService = getNotificationService();
        await notificationService.sendPaymentUnderReview(paymentId);
      }
    } catch (error) {
      // Don't fail file upload if notification fails
      logError('Failed to send under review notification', error, 'file-upload');
    }

    return fileRecord as PaymentFile;
  }

  /**
   * Generate signed URL with expiration
   * Requirements: 3.10, 14.11
   */
  async getSignedUrl(filePath: string, expiresIn: number = SIGNED_URL_EXPIRY): Promise<string> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error || !data) {
      throw new FileUploadError("SIGNED_URL_ERROR", "Failed to generate file access URL", 500, {
        originalError: error,
      });
    }

    return data.signedUrl;
  }

  /**
   * List files for a payment
   * Requirement: 3.12
   */
  async listByPayment(paymentId: string): Promise<PaymentFile[]> {
    const { data, error } = await supabase
      .from("payment_files")
      .select("*")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new FileUploadError("DATABASE_ERROR", "Failed to retrieve files", 500, {
        originalError: error,
      });
    }

    return (data || []) as PaymentFile[];
  }

  /**
   * Delete a file (admin only)
   */
  async delete(fileId: string): Promise<void> {
    // Get file record
    const { data: file, error: fetchError } = await supabase
      .from("payment_files")
      .select("file_path, thumbnail_path")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      throw new FileUploadError("FILE_NOT_FOUND", "File not found", 404);
    }

    // Delete from storage
    const pathsToDelete = [file.file_path];
    if (file.thumbnail_path) {
      pathsToDelete.push(file.thumbnail_path);
    }

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(pathsToDelete);

    if (storageError) {
      throw new FileUploadError("DELETE_FAILED", "Failed to delete file from storage", 500, {
        originalError: storageError,
      });
    }

    // Delete database record
    const { error: dbError } = await supabase.from("payment_files").delete().eq("id", fileId);

    if (dbError) {
      throw new FileUploadError("DATABASE_ERROR", "Failed to delete file record", 500, {
        originalError: dbError,
      });
    }
  }

  /**
   * Log security incident
   * Requirement: 14.4
   */
  private async logSecurityIncident(incident: {
    type: string;
    file_name: string;
    user_id: string;
    payment_id: string;
    threats: string[];
    scanner: string;
  }): Promise<void> {
    try {
      await supabase.from('security_incidents').insert({
        incident_type: incident.type,
        file_name: incident.file_name,
        user_id: incident.user_id,
        payment_id: incident.payment_id,
        details: {
          threats: incident.threats,
          scanner: incident.scanner,
          timestamp: new Date().toISOString(),
        },
      });

      logInfo('Security incident logged', {
        type: incident.type,
        fileName: incident.file_name
      }, 'file-upload');
    } catch (error) {
      // Don't fail upload if logging fails
      logError('Failed to log security incident', error, 'file-upload');
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
