/**
 * Tests for Photo Metadata Service
 *
 * Tests cover:
 * - Creating photo metadata
 * - Updating photo metadata (customer visibility)
 * - Getting photos with metadata (filtered by role)
 * - Deleting photo metadata
 * - Bulk operations
 *
 * Task: 4.4.3 Implement photo permissions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPhotoMetadata,
  updatePhotoMetadata,
  getStagePhotosWithMetadata,
  deletePhotoMetadata,
  bulkCreatePhotoMetadata,
  isUserAdmin,
} from "../production/photo-metadata-service";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe("Photo Metadata Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Create Photo Metadata
  // ============================================================================

  describe("createPhotoMetadata", () => {
    it("should create photo metadata with customer visibility", async () => {
      const mockMetadata = {
        id: "meta-1",
        photo_url: "https://example.com/photo.jpg",
        production_stage_id: "stage-1",
        customer_visible: true,
        caption: "Final product",
        uploaded_by: "user-123",
        uploaded_by_name: "Admin User",
        uploaded_at: "2024-01-15T10:00:00Z",
      };

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockMetadata, error: null } as never);

      const result = await createPhotoMetadata({
        photoUrl: "https://example.com/photo.jpg",
        productionStageId: "stage-1",
        customerVisible: true,
        caption: "Final product",
        uploadedByName: "Admin User",
      });

      expect(result.customerVisible).toBe(true);
      expect(result.caption).toBe("Final product");
      expect(supabase.rpc).toHaveBeenCalledWith("admin_create_photo_metadata", {
        p_photo_url: "https://example.com/photo.jpg",
        p_production_stage_id: "stage-1",
        p_customer_visible: true,
        p_caption: "Final product",
        p_uploaded_by_name: "Admin User",
      });
    });

    it("should create photo metadata without customer visibility (admin only)", async () => {
      const mockMetadata = {
        id: "meta-2",
        photo_url: "https://example.com/wip.jpg",
        production_stage_id: "stage-1",
        customer_visible: false,
        uploaded_by: "user-123",
        uploaded_at: "2024-01-15T10:00:00Z",
      };

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockMetadata, error: null } as never);

      const result = await createPhotoMetadata({
        photoUrl: "https://example.com/wip.jpg",
        productionStageId: "stage-1",
        customerVisible: false,
      });

      expect(result.customerVisible).toBe(false);
    });

    it("should throw error if creation fails", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      } as never);

      await expect(
        createPhotoMetadata({
          photoUrl: "https://example.com/photo.jpg",
          productionStageId: "stage-1",
          customerVisible: true,
        })
      ).rejects.toThrow("Failed to create photo metadata");
    });
  });

  // ============================================================================
  // Update Photo Metadata
  // ============================================================================

  describe("updatePhotoMetadata", () => {
    it("should toggle customer visibility", async () => {
      const mockMetadata = {
        id: "meta-1",
        photo_url: "https://example.com/photo.jpg",
        production_stage_id: "stage-1",
        customer_visible: true,
        uploaded_at: "2024-01-15T10:00:00Z",
      };

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockMetadata, error: null } as never);

      const result = await updatePhotoMetadata("https://example.com/photo.jpg", {
        customerVisible: true,
      });

      expect(result.customerVisible).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("admin_update_photo_metadata", {
        p_photo_url: "https://example.com/photo.jpg",
        p_updates: { customer_visible: true },
      });
    });

    it("should update caption", async () => {
      const mockMetadata = {
        id: "meta-1",
        photo_url: "https://example.com/photo.jpg",
        production_stage_id: "stage-1",
        customer_visible: false,
        caption: "Updated caption",
        uploaded_at: "2024-01-15T10:00:00Z",
      };

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockMetadata, error: null } as never);

      const result = await updatePhotoMetadata("https://example.com/photo.jpg", {
        caption: "Updated caption",
      });

      expect(result.caption).toBe("Updated caption");
    });
  });

  // ============================================================================
  // Get Photos with Metadata (Permission Filtering)
  // ============================================================================

  describe("getStagePhotosWithMetadata", () => {
    it("should return all photos for admin users", async () => {
      const mockPhotos = [
        {
          photo_url: "https://example.com/photo1.jpg",
          customer_visible: true,
          caption: "Final product",
          uploaded_by_name: "Admin",
          uploaded_at: "2024-01-15T10:00:00Z",
        },
        {
          photo_url: "https://example.com/photo2.jpg",
          customer_visible: false,
          caption: "Work in progress",
          uploaded_by_name: "Admin",
          uploaded_at: "2024-01-15T11:00:00Z",
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockPhotos,
        error: null,
      } as never);

      const result = await getStagePhotosWithMetadata("stage-1");

      expect(result).toHaveLength(2);
      expect(result[0].customerVisible).toBe(true);
      expect(result[1].customerVisible).toBe(false);
      expect(supabase.rpc).toHaveBeenCalledWith("get_stage_photos_with_metadata", {
        p_stage_id: "stage-1",
      });
    });

    it("should return only customer-visible photos for customers", async () => {
      const mockPhotos = [
        {
          photo_url: "https://example.com/photo1.jpg",
          customer_visible: true,
          caption: "Final product",
          uploaded_by_name: "Admin",
          uploaded_at: "2024-01-15T10:00:00Z",
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockPhotos,
        error: null,
      } as never);

      const result = await getStagePhotosWithMetadata("stage-1");

      expect(result).toHaveLength(1);
      expect(result[0].customerVisible).toBe(true);
    });

    it("should return empty array if no photos", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as never);

      const result = await getStagePhotosWithMetadata("stage-1");

      expect(result).toHaveLength(0);
    });

    it("should throw error if RPC fails", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: "RPC error" },
      } as never);

      await expect(getStagePhotosWithMetadata("stage-1")).rejects.toThrow(
        "Failed to get photos with metadata"
      );
    });
  });

  // ============================================================================
  // Delete Photo Metadata
  // ============================================================================

  describe("deletePhotoMetadata", () => {
    it("should delete photo metadata", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

      await deletePhotoMetadata("https://example.com/photo.jpg");

      expect(supabase.rpc).toHaveBeenCalledWith("admin_delete_photo_metadata", {
        p_photo_url: "https://example.com/photo.jpg",
      });
    });

    it("should throw error if deletion fails", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: "Delete error" },
      } as never);

      await expect(
        deletePhotoMetadata("https://example.com/photo.jpg")
      ).rejects.toThrow("Failed to delete photo metadata");
    });
  });

  // ============================================================================
  // Bulk Create Photo Metadata
  // ============================================================================

  describe("bulkCreatePhotoMetadata", () => {
    it("should create multiple photo metadata records", async () => {
      const mockPhotos = [
        {
          id: "meta-1",
          photo_url: "https://example.com/photo1.jpg",
          production_stage_id: "stage-1",
          customer_visible: true,
          uploaded_by: "user-123",
          uploaded_at: "2024-01-15T10:00:00Z",
        },
        {
          id: "meta-2",
          photo_url: "https://example.com/photo2.jpg",
          production_stage_id: "stage-1",
          customer_visible: false,
          uploaded_by: "user-123",
          uploaded_at: "2024-01-15T10:00:00Z",
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockPhotos, error: null } as never);

      const result = await bulkCreatePhotoMetadata(
        "stage-1",
        [
          { url: "https://example.com/photo1.jpg", customerVisible: true },
          { url: "https://example.com/photo2.jpg", customerVisible: false },
        ],
        "Admin User"
      );

      expect(result).toHaveLength(2);
      expect(result[0].customerVisible).toBe(true);
      expect(result[1].customerVisible).toBe(false);
      expect(supabase.rpc).toHaveBeenCalledWith("admin_bulk_create_photo_metadata", {
        p_production_stage_id: "stage-1",
        p_photos: [
          { url: "https://example.com/photo1.jpg", customerVisible: true },
          { url: "https://example.com/photo2.jpg", customerVisible: false },
        ],
        p_uploaded_by_name: "Admin User",
      });
    });
  });

  // ============================================================================
  // Check Admin Role
  // ============================================================================

  describe("isUserAdmin", () => {
    it("should return true for admin users", async () => {
      const mockUser = { user: { id: "user-123" } };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: mockUser,
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      } as never);

      const result = await isUserAdmin();

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("has_role", {
        _user_id: "user-123",
        _role: "admin",
      });
    });

    it("should return false for non-admin users", async () => {
      const mockUser = { user: { id: "user-123" } };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: mockUser,
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null,
      } as never);

      const result = await isUserAdmin();

      expect(result).toBe(false);
    });

    it("should return false if no user is logged in", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const result = await isUserAdmin();

      expect(result).toBe(false);
    });
  });
});
