/**
 * PhotoUploadComponent
 *
 * Reusable component for uploading photos to production stages with:
 * - Drag-and-drop file upload
 * - Image preview before upload
 * - Image compression before upload
 * - Upload to Supabase Storage
 * - Store URLs in production_stages.photos
 *
 * Task: 4.4.1 Create PhotoUploadComponent
 */

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { validateFileUpload, sanitizeFilename, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/security/input-sanitizer";

// ============================================================================
// Types
// ============================================================================

export interface PhotoMetadata {
  url: string;
  customerVisible: boolean;
  caption?: string;
}

export interface PhotoUploadComponentProps {
  /** Maximum number of photos allowed */
  maxPhotos?: number;
  /** Current photos (URLs or metadata) */
  currentPhotos?: string[] | PhotoMetadata[];
  /** Callback when photos are uploaded */
  onPhotosChange: (urls: string[]) => void;
  /** Callback when photos with metadata are uploaded */
  onPhotosWithMetadataChange?: (photos: PhotoMetadata[]) => void;
  /** Storage bucket name */
  bucket?: string;
  /** Storage folder path */
  folder?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Optional CSS class name */
  className?: string;
  /** Label text */
  label?: string;
  /** Show help text */
  showHelpText?: boolean;
  /** Allow marking photos as customer-visible */
  allowCustomerVisibleToggle?: boolean;
  /** Default value for customer-visible flag */
  defaultCustomerVisible?: boolean;
}

interface PhotoItem {
  id: string;
  file?: File;
  url?: string;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  customerVisible: boolean;
  caption?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB before compression
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1, // Compress to max 1MB
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

// ============================================================================
// Component
// ============================================================================

export const PhotoUploadComponent: React.FC<PhotoUploadComponentProps> = ({
  maxPhotos = 5,
  currentPhotos = [],
  onPhotosChange,
  onPhotosWithMetadataChange,
  bucket = "production-photos",
  folder = "stages",
  disabled = false,
  className,
  label = "Fotos",
  showHelpText = true,
  allowCustomerVisibleToggle = false,
  defaultCustomerVisible = false,
}) => {
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    currentPhotos.map((photo, index) => {
      if (typeof photo === 'string') {
        return {
          id: `existing-${index}`,
          url: photo,
          preview: photo,
          uploading: false,
          uploaded: true,
          customerVisible: defaultCustomerVisible,
        };
      } else {
        return {
          id: `existing-${index}`,
          url: photo.url,
          preview: photo.url,
          uploading: false,
          uploaded: true,
          customerVisible: photo.customerVisible,
          caption: photo.caption,
        };
      }
    })
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Use centralized validation with dangerous file blocklist
    return validateFileUpload(file, ALLOWED_TYPES as readonly string[], MAX_FILE_SIZE);
  };

  // ============================================================================
  // Image Compression
  // ============================================================================

  const compressImage = async (file: File): Promise<File> => {
    try {
      const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
      return compressedFile;
    } catch (error) {
      console.error("Error compressing image:", error);
      // If compression fails, return original file
      return file;
    }
  };

  // ============================================================================
  // Upload to Supabase Storage
  // ============================================================================

  const uploadToStorage = async (file: File): Promise<string> => {
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${timestamp}-${randomId}.${extension}`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return publicUrl;
  };

  // ============================================================================
  // File Processing
  // ============================================================================

  const processFile = async (file: File): Promise<void> => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "Arquivo Inválido",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Check if we've reached the limit
    if (photos.length >= maxPhotos) {
      toast({
        title: "Limite Atingido",
        description: `Você pode adicionar no máximo ${maxPhotos} fotos.`,
        variant: "destructive",
      });
      return;
    }

    // Create photo item with preview
    const photoId = `new-${Date.now()}-${Math.random()}`;
    const preview = URL.createObjectURL(file);

    const newPhoto: PhotoItem = {
      id: photoId,
      file,
      preview,
      uploading: true,
      uploaded: false,
      customerVisible: defaultCustomerVisible,
    };

    setPhotos((prev) => [...prev, newPhoto]);

    try {
      // Compress image
      const compressedFile = await compressImage(file);

      // Upload to storage
      const url = await uploadToStorage(compressedFile);

      // Update photo item
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? {
                ...p,
                url,
                uploading: false,
                uploaded: true,
              }
            : p
        )
      );

      // Update parent component
      const updatedUrls = [...photos.filter((p) => p.uploaded && p.url).map((p) => p.url!), url];
      onPhotosChange(updatedUrls);

      // If metadata callback is provided, send metadata too
      if (onPhotosWithMetadataChange) {
        const updatedPhotosWithMetadata: PhotoMetadata[] = [
          ...photos.filter((p) => p.uploaded && p.url).map((p) => ({
            url: p.url!,
            customerVisible: p.customerVisible,
            caption: p.caption,
          })),
          {
            url,
            customerVisible: defaultCustomerVisible,
          },
        ];
        onPhotosWithMetadataChange(updatedPhotosWithMetadata);
      }

      toast({
        title: "Upload Concluído",
        description: "Foto enviada com sucesso!",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

      // Update photo item with error
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? {
                ...p,
                uploading: false,
                uploaded: false,
                error: errorMessage,
              }
            : p
        )
      );

      toast({
        title: "Erro no Upload",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      processFile(file);
    });

    // Reset input
    event.target.value = "";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
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

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      processFile(file);
    });
  };

  const handleRemovePhoto = (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    // Revoke preview URL if it's a blob
    if (photo.preview.startsWith("blob:")) {
      URL.revokeObjectURL(photo.preview);
    }

    // Remove from state
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));

    // Update parent component
    const updatedUrls = photos
      .filter((p) => p.id !== photoId && p.uploaded && p.url)
      .map((p) => p.url!);
    onPhotosChange(updatedUrls);

    // If metadata callback is provided, send metadata too
    if (onPhotosWithMetadataChange) {
      const updatedPhotosWithMetadata: PhotoMetadata[] = photos
        .filter((p) => p.id !== photoId && p.uploaded && p.url)
        .map((p) => ({
          url: p.url!,
          customerVisible: p.customerVisible,
          caption: p.caption,
        }));
      onPhotosWithMetadataChange(updatedPhotosWithMetadata);
    }
  };

  const handleToggleCustomerVisible = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId ? { ...p, customerVisible: !p.customerVisible } : p
      )
    );

    // Update parent component with new metadata
    if (onPhotosWithMetadataChange) {
      const updatedPhotosWithMetadata: PhotoMetadata[] = photos.map((p) =>
        p.id === photoId
          ? {
              url: p.url!,
              customerVisible: !p.customerVisible,
              caption: p.caption,
            }
          : {
              url: p.url!,
              customerVisible: p.customerVisible,
              caption: p.caption,
            }
      ).filter((p) => p.url);
      onPhotosWithMetadataChange(updatedPhotosWithMetadata);
    }
  };

  const handleRetryUpload = (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo || !photo.file) return;

    // Remove error state and retry
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    processFile(photo.file);
  };

  const handleClickUpload = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const canAddMore = photos.length < maxPhotos;
  const uploadingCount = photos.filter((p) => p.uploading).length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Label */}
      {label && (
        <Label>
          {label} ({photos.filter((p) => p.uploaded).length}/{maxPhotos})
        </Label>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
            >
              {/* Image Preview */}
              <img
                src={photo.preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />

              {/* Uploading Overlay */}
              {photo.uploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white mb-2" />
                  <span className="text-xs text-white">Comprimindo e enviando...</span>
                </div>
              )}

              {/* Error Overlay */}
              {photo.error && (
                <div className="absolute inset-0 bg-destructive/90 flex flex-col items-center justify-center p-2">
                  <AlertCircle className="h-6 w-6 text-destructive-foreground mb-2" />
                  <span className="text-xs text-destructive-foreground text-center mb-2">
                    {photo.error}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRetryUpload(photo.id)}
                    disabled={disabled}
                  >
                    Tentar Novamente
                  </Button>
                </div>
              )}

              {/* Remove Button */}
              {!photo.uploading && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Customer Visible Toggle */}
              {allowCustomerVisibleToggle && !photo.uploading && photo.uploaded && (
                <button
                  type="button"
                  onClick={() => handleToggleCustomerVisible(photo.id)}
                  className={cn(
                    "absolute bottom-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
                    photo.customerVisible
                      ? "bg-green-500 text-white"
                      : "bg-gray-500 text-white"
                  )}
                  disabled={disabled}
                  title={
                    photo.customerVisible
                      ? "Visível para clientes"
                      : "Visível apenas para admins"
                  }
                >
                  {photo.customerVisible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg transition-all cursor-pointer",
            "hover:border-primary/50 hover:bg-accent/50",
            isDragging && "border-primary bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed",
            uploadingCount > 0 && "opacity-50"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClickUpload}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            onChange={handleFileSelect}
            disabled={disabled || uploadingCount > 0}
            className="hidden"
          />

          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-3">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">
              Arraste fotos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground">
              {ALLOWED_TYPES.map((t) => t.split("/")[1].toUpperCase()).join(", ")} • Máximo{" "}
              {MAX_FILE_SIZE / (1024 * 1024)}MB
            </p>
            {uploadingCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Enviando {uploadingCount} foto{uploadingCount > 1 ? "s" : ""}...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Alternative Upload Button */}
      {canAddMore && photos.length === 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={handleClickUpload}
          disabled={disabled || uploadingCount > 0}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Selecionar Fotos
        </Button>
      )}

      {/* Help Text */}
      {showHelpText && (
        <p className="text-xs text-muted-foreground">
          As imagens serão automaticamente comprimidas antes do upload. Máximo {maxPhotos} fotos.
        </p>
      )}
    </div>
  );
};

export default PhotoUploadComponent;
