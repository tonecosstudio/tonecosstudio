/**
 * Cron Job: Tracking Status Updater
 *
 * Runs daily to check shipping carrier API for delivery status updates.
 * Automatically updates delivery status when packages are delivered.
 *
 * This cron job uses the shipping service logic to:
 * 1. Fetch all deliveries with tracking codes that are not delivered
 * 2. Call getTrackingStatus for each delivery
 * 3. Update delivery status if delivered
 * 4. Handle API errors gracefully
 *
 * Requirements:
 * - 18.6: Poll carrier API daily for tracking status updates
 * - 18.7: Update delivery status automatically when marked as delivered by carrier
 */

import {
  logCronStart,
  logCronSuccess,
  logCronError,
} from "../_shared/cron-logger.ts";
import { nowInBahia } from "../_shared/timezone.ts";
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
  location?: string;
  events: Array<{
    date: Date;
    description: string;
    location?: string;
  }>;
}

interface CarrierTrackingResponse {
  trackingCode?: string;
  status?: TrackingStatus["status"];
  delivered?: boolean;
  deliveredAt?: string;
  lastUpdate?: string;
  location?: string;
  events?: Array<{
    date?: string;
    description?: string;
    location?: string;
  }>;
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
    throw new Error(
      "CARRIER_TRACKING_API_URL must use HTTPS outside localhost",
    );
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
  const events = Array.isArray(payload.events)
    ? payload.events
        .filter(
          (event) =>
            typeof event.description === "string" && event.description.trim(),
        )
        .map((event) => ({
          date: parseCarrierDate(event.date, lastUpdate),
          description: event.description!.trim(),
          location: event.location,
        }))
    : [];

  return {
    trackingCode: payload.trackingCode || trackingCode,
    status,
    delivered,
    deliveredAt: delivered
      ? parseCarrierDate(payload.deliveredAt, lastUpdate)
      : undefined,
    lastUpdate,
    location: payload.location,
    events,
  };
}

/**
 * Gets tracking status from shipping carrier API
 *
 * @param trackingCode - The tracking code to check
 * @returns Promise resolving to tracking status information
 */
async function getTrackingStatus(
  trackingCode: string,
): Promise<TrackingStatus> {
  const apiUrl = getCarrierTrackingApiUrl();
  const apiToken = Deno.env.get("CARRIER_TRACKING_API_TOKEN");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }

  const response = await fetch(apiUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({ trackingCode }),
  });

  if (!response.ok) {
    throw new Error(`Carrier tracking API returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as CarrierTrackingResponse;
  return normalizeTrackingStatus(trackingCode, payload);
}

/**
 * Updates tracking statuses for all deliveries with tracking codes
 * This implements the same logic as ShippingService.updateTrackingStatuses()
 *
 * @param supabase - Supabase client
 * @returns Number of deliveries updated
 */
async function updateTrackingStatuses(supabase: any): Promise<number> {
  // Get all deliveries with tracking codes that are not delivered
  const { data: deliveries, error } = await supabase
    .from("subscription_deliveries")
    .select("id, tracking_code, status")
    .not("tracking_code", "is", null)
    .in("status", ["shipped", "in_transit"]);

  if (error) {
    throw new Error(`Failed to fetch deliveries: ${error.message}`);
  }

  if (!deliveries || deliveries.length === 0) {
    return 0;
  }

  let updatedCount = 0;

  // Update each delivery's tracking status
  for (const delivery of deliveries as Delivery[]) {
    try {
      const status = await getTrackingStatus(delivery.tracking_code);

      // Update delivery status if delivered
      if (status.delivered) {
        await supabase
          .from("subscription_deliveries")
          .update({
            status: "delivered",
            actual_delivery_date: status.deliveredAt?.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", delivery.id);

        updatedCount++;
        console.log(
          `Updated delivery ${delivery.id} to delivered at ${status.deliveredAt?.toISOString()}`,
        );
      } else {
        console.log(
          `Delivery ${delivery.id} status: ${status.status} (not yet delivered)`,
        );
      }
    } catch (error) {
      console.error(
        `Failed to update tracking for delivery ${delivery.id}:`,
        error,
      );
      // Continue with other deliveries
    }
  }

  return updatedCount;
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

    // Start logging
    logId = await logCronStart("cron-update-tracking");

    const supabase = getServiceClient();

    // Get current Bahia time
    const bahiaTime = nowInBahia();
    console.log(`Cron job running at ${bahiaTime.toISOString()} (Bahia time)`);

    // Call the shipping service logic to update tracking statuses
    const updatedCount = await updateTrackingStatuses(supabase);

    // Log success with details
    await logCronSuccess(logId, {
      deliveriesUpdated: updatedCount,
      timestamp: bahiaTime.toISOString(),
    });

    console.log(
      `Cron job completed: ${updatedCount} delivery(ies) updated to delivered`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        deliveriesUpdated: updatedCount,
        timestamp: bahiaTime.toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Cron job failed:", error);

    // Log error if we have a log ID
    if (logId) {
      try {
        await logCronError(
          logId,
          error instanceof Error ? error : new Error(String(error)),
        );
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
