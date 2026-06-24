/**
 * FileUploadComponent - Component for uploading payment proof files
 * Requirements: 3.1-3.12, 17.6
 *
 * Features:
 * - Drag-and-drop file upload area
 * - File input with accept attribute (image/*, application/pdf)
 * - Image preview for image files
 * - File name and size display for PDFs
 * - Upload progress bar
 * - Validation error display (type, size)
 * - Multiple file selection (up to 5 total)
 * - Mobile camera capture support
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  File,
  Image as ImageIcon,
  X,
  Camera,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { log } from "@/lib/logger";
import { fileUploadService } from "@/lib/file-upload-service";
import type { PaymentFile } from "@/types/manual-payment";

interface FileUploadComponentProps {
  paymentId: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (files: PaymentFile[]) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  embedded?: boolean;
}

interface UploadFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
  uploadedFile?: PaymentFile;
}

export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  paymentId,
  maxFiles = 5,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ["image/*", "application/pdf"],
  onUploadComplete,
  onError,
  disabled = false,
  embedded = false,
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Check if mobile camera is supported
  const isMobileCameraSupported = typeof navigator.mediaDevices?.getUserMedia === "function";

  // Validate a single file
  const validateFile = useCallback((file: File): string[] => {
    const errors: string[] = [];

    // Validate file size
    if (file.size > maxSizeBytes) {
      errors.push(
        `"${file.name}" excede o limite. O tamanho maximo e ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`
      );
    }

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";
    const isValidType = isImage || isPDF;

    if (!isValidType) {
      errors.push(
        `"${file.name}" tem um tipo invalido. Tipos aceitos: ${acceptedTypes.join(", ")}.`
      );
    }

    // Validate file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
    if (extension && !allowedExtensions.includes(extension)) {
      errors.push(`"${file.name}" tem uma extensao nao suportada.`);
    }

    // Reject executable files
    const executableExtensions = ["exe", "sh", "bat", "cmd", "com", "app", "dmg"];
    if (extension && executableExtensions.includes(extension)) {
      errors.push(`"${file.name}" e um executavel e nao e permitido por seguranca.`);
    }

    return errors;
  }, [acceptedTypes, maxSizeBytes]);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      if (disabled) return;

      // Clear previous errors
      setValidationErrors([]);

      const fileArray = Array.from(fileList);

      // Check if adding these files would exceed maxFiles
      const currentFileCount = files.filter((f) => f.status !== "error").length;
      const newFileCount = fileArray.length;

      if (currentFileCount + newFileCount > maxFiles) {
        setValidationErrors([
          `Limite de ${maxFiles} arquivos. Existem ${currentFileCount} arquivos na fila e voce tentou adicionar mais ${newFileCount}.`,
        ]);
        return;
      }

      const newUploadFiles: UploadFile[] = [];
      const newErrors: string[] = [];

      fileArray.forEach((file) => {
        const fileErrors = validateFile(file);

        if (fileErrors.length === 0) {
          const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

          newUploadFiles.push({
            id: crypto.randomUUID(),
            file,
            preview,
            progress: 0,
            status: "pending",
          });
        } else {
          newErrors.push(...fileErrors);
        }
      });

      if (newUploadFiles.length > 0) {
        setFiles((prev) => [...prev, ...newUploadFiles]);
      }

      if (newErrors.length > 0) {
        setValidationErrors((prev) => [...prev, ...newErrors]);
      }
    },
    [files, maxFiles, disabled, validateFile]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // Reset input value to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCameraCapture = async () => {
    if (!isMobileCameraSupported || !cameraInputRef.current) return;

    try {
      // For simplicity, we'll use a file input with capture attribute
      // This works on mobile devices with camera support
      cameraInputRef.current.click();
    } catch (error) {
      log.error("Camera access error", { error, paymentId });
      setValidationErrors((prev) => [
        ...prev,
        "Nao foi possivel acessar a camera. Verifique as permissoes.",
      ]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading && files.length < maxFiles) {
        setIsDragOver(true);
      }
    },
    [disabled, isUploading, files.length, maxFiles]
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

      if (disabled || isUploading || files.length >= maxFiles) {
        return;
      }

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    },
    [disabled, isUploading, files.length, maxFiles, handleFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    const pendingFiles = files.filter((f) => f.status === "pending");
    const uploadedFiles: PaymentFile[] = [];

    for (const uploadFile of pendingFiles) {
      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "uploading", progress: 0 } : f))
        );

        // Upload with progress tracking
        const uploadedFile = await fileUploadService.upload(
          paymentId,
          uploadFile.file,
          (progress) => {
            setFiles((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f)));
          }
        );

        // Update status to complete
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "complete",
                  progress: 100,
                  uploadedFile,
                }
              : f
          )
        );

        uploadedFiles.push(uploadedFile);
      } catch (error) {
        log.error("Payment proof upload error", {
          error,
          paymentId,
          fileName: uploadFile.file.name,
        });

        // Update status to error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Falha no upload",
                }
              : f
          )
        );

        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    }

    setIsUploading(false);

    // Call onUploadComplete when every pending file from this batch was uploaded successfully.
    if (uploadedFiles.length > 0 && uploadedFiles.length === pendingFiles.length) {
      onUploadComplete?.(uploadedFiles);
    }
  };

  const clearAllFiles = () => {
    files.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setValidationErrors([]);
  };

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  const completedCount = files.filter((f) => f.status === "complete").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const pendingCount = files.filter(
    (f) => f.status === "pending" || f.status === "uploading"
  ).length;
  const canUpload = pendingCount > 0 && !isUploading && !disabled;

  const uploadBody = (
    <div className="space-y-4 text-white">
        {/* File Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[hsl(0,0%,18%)] text-xs text-zinc-200 sm:text-sm">
              {files.length} / {maxFiles} arquivos
            </Badge>
            {completedCount > 0 && (
              <Badge className="gap-1 bg-emerald-500/15 text-xs text-emerald-100 sm:text-sm">
                <CheckCircle className="h-3 w-3" />
                {completedCount} enviados
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1 text-xs sm:text-sm">
                <AlertCircle className="h-3 w-3" />
                {errorCount} com falha
              </Badge>
            )}
          </div>
          {files.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFiles}
              disabled={isUploading}
              className="mt-2 text-zinc-300 hover:bg-white/10 hover:text-white sm:mt-0"
            >
              <X className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Limpar fila</span>
              <span className="sm:hidden">Limpar</span>
            </Button>
          )}
        </div>

        {/* Drag and Drop Area */}
        <div
          ref={dropAreaRef}
          role="button"
          aria-disabled={disabled || isUploading || files.length >= maxFiles}
          tabIndex={disabled || isUploading || files.length >= maxFiles ? -1 : 0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") {
              return;
            }

            event.preventDefault();
            if (!disabled && !isUploading && files.length < maxFiles) {
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors sm:p-8",
            isDragOver
              ? "border-[hsl(42,100%,55%)] bg-[hsl(42,100%,55%)]/10"
              : "border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] hover:border-[hsl(42,100%,55%)]/70",
            (disabled || isUploading || files.length >= maxFiles) && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => {
            if (!disabled && !isUploading && files.length < maxFiles) {
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptedTypes.join(",")}
            multiple
            onChange={handleFileInputChange}
            disabled={disabled || isUploading || files.length >= maxFiles}
          />
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
          />

          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-[hsl(42,100%,55%)]/10 p-3 sm:p-4">
              <Upload className="h-6 w-6 text-[hsl(42,100%,55%)] sm:h-8 sm:w-8" />
            </div>

            <div className="text-center">
              <p className="text-base font-medium text-white sm:text-lg">
                {isDragOver ? "Solte os arquivos aqui" : "Arraste os arquivos para esta area"}
              </p>
              <p className="mt-1 text-sm text-zinc-400">ou clique para selecionar arquivos</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={disabled || isUploading || files.length >= maxFiles}
                className="w-full border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)] sm:w-auto"
              >
                <File className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Selecionar arquivos</span>
                <span className="sm:hidden">Selecionar</span>
              </Button>

              {isMobileCameraSupported && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCameraCapture();
                  }}
                  disabled={disabled || isUploading || files.length >= maxFiles}
                  className="w-full border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)] sm:w-auto"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Usar camera</span>
                  <span className="sm:hidden">Camera</span>
                </Button>
              )}
            </div>

            <p className="text-center text-xs text-zinc-500 sm:text-sm">
              Suporta JPG, PNG e PDF. Limite de {Math.round(maxSizeBytes / (1024 * 1024))}MB por arquivo
            </p>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Arquivos selecionados</h4>
            <div className="space-y-2">
              {files.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center gap-3 rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] p-3"
                >
                  {/* File Preview/Icon */}
                  <div className="flex-shrink-0">
                    {uploadFile.preview ? (
                      <div className="relative h-10 w-10 sm:h-12 sm:w-12">
                        <img
                          src={uploadFile.preview}
                          alt={uploadFile.file.name}
                          className="h-full w-full object-cover rounded"
                          loading="lazy"
                        />
                        {uploadFile.status === "complete" && (
                          <div className="absolute -top-1 -right-1">
                            <CheckCircle className="h-3 w-3 fill-emerald-500/20 text-emerald-400 sm:h-4 sm:w-4" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-white/[0.05] sm:h-12 sm:w-12">
                        {uploadFile.file.type === "application/pdf" ? (
                          <File className="h-5 w-5 text-zinc-400 sm:h-6 sm:w-6" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-zinc-400 sm:h-6 sm:w-6" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:bg-white/10 hover:text-white"
                        onClick={() => removeFile(uploadFile.id)}
                        disabled={uploadFile.status === "uploading"}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 gap-1 sm:gap-0">
                      <p className="text-xs text-zinc-500">
                        {Math.round(uploadFile.file.size / 1024)} KB -{" "}
                        {uploadFile.file.type.split("/")[1]?.toUpperCase() || "Arquivo"}
                      </p>

                      <div className="flex items-center gap-2">
                        {uploadFile.status === "error" && (
                          <Badge variant="destructive" className="text-xs">
                            <span className="hidden sm:inline">{uploadFile.error || "Erro"}</span>
                            <span className="sm:hidden">Erro</span>
                          </Badge>
                        )}
                        {uploadFile.status === "complete" && (
                          <Badge className="bg-emerald-500/15 text-xs text-emerald-100">
                            <span className="hidden sm:inline">Enviado</span>
                            <span className="sm:hidden">OK</span>
                          </Badge>
                        )}
                        {uploadFile.status === "uploading" && (
                          <Badge variant="outline" className="border-[hsl(0,0%,18%)] text-xs text-zinc-200">
                            <span className="hidden sm:inline">Enviando...</span>
                            <span className="sm:hidden">Envio</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {uploadFile.status === "uploading" && (
                      <div className="mt-2">
                        <Progress value={uploadFile.progress} className="h-1" />
                        <p className="mt-1 text-right text-xs text-zinc-500">
                          {uploadFile.progress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={uploadFiles}
            disabled={!canUpload}
            className="min-w-[120px] bg-[hsl(42,100%,50%)] text-black hover:bg-[hsl(42,100%,58%)]"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Enviar arquivos
              </>
            )}
          </Button>
        </div>
    </div>
  );

  if (embedded) {
    return uploadBody;
  }

  return (
    <Card className="w-full border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Upload className="h-5 w-5 text-[hsl(42,100%,55%)]" />
          Enviar comprovantes
        </CardTitle>
        <CardDescription className="text-sm text-zinc-400 sm:text-base">
          Envie imagens ou PDFs do comprovante. Limite de {maxFiles} arquivos e{" "}
          {Math.round(maxSizeBytes / (1024 * 1024))}MB por arquivo.
        </CardDescription>
      </CardHeader>
      <CardContent>{uploadBody}</CardContent>
    </Card>
  );
};
