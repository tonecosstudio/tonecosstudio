import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { isUUID } from "../_shared/validation.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapQueueDeleteError(message: string): {
  status: number;
  error: string;
} {
  if (message.includes("QUEUE_ITEM_NOT_FOUND")) {
    return { status: 404, error: "queue item not found" };
  }
  if (message.includes("QUEUE_ITEM_CHANGED")) {
    return { status: 409, error: "queue item changed while rejecting" };
  }
  if (
    message.includes("QUEUE_ID_REQUIRED") ||
    message.includes("STORAGE_TARGET_REQUIRED")
  ) {
    return { status: 400, error: "invalid queue item" };
  }
  if (message.startsWith("Forbidden")) {
    return { status: 403, error: message };
  }
  return { status: 500, error: "Internal server error" };
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const admin = await assertRateLimitedAdmin(req, "queue-reject");
    if (admin.rateLimited) return admin.rateLimited;

    const service = getServiceClient();

    const body = await req.json().catch(() => ({}));
    const queueId = String(body?.queueId ?? "").trim();
    if (!isUUID(queueId)) {
      return json({ ok: false, error: "queueId must be a valid UUID" }, 400);
    }

    const { data: row, error: qErr } = await service
      .from("images_queue")
      .select("id,storage_bucket,storage_path")
      .eq("id", queueId)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!row) {
      return json({ ok: false, error: "queue item not found" }, 404);
    }

    if (!row.storage_bucket || !row.storage_path) {
      return json(
        { ok: false, error: "queue item has no storage target" },
        409,
      );
    }

    // Remove file from storage (best-effort, but treat errors as fatal to avoid leaving dangling DB rows)
    const { error: rmErr } = await service.storage
      .from(row.storage_bucket)
      .remove([row.storage_path]);
    if (rmErr) throw new Error(`Storage remove failed: ${rmErr.message}`);

    const { error: dErr } = await service.rpc(
      "admin_delete_images_queue_item",
      {
        p_queue_id: queueId,
        p_storage_bucket: row.storage_bucket,
        p_storage_path: row.storage_path,
      },
    );
    if (dErr) {
      const mapped = mapQueueDeleteError(dErr.message || "");
      return json({ ok: false, error: mapped.error }, mapped.status);
    }

    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden")
      ? 403
      : msg === "Unauthorized"
        ? 401
        : 500;
    return json(
      { ok: false, error: status >= 500 ? "Internal server error" : msg },
      status,
    );
  }
});
