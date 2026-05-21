import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFileUpload } from "@/lib/security/input-sanitizer";
import { useAdminImageUpload } from "@/hooks/admin/useAdminImageUpload";
import { log } from "@/lib/logger";

interface ImageUploadProps {
  label: string;
  description?: string;
  currentImageUrl?: string;
  bucket?: string;
  folder?: string;
  onUploadComplete: (url: string) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  className?: string;
}

export default function ImageUpload({
  label,
  description,
  currentImageUrl,
  bucket = "images",
  folder = "system",
  onUploadComplete,
  maxSizeMB = 5,
  acceptedFormats = ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  className,
}: ImageUploadProps) {
  const { toast } = useToast();
  const uploadMutation = useAdminImageUpload();
  const uploading = uploadMutation.isPending;
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const maxSize = maxSizeMB * 1024 * 1024;
    const validation = validateFileUpload(file, acceptedFormats as readonly string[], maxSize);
    if (!validation.valid) return validation.error || "Arquivo inválido";
    return null;
  };

  const uploadFile = async (file: File) => {
    try {
      const validationError = validateFile(file);
      if (validationError) {
        toast({
          title: "Arquivo inválido",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      const publicUrl = await uploadMutation.mutateAsync({ file, bucket, folder });
      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);
      toast({
        title: "Upload concluído",
        description: "Imagem enviada com sucesso!",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível enviar a imagem";
      log.error("Erro no upload de imagem admin", { error, bucket, folder });
      toast({
        title: "Erro no upload",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadComplete("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {previewUrl && (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Preview"
            className="h-auto max-w-xs rounded border border-border"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50",
          uploading && "pointer-events-none opacity-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Enviando imagem...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-primary/10 p-3">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Arraste uma imagem ou{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline"
                >
                  clique para selecionar
                </button>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {acceptedFormats.map((f) => f.split("/")[1].toUpperCase()).join(", ")} • Máximo{" "}
                {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {!previewUrl && !uploading && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Selecionar Imagem
        </Button>
      )}
    </div>
  );
}
