import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { getPublicAnonClient } from "../_shared/supabase.ts";

type JsonObject = Record<string, unknown>;

const MODEL_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,239}$/;
const MAX_BODY_BYTES = 1024;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function parseSlug(value: unknown): string | null {
  if (!isObject(value) || Object.keys(value).length !== 1) return null;
  const slug = value.modelSlug;
  if (
    typeof slug !== "string" ||
    slug.length > 240 ||
    !MODEL_SLUG_PATTERN.test(slug)
  ) {
    return null;
  }
  return slug;
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return json(req, { error: "method_not_allowed" }, 405);
  }

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return json(req, { error: "invalid_request" }, 400);
  }
  if (new TextEncoder().encode(bodyText).length > MAX_BODY_BYTES) {
    return json(req, { error: "request_too_large" }, 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText) as unknown;
  } catch {
    return json(req, { error: "invalid_request" }, 400);
  }
  const modelSlug = parseSlug(payload);
  if (!modelSlug) return json(req, { error: "invalid_model_slug" }, 400);

  try {
    const supabase = getPublicAnonClient();
    const { data, error } = await supabase.rpc(
      "tonart_public_commercial_offers_for_model",
      { p_catalog_model_slug: modelSlug },
    );
    if (error || !Array.isArray(data) || data.length > 4) {
      return json(req, { error: "commercial_offers_unavailable" }, 503);
    }

    return json(req, { data });
  } catch {
    return json(req, { error: "commercial_offers_unavailable" }, 503);
  }
});
