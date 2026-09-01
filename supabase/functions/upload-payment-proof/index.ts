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

const log = createEdgeLogger("upload-payment-proof");
const STORAGE_BUCKET = "payment-proofs";
const MAX_FILES_PER_PAYMENT = 5;
const UPLOAD_RATE_LIMIT = { maxRequests: 10, windowSeconds: 60 * 60 } as const;
const PAYMENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_PAYMENTS_PATH = "/admin/pagamentos";

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

async function logMalwareIncident(
  client: ReturnType<typeof getServiceClient>,
  userId: string,
  paymentId: string,
  fileName: string,
  threats: string[],
) {
  const { error } = await client.from("security_incidents").insert({
    incident_type: "MALWARE_DETECTED",
    file_name: fileName.slice(0, 255),
    user_id: userId,
    payment_id: paymentId,
    details: {
      threats,
      scanner: "server",
      source: "payment-proof",
      timestamp: new Date().toISOString(),
    },
  });

  if (error) {
    log.error("security_incident_log_failed", { error, paymentId, userId });
  }
}

async function notifyAdminsPaymentUnderReview(
  service: ReturnType<typeof getServiceClient>,
  paymentId: string,
  referenceNumber: string | null,
): Promise<void> {
  const label = referenceNumber?.trim() || paymentId;
  const { error } = await service.rpc("create_admin_notification", {
    p_type: "payment_under_review",
    p_title: "Pagamento em revisao",
    p_message: `Pagamento ${label} recebeu comprovante e precisa de analise.`,
    p_priority: "high",
    p_icon: "CreditCard",
    p_action_url: ADMIN_PAYMENTS_PATH,
    p_related_id: paymentId,
    p_related_type: "payment",
    p_metadata: {
      payment_id: paymentId,
      reference_number: referenceNumber,
      source: "upload-payment-proof",
    },
    p_recipient_user_id: null,
  });

  if (error) {
    log.error("admin_payment_notification_failed", {
      error,
      paymentId,
    });
  }
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
      "upload-payment-proof",
      UPLOAD_RATE_LIMIT,
      userId,
    );
    if (rateLimited) return rateLimited;

    const form = await req.formData();
    const paymentIdValue = form.get("paymentId");
    const fileValue = form.get("file");
    const paymentId = typeof paymentIdValue === "string" ? paymentIdValue.trim() : "";

    if (!PAYMENT_ID_RE.test(paymentId)) {
      throw new SecureUploadError("Invalid payment id", 400, "INVALID_PAYMENT_ID");
    }
    if (!(fileValue instanceof File)) {
      throw new SecureUploadError("File is required", 400, "FILE_REQUIRED");
    }

    const service = getServiceClient();
    const { data: payment, error: paymentError } = await service
      .from("manual_payments")
      .select("id, user_id, reference_number")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError) throw paymentError;
    if (!payment) {
      throw new SecureUploadError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    }
    if (payment.user_id !== userId) {
      throw new SecureUploadError("Forbidden", 403, "FORBIDDEN");
    }

    const { count, error: countError } = await service
      .from("payment_files")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", paymentId);

    if (countError) throw countError;
    if ((count ?? 0) >= MAX_FILES_PER_PAYMENT) {
      throw new SecureUploadError(
        `Maximum of ${MAX_FILES_PER_PAYMENT} files per payment reached`,
        400,
        "MAX_FILES_REACHED",
      );
    }

    const bytes = new Uint8Array(await fileValue.arrayBuffer());
    const { extension, mimeType } = validateSecureUpload(fileValue, bytes);
    const scan = await scanSecureUpload(fileValue.name, mimeType, bytes);

    if (scan.threats.length > 0) {
      await logMalwareIncident(service, userId, paymentId, fileValue.name, scan.threats);
      return json(
        req,
        { error: "Security threat detected in file", code: "MALWARE_DETECTED" },
        403,
      );
    }

    const filePath = `${paymentId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await service.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: false,
        cacheControl: "0",
      });

    if (uploadError) {
      log.error("storage_upload_failed", { error: uploadError, paymentId, userId });
      throw new SecureUploadError("File upload failed", 500, "UPLOAD_FAILED");
    }

    const { data: uploadRecord, error: recordError } = await client.rpc(
      "record_payment_file_upload",
      {
        p_payment_id: paymentId,
        p_file_name: fileValue.name,
        p_file_path: filePath,
        p_file_size: fileValue.size,
        p_file_type: mimeType,
        p_thumbnail_path: null,
      },
    );

    if (recordError || !uploadRecord) {
      await service.storage.from(STORAGE_BUCKET).remove([filePath]);
      log.error("payment_file_record_failed", { error: recordError, paymentId, userId });
      throw new SecureUploadError("Failed to save file record", 500, "DATABASE_ERROR");
    }

    const uploadResult = uploadRecord as { firstFile?: boolean };
    if (uploadResult.firstFile === true) {
      await notifyAdminsPaymentUnderReview(
        service,
        paymentId,
        typeof payment.reference_number === "string" ? payment.reference_number : null,
      );
    }

    log.info("payment_proof_uploaded", {
      paymentId,
      userId,
      fileType: mimeType,
      fileSize: fileValue.size,
      firstFile: uploadResult.firstFile === true,
    });

    return json(req, uploadRecord, 201);
  } catch (error) {
    if (error instanceof SecureUploadError) {
      return json(req, { error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : "Unexpected upload error";
    log.error("payment_proof_upload_failed", { error });
    const status = message === "Unauthorized" ? 401 : 500;
    return json(
      req,
      {
        error: status === 401 ? "Unauthorized" : "Payment proof upload failed",
        code: status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR",
      },
      status,
    );
  }
});
