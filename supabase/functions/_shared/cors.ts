function getAllowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("SITE_URL") ?? "";
  const origins = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [
    ...origins,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
}

function buildCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") ?? "";
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? "http://localhost:5173";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-bootstrap-admin-secret, x-cron-secret, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}

export const corsHeaders = buildCorsHeaders();

export function getCorsHeaders(req?: Request) {
  return buildCorsHeaders(req);
}

export function handleOptions(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  return null;
}
