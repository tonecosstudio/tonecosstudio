import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePaymentVoucherStorage } from "@/hooks/payments/usePaymentVoucherStorage";

export interface PaymentVoucherUploadProps {
  onUploadSuccess: (path: string, file: File) => void;
  onUploadError?: (error: string) => void;
  userId?: string;
  pathPrefix?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  showPreview?: boolean;
}

interface UploadState {
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
  path: string | null;
  preview: string | null;
}

const EMPTY_STATE: UploadState = {
  file: null,
  uploading: false,
  uploaded: false,
  error: null,
  path: null,
  preview: null,
};

export const PaymentVoucherUpload: React.FC<PaymentVoucherUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  userId,
  pathPrefix = "subscriptions",
  disabled = false,
  className,
  label = "Comprovante de Pagamento",
  showPreview = true,
}) => {
  const [state, setState] = useState<UploadState>(EMPTY_STATE);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    allowedPaymentVoucherTypes,
    validatePaymentVoucherFile,
    uploadPaymentVoucherToStorage,
  } = usePaymentVoucherStorage({ userId, pathPrefix });

  useEffect(() => {
    return () => {
      if (state.preview) URL.revokeObjectURL(state.preview);
    };
  }, [state.preview]);

  const resetState = () => {
    if (state.preview) URL.revokeObjectURL(state.preview);
    setState(EMPTY_STATE);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (file: File) => {
    if (state.preview) URL.revokeObjectURL(state.preview);
    setState(EMPTY_STATE);

    const validation = validatePaymentVoucherFile(file);
    if (!validation.valid) {
      const error = validation.error || "Arquivo inválido";
      setState({ ...EMPTY_STATE, error });
      onUploadError?.(error);
      return;
    }

    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setState({
      file,
      uploading: true,
      uploaded: false,
      error: null,
      path: null,
      preview,
    });

    try {
      const path = await uploadPaymentVoucherToStorage(file);
      setState({
        file,
        uploading: false,
        uploaded: true,
        error: null,
        path,
        preview,
      });
      onUploadSuccess(path, file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao fazer upload";
      setState({
        file,
        uploading: false,
        uploaded: false,
        error: message,
        path: null,
        preview,
      });
      onUploadError?.(message);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("w-full", className)}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}

      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all",
          "hover:border-primary/50 cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          state.uploading && "opacity-50 cursor-not-allowed",
          disabled && "opacity-50 cursor-not-allowed",
          state.error && "border-destructive",
          state.uploaded && "border-green-500",
          !state.error && !state.uploaded && "border-gray-300",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled && !state.uploading) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(false);
          if (disabled || state.uploading) return;
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFileSelect(file);
        }}
        onClick={() => {
          if (!disabled && !state.uploading) fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedPaymentVoucherTypes.join(",")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFileSelect(file);
          }}
          disabled={disabled || state.uploading}
          className="hidden"
          aria-label={label}
        />

        <div className="p-6">
          {!state.file && !state.error && (
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                Arraste e solte o arquivo aqui ou clique para selecionar
              </p>
              <p className="text-xs text-gray-500">JPG, PNG ou PDF (máx. 5MB)</p>
            </div>
          )}

          {state.file && state.uploading && (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-3" />
              <p className="text-sm text-gray-600 mb-1">Enviando arquivo...</p>
              <p className="text-xs text-gray-500">{state.file.name}</p>
            </div>
          )}

          {state.file && state.uploaded && !state.error && (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{state.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(state.file.size)} • Upload concluído
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    resetState();
                  }}
                  disabled={disabled}
                  className="flex-shrink-0"
                  aria-label="Remover comprovante"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {showPreview && state.preview && (
                <div className="mt-3">
                  <img
                    src={state.preview}
                    alt="Preview do comprovante"
                    className="max-w-full h-auto max-h-48 rounded border border-gray-200"
                  />
                </div>
              )}
            </div>
          )}

          {state.error && (
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-3" />
              <p className="text-sm text-destructive mb-1">Erro no upload</p>
              <p className="text-xs text-gray-500">{state.error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  resetState();
                }}
                className="mt-3"
              >
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Formatos aceitos: JPG, PNG, PDF • Tamanho máximo: 5MB • Armazenamento privado
      </p>
    </div>
  );
};

export default PaymentVoucherUpload;
