import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    await assertAdmin(req);
    const service = getServiceClient();

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const role = String(body?.role ?? "admin").trim();
    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (role !== "admin" && role !== "moderator" && role !== "user") {
      return new Response(JSON.stringify({ ok: false, error: "invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user by email (list and filter - acceptable for small projects)
    const { data: list, error: listErr } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);
    const found = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!found) {
      return new Response(JSON.stringify({ ok: false, error: "user not found (did they sign up?)" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await service.from("user_roles").upsert({ user_id: found.id, role }, { onConflict: "user_id,role" });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden") ? 403 : msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
