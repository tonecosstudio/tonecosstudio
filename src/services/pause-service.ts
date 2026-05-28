/**
 * Client wrapper for subscription pause operations.
 *
 * Capacity release and delivery shifting are server-side concerns handled by
 * the pause-subscription Edge Function with the service role.
 */

import { supabase } from "@/integrations/supabase/client";

interface PauseSubscriptionResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

export async function requestPause(subscriptionId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<PauseSubscriptionResponse>(
    "pause-subscription",
    {
      body: { subscriptionId },
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error(data?.error || data?.message || "Failed to pause subscription");
  }
}
