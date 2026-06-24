/**
 * UploadedFilesList - Component for displaying uploaded payment proof files
 * Requirements: 3.1-3.12
 *
 * Features:
 * - Display all uploaded files with thumbnails for images
 * - Show file name, size, upload date
 * - Botao de visualizacao para imagens
 * - Botao de download para PDFs
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

const cardClassName = "w-full border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none";
const mutedTextClassName = "text-zinc-400";

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
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar os arquivos");
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
      setError(err instanceof Error ? err.message : "Nao foi possivel remover o arquivo");
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
      setError("URL do arquivo invalida");
      return;
    }

    try {
      openSafeExternalUrl(url);
    } catch (err) {
      log.error("Blocked unsafe payment file URL", { error: err, paymentId });
      setError("URL do arquivo invalida");
    }
  };

  const downloadFile = (file: FileWithUrl) => {
    const safeUrl = getSafeFileUrl(file.signedUrl);
    if (!safeUrl) {
      setError("URL do arquivo invalida");
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
      <Card className={cn(cardClassName, className)}>
        <CardHeader>
          <CardTitle>Comprovantes enviados</CardTitle>
          <CardDescription className={mutedTextClassName}>Carregando arquivos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-[hsl(0,0%,14%)] p-3">
                <Skeleton className="h-12 w-12 rounded bg-white/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                  <Skeleton className="h-3 w-1/2 bg-white/10" />
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
      <Card className={cn(cardClassName, className)}>
        <CardHeader>
          <CardTitle>Comprovantes enviados</CardTitle>
          <CardDescription className={mutedTextClassName}>Erro ao carregar arquivos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 text-red-100">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
              onClick={loadFiles}
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card className={cn(cardClassName, className)}>
        <CardHeader>
          <CardTitle>Comprovantes enviados</CardTitle>
          <CardDescription className={mutedTextClassName}>Nenhum arquivo enviado ainda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mb-4 inline-flex rounded-full bg-[hsl(42,100%,55%)]/10 p-4">
              <Upload className="h-8 w-8 text-[hsl(42,100%,55%)]" />
            </div>
            <p className="text-zinc-400">Nenhum comprovante foi enviado para este pagamento.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(cardClassName, className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Comprovantes enviados</CardTitle>
            <CardDescription className={mutedTextClassName}>
              {files.length} arquivo{files.length !== 1 ? "s" : ""} enviado{files.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-[hsl(0,0%,18%)] text-zinc-200">
            {files.length} arquivo{files.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] p-3 transition-colors",
                onFileClick && file.signedUrl && "cursor-pointer hover:bg-white/[0.04]"
              )}
              onClick={() => handleFileClick(file)}
            >
              {/* Thumbnail/Icon */}
              <div className="flex-shrink-0">
                {file.isLoadingUrl ? (
                  <Skeleton className="h-12 w-12 rounded bg-white/10" />
                ) : file.thumbnailUrl && isImage(file.file_type) ? (
                  <div className="relative h-12 w-12">
                    <img
                      src={file.thumbnailUrl}
                      alt={`Miniatura de ${file.file_name}`}
                      className="h-full w-full object-cover rounded"
                    />
                    <div className="absolute inset-0 rounded bg-black/5" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-white/[0.05] text-zinc-400">
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
                      <p className="text-xs text-zinc-500">
                        {formatFileSize(file.file_size)}
                      </p>
                      <span className="text-xs text-zinc-600">-</span>
                      <p className="text-xs text-zinc-500">{formatDate(file.created_at)}</p>
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
                            className="h-8 w-8 text-zinc-300 hover:bg-white/10 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFileUrl(file.signedUrl);
                            }}
                            title="Ver imagem"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}

                        {isPDF(file.file_type) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-300 hover:bg-white/10 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file);
                            }}
                            title="Baixar PDF"
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
                        className="h-8 w-8 text-red-300 hover:bg-red-500/10 hover:text-red-100"
                        onClick={(e) => handleDelete(file.id, e)}
                        title="Remover arquivo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 mt-2">
                  {file.isLoadingUrl ? (
                    <Badge variant="outline" className="border-[hsl(0,0%,18%)] text-xs text-zinc-200">
                      Carregando...
                    </Badge>
                  ) : file.signedUrl ? (
                    <Badge className="gap-1 bg-emerald-500/15 text-xs text-emerald-100">
                      <CheckCircle className="h-3 w-3" />
                      Pronto
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Indisponivel
                    </Badge>
                  )}

                  <Badge variant="outline" className="border-[hsl(0,0%,18%)] text-xs text-zinc-200">
                    {isImage(file.file_type) ? "Imagem" : isPDF(file.file_type) ? "PDF" : "Arquivo"}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-4 border-t border-[hsl(0,0%,14%)] pt-4">
          <p className="text-xs text-zinc-500">
            {isImage(files[0]?.file_type) ? (
              <>Clique na imagem para abrir o arquivo completo ou use o icone de visualizacao.</>
            ) : isPDF(files[0]?.file_type) ? (
              <>Clique no PDF para abrir o arquivo ou use o icone de download para salvar.</>
            ) : (
              <>Clique no arquivo para abrir a visualizacao.</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
