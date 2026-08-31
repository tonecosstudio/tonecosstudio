import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAuthenticatedUserId,
  requireCurrentUserAdminAccess,
} from "@/services/auth/current-user";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import { removeStorageFiles } from "@/services/supabase/storage-client";
import { getSupportAttachmentSignedUrl } from "@/services/support/support-attachment-url-service";
import { validateFile } from "@/lib/validations/support";
import type { FileMetadata, ValidationResult } from "@/types/support";

const BUCKET_NAME = "support-attachments";

interface SupportAttachmentRecord {
  id: string;
  message_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  thumbnail_path?: string | null;
  created_at?: string;
}

interface SupportAttachmentUploadResponse {
  attachment: SupportAttachmentRecord;
  accessUrl: string | null;
}

export class FileUploadService {
  validateFile(file: File): ValidationResult {
    return validateFile(file);
  }

  /**
   * Uploads a support attachment through the authenticated Edge Function.
   * The browser performs UX validation only; authorization, file-signature
   * validation, malware scanning and Storage writes are server-side.
   */
  async uploadFile(
    file: File,
    conversationId: string,
    messageId: string,
    uploadedBy: string,
  ): Promise<FileMetadata> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || "Arquivo inválido");
    }

    const currentUserId = await requireAuthenticatedUserId();
    if (!uploadedBy || uploadedBy !== currentUserId) {
      throw new Error("Usuário do anexo inválido");
    }

    const body = new FormData();
    body.set("messageId", messageId);
    body.set("file", file);

    let response: SupportAttachmentUploadResponse;
    try {
      response = await callAuthenticatedEdgeFunction<SupportAttachmentUploadResponse, FormData>(
        "upload-support-attachment",
        body,
        "Erro ao fazer upload do anexo",
      );
    } catch (error) {
      log.error("Erro ao fazer upload de anexo", {
        error,
        conversationId,
        messageId,
        uploadedBy,
        fileName: file.name,
      });
      throw new Error(error instanceof Error ? error.message : "Erro ao fazer upload do arquivo");
    }

    const attachment = response?.attachment;
    if (
      !attachment?.id ||
      attachment.message_id !== messageId ||
      attachment.uploaded_by !== currentUserId ||
      !attachment.file_path?.startsWith(`${conversationId}/`)
    ) {
      log.error("Resposta inválida do upload de suporte", {
        conversationId,
        messageId,
        attachmentId: attachment?.id,
      });
      throw new Error("Resposta inválida ao salvar o anexo");
    }

    let accessUrl = response.accessUrl;
    if (!accessUrl) {
      try {
        accessUrl = await getSupportAttachmentSignedUrl(attachment.file_path);
      } catch (error) {
        log.warn("Anexo salvo sem URL temporária imediata", {
          error,
          attachmentId: attachment.id,
        });
      }
    }

    return {
      id: attachment.id,
      file_name: attachment.file_name,
      file_path: attachment.file_path,
      file_size: attachment.file_size,
      file_type: attachment.file_type,
      thumbnail_path: attachment.thumbnail_path ?? undefined,
      // Compatibility field for optimistic UI. The value is a short-lived
      // signed URL, never a public Storage URL.
      public_url: accessUrl ?? "",
    };
  }

  /**
   * Deletes an attachment as admin. Storage RLS independently enforces the
   * admin-only delete boundary.
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    await requireCurrentUserAdminAccess();

    const { data: attachment, error: fetchError } = await supabase
      .from("support_attachments")
      .select("file_path, thumbnail_path")
      .eq("id", attachmentId)
      .single();

    if (fetchError || !attachment) {
      throw new Error("Anexo não encontrado");
    }

    const filesToDelete = [attachment.file_path];
    if (attachment.thumbnail_path) {
      filesToDelete.push(attachment.thumbnail_path);
    }

    const { error: storageError } = await removeStorageFiles(BUCKET_NAME, filesToDelete);
    if (storageError) {
      log.error("Erro ao deletar arquivos do storage", {
        error: storageError,
        attachmentId,
        filesToDelete,
      });
      throw new Error("Erro ao deletar arquivo do anexo");
    }

    try {
      await callAdminRpc("admin_delete_support_attachment_record", {
        p_attachment_id: attachmentId,
        p_file_path: attachment.file_path,
        p_thumbnail_path: attachment.thumbnail_path ?? null,
      });
    } catch (error) {
      log.error("Erro ao deletar metadata do anexo", { error, attachmentId });
      throw new Error("Arquivo removido, mas houve erro ao remover o registro do anexo");
    }
  }

  /**
   * Lists attachments visible to the current authenticated user and hydrates
   * each private object with a short-lived signed URL.
   */
  async listAttachments(messageId: string) {
    await requireAuthenticatedUserId();

    const { data, error } = await supabase
      .from("support_attachments")
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) {
      log.error("Erro ao listar anexos", { error, messageId });
      throw new Error("Erro ao carregar anexos");
    }

    return Promise.all(
      (data || []).map(async (attachment) => {
        let accessUrl: string | null = null;
        let thumbnailUrl: string | null = null;

        try {
          accessUrl = await getSupportAttachmentSignedUrl(attachment.file_path);
          if (attachment.thumbnail_path) {
            thumbnailUrl = await getSupportAttachmentSignedUrl(attachment.thumbnail_path);
          }
        } catch (signedUrlError) {
          log.warn("Falha ao gerar URL temporária do anexo", {
            error: signedUrlError,
            attachmentId: attachment.id,
          });
        }

        return {
          ...attachment,
          access_url: accessUrl,
          thumbnail_url: thumbnailUrl,
        };
      }),
    );
  }
}

export const fileUploadService = new FileUploadService();
