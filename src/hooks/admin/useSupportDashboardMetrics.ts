import { useCallback, useEffect, useState } from "react";
import type { DashboardMetrics } from "@/types/support";
import {
  fetchSupportConversationsForMetrics,
  subscribeSupportConversationMetrics,
  type SupportConversationMetricsRow,
} from "@/services/admin/support-dashboard-metrics-service";

function calculateFromRows(conversations: SupportConversationMetricsRow[]): DashboardMetrics {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const open_count = conversations.filter((c) => c.status === "waiting_admin").length;
  const waiting_customer_count = conversations.filter((c) => c.status === "waiting_customer").length;
  const resolved_today_count = conversations.filter((c) => {
    if (!c.resolved_at) return false;
    return new Date(c.resolved_at) >= today;
  }).length;
  const total_count = conversations.length;
  const overdue_24h_count = conversations.filter((c) => {
    if (c.status !== "waiting_admin") return false;
    return new Date(c.last_message_at) < twentyFourHoursAgo;
  }).length;

  const recentConversations = conversations.filter((c) => {
    const createdDate = new Date(c.created_at);
    return createdDate >= sevenDaysAgo && c.first_response_at;
  });

  let avg_first_response_minutes = 0;
  if (recentConversations.length > 0) {
    const totalMinutes = recentConversations.reduce((sum, c) => {
      const created = new Date(c.created_at).getTime();
      const firstResponse = new Date(c.first_response_at!).getTime();
      return sum + (firstResponse - created) / (1000 * 60);
    }, 0);
    avg_first_response_minutes = Math.round(totalMinutes / recentConversations.length);
  }

  const conversations_with_risk = conversations.filter((c) => {
    return c.risk_flags && Array.isArray(c.risk_flags) && c.risk_flags.length > 0;
  }).length;

  const conversations_overdue_promise = conversations.filter((c) => {
    if (!c.promised_date) return false;
    const promised = new Date(c.promised_date);
    return promised < now && c.status !== "resolved" && c.status !== "closed";
  }).length;

  return {
    open_count,
    waiting_customer_count,
    resolved_today_count,
    total_count,
    overdue_24h_count,
    avg_first_response_minutes,
    conversations_with_risk,
    conversations_overdue_promise,
  };
}

export function useSupportDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    open_count: 0,
    waiting_customer_count: 0,
    resolved_today_count: 0,
    total_count: 0,
    overdue_24h_count: 0,
    avg_first_response_minutes: 0,
    conversations_with_risk: 0,
    conversations_overdue_promise: 0,
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const conversations = await fetchSupportConversationsForMetrics();
      setMetrics(calculateFromRows(conversations));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    return subscribeSupportConversationMetrics(() => {
      reload();
    });
  }, [reload]);

  return { metrics, loading };
}
