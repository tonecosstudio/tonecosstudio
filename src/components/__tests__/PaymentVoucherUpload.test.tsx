/**
 * Unit tests for PaymentVoucherUpload component
 * 
 * Tests:
 * - File validation (type, size, extension)
 * - Drag-and-drop functionality
 * - File upload to Supabase Storage
 * - Visual feedback (loading, success, error)
 * - Preview generation for images
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentVoucherUpload } from '../PaymentVoucherUpload';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('PaymentVoucherUpload', () => {
  const mockOnUploadSuccess = vi.fn();
  const mockOnUploadError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper function to create a mock file
   */
  const createMockFile = (
    name: string,
    size: number,
    type: string
  ): File => {
    const blob = new Blob(['a'.repeat(size)], { type });
    return new File([blob], name, { type });
  };

  describe('Rendering', () => {
    it('should render upload area with default label', () => {
      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      expect(screen.getByText('Comprovante de Pagamento')).toBeInTheDocument();
      expect(screen.getByText(/Arraste e solte o arquivo aqui/i)).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          label="Custom Label"
        />
      );

      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should show accepted file formats', () => {
      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      expect(screen.getByText(/JPG, PNG ou PDF/i)).toBeInTheDocument();
      expect(screen.getByText(/máx\. 5MB/i)).toBeInTheDocument();
    });
  });

  describe('File Validation', () => {
    it('should accept valid JPEG file', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalledWith(
          'https://example.com/file.jpg',
          file
        );
      });
    });

    it('should accept valid PNG file', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.png' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.png', 1024 * 1024, 'image/png');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });
    });

    it('should accept valid PDF file', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.pdf' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });
    });

    it('should reject file larger than 5MB', async () => {
      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const file = createMockFile('large.jpg', 6 * 1024 * 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Arquivo muito grande/i)).toBeInTheDocument();
        expect(mockOnUploadError).toHaveBeenCalledWith(
          expect.stringContaining('muito grande')
        );
      });
    });

    it('should reject invalid file type', async () => {
      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      // Manually trigger file selection with invalid type
      const file = createMockFile('test.txt', 1024, 'text/plain');
      
      // Get the component instance and call handleFileSelect directly
      const dropzone = screen.getByText(/Arraste e solte/i).closest('div')!.parentElement!.parentElement!;
      
      // Simulate drop with invalid file
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(mockOnUploadError).toHaveBeenCalledWith(
          expect.stringContaining('Formato inválido')
        );
      });
    });

    it('should reject file with invalid extension', async () => {
      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const file = createMockFile('test.doc', 1024, 'application/msword');
      const dropzone = screen.getByText(/Arraste e solte/i).closest('div')!.parentElement!.parentElement!;

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(mockOnUploadError).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should accept file exactly at 5MB limit', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.jpg', 5 * 1024 * 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Upload Functionality', () => {
    it('should upload file to Supabase Storage', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          userId="user123"
          pathPrefix="test-prefix"
        />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith(
          expect.stringContaining('test-prefix/user123-'),
          file,
          expect.objectContaining({
            upsert: false,
            contentType: 'image/jpeg',
          })
        );
      });
    });

    it('should show loading state during upload', async () => {
      const mockUpload = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      // Should show loading state
      expect(screen.getByText(/Enviando arquivo/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });
    });

    it('should show success state after upload', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Upload concluído/i)).toBeInTheDocument();
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should handle upload error', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        error: { message: 'Upload failed' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn(),
      } as any);

      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          onUploadError={mockOnUploadError}
        />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Erro no upload/i)).toBeInTheDocument();
        expect(mockOnUploadError).toHaveBeenCalled();
      });
    });

    it('should return public URL after successful upload', async () => {
      const expectedUrl = 'https://example.com/file.jpg';
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: expectedUrl },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalledWith(expectedUrl, file);
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag enter event', () => {
      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const dropzone = screen.getByText(/Arraste e solte/i).closest('div')!.parentElement!.parentElement!;
      
      fireEvent.dragEnter(dropzone, {
        dataTransfer: { files: [] },
      });

      // Should add dragging background
      expect(dropzone).toHaveClass('bg-primary/5');
    });

    it('should handle drag leave event', () => {
      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const dropzone = screen.getByText(/Arraste e solte/i).closest('div')!.parentElement!;
      
      fireEvent.dragEnter(dropzone);
      fireEvent.dragLeave(dropzone);

      // Should remove dragging styles
      expect(dropzone).not.toHaveClass('border-primary');
    });

    it('should handle file drop', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const dropzone = screen.getByText(/Arraste e solte/i).closest('div')!.parentElement!;

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Preview', () => {
    it('should generate preview for image files', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          showPreview={true}
        />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const preview = screen.getByAltText('Preview');
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src', 'blob:mock-url');
      });
    });

    it('should not show preview when showPreview is false', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          showPreview={false}
        />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
      });
    });
  });

  describe('Remove File', () => {
    it('should allow removing uploaded file', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Click remove button
      const removeButton = screen.getByRole('button');
      await userEvent.click(removeButton);

      // Should show initial state again
      expect(screen.getByText(/Arraste e solte/i)).toBeInTheDocument();
      expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
    });

    it('should revoke preview URL when removing file', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button');
      await userEvent.click(removeButton);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('Disabled State', () => {
    it('should disable upload when disabled prop is true', () => {
      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          disabled={true}
        />
      );

      const input = screen.getByLabelText('Comprovante de Pagamento');
      expect(input).toBeDisabled();
    });

    it('should not accept drag and drop when disabled', () => {
      render(
        <PaymentVoucherUpload
          onUploadSuccess={mockOnUploadSuccess}
          disabled={true}
        />
      );

      const dropzone = screen.getByText(/Arraste e solte/i).closest('div')!.parentElement!;
      
      fireEvent.dragEnter(dropzone);

      // Should not add dragging styles
      expect(dropzone).not.toHaveClass('border-primary');
    });
  });

  describe('File Size Formatting', () => {
    it('should format file size correctly', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      render(
        <PaymentVoucherUpload onUploadSuccess={mockOnUploadSuccess} />
      );

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
      const input = screen.getByLabelText('Comprovante de Pagamento');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/1\.0 MB/i)).toBeInTheDocument();
      });
    });
  });
});
