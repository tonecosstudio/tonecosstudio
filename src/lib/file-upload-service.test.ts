import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileUploadError, FileUploadService } from "./file-upload-service";
import type { PaymentFile } from "@/types/manual-payment";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  requireAdmin: vi.fn(),
  callAuthenticatedEdgeFunction: vi.fn(),
  createStorageSignedUrl: vi.fn(),
  removeStorageFiles: vi.fn(),
  callAdminRpc: vi.fn(),
  sendPaymentUnderReview: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));

vi.mock("@/services/groups/group-permissions-service", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/services/supabase/edge-function-client", () => ({
  callAuthenticatedEdgeFunction: mocks.callAuthenticatedEdgeFunction,
}));

vi.mock("@/services/supabase/storage-client", () => ({
  createStorageSignedUrl: mocks.createStorageSignedUrl,
  removeStorageFiles: mocks.removeStorageFiles,
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

vi.mock("@/services/notifications/payment-notification-service", () => ({
  getNotificationService: () => ({
    sendPaymentUnderReview: mocks.sendPaymentUnderReview,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
  },
}));

const userId = "11111111-1111-4111-8111-111111111111";
const paymentId = "22222222-2222-4222-8222-222222222222";

function paymentFile(overrides: Partial<PaymentFile> = {}): PaymentFile {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    payment_id: paymentId,
    file_name: "proof.jpg",
    file_path: `${paymentId}/proof.jpg`,
    file_size: 1024,
    file_type: "image/jpeg",
    thumbnail_path: null,
    uploaded_by: userId,
    created_at: "2026-08-31T00:00:00.000Z",
    ...overrides,
  };
}

function validJpeg(name = "proof.jpg") {
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xdb])], name, {
    type: "image/jpeg",
  });
  Object.defineProperty(file, "size", { value: 1024 });
  return file;
}

describe("FileUploadService", () => {
  let service: FileUploadService;

  beforeEach(() => {
    service = new FileUploadService();
    vi.clearAllMocks();

    mocks.requireAuthenticatedUserId.mockResolvedValue(userId);
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.callAuthenticatedEdgeFunction.mockResolvedValue({
      file: paymentFile(),
      firstFile: false,
    });
    mocks.createStorageSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.test/private-proof" },
      error: null,
    });
    mocks.removeStorageFiles.mockResolvedValue({ data: [], error: null });
    mocks.callAdminRpc.mockResolvedValue({ success: true });
    mocks.sendPaymentUnderReview.mockResolvedValue(undefined);
  });

  describe("validateFile", () => {
    it("accepts a valid JPEG under 5 MB", async () => {
      const result = await service.validateFile(validJpeg());

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("rejects empty files", async () => {
      const file = new File([], "proof.jpg", { type: "image/jpeg" });

      const result = await service.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File is empty. Please choose another file.");
    });

    it("rejects files larger than 5 MB", async () => {
      const file = validJpeg();
      Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 + 1 });

      const result = await service.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "File size exceeds 5MB limit. Please upload a smaller file.",
      );
    });

    it("rejects MIME and extension mismatch", async () => {
      const file = new File(["%PDF-1.7"], "proof.jpg", { type: "application/pdf" });

      const result = await service.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "File type mismatch. The file extension does not match the declared content type.",
      );
    });
  });

  describe("upload", () => {
    it("uses the authenticated Edge Function as the upload authority", async () => {
      const progress = vi.fn();
      const file = validJpeg();

      const result = await service.upload(paymentId, file, progress);

      expect(mocks.requireAuthenticatedUserId).toHaveBeenCalledTimes(1);
      expect(mocks.callAuthenticatedEdgeFunction).toHaveBeenCalledTimes(1);
      expect(mocks.callAuthenticatedEdgeFunction).toHaveBeenCalledWith(
        "upload-payment-proof",
        expect.any(FormData),
        "Payment proof upload failed",
      );

      const body = mocks.callAuthenticatedEdgeFunction.mock.calls[0][1] as FormData;
      expect(body.get("paymentId")).toBe(paymentId);
      expect(body.get("file")).toBeInstanceOf(File);
      expect(result.id).toBe(paymentFile().id);
      expect(progress.mock.calls.map(([value]) => value)).toEqual([5, 100]);
    });

    it("fails before the Edge call when the user is unauthenticated", async () => {
      mocks.requireAuthenticatedUserId.mockRejectedValue(new Error("Unauthorized"));

      await expect(service.upload(paymentId, validJpeg())).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        statusCode: 401,
      });
      expect(mocks.callAuthenticatedEdgeFunction).not.toHaveBeenCalled();
    });

    it("fails closed when the Edge Function rejects the upload", async () => {
      mocks.callAuthenticatedEdgeFunction.mockRejectedValue(new Error("Security scan failed"));

      await expect(service.upload(paymentId, validJpeg())).rejects.toMatchObject({
        code: "UPLOAD_FAILED",
        statusCode: 503,
        message: "Security scan failed",
      });
    });

    it("sends the under-review notification only after the first successful proof", async () => {
      mocks.callAuthenticatedEdgeFunction.mockResolvedValue({
        file: paymentFile(),
        firstFile: true,
      });

      await service.upload(paymentId, validJpeg());

      expect(mocks.sendPaymentUnderReview).toHaveBeenCalledWith(paymentId);
    });

    it("rejects a malformed Edge response", async () => {
      mocks.callAuthenticatedEdgeFunction.mockResolvedValue({ file: null });

      await expect(service.upload(paymentId, validJpeg())).rejects.toMatchObject({
        code: "UPLOAD_FAILED",
        statusCode: 500,
      });
    });
  });

  describe("private proof access", () => {
    it("creates a signed URL for a validated object path", async () => {
      const filePath = `${paymentId}/proof.jpg`;

      const url = await service.getSignedUrl(filePath, 900);

      expect(mocks.createStorageSignedUrl).toHaveBeenCalledWith(
        "payment-proofs",
        filePath,
        900,
      );
      expect(url).toBe("https://example.test/private-proof");
    });

    it("rejects traversal-like object paths before requesting a signed URL", async () => {
      await expect(service.getSignedUrl(`${paymentId}/../secret`)).rejects.toBeInstanceOf(
        FileUploadError,
      );
      expect(mocks.createStorageSignedUrl).not.toHaveBeenCalled();
    });
  });
});
