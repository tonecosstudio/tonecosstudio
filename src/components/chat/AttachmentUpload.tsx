/**
 * AttachmentUpload - Component for uploading attachments in chat messages
 * Requirements: 4.1, 4.2, 4.6
 *
 * Features:
 * - Drag-and-drop file upload
 * - File validation (JPEG, PNG, PDF up to 5MB)
 * - Image preview (200x200px thumbnails)
 * - Upload progress indicator
 * - Error handling with clear messages
 */

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, File, Image as ImageIcon, X, AlertCircle, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFile } from "@/lib/validations/support";

interface AttachmentUploadProps {
  onFilesSelected: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  selectedFiles?: File[];
  maxFiles?: number;
  disabled?: boolean;
  compact?: boolean;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  error?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_PDF_TYPE = "application/pdf";
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ACCEPTED_PDF_TYPE];

export const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  onFilesSelected,
  onRemoveFile,
  selectedFiles = [],
  maxFiles = 5,
  disabled = false,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [filesWithPreviews, setFilesWithPreviews] = useState<FileWithPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate preview for image files
  const generatePreview = useCallback((file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        resolve(undefined);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => {
        resolve(undefined);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Validate and process files
  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (disabled) return;

      setValidationErrors([]);
      const fileArray = Array.from(fileList);

      // Check max files limit
      if (selectedFiles.length + fileArray.length > maxFiles) {
        setValidationErrors([
          `Máximo de ${maxFiles} arquivos permitidos. Você tem ${selectedFiles.length} e tentou adicionar ${fileArray.length}.`,
        ]);
        return;
      }

      const validFiles: File[] = [];
      const errors: string[] = [];
      const newFilesWithPreviews: FileWithPreview[] = [];

      for (const file of fileArray) {
        const validation = validateFile(file);

        if (validation.valid) {
          validFiles.push(file);
          const preview = await generatePreview(file);
          newFilesWithPreviews.push({ file, preview });
        } else {
          errors.push(validation.error || `Erro ao validar ${file.name}`);
        }
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
      }

      if (validFiles.length > 0) {
        setFilesWithPreviews((prev) => [...prev, ...newFilesWithPreviews]);
        onFilesSelected([...selectedFiles, ...validFiles]);
      }
    },
    [disabled, selectedFiles, maxFiles, onFilesSelected, generatePreview]
  );

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && selectedFiles.length < maxFiles) {
        setIsDragOver(true);
      }
    },
    [disabled, selectedFiles.length, maxFiles]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled || selectedFiles.length >= maxFiles) {
        return;
      }

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [disabled, selectedFiles.length, maxFiles, processFiles]
  );

  // Remove file
  const handleRemoveFile = (index: number) => {
    const fileToRemove = filesWithPreviews[index];
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }

    setFilesWithPreviews((prev) => prev.filter((_, i) => i !== index));

    if (onRemoveFile) {
      onRemoveFile(index);
    } else {
      // If no custom handler, update the files list
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      onFilesSelected(newFiles);
    }
  };

  // Sync filesWithPreviews with selectedFiles
  React.useEffect(() => {
    // Se selectedFiles foi limpo externamente, limpar filesWithPreviews também
    if (selectedFiles.length === 0 && filesWithPreviews.length > 0) {
      filesWithPreviews.forEach((f) => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      });
      setFilesWithPreviews([]);
      setValidationErrors([]);
    }
  }, [selectedFiles.length, filesWithPreviews]);

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      filesWithPreviews.forEach((f) => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      });
    };
  }, [filesWithPreviews]);

  if (compact) {
    return (
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          onChange={handleFileInputChange}
          disabled={disabled || selectedFiles.length >= maxFiles}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || selectedFiles.length >= maxFiles}
          className="h-8"
        >
          <Paperclip className="h-4 w-4 mr-1" />
          Anexar
        </Button>

        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{validationErrors[0]}</AlertDescription>
          </Alert>
        )}

        {filesWithPreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filesWithPreviews.map((fileWithPreview, index) => (
              <div key={index} className="relative group">
                {fileWithPreview.preview ? (
                  <div className="relative h-16 w-16 rounded border overflow-hidden">
                    <img
                      src={fileWithPreview.preview}
                      alt={fileWithPreview.file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="relative h-16 w-16 rounded border bg-muted flex flex-col items-center justify-center p-2">
                    <File className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {fileWithPreview.file.name.split(".").pop()?.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        onChange={handleFileInputChange}
        disabled={disabled || selectedFiles.length >= maxFiles}
      />

      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          (disabled || selectedFiles.length >= maxFiles) && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => {
          if (!disabled && selectedFiles.length < maxFiles) {
            fileInputRef.current?.click();
          }
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-3">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragOver ? "Solte os arquivos aqui" : "Arraste arquivos ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG ou PDF • Máximo 5MB cada</p>
          </div>

          <Badge variant="outline" className="text-xs">
            {selectedFiles.length} / {maxFiles} arquivos
          </Badge>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* File List with Previews */}
      {filesWithPreviews.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Arquivos Selecionados</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filesWithPreviews.map((fileWithPreview, index) => (
              <div key={index} className="relative group border rounded-lg overflow-hidden">
                {fileWithPreview.preview ? (
                  // Image preview
                  <div className="aspect-square relative">
                    <img
                      src={fileWithPreview.preview}
                      alt={fileWithPreview.file.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                      {fileWithPreview.file.name}
                    </div>
                  </div>
                ) : (
                  // PDF display
                  <div className="aspect-square bg-muted flex flex-col items-center justify-center p-3 relative">
                    <File className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-xs text-center truncate w-full px-1">
                      {fileWithPreview.file.name}
                    </p>
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      PDF
                    </Badge>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* File size */}
                <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {Math.round(fileWithPreview.file.size / 1024)} KB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
