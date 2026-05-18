import { supabase } from "@/integrations/supabase/client";

export interface SupportConversationMetricsRow {
  status: string;
  resolved_at: string | null;
  last_message_at: string;
  created_at: string;
  first_response_at: string | null;
  risk_flags?: unknown;
  promised_date?: string | null;
}

export async function fetchSupportConversationsForMetrics(): Promise<SupportConversationMetricsRow[]> {
  const { data, error } = await supabase.from("support_conversations").select("*");
  if (error) throw error;
  return (data || []) as SupportConversationMetricsRow[];
}

export function subscribeSupportConversationMetrics(onChange: () => void): () => void {
  const channel = supabase
    .channel("dashboard_metrics_updates")
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
    supabase.removeChannel(channel);
  };
}
