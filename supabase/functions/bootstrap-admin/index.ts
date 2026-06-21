import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";

function mapBootstrapRpcError(message: string): {
  status: number;
  error: string;
} {
  if (message.includes("ADMIN_ALREADY_EXISTS")) {
    return { status: 403, error: "Admin already exists" };
  }
  if (message.includes("PROFILE_NOT_FOUND")) {
    return { status: 404, error: "Profile not found" };
  }
  if (message.includes("USER_ID_REQUIRED")) {
    return { status: 400, error: "User id is required" };
  }
  if (message.includes("FORBIDDEN")) {
    return { status: 403, error: "Bootstrap is disabled" };
  }
  return { status: 500, error: "Internal server error" };
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const corsHeaders = getCorsHeaders(req);

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const rateLimited = await checkRateLimit(
      req,
      "bootstrap-admin",
      RATE_LIMITS.AUTH,
    );
    if (rateLimited) return rateLimited;

    const { claims } = await getClaims(req);
    const userId = String(claims.sub);
    const bootstrapSecret = Deno.env.get("BOOTSTRAP_ADMIN_SECRET");
    const providedSecret = req.headers.get("x-bootstrap-admin-secret");

    if (!bootstrapSecret || providedSecret !== bootstrapSecret) {
      return new Response(
        JSON.stringify({ ok: false, error: "Bootstrap is disabled" }),
        {
          status: 403,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const service = getServiceClient();
    const { data: profile, error: bootstrapErr } = await service.rpc(
      "bootstrap_first_admin",
      {
        p_user_id: userId,
      },
    );
    if (bootstrapErr) {
      const mapped = mapBootstrapRpcError(bootstrapErr.message || "");
      return new Response(JSON.stringify({ ok: false, error: mapped.error }), {
        status: mapped.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        profile: profile ?? { id: userId, role: "admin" },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({
        ok: false,
        error: status >= 500 ? "Internal server error" : msg,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
