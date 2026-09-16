/**
 * Cutoff Validation Middleware
 *
 * Provides validation functions to enforce the cutoff deadline for collection changes.
 * The authoritative decision always comes from the database RPC. Local date helpers
 * exist only for display/countdown purposes and use the canonical Bahia timezone.
 *
 * Requirements: 7.1, 7.2, 7.3
 */

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";

const CUTOFF_TIME_ZONE = "America/Bahia";

/**
 * Custom error class for cutoff violations
 */
export class CutoffPassedError extends Error {
  constructor(message: string = "Changes blocked - production has started") {
    super(message);
    this.name = "CutoffPassedError";
  }
}

/**
 * Validate that current time is before the cutoff deadline.
 *
 * The database is the SSOT for whether the cutoff has passed. This avoids
 * trusting the browser clock or timezone for a business-critical decision.
 *
 * @param deliveryId - The ID of the delivery to validate (optional, for logging)
 * @returns Promise<void>
 * @throws CutoffPassedError if cutoff has passed
 *
 * Requirements: 7.1, 7.2, 7.3
 */
export async function validateBeforeCutoff(deliveryId?: string): Promise<void> {
  const { data: beforeCutoff, error } = await supabase.rpc("is_before_cutoff");

  if (error) {
    throw new Error(`Failed to check cutoff: ${error.message}`);
  }

  if (!beforeCutoff) {
    const message = deliveryId
      ? `Changes blocked for delivery ${deliveryId} - production has started`
      : "Changes blocked - production has started";
    throw new CutoffPassedError(message);
  }
}

/**
 * Validate that a specific delivery can be modified.
 *
 * This function checks both:
 * 1. The authoritative cutoff decision in the database
 * 2. The delivery status allows modifications
 *
 * @param deliveryId - The ID of the delivery to validate
 * @returns Promise<void>
 * @throws CutoffPassedError if cutoff has passed
 * @throws Error if delivery not found or in invalid status
 *
 * Requirements: 7.1, 7.2, 7.3
 */
export async function validateDeliveryModification(deliveryId: string): Promise<void> {
  await validateBeforeCutoff(deliveryId);

  const { data: delivery, error } = await supabase
    .from("subscription_deliveries")
    .select("status, cycle_id")
    .eq("id", deliveryId)
    .single();

  if (error || !delivery) {
    throw new Error(`Failed to get delivery: ${error?.message || "Delivery not found"}`);
  }

  const modifiableStatuses = ["pending_choice", "confirmed"];
  if (!modifiableStatuses.includes(delivery.status)) {
    throw new Error(`Cannot modify delivery in status: ${delivery.status}`);
  }
}

/**
 * Check if current time is before cutoff (non-throwing version).
 *
 * The database remains authoritative. A failed RPC therefore fails closed.
 *
 * @returns Promise<boolean> - True if before cutoff, false otherwise
 *
 * Requirements: 7.4
 */
export async function isBeforeCutoff(): Promise<boolean> {
  try {
    const { data: beforeCutoff, error } = await supabase.rpc("is_before_cutoff");

    if (error) {
      log.error("Failed to check cutoff", { error });
      return false;
    }

    return beforeCutoff === true;
  } catch (error) {
    log.error("Failed to check cutoff", { error });
    return false;
  }
}

/**
 * Get the display cutoff instant for the current month in America/Bahia.
 *
 * This helper must not be used to authorize mutations; use validateBeforeCutoff
 * or isBeforeCutoff for business decisions.
 *
 * @returns Date - Instant corresponding to day 15 at 23:59:59.999 in Bahia
 *
 * Requirements: 7.4
 */
export function getCurrentCutoffDate(): Date {
  const yearMonthInBahia = formatInTimeZone(new Date(), CUTOFF_TIME_ZONE, "yyyy-MM");
  return fromZonedTime(`${yearMonthInBahia}-15T23:59:59.999`, CUTOFF_TIME_ZONE);
}

/**
 * Get time remaining until cutoff.
 *
 * Returns the number of milliseconds until the display cutoff deadline.
 * Returns 0 if cutoff has passed.
 *
 * @returns number - Milliseconds until cutoff (0 if passed)
 *
 * Requirements: 7.4
 */
export function getTimeUntilCutoff(): number {
  const diff = getCurrentCutoffDate().getTime() - Date.now();
  return Math.max(0, diff);
}

/**
 * Format time remaining until cutoff.
 *
 * Returns a human-readable string of time remaining.
 *
 * @returns string - Formatted time remaining (e.g., "3 days, 5 hours")
 *
 * Requirements: 7.4
 */
export function formatTimeUntilCutoff(): string {
  const ms = getTimeUntilCutoff();

  if (ms === 0) {
    return "Cutoff passed";
  }

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}
