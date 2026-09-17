import { supabase } from "@/integrations/supabase/client";

export type SupabaseRealtimeChannel = ReturnType<typeof supabase.channel>;
export type SupabaseRealtimeChannelOptions = Parameters<typeof supabase.channel>[1];

export function hasRealtimeChannelSupport() {
  return typeof supabase.channel === "function";
}

export function createRealtimeChannel(
  topic: string,
  options?: SupabaseRealtimeChannelOptions,
) {
  return options === undefined
    ? supabase.channel(topic)
    : supabase.channel(topic, options);
}

export function removeRealtimeChannel(channel: SupabaseRealtimeChannel) {
  return supabase.removeChannel(channel);
}
