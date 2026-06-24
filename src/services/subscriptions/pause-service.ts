/**
 * Client wrapper for subscription pause operations.
 *
 * Capacity release and delivery shifting are server-side concerns handled by
 * the pause-subscription Edge Function with the service role.
 */

import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";

interface PauseSubscriptionResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

export async function requestPause(subscriptionId: string): Promise<void> {
  const data = await callAuthenticatedEdgeFunction<PauseSubscriptionResponse>(
    "pause-subscription",
    { subscriptionId },
    "Failed to pause subscription",
  );

  if (!data?.success) {
    throw new Error(data?.error || data?.message || "Failed to pause subscription");
  }
}
