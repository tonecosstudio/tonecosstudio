/**
 * Cron Job: Tracking Status Updater
 *
 * Polls the configured carrier API and marks shipped/in-transit deliveries as
 * delivered when the carrier reports a completed delivery.
 */

import {
  logCronError,
  logCronStart,
  logCronSuccess,
} from "../_shared/cron-logger.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";

interface Delivery {
  id: string;
  tracking_code: string;
  status: string;
}

interface TrackingStatus {
  trackingCode: string;
  status:
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failed"
    | "returned"
    | "unknown";
  delivered: boolean;
  deliveredAt?: Date;
  lastUpdate: Date;
}

interface CarrierTrackingResponse {
  trackingCode?: string;
  status?: TrackingStatus["status"];
  delivered?: boolean;
  deliveredAt?: string;
  lastUpdate?: string;
}

const TRACKING_STATUSES = new Set<TrackingStatus["status"]>([
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
  "unknown",
]);

function getCarrierTrackingApiUrl(): URL {
  const rawUrl = Deno.env.get("CARRIER_TRACKING_API_URL");
  if (!rawUrl) {
    throw new Error(
      "CARRIER_TRACKING_API_URL is not configured; refusing to simulate tracking updates",
    );
  }

  const apiUrl = new URL(rawUrl);
  const isLocalhost =
    apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1";
  if (apiUrl.protocol !== "https:" && !isLocalhost) {
    throw new Error("CARRIER_TRACKING_API_URL must use HTTPS outside localhost");
  }
  return apiUrl;
}

function parseCarrierDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeTrackingStatus(
  trackingCode: string,
  payload: CarrierTrackingResponse,
): TrackingStatus {
  const status =
    payload.status && TRACKING_STATUSES.has(payload.status)
      ? payload.status
      : "unknown";
  const lastUpdate = parseCarrierDate(payload.lastUpdate, new Date());
  const delivered = payload.delivered ?? status === "delivered";

  return {
    trackingCode: payload.trackingCode || trackingCode,
    status,
    delivered,
    deliveredAt: delivered
      ? parseCarrierDate(payload.deliveredAt, lastUpdate)
      : undefined,
    lastUpdate,
  };
}

async function getTrackingStatus(trackingCode: string): Promise<TrackingStatus> {
  const apiUrl = getCarrierTrackingApiUrl();
  const apiToken = Deno.env.get("CARRIER_TRACKING_API_TOKEN");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  const response = await fetch(apiUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({ trackingCode }),
  });
  if (!response.ok) {
    throw new Error(`Carrier tracking API returned HTTP ${response.status}`);
  }

  return normalizeTrackingStatus(
    trackingCode,
    (await response.json()) as CarrierTrackingResponse,
  );
}

async function updateTrackingStatuses(supabase: any): Promise<{
  updatedCount: number;
  errors: Array<{ deliveryId: string; error: string }>;
}> {
  const { data: deliveries, error } = await supabase
    .from("subscription_deliveries")
    .select("id, tracking_code, status")
    .not("tracking_code", "is", null)
    .in("status", ["shipped", "in_transit"]);

  if (error) throw new Error(`Failed to fetch deliveries: ${error.message}`);

  let updatedCount = 0;
  const errors: Array<{ deliveryId: string; error: string }> = [];

  for (const delivery of (deliveries || []) as Delivery[]) {
    try {
      const status = await getTrackingStatus(delivery.tracking_code);
      if (!status.delivered) continue;

      const deliveredAt = status.deliveredAt || status.lastUpdate;
      if (Number.isNaN(deliveredAt.getTime())) {
        throw new Error("Carrier delivered timestamp is invalid");
      }

      const { data: updated, error: updateError } = await supabase
        .from("subscription_deliveries")
        .update({
          status: "delivered",
          actual_delivery_date: deliveredAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id)
        .in("status", ["shipped", "in_transit"])
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(`Failed to persist tracking update: ${updateError.message}`);
      }
      if (updated) updatedCount += 1;
    } catch (trackingError) {
      errors.push({
        deliveryId: delivery.id,
        error:
          trackingError instanceof Error
            ? trackingError.message
            : String(trackingError),
      });
    }
  }

  return { updatedCount, errors };
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "cron-update-tracking",
    );
    if (forbidden) return forbidden;

    logId = await logCronStart("cron-update-tracking");
    const supabase = getServiceClient();
    const executedAt = new Date().toISOString();
    const { updatedCount, errors } = await updateTrackingStatuses(supabase);

    await logCronSuccess(logId, {
      deliveriesUpdated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      executedAt,
    });

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        deliveriesUpdated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        executedAt,
      }),
      {
        status: errors.length === 0 ? 200 : 207,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    if (logId) {
      try {
        await logCronError(
          logId,
          error instanceof Error ? error : new Error(String(error)),
        );
      } catch (logError) {
        console.error("Failed to log cron error", logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
