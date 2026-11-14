import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePaymentVoucher, uploadPaymentVoucher } from "./payment-voucher-storage-service";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  assertCurrentUserId: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/services/auth/current-user", () => ({
  assertCurrentUserId: mocks.assertCurrentUserId,
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));
vi.mock("@/services/supabase/storage-client", () => ({
  uploadStorageFile: mocks.upload,
  removeStorageFiles: mocks.remove,
}));
vi.mock("@/lib/security/input-sanitizer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/security/input-sanitizer")>()),
  generateSecureToken: () => "token123",
}));

const voucher = () => new File(["proof"], "receipt.png", { type: "image/png" });
const USER = "11111111-1111-4111-8111-111111111111";
const QUOTE = "22222222-2222-4222-8222-222222222222";

describe("private subscription voucher storage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.assertCurrentUserId.mockResolvedValue("user-1");
    mocks.requireAuthenticatedUserId.mockResolvedValue("user-1");
  });

  it("stores a voucher only in the private subscriptions bucket", async () => {
    const file = voucher();
    const path = await uploadPaymentVoucher({ file, pathPrefix: "subscriptions" });
    expect(path).toMatch(/^subscriptions\/user-1\/\d+-token123\.png$/);
    expect(mocks.requireAuthenticatedUserId).toHaveBeenCalledOnce();
    expect(mocks.upload).toHaveBeenCalledExactlyOnceWith(
      "payment-vouchers", path, file,
      { upsert: false, contentType: "image/png" },
    );
    expect(path).not.toContain("https://");
  });

  it("stores a quote voucher under the current owner and canonical quote id", async () => {
    const file = voucher();
    const path = await uploadPaymentVoucher({ file, pathPrefix: `quotes:${QUOTE}` });
    expect(path).toMatch(/^quotes\/user-1\/22222222-2222-4222-8222-222222222222\/\d+-token123\.png$/);
    expect(mocks.upload).toHaveBeenCalledExactlyOnceWith(
      "payment-vouchers", path, file,
      { upsert: false, contentType: "image/png" },
    );
  });

  it("removes an obsolete quote voucher only within the authenticated owner's path", async () => {
    const path = `quotes/${USER}/${QUOTE}/1788130800000-a1b2c3d4e5f60708.png`;
    mocks.assertCurrentUserId.mockResolvedValueOnce(USER);
    await deletePaymentVoucher(path, USER);
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith("payment-vouchers", [path]);
  });

  it("requires the requested identity to match the authenticated identity", async () => {
    const file = voucher();
    await uploadPaymentVoucher({ file, userId: "user-1", pathPrefix: "subscriptions" });
    expect(mocks.assertCurrentUserId).toHaveBeenCalledExactlyOnceWith("user-1");
    expect(mocks.requireAuthenticatedUserId).not.toHaveBeenCalled();
  });

  it("never writes if the authenticated identity cannot be validated", async () => {
    mocks.assertCurrentUserId.mockRejectedValueOnce(new Error("Acesso negado"));
    await expect(uploadPaymentVoucher({
      file: voucher(), userId: "other", pathPrefix: "subscriptions",
    })).rejects.toThrow("Acesso negado");
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it.each(["orders", "subscriptions/other", "public/receipts"])(
    "rejects an unauthorized voucher destination %s",
    async (pathPrefix) => {
      await expect(uploadPaymentVoucher({ file: voucher(), pathPrefix }))
        .rejects.toThrow("Destino de comprovante não permitido");
      expect(mocks.upload).not.toHaveBeenCalled();
    },
  );

  it("reports upload errors without returning a false private object path", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { message: "storage denied" } });
    await expect(uploadPaymentVoucher({ file: voucher(), pathPrefix: "subscriptions" }))
      .rejects.toThrow("Falha no upload: storage denied");
  });
});
