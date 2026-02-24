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
import { fileUploadService } from "@/lib/file-upload-service";
import type { PaymentFile, FileValidationResult } from "@/types/manual-payment";

interface FileUploadComponentProps {
  paymentId: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (files: PaymentFile[]) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
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
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Check if mobile camera is supported
  const isMobileCameraSupported =
    "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices;

  // Validate a single file
  const validateFile = (file: File): string[] => {
    const errors: string[] = [];

    // Validate file size
    if (file.size > maxSizeBytes) {
      errors.push(
        `"${file.name}" is too large. Maximum size is ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`
      );
    }

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";
    const isValidType = isImage || isPDF;

    if (!isValidType) {
      errors.push(
        `"${file.name}" has an invalid file type. Accepted types: ${acceptedTypes.join(", ")}.`
      );
    }

    // Validate file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
    if (extension && !allowedExtensions.includes(extension)) {
      errors.push(`"${file.name}" has an unsupported file extension.`);
    }

    // Reject executable files
    const executableExtensions = ["exe", "sh", "bat", "cmd", "com", "app", "dmg"];
    if (extension && executableExtensions.includes(extension)) {
      errors.push(`"${file.name}" is an executable file and is not allowed for security reasons.`);
    }

    return errors;
  };

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
          `Maximum of ${maxFiles} files allowed. You have ${currentFileCount} files and tried to add ${newFileCount} more.`,
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
    [files, maxFiles, maxSizeBytes, acceptedTypes, disabled]
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
      console.error("Camera access error:", error);
      setValidationErrors((prev) => [
        ...prev,
        "Unable to access camera. Please check permissions.",
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
        console.error("Upload error:", error);

        // Update status to error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed",
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

    // Call onUploadComplete if all files were uploaded successfully
    const successfulUploads = files.filter((f) => f.status === "complete");
    if (successfulUploads.length > 0 && onUploadComplete) {
      const completedFiles = successfulUploads
        .map((f) => f.uploadedFile)
        .filter((f): f is PaymentFile => f !== undefined);
      onUploadComplete(completedFiles);
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Upload className="h-5 w-5" />
          Upload Payment Proof
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Upload images or PDFs of your payment confirmation. Maximum {maxFiles} files,{" "}
          {Math.round(maxSizeBytes / (1024 * 1024))}MB each.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs sm:text-sm">
              {files.length} / {maxFiles} files
            </Badge>
            {completedCount > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs sm:text-sm">
                <CheckCircle className="h-3 w-3" />
                {completedCount} uploaded
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1 text-xs sm:text-sm">
                <AlertCircle className="h-3 w-3" />
                {errorCount} failed
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
              className="mt-2 sm:mt-0"
            >
              <X className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Clear All</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          )}
        </div>

        {/* Drag and Drop Area */}
        <div
          ref={dropAreaRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 sm:p-8 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
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
            <div className="rounded-full bg-muted p-3 sm:p-4">
              <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>

            <div className="text-center">
              <p className="text-base sm:text-lg font-medium">
                {isDragOver ? "Drop files here" : "Drag & drop files here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
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
                className="w-full sm:w-auto"
              >
                <File className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Browse Files</span>
                <span className="sm:hidden">Browse</span>
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
                  className="w-full sm:w-auto"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Take Photo</span>
                  <span className="sm:hidden">Camera</span>
                </Button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Supported: JPG, PNG, PDF • Max {Math.round(maxSizeBytes / (1024 * 1024))}MB each
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
            <h4 className="text-sm font-medium">Selected Files</h4>
            <div className="space-y-2">
              {files.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
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
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 fill-green-500/20" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded bg-muted flex items-center justify-center">
                        {uploadFile.file.type === "application/pdf" ? (
                          <File className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
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
                        className="h-6 w-6"
                        onClick={() => removeFile(uploadFile.id)}
                        disabled={uploadFile.status === "uploading"}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 gap-1 sm:gap-0">
                      <p className="text-xs text-muted-foreground">
                        {Math.round(uploadFile.file.size / 1024)} KB •{" "}
                        {uploadFile.file.type.split("/")[1]?.toUpperCase() || "File"}
                      </p>

                      <div className="flex items-center gap-2">
                        {uploadFile.status === "error" && (
                          <Badge variant="destructive" className="text-xs">
                            <span className="hidden sm:inline">{uploadFile.error || "Error"}</span>
                            <span className="sm:hidden">Error</span>
                          </Badge>
                        )}
                        {uploadFile.status === "complete" && (
                          <Badge variant="secondary" className="text-xs">
                            <span className="hidden sm:inline">Uploaded</span>
                            <span className="sm:hidden">Done</span>
                          </Badge>
                        )}
                        {uploadFile.status === "uploading" && (
                          <Badge variant="outline" className="text-xs">
                            <span className="hidden sm:inline">Uploading...</span>
                            <span className="sm:hidden">Upload</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {uploadFile.status === "uploading" && (
                      <div className="mt-2">
                        <Progress value={uploadFile.progress} className="h-1" />
                        <p className="text-xs text-muted-foreground text-right mt-1">
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
            className="min-w-[120px]"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
