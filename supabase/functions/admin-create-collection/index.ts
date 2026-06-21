import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";

type JsonObject = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapCollectionRpcError(message: string): {
  status: number;
  error: string;
} {
  if (message.includes("duplicate key") || message.includes("already exists")) {
    return { status: 400, error: "Collection slug already exists" };
  }
  if (
    message.includes("required") ||
    message.includes("Invalid") ||
    message.includes("payload") ||
    message.includes("Pricing tier not found")
  ) {
    return {
      status: message.includes("not found") ? 404 : 400,
      error: message,
    };
  }
  return { status: 500, error: "Internal server error" };
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const admin = await assertRateLimitedAdmin(req, "admin-create-collection");
    if (admin.rateLimited) return admin.rateLimited;

    const service = getServiceClient();
    const payload = (await req.json().catch(() => ({}))) as JsonObject;

    const { data: collection, error } = await service.rpc(
      "admin_create_collection",
      {
        p_payload: payload,
      },
    );

    if (error) {
      const mapped = mapCollectionRpcError(error.message || "");
      return json({ ok: false, error: mapped.error }, mapped.status);
    }

    return json({ ok: true, collection }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden")
      ? 403
      : msg === "Unauthorized"
        ? 401
        : 500;
    console.error("Error creating collection:", msg);
    return json(
      { ok: false, error: status >= 500 ? "Internal server error" : msg },
      status,
    );
  }
});
