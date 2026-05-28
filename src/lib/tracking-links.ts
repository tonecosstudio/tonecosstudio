import { sanitizeURL } from "@/lib/security/input-sanitizer";

export const CORREIOS_TRACKING_BASE_URL =
  "https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm";
export const JADLOG_TRACKING_BASE_URL = "https://www.jadlog.com.br/tracking";

const TRACKING_CODE_PATTERN = /^[A-Z0-9][A-Z0-9 ._/-]{2,63}$/i;

function normalizeCarrier(carrier: string | null | undefined): string {
  return carrier?.trim().toLowerCase() || "correios";
}

export function normalizeTrackingCode(trackingCode: string): string | null {
  const normalizedCode = trackingCode.trim();

  if (!TRACKING_CODE_PATTERN.test(normalizedCode)) {
    return null;
  }

  return normalizedCode;
}

export function buildTrackingUrl(
  trackingCode: string | null | undefined,
  carrier?: string | null,
): string | null {
  if (!trackingCode) return null;

  const normalizedCode = normalizeTrackingCode(trackingCode);
  if (!normalizedCode) return null;

  const normalizedCarrier = normalizeCarrier(carrier);

  if (normalizedCarrier === "jadlog") {
    return sanitizeURL(
      `${JADLOG_TRACKING_BASE_URL}/${encodeURIComponent(normalizedCode)}`,
      ["https"],
    );
  }

  const url = new URL(CORREIOS_TRACKING_BASE_URL);
  url.searchParams.set("objeto", normalizedCode);

  return sanitizeURL(url.toString(), ["https"]);
}
