import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { validateFile } from "@/lib/validations/support";
import type { FileMetadata, ValidationResult } from "@/types/support";

const BUCKET_NAME = "support-attachments";

interface SupportAttachmentRecord {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  thumbnail_path?: string | null;
}

interface SupportAttachmentRpcError {
  message: string;
}

interface SupportAttachmentRpcClient {
  rpc(
    name: "record_support_attachment_upload",
    args: {
      p_message_id: string;
      p_uploaded_by: string;
      p_file_name: string;
      p_file_path: string;
      p_file_size: number;
      p_file_type: string;
      p_thumbnail_path?: string | null;
      p_public_url?: string | null;
    }
  ): Promise<{ data: SupportAttachmentRecord | null; error: SupportAttachmentRpcError | null }>;
  rpc(
    name: "admin_delete_support_attachment_record",
    args: {
      p_attachment_id: string;
      p_file_path: string;
      p_thumbnail_path?: string | null;
    }
  ): Promise<{ data: string | null; error: SupportAttachmentRpcError | null }>;
}

const supportAttachmentRpc = supabase as unknown as SupportAttachmentRpcClient;

export class FileUploadService {
  /**
   * Valida um arquivo antes do upload.
   */
  validateFile(file: File): ValidationResult {
    return validateFile(file);
  }

  /**
   * Faz upload de um arquivo para o Supabase Storage.
   */
  async uploadFile(
    file: File,
    conversationId: string,
    messageId: string,
    uploadedBy: string
  ): Promise<FileMetadata> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || "Arquivo inválido");
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${conversationId}/${timestamp}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      log.error("Erro ao fazer upload de anexo", {
        error: uploadError,
        conversationId,
        messageId,
        uploadedBy,
        fileName: file.name,
      });
      throw new Error("Erro ao fazer upload do arquivo");
    }

    const { data: attachmentData, error: dbError } = await supportAttachmentRpc.rpc(
      "record_support_attachment_upload",
      {
        p_message_id: messageId,
        p_uploaded_by: uploadedBy,
        p_file_name: file.name,
        p_file_path: filePath,
        p_file_size: file.size,
        p_file_type: file.type,
        p_thumbnail_path: null,
        p_public_url: null,
      }
    );

    if (dbError || !attachmentData) {
      await this.deleteFile(filePath);
      log.error("Erro ao salvar metadata do anexo", {
        error: dbError,
        conversationId,
        messageId,
        uploadedBy,
        filePath,
      });
      throw new Error("Erro ao salvar informações do arquivo");
    }

    const publicUrl = this.getPublicUrl(filePath);

    return {
      id: attachmentData.id,
      file_name: attachmentData.file_name,
      file_path: attachmentData.file_path,
      file_size: attachmentData.file_size,
      file_type: attachmentData.file_type,
      thumbnail_path: attachmentData.thumbnail_path ?? undefined,
      public_url: publicUrl,
    };
  }

  /**
   * Gera thumbnail para imagens (200x200px).
   */
  async generateThumbnail(file: File, conversationId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Erro ao criar contexto do canvas"));
            return;
          }

          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error("Erro ao gerar thumbnail"));
                return;
              }

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
                return;
              }

              resolve(thumbnailPath);
            },
            file.type,
            0.8
          );
        };

        img.onerror = () => {
          reject(new Error("Erro ao carregar imagem"));
        };

        img.src = event.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error("Erro ao ler arquivo"));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Obtém URL pública de um arquivo.
   */
  getPublicUrl(path: string): string {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Deleta um arquivo do storage.
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      log.error("Erro ao deletar arquivo do storage", { error, path });
      throw new Error("Erro ao deletar arquivo");
    }
  }

  /**
   * Deleta um anexo (arquivo + metadata).
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    const { data: attachment, error: fetchError } = await supabase
      .from("support_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();

    if (fetchError || !attachment) {
      throw new Error("Anexo não encontrado");
    }

    const filesToDelete = [attachment.file_path];
    if (attachment.thumbnail_path) {
      filesToDelete.push(attachment.thumbnail_path);
    }

    const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);

    if (storageError) {
      log.error("Erro ao deletar arquivos do storage", {
        error: storageError,
        attachmentId,
        filesToDelete,
      });
    }

    const { error: dbError } = await supportAttachmentRpc.rpc(
      "admin_delete_support_attachment_record",
      {
        p_attachment_id: attachmentId,
        p_file_path: attachment.file_path,
        p_thumbnail_path: attachment.thumbnail_path ?? null,
      }
    );

    if (dbError) {
      log.error("Erro ao deletar metadata do anexo", { error: dbError, attachmentId });
      throw new Error("Erro ao deletar anexo");
    }
  }

  /**
   * Lista anexos de uma mensagem.
   */
  async listAttachments(messageId: string) {
    const { data, error } = await supabase
      .from("support_attachments")
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) {
      log.error("Erro ao listar anexos", { error, messageId });
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

export const fileUploadService = new FileUploadService();
