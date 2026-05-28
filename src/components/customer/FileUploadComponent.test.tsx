import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FileUploadComponent } from "./FileUploadComponent";
import { fileUploadService } from "@/lib/file-upload-service";
import type { PaymentFile } from "@/types/manual-payment";

vi.mock("@/lib/file-upload-service", () => ({
  fileUploadService: {
    upload: vi.fn(),
  },
}));

const mockPaymentId = "test-payment-123";

const uploadedFile: PaymentFile = {
  created_at: "2024-01-01T00:00:00Z",
  file_name: "proof.pdf",
  file_path: "payment/proof.pdf",
  file_size: 1024,
  file_type: "application/pdf",
  id: "uploaded-123",
  payment_id: mockPaymentId,
  thumbnail_path: null,
  uploaded_by: "user-123",
};

function createFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

function getPrimaryFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"][multiple]');

  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Primary file input not found");
  }

  return input;
}

function mockCameraSupport(supported: boolean) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: supported ? { getUserMedia: vi.fn() } : undefined,
  });
}

describe("FileUploadComponent", () => {
  const onUploadComplete = vi.fn();
  const onError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCameraSupport(true);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("renders the upload component with title and description", () => {
    render(
      <FileUploadComponent
        paymentId={mockPaymentId}
        onUploadComplete={onUploadComplete}
        onError={onError}
      />
    );

    expect(screen.getByText("Upload Payment Proof")).toBeInTheDocument();
    expect(
      screen.getByText(/Upload images or PDFs of your payment confirmation/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Maximum 5 files, 5MB each/)).toBeInTheDocument();
  });

  it("displays file stats badge when no files are selected", () => {
    render(<FileUploadComponent paymentId={mockPaymentId} />);

    expect(screen.getByText("0 / 5 files")).toBeInTheDocument();
  });

  it("shows browse files and take photo buttons when camera is supported", () => {
    render(<FileUploadComponent paymentId={mockPaymentId} />);

    expect(screen.getByText("Browse Files")).toBeInTheDocument();
    expect(screen.getByText("Take Photo")).toBeInTheDocument();
  });

  it("displays supported file types information", () => {
    render(<FileUploadComponent paymentId={mockPaymentId} />);

    expect(screen.getByText(/Supported: JPG, PNG, PDF/)).toBeInTheDocument();
    expect(screen.getByText(/Max 5MB each/)).toBeInTheDocument();
  });

  it("disables upload button when no files are selected", () => {
    render(<FileUploadComponent paymentId={mockPaymentId} />);

    expect(screen.getByRole("button", { name: /Upload Files/i })).toBeDisabled();
  });

  it("shows clear all button when files are selected", async () => {
    const { container } = render(<FileUploadComponent paymentId={mockPaymentId} />);

    fireEvent.change(getPrimaryFileInput(container), {
      target: { files: [createFile("proof.pdf", "application/pdf")] },
    });

    expect(await screen.findByText("proof.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear All/i })).toBeInTheDocument();
  });

  it("handles file validation errors for oversized files", async () => {
    const { container } = render(
      <FileUploadComponent paymentId={mockPaymentId} maxSizeBytes={10} />
    );

    fireEvent.change(getPrimaryFileInput(container), {
      target: { files: [createFile("large.pdf", "application/pdf", 11)] },
    });

    expect(await screen.findByText(/large\.pdf.*too large/i)).toBeInTheDocument();
  });

  it("handles file validation errors for invalid file types", async () => {
    const { container } = render(<FileUploadComponent paymentId={mockPaymentId} />);

    fireEvent.change(getPrimaryFileInput(container), {
      target: { files: [createFile("script.txt", "text/plain")] },
    });

    expect(await screen.findByText(/script\.txt.*invalid file type/i)).toBeInTheDocument();
    expect(screen.getByText(/script\.txt.*unsupported file extension/i)).toBeInTheDocument();
  });

  it("prevents selecting more than max files", async () => {
    const { container } = render(<FileUploadComponent paymentId={mockPaymentId} maxFiles={1} />);

    fireEvent.change(getPrimaryFileInput(container), {
      target: {
        files: [
          createFile("proof-1.pdf", "application/pdf"),
          createFile("proof-2.pdf", "application/pdf"),
        ],
      },
    });

    expect(await screen.findByText(/Maximum of 1 files allowed/)).toBeInTheDocument();
  });

  it("calls onUploadComplete when files are uploaded successfully", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FileUploadComponent
        paymentId={mockPaymentId}
        onUploadComplete={onUploadComplete}
        onError={onError}
      />
    );
    vi.mocked(fileUploadService.upload).mockResolvedValue(uploadedFile);

    fireEvent.change(getPrimaryFileInput(container), {
      target: { files: [createFile("proof.pdf", "application/pdf")] },
    });
    await user.click(await screen.findByRole("button", { name: /Upload Files/i }));

    await waitFor(() => {
      expect(fileUploadService.upload).toHaveBeenCalledWith(
        mockPaymentId,
        expect.any(File),
        expect.any(Function)
      );
    });
    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith([uploadedFile]);
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError when upload fails", async () => {
    const user = userEvent.setup();
    const uploadError = new Error("Upload failed");
    const { container } = render(
      <FileUploadComponent
        paymentId={mockPaymentId}
        onUploadComplete={onUploadComplete}
        onError={onError}
      />
    );
    vi.mocked(fileUploadService.upload).mockRejectedValue(uploadError);

    fireEvent.change(getPrimaryFileInput(container), {
      target: { files: [createFile("proof.pdf", "application/pdf")] },
    });
    await user.click(await screen.findByRole("button", { name: /Upload Files/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(uploadError);
    });
    expect(onUploadComplete).not.toHaveBeenCalled();
  });

  it("displays upload progress during file upload", async () => {
    const user = userEvent.setup();
    let resolveUpload: (file: PaymentFile) => void = () => undefined;
    const { container } = render(<FileUploadComponent paymentId={mockPaymentId} />);

    vi.mocked(fileUploadService.upload).mockImplementation((_paymentId, _file, onProgress) => {
      onProgress?.(50);
      return new Promise((resolve) => {
        resolveUpload = resolve;
      });
    });

    fireEvent.change(getPrimaryFileInput(container), {
      target: { files: [createFile("proof.pdf", "application/pdf")] },
    });
    await user.click(await screen.findByRole("button", { name: /Upload Files/i }));

    expect(await screen.findByText("50%")).toBeInTheDocument();

    resolveUpload(uploadedFile);
  });

  it("disables component when disabled prop is true", () => {
    render(<FileUploadComponent paymentId={mockPaymentId} disabled />);

    const dropzone = screen.getByRole("button", { name: /Drag & drop files here/i });
    expect(dropzone).toHaveAttribute("aria-disabled", "true");
    expect(dropzone).toHaveClass("cursor-not-allowed");
    expect(dropzone).toHaveClass("opacity-50");
  });

  it("shows camera button only when mobile camera is supported", () => {
    mockCameraSupport(false);

    render(<FileUploadComponent paymentId={mockPaymentId} />);

    expect(screen.queryByText("Take Photo")).not.toBeInTheDocument();
  });
});
