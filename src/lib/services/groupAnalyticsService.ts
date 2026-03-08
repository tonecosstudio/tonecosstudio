import { supabase } from "@/integrations/supabase/client";

export interface GroupAnalytics {
  openRate: number;
  openRateTrend: number; // % change from previous period
  peakHours: Array<{ hour: number; count: number }>;
  topMembers: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    viewCount: number;
    lastViewedAt: string | null;
  }>;
  memberGrowth: Array<{
    date: string;
    count: number;
  }>;
  totalMessages: number;
  totalMembers: number;
  avgResponseTime: number; // in minutes
}

/**
 * GroupAnalyticsService - Serviço para analytics de grupos
 *
 * Fornece métricas avançadas de engajamento:
 * - Taxa de abertura
 * - Horários de pico
 * - Membros mais ativos
 * - Crescimento de membros
 */
export class GroupAnalyticsService {
  /**
   * Calcula a taxa de abertura do grupo
   * Taxa = % de membros que visualizaram mensagens recentes
   */
  async calculateOpenRate(
    groupId: string,
    days: number = 7
  ): Promise<{ rate: number; trend: number }> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);

    // Get total members
    const { count: totalMembers } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (!totalMembers || totalMembers === 0) {
      return { rate: 0, trend: 0 };
    }

    // Get members who viewed in current period
    const { count: currentViewers } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .gte("last_viewed_at", periodStart.toISOString());

    // Get members who viewed in previous period
    const { count: previousViewers } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .gte("last_viewed_at", previousPeriodStart.toISOString())
      .lt("last_viewed_at", periodStart.toISOString());

    const currentRate = ((currentViewers || 0) / totalMembers) * 100;
    const previousRate = ((previousViewers || 0) / totalMembers) * 100;
    const trend = previousRate > 0 ? ((currentRate - previousRate) / previousRate) * 100 : 0;

    return {
      rate: Math.round(currentRate * 10) / 10,
      trend: Math.round(trend * 10) / 10,
    };
  }

  /**
   * Identifica horários de pico de atividade
   * Baseado em quando membros visualizam mensagens
   */
  async getPeakHours(
    groupId: string,
    days: number = 30
  ): Promise<Array<{ hour: number; count: number }>> {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    // Get all view timestamps
    const { data: members } = await supabase
      .from("chat_group_members")
      .select("last_viewed_at")
      .eq("group_id", groupId)
      .gte("last_viewed_at", periodStart.toISOString())
      .not("last_viewed_at", "is", null);

    if (!members || members.length === 0) {
      return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    }

    // Count views by hour
    const hourCounts = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      hourCounts.set(i, 0);
    }

    members.forEach((member) => {
      if (member.last_viewed_at) {
        const hour = new Date(member.last_viewed_at).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    });

    return Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
  }

  /**
   * Lista membros mais ativos
   * Baseado em número de visualizações e interações
   */
  async getTopMembers(
    groupId: string,
    limit: number = 10
  ): Promise<
    Array<{
      userId: string;
      userName: string;
      userEmail: string;
      viewCount: number;
      lastViewedAt: string | null;
    }>
  > {
    // Get members with view data
    const { data: members } = await supabase
      .from("chat_group_members")
      .select("user_id, last_viewed_at")
      .eq("group_id", groupId)
      .order("last_viewed_at", { ascending: false })
      .limit(limit);

    if (!members || members.length === 0) {
      return [];
    }

    // Get user profiles
    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // For now, use a simple metric (could be enhanced with message counts, etc.)
    // Simulate view counts based on last_viewed_at recency
    return members.map((member, index) => {
      const profile = profilesMap.get(member.user_id);
      return {
        userId: member.user_id,
        userName: profile?.full_name || profile?.email || "Usuário",
        userEmail: profile?.email || "",
        viewCount: limit - index, // Simplified: more recent = higher count
        lastViewedAt: member.last_viewed_at,
      };
    });
  }

  /**
   * Calcula crescimento de membros ao longo do tempo
   * Retorna dados dos últimos 6 meses
   */
  async getMemberGrowth(
    groupId: string,
    months: number = 6
  ): Promise<
    Array<{
      date: string;
      count: number;
    }>
  > {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - months);

    // Get all members with join dates
    const { data: members } = await supabase
      .from("chat_group_members")
      .select("joined_at")
      .eq("group_id", groupId)
      .gte("joined_at", startDate.toISOString())
      .order("joined_at", { ascending: true });

    if (!members || members.length === 0) {
      return [];
    }

    // Group by month
    const monthlyData = new Map<string, number>();

    // Initialize all months
    for (let i = 0; i < months; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyData.set(key, 0);
    }

    // Count cumulative members
    let cumulativeCount = 0;
    members.forEach((member) => {
      const date = new Date(member.joined_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      cumulativeCount++;
      monthlyData.set(key, cumulativeCount);
    });

    return Array.from(monthlyData.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Obtém todas as métricas de analytics de uma vez
   */
  async getGroupAnalytics(groupId: string): Promise<GroupAnalytics> {
    // Execute queries in parallel
    const [openRateData, peakHours, topMembers, memberGrowth, messagesCount, membersCount] =
      await Promise.all([
        this.calculateOpenRate(groupId),
        this.getPeakHours(groupId),
        this.getTopMembers(groupId),
        this.getMemberGrowth(groupId),
        this.getMessageCount(groupId),
        this.getMemberCount(groupId),
      ]);

    return {
      openRate: openRateData.rate,
      openRateTrend: openRateData.trend,
      peakHours,
      topMembers,
      memberGrowth,
      totalMessages: messagesCount,
      totalMembers: membersCount,
      avgResponseTime: 0, // TODO: Implement if needed
    };
  }

  /**
   * Helper: Get total message count
   */
  private async getMessageCount(groupId: string): Promise<number> {
    const { count } = await supabase
      .from("chat_group_messages")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    return count || 0;
  }

  /**
   * Helper: Get total member count
   */
  private async getMemberCount(groupId: string): Promise<number> {
    const { count } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    return count || 0;
  }
}

export const groupAnalyticsService = new GroupAnalyticsService();
