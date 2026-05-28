/**
 * UploadedFilesList - Component for displaying uploaded payment proof files
 * Requirements: 3.1-3.12
 *
 * Features:
 * - Display all uploaded files with thumbnails for images
 * - Show file name, size, upload date
 * - "View full size" button for images
 * - "Download" button for PDFs
 * - Show upload status (uploading, complete, error)
 */

import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  File,
  Image as ImageIcon,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { log } from "@/lib/logger";
import { fileUploadService } from "@/lib/file-upload-service";
import { sanitizeURL } from "@/lib/security/input-sanitizer";
import { openSafeExternalUrl } from "@/lib/security/safe-open";
import type { PaymentFile } from "@/types/manual-payment";

interface UploadedFilesListProps {
  paymentId: string;
  files?: PaymentFile[];
  onFileClick?: (file: PaymentFile) => void;
  onFileDelete?: (fileId: string) => void;
  showDelete?: boolean;
  isLoading?: boolean;
  className?: string;
}

interface FileWithUrl extends PaymentFile {
  signedUrl?: string;
  thumbnailUrl?: string;
  isLoadingUrl?: boolean;
}

export const UploadedFilesList: React.FC<UploadedFilesListProps> = ({
  paymentId,
  files: propFiles,
  onFileClick,
  onFileDelete,
  showDelete = false,
  isLoading = false,
  className,
}) => {
  const [files, setFiles] = useState<FileWithUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSignedUrls = useCallback(async (filesToProcess: PaymentFile[]) => {
    for (const file of filesToProcess) {
      try {
        // Generate signed URL for the main file
        const signedUrl = await fileUploadService.getSignedUrl(file.file_path, undefined, {
          paymentId,
          requireOwner: true,
        });

        // Generate thumbnail URL if available
        let thumbnailUrl: string | undefined;
        if (file.thumbnail_path) {
          thumbnailUrl = await fileUploadService.getSignedUrl(file.thumbnail_path, undefined, {
            paymentId,
            requireOwner: true,
          });
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, signedUrl, thumbnailUrl, isLoadingUrl: false } : f
          )
        );
      } catch (err) {
        log.error("Failed to generate payment file URL", { error: err, fileId: file.id });
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, isLoadingUrl: false } : f)));
      }
    }
  }, [paymentId]);

  const loadFiles = useCallback(async () => {
    if (!paymentId) return;

    setLoading(true);
    setError(null);

    try {
      const loadedFiles = await fileUploadService.listByPayment(paymentId);
      const filesWithUrls = loadedFiles.map((file) => ({ ...file, isLoadingUrl: true }));
      setFiles(filesWithUrls);

      // Generate signed URLs for all files
      generateSignedUrls(loadedFiles);
    } catch (err) {
      log.error("Failed to load payment files", { error: err, paymentId });
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [generateSignedUrls, paymentId]);

  // Load files if not provided via props
  useEffect(() => {
    if (propFiles) {
      setFiles(propFiles.map((file) => ({ ...file, isLoadingUrl: true })));
      // Generate signed URLs for all files
      generateSignedUrls(propFiles);
    } else {
      loadFiles();
    }
  }, [generateSignedUrls, loadFiles, paymentId, propFiles]);

  const handleFileClick = (file: FileWithUrl) => {
    if (onFileClick && file.signedUrl) {
      onFileClick(file);
    }
  };

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!onFileDelete) return;

    try {
      await fileUploadService.delete(fileId);
      onFileDelete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      log.error("Failed to delete payment file", { error: err, fileId });
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isImage = (fileType: string): boolean => {
    return fileType.startsWith("image/");
  };

  const isPDF = (fileType: string): boolean => {
    return fileType === "application/pdf";
  };

  const getSafeFileUrl = (url: string | undefined): string | null => {
    if (!url) return null;

    try {
      return sanitizeURL(url, ["http", "https"]);
    } catch (err) {
      log.error("Blocked unsafe payment file URL", { error: err, paymentId });
      return null;
    }
  };

  const openFileUrl = (url: string | undefined) => {
    if (!url) {
      setError("Invalid file URL");
      return;
    }

    try {
      openSafeExternalUrl(url);
    } catch (err) {
      log.error("Blocked unsafe payment file URL", { error: err, paymentId });
      setError("Invalid file URL");
    }
  };

  const downloadFile = (file: FileWithUrl) => {
    const safeUrl = getSafeFileUrl(file.signedUrl);
    if (!safeUrl) {
      setError("Invalid file URL");
      return;
    }

    const link = document.createElement("a");
    link.href = safeUrl;
    link.download = file.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (fileType: string) => {
    if (isImage(fileType)) {
      return <ImageIcon className="h-5 w-5" />;
    } else if (isPDF(fileType)) {
      return <File className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  if (isLoading || loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>Loading files...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>Error loading files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadFiles}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>No files uploaded yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="rounded-full bg-muted p-4 inline-flex mb-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No payment proof files have been uploaded yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>
              {files.length} file{files.length !== 1 ? "s" : ""} uploaded
            </CardDescription>
          </div>
          <Badge variant="outline">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                onFileClick && file.signedUrl && "cursor-pointer hover:bg-muted/50"
              )}
              onClick={() => handleFileClick(file)}
            >
              {/* Thumbnail/Icon */}
              <div className="flex-shrink-0">
                {file.isLoadingUrl ? (
                  <Skeleton className="h-12 w-12 rounded" />
                ) : file.thumbnailUrl && isImage(file.file_type) ? (
                  <div className="relative h-12 w-12">
                    <img
                      src={file.thumbnailUrl}
                      alt={`Thumbnail of ${file.file_name}`}
                      className="h-full w-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black/5 rounded" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                    {getFileIcon(file.file_type)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={file.file_name}>
                      {file.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">{formatDate(file.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* File Actions */}
                    {file.signedUrl && !file.isLoadingUrl && (
                      <>
                        {isImage(file.file_type) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFileUrl(file.signedUrl);
                            }}
                            title="View full size"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}

                        {isPDF(file.file_type) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file);
                            }}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}

                    {showDelete && onFileDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(file.id, e)}
                        title="Delete file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 mt-2">
                  {file.isLoadingUrl ? (
                    <Badge variant="outline" className="text-xs">
                      Loading...
                    </Badge>
                  ) : file.signedUrl ? (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Unavailable
                    </Badge>
                  )}

                  <Badge variant="outline" className="text-xs">
                    {isImage(file.file_type) ? "Image" : isPDF(file.file_type) ? "PDF" : "File"}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {isImage(files[0]?.file_type) ? (
              <>Click on an image to view it full size, or use the eye icon.</>
            ) : isPDF(files[0]?.file_type) ? (
              <>Click on a PDF to view it, or use the download icon to save it.</>
            ) : (
              <>Click on a file to view it.</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
