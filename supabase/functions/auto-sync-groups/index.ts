// Edge Function: auto-sync-groups
// Triggers database-owned automatic group membership synchronization.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...getCorsHeaders(req),
        "Access-Control-Allow-Methods": "POST",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return json(req, { success: false, error: "Method not allowed" }, 405);
    }

    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "auto-sync-groups",
    );
    if (forbidden) return forbidden;

    const service = getServiceClient();
    const { data, error } = await service.rpc("sync_all_automatic_groups");

    if (error) {
      console.error("Failed to sync automatic groups:", error.message);
      return json(req, { success: false, error: "Internal server error" }, 500);
    }

    return json(
      req,
      data ?? {
        success: true,
        message: "Auto-sync completed",
        summary: {
          groupsProcessed: 0,
          totalAdded: 0,
          totalRemoved: 0,
          errors: 0,
        },
        results: [],
      },
    );
  } catch (error) {
    console.error("Error in auto-sync-groups function:", error);
    return json(req, { success: false, error: "Internal server error" }, 500);
  }
});
