import { supabase } from "@/integrations/supabase/client";
import type { GroupMessage, GroupAttachment } from "@/types/groups";

/**
 * Broadcasts a group message to all members via Realtime channel
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export async function broadcastGroupMessage(
  groupId: string,
  message: GroupMessage & {
    sender_name: string;
    sender_avatar: string | null;
    attachments: GroupAttachment[];
  }
): Promise<void> {
  try {
    const channel = supabase.channel(`group:${groupId}`);

    await channel.send({
      type: "broadcast",
      event: "new_message",
      payload: { message },
    });

    console.log(`[Broadcast] Message sent to group:${groupId}`, message.id);
  } catch (error) {
    console.error(`[Broadcast] Failed to broadcast message to group:${groupId}`, error);
    // Graceful degradation - don't throw error
    // Email notifications will still be sent via background job
  }
}

/**
 * Verifies if a user is a member of a group before allowing channel subscription
 * Requirements: 10.2 (channel security validation)
 */
export async function verifyGroupMembership(groupId: string, userId: string): Promise<boolean> {
  try {
    const { data: membership, error } = await supabase
      .from("chat_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle(); // Mudado de .single() para .maybeSingle() para evitar erro 406

    if (error || !membership) {
      console.warn(`[Security] User ${userId} is not a member of group ${groupId}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[Security] Error verifying membership:`, error);
    return false;
  }
}
