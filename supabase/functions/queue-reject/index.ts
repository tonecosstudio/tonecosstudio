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
    const queueId = String(body?.queueId ?? "").trim();
    if (!queueId) {
      return new Response(JSON.stringify({ ok: false, error: "queueId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error: qErr } = await service
      .from("images_queue")
      .select("id,storage_bucket,storage_path")
      .eq("id", queueId)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: "queue item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove file from storage (best-effort, but treat errors as fatal to avoid leaving dangling DB rows)
    const { error: rmErr } = await service.storage.from(row.storage_bucket).remove([row.storage_path]);
    if (rmErr) throw new Error(`Storage remove failed: ${rmErr.message}`);

    const { error: dErr } = await service.from("images_queue").delete().eq("id", queueId);
    if (dErr) throw dErr;

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
