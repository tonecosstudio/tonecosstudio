import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { isUUID } from "../_shared/validation.ts";

function mapRoleRpcError(message: string): { status: number; error: string } {
  if (message.includes("TARGET_PROFILE_NOT_FOUND")) {
    return { status: 404, error: "user not found (did they sign up?)" };
  }
  if (message.includes("INVALID_ROLE")) {
    return { status: 400, error: "invalid role" };
  }
  if (message.includes("TARGET_USER_ID_REQUIRED")) {
    return { status: 400, error: "target user id is required" };
  }
  if (message.includes("SUPER_ADMIN_REQUIRES_SUPER_ADMIN")) {
    return {
      status: 403,
      error: "super admin can only be changed by super admin",
    };
  }
  if (message.includes("CANNOT_REMOVE_LAST_ADMIN")) {
    return { status: 409, error: "cannot remove the last admin" };
  }
  if (message.includes("ACTOR_PROFILE_NOT_FOUND")) {
    return { status: 403, error: "admin profile not found" };
  }
  return { status: 500, error: "Internal server error" };
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const corsHeaders = getCorsHeaders(req);

  try {
    const adminUser = await assertRateLimitedAdmin(req, "admin-promote");
    if (adminUser.rateLimited) return adminUser.rateLimited;

    const service = getServiceClient();

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const userId = String(body?.userId ?? "").trim();
    const role = String(body?.role ?? "admin").trim();

    if (!email && !userId) {
      return new Response(
        JSON.stringify({ ok: false, error: "email or userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (userId && !isUUID(userId)) {
      return new Response(
        JSON.stringify({ ok: false, error: "userId must be a valid UUID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (role !== "admin" && role !== "customer") {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid role" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const profileQuery = service
      .from("profiles")
      .select("id, email")
      .limit(1);

    const { data: targetProfiles, error: targetErr } = userId
      ? await profileQuery.eq("id", userId)
      : await profileQuery.eq("email", email);
    if (targetErr) throw targetErr;

    const target = targetProfiles?.[0];
    if (!target) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "user not found (did they sign up?)",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: profile, error: roleErr } = await adminUser.client.rpc(
      "admin_set_tonecos_admin_access",
      {
        p_target_user_id: target.id,
        p_is_admin: role === "admin",
      },
    );
    if (roleErr) {
      const mapped = mapRoleRpcError(roleErr.message || "");
      return new Response(JSON.stringify({ ok: false, error: mapped.error }), {
        status: mapped.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, profile: profile ?? { id: target.id, role } }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden")
      ? 403
      : msg === "Unauthorized"
        ? 401
        : 500;
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
