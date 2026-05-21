import { conversationService } from "@/lib/services/conversationService";
import { messageService } from "@/lib/services/messageService";

export interface CustomerContactSubmission {
  userId: string;
  name: string;
  message: string;
}

export async function submitCustomerContact({
  userId,
  name,
  message,
}: CustomerContactSubmission): Promise<void> {
  const conversation = await conversationService.createConversation({
    user_id: userId,
    subject: `Contato: ${name}`,
    status: "waiting_admin",
    tags: ["duvida"],
  });

  await messageService.sendMessage({
    conversation_id: conversation.id,
    sender_id: userId,
    sender_type: "customer",
    message,
  });
}
