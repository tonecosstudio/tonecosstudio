export const MAX_SECURE_UPLOAD_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_SECURE_UPLOAD_REQUEST_SIZE = 6 * 1024 * 1024;

const SCAN_TIMEOUT_MS = 30_000;

const MIME_EXTENSIONS: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "application/pdf": ["pdf"],
};

export class SecureUploadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "INVALID_UPLOAD",
  ) {
    super(message);
    this.name = "SecureUploadError";
  }
}

export function normalizeSecureUploadMimeType(mimeType: string): string {
  return mimeType.toLowerCase() === "image/jpg" ? "image/jpeg" : mimeType.toLowerCase();
}

export function secureUploadExtension(fileName: string): string {
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
    throw new SecureUploadError("Invalid file name", 400, "INVALID_FILE_NAME");
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

export function validateSecureUpload(
  file: File,
  bytes: Uint8Array,
): { extension: string; mimeType: string } {
  validateFileName(file.name);

  if (file.size <= 0 || file.size > MAX_SECURE_UPLOAD_FILE_SIZE) {
    throw new SecureUploadError(
      "File must be between 1 byte and 5 MB",
      400,
      "INVALID_FILE_SIZE",
    );
  }

  if (bytes.byteLength !== file.size) {
    throw new SecureUploadError("File size mismatch", 400, "FILE_SIZE_MISMATCH");
  }

  const mimeType = normalizeSecureUploadMimeType(file.type);
  const allowedExtensions = MIME_EXTENSIONS[mimeType];
  if (!allowedExtensions) {
    throw new SecureUploadError(
      "Only JPG, PNG and PDF files are allowed",
      400,
      "INVALID_FILE_TYPE",
    );
  }

  const extension = secureUploadExtension(file.name);
  if (!allowedExtensions.includes(extension)) {
    throw new SecureUploadError(
      "File extension does not match its MIME type",
      400,
      "FILE_TYPE_MISMATCH",
    );
  }

  if (!hasValidMagicBytes(bytes, mimeType)) {
    throw new SecureUploadError(
      "File content does not match its declared type",
      400,
      "FILE_SIGNATURE_MISMATCH",
    );
  }

  return { extension, mimeType };
}

export async function scanSecureUpload(
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<{ threats: string[] }> {
  const configuredUrl = Deno.env.get("MALWARE_SCANNER_URL")?.trim();
  if (!configuredUrl) {
    throw new SecureUploadError(
      "Upload security scanner is unavailable",
      503,
      "SCANNER_NOT_CONFIGURED",
    );
  }

  let scannerUrl: URL;
  try {
    scannerUrl = new URL(configuredUrl);
  } catch {
    throw new SecureUploadError(
      "Invalid malware scanner URL",
      503,
      "SCANNER_NOT_CONFIGURED",
    );
  }

  if (!["https:", "http:"].includes(scannerUrl.protocol)) {
    throw new SecureUploadError(
      "Invalid malware scanner protocol",
      503,
      "SCANNER_NOT_CONFIGURED",
    );
  }

  if (
    scannerUrl.protocol !== "https:" &&
    Deno.env.get("ALLOW_INSECURE_MALWARE_SCANNER") !== "true"
  ) {
    throw new SecureUploadError(
      "Malware scanner must use HTTPS",
      503,
      "SCANNER_INSECURE_TRANSPORT",
    );
  }

  const headers = new Headers({
    "Content-Type": mimeType,
    "X-File-Name": encodeURIComponent(fileName).slice(0, 512),
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
  } catch {
    throw new SecureUploadError("Security scan failed", 503, "SCAN_FAILED");
  }

  if (!response.ok) {
    throw new SecureUploadError("Security scan failed", 503, "SCAN_FAILED");
  }

  let payload: Record<string, unknown>;
  try {
    payload = await response.json();
  } catch {
    throw new SecureUploadError(
      "Invalid security scanner response",
      503,
      "SCAN_FAILED",
    );
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
    throw new SecureUploadError(
      "Ambiguous security scanner response",
      503,
      "SCAN_FAILED",
    );
  }

  return clean
    ? { threats: [] }
    : { threats: threats.length > 0 ? threats : ["malware_detected"] };
}
