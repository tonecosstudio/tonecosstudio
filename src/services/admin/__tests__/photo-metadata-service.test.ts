import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { supabase } from "@/integrations/supabase/client";
import {
  bulkCreatePhotoMetadata,
  createPhotoMetadata,
  deletePhotoMetadata,
  getStagePhotosWithMetadata,
  isUserAdmin,
  updatePhotoMetadata,
} from "../production/photo-metadata-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const stageId = "11111111-1111-4111-8111-111111111111";
const photoId = "22222222-2222-4222-8222-222222222222";
const photoId2 = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const photoUrl = "https://example.com/photo.jpg";

function photoRow(overrides: Record<string, unknown> = {}) {
  return {
    id: photoId,
    photo_url: photoUrl,
    production_stage_id: stageId,
    customer_visible: true,
    caption: "Final product",
    uploaded_by: userId,
    uploaded_by_name: "Admin User",
    uploaded_at: "2026-09-13T12:00:00Z",
    ...overrides,
  };
}

describe("Photo Metadata Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPhotoMetadata", () => {
    it("creates metadata through the admin gateway and binds the returned row", async () => {
      callAdminRpcMock.mockResolvedValue(photoRow());

      const result = await createPhotoMetadata({
        photoUrl: `  ${photoUrl}  `,
        productionStageId: stageId,
        customerVisible: true,
        caption: "  Final product  ",
        uploadedByName: "Admin User",
      });

      expect(result).toMatchObject({
        id: photoId,
        photoUrl,
        productionStageId: stageId,
        customerVisible: true,
        caption: "Final product",
      });
      expect(callAdminRpcMock).toHaveBeenCalledWith("admin_create_photo_metadata", {
        p_photo_url: `  ${photoUrl}  `,
        p_production_stage_id: stageId,
        p_customer_visible: true,
        p_caption: "  Final product  ",
        p_uploaded_by_name: "Admin User",
      });
    });

    it.each([
      null,
      {},
      photoRow({ id: "invalid" }),
      photoRow({ photo_url: "https://example.com/other.jpg" }),
      photoRow({ production_stage_id: "55555555-5555-4555-8555-555555555555" }),
      photoRow({ customer_visible: false }),
      photoRow({ caption: "Other caption" }),
    ])("rejects malformed or mismatched create responses %#", async (value) => {
      callAdminRpcMock.mockResolvedValue(value as never);

      await expect(
        createPhotoMetadata({
          photoUrl,
          productionStageId: stageId,
          customerVisible: true,
          caption: "Final product",
        }),
      ).rejects.toThrow();
    });
  });

  describe("updatePhotoMetadata", () => {
    it("confirms changed visibility and caption for the requested photo", async () => {
      callAdminRpcMock.mockResolvedValue(
        photoRow({ customer_visible: false, caption: "Revisada" }),
      );

      const result = await updatePhotoMetadata(` ${photoUrl} `, {
        customerVisible: false,
        caption: "  Revisada  ",
      });

      expect(result.customerVisible).toBe(false);
      expect(result.caption).toBe("Revisada");
      expect(callAdminRpcMock).toHaveBeenCalledWith("admin_update_photo_metadata", {
        p_photo_url: ` ${photoUrl} `,
        p_updates: { customer_visible: false, caption: "  Revisada  " },
      });
    });

    it.each([
      photoRow({ photo_url: "https://example.com/other.jpg" }),
      photoRow({ customer_visible: false }),
      photoRow({ caption: "Other caption" }),
    ])("rejects an update response that does not match the request %#", async (value) => {
      callAdminRpcMock.mockResolvedValue(value);

      await expect(
        updatePhotoMetadata(photoUrl, {
          customerVisible: true,
          caption: "Final product",
        }),
      ).rejects.toThrow();
    });
  });

  describe("getStagePhotosWithMetadata", () => {
    it("maps the rows returned by the read RPC", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [
          {
            photo_url: photoUrl,
            customer_visible: true,
            caption: "Final product",
            uploaded_by_name: "Admin",
            uploaded_at: "2026-09-13T12:00:00Z",
          },
          {
            photo_url: "https://example.com/internal.jpg",
            customer_visible: false,
            caption: "WIP",
            uploaded_by_name: "Admin",
            uploaded_at: "2026-09-13T13:00:00Z",
          },
        ],
        error: null,
      } as never);

      const result = await getStagePhotosWithMetadata(stageId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ url: photoUrl, customerVisible: true });
      expect(result[1]).toMatchObject({ customerVisible: false });
      expect(supabase.rpc).toHaveBeenCalledWith("get_stage_photos_with_metadata", {
        p_stage_id: stageId,
      });
    });

    it("returns an empty array when the read RPC has no rows", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
      await expect(getStagePhotosWithMetadata(stageId)).resolves.toEqual([]);
    });

    it("surfaces a read RPC error", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: "RPC error" },
      } as never);

      await expect(getStagePhotosWithMetadata(stageId)).rejects.toThrow(
        "Failed to get photos with metadata: RPC error",
      );
    });
  });

  describe("deletePhotoMetadata", () => {
    it("accepts the versioned void RPC contract", async () => {
      callAdminRpcMock.mockResolvedValue(null);

      await expect(deletePhotoMetadata(photoUrl)).resolves.toBeUndefined();
      expect(callAdminRpcMock).toHaveBeenCalledWith("admin_delete_photo_metadata", {
        p_photo_url: photoUrl,
      });
    });

    it("surfaces gateway failures", async () => {
      callAdminRpcMock.mockRejectedValue(new Error("Delete error"));
      await expect(deletePhotoMetadata(photoUrl)).rejects.toThrow("Delete error");
    });
  });

  describe("bulkCreatePhotoMetadata", () => {
    const input = [
      { url: "https://example.com/photo1.jpg", customerVisible: true, caption: " A " },
      { url: "https://example.com/photo2.jpg", customerVisible: false },
    ];

    it("requires one matching row for every submitted photo", async () => {
      callAdminRpcMock.mockResolvedValue([
        photoRow({
          id: photoId,
          photo_url: input[0].url,
          customer_visible: true,
          caption: "A",
        }),
        photoRow({
          id: photoId2,
          photo_url: input[1].url,
          customer_visible: false,
          caption: null,
        }),
      ]);

      const result = await bulkCreatePhotoMetadata(stageId, input, "Admin User");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: photoId, caption: "A" });
      expect(result[1]).toMatchObject({ id: photoId2, customerVisible: false });
    });

    it("rejects missing, extra, reordered or mismatched rows", async () => {
      callAdminRpcMock.mockResolvedValue([
        photoRow({ id: photoId, photo_url: input[1].url, customer_visible: false, caption: null }),
        photoRow({ id: photoId2, photo_url: input[0].url, customer_visible: true, caption: "A" }),
      ]);

      await expect(bulkCreatePhotoMetadata(stageId, input)).rejects.toThrow(
        "Bulk photo metadata creation returned inconsistent photo metadata",
      );

      callAdminRpcMock.mockResolvedValue([photoRow({ photo_url: input[0].url, caption: "A" })]);
      await expect(bulkCreatePhotoMetadata(stageId, input)).rejects.toThrow(
        "Bulk photo metadata creation returned an unexpected result count",
      );
    });
  });

  describe("isUserAdmin", () => {
    it("returns the role RPC result for an authenticated user", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as never);

      await expect(isUserAdmin()).resolves.toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("has_role", {
        _user_id: userId,
        _role: "admin",
      });
    });

    it("returns false when there is no authenticated user", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await expect(isUserAdmin()).resolves.toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });
});
