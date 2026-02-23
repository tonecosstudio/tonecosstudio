/**
 * NotificationService - Service for sending email notifications for chat messages
 * 
 * Requirements: 16.1, 16.5, 16.6
 * Design: .kiro/specs/advanced-chat-support-system/design.md
 * 
 * This service handles email notifications for users when they receive messages
 * while offline. It checks if users are online, queues notifications, and groups
 * them within 5 minutes to avoid spam.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Email template interface
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Email recipient interface
 */
export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Email service interface for integration
 */
export interface EmailService {
  sendEmail(to: EmailRecipient[], template: EmailTemplate, data?: Record<string, any>): Promise<void>;
}

/**
 * Queued notification interface
 */
interface QueuedNotification {
  userId: string;
  conversationId: string;
  messages: string[];
  queuedAt: Date;
}

/**
 * NotificationService class
 * Handles all chat-related email notifications
 */
export class NotificationService {
  private emailService: EmailService;
  private notificationQueue: Map<string, QueuedNotification> = new Map();
  private readonly GROUPING_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  
  constructor(emailService: EmailService) {
    this.emailService = emailService;
    
    // Start processing queue every minute
    setInterval(() => this.processNotificationQueue(), 60 * 1000);
  }
  
  /**
   * Send email notification to user about new message
   * Requirements: 16.1, 16.5, 16.6
   * 
   * @param userId - UUID of the user to notify
   * @param conversationId - UUID of the conversation
   * @param message - Message content
   */
  async sendEmailNotification(
    userId: string,
    conversationId: string,
    message: string
  ): Promise<void> {
    // Check if user is online
    const isOnline = await this.isUserOnline(userId);
    
    if (isOnline) {
      // Don't send email if user is currently online
      return;
    }
    
    // Queue notification for grouping
    this.queueNotification(userId, conversationId, message);
  }
  
  /**
   * Check if user is currently online
   * Requirements: 16.5
   * 
   * A user is considered online if they have activity in the last 5 minutes
   * 
   * @param userId - UUID of the user to check
   * @returns true if user is online, false otherwise
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      // Check for recent activity in support_messages table
      const fiveMinutesAgo = new Date(Date.now() - this.ONLINE_THRESHOLD_MS);
      
      const { data, error } = await supabase
        .from('support_messages')
        .select('created_at')
        .eq('sender_id', userId)
        .gte('created_at', fiveMinutesAgo.toISOString())
        .limit(1);
      
      if (error) {
        console.error('Error checking user online status:', error);
        return false;
      }
      
      return (data && data.length > 0);
    } catch (error) {
      console.error('Error checking user online status:', error);
      return false;
    }
  }
  
  /**
   * Queue notification for grouping
   * Requirements: 16.6
   * 
   * Messages sent within 5 minutes are grouped into a single email
   * 
   * @param userId - UUID of the user
   * @param conversationId - UUID of the conversation
   * @param message - Message content
   */
  queueNotification(userId: string, conversationId: string, message: string): void {
    const key = `${userId}-${conversationId}`;
    const existing = this.notificationQueue.get(key);
    
    if (existing) {
      // Add to existing queue
      existing.messages.push(message);
    } else {
      // Create new queue entry
      this.notificationQueue.set(key, {
        userId,
        conversationId,
        messages: [message],
        queuedAt: new Date(),
      });
    }
  }
  
  /**
   * Process notification queue and send grouped emails
   * Requirements: 16.6
   * 
   * This method is called periodically to check for notifications that should be sent
   */
  async processNotificationQueue(): Promise<void> {
    const now = new Date();
    const toSend: Array<{ key: string; notification: QueuedNotification }> = [];
    
    // Find notifications that are ready to send (older than 5 minutes)
    for (const [key, notification] of this.notificationQueue.entries()) {
      const age = now.getTime() - notification.queuedAt.getTime();
      
      if (age >= this.GROUPING_WINDOW_MS) {
        toSend.push({ key, notification });
      }
    }
    
    // Send notifications
    for (const { key, notification } of toSend) {
      try {
        await this.sendGroupedNotification(notification);
        this.notificationQueue.delete(key);
      } catch (error) {
        console.error('Error sending grouped notification:', error);
        // Keep in queue to retry later
      }
    }
  }
  
  /**
   * Send grouped notification email
   * 
   * @param notification - Queued notification to send
   */
  private async sendGroupedNotification(notification: QueuedNotification): Promise<void> {
    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', notification.userId)
      .single();
    
    if (userError || !userData?.email) {
      console.error('Error getting user details:', userError);
      return;
    }
    
    // Get conversation details
    const { data: conversationData, error: conversationError } = await supabase
      .from('support_conversations')
      .select('subject')
      .eq('id', notification.conversationId)
      .single();
    
    if (conversationError) {
      console.error('Error getting conversation details:', conversationError);
      return;
    }
    
    const recipient: EmailRecipient = {
      email: userData.email,
      name: userData.full_name || undefined,
    };
    
    const template = this.getMessageNotificationTemplate(
      notification.messages,
      conversationData?.subject || 'Conversa de Suporte'
    );
    
    await this.emailService.sendEmail([recipient], template, {
      conversationId: notification.conversationId,
      messageCount: notification.messages.length,
      messages: notification.messages,
      conversationSubject: conversationData?.subject,
    });
  }
  
  /**
   * Generate email template for message notification
   * Requirements: 16.3, 16.4
   * 
   * Creates an HTML email template that includes:
   * - Message content (Requirement 16.3)
   * - Link to conversation (Requirement 16.4)
   * 
   * @param messages - Array of message contents
   * @param conversationSubject - Subject of the conversation
   * @returns Email template with HTML and plain text versions
   */
  private getMessageNotificationTemplate(
    messages: string[],
    conversationSubject: string
  ): EmailTemplate {
    const messageCount = messages.length;
    const subject = messageCount === 1
      ? `Nova mensagem: ${conversationSubject}`
      : `${messageCount} novas mensagens: ${conversationSubject}`;
    
    // Build message list HTML - Requirement 16.3: Include message content
    const messagesHtml = messages
      .map(msg => `
        <li style="margin-bottom: 12px; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
          ${this.escapeHtml(msg)}
        </li>
      `)
      .join('');
    
    // HTML template with professional styling
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.escapeHtml(subject)}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #1f2937;
              margin: 0;
              padding: 0;
              background-color: #f9fafb;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
            }
            .header { 
              background-color: #2563eb; 
              color: white; 
              padding: 30px 20px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content { 
              padding: 30px 20px;
            }
            .content h2 {
              color: #1f2937;
              font-size: 20px;
              margin-top: 0;
              margin-bottom: 10px;
            }
            .content p {
              color: #4b5563;
              margin-bottom: 20px;
            }
            .messages { 
              background-color: #ffffff;
              padding: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              margin: 20px 0;
            }
            .messages ul {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .button { 
              display: inline-block; 
              background-color: #2563eb; 
              color: white !important; 
              padding: 14px 28px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin-top: 20px;
              font-weight: 500;
              text-align: center;
            }
            .button:hover {
              background-color: #1d4ed8;
            }
            .footer { 
              text-align: center; 
              color: #9ca3af; 
              font-size: 13px; 
              padding: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Ordax - Suporte</h1>
            </div>
            <div class="content">
              <h2>${messageCount === 1 ? '📬 Nova mensagem' : `📬 ${messageCount} novas mensagens`}</h2>
              <p>
                Você recebeu ${messageCount === 1 ? 'uma nova mensagem' : `${messageCount} novas mensagens`} 
                na conversa: <strong>${this.escapeHtml(conversationSubject)}</strong>
              </p>
              
              <div class="messages">
                <ul>
                  ${messagesHtml}
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${this.getConversationUrl()}" class="button">Ver Conversa Completa</a>
              </div>
            </div>
            <div class="footer">
              <p>Este é um email automático. Por favor, não responda diretamente a este email.</p>
              <p>Para responder, clique no botão acima para acessar a conversa.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Plain text version for email clients that don't support HTML
    const text = `
ORDAX - SUPORTE
===============

${messageCount === 1 ? 'NOVA MENSAGEM' : `${messageCount} NOVAS MENSAGENS`}

Você recebeu ${messageCount === 1 ? 'uma nova mensagem' : `${messageCount} novas mensagens`} na conversa: ${conversationSubject}

MENSAGENS:
${messages.map((msg, i) => `${i + 1}. ${msg}`).join('\n\n')}

---

Para responder, acesse a conversa em:
${this.getConversationUrl()}

---
Este é um email automático. Por favor, não responda diretamente a este email.
    `.trim();
    
    return { subject, html, text };
  }
  
  /**
   * Get conversation URL for email link
   */
  private getConversationUrl(): string {
    // This should be configured based on environment
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://ordax.com.br';
    return `${baseUrl}/chat`;
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

/**
 * Default email service implementation
 * This is a placeholder - should be replaced with actual email service integration
 */
export class DefaultEmailService implements EmailService {
  async sendEmail(to: EmailRecipient[], template: EmailTemplate, data?: Record<string, any>): Promise<void> {
    // This is a placeholder implementation
    // In a real implementation, this would call an email service API (Resend, SendGrid, etc.)
    
    console.log('Email would be sent:', {
      to,
      subject: template.subject,
      data,
    });
    
    // TODO: Implement actual email sending
    // Example with Supabase Edge Functions:
    // const { error } = await supabase.functions.invoke('send-email', {
    //   body: { to, template, data }
    // });
    // if (error) throw error;
  }
}

// Singleton instance
export const notificationService = new NotificationService(new DefaultEmailService());
