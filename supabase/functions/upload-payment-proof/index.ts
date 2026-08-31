import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { createEdgeLogger } from "../_shared/edge-logger.ts";
import { checkContentLength } from "../_shared/payload-guard.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";

const log = createEdgeLogger("upload-payment-proof");

const STORAGE_BUCKET = "payment-proofs";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_REQUEST_SIZE = 6 * 1024 * 1024;
const MAX_FILES_PER_PAYMENT = 5;
const UPLOAD_RATE_LIMIT = { maxRequests: 10, windowSeconds: 60 * 60 } as const;
const SCAN_TIMEOUT_MS = 30_000;
const PAYMENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MIME_EXTENSIONS: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "application/pdf": ["pdf"],
};

class UploadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "INVALID_UPLOAD",
  ) {
    super(message);
  }
}

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

function extensionOf(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension.replace(/[^a-z0-9]/g, "");
}

function validateFileName(fileName: string) {
  if (
    !fileName ||
    fileName.length > 255 ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    Array.from(fileName).some((char) => {
      const code = char.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    throw new UploadError("Invalid file name", 400, "INVALID_FILE_NAME");
  }
}

function hasPrefix(bytes: Uint8Array, expected: readonly number[]): boolean {
  if (bytes.length < expected.length) return false;
  return expected.every((value, index) => bytes[index] === value);
}

function hasValidMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
  }
  if (mimeType === "image/png") {
    return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mimeType === "application/pdf") {
    return hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  }
  return false;
}

function validateFile(file: File, bytes: Uint8Array) {
  validateFileName(file.name);

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new UploadError("File must be between 1 byte and 5 MB", 400, "INVALID_FILE_SIZE");
  }

  const allowedExtensions = MIME_EXTENSIONS[file.type];
  if (!allowedExtensions) {
    throw new UploadError("Only JPG, PNG and PDF files are allowed", 400, "INVALID_FILE_TYPE");
  }

  const extension = extensionOf(file.name);
  if (!allowedExtensions.includes(extension)) {
    throw new UploadError("File extension does not match its MIME type", 400, "FILE_TYPE_MISMATCH");
  }

  if (!hasValidMagicBytes(bytes, file.type)) {
    throw new UploadError("File content does not match its declared type", 400, "FILE_SIGNATURE_MISMATCH");
  }
}

async function scanFile(file: File, bytes: Uint8Array): Promise<{ threats: string[] }> {
  const configuredUrl = Deno.env.get("MALWARE_SCANNER_URL")?.trim();
  if (!configuredUrl) {
    throw new UploadError(
      "Payment proof security scanner is unavailable",
      503,
      "SCANNER_NOT_CONFIGURED",
    );
  }

  let scannerUrl: URL;
  try {
    scannerUrl = new URL(configuredUrl);
  } catch {
    throw new UploadError("Invalid malware scanner URL", 503, "SCANNER_NOT_CONFIGURED");
  }

  if (!["https:", "http:"].includes(scannerUrl.protocol)) {
    throw new UploadError("Invalid malware scanner protocol", 503, "SCANNER_NOT_CONFIGURED");
  }

  if (
    scannerUrl.protocol !== "https:" &&
    Deno.env.get("ALLOW_INSECURE_MALWARE_SCANNER") !== "true"
  ) {
    throw new UploadError(
      "Malware scanner must use HTTPS",
      503,
      "SCANNER_INSECURE_TRANSPORT",
    );
  }

  const headers = new Headers({
    "Content-Type": file.type,
    "X-File-Name": encodeURIComponent(file.name).slice(0, 512),
  });
  const scannerToken = Deno.env.get("MALWARE_SCANNER_TOKEN")?.trim();
  if (scannerToken) {
    headers.set("Authorization", `Bearer ${scannerToken}`);
  }

  let response: Response;
  try {
    response = await fetch(scannerUrl, {
      method: "POST",
      headers,
      body: bytes,
      signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
    });
  } catch (error) {
    log.error("scanner_request_failed", { error });
    throw new UploadError("Security scan failed", 503, "SCAN_FAILED");
  }

  if (!response.ok) {
    log.error("scanner_rejected_request", { status: response.status });
    throw new UploadError("Security scan failed", 503, "SCAN_FAILED");
  }

  let payload: Record<string, unknown>;
  try {
    payload = await response.json();
  } catch {
    throw new UploadError("Invalid security scanner response", 503, "SCAN_FAILED");
  }

  const clean = payload.isClean === true || payload.safe === true;
  const explicitlyUnsafe = payload.isClean === false || payload.safe === false;
  const rawThreats = Array.isArray(payload.viruses)
    ? payload.viruses
    : Array.isArray(payload.threats)
      ? payload.threats
      : [];
  const threats = rawThreats
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.slice(0, 200))
    .slice(0, 20);

  if (!clean && !explicitlyUnsafe) {
    throw new UploadError("Ambiguous security scanner response", 503, "SCAN_FAILED");
  }

  if (!clean) {
    return { threats: threats.length > 0 ? threats : ["malware_detected"] };
  }

  return { threats: [] };
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
      timestamp: new Date().toISOString(),
    },
  });

  if (error) {
    log.error("security_incident_log_failed", { error, paymentId, userId });
  }
}

serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const tooLarge = checkContentLength(req, MAX_REQUEST_SIZE);
    if (tooLarge) return tooLarge;

    const { client, claims } = await getClaims(req);
    const userId = String(claims.sub ?? "");
    if (!userId) {
      throw new UploadError("Unauthorized", 401, "UNAUTHORIZED");
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
      throw new UploadError("Invalid payment id", 400, "INVALID_PAYMENT_ID");
    }
    if (!(fileValue instanceof File)) {
      throw new UploadError("File is required", 400, "FILE_REQUIRED");
    }

    const service = getServiceClient();
    const { data: payment, error: paymentError } = await service
      .from("manual_payments")
      .select("id, user_id")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError) throw paymentError;
    if (!payment) {
      throw new UploadError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    }
    if (payment.user_id !== userId) {
      throw new UploadError("Forbidden", 403, "FORBIDDEN");
    }

    const { count, error: countError } = await service
      .from("payment_files")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", paymentId);

    if (countError) throw countError;
    if ((count ?? 0) >= MAX_FILES_PER_PAYMENT) {
      throw new UploadError(
        `Maximum of ${MAX_FILES_PER_PAYMENT} files per payment reached`,
        400,
        "MAX_FILES_REACHED",
      );
    }

    const bytes = new Uint8Array(await fileValue.arrayBuffer());
    validateFile(fileValue, bytes);

    const scan = await scanFile(fileValue, bytes);
    if (scan.threats.length > 0) {
      await logMalwareIncident(service, userId, paymentId, fileValue.name, scan.threats);
      return json(
        req,
        { error: "Security threat detected in file", code: "MALWARE_DETECTED" },
        403,
      );
    }

    const extension = extensionOf(fileValue.name);
    const filePath = `${paymentId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await service.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, bytes, {
        contentType: fileValue.type,
        upsert: false,
        cacheControl: "0",
      });

    if (uploadError) {
      log.error("storage_upload_failed", { error: uploadError, paymentId, userId });
      throw new UploadError("File upload failed", 500, "UPLOAD_FAILED");
    }

    const { data: uploadRecord, error: recordError } = await client.rpc(
      "record_payment_file_upload",
      {
        p_payment_id: paymentId,
        p_file_name: fileValue.name,
        p_file_path: filePath,
        p_file_size: fileValue.size,
        p_file_type: fileValue.type,
        p_thumbnail_path: null,
      },
    );

    if (recordError || !uploadRecord) {
      await service.storage.from(STORAGE_BUCKET).remove([filePath]);
      log.error("payment_file_record_failed", { error: recordError, paymentId, userId });
      throw new UploadError("Failed to save file record", 500, "DATABASE_ERROR");
    }

    log.info("payment_proof_uploaded", {
      paymentId,
      userId,
      fileType: fileValue.type,
      fileSize: fileValue.size,
    });

    return json(req, uploadRecord, 201);
  } catch (error) {
    if (error instanceof UploadError) {
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
