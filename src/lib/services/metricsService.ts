// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

/**
 * MetricsService - Service for calculating group metrics
 * 
 * Provides methods to calculate:
 * - Total members in a group
 * - Total messages in a group
 * - Estimated view rate (% members who viewed after last message)
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4
 * 
 * CRITICAL CLARIFICATION - Estimated View Rate Calculation:
 * 
 * "Viewed" means: User opened the group page (last_viewed_at updated)
 * NOT "read the message" or "scrolled to bottom"
 * This is an estimated metric for engagement, not precise read tracking
 * 
 * Formula: COUNT(members where last_viewed_at > last_message.created_at) / COUNT(members) * 100
 * 
 * "last_message" = the MOST RECENT message in the group
 * If multiple messages exist after last_viewed_at, still counts as "not viewed"
 * This is intentionally simple to avoid complexity
 *
 * Example:
 * - Group has 100 members
 * - Last message created at 2024-01-15 10:00:00
 * - 60 members have last_viewed_at > 2024-01-15 10:00:00
 * - Estimated view rate = 60 / 100 * 100 = 60%
 */

export class MetricsService {
  /**
   * Gets the total number of active members in a group
   * Requirements: 16.1
   */
  async getTotalMembers(groupId: string): Promise<number> {
    const { count, error } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (error) {
      console.error("Erro ao contar membros:", error);
      throw new Error("Erro ao calcular total de membros");
    }

    return count || 0;
  }

  /**
   * Gets the total number of messages in a group
   * Requirements: 16.2
   */
  async getTotalMessages(groupId: string): Promise<number> {
    const { count, error } = await supabase
      .from("chat_group_messages")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (error) {
      console.error("Erro ao contar mensagens:", error);
      throw new Error("Erro ao calcular total de mensagens");
    }

    return count || 0;
  }

  /**
   * Calculates the estimated view rate for a group
   * 
   * View rate = % of members who viewed the group after the last message was sent
   * 
   * Returns a percentage (0-100) rounded to 2 decimal places
   * Returns 0 if there are no messages or no members
   * 
   * Requirements: 16.3, 16.4
   */
  async getEstimatedViewRate(groupId: string): Promise<number> {
    // Get the last message timestamp
    const { data: lastMessage, error: messageError } = await supabase
      .from("chat_group_messages")
      .select("created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (messageError) {
      console.error("Erro ao buscar última mensagem:", messageError);
      // Return 0 instead of throwing to avoid breaking the UI
      return 0;
    }

    if (!lastMessage) {
      // No messages yet, return 0
      return 0;
    }

    // Get total member count
    const { count: totalMembers, error: countError } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (countError) {
      console.error("Erro ao contar membros:", countError);
      throw new Error("Erro ao calcular taxa de visualização");
    }

    if (!totalMembers || totalMembers === 0) {
      return 0;
    }

    // Count members who viewed after the last message
    const { count: viewedMembers, error: viewedError } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .gt("last_viewed_at", lastMessage.created_at);

    if (viewedError) {
      console.error("Erro ao contar membros que visualizaram:", viewedError);
      throw new Error("Erro ao calcular taxa de visualização");
    }

    // Calculate percentage and round to 2 decimal places
    const viewRate = ((viewedMembers || 0) / totalMembers) * 100;
    return Math.round(viewRate * 100) / 100;
  }

  /**
   * Gets all metrics for a group in a single call
   * 
   * Returns an object with:
   * - total_members: number of active members
   * - total_messages: number of messages
   * - estimated_view_rate: percentage (0-100) of members who viewed after last message
   * 
   * Requirements: 16.1, 16.2, 16.3, 16.4
   */
  async getGroupMetrics(groupId: string): Promise<{
    total_members: number;
    total_messages: number;
    estimated_view_rate: number;
  }> {
    // Execute all queries in parallel for better performance
    const [totalMembers, totalMessages, estimatedViewRate] = await Promise.all([
      this.getTotalMembers(groupId),
      this.getTotalMessages(groupId),
      this.getEstimatedViewRate(groupId),
    ]);

    return {
      total_members: totalMembers,
      total_messages: totalMessages,
      estimated_view_rate: estimatedViewRate,
    };
  }
}

export const metricsService = new MetricsService();
