// @ts-nocheck
/**
 * Custom Hook for Secure File Upload
 * 
 * Handles file validation, malware detection, and image processing
 * with proper error handling and user feedback.
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  validateImageFile,
  detectPotentialMalware,
  processImage,
  ImageProcessingOptions
} from '@/lib/security/image-processor';
import { sanitizeFilename } from '@/lib/security/input-sanitizer';
import { checkRateLimit, RATE_LIMITS, getUserRateLimitKey } from '@/lib/security/rate-limiter';
import { errorTracking, ErrorSeverity } from '@/lib/error-tracking';

export interface UseSecureFileUploadOptions {
  userId?: string;
  maxFiles?: number;
  processingOptions?: ImageProcessingOptions;
  onSuccess?: (files: File[]) => void;
  onError?: (error: Error) => void;
}

export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  processedFiles: File[];
}

/**
 * Hook for secure file upload
 * 
 * @param options - Upload options
 * @returns Upload state and handlers
 */
export function useSecureFileUpload({
  userId,
  maxFiles = 10,
  processingOptions = {},
  onSuccess,
  onError
}: UseSecureFileUploadOptions = {}) {
  const { toast } = useToast();
  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    processedFiles: []
  });

  const validateAndProcessFile = useCallback(async (file: File): Promise<File | null> => {
    try {
      // 1. Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({
          title: 'Arquivo inválido',
          description: validation.error,
          variant: 'destructive'
        });
        return null;
      }

      // 2. Check for malware
      const isSuspicious = await detectPotentialMalware(file);
      if (isSuspicious) {
        toast({
          title: 'Arquivo suspeito',
          description: 'O arquivo foi rejeitado por motivos de segurança.',
          variant: 'destructive'
        });
        errorTracking.log(
          'Suspicious file detected',
          ErrorSeverity.WARNING,
          { filename: file.name, size: file.size }
        );
        return null;
      }

      // 3. Process image (remove EXIF, resize, compress)
      const processedBlob = await processImage(file, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 85,
        format: 'webp',
        removeMetadata: true,
        ...processingOptions
      });

      // 4. Create new File with sanitized name
      const safeName = sanitizeFilename(file.name);
      const processedFile = new File([processedBlob], safeName, {
        type: processedBlob.type
      });

      return processedFile;
    } catch (error) {
      errorTracking.trackError(error as Error);
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Não foi possível processar o arquivo. Tente novamente.',
        variant: 'destructive'
      });
      return null;
    }
  }, [processingOptions, toast]);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    // Check rate limit
    if (userId) {
      const rateLimitKey = getUserRateLimitKey(userId, 'upload');
      const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.upload);

      if (!rateLimit.allowed) {
        toast({
          title: 'Muitos uploads',
          description: `Aguarde ${rateLimit.retryAfter} segundos antes de fazer outro upload.`,
          variant: 'destructive'
        });
        return;
      }
    }

    // Check max files
    const fileArray = Array.from(files);
    if (fileArray.length > maxFiles) {
      toast({
        title: 'Muitos arquivos',
        description: `Você pode enviar no máximo ${maxFiles} arquivos por vez.`,
        variant: 'destructive'
      });
      return;
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null
    }));

    try {
      const processedFiles: File[] = [];
      const totalFiles = fileArray.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = fileArray[i];
        
        // Update progress
        setState(prev => ({
          ...prev,
          progress: Math.round(((i + 1) / totalFiles) * 100)
        }));

        // Validate and process
        const processedFile = await validateAndProcessFile(file);
        if (processedFile) {
          processedFiles.push(processedFile);
        }
      }

      if (processedFiles.length === 0) {
        throw new Error('Nenhum arquivo foi processado com sucesso');
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        processedFiles
      }));

      toast({
        title: 'Arquivos processados',
        description: `${processedFiles.length} de ${totalFiles} arquivos processados com sucesso.`
      });

      onSuccess?.(processedFiles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage
      }));

      toast({
        title: 'Erro no upload',
        description: errorMessage,
        variant: 'destructive'
      });

      onError?.(error as Error);
    }
  }, [userId, maxFiles, validateAndProcessFile, toast, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      processedFiles: []
    });
  }, []);

  return {
    ...state,
    uploadFiles,
    reset
  };
}
