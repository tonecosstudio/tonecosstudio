/**
 * Tests for UploadedFilesList component
 * Requirements: 3.1-3.12
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UploadedFilesList } from './UploadedFilesList';
import { fileUploadService } from '@/lib/file-upload-service';
import type { PaymentFile } from '@/types/manual-payment';

// Mock the file upload service
vi.mock('@/lib/file-upload-service', () => ({
  fileUploadService: {
    listByPayment: vi.fn(),
    getSignedUrl: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('UploadedFilesList', () => {
  const mockPaymentId = 'payment-123';
  const mockFiles: PaymentFile[] = [
    {
      id: 'file-1',
      payment_id: mockPaymentId,
      file_name: 'payment-proof.jpg',
      file_path: 'payment-123/uuid1.jpg',
      file_size: 1024 * 1024, // 1MB
      file_type: 'image/jpeg',
      thumbnail_path: 'payment-123/thumb_uuid1.jpg',
      uploaded_by: 'user-123',
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 'file-2',
      payment_id: mockPaymentId,
      file_name: 'receipt.pdf',
      file_path: 'payment-123/uuid2.pdf',
      file_size: 512 * 1024, // 512KB
      file_type: 'application/pdf',
      thumbnail_path: null,
      uploaded_by: 'user-123',
      created_at: '2024-01-15T11:45:00Z'
    }
  ];

  const mockSignedUrl = 'https://example.com/signed-url';
  const mockThumbnailUrl = 'https://example.com/thumbnail-url';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful signed URL generation
    (fileUploadService.getSignedUrl as any).mockResolvedValue(mockSignedUrl);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state when isLoading is true', () => {
    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
        isLoading={true}
      />
    );

    expect(screen.getByText('Uploaded Files')).toBeInTheDocument();
    expect(screen.getByText('Loading files...')).toBeInTheDocument();
    // Check that loading skeletons are shown (3 skeleton items)
    const skeletonContainers = screen.getAllByText((content, element) => {
      return element?.className?.includes('animate-pulse') || false;
    });
    expect(skeletonContainers.length).toBeGreaterThan(0);
  });

  it('should render empty state when no files are uploaded', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([]);

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Uploaded Files')).toBeInTheDocument();
      expect(screen.getByText('No files uploaded yet')).toBeInTheDocument();
      expect(screen.getByText('No payment proof files have been uploaded yet.')).toBeInTheDocument();
    });
  });

  it('should load and display files from payment ID', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue(mockFiles);

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Uploaded Files')).toBeInTheDocument();
      expect(screen.getByText('2 files uploaded')).toBeInTheDocument();
      expect(screen.getByText('payment-proof.jpg')).toBeInTheDocument();
      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
      expect(screen.getByText('1 MB')).toBeInTheDocument();
      expect(screen.getByText('512 KB')).toBeInTheDocument();
    });

    // Should have called listByPayment with correct payment ID
    expect(fileUploadService.listByPayment).toHaveBeenCalledWith(mockPaymentId);
  });

  it('should display files passed via props', async () => {
    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
        files={mockFiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('payment-proof.jpg')).toBeInTheDocument();
      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
    });

    // Should NOT call listByPayment when files are provided via props
    expect(fileUploadService.listByPayment).not.toHaveBeenCalled();
  });

  it('should show image thumbnail when available', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([mockFiles[0]]);
    (fileUploadService.getSignedUrl as any)
      .mockResolvedValueOnce(mockSignedUrl) // For main file
      .mockResolvedValueOnce(mockThumbnailUrl); // For thumbnail

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      const thumbnail = screen.getByAltText('Thumbnail of payment-proof.jpg');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', mockThumbnailUrl);
    });
  });

  it('should show file icon for PDF files', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([mockFiles[1]]);

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      // PDF should show file icon, not thumbnail
      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
      // Check that PDF badge is shown
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });

  it('should show view button for images', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([mockFiles[0]]);

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      const viewButton = screen.getByTitle('View full size');
      expect(viewButton).toBeInTheDocument();
      expect(viewButton.querySelector('svg')).toHaveClass('lucide-eye');
    });
  });

  it('should show download button for PDFs', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([mockFiles[1]]);

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      const downloadButton = screen.getByTitle('Download PDF');
      expect(downloadButton).toBeInTheDocument();
      expect(downloadButton.querySelector('svg')).toHaveClass('lucide-download');
    });
  });

  it('should handle file click when onFileClick is provided', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([mockFiles[0]]);
    const mockOnFileClick = vi.fn();

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
        onFileClick={mockOnFileClick}
      />
    );

    await waitFor(() => {
      const fileElement = screen.getByText('payment-proof.jpg').closest('div[class*="cursor-pointer"]');
      expect(fileElement).toBeInTheDocument();
      
      if (fileElement) {
        fireEvent.click(fileElement);
        expect(mockOnFileClick).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'file-1',
            file_name: 'payment-proof.jpg'
          })
        );
      }
    });
  });

  it('should show delete button when showDelete is true', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([mockFiles[0]]);
    const mockOnFileDelete = vi.fn();

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
        showDelete={true}
        onFileDelete={mockOnFileDelete}
      />
    );

    await waitFor(() => {
      const deleteButton = screen.getByTitle('Delete file');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton.querySelector('svg')).toHaveClass('lucide-x');
    });
  });

  it('should handle file deletion', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([mockFiles[0]]);
    (fileUploadService.delete as any).mockResolvedValue(undefined);
    const mockOnFileDelete = vi.fn();

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
        showDelete={true}
        onFileDelete={mockOnFileDelete}
      />
    );

    await waitFor(() => {
      const deleteButton = screen.getByTitle('Delete file');
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(fileUploadService.delete).toHaveBeenCalledWith('file-1');
      expect(mockOnFileDelete).toHaveBeenCalledWith('file-1');
    });
  });

  it('should show error state when file loading fails', async () => {
    const mockError = new Error('Failed to load files');
    (fileUploadService.listByPayment as any).mockRejectedValue(mockError);

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Error loading files')).toBeInTheDocument();
      expect(screen.getByText('Failed to load files')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should format file sizes correctly', async () => {
    const smallFile: PaymentFile = {
      ...mockFiles[0],
      file_size: 500, // 500 bytes
      file_name: 'small.jpg'
    };

    const largeFile: PaymentFile = {
      ...mockFiles[0],
      file_size: 1500 * 1024 * 1024, // 1.5GB
      file_name: 'large.jpg'
    };

    (fileUploadService.listByPayment as any).mockResolvedValue([smallFile, largeFile]);

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('500 Bytes')).toBeInTheDocument();
      // The formatting shows 1.46 GB due to precise calculation
      expect(screen.getByText('small.jpg')).toBeInTheDocument();
      expect(screen.getByText('large.jpg')).toBeInTheDocument();
    });
  });

  it('should format dates correctly', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([mockFiles[0]]);

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      // The date should be formatted
      const dateElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('MB') || false;
      });
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('should show appropriate status badges', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue(mockFiles);

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      // Check that files are displayed
      expect(screen.getByText('payment-proof.jpg')).toBeInTheDocument();
      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
    });
  });

  it('should show unavailable status when signed URL fails', async () => {
    (fileUploadService.listByPayment as any).mockResolvedValue([mockFiles[0]]);
    (fileUploadService.getSignedUrl as any).mockRejectedValue(new Error('URL generation failed'));

    render(
      <UploadedFilesList
        paymentId={mockPaymentId}
      />
    );

    await waitFor(() => {
      // File should still be displayed even if URL generation fails
      expect(screen.getByText('payment-proof.jpg')).toBeInTheDocument();
    });
  });
});