function getAllowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("SITE_URL") ?? "";
  const origins = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (Deno.env.get("ALLOW_LOCAL_ORIGINS") === "true") {
    origins.push("http://localhost:5173", "http://127.0.0.1:5173");
  }

  return origins;
}

function buildCorsHeaders(req?: Request) {
  const allowedOrigins = getAllowedOrigins();
  const origin = req?.headers.get("Origin") ?? allowedOrigins[0] ?? "";
  const allowOrigin = allowedOrigins.includes(origin) ? origin : "";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-bootstrap-admin-secret, x-cron-secret, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }

  return headers;
}

export const corsHeaders = buildCorsHeaders();

export function getCorsHeaders(req?: Request) {
  return buildCorsHeaders(req);
}

export function handleOptions(req: Request) {
  if (req.method === "OPTIONS") {
    const headers = getCorsHeaders(req);
    return new Response("ok", { status: headers["Access-Control-Allow-Origin"] ? 200 : 403, headers });
  }
  return null;
}
