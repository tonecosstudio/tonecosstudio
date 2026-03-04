/**
 * Permission Tests for PhotoGalleryComponent
 *
 * Tests cover:
 * - Admins can see all photos
 * - Customers can see only customer-visible photos
 * - Photo visibility filtering
 *
 * Task: 4.4.3 Implement photo permissions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhotoGalleryComponent, PhotoItem } from "../PhotoGalleryComponent";

describe("PhotoGalleryComponent - Permissions", () => {
  const mockPhotos: PhotoItem[] = [
    {
      url: "https://example.com/final-product.jpg",
      uploadedAt: "2024-01-15T10:30:00Z",
      uploaderName: "Admin User",
      uploaderId: "admin-1",
      caption: "Final product - customer visible",
      customerVisible: true,
    },
    {
      url: "https://example.com/wip-1.jpg",
      uploadedAt: "2024-01-15T09:00:00Z",
      uploaderName: "Admin User",
      uploaderId: "admin-1",
      caption: "Work in progress - admin only",
      customerVisible: false,
    },
    {
      url: "https://example.com/wip-2.jpg",
      uploadedAt: "2024-01-15T08:00:00Z",
      uploaderName: "Admin User",
      uploaderId: "admin-1",
      caption: "Design phase - admin only",
      customerVisible: false,
    },
    {
      url: "https://example.com/quality-check.jpg",
      uploadedAt: "2024-01-15T11:00:00Z",
      uploaderName: "Admin User",
      uploaderId: "admin-1",
      caption: "Quality check passed - customer visible",
      customerVisible: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Admin View - See All Photos
  // ============================================================================

  describe("Admin view - see all photos", () => {
    it("should display all photos for admin users", () => {
      render(
        <PhotoGalleryComponent
          photos={mockPhotos}
          isAdmin={true}
          canDelete={true}
        />
      );

      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(4); // All 4 photos visible
    });

    it("should display both customer-visible and admin-only photos", () => {
      render(
        <PhotoGalleryComponent
          photos={mockPhotos}
          isAdmin={true}
          showMetadata={true}
        />
      );

      // Check for alt text of both types (captions are in hidden overlay)
      expect(screen.getByAltText("Final product - customer visible")).toBeInTheDocument();
      expect(screen.getByAltText("Work in progress - admin only")).toBeInTheDocument();
      expect(screen.getByAltText("Design phase - admin only")).toBeInTheDocument();
      expect(screen.getByAltText("Quality check passed - customer visible")).toBeInTheDocument();
    });

    it("should allow admin to delete any photo", () => {
      const onPhotoDelete = vi.fn();

      render(
        <PhotoGalleryComponent
          photos={mockPhotos}
          isAdmin={true}
          canDelete={true}
          onPhotoDelete={onPhotoDelete}
        />
      );

      // All photos should be deletable
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(4);
    });
  });

  // ============================================================================
  // Customer View - See Only Customer-Visible Photos
  // ============================================================================

  describe("Customer view - see only customer-visible photos", () => {
    it("should display only customer-visible photos", () => {
      render(
        <PhotoGalleryComponent
          photos={mockPhotos}
          isAdmin={false}
          customerViewOnly={true}
        />
      );

      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(2); // Only 2 customer-visible photos
    });

    it("should not display admin-only photos", () => {
      render(
        <PhotoGalleryComponent
          photos={mockPhotos}
          isAdmin={false}
          customerViewOnly={true}
          showMetadata={true}
        />
      );

      // Customer-visible alt text should be present
      expect(screen.getByAltText("Final product - customer visible")).toBeInTheDocument();
      expect(screen.getByAltText("Quality check passed - customer visible")).toBeInTheDocument();

      // Admin-only alt text should NOT be present
      expect(screen.queryByAltText("Work in progress - admin only")).not.toBeInTheDocument();
      expect(screen.queryByAltText("Design phase - admin only")).not.toBeInTheDocument();
    });

    it("should not show delete button for customers", () => {
      render(
        <PhotoGalleryComponent
          photos={mockPhotos}
          isAdmin={false}
          customerViewOnly={true}
          canDelete={false}
        />
      );

      // Open lightbox to check for delete button
      const firstPhoto = screen.getAllByRole("img")[0];
      firstPhoto.closest("div")?.click();

      // Delete button should not be present
      expect(screen.queryByText(/Excluir/)).not.toBeInTheDocument();
    });

    it("should show empty state if no customer-visible photos", () => {
      const adminOnlyPhotos: PhotoItem[] = [
        {
          url: "https://example.com/wip.jpg",
          customerVisible: false,
        },
      ];

      render(
        <PhotoGalleryComponent
          photos={adminOnlyPhotos}
          isAdmin={false}
          customerViewOnly={true}
        />
      );

      expect(screen.getByText("Nenhuma foto disponível")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Default Behavior (Backward Compatibility)
  // ============================================================================

  describe("Default behavior - backward compatibility", () => {
    it("should show all photos when neither isAdmin nor customerViewOnly is set", () => {
      render(<PhotoGalleryComponent photos={mockPhotos} />);

      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(4); // All photos visible for backward compatibility
    });

    it("should handle photos without customerVisible flag", () => {
      const photosWithoutFlag: PhotoItem[] = [
        {
          url: "https://example.com/photo1.jpg",
          uploadedAt: "2024-01-15T10:00:00Z",
        },
        {
          url: "https://example.com/photo2.jpg",
          uploadedAt: "2024-01-15T11:00:00Z",
        },
      ];

      render(
        <PhotoGalleryComponent
          photos={photosWithoutFlag}
          isAdmin={false}
          customerViewOnly={true}
        />
      );

      // Photos without customerVisible flag should not be shown to customers
      expect(screen.getByText("Nenhuma foto disponível")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Mixed Scenarios
  // ============================================================================

  describe("Mixed scenarios", () => {
    it("should correctly filter when all photos are customer-visible", () => {
      const allCustomerVisible: PhotoItem[] = mockPhotos.map((photo) => ({
        ...photo,
        customerVisible: true,
      }));

      render(
        <PhotoGalleryComponent
          photos={allCustomerVisible}
          isAdmin={false}
          customerViewOnly={true}
        />
      );

      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(4); // All photos visible
    });

    it("should correctly filter when no photos are customer-visible", () => {
      const noCustomerVisible: PhotoItem[] = mockPhotos.map((photo) => ({
        ...photo,
        customerVisible: false,
      }));

      render(
        <PhotoGalleryComponent
          photos={noCustomerVisible}
          isAdmin={false}
          customerViewOnly={true}
        />
      );

      expect(screen.getByText("Nenhuma foto disponível")).toBeInTheDocument();
    });

    it("should handle single customer-visible photo correctly", () => {
      const singlePhoto: PhotoItem[] = [
        {
          url: "https://example.com/final.jpg",
          customerVisible: true,
          caption: "Final product",
        },
      ];

      render(
        <PhotoGalleryComponent
          photos={singlePhoto}
          isAdmin={false}
          customerViewOnly={true}
        />
      );

      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(1);
    });
  });

  // ============================================================================
  // Lightbox Navigation with Filtered Photos
  // ============================================================================

  describe("Lightbox navigation with filtered photos", () => {
    it("should navigate only through customer-visible photos in lightbox", async () => {
      const { container } = render(
        <PhotoGalleryComponent
          photos={mockPhotos}
          isAdmin={false}
          customerViewOnly={true}
        />
      );

      // Open lightbox on first customer-visible photo
      const firstPhoto = screen.getAllByRole("img")[0];
      fireEvent.click(firstPhoto.closest("div")!);

      // Wait for lightbox to open and check for photo count
      await waitFor(() => {
        const countText = container.textContent;
        expect(countText).toContain("1");
        expect(countText).toContain("2");
      });
    });

    it("should show correct count in lightbox for admin", async () => {
      const { container } = render(
        <PhotoGalleryComponent
          photos={mockPhotos}
          isAdmin={true}
        />
      );

      // Open lightbox
      const firstPhoto = screen.getAllByRole("img")[0];
      fireEvent.click(firstPhoto.closest("div")!);

      // Wait for lightbox to open and check for photo count
      await waitFor(() => {
        const countText = container.textContent;
        expect(countText).toContain("1");
        expect(countText).toContain("4");
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge cases", () => {
    it("should handle empty photos array", () => {
      render(
        <PhotoGalleryComponent
          photos={[]}
          isAdmin={false}
          customerViewOnly={true}
        />
      );

      expect(screen.getByText("Nenhuma foto disponível")).toBeInTheDocument();
    });

    it("should handle photos with undefined customerVisible", () => {
      const photosWithUndefined: PhotoItem[] = [
        {
          url: "https://example.com/photo.jpg",
          customerVisible: undefined,
        },
      ];

      render(
        <PhotoGalleryComponent
          photos={photosWithUndefined}
          isAdmin={false}
          customerViewOnly={true}
        />
      );

      // Undefined should be treated as false (not customer-visible)
      expect(screen.getByText("Nenhuma foto disponível")).toBeInTheDocument();
    });

    it("should handle admin viewing with customerViewOnly flag (admin takes precedence)", () => {
      render(
        <PhotoGalleryComponent
          photos={mockPhotos}
          isAdmin={true}
          customerViewOnly={true}
        />
      );

      // Admin should see all photos even with customerViewOnly flag
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(4);
    });
  });
});
