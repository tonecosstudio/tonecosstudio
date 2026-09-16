import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { createEdgeLogger } from "../_shared/edge-logger.ts";
import { checkContentLength } from "../_shared/payload-guard.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { hasAdminAccessRole } from "../_shared/roles.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";

const log = createEdgeLogger("get-manual-payment-timeline");
const PAYMENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BYTES = 4 * 1024;
const READ_RATE_LIMIT = { maxRequests: 120, windowSeconds: 60 } as const;

type TimelineAction =
  | "created"
  | "status_changed"
  | "file_uploaded"
  | "approved"
  | "rejected"
  | "info_requested";

interface TimelineEvent {
  id: string;
  payment_id: string;
  action_type: TimelineAction;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function actionForStatus(status: string): TimelineAction {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "status_changed";
}

serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const tooLarge = checkContentLength(req, MAX_REQUEST_BYTES);
    if (tooLarge) return tooLarge;

    const { claims } = await getClaims(req);
    const userId = String(claims.sub ?? "");
    if (!userId) {
      return json(req, { error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }

    const rateLimited = await checkRateLimit(
      req,
      "get-manual-payment-timeline",
      READ_RATE_LIMIT,
      userId,
    );
    if (rateLimited) return rateLimited;

    const body = await req.json().catch(() => null) as { paymentId?: unknown } | null;
    const paymentId = typeof body?.paymentId === "string" ? body.paymentId.trim() : "";
    if (!PAYMENT_ID_RE.test(paymentId)) {
      return json(req, { error: "Invalid payment id", code: "INVALID_PAYMENT_ID" }, 400);
    }

    const service = getServiceClient();
    const { data: payment, error: paymentError } = await service
      .from("manual_payments")
      .select("id,user_id,status,rejection_reason,created_at,updated_at")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError) throw paymentError;
    if (!payment) {
      return json(req, { error: "Payment not found", code: "PAYMENT_NOT_FOUND" }, 404);
    }

    if (payment.user_id !== userId) {
      const { data: profile, error: profileError } = await service
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile || !hasAdminAccessRole(profile.role)) {
        return json(req, { error: "Forbidden", code: "FORBIDDEN" }, 403);
      }
    }

    const [historyResult, infoResult, filesResult] = await Promise.all([
      service
        .from("order_status_history")
        .select("id,old_status,new_status,notes,created_at")
        .eq("order_id", paymentId)
        .eq("order_type", "manual_payment")
        .order("created_at", { ascending: true }),
      service
        .from("payment_info_requests")
        .select("id,message,created_at")
        .eq("payment_id", paymentId)
        .order("created_at", { ascending: true }),
      service
        .from("payment_files")
        .select("id,file_name,created_at")
        .eq("payment_id", paymentId)
        .order("created_at", { ascending: true }),
    ]);

    if (historyResult.error) throw historyResult.error;
    if (infoResult.error) throw infoResult.error;
    if (filesResult.error) throw filesResult.error;

    const events: TimelineEvent[] = [
      {
        id: `created:${payment.id}`,
        payment_id: payment.id,
        action_type: "created",
        old_status: null,
        new_status: "pending",
        notes: null,
        created_at: payment.created_at,
      },
    ];

    for (const row of historyResult.data ?? []) {
      events.push({
        id: row.id,
        payment_id: payment.id,
        action_type: actionForStatus(String(row.new_status ?? "")),
        old_status: row.old_status,
        new_status: row.new_status,
        notes: row.notes,
        created_at: row.created_at,
      });
    }

    for (const row of infoResult.data ?? []) {
      events.push({
        id: row.id,
        payment_id: payment.id,
        action_type: "info_requested",
        old_status: null,
        new_status: "requires_info",
        notes: row.message,
        created_at: row.created_at,
      });
    }

    for (const row of filesResult.data ?? []) {
      events.push({
        id: row.id,
        payment_id: payment.id,
        action_type: "file_uploaded",
        old_status: null,
        new_status: null,
        notes: row.file_name,
        created_at: row.created_at,
      });
    }

    const currentStatus = String(payment.status ?? "");
    const hasCurrentStatusEvent = events.some(
      (event) => event.new_status === currentStatus && event.action_type !== "info_requested",
    );

    if (currentStatus && currentStatus !== "pending" && !hasCurrentStatusEvent) {
      events.push({
        id: `current:${payment.id}:${currentStatus}`,
        payment_id: payment.id,
        action_type: actionForStatus(currentStatus),
        old_status: null,
        new_status: currentStatus,
        notes: currentStatus === "rejected" ? payment.rejection_reason : null,
        created_at: payment.updated_at,
      });
    }

    events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    log.info("manual_payment_timeline_read", {
      paymentId,
      userId,
      eventCount: events.length,
    });

    return json(req, { data: events });
  } catch (error) {
    log.error("manual_payment_timeline_failed", { error });
    return json(
      req,
      { error: "Failed to load payment timeline", code: "INTERNAL_ERROR" },
      500,
    );
  }
});
