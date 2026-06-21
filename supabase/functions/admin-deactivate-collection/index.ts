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

function mapDeactivateError(message: string): {
  status: number;
  error: string;
  activeDeliveriesCount?: number;
} {
  if (message.includes("COLLECTION_NOT_FOUND")) {
    return { status: 404, error: "Collection not found" };
  }
  if (message.includes("COLLECTION_ALREADY_INACTIVE")) {
    return { status: 400, error: "Collection is already inactive" };
  }
  if (message.includes("COLLECTION_HAS_ACTIVE_DELIVERIES")) {
    const count = Number(message.split(":").at(-1));
    return {
      status: 400,
      error: "Cannot deactivate collection with active deliveries",
      activeDeliveriesCount: Number.isFinite(count) ? count : undefined,
    };
  }
  if (message.includes("COLLECTION_ID_REQUIRED")) {
    return { status: 400, error: "id is required" };
  }
  return { status: 500, error: "Internal server error" };
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const admin = await assertRateLimitedAdmin(
      req,
      "admin-deactivate-collection",
    );
    if (admin.rateLimited) return admin.rateLimited;

    const service = getServiceClient();
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (!isUUID(id)) {
      return json({ ok: false, error: "id must be a valid UUID" }, 400);
    }

    const { data: collection, error } = await service.rpc(
      "admin_deactivate_collection",
      {
        p_collection_id: id,
      },
    );

    if (error) {
      const mapped = mapDeactivateError(error.message || "");
      return json(
        {
          ok: false,
          error: mapped.error,
          ...(mapped.activeDeliveriesCount !== undefined
            ? { activeDeliveriesCount: mapped.activeDeliveriesCount }
            : {}),
        },
        mapped.status,
      );
    }

    return json({ ok: true, collection });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden")
      ? 403
      : msg === "Unauthorized"
        ? 401
        : 500;
    console.error("Error deactivating collection:", msg);
    return json(
      { ok: false, error: status >= 500 ? "Internal server error" : msg },
      status,
    );
  }
});
