import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { createEdgeLogger } from "../_shared/edge-logger.ts";
import { logAdminAction } from "../_shared/security-logger.ts";

const log = createEdgeLogger("generate-shipping-label");
const MAX_REFERENCE_LENGTH = 160;
const MAX_TEXT_LENGTH = 180;
const MAX_COMPLEMENT_LENGTH = 220;
const MAX_PHONE_LENGTH = 40;
const MAX_TRACKING_LENGTH = 120;
const MAX_LABEL_URL_LENGTH = 2048;
const DEFAULT_WEIGHT_KG = 0.5;
const MAX_WEIGHT_KG = 30;

const BRAZIL_STATE_CODES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

type JsonRecord = Record<string, unknown>;

type ShippingAddress = {
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
};

type CarrierLabelResponse = {
  trackingCode: string;
  labelUrl: string;
  cost: number;
};

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function requireText(
  value: unknown,
  field: string,
  maxLength = MAX_TEXT_LENGTH,
): string {
  if (typeof value !== "string") {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }

  return normalized;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return requireText(value, field, maxLength);
}

function parseAddress(value: unknown): ShippingAddress {
  const address = asRecord(value);
  if (!address) throw new Error("INVALID_ADDRESS");

  const state = requireText(address.state, "state", 2).toUpperCase();
  if (!BRAZIL_STATE_CODES.has(state)) throw new Error("INVALID_STATE");

  const zipCode = requireText(address.zipCode, "zip_code", 9);
  if (!/^\d{5}-?\d{3}$/.test(zipCode)) throw new Error("INVALID_ZIP_CODE");

  return {
    name: requireText(address.name, "name"),
    street: requireText(address.street, "street"),
    number: requireText(address.number, "number", 40),
    complement: optionalText(address.complement, "complement", MAX_COMPLEMENT_LENGTH),
    neighborhood: requireText(address.neighborhood, "neighborhood"),
    city: requireText(address.city, "city"),
    state,
    zipCode,
    phone: optionalText(address.phone, "phone", MAX_PHONE_LENGTH),
  };
}

function parseWeight(value: unknown): number {
  const weight = value === undefined ? DEFAULT_WEIGHT_KG : Number(value);
  if (!Number.isFinite(weight) || weight <= 0 || weight > MAX_WEIGHT_KG) {
    throw new Error("INVALID_WEIGHT");
  }
  return weight;
}

function getCarrierApiUrl(): URL {
  const raw = Deno.env.get("CARRIER_LABEL_API_URL")?.trim();
  if (!raw) throw new Error("CARRIER_LABEL_API_NOT_CONFIGURED");

  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !local) {
    throw new Error("CARRIER_LABEL_API_URL_MUST_USE_HTTPS");
  }
  return url;
}

function validateLabelUrl(value: unknown): string {
  const raw = requireText(value, "label_url", MAX_LABEL_URL_LENGTH);
  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !local) {
    throw new Error("INVALID_CARRIER_LABEL_URL");
  }
  return url.toString();
}

function parseCarrierResponse(value: unknown): CarrierLabelResponse {
  const payload = asRecord(value);
  if (!payload) throw new Error("INVALID_CARRIER_RESPONSE");

  const trackingCode = requireText(
    payload.trackingCode,
    "tracking_code",
    MAX_TRACKING_LENGTH,
  );
  const labelUrl = validateLabelUrl(payload.labelUrl);
  const cost = Number(payload.cost);

  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error("INVALID_CARRIER_COST");
  }

  return { trackingCode, labelUrl, cost };
}

function errorStatus(message: string): number {
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  if (message.startsWith("INVALID_")) return 400;
  if (message === "CARRIER_LABEL_API_NOT_CONFIGURED") return 503;
  if (message === "CARRIER_LABEL_API_URL_MUST_USE_HTTPS") return 503;
  if (message === "CARRIER_TIMEOUT") return 504;
  if (message.startsWith("CARRIER_HTTP_")) return 502;
  return 500;
}

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== "POST") {
    return json(req, { ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const admin = await assertRateLimitedAdmin(req, "generate-shipping-label");
    if (admin.rateLimited) return admin.rateLimited;

    const body = asRecord(await req.json().catch(() => null));
    if (!body) return json(req, { ok: false, error: "INVALID_PAYLOAD" }, 400);

    const referenceId = requireText(
      body.referenceId,
      "reference_id",
      MAX_REFERENCE_LENGTH,
    );
    const address = parseAddress(body.address);
    const weightKg = parseWeight(body.weightKg);
    const carrierUrl = getCarrierApiUrl();
    const carrierToken = Deno.env.get("CARRIER_LABEL_API_TOKEN")?.trim();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (carrierToken) headers.Authorization = `Bearer ${carrierToken}`;

    let response: Response;
    try {
      response = await fetch(carrierUrl.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({ referenceId, address, weightKg }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error("CARRIER_TIMEOUT");
      }
      throw error;
    }

    if (!response.ok) {
      log.warn("carrier_label_request_failed", {
        status: response.status,
        carrierHost: carrierUrl.host,
      });
      throw new Error(`CARRIER_HTTP_${response.status}`);
    }

    const label = parseCarrierResponse(await response.json().catch(() => null));

    logAdminAction(
      req,
      "generate-shipping-label",
      admin.userId,
      "shipping_label_generated",
      { referenceId, carrierHost: carrierUrl.host },
    );

    return json(req, { ok: true, data: label }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = errorStatus(message);
    log.error("shipping_label_generation_failed", {
      status,
      reason: status >= 500 ? message : undefined,
    });

    return json(
      req,
      {
        ok: false,
        error: status >= 500 && status !== 503 ? "SHIPPING_PROVIDER_ERROR" : message,
      },
      status,
    );
  }
});
