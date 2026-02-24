/**
 * AttachmentUpload Component Tests
 * Requirements: 4.1, 4.2, 4.6
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AttachmentUpload } from "./AttachmentUpload";

// Mock the validation function
vi.mock("@/lib/validations/support", () => ({
  validateFile: vi.fn((file: File) => {
    const MAX_SIZE = 5 * 1024 * 1024;
    const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

    if (file.size > MAX_SIZE) {
      return { valid: false, error: "Arquivo deve ter no máximo 5MB" };
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return { valid: false, error: "Tipo de arquivo não suportado. Use JPEG, PNG ou PDF" };
    }

    return { valid: true };
  }),
}));

describe("AttachmentUpload", () => {
  const mockOnFilesSelected = vi.fn();
  const mockOnRemoveFile = vi.fn();

  // Mock URL.createObjectURL and revokeObjectURL
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  // Helper to create mock files
  const createMockFile = (name: string, size: number, type: string): File => {
    const file = new File(["a".repeat(size)], name, { type });
    return file;
  };

  // Helper to get file input
  const getFileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

  describe("Rendering", () => {
    it("should render upload area with instructions", () => {
      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      expect(screen.getByText(/Arraste arquivos ou clique para selecionar/i)).toBeInTheDocument();
      expect(screen.getByText(/JPEG, PNG ou PDF • Máximo 5MB cada/i)).toBeInTheDocument();
    });

    it("should render compact mode when compact prop is true", () => {
      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} compact={true} />);

      expect(screen.getByRole("button", { name: /Anexar/i })).toBeInTheDocument();
      expect(screen.queryByText(/Arraste arquivos/i)).not.toBeInTheDocument();
    });

    it("should show file count badge", () => {
      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} selectedFiles={[]} />);

      expect(screen.getByText("0 / 5 arquivos")).toBeInTheDocument();
    });
  });

  describe("File Validation - Images (Requirement 4.1)", () => {
    it("should accept JPEG images under 5MB", async () => {
      const validJpeg = createMockFile("test.jpg", 3 * 1024 * 1024, "image/jpeg");

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(function (this: any) {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: "data:image/jpeg;base64,mockdata" } });
            }
          }, 0);
        }),
        onload: null as any,
        onerror: null as any,
        result: null,
      };
      global.FileReader = vi.fn(() => mockFileReader) as any;

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [validJpeg],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(
        () => {
          expect(mockOnFilesSelected).toHaveBeenCalledWith([validJpeg]);
        },
        { timeout: 3000 }
      );
    });

    it("should accept PNG images under 5MB", async () => {
      const validPng = createMockFile("test.png", 2 * 1024 * 1024, "image/png");

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [validPng],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalledWith([validPng]);
      });
    });

    it("should reject images over 5MB", async () => {
      const oversizedImage = createMockFile("large.jpg", 6 * 1024 * 1024, "image/jpeg");

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [oversizedImage],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/Arquivo deve ter no máximo 5MB/i)).toBeInTheDocument();
      });

      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });

    it("should reject unsupported image types", async () => {
      const unsupportedImage = createMockFile("test.gif", 1 * 1024 * 1024, "image/gif");

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [unsupportedImage],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/Tipo de arquivo não suportado/i)).toBeInTheDocument();
      });

      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });
  });

  describe("File Validation - PDFs (Requirement 4.2)", () => {
    it("should accept PDF files under 5MB", async () => {
      const validPdf = createMockFile("document.pdf", 3 * 1024 * 1024, "application/pdf");

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [validPdf],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalledWith([validPdf]);
      });
    });

    it("should reject PDFs over 5MB", async () => {
      const oversizedPdf = createMockFile("large.pdf", 6 * 1024 * 1024, "application/pdf");

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [oversizedPdf],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/Arquivo deve ter no máximo 5MB/i)).toBeInTheDocument();
      });

      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });
  });

  describe("Validation Before Upload (Requirement 4.6)", () => {
    it("should validate file type before accepting", async () => {
      const invalidFile = createMockFile("test.txt", 1024, "text/plain");

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [invalidFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/Tipo de arquivo não suportado/i)).toBeInTheDocument();
      });

      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });

    it("should validate file size before accepting", async () => {
      const oversizedFile = createMockFile("huge.jpg", 10 * 1024 * 1024, "image/jpeg");

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [oversizedFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/Arquivo deve ter no máximo 5MB/i)).toBeInTheDocument();
      });

      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });

    it("should validate multiple files and only accept valid ones", async () => {
      const validFile = createMockFile("valid.jpg", 2 * 1024 * 1024, "image/jpeg");
      const invalidFile = createMockFile("invalid.txt", 1024, "text/plain");

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [validFile, invalidFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalledWith([validFile]);
        expect(screen.getByText(/Tipo de arquivo não suportado/i)).toBeInTheDocument();
      });
    });
  });

  describe("Drag and Drop", () => {
    it("should handle drag over event", () => {
      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const dropArea = screen.getByText(/Arraste arquivos/i).closest("div");

      fireEvent.dragOver(dropArea!);

      expect(screen.getByText(/Solte os arquivos aqui/i)).toBeInTheDocument();
    });

    it("should handle drag leave event", () => {
      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const dropArea = screen.getByText(/Arraste arquivos/i).closest("div");

      fireEvent.dragOver(dropArea!);
      fireEvent.dragLeave(dropArea!);

      expect(screen.getByText(/Arraste arquivos ou clique para selecionar/i)).toBeInTheDocument();
    });

    it("should handle file drop", async () => {
      const validFile = createMockFile("dropped.jpg", 2 * 1024 * 1024, "image/jpeg");

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} />);

      const dropArea = screen.getByText(/Arraste arquivos/i).closest("div");

      const dropEvent = new Event("drop", { bubbles: true });
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          files: [validFile],
        },
      });

      fireEvent(dropArea!, dropEvent);

      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalledWith([validFile]);
      });
    });
  });

  describe("File Management", () => {
    it("should enforce max files limit", async () => {
      const files = Array.from({ length: 6 }, (_, i) =>
        createMockFile(`test${i}.jpg`, 1024 * 1024, "image/jpeg")
      );

      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} maxFiles={5} />);

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: files,
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/Máximo de 5 arquivos permitidos/i)).toBeInTheDocument();
      });

      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    it("should disable file selection when disabled prop is true", () => {
      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} disabled={true} />);

      const input = getFileInput();

      expect(input).toBeDisabled();
    });

    it("should not accept drag and drop when disabled", () => {
      render(<AttachmentUpload onFilesSelected={mockOnFilesSelected} disabled={true} />);

      const dropArea = screen.getByText(/Arraste arquivos/i).closest("div");

      fireEvent.dragOver(dropArea!);

      // Should not show "drop here" message when disabled
      expect(screen.queryByText(/Solte os arquivos aqui/i)).not.toBeInTheDocument();
    });
  });
});
