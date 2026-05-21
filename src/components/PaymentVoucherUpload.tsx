/**
 * PaymentVoucherUpload Component
 * 
 * Reusable component for uploading payment vouchers (proof of payment)
 * Supports drag-and-drop, file validation, and Supabase Storage upload
 * 
 * Requirements: 25.1, 25.2
 * 
 * Features:
 * - Drag-and-drop file upload
 * - File type validation (JPG, PNG, PDF)
 * - File size validation (max 5MB)
 * - Upload to Supabase Storage
 * - Visual feedback (loading, success, error)
 * - Preview for uploaded files
 */

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePaymentVoucherStorage } from '@/hooks/payments/usePaymentVoucherStorage';

export interface PaymentVoucherUploadProps {
  /** Callback when file is successfully uploaded */
  onUploadSuccess: (url: string, file: File) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Optional user ID for organizing files */
  userId?: string;
  /** Optional prefix for file path */
  pathPrefix?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Optional CSS class name */
  className?: string;
  /** Optional label text */
  label?: string;
  /** Show preview of uploaded file */
  showPreview?: boolean;
}

export interface UploadState {
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
  url: string | null;
  preview: string | null;
}

/**
 * PaymentVoucherUpload Component
 */
export const PaymentVoucherUpload: React.FC<PaymentVoucherUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  userId,
  pathPrefix = 'vouchers',
  disabled = false,
  className,
  label = 'Comprovante de Pagamento',
  showPreview = true,
}) => {
  const [state, setState] = useState<UploadState>({
    file: null,
    uploading: false,
    uploaded: false,
    error: null,
    url: null,
    preview: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { validatePaymentVoucherFile, uploadPaymentVoucherToStorage } = usePaymentVoucherStorage({
    userId,
    pathPrefix,
  });

  /**
   * Validate file type and size using centralized validation
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    return validatePaymentVoucherFile(file);
  };

  /**
   * Generate preview URL for image files
   */
  const generatePreview = (file: File): string | null => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  /**
   * Upload file to Supabase Storage with sanitized filename
   */
  const uploadToStorage = async (file: File): Promise<string> => {
    return uploadPaymentVoucherToStorage(file);
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = async (file: File) => {
    // Reset state
    setState({
      file: null,
      uploading: false,
      uploaded: false,
      error: null,
      url: null,
      preview: null,
    });

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setState(prev => ({
        ...prev,
        error: validation.error || 'Arquivo inválido',
      }));
      if (onUploadError) {
        onUploadError(validation.error || 'Arquivo inválido');
      }
      return;
    }

    // Generate preview
    const preview = generatePreview(file);

    // Set file and start upload
    setState(prev => ({
      ...prev,
      file,
      uploading: true,
      preview,
    }));

    try {
      // Upload to storage
      const url = await uploadToStorage(file);

      // Update state
      setState(prev => ({
        ...prev,
        uploading: false,
        uploaded: true,
        url,
      }));

      // Call success callback
      onUploadSuccess(url, file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload';
      setState(prev => ({
        ...prev,
        uploading: false,
        error: errorMessage,
      }));
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  /**
   * Handle file input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle drag events
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !state.uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || state.uploading) {
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle click to open file dialog
   */
  const handleClick = () => {
    if (!disabled && !state.uploading) {
      fileInputRef.current?.click();
    }
  };

  /**
   * Handle remove file
   */
  const handleRemove = () => {
    // Revoke preview URL if exists
    if (state.preview) {
      URL.revokeObjectURL(state.preview);
    }

    setState({
      file: null,
      uploading: false,
      uploaded: false,
      error: null,
      url: null,
      preview: null,
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all',
          'hover:border-primary/50 cursor-pointer',
          isDragging && 'border-primary bg-primary/5',
          state.uploading && 'opacity-50 cursor-not-allowed',
          disabled && 'opacity-50 cursor-not-allowed',
          state.error && 'border-destructive',
          state.uploaded && 'border-green-500',
          !state.error && !state.uploaded && 'border-gray-300'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleInputChange}
          disabled={disabled || state.uploading}
          className="hidden"
          aria-label={label}
        />

        {/* Content */}
        <div className="p-6">
          {/* No file selected */}
          {!state.file && !state.error && (
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                Arraste e solte o arquivo aqui ou clique para selecionar
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG ou PDF (máx. 5MB)
              </p>
            </div>
          )}

          {/* File selected - uploading */}
          {state.file && state.uploading && (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-3" />
              <p className="text-sm text-gray-600 mb-1">Enviando arquivo...</p>
              <p className="text-xs text-gray-500">{state.file.name}</p>
            </div>
          )}

          {/* File uploaded successfully */}
          {state.file && state.uploaded && !state.error && (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {state.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(state.file.size)} • Upload concluído
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  disabled={disabled}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Preview */}
              {showPreview && state.preview && (
                <div className="mt-3">
                  <img
                    src={state.preview}
                    alt="Preview"
                    className="max-w-full h-auto max-h-48 rounded border border-gray-200"
                  />
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {state.error && (
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-3" />
              <p className="text-sm text-destructive mb-1">Erro no upload</p>
              <p className="text-xs text-gray-500">{state.error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="mt-3"
              >
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Help text */}
      <p className="mt-2 text-xs text-gray-500">
        Formatos aceitos: JPG, PNG, PDF • Tamanho máximo: 5MB
      </p>
    </div>
  );
};

export default PaymentVoucherUpload;
