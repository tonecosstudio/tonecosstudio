import { supabase } from "@/integrations/supabase/client";
import { logDebug, logError, logInfo } from "@/lib/logger";
import { emailService } from "@/services/notifications/email-service";
import { getProductionPriorityFromScore } from "@/types/production";

interface QueueStatus {
  pending: number;
  sent: number;
  failed: number;
}

interface RecipientProfile {
  email: string | null;
  full_name: string | null;
}

interface ProductionContext {
  id: string;
  userId: string | null;
  customerEmail: string | null;
  customerName: string;
  collectionName: string;
  characterName: string;
  priority: string;
  estimatedStart: string | null;
  estimatedCompletion: string | null;
  status: string;
}

interface ChoiceContext {
  id: string;
  userId: string;
  email: string;
  userName: string;
  collectionName: string;
  characterName: string;
  deadline: string | null;
  status: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

function profileFromRelation(value: unknown): RecipientProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as { email?: unknown; full_name?: unknown };
  return {
    email: typeof candidate.email === "string" ? candidate.email : null,
    full_name: typeof candidate.full_name === "string" ? candidate.full_name : null,
  };
}

function namedRelation(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const name = (value as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name : null;
}

class ProductionNotificationService {
  private queueStatus: QueueStatus = { pending: 0, sent: 0, failed: 0 };

  private async deliver(
    recipientEmail: string,
    subject: string,
    html: string,
    emailType: string,
    userId?: string,
    metadata?: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    this.queueStatus.pending += 1;
    try {
      await emailService.sendEmail(
        recipientEmail,
        subject,
        html,
        emailType,
        userId,
        metadata ?? {},
      );
      this.queueStatus.sent += 1;
    } catch (error) {
      this.queueStatus.failed += 1;
      throw error;
    } finally {
      this.queueStatus.pending = Math.max(0, this.queueStatus.pending - 1);
    }
  }

  private async fetchProductionContext(
    productionQueueId: string,
  ): Promise<ProductionContext> {
    const { data, error } = await supabase
      .from("production_queue")
      .select(`
        id,
        user_id,
        collection_name,
        character_name,
        priority_score,
        estimated_start_date,
        estimated_completion_date,
        status,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .eq("id", productionQueueId)
      .single();

    if (error || !data) {
      throw new Error(`Production item not found: ${error?.message || productionQueueId}`);
    }

    const profile = profileFromRelation(data.profiles);

    return {
      id: data.id,
      userId: data.user_id,
      customerEmail: profile?.email ?? null,
      customerName: profile?.full_name || profile?.email || "Cliente",
      collectionName: data.collection_name || "Coleção",
      characterName: data.character_name || "Personagem",
      priority: getProductionPriorityFromScore(undefined, data.priority_score),
      estimatedStart: data.estimated_start_date,
      estimatedCompletion: data.estimated_completion_date,
      status: data.status,
    };
  }

  private async fetchChoiceContext(choiceId: string): Promise<ChoiceContext> {
    const { data, error } = await supabase
      .from("character_choices")
      .select(`
        id,
        user_id,
        character_name,
        deadline,
        status,
        profiles:user_id (
          email,
          full_name
        ),
        collections:collection_id (
          name
        )
      `)
      .eq("id", choiceId)
      .single();

    if (error || !data) {
      throw new Error(`Character choice not found: ${error?.message || choiceId}`);
    }

    const profile = profileFromRelation(data.profiles);
    if (!data.user_id || !profile?.email) {
      throw new Error("Character choice recipient not found");
    }

    return {
      id: data.id,
      userId: data.user_id,
      email: profile.email,
      userName: profile.full_name || profile.email.split("@")[0],
      collectionName: namedRelation(data.collections) || "Coleção",
      characterName: data.character_name || "Personagem",
      deadline: data.deadline,
      status: data.status,
    };
  }

  private async shouldSend(
    userId: string | null,
    notificationType: "stage_update" | "item_shipped",
  ): Promise<boolean> {
    if (!userId) return false;

    const { data, error } = await supabase.rpc("should_send_notification", {
      user_id: userId,
      notification_type: notificationType,
    });

    if (error) {
      logError(
        "Failed to resolve notification preference",
        { error: error.message, userId, notificationType },
        "notifications",
      );
      return false;
    }

    return data === true;
  }

  async sendChoiceReminder(choiceId: string): Promise<void> {
    const choice = await this.fetchChoiceContext(choiceId);
    const deadlineText = choice.deadline
      ? new Date(choice.deadline).toLocaleDateString("pt-BR")
      : "a definir";

    await this.deliver(
      choice.email,
      "Lembrete: escolha seu personagem ORDAX",
      `<p>Olá, ${escapeHtml(choice.userName)}.</p><p>Sua escolha para ${escapeHtml(choice.collectionName)} está pendente. Prazo: ${escapeHtml(deadlineText)}.</p>`,
      "choice_reminder",
      choice.userId,
      { choice_id: choice.id, status: choice.status },
    );
  }

  async sendChoiceApproval(choiceId: string): Promise<void> {
    const choice = await this.fetchChoiceContext(choiceId);

    await this.deliver(
      choice.email,
      "Sua escolha ORDAX foi aprovada",
      `<p>Olá, ${escapeHtml(choice.userName)}.</p><p>Sua escolha de ${escapeHtml(choice.characterName)} para ${escapeHtml(choice.collectionName)} foi aprovada.</p>`,
      "choice_approval",
      choice.userId,
      { choice_id: choice.id },
    );
  }

  async sendChoiceRejection(choiceId: string, rejectionReason: string): Promise<void> {
    const choice = await this.fetchChoiceContext(choiceId);

    await this.deliver(
      choice.email,
      "Sua escolha ORDAX precisa ser revisada",
      `<p>Olá, ${escapeHtml(choice.userName)}.</p><p>Sua escolha precisa ser revisada.</p><p>Motivo: ${escapeHtml(rejectionReason)}</p>`,
      "choice_rejection",
      choice.userId,
      { choice_id: choice.id },
    );
  }

  async sendStageUpdate(productionQueueId: string, stage: string): Promise<void> {
    const context = await this.fetchProductionContext(productionQueueId);
    if (!context.userId || !context.customerEmail) {
      throw new Error("Production customer email not found");
    }

    const allowed = await this.shouldSend(context.userId, "stage_update");
    if (!allowed) {
      logDebug(
        "User opted out of stage updates",
        { customerId: context.userId },
        "notifications",
      );
      return;
    }

    if (stage === "shipped") {
      const shippedAllowed = await this.shouldSend(context.userId, "item_shipped");
      if (!shippedAllowed) return;
    }

    await this.deliver(
      context.customerEmail,
      `Atualização de produção: ${stage}`,
      `<p>Olá, ${escapeHtml(context.customerName)}.</p><p>${escapeHtml(context.collectionName)} / ${escapeHtml(context.characterName)} avançou para <strong>${escapeHtml(stage)}</strong>.</p>`,
      "stage_update",
      context.userId,
      { production_queue_id: context.id, stage },
    );

    logInfo(
      "Production stage notification sent",
      { productionQueueId, stage },
      "notifications",
    );
  }

  async sendDelayNotification(
    productionQueueId: string,
    reason: string,
  ): Promise<void> {
    const context = await this.fetchProductionContext(productionQueueId);
    if (!context.userId || !context.customerEmail) {
      throw new Error("Production customer email not found");
    }

    await this.deliver(
      context.customerEmail,
      "Atualização sobre o prazo do seu pedido ORDAX",
      `<p>Olá, ${escapeHtml(context.customerName)}.</p><p>Identificamos uma alteração no prazo de ${escapeHtml(context.collectionName)}.</p><p>Motivo: ${escapeHtml(reason)}</p>`,
      "delay_notification",
      context.userId,
      { production_queue_id: context.id },
    );
  }

  async sendAssignmentNotification(
    productionQueueId: string,
    assignedUserId: string,
    isReassignment = false,
  ): Promise<void> {
    const context = await this.fetchProductionContext(productionQueueId);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", assignedUserId)
      .single();

    if (error || !profile?.email) {
      throw new Error(`Assigned user profile not found: ${error?.message || assignedUserId}`);
    }

    const subject = isReassignment
      ? "Item de produção reatribuído para você"
      : "Novo item de produção atribuído para você";

    await this.deliver(
      profile.email,
      subject,
      `<p>Olá, ${escapeHtml(profile.full_name || profile.email)}.</p><p>${escapeHtml(context.customerName)} — ${escapeHtml(context.collectionName)} / ${escapeHtml(context.characterName)}</p><p>Prioridade: ${escapeHtml(context.priority)}. Status: ${escapeHtml(context.status)}.</p>`,
      isReassignment ? "production_reassignment" : "production_assignment",
      assignedUserId,
      {
        production_queue_id: context.id,
        priority: context.priority,
        reassignment: isReassignment,
      },
    );
  }

  getQueueStatus() {
    return {
      total:
        this.queueStatus.pending + this.queueStatus.sent + this.queueStatus.failed,
      pending: this.queueStatus.pending,
      sent: this.queueStatus.sent,
      failed: this.queueStatus.failed,
    };
  }

  clearQueue(): void {
    this.queueStatus = { pending: 0, sent: 0, failed: 0 };
  }
}

export const productionNotificationService = new ProductionNotificationService();
