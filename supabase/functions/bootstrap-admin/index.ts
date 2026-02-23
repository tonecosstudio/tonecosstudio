import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { claims } = await getClaims(req);
    const userId = String(claims.sub);

    const service = getServiceClient();
    const { count, error: cErr } = await service.from("user_roles").select("id", { count: "exact", head: true });
    if (cErr) throw cErr;

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ ok: false, error: "Admin already exists" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await service.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
