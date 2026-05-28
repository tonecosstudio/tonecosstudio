/**
 * Tests for PhotoUploadComponent
 *
 * Tests cover:
 * - File validation (type, size)
 * - Drag-and-drop functionality
 * - Image compression
 * - Upload to Supabase Storage
 * - Preview generation
 * - Error handling
 * - Remove functionality
 * - Max photos limit
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoUploadComponent } from "./PhotoUploadComponent";
import * as imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://example.com/photo.jpg" },
        })),
      })),
    },
  },
}));

vi.mock("browser-image-compression", () => ({
  default: vi.fn((file) => Promise.resolve(file)),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

// Helper to create mock files
const createMockFile = (
  name: string,
  size: number,
  type: string
): File => {
  const file = new File(["x".repeat(size)], name, { type });
  return file;
};

describe("PhotoUploadComponent", () => {
  let mockOnPhotosChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPhotosChange = vi.fn();
    vi.clearAllMocks();
    vi.mocked(imageCompression.default).mockImplementation((file) => Promise.resolve(file) as any);
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: "https://example.com/photo.jpg" },
      })),
    } as any);
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe("Rendering", () => {
    it("should render with default props", () => {
      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      expect(screen.getByText(/Fotos \(0\/5\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Arraste fotos aqui ou clique para selecionar/i)).toBeInTheDocument();
    });

    it("should render with custom label", () => {
      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          label="Upload Images"
        />
      );

      expect(screen.getByText(/Upload Images/i)).toBeInTheDocument();
    });

    it("should show photo count in label", () => {
      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          currentPhotos={["https://example.com/photo1.jpg"]}
          maxPhotos={5}
        />
      );

      expect(screen.getByText(/Fotos \(1\/5\)/i)).toBeInTheDocument();
    });

    it("should render existing photos", () => {
      const currentPhotos = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];

      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          currentPhotos={currentPhotos}
        />
      );

      const images = screen.getAllByRole("img", { name: /Preview/i });
      expect(images).toHaveLength(2);
    });

    it("should hide upload area when max photos reached", () => {
      const currentPhotos = Array(5).fill("https://example.com/photo.jpg");

      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          currentPhotos={currentPhotos}
          maxPhotos={5}
        />
      );

      expect(
        screen.queryByText(/Arraste fotos aqui ou clique para selecionar/i)
      ).not.toBeInTheDocument();
    });

    it("should show help text by default", () => {
      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      expect(
        screen.getByText(/As imagens serão automaticamente comprimidas/i)
      ).toBeInTheDocument();
    });

    it("should hide help text when showHelpText is false", () => {
      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          showHelpText={false}
        />
      );

      expect(
        screen.queryByText(/As imagens serão automaticamente comprimidas/i)
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // File Validation Tests
  // ============================================================================

  describe("File Validation", () => {
    it("should accept valid image files", async () => {
      const user = userEvent.setup();
      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const file = createMockFile("test.jpg", 1024 * 1024, "image/jpeg");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnPhotosChange).toHaveBeenCalled();
      });
    });

    it("should reject files that are too large", async () => {
      const user = userEvent.setup();
      const { toast } = await import("@/components/ui/use-toast");

      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const file = createMockFile("large.jpg", 6 * 1024 * 1024, "image/jpeg");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Arquivo Inválido",
            variant: "destructive",
          })
        );
      });
    });

    it("should reject non-image files", async () => {
      const { toast } = await import("@/components/ui/use-toast");

      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const file = createMockFile("document.pdf", 1024, "application/pdf");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Arquivo Inválido",
            variant: "destructive",
          })
        );
      });
    });

    it("should enforce max photos limit", async () => {
      const currentPhotos = Array(5).fill("https://example.com/photo.jpg");

      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          currentPhotos={currentPhotos}
          maxPhotos={5}
        />
      );

      // Try to add another photo (should be prevented by UI)
      expect(
        screen.queryByText(/Arraste fotos aqui ou clique para selecionar/i)
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Upload Functionality Tests
  // ============================================================================

  describe("Upload Functionality", () => {
    it("should compress images before upload", async () => {
      const user = userEvent.setup();
      const mockCompress = vi.mocked(imageCompression.default);

      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const file = createMockFile("test.jpg", 2 * 1024 * 1024, "image/jpeg");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockCompress).toHaveBeenCalledWith(
          file,
          expect.objectContaining({
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
          })
        );
      });
    });

    it("should upload to Supabase Storage", async () => {
      const user = userEvent.setup();
      const { supabase } = await import("@/integrations/supabase/client");

      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const file = createMockFile("test.jpg", 1024 * 1024, "image/jpeg");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(supabase.storage.from).toHaveBeenCalledWith("production-photos");
      });
    });

    it("should call onPhotosChange with uploaded URL", async () => {
      const user = userEvent.setup();

      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const file = createMockFile("test.jpg", 1024 * 1024, "image/jpeg");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnPhotosChange).toHaveBeenCalledWith([
          "https://example.com/photo.jpg",
        ]);
      });
    });

    it("should show uploading state", async () => {
      const user = userEvent.setup();
      let resolveUpload!: (value: { error: null }) => void;
      const uploadPromise = new Promise<{ error: null }>((resolve) => {
        resolveUpload = resolve;
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockReturnValue(uploadPromise),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://example.com/photo.jpg" },
        })),
      } as any);

      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const file = createMockFile("test.jpg", 1024 * 1024, "image/jpeg");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      // Should show uploading text briefly
      expect(
        await screen.findByText(/Comprimindo e enviando.../i)
      ).toBeInTheDocument();

      resolveUpload({ error: null });
      await waitFor(() => {
        expect(mockOnPhotosChange).toHaveBeenCalled();
      });
    });

    it("should handle upload errors", async () => {
      const user = userEvent.setup();
      const { supabase } = await import("@/integrations/supabase/client");
      const { toast } = await import("@/components/ui/use-toast");

      // Mock upload error
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          error: { message: "Upload failed" },
        }),
        getPublicUrl: vi.fn(),
      } as any);

      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const file = createMockFile("test.jpg", 1024 * 1024, "image/jpeg");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Erro no Upload",
            variant: "destructive",
          })
        );
      });
    });
  });

  // ============================================================================
  // Drag and Drop Tests
  // ============================================================================

  describe("Drag and Drop", () => {
    it("should handle drag enter", async () => {
      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const dropZone = screen.getByText(/Arraste fotos aqui ou clique para selecionar/i)
        .closest(".border-2");

      if (dropZone) {
        fireEvent.dragEnter(dropZone);

        // Check if the class is applied (visual feedback)
        await waitFor(() => {
          expect(dropZone).toHaveClass("border-primary");
        });
      }
    });

    it("should handle drag leave", async () => {
      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const dropZone = screen.getByText(/Arraste fotos aqui ou clique para selecionar/i)
        .closest(".border-2");

      if (dropZone) {
        fireEvent.dragEnter(dropZone);
        fireEvent.dragLeave(dropZone);

        await waitFor(() => {
          expect(dropZone).not.toHaveClass("border-primary");
        });
      }
    });
  });

  // ============================================================================
  // Remove Photo Tests
  // ============================================================================

  describe("Remove Photo", () => {
    it("should remove photo when remove button is clicked", async () => {
      const user = userEvent.setup();
      const currentPhotos = ["https://example.com/photo1.jpg"];

      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          currentPhotos={currentPhotos}
        />
      );

      const removeButton = screen.getByRole("button", { name: "" });
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockOnPhotosChange).toHaveBeenCalledWith([]);
      });
    });

    it("should update photo count after removal", async () => {
      const user = userEvent.setup();
      const currentPhotos = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];

      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          currentPhotos={currentPhotos}
          maxPhotos={5}
        />
      );

      expect(screen.getByText(/Fotos \(2\/5\)/i)).toBeInTheDocument();

      const removeButtons = screen.getAllByRole("button", { name: "" });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Fotos \(1\/5\)/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Disabled State Tests
  // ============================================================================

  describe("Disabled State", () => {
    it("should disable upload when disabled prop is true", () => {
      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          disabled={true}
        />
      );

      const button = screen.getByRole("button", { name: /Selecionar Fotos/i });
      expect(button).toBeDisabled();
    });

    it("should disable remove buttons when disabled", () => {
      const currentPhotos = ["https://example.com/photo1.jpg"];

      render(
        <PhotoUploadComponent
          onPhotosChange={mockOnPhotosChange}
          currentPhotos={currentPhotos}
          disabled={true}
        />
      );

      const removeButton = screen.getByRole("button", { name: "" });
      expect(removeButton).toBeDisabled();
    });
  });

  // ============================================================================
  // Multiple Files Tests
  // ============================================================================

  describe("Multiple Files", () => {
    it("should handle multiple file uploads", async () => {
      const user = userEvent.setup();

      render(<PhotoUploadComponent onPhotosChange={mockOnPhotosChange} />);

      const files = [
        createMockFile("test1.jpg", 1024 * 1024, "image/jpeg"),
        createMockFile("test2.jpg", 1024 * 1024, "image/jpeg"),
      ];

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, files);

      await waitFor(() => {
        expect(mockOnPhotosChange).toHaveBeenCalled();
      });
    });
  });
});
