import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { DashboardMetrics } from "@/types/support";
import {
  fetchSupportConversationsForMetrics,
  subscribeSupportConversationMetrics,
  type SupportConversationMetricsRow,
} from "@/services/admin/support/support-dashboard-metrics-service";

const SUPPORT_DASHBOARD_METRICS_QUERY_KEY = ["admin-support-dashboard-metrics"] as const;

function calculateFromRows(conversations: SupportConversationMetricsRow[]): DashboardMetrics {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const open_count = conversations.filter((conversation) => conversation.status === "waiting_admin")
    .length;
  const waiting_customer_count = conversations.filter(
    (conversation) => conversation.status === "waiting_customer"
  ).length;
  const resolved_today_count = conversations.filter((conversation) => {
    if (!conversation.resolved_at) {
      return false;
    }

    return new Date(conversation.resolved_at) >= today;
  }).length;
  const total_count = conversations.length;
  const overdue_24h_count = conversations.filter((conversation) => {
    if (conversation.status !== "waiting_admin") {
      return false;
    }

    return new Date(conversation.last_message_at) < twentyFourHoursAgo;
  }).length;

  const recentConversations = conversations.filter((conversation) => {
    const createdDate = new Date(conversation.created_at);
    return createdDate >= sevenDaysAgo && conversation.first_response_at;
  });

  let avg_first_response_minutes = 0;
  if (recentConversations.length > 0) {
    const totalMinutes = recentConversations.reduce((sum, conversation) => {
      const created = new Date(conversation.created_at).getTime();
      const firstResponse = new Date(conversation.first_response_at!).getTime();
      return sum + (firstResponse - created) / (1000 * 60);
    }, 0);
    avg_first_response_minutes = Math.round(totalMinutes / recentConversations.length);
  }

  const conversations_with_risk = conversations.filter((conversation) => {
    return (
      conversation.risk_flags &&
      Array.isArray(conversation.risk_flags) &&
      conversation.risk_flags.length > 0
    );
  }).length;

  const conversations_overdue_promise = conversations.filter((conversation) => {
    if (!conversation.promised_date) {
      return false;
    }

    const promised = new Date(conversation.promised_date);
    return promised < now && conversation.status !== "resolved" && conversation.status !== "closed";
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

function createEmptyMetrics(): DashboardMetrics {
  return {
    open_count: 0,
    waiting_customer_count: 0,
    resolved_today_count: 0,
    total_count: 0,
    overdue_24h_count: 0,
    avg_first_response_minutes: 0,
    conversations_with_risk: 0,
    conversations_overdue_promise: 0,
  };
}

export function useSupportDashboardMetrics() {
  const queryClient = useQueryClient();

  const metricsQuery = useQuery({
    queryKey: SUPPORT_DASHBOARD_METRICS_QUERY_KEY,
    queryFn: async () => {
      const conversations = await fetchSupportConversationsForMetrics();
      return calculateFromRows(conversations);
    },
  });

  useEffect(() => {
    return subscribeSupportConversationMetrics(() => {
      void queryClient.invalidateQueries({
        queryKey: SUPPORT_DASHBOARD_METRICS_QUERY_KEY,
      });
    });
  }, [queryClient]);

  return {
    metrics: metricsQuery.data ?? createEmptyMetrics(),
    loading: metricsQuery.isLoading,
  };
}
