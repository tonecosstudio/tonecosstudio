/**
 * Production Notification Service
 * 
 * Handles sending production-related notifications to customers and admins.
 * Integrates with the existing email service and reuses templates from cron jobs.
 * 
 * Features:
 * - Character choice reminders
 * - Choice approval/rejection notifications
 * - Production stage update notifications
 * - Delay notifications
 * - Notification queue for batch sending
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { logInfo, logError, logDebug } from '@/lib/logger';
import { getProductionStageLabel } from '@/config/production-stages';
import { getProductionPriorityFromScore, type Priority } from '@/types/production';
import { formatDate } from '@/lib/utils';
import { emailService } from '@/services/notifications/email-service';

// ============================================================================
// Types
// ============================================================================

type NotificationType =
  | 'choice_reminder'
  | 'choice_approval'
  | 'choice_rejection'
  | 'stage_update'
  | 'delay_notification'
  | 'production_assignment'
  | 'production_reassignment';

type NotificationData = Record<string, Json>;

type ChoiceReminderNotificationData = {
  userName: string;
  collectionName: string;
  deadline: string;
  orderId: string;
  orderType: string;
  reminderType: 'first' | 'second' | 'final';
} & NotificationData;

type ChoiceApprovalNotificationData = {
  userName: string;
  collectionName: string;
  characterName: string;
  characterImageUrl: string | null;
} & NotificationData;

type ChoiceRejectionNotificationData = {
  userName: string;
  collectionName: string;
  characterName: string;
  rejectionReason: string;
  orderId: string;
  orderType: string;
} & NotificationData;

type StageUpdateNotificationData = {
  userName: string;
  collectionName: string;
  characterName: string | null;
  stage: string;
  stageName: string;
  estimatedCompletion: string | null;
} & NotificationData;

type DelayNotificationData = {
  userName: string;
  collectionName: string;
  characterName: string | null;
  reason: string;
  newEstimatedDate: string | null;
} & NotificationData;

type AssignmentNotificationData = {
  userName: string;
  customerName: string;
  collectionName: string;
  characterName: string;
  currentStage: string;
  priority: string;
  scheduledDate: string | null;
  estimatedCompletion: string | null;
  isReassignment: boolean;
  productionQueueId: string;
  assignedUserId: string;
} & NotificationData;

type NotificationPreferenceType = 'stage_update' | 'item_shipped';
type RpcError = { message: string } | null;

interface NotificationPreferenceRpcClient {
  rpc(functionName: 'should_send_notification', args: {
    user_id: string;
    notification_type: NotificationPreferenceType;
  }): PromiseLike<{ data: boolean | null; error: RpcError }>;
}

const notificationPreferenceRpc = supabase as unknown as NotificationPreferenceRpcClient;

interface NotificationProfile {
  email: string;
  raw_user_meta_data?: {
    full_name?: string;
  } | null;
}

interface NamedRelation {
  name: string;
  image_url?: string | null;
}

export interface NotificationQueueItem {
  id: string;
  type: NotificationType;
  recipientEmail: string;
  recipientName: string | null;
  data: NotificationData;
  priority: 'high' | 'normal' | 'low';
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  createdAt: Date;
}

// ============================================================================
// Notification Queue Management
// ============================================================================

class NotificationQueue {
  private queue: NotificationQueueItem[] = [];
  private processing = false;
  private batchSize = 10;
  private batchDelay = 1000; // 1 second between batches

  /**
   * Add notification to queue
   */
  add(item: Omit<NotificationQueueItem, 'id' | 'status' | 'retryCount' | 'createdAt'>): void {
    const queueItem: NotificationQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
    };

    this.queue.push(queueItem);
    logDebug('Added notification to queue', { type: queueItem.type, recipient: queueItem.recipientEmail }, 'notifications');

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process notification queue in batches
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    logDebug('Processing notification queue', { queueLength: this.queue.length }, 'notifications');

    while (this.queue.length > 0) {
      // Get next batch of notifications
      const batch = this.queue
        .filter(item => item.status === 'pending' && item.scheduledFor <= new Date())
        .sort((a, b) => {
          // Sort by priority (high > normal > low)
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
        .slice(0, this.batchSize);

      if (batch.length === 0) {
        // No items ready to send, wait a bit
        await this.sleep(this.batchDelay);
        continue;
      }

      // Process batch
      await Promise.all(
        batch.map(item => this.processNotification(item))
      );

      // Wait before next batch
      await this.sleep(this.batchDelay);
    }

    this.processing = false;
    logDebug('Notification queue processing completed', null, 'notifications');
  }

  /**
   * Process a single notification
   */
  private async processNotification(item: NotificationQueueItem): Promise<void> {
    try {
      logDebug('Processing notification', { type: item.type, recipient: item.recipientEmail }, 'notifications');

      // Send notification based on type using internal handlers
      const html = this.generateEmailHTML(item.type, item.data);
      const subject = this.generateEmailSubject(item.type, item.data);
      
      await emailService.sendEmail(
        item.recipientEmail,
        subject,
        html,
        item.type,
        undefined,
        item.data
      );

      // Mark as sent
      item.status = 'sent';
      this.removeFromQueue(item.id);
      logInfo('Notification sent successfully', { notificationId: item.id, type: item.type }, 'notifications');
    } catch (error) {
      logError('Failed to send notification', { notificationId: item.id, error }, 'notifications');
      
      // Retry logic
      item.retryCount++;
      if (item.retryCount >= 3) {
        item.status = 'failed';
        this.removeFromQueue(item.id);
        logError(`Notification failed after 3 retries: ${item.id}`, null, 'notifications');
      } else {
        // Reschedule for retry with exponential backoff
        item.scheduledFor = new Date(Date.now() + Math.pow(2, item.retryCount) * 60000);
        logDebug('Rescheduling notification for retry', 
          { notificationId: item.id, retryCount: item.retryCount }, 
          'notifications');
      }
    }
  }

  /**
   * Generate email HTML based on notification type
   */
  private generateEmailHTML(type: NotificationType, data: NotificationData): string {
    switch (type) {
      case 'choice_reminder':
        return generateChoiceReminderHTML(data as ChoiceReminderNotificationData);
      case 'choice_approval':
        return generateChoiceApprovalHTML(data as ChoiceApprovalNotificationData);
      case 'choice_rejection':
        return generateChoiceRejectionHTML(data as ChoiceRejectionNotificationData);
      case 'stage_update':
        return generateStageUpdateHTML(data as StageUpdateNotificationData);
      case 'delay_notification':
        return generateDelayNotificationHTML(data as DelayNotificationData);
      case 'production_assignment':
      case 'production_reassignment':
        return generateAssignmentNotificationHTML(data as AssignmentNotificationData);
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }

  /**
   * Generate email subject based on notification type
   */
  private generateEmailSubject(type: NotificationType, data: NotificationData): string {
    switch (type) {
      case 'choice_reminder':
        return data.reminderType === 'final'
          ? '🚨 Último Dia para Escolher seu Personagem!'
          : data.reminderType === 'second'
          ? '⏰ Lembrete: Escolha seu Personagem'
          : '✨ Escolha seu Personagem - ORDAX';
      case 'choice_approval':
        return '✅ Escolha Aprovada - ORDAX';
      case 'choice_rejection':
        return '⚠️ Escolha Rejeitada - ORDAX';
      case 'stage_update':
        return data.stage === 'shipped'
          ? '🚚 Seu Pedido Foi Enviado - ORDAX'
          : `📋 Atualização de Produção: ${data.stageName} - ORDAX`;
      case 'delay_notification':
        return '⏰ Atualização de Prazo - ORDAX';
      case 'production_assignment':
        return `Novo Item de ProduÃ§Ã£o AtribuÃ­do - ${data.collectionName}`;
      case 'production_reassignment':
        return `Item de ProduÃ§Ã£o ReatribuÃ­do - ${data.collectionName}`;
      default:
        return 'Notificação - ORDAX';
    }
  }

  /**
   * Remove item from queue
   */
  private removeFromQueue(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id);
  }

  /**
   * Get queue status
   */
  getStatus(): { total: number; pending: number; sent: number; failed: number } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(item => item.status === 'pending').length,
      sent: this.queue.filter(item => item.status === 'sent').length,
      failed: this.queue.filter(item => item.status === 'failed').length,
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton queue instance
const notificationQueue = new NotificationQueue();

// ============================================================================
// Email Template Generators (Reusing cron job templates)
// ============================================================================

/**
 * Generate character choice reminder email HTML
 * Reuses template logic from cron-send-character-choice-reminders
 */
function generateChoiceReminderHTML(params: {
  userName: string;
  collectionName: string;
  deadline: string;
  orderId: string;
  orderType: string;
  reminderType: 'first' | 'second' | 'final';
}): string {
  const formattedDate = formatDate(params.deadline, {
    timeZone: 'America/Bahia',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const daysRemaining = params.reminderType === 'first' ? 5 : params.reminderType === 'second' ? 2 : 1;
  const urgencyLevel = params.reminderType === 'final' ? 'high' : params.reminderType === 'second' ? 'medium' : 'low';
  
  const orderPath = params.orderType === 'subscription_delivery' ? 'assinatura' : 'compra-avulsa';
  const choiceUrl = `${window.location.origin}/${orderPath}/${params.orderId}`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escolha seu Personagem</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: ${urgencyLevel === 'high' ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' : urgencyLevel === 'medium' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'};
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
    }
    .cta-button {
      display: inline-block;
      background: ${urgencyLevel === 'high' ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' : urgencyLevel === 'medium' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'};
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${params.reminderType === 'final' ? '🚨 Último Dia!' : params.reminderType === 'second' ? '⏰ Lembrete' : '✨ Escolha seu Personagem'}</h1>
      <p>${params.collectionName}</p>
    </div>
    <div class="content">
      <p>Olá, ${params.userName}!</p>
      <p>Prazo: ${formattedDate} (${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'} restantes)</p>
      <div style="text-align: center;">
        <a href="${choiceUrl}" class="cta-button">
          ${params.reminderType === 'final' ? 'Escolher Agora!' : 'Fazer Minha Escolha'}
        </a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate choice approval email HTML
 */
function generateChoiceApprovalHTML(params: {
  userName: string;
  collectionName: string;
  characterName: string;
  characterImageUrl: string | null;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escolha Aprovada</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
    }
    .character-card {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-left: 4px solid #10b981;
      padding: 24px;
      margin: 24px 0;
      border-radius: 8px;
      text-align: center;
    }
    .character-image {
      max-width: 300px;
      border-radius: 8px;
      margin: 16px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Escolha Aprovada!</h1>
      <p>${params.collectionName}</p>
    </div>
    <div class="content">
      <p>Olá, ${params.userName}!</p>
      <p>Ótimas notícias! Sua escolha de personagem foi aprovada e sua peça entrará em produção em breve.</p>
      <div class="character-card">
        <h2>${params.characterName}</h2>
        ${params.characterImageUrl ? `<img src="${params.characterImageUrl}" alt="${params.characterName}" class="character-image" />` : ''}
        <p>Sua peça exclusiva está sendo preparada com todo carinho!</p>
      </div>
      <p>Você receberá atualizações sobre o progresso da produção por e-mail.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate choice rejection email HTML
 */
function generateChoiceRejectionHTML(params: {
  userName: string;
  collectionName: string;
  characterName: string;
  rejectionReason: string;
  orderId: string;
  orderType: string;
}): string {
  const orderPath = params.orderType === 'subscription_delivery' ? 'assinatura' : 'compra-avulsa';
  const choiceUrl = `${window.location.origin}/${orderPath}/${params.orderId}`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escolha Rejeitada</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
    }
    .reason-card {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 24px;
      margin: 24px 0;
      border-radius: 8px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Escolha Rejeitada</h1>
      <p>${params.collectionName}</p>
    </div>
    <div class="content">
      <p>Olá, ${params.userName}!</p>
      <p>Infelizmente, não foi possível aprovar sua escolha do personagem <strong>${params.characterName}</strong>.</p>
      <div class="reason-card">
        <h3>Motivo:</h3>
        <p>${params.rejectionReason}</p>
      </div>
      <p>Por favor, escolha outro personagem disponível para continuar com sua produção.</p>
      <div style="text-align: center;">
        <a href="${choiceUrl}" class="cta-button">
          Escolher Outro Personagem
        </a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate stage update email HTML
 */
function generateStageUpdateHTML(params: {
  userName: string;
  collectionName: string;
  characterName: string | null;
  stage: string;
  stageName: string;
  estimatedCompletion: string | null;
}): string {
  const stageEmojis: Record<string, string> = {
    'awaiting_choice': '⏳',
    'design': '🎨',
    'production': '🔨',
    'quality_check': '✅',
    'packaging': '📦',
    'shipped': '🚚',
  };

  const emoji = stageEmojis[params.stage] || '📋';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atualização de Produção</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
    }
    .stage-card {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-left: 4px solid #3b82f6;
      padding: 24px;
      margin: 24px 0;
      border-radius: 8px;
      text-align: center;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} Atualização de Produção</h1>
      <p>${params.collectionName}</p>
    </div>
    <div class="content">
      <p>Olá, ${params.userName}!</p>
      <p>Sua peça ${params.characterName ? `do personagem <strong>${params.characterName}</strong>` : ''} teve uma atualização de status.</p>
      <div class="stage-card">
        <h2>Etapa Atual: ${params.stageName}</h2>
        ${params.estimatedCompletion ? `<p>Previsão de conclusão: ${params.estimatedCompletion}</p>` : ''}
      </div>
      <p>Você pode acompanhar o progresso completo da sua peça no painel de pedidos.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate delay notification email HTML
 */
function generateDelayNotificationHTML(params: {
  userName: string;
  collectionName: string;
  characterName: string | null;
  reason: string;
  newEstimatedDate: string | null;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atraso na Produção</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
    }
    .delay-card {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 24px;
      margin: 24px 0;
      border-radius: 8px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Atualização de Prazo</h1>
      <p>${params.collectionName}</p>
    </div>
    <div class="content">
      <p>Olá, ${params.userName}!</p>
      <p>Gostaríamos de informar sobre uma atualização no prazo de produção da sua peça ${params.characterName ? `do personagem <strong>${params.characterName}</strong>` : ''}.</p>
      <div class="delay-card">
        <h3>Motivo:</h3>
        <p>${params.reason}</p>
        ${params.newEstimatedDate ? `<p><strong>Nova previsão de conclusão:</strong> ${params.newEstimatedDate}</p>` : ''}
      </div>
      <p>Pedimos desculpas pelo inconveniente e agradecemos sua compreensão. Estamos trabalhando para garantir a melhor qualidade possível para sua peça.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

type ProductionAssignmentPriority = Priority;

function normalizeAssignmentPriority(priority: unknown, priorityScore?: unknown): ProductionAssignmentPriority {
  return getProductionPriorityFromScore(priority, priorityScore);
}

function queuePriorityFromAssignmentPriority(
  priority: ProductionAssignmentPriority,
): NotificationQueueItem['priority'] {
  return priority === 'critical' || priority === 'high' ? 'high' : 'normal';
}

/**
 * Generate assignment notification email HTML
 */
function generateAssignmentNotificationHTML(params: {
  userName: string;
  customerName: string;
  collectionName: string;
  characterName: string;
  currentStage: string;
  priority: string;
  scheduledDate: string | null;
  estimatedCompletion: string | null;
  isReassignment: boolean;
}): string {
  const priorityNames: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    normal: 'Normal',
    low: 'Baixa',
  };

  const stageName = getProductionStageLabel(params.currentStage);
  const priorityName = priorityNames[params.priority] || params.priority;

  const title = params.isReassignment ? 'Item Reatribuído' : 'Novo Item Atribuído';
  const message = params.isReassignment
    ? 'Um item de produção foi reatribuído para você'
    : 'Um novo item de produção foi atribuído para você';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
    }
    .info-card {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6b7280;
      font-size: 14px;
    }
    .info-value {
      color: #111827;
      font-weight: 600;
      font-size: 14px;
    }
    .priority-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .priority-critical { background-color: #dc2626; color: #ffffff; }
    .priority-high { background-color: #f59e0b; color: #ffffff; }
    .priority-normal { background-color: #3b82f6; color: #ffffff; }
    .priority-low { background-color: #6b7280; color: #ffffff; }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 ${title}</h1>
      <p>${message}</p>
    </div>
    <div class="content">
      <p>Olá, <strong>${params.userName}</strong>!</p>
      <p>${message}:</p>
      
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Cliente:</span>
          <span class="info-value">${params.customerName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Coleção:</span>
          <span class="info-value">${params.collectionName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Personagem:</span>
          <span class="info-value">${params.characterName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Etapa Atual:</span>
          <span class="info-value">${stageName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Prioridade:</span>
          <span class="info-value">
            <span class="priority-badge priority-${params.priority}">${priorityName}</span>
          </span>
        </div>
        ${params.scheduledDate ? `
        <div class="info-row">
          <span class="info-label">Data Agendada:</span>
          <span class="info-value">${params.scheduledDate}</span>
        </div>
        ` : ''}
        ${params.estimatedCompletion ? `
        <div class="info-row">
          <span class="info-label">Conclusão Estimada:</span>
          <span class="info-value">${params.estimatedCompletion}</span>
        </div>
        ` : ''}
      </div>
      
      <p>Por favor, acesse o sistema de produção para visualizar mais detalhes e iniciar o trabalho neste item.</p>
      
      <div style="text-align: center;">
        <a href="#" class="cta-button">Acessar Sistema de Produção</a>
      </div>
    </div>
    <div class="footer">
      <p>Se tiver alguma dúvida, entre em contato com a equipe de produção.</p>
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// Production Notification Service Class
// ============================================================================

class ProductionNotificationService {
  /**
   * Send character choice reminder
   * Queues notification for batch sending
   */
  async sendChoiceReminder(choiceId: string): Promise<void> {
    try {
      // Fetch choice details
      const { data: choice, error } = await supabase
        .from('character_choices')
        .select(`
          *,
          profiles:user_id (
            email,
            raw_user_meta_data
          ),
          collections:collection_id (
            name
          )
        `)
        .eq('id', choiceId)
        .single();

      if (error || !choice) {
        throw new Error(`Failed to fetch character choice: ${error?.message}`);
      }

      const profile = choice.profiles as unknown as NotificationProfile | null;
      const collection = choice.collections as unknown as NamedRelation | null;

      if (!profile?.email) {
        throw new Error('User email not found');
      }

      if (!collection?.name) {
        throw new Error('Collection not found');
      }

      if (!choice.deadline) {
        throw new Error('Choice deadline not found');
      }

      // Calculate days remaining
      const deadline = new Date(choice.deadline);
      const now = new Date();
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Determine reminder type
      let reminderType: 'first' | 'second' | 'final' = 'first';
      if (daysRemaining <= 1) {
        reminderType = 'final';
      } else if (daysRemaining <= 2) {
        reminderType = 'second';
      }

      // Queue notification
      notificationQueue.add({
        type: 'choice_reminder',
        recipientEmail: profile.email,
        recipientName: profile.raw_user_meta_data?.full_name || null,
        data: {
          choiceId,
          userName: profile.raw_user_meta_data?.full_name || profile.email.split('@')[0],
          collectionName: collection.name,
          deadline: choice.deadline,
          orderId: choice.order_id,
          orderType: choice.order_type,
          reminderType,
        },
        priority: reminderType === 'final' ? 'high' : 'normal',
        scheduledFor: new Date(),
      });

      logInfo('Character choice reminder queued', { email: profile.email }, 'notifications');
    } catch (error) {
      logError('Failed to send choice reminder', error, 'notifications');
      throw error;
    }
  }

  /**
   * Send character choice approval notification
   */
  async sendChoiceApproval(choiceId: string): Promise<void> {
    try {
      // Fetch choice details with character info
      const { data: choice, error } = await supabase
        .from('character_choices')
        .select(`
          *,
          profiles:user_id (
            email,
            raw_user_meta_data
          ),
          collections:collection_id (
            name
          ),
          collection_characters:character_id (
            name,
            image_url
          )
        `)
        .eq('id', choiceId)
        .single();

      if (error || !choice) {
        throw new Error(`Failed to fetch character choice: ${error?.message}`);
      }

      const profile = choice.profiles as unknown as NotificationProfile | null;
      const collection = choice.collections as unknown as NamedRelation | null;
      const character = choice.collection_characters as unknown as NamedRelation | null;

      if (!profile?.email) {
        throw new Error('User email not found');
      }

      if (!collection?.name) {
        throw new Error('Collection not found');
      }

      // Queue notification
      notificationQueue.add({
        type: 'choice_approval',
        recipientEmail: profile.email,
        recipientName: profile.raw_user_meta_data?.full_name || null,
        data: {
          choiceId,
          userName: profile.raw_user_meta_data?.full_name || profile.email.split('@')[0],
          collectionName: collection.name,
          characterName: character?.name || 'Personagem',
          characterImageUrl: character?.image_url || null,
        },
        priority: 'normal',
        scheduledFor: new Date(),
      });

      logInfo('Character choice approval notification queued', { email: profile.email }, 'notifications');
    } catch (error) {
      logError('Failed to send choice approval', error, 'notifications');
      throw error;
    }
  }

  /**
   * Send character choice rejection notification
   */
  async sendChoiceRejection(choiceId: string, rejectionReason: string): Promise<void> {
    try {
      // Fetch choice details
      const { data: choice, error } = await supabase
        .from('character_choices')
        .select(`
          *,
          profiles:user_id (
            email,
            raw_user_meta_data
          ),
          collections:collection_id (
            name
          ),
          collection_characters:character_id (
            name
          )
        `)
        .eq('id', choiceId)
        .single();

      if (error || !choice) {
        throw new Error(`Failed to fetch character choice: ${error?.message}`);
      }

      const profile = choice.profiles as unknown as NotificationProfile | null;
      const collection = choice.collections as unknown as NamedRelation | null;
      const character = choice.collection_characters as unknown as NamedRelation | null;

      if (!profile?.email) {
        throw new Error('User email not found');
      }

      if (!collection?.name) {
        throw new Error('Collection not found');
      }

      // Queue notification
      notificationQueue.add({
        type: 'choice_rejection',
        recipientEmail: profile.email,
        recipientName: profile.raw_user_meta_data?.full_name || null,
        data: {
          choiceId,
          userName: profile.raw_user_meta_data?.full_name || profile.email.split('@')[0],
          collectionName: collection.name,
          characterName: character?.name || 'Personagem',
          rejectionReason,
          orderId: choice.order_id,
          orderType: choice.order_type,
        },
        priority: 'high',
        scheduledFor: new Date(),
      });

      logInfo('Character choice rejection notification queued', { email: profile.email }, 'notifications');
    } catch (error) {
      logError('Failed to send choice rejection', error, 'notifications');
      throw error;
    }
  }

  /**
   * Send production stage update notification
   */
  async sendStageUpdate(productionQueueId: string, stage: string): Promise<void> {
    try {
      // Fetch production queue details
      const { data: queueItem, error } = await supabase
        .from('production_queue')
        .select(`
          *,
          profiles:customer_id (
            email,
            raw_user_meta_data
          ),
          collections:collection_id (
            name
          ),
          collection_characters:character_id (
            name
          )
        `)
        .eq('id', productionQueueId)
        .single();

      if (error || !queueItem) {
        throw new Error(`Failed to fetch production queue item: ${error?.message}`);
      }

      const profile = queueItem.profiles as unknown as NotificationProfile | null;
      const collection = queueItem.collections as unknown as NamedRelation | null;
      const character = queueItem.collection_characters as unknown as NamedRelation | null;

      if (!profile?.email) {
        throw new Error('User email not found');
      }

      if (!collection?.name) {
        throw new Error('Collection not found');
      }

      if (!queueItem.customer_id) {
        throw new Error('Customer ID not found');
      }

      // Check if user has opted in for stage updates (non-critical notification)
      const { data: shouldSend } = await notificationPreferenceRpc.rpc('should_send_notification', {
        user_id: queueItem.customer_id,
        notification_type: 'stage_update',
      });

      if (!shouldSend) {
        logDebug('User opted out of stage updates', { customerId: queueItem.customer_id }, 'notifications');
        return;
      }

      const stageName = getProductionStageLabel(stage);

      // Format estimated completion date
      const estimatedCompletion = queueItem.estimated_completion_date
        ? formatDate(queueItem.estimated_completion_date, {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : null;

      // Shipped notifications have their own preference setting.
      if (stage === 'shipped') {
        const { data: shouldSendShipped } = await notificationPreferenceRpc.rpc('should_send_notification', {
          user_id: queueItem.customer_id,
          notification_type: 'item_shipped',
        });
        if (!shouldSendShipped) {
          logDebug('User opted out of shipped notifications', { customerId: queueItem.customer_id }, 'notifications');
          return;
        }
      }

      // Queue notification
      notificationQueue.add({
        type: 'stage_update',
        recipientEmail: profile.email,
        recipientName: profile.raw_user_meta_data?.full_name || null,
        data: {
          productionQueueId,
          userName: profile.raw_user_meta_data?.full_name || profile.email.split('@')[0],
          collectionName: collection.name,
          characterName: character?.name || null,
          stage,
          stageName,
          estimatedCompletion,
        },
        priority: stage === 'shipped' ? 'high' : 'normal',
        scheduledFor: new Date(),
      });

      logInfo('Stage update notification queued', { email: profile.email }, 'notifications');
    } catch (error) {
      logError('Failed to send stage update', error, 'notifications');
      throw error;
    }
  }

  /**
   * Send production delay notification
   */
  async sendDelayNotification(productionQueueId: string, reason: string): Promise<void> {
    try {
      // Fetch production queue details
      const { data: queueItem, error } = await supabase
        .from('production_queue')
        .select(`
          *,
          profiles:customer_id (
            email,
            raw_user_meta_data
          ),
          collections:collection_id (
            name
          ),
          collection_characters:character_id (
            name
          )
        `)
        .eq('id', productionQueueId)
        .single();

      if (error || !queueItem) {
        throw new Error(`Failed to fetch production queue item: ${error?.message}`);
      }

      const profile = queueItem.profiles as unknown as NotificationProfile | null;
      const collection = queueItem.collections as unknown as NamedRelation | null;
      const character = queueItem.collection_characters as unknown as NamedRelation | null;

      if (!profile?.email) {
        throw new Error('User email not found');
      }

      if (!collection?.name) {
        throw new Error('Collection not found');
      }

      // Format new estimated date
      const newEstimatedDate = queueItem.estimated_completion_date
        ? formatDate(queueItem.estimated_completion_date, {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : null;

      // Queue notification
      notificationQueue.add({
        type: 'delay_notification',
        recipientEmail: profile.email,
        recipientName: profile.raw_user_meta_data?.full_name || null,
        data: {
          productionQueueId,
          userName: profile.raw_user_meta_data?.full_name || profile.email.split('@')[0],
          collectionName: collection.name,
          characterName: character?.name || null,
          reason,
          newEstimatedDate,
        },
        priority: 'high',
        scheduledFor: new Date(),
      });

      logInfo('Delay notification queued', { email: profile.email }, 'notifications');
    } catch (error) {
      logError('Failed to send delay notification', error, 'notifications');
      throw error;
    }
  }

  /**
   * Send assignment notification to team member
   * 
   * @param productionQueueId - ID of the production queue item
   * @param assignedUserId - ID of the user being assigned
   * @param isReassignment - Whether this is a reassignment
   */
  async sendAssignmentNotification(
    productionQueueId: string,
    assignedUserId: string,
    isReassignment: boolean = false
  ): Promise<void> {
    try {
      // Fetch production queue item details
      const { data: productionItem, error: productionError } = await supabase
        .from('production_queue')
        .select(`
          id,
          order_id,
          order_type,
          customer_name,
          collection_name,
          character_name,
          current_stage,
          priority,
          priority_score,
          scheduled_production_date,
          estimated_completion_date
        `)
        .eq('id', productionQueueId)
        .single();

      if (productionError || !productionItem) {
        throw new Error(`Production item not found: ${productionError?.message}`);
      }

      // Fetch assigned user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', assignedUserId)
        .single();

      if (profileError || !profile) {
        throw new Error(`User profile not found: ${profileError?.message}`);
      }

      if (!profile.email) {
        throw new Error('Assigned user email not found');
      }

      const userName = profile.full_name || profile.email || 'Membro da equipe';
      const assignmentPriority = normalizeAssignmentPriority(
        productionItem.priority,
        productionItem.priority_score,
      );

      // Queue notification
      notificationQueue.add({
        type: isReassignment ? 'production_reassignment' : 'production_assignment',
        recipientEmail: profile.email,
        recipientName: profile.full_name,
        data: {
          productionQueueId,
          assignedUserId,
          userName,
          customerName: productionItem.customer_name || 'Cliente',
          collectionName: productionItem.collection_name || 'Colecao',
          characterName: productionItem.character_name || 'A definir',
          currentStage: productionItem.current_stage || 'pending',
          priority: assignmentPriority,
          scheduledDate: productionItem.scheduled_production_date,
          estimatedCompletion: productionItem.estimated_completion_date,
          isReassignment,
        },
        priority: queuePriorityFromAssignmentPriority(assignmentPriority),
        scheduledFor: new Date(),
      });

      logInfo('Assignment notification queued', { email: profile.email }, 'notifications');
    } catch (error) {
      logError('Failed to send assignment notification', error, 'notifications');
      throw error;
    }
  }

  /**
   * Get notification queue status
   */
  getQueueStatus() {
    return notificationQueue.getStatus();
  }

  /**
   * Clear notification queue (for testing)
   */
  clearQueue() {
    notificationQueue.clear();
  }
}

// Export singleton instance
export const productionNotificationService = new ProductionNotificationService();
