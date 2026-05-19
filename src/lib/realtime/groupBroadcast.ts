import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type { GroupAttachment, GroupMessage } from "@/types/groups";

type BroadcastGroupMessage = GroupMessage & {
  sender_name: string;
  sender_avatar: string | null;
  attachments: GroupAttachment[];
};

export async function broadcastGroupMessage(
  groupId: string,
  message: BroadcastGroupMessage
): Promise<void> {
  try {
    const channel = supabase.channel(`group:${groupId}`);

    await channel.send({
      type: "broadcast",
      event: "new_message",
      payload: { message },
    });

    log.debug("Mensagem de grupo enviada via broadcast", { groupId, messageId: message.id });
  } catch (error) {
    log.error("Erro ao enviar broadcast de mensagem do grupo", {
      error,
      groupId,
      messageId: message.id,
    });
  }
}

export async function verifyGroupMembership(groupId: string, userId: string): Promise<boolean> {
  try {
    const { data: membership, error } = await supabase
      .from("chat_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !membership) {
      log.warn("Associação ao grupo não encontrada para canal realtime", {
        error,
        groupId,
        userId,
      });
      return false;
    }

    return true;
  } catch (error) {
    log.error("Erro ao verificar associação ao grupo para canal realtime", {
      error,
      groupId,
      userId,
    });
    return false;
  }
}
