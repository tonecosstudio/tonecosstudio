import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { isUUID } from "../_shared/validation.ts";

type JsonObject = Record<string, unknown>;

const UPDATE_COLLECTION_FIELDS = new Set([
  "name",
  "description",
  "slug",
  "image_url",
  "cover_image_url",
  "rotation_type",
  "is_active",
  "tier_id",
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pickCollectionPayload(body: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => UPDATE_COLLECTION_FIELDS.has(key)),
  );
}

function mapCollectionRpcError(message: string): {
  status: number;
  error: string;
} {
  if (message.includes("duplicate key") || message.includes("already exists")) {
    return { status: 400, error: "Collection slug already exists" };
  }
  if (
    message.includes("Collection not found") ||
    message.includes("Pricing tier not found")
  ) {
    return { status: 404, error: message };
  }
  if (
    message.includes("required") ||
    message.includes("Invalid") ||
    message.includes("payload")
  ) {
    return { status: 400, error: message };
  }
  return { status: 500, error: "Internal server error" };
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const admin = await assertRateLimitedAdmin(req, "admin-update-collection");
    if (admin.rateLimited) return admin.rateLimited;

    const service = getServiceClient();
    const body = (await req.json().catch(() => ({}))) as JsonObject;
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!isUUID(id)) {
      return json({ ok: false, error: "id must be a valid UUID" }, 400);
    }

    const payload = pickCollectionPayload(body);
    if (Object.keys(payload).length === 0) {
      return json({ ok: false, error: "No fields provided to update" }, 400);
    }

    const { error } = await service.rpc("admin_update_collection", {
      p_collection_id: id,
      p_payload: payload,
    });

    if (error) {
      const mapped = mapCollectionRpcError(error.message || "");
      return json({ ok: false, error: mapped.error }, mapped.status);
    }

    const { data: collection, error: fetchError } = await service
      .from("collections")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching updated collection:", fetchError.message);
      return json({ ok: true, collection: { id } });
    }

    return json({ ok: true, collection });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden")
      ? 403
      : msg === "Unauthorized"
        ? 401
        : 500;
    console.error("Error updating collection:", msg);
    return json(
      { ok: false, error: status >= 500 ? "Internal server error" : msg },
      status,
    );
  }
});
