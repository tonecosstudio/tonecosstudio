/**
 * Payment proof file service.
 *
 * Browser responsibilities are intentionally limited to UX validation, local preview helpers,
 * authenticated reads and admin deletion. The upload authority lives in the authenticated
 * `upload-payment-proof` Edge Function, which performs ownership, rate-limit, file-signature,
 * malware-scan, Storage checks and first-proof admin notification server-side.
 */

import { supabase } from "@/integrations/supabase/client";
import type { PaymentFile, FileValidationResult } from "@/types/manual-payment";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { requireAdmin } from "@/services/groups/group-permissions-service";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import {
  createStorageSignedUrl,
  removeStorageFiles,
} from "@/services/supabase/storage-client";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import { parsePaymentFileUploadResponse } from "@/services/payments/payment-file-upload-response";
import {
  ALLOWED_PAYMENT_PROOF_EXTENSIONS,
  ALLOWED_PAYMENT_PROOF_TYPES,
  MAX_PAYMENT_PROOF_SIZE,
} from "@/lib/security/input-sanitizer";

const STORAGE_BUCKET = "payment-proofs";
const SIGNED_URL_EXPIRY = 3600;
const THUMBNAIL_MAX_WIDTH = 300;
const THUMBNAIL_MAX_HEIGHT = 300;
const THUMBNAIL_QUALITY = 0.8;
const THUMBNAIL_LOAD_TIMEOUT_MS = 2000;

interface SignedUrlOptions {
  paymentId?: string;
  requireOwner?: boolean;
}

export class FileUploadError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "FileUploadError";
  }
}

export class FileUploadService {
  async validateFile(file: File): Promise<FileValidationResult> {
    const errors: string[] = [];

    if (file.size <= 0) {
      errors.push("File is empty. Please choose another file.");
    }

    if (file.size > MAX_PAYMENT_PROOF_SIZE) {
      errors.push("File size exceeds 5MB limit. Please upload a smaller file.");
    }

    if (!(ALLOWED_PAYMENT_PROOF_TYPES as readonly string[]).includes(file.type)) {
      errors.push("File type not supported. Please upload JPG, PNG, or PDF files.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (
      !extension ||
      !(ALLOWED_PAYMENT_PROOF_EXTENSIONS as readonly string[]).includes(extension)
    ) {
      errors.push("File extension not supported. Please upload JPG, PNG, or PDF files.");
    }

    if (extension && file.type && !this.validateMimeTypeExtension(file.type, extension)) {
      errors.push("File type mismatch. The file extension does not match the declared content type.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateMimeTypeExtension(mimeType: string, extension: string): boolean {
    const mimeExtensionMap: Record<string, string[]> = {
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "application/pdf": ["pdf"],
    };

    return mimeExtensionMap[mimeType]?.includes(extension) ?? false;
  }

  /**
   * Local preview helper only. Thumbnails are not trusted as uploaded proof content and the
   * canonical Edge upload currently stores the original private proof without a thumbnail.
   */
  async generateThumbnail(file: File): Promise<Blob | null> {
    if (!file.type.startsWith("image/")) {
      return null;
    }

    if (
      typeof Image === "undefined" ||
      typeof document === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const objectUrl = URL.createObjectURL(file);
      let settled = false;

      const finish = (thumbnail: Blob | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objectUrl);
        resolve(thumbnail);
      };

      const timeoutId = window.setTimeout(() => finish(null), THUMBNAIL_LOAD_TIMEOUT_MS);

      if (!ctx) {
        finish(null);
        return;
      }

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height && width > THUMBNAIL_MAX_WIDTH) {
          height = (height * THUMBNAIL_MAX_WIDTH) / width;
          width = THUMBNAIL_MAX_WIDTH;
        } else if (height >= width && height > THUMBNAIL_MAX_HEIGHT) {
          width = (width * THUMBNAIL_MAX_HEIGHT) / height;
          height = THUMBNAIL_MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => finish(blob), "image/jpeg", THUMBNAIL_QUALITY);
      };

      img.onerror = () => finish(null);
      img.src = objectUrl;
    });
  }

  private validateStoragePath(filePath: string): void {
    if (
      !filePath ||
      filePath.startsWith("/") ||
      filePath.includes("..") ||
      [...filePath].some((char) => {
        const code = char.charCodeAt(0);
        return code < 32 || code === 127;
      })
    ) {
      throw new FileUploadError("INVALID_FILE_PATH", "Invalid file path", 400);
    }
  }

  private async assertPaymentOwner(paymentId: string, userId: string): Promise<void> {
    const { data: payment, error } = await supabase
      .from("manual_payments")
      .select("user_id")
      .eq("id", paymentId)
      .single();

    if (error || !payment) {
      throw new FileUploadError("PAYMENT_NOT_FOUND", "Payment not found", 404);
    }

    if (payment.user_id !== userId) {
      throw new FileUploadError("FORBIDDEN", "Access denied for this payment", 403);
    }
  }

  async upload(
    paymentId: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<PaymentFile> {
    let userId: string;
    try {
      userId = await requireAuthenticatedUserId();
    } catch {
      throw new FileUploadError("UNAUTHORIZED", "User not authenticated", 401);
    }

    const validation = await this.validateFile(file);
    if (!validation.valid) {
      throw new FileUploadError("VALIDATION_ERROR", validation.errors[0], 400, {
        errors: validation.errors,
      });
    }

    onProgress?.(5);

    const formData = new FormData();
    formData.append("paymentId", paymentId);
    formData.append("file", file, file.name);

    let uploadResult: unknown;
    try {
      uploadResult = await callAuthenticatedEdgeFunction<unknown, FormData>(
        "upload-payment-proof",
        formData,
        "Payment proof upload failed",
      );
    } catch (error) {
      throw new FileUploadError(
        "UPLOAD_FAILED",
        error instanceof Error ? error.message : "Payment proof upload failed",
        503,
      );
    }

    let uploadedFile: PaymentFile;
    try {
      uploadedFile = parsePaymentFileUploadResponse(uploadResult, {
        paymentId,
        userId,
      });
    } catch (error) {
      throw new FileUploadError(
        "UPLOAD_FAILED",
        error instanceof Error
          ? error.message
          : "Payment proof upload did not return a valid file record",
        500,
      );
    }

    onProgress?.(100);
    return uploadedFile;
  }

  async getSignedUrl(
    filePath: string,
    expiresIn: number = SIGNED_URL_EXPIRY,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    this.validateStoragePath(filePath);

    if (options.requireOwner) {
      if (!options.paymentId) {
        throw new FileUploadError("PAYMENT_REQUIRED", "Payment ID is required", 400);
      }

      const userId = await requireAuthenticatedUserId();
      await this.assertPaymentOwner(options.paymentId, userId);
    }

    const { data, error } = await createStorageSignedUrl(
      STORAGE_BUCKET,
      filePath,
      expiresIn,
    );

    if (error || !data) {
      throw new FileUploadError(
        "SIGNED_URL_ERROR",
        "Failed to generate file access URL",
        500,
        { originalError: error },
      );
    }

    return data.signedUrl;
  }

  async listByPayment(paymentId: string): Promise<PaymentFile[]> {
    const userId = await requireAuthenticatedUserId();
    await this.assertPaymentOwner(paymentId, userId);

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

  async delete(fileId: string): Promise<void> {
    await requireAdmin();

    const { data: file, error: fetchError } = await supabase
      .from("payment_files")
      .select("file_path, thumbnail_path")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      throw new FileUploadError("FILE_NOT_FOUND", "File not found", 404);
    }

    this.validateStoragePath(file.file_path);
    if (file.thumbnail_path) {
      this.validateStoragePath(file.thumbnail_path);
    }

    const pathsToDelete = [file.file_path];
    if (file.thumbnail_path) {
      pathsToDelete.push(file.thumbnail_path);
    }

    const { error: storageError } = await removeStorageFiles(STORAGE_BUCKET, pathsToDelete);

    if (storageError) {
      throw new FileUploadError("DELETE_FAILED", "Failed to delete file from storage", 500, {
        originalError: storageError,
      });
    }

    try {
      await callAdminRpc("admin_delete_payment_file_record", {
        p_file_id: fileId,
        p_file_path: file.file_path,
        p_thumbnail_path: file.thumbnail_path ?? null,
      });
    } catch (error) {
      throw new FileUploadError("DATABASE_ERROR", "Failed to delete file record", 500, {
        originalError: error,
      });
    }
  }
}

export const fileUploadService = new FileUploadService();
