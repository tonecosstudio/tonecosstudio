import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileUploadService } from "./fileUploadService";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  requireCurrentUserAdminAccess: vi.fn(),
  callAuthenticatedEdgeFunction: vi.fn(),
  getSupportAttachmentSignedUrl: vi.fn(),
  removeStorageFiles: vi.fn(),
  callAdminRpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
  requireCurrentUserAdminAccess: mocks.requireCurrentUserAdminAccess,
}));

vi.mock("@/services/supabase/edge-function-client", () => ({
  callAuthenticatedEdgeFunction: mocks.callAuthenticatedEdgeFunction,
}));

vi.mock("@/services/support/support-attachment-url-service", () => ({
  getSupportAttachmentSignedUrl: mocks.getSupportAttachmentSignedUrl,
}));

vi.mock("@/services/supabase/storage-client", () => ({
  removeStorageFiles: mocks.removeStorageFiles,
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

const userId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";
const messageId = "33333333-3333-4333-8333-333333333333";
const attachmentId = "44444444-4444-4444-8444-444444444444";

function validJpeg() {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], "proof.jpg", {
    type: "image/jpeg",
  });
}

describe("Support FileUploadService", () => {
  let service: FileUploadService;

  beforeEach(() => {
    service = new FileUploadService();
    vi.clearAllMocks();

    mocks.requireAuthenticatedUserId.mockResolvedValue(userId);
    mocks.requireCurrentUserAdminAccess.mockResolvedValue(userId);
    mocks.getSupportAttachmentSignedUrl.mockResolvedValue(
      "https://signed.example.test/support-attachment",
    );
    mocks.callAuthenticatedEdgeFunction.mockResolvedValue({
      attachment: {
        id: attachmentId,
        message_id: messageId,
        uploaded_by: userId,
        file_name: "proof.jpg",
        file_path: `${conversationId}/${attachmentId}.jpg`,
        file_size: 3,
        file_type: "image/jpeg",
        thumbnail_path: null,
      },
      accessUrl: "https://signed.example.test/edge-result",
    });
  });

  describe("validateFile", () => {
    it.each([
      ["image/jpeg", "test.jpg"],
      ["image/jpg", "test.jpg"],
      ["image/png", "test.png"],
      ["application/pdf", "test.pdf"],
    ])("accepts %s under 5 MB", (type, name) => {
      const result = service.validateFile(new File(["content"], name, { type }));
      expect(result.valid).toBe(true);
    });

    it("rejects unsupported file types", () => {
      const result = service.validateFile(
        new File(["content"], "payload.zip", { type: "application/zip" }),
      );
      expect(result.valid).toBe(false);
    });

    it("rejects files over 5 MB", () => {
      const file = new File(["x"], "large.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 + 1 });

      const result = service.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("5MB");
    });
  });

  describe("uploadFile", () => {
    it("delegates the upload to the authenticated Edge Function", async () => {
      const file = validJpeg();

      const result = await service.uploadFile(file, conversationId, messageId, userId);

      expect(mocks.requireAuthenticatedUserId).toHaveBeenCalledTimes(1);
      expect(mocks.callAuthenticatedEdgeFunction).toHaveBeenCalledWith(
        "upload-support-attachment",
        expect.any(FormData),
        "Erro ao fazer upload do anexo",
      );

      const body = mocks.callAuthenticatedEdgeFunction.mock.calls[0][1] as FormData;
      expect(body.get("messageId")).toBe(messageId);
      expect(body.get("file")).toBeInstanceOf(File);
      expect(result.file_path).toBe(`${conversationId}/${attachmentId}.jpg`);
      expect(result.public_url).toBe("https://signed.example.test/edge-result");
    });

    it("rejects a caller-provided uploader that differs from the current user", async () => {
      await expect(
        service.uploadFile(
          validJpeg(),
          conversationId,
          messageId,
          "55555555-5555-4555-8555-555555555555",
        ),
      ).rejects.toThrow("Usuário do anexo inválido");

      expect(mocks.callAuthenticatedEdgeFunction).not.toHaveBeenCalled();
    });

    it("rejects an inconsistent response from the Edge Function", async () => {
      mocks.callAuthenticatedEdgeFunction.mockResolvedValue({
        attachment: {
          id: attachmentId,
          message_id: "66666666-6666-4666-8666-666666666666",
          uploaded_by: userId,
          file_name: "proof.jpg",
          file_path: `${conversationId}/${attachmentId}.jpg`,
          file_size: 3,
          file_type: "image/jpeg",
        },
        accessUrl: null,
      });

      await expect(
        service.uploadFile(validJpeg(), conversationId, messageId, userId),
      ).rejects.toThrow("Resposta inválida ao salvar o anexo");
    });

    it("falls back to an authenticated signed URL when the Edge response has no URL", async () => {
      mocks.callAuthenticatedEdgeFunction.mockResolvedValue({
        attachment: {
          id: attachmentId,
          message_id: messageId,
          uploaded_by: userId,
          file_name: "proof.jpg",
          file_path: `${conversationId}/${attachmentId}.jpg`,
          file_size: 3,
          file_type: "image/jpeg",
        },
        accessUrl: null,
      });

      const result = await service.uploadFile(validJpeg(), conversationId, messageId, userId);

      expect(mocks.getSupportAttachmentSignedUrl).toHaveBeenCalledWith(
        `${conversationId}/${attachmentId}.jpg`,
      );
      expect(result.public_url).toBe(
        "https://signed.example.test/support-attachment",
      );
    });
  });
});
