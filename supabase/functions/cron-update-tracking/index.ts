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

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  logCronStart,
  logCronSuccess,
  logCronError,
} from "../_shared/cron-logger.ts";
import { nowInBahia } from "../_shared/timezone.ts";
import { requireSharedSecret } from "../_shared/secrets.ts";

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

/**
 * Gets tracking status from shipping carrier API
 * This is a mock implementation - in production, integrate with real carrier APIs
 *
 * @param trackingCode - The tracking code to check
 * @returns Promise resolving to tracking status information
 */
async function getTrackingStatus(
  trackingCode: string,
): Promise<TrackingStatus> {
  // TODO: Replace with real carrier API integration
  // For now, return mock data that simulates different delivery statuses

  console.log(`[MOCK] Checking tracking status for: ${trackingCode}`);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock logic: simulate different statuses based on tracking code pattern
  // In production, this would be replaced with actual API calls to:
  // - Correios API: https://www.correios.com.br/enviar/rastreamento
  // - Private carriers: Jadlog, Total Express, etc.

  const mockStatuses: TrackingStatus["status"][] = [
    "in_transit",
    "out_for_delivery",
    "delivered",
  ];

  // Use tracking code to deterministically select a status (for testing)
  const statusIndex = trackingCode.length % mockStatuses.length;
  const status = mockStatuses[statusIndex];

  const now = new Date();

  const mockResponse: TrackingStatus = {
    trackingCode,
    status,
    delivered: status === "delivered",
    lastUpdate: now,
    events: [
      {
        date: now,
        description: `Status: ${status}`,
        location: "Salvador, BA",
      },
    ],
  };

  // If delivered, add delivery timestamp
  if (status === "delivered") {
    mockResponse.deliveredAt = now;
  }

  return mockResponse;
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
    const forbidden = requireSharedSecret(req, "CRON_SECRET", "x-cron-secret");
    if (forbidden) return forbidden;

    // Start logging
    logId = await logCronStart("cron-update-tracking");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
