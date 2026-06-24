import { supabase } from "@/integrations/supabase/client";
import {
  createRealtimeChannel,
  removeRealtimeChannel,
} from "@/services/supabase/realtime-client";

export interface SupportConversationMetricsRow {
  status: string;
  resolved_at: string | null;
  last_message_at: string;
  created_at: string;
  first_response_at: string | null;
  risk_flags?: unknown;
  promised_date?: string | null;
}

const SUPPORT_CONVERSATION_METRICS_COLUMNS = [
  "status",
  "resolved_at",
  "last_message_at",
  "created_at",
  "first_response_at",
  "risk_flags",
  "promised_date",
].join(",");

export async function fetchSupportConversationsForMetrics(): Promise<SupportConversationMetricsRow[]> {
  const { data, error } = await supabase
    .from("support_conversations")
    .select(SUPPORT_CONVERSATION_METRICS_COLUMNS);

  if (error) {
    throw error;
  }

  return ((data || []) as unknown) as SupportConversationMetricsRow[];
}

export function subscribeSupportConversationMetrics(onChange: () => void): () => void {
  const channel = createRealtimeChannel("support_dashboard_metrics_updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "support_conversations",
      },
      onChange
    )
    .subscribe();

  return () => {
    removeRealtimeChannel(channel);
  };
}
