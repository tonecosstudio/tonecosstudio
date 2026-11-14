import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { createEdgeLogger } from "../_shared/edge-logger.ts";
import { checkContentLength } from "../_shared/payload-guard.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import {
  MAX_SECURE_UPLOAD_REQUEST_SIZE,
  SecureUploadError,
  scanSecureUpload,
  validateSecureUpload,
} from "../_shared/secure-upload.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";

const log = createEdgeLogger("upload-support-attachment");
const STORAGE_BUCKET = "support-attachments";
const MAX_ATTACHMENTS_PER_MESSAGE = 10;
const UPLOAD_RATE_LIMIT = { maxRequests: 20, windowSeconds: 60 * 60 } as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const tooLarge = checkContentLength(req, MAX_SECURE_UPLOAD_REQUEST_SIZE);
    if (tooLarge) return tooLarge;

    const { client, claims } = await getClaims(req);
    const userId = String(claims.sub ?? "");
    if (!userId) {
      throw new SecureUploadError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const rateLimited = await checkRateLimit(
      req,
      "upload-support-attachment",
      UPLOAD_RATE_LIMIT,
      userId,
    );
    if (rateLimited) return rateLimited;

    const form = await req.formData();
    const messageIdValue = form.get("messageId");
    const fileValue = form.get("file");
    const messageId = typeof messageIdValue === "string" ? messageIdValue.trim() : "";

    if (!UUID_RE.test(messageId)) {
      throw new SecureUploadError("Invalid message id", 400, "INVALID_MESSAGE_ID");
    }
    if (!(fileValue instanceof File)) {
      throw new SecureUploadError("File is required", 400, "FILE_REQUIRED");
    }

    const service = getServiceClient();

    const [
      { data: message, error: messageError },
      { data: isAdmin, error: adminCheckError },
    ] =
      await Promise.all([
        service
          .from("support_messages")
          .select("id, conversation_id, sender_id, is_internal, deleted_at")
          .eq("id", messageId)
          .maybeSingle(),
        client.rpc("is_tonecos_admin"),
      ]);

    if (messageError) throw messageError;
    if (adminCheckError) throw adminCheckError;
    if (!message) {
      throw new SecureUploadError("Message not found", 404, "MESSAGE_NOT_FOUND");
    }

    const { data: conversation, error: conversationError } = await service
      .from("support_conversations")
      .select("id, user_id, status")
      .eq("id", message.conversation_id)
      .maybeSingle();

    if (conversationError) throw conversationError;
    if (!conversation) {
      throw new SecureUploadError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
    }
    if (conversation.status === "closed") {
      throw new SecureUploadError("Conversation is closed", 400, "CONVERSATION_CLOSED");
    }
    if (message.deleted_at) {
      throw new SecureUploadError(
        "Deleted messages cannot receive attachments",
        400,
        "MESSAGE_DELETED",
      );
    }
    if (message.is_internal && !isAdmin) {
      throw new SecureUploadError("Forbidden", 403, "FORBIDDEN");
    }
    if (!isAdmin && conversation.user_id !== userId) {
      throw new SecureUploadError("Forbidden", 403, "FORBIDDEN");
    }
    if (!isAdmin && message.sender_id !== userId) {
      throw new SecureUploadError(
        "Only the sender can attach files to this message",
        403,
        "FORBIDDEN",
      );
    }

    const { count, error: countError } = await service
      .from("support_attachments")
      .select("id", { count: "exact", head: true })
      .eq("message_id", messageId);

    if (countError) throw countError;
    if ((count ?? 0) >= MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new SecureUploadError(
        `Maximum of ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message reached`,
        400,
        "MAX_FILES_REACHED",
      );
    }

    const bytes = new Uint8Array(await fileValue.arrayBuffer());
    const { extension, mimeType } = validateSecureUpload(fileValue, bytes);
    const scan = await scanSecureUpload(fileValue.name, mimeType, bytes);

    if (scan.threats.length > 0) {
      log.warn("support_attachment_malware_detected", {
        userId,
        messageId,
        conversationId: message.conversation_id,
        threats: scan.threats,
      });
      return json(
        req,
        { error: "Security threat detected in file", code: "MALWARE_DETECTED" },
        403,
      );
    }

    const filePath = `${message.conversation_id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await service.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: false,
        cacheControl: "0",
      });

    if (uploadError) {
      log.error("support_attachment_storage_upload_failed", {
        error: uploadError,
        userId,
        messageId,
      });
      throw new SecureUploadError("File upload failed", 500, "UPLOAD_FAILED");
    }

    const { data: attachment, error: recordError } = await client.rpc(
      "record_support_attachment_upload",
      {
        p_message_id: messageId,
        p_uploaded_by: userId,
        p_file_name: fileValue.name,
        p_file_path: filePath,
        p_file_size: fileValue.size,
        p_file_type: mimeType,
        p_thumbnail_path: null,
        p_public_url: null,
      },
    );

    if (recordError || !attachment) {
      await service.storage.from(STORAGE_BUCKET).remove([filePath]);
      log.error("support_attachment_record_failed", {
        error: recordError,
        userId,
        messageId,
      });
      throw new SecureUploadError(
        "Failed to save attachment record",
        500,
        "DATABASE_ERROR",
      );
    }

    const { data: signed, error: signedError } = await service.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 60 * 60);

    if (signedError) {
      log.warn("support_attachment_signed_url_failed", {
        error: signedError,
        attachmentId: attachment.id,
      });
    }

    log.info("support_attachment_uploaded", {
      attachmentId: attachment.id,
      messageId,
      conversationId: message.conversation_id,
      userId,
      fileType: mimeType,
      fileSize: fileValue.size,
    });

    return json(
      req,
      {
        attachment,
        accessUrl: signed?.signedUrl ?? null,
      },
      201,
    );
  } catch (error) {
    if (error instanceof SecureUploadError) {
      return json(req, { error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : "Unexpected upload error";
    log.error("support_attachment_upload_failed", { error });
    const status = message === "Unauthorized" ? 401 : 500;
    return json(
      req,
      {
        error: status === 401 ? "Unauthorized" : "Support attachment upload failed",
        code: status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR",
      },
      status,
    );
  }
});
