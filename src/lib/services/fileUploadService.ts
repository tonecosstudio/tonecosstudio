// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { validateFile } from "@/lib/validations/support";
import type { FileMetadata, ValidationResult } from "@/types/support";

const BUCKET_NAME = "support-attachments";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_PDF_TYPE = "application/pdf";

export class FileUploadService {
  /**
   * Valida um arquivo antes do upload
   */
  validateFile(file: File): ValidationResult {
    return validateFile(file);
  }

  /**
   * Faz upload de um arquivo para o Supabase Storage
   */
  async uploadFile(
    file: File,
    conversationId: string,
    messageId: string,
    uploadedBy: string
  ): Promise<FileMetadata> {
    // Validar arquivo
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || "Arquivo inválido");
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${conversationId}/${timestamp}_${sanitizedFileName}`;

    // Upload para o Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Erro ao fazer upload:", uploadError);
      throw new Error("Erro ao fazer upload do arquivo");
    }

    let thumbnailPath: string | undefined;

    // Salvar metadata no banco
    const { data: attachmentData, error: dbError } = await supabase
      .from("support_attachments")
      .insert({
        message_id: messageId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        thumbnail_path: thumbnailPath,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (dbError) {
      // Tentar deletar arquivo do storage se falhar ao salvar no banco
      await this.deleteFile(filePath);
      console.error("Erro ao salvar metadata:", dbError);
      throw new Error("Erro ao salvar informações do arquivo");
    }

    // Obter URL pública
    const publicUrl = this.getPublicUrl(filePath);

    return {
      id: attachmentData.id,
      file_name: attachmentData.file_name,
      file_path: attachmentData.file_path,
      file_size: attachmentData.file_size,
      file_type: attachmentData.file_type,
      thumbnail_path: attachmentData.thumbnail_path,
      public_url: publicUrl,
    };
  }

  /**
   * Gera thumbnail para imagens (200x200px)
   */
  async generateThumbnail(file: File, conversationId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = async () => {
          // Criar canvas para redimensionar
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Erro ao criar contexto do canvas"));
            return;
          }

          // Calcular dimensões mantendo aspect ratio
          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Converter para blob
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error("Erro ao gerar thumbnail"));
                return;
              }

              // Upload do thumbnail
              const timestamp = Date.now();
              const thumbnailPath = `${conversationId}/thumb_${timestamp}_${file.name}`;

              const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(thumbnailPath, blob, {
                  cacheControl: "3600",
                  upsert: false,
                });

              if (error) {
                reject(error);
              } else {
                resolve(thumbnailPath);
              }
            },
            file.type,
            0.8
          );
        };

        img.onerror = () => {
          reject(new Error("Erro ao carregar imagem"));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error("Erro ao ler arquivo"));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Obtém URL pública de um arquivo
   */
  getPublicUrl(path: string): string {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Deleta um arquivo do storage
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.error("Erro ao deletar arquivo:", error);
      throw new Error("Erro ao deletar arquivo");
    }
  }

  /**
   * Deleta um anexo (arquivo + metadata)
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    // Buscar attachment para obter paths
    const { data: attachment, error: fetchError } = await supabase
      .from("support_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();

    if (fetchError || !attachment) {
      throw new Error("Anexo não encontrado");
    }

    // Deletar arquivos do storage
    const filesToDelete = [attachment.file_path];
    if (attachment.thumbnail_path) {
      filesToDelete.push(attachment.thumbnail_path);
    }

    const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);

    if (storageError) {
      console.error("Erro ao deletar arquivos do storage:", storageError);
    }

    // Deletar metadata do banco
    const { error: dbError } = await supabase
      .from("support_attachments")
      .delete()
      .eq("id", attachmentId);

    if (dbError) {
      console.error("Erro ao deletar metadata:", dbError);
      throw new Error("Erro ao deletar anexo");
    }
  }

  /**
   * Lista anexos de uma mensagem
   */
  async listAttachments(messageId: string) {
    const { data, error } = await supabase
      .from("support_attachments")
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao listar anexos:", error);
      throw new Error("Erro ao carregar anexos");
    }

    return (data || []).map((attachment) => ({
      ...attachment,
      public_url: this.getPublicUrl(attachment.file_path),
      thumbnail_url: attachment.thumbnail_path
        ? this.getPublicUrl(attachment.thumbnail_path)
        : undefined,
    }));
  }
}

// Singleton instance
export const fileUploadService = new FileUploadService();
