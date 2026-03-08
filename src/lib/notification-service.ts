/**
 * NotificationService - Service for sending email notifications for payment status changes
 *
 * Requirements: 9.1-9.12
 * Design: .kiro/specs/manual-payment-system/design.md
 *
 * This service handles all email notifications related to manual payments,
 * including payment creation, status changes, and conversation messages.
 * It integrates with the existing email service in the project.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ManualPayment, PaymentDetails } from "@/types/manual-payment";

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
 * This should be implemented by the existing email service
 */
export interface EmailService {
  sendEmail(
    to: EmailRecipient[],
    template: EmailTemplate,
    data?: Record<string, any>
  ): Promise<void>;
}

/**
 * NotificationService class
 * Handles all payment-related email notifications
 */
export class NotificationService {
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  /**
   * Send payment creation email to customer
   * Requirements: 9.1-9.2
   *
   * @param paymentId - UUID of the created payment
   * @throws Error if payment not found or email sending fails
   */
  async sendPaymentCreated(paymentId: string): Promise<void> {
    const paymentDetails = await this.getPaymentDetails(paymentId);

    if (!paymentDetails.customer_email) {
      throw new Error("Customer email not found");
    }

    const template = this.getPaymentCreatedTemplate(paymentDetails);
    const recipient: EmailRecipient = {
      email: paymentDetails.customer_email,
      name: paymentDetails.customer_name,
    };

    await this.emailService.sendEmail([recipient], template, {
      payment: paymentDetails,
      paymentMethod: paymentDetails.payment_method,
    });
  }

  /**
   * Send payment under review notification to all admins
   * Requirements: 9.3-9.4
   *
   * @param paymentId - UUID of the payment under review
   * @throws Error if payment not found or email sending fails
   */
  async sendPaymentUnderReview(paymentId: string): Promise<void> {
    const paymentDetails = await this.getPaymentDetails(paymentId);
    const admins = await this.getAdminEmails();

    if (admins.length === 0) {
      console.warn("No admin emails found for payment under review notification");
      return;
    }

    const template = this.getPaymentUnderReviewTemplate(paymentDetails);
    const recipients = admins.map((email) => ({ email }));

    await this.emailService.sendEmail(recipients, template, {
      payment: paymentDetails,
      customerName: paymentDetails.customer_name,
    });
  }

  /**
   * Send payment approval email to customer
   * Requirements: 9.5-9.6
   *
   * @param paymentId - UUID of the approved payment
   * @throws Error if payment not found or email sending fails
   */
  async sendPaymentApproved(paymentId: string): Promise<void> {
    const paymentDetails = await this.getPaymentDetails(paymentId);

    if (!paymentDetails.customer_email) {
      throw new Error("Customer email not found");
    }

    const template = this.getPaymentApprovedTemplate(paymentDetails);
    const recipient: EmailRecipient = {
      email: paymentDetails.customer_email,
      name: paymentDetails.customer_name,
    };

    await this.emailService.sendEmail([recipient], template, {
      payment: paymentDetails,
      approvedAt: paymentDetails.approved_at,
    });
  }

  /**
   * Send payment rejection email to customer with reason
   * Requirements: 9.7-9.8
   *
   * @param paymentId - UUID of the rejected payment
   * @param reason - Rejection reason provided by admin
   * @throws Error if payment not found or email sending fails
   */
  async sendPaymentRejected(paymentId: string, reason: string): Promise<void> {
    const paymentDetails = await this.getPaymentDetails(paymentId);

    if (!paymentDetails.customer_email) {
      throw new Error("Customer email not found");
    }

    const template = this.getPaymentRejectedTemplate(paymentDetails, reason);
    const recipient: EmailRecipient = {
      email: paymentDetails.customer_email,
      name: paymentDetails.customer_name,
    };

    await this.emailService.sendEmail([recipient], template, {
      payment: paymentDetails,
      rejectionReason: reason,
    });
  }

  /**
   * Send info requested email to customer with admin message
   * Requirements: 9.9-9.10
   *
   * @param paymentId - UUID of the payment requiring more info
   * @param message - Admin message requesting more information
   * @throws Error if payment not found or email sending fails
   */
  async sendInfoRequested(paymentId: string, message: string): Promise<void> {
    const paymentDetails = await this.getPaymentDetails(paymentId);

    if (!paymentDetails.customer_email) {
      throw new Error("Customer email not found");
    }

    const template = this.getInfoRequestedTemplate(paymentDetails, message);
    const recipient: EmailRecipient = {
      email: paymentDetails.customer_email,
      name: paymentDetails.customer_name,
    };

    await this.emailService.sendEmail([recipient], template, {
      payment: paymentDetails,
      adminMessage: message,
    });
  }

  /**
   * Send new message notification for conversation
   * Requirements: 9.11-9.12
   *
   * @param conversationId - UUID of the support conversation
   * @param messageId - UUID of the new message
   * @throws Error if conversation or message not found
   */
  async sendNewMessage(conversationId: string, messageId: string): Promise<void> {
    const { conversation, message, recipient } = await this.getConversationDetails(
      conversationId,
      messageId
    );

    if (!recipient.email) {
      throw new Error("Recipient email not found");
    }

    const template = this.getNewMessageTemplate(conversation, message);
    const emailRecipient: EmailRecipient = {
      email: recipient.email,
      name: recipient.name,
    };

    await this.emailService.sendEmail([emailRecipient], template, {
      conversation,
      message,
      senderName: message.sender_name,
    });
  }

  /**
   * Get payment details with customer information
   */
  private async getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
    const { data: payment, error } = await supabase
      .from("manual_payments")
      .select(
        `
        *,
        payment_method:admin_payment_methods(*),
        files:payment_files(*),
        audit_logs:payment_audit_log(*)
      `
      )
      .eq("id", paymentId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }

    // Get customer profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", payment.user_id)
      .single();

    // Get conversation if exists
    const { data: conversation } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("payment_id", paymentId)
      .maybeSingle();

    return {
      ...payment,
      payment_method: payment.payment_method,
      files: payment.files || [],
      audit_logs: payment.audit_logs || [],
      conversation: conversation || undefined,
      customer_name: profile?.full_name,
      customer_email: profile?.email,
    } as PaymentDetails;
  }

  /**
   * Get admin email addresses
   */
  private async getAdminEmails(): Promise<string[]> {
    // This query assumes there's a user_roles table or similar
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("is_admin", true)
      .not("email", "is", null);

    if (error) {
      console.error("Failed to fetch admin emails:", error);
      return [];
    }

    return data.map((profile) => profile.email).filter(Boolean) as string[];
  }

  /**
   * Get conversation details for message notification
   */
  private async getConversationDetails(conversationId: string, messageId: string) {
    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convError) {
      throw new Error(`Failed to fetch conversation: ${convError.message}`);
    }

    // Get message
    const { data: message, error: msgError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (msgError) {
      throw new Error(`Failed to fetch message: ${msgError.message}`);
    }

    // Determine recipient (opposite of sender)
    const recipientId =
      message.sender_id === conversation.user_id
        ? (await this.getAdminEmails())[0] // First admin for now
        : conversation.user_id;

    // Get recipient profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", recipientId)
      .single();

    return {
      conversation,
      message: {
        ...message,
        sender_name: profile?.full_name || "Administrador",
      },
      recipient: {
        email: profile?.email,
        name: profile?.full_name,
      },
    };
  }

  /**
   * Generate email HTML template with consistent styling and branding
   */
  private generateEmailTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ordax - Sistema de Pagamentos</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                padding: 10px !important;
            }
            .button {
                display: block !important;
                width: 100% !important;
                text-align: center !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 20px 0;">
        <tr>
            <td align="center">
                <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
                                <img src="https://ordax.com.br/logo.png" alt="Ordax" width="120" height="40" style="vertical-align: middle; margin-right: 10px;">
                                Sistema de Pagamentos
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            ${content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 25px 30px; border-top: 1px solid #e2e8f0;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">
                                            <strong>Ordax Collectibles</strong><br>
                                            Sistema de Pagamentos Manuais
                                        </p>
                                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                            Este é um email automático. Por favor, não responda diretamente.<br>
                                            Em caso de dúvidas, utilize o suporte da plataforma.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
                    © ${new Date().getFullYear()} Ordax. Todos os direitos reservados.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>`;
  }

  /**
   * Email template generators
   *
   * These templates follow email design best practices with:
   * - Responsive design for mobile devices
   * - Professional branding with Ordax colors
   * - Clear call-to-action buttons
   * - Accessible HTML structure
   * - Plain text fallback for email clients that don't support HTML
   */

  private getPaymentCreatedTemplate(payment: PaymentDetails): EmailTemplate {
    const subject = `Pagamento Criado - Referência: ${payment.reference_number}`;
    const html = this.generateEmailTemplate(`
      <h1 style="color: #2563eb; margin-bottom: 20px;">Pagamento Criado com Sucesso!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Olá <strong>${payment.customer_name || "Cliente"}</strong>,
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Seu pagamento foi criado com sucesso. Aqui estão os detalhes para que você possa realizar o pagamento:
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #2563eb;">
        <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">Detalhes do Pagamento</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Referência:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${payment.reference_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Valor:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${payment.amount} ${payment.currency}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Método:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${payment.payment_method.name}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #bae6fd;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">Instruções para Pagamento</h3>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          ${payment.payment_method.instructions}
        </p>
        
        ${
          payment.payment_method.payment_link
            ? `
        <div style="text-align: center; margin: 20px 0;">
          <a href="${payment.payment_method.payment_link}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Acessar Link de Pagamento
          </a>
        </div>
        `
            : ""
        }
        
        ${
          payment.payment_method.pix_key
            ? `
        <div style="background-color: white; border-radius: 6px; padding: 15px; margin-top: 15px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e293b;">Chave PIX:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669; background-color: #f0fdf4; padding: 10px; border-radius: 4px; text-align: center;">
            ${payment.payment_method.pix_key}
          </p>
        </div>
        `
            : ""
        }
      </div>
      
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #fbbf24;">
        <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">Próximos Passos</h3>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 10px;">
          1. Realize o pagamento usando as instruções acima<br>
          2. Tire um print ou foto do comprovante<br>
          3. Envie o comprovante através da plataforma Ordax
        </p>
        <p style="font-size: 14px; color: #92400e; margin: 0;">
          <strong>Importante:</strong> Após enviar o comprovante, nossa equipe irá analisar e aprovar seu pagamento.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.getCustomerPaymentUrl(payment.id)}" 
           style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
          Acessar Detalhes do Pagamento
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 30px;">
        Em caso de dúvidas, entre em contato através do suporte da plataforma.
      </p>
    `);

    const text = `PAGAMENTO CRIADO - REFERÊNCIA: ${payment.reference_number}

Olá ${payment.customer_name || "Cliente"},

Seu pagamento foi criado com sucesso na plataforma Ordax.

DETALHES DO PAGAMENTO:
- Referência: ${payment.reference_number}
- Valor: ${payment.amount} ${payment.currency}
- Método de pagamento: ${payment.payment_method.name}

INSTRUÇÕES PARA PAGAMENTO:
${payment.payment_method.instructions}

${payment.payment_method.payment_link ? `LINK PARA PAGAMENTO: ${payment.payment_method.payment_link}` : ""}
${payment.payment_method.pix_key ? `CHAVE PIX: ${payment.payment_method.pix_key}` : ""}

PRÓXIMOS PASSOS:
1. Realize o pagamento usando as instruções acima
2. Tire um print ou foto do comprovante
3. Envie o comprovante através da plataforma Ordax

Importante: Após enviar o comprovante, nossa equipe irá analisar e aprovar seu pagamento.

ACESSAR DETALHES DO PAGAMENTO:
${this.getCustomerPaymentUrl(payment.id)}

Em caso de dúvidas, entre em contato através do suporte da plataforma.

Atenciosamente,
Equipe Ordax`;

    return { subject, html, text };
  }

  private getPaymentUnderReviewTemplate(payment: PaymentDetails): EmailTemplate {
    const subject = `⚠️ Pagamento em Análise - ${payment.reference_number}`;
    const html = this.generateEmailTemplate(`
      <h1 style="color: #f59e0b; margin-bottom: 20px;">Pagamento Aguardando Análise</h1>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Um novo pagamento foi enviado e está aguardando análise da equipe administrativa.
      </p>
      
      <div style="background-color: #fffbeb; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
        <h2 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">Detalhes do Pagamento</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fde68a;"><strong>Cliente:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fde68a; text-align: right;">${payment.customer_name || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fde68a;"><strong>Referência:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fde68a; text-align: right;">${payment.reference_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fde68a;"><strong>Valor:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fde68a; text-align: right;">${payment.amount} ${payment.currency}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fde68a;"><strong>Método:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fde68a; text-align: right;">${payment.payment_method.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0;"><strong>Status:</strong></td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                Em Análise
              </span>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #bae6fd;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">Ação Necessária</h3>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          Por favor, verifique os detalhes do pagamento, analise o comprovante enviado pelo cliente e tome a ação apropriada (aprovar, rejeitar ou solicitar mais informações).
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.getAdminPaymentUrl(payment.id)}" 
           style="background-color: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
          Ver Detalhes do Pagamento
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 30px;">
        Este pagamento foi adicionado à sua lista de pendências no painel administrativo.
      </p>
    `);

    const text = `PAGAMENTO EM ANÁLISE - REFERÊNCIA: ${payment.reference_number}

Um novo pagamento foi enviado e está aguardando análise da equipe administrativa.

DETALHES DO PAGAMENTO:
- Cliente: ${payment.customer_name || "N/A"}
- Referência: ${payment.reference_number}
- Valor: ${payment.amount} ${payment.currency}
- Método: ${payment.payment_method.name}
- Status: Em Análise

AÇÃO NECESSÁRIA:
Por favor, verifique os detalhes do pagamento, analise o comprovante enviado pelo cliente e tome a ação apropriada (aprovar, rejeitar ou solicitar mais informações).

ACESSAR DETALHES DO PAGAMENTO:
${this.getAdminPaymentUrl(payment.id)}

Este pagamento foi adicionado à sua lista de pendências no painel administrativo.

Atenciosamente,
Sistema de Pagamentos Ordax`;

    return { subject, html, text };
  }

  private getPaymentApprovedTemplate(payment: PaymentDetails): EmailTemplate {
    const subject = `✅ Pagamento Aprovado - ${payment.reference_number}`;
    const html = this.generateEmailTemplate(`
      <h1 style="color: #059669; margin-bottom: 20px;">Pagamento Aprovado com Sucesso!</h1>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background-color: #d1fae5; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          <span style="font-size: 40px; color: #059669;">✓</span>
        </div>
        <p style="font-size: 18px; color: #059669; font-weight: 600; margin: 0;">
          Seu pagamento foi aprovado!
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Olá <strong>${payment.customer_name || "Cliente"}</strong>,
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Temos uma ótima notícia! Seu pagamento foi analisado e aprovado pela nossa equipe.
      </p>
      
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #059669;">
        <h2 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">Detalhes da Aprovação</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #a7f3d0;"><strong>Referência:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #a7f3d0; text-align: right;">${payment.reference_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #a7f3d0;"><strong>Valor Aprovado:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #a7f3d0; text-align: right;">${payment.amount} ${payment.currency}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #a7f3d0;"><strong>Data de Aprovação:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #a7f3d0; text-align: right;">${new Date(payment.approved_at || "").toLocaleDateString("pt-BR")}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0;"><strong>Status:</strong></td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="background-color: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                Aprovado
              </span>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #bae6fd;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">Próximos Passos</h3>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 10px;">
          <strong>Para pedidos (quotes):</strong> Seu pedido será processado e enviado em breve.
        </p>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 10px;">
          <strong>Para assinaturas (subscriptions):</strong> Sua assinatura foi ativada e as entregas serão programadas conforme o plano escolhido.
        </p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0;">
          Você pode acompanhar o status do seu pedido ou assinatura diretamente na sua conta.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.getCustomerPaymentUrl(payment.id)}" 
           style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
          Ver Comprovante de Aprovação
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 30px;">
        Agradecemos pela sua confiança na Ordax Collectibles!
      </p>
    `);

    const text = `PAGAMENTO APROVADO - REFERÊNCIA: ${payment.reference_number}

✅ SEU PAGAMENTO FOI APROVADO!

Olá ${payment.customer_name || "Cliente"},

Temos uma ótima notícia! Seu pagamento foi analisado e aprovado pela nossa equipe.

DETALHES DA APROVAÇÃO:
- Referência: ${payment.reference_number}
- Valor Aprovado: ${payment.amount} ${payment.currency}
- Data de Aprovação: ${new Date(payment.approved_at || "").toLocaleDateString("pt-BR")}
- Status: Aprovado

PRÓXIMOS PASSOS:
Para pedidos (quotes): Seu pedido será processado e enviado em breve.
Para assinaturas (subscriptions): Sua assinatura foi ativada e as entregas serão programadas conforme o plano escolhido.

Você pode acompanhar o status do seu pedido ou assinatura diretamente na sua conta.

VER COMPROVANTE DE APROVAÇÃO:
${this.getCustomerPaymentUrl(payment.id)}

Agradecemos pela sua confiança na Ordax Collectibles!

Atenciosamente,
Equipe Ordax`;

    return { subject, html, text };
  }

  private getPaymentRejectedTemplate(payment: PaymentDetails, reason: string): EmailTemplate {
    const subject = `❌ Pagamento Rejeitado - ${payment.reference_number}`;
    const html = this.generateEmailTemplate(`
      <h1 style="color: #dc2626; margin-bottom: 20px;">Pagamento Rejeitado</h1>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background-color: #fee2e2; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          <span style="font-size: 40px; color: #dc2626;">✗</span>
        </div>
        <p style="font-size: 18px; color: #dc2626; font-weight: 600; margin: 0;">
          Seu pagamento foi rejeitado
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Olá <strong>${payment.customer_name || "Cliente"}</strong>,
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Infelizmente, seu pagamento não pôde ser aprovado após análise. Mas não se preocupe, você pode tentar novamente.
      </p>
      
      <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #dc2626;">
        <h2 style="color: #991b1b; margin-top: 0; margin-bottom: 15px;">Detalhes da Rejeição</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;"><strong>Referência:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; text-align: right;">${payment.reference_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;"><strong>Valor:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; text-align: right;">${payment.amount} ${payment.currency}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0;"><strong>Status:</strong></td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="background-color: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                Rejeitado
              </span>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fffbeb; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #fbbf24;">
        <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">Motivo da Rejeição</h3>
        <div style="background-color: white; border-radius: 6px; padding: 15px; border: 1px solid #fde68a;">
          <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #92400e;">
            ${reason}
          </p>
        </div>
      </div>
      
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #bae6fd;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">Como Proceder</h3>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 10px;">
          <strong>Para tentar novamente:</strong>
        </p>
        <ol style="font-size: 15px; line-height: 1.6; margin: 0 0 15px 0; padding-left: 20px;">
          <li>Verifique o motivo da rejeição acima</li>
          <li>Corrija o problema identificado</li>
          <li>Envie um novo comprovante de pagamento</li>
          <li>Aguarde a nova análise da nossa equipe</li>
        </ol>
        <p style="font-size: 14px; color: #64748b; margin: 0;">
          Você pode enviar um novo comprovante através da mesma página do pagamento.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.getCustomerPaymentUrl(payment.id)}" 
           style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
          Ver Detalhes e Enviar Novo Comprovante
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 30px;">
        Se tiver dúvidas sobre o motivo da rejeição, entre em contato com nosso suporte.
      </p>
    `);

    const text = `PAGAMENTO REJEITADO - REFERÊNCIA: ${payment.reference_number}

❌ SEU PAGAMENTO FOI REJEITADO

Olá ${payment.customer_name || "Cliente"},

Infelizmente, seu pagamento não pôde ser aprovado após análise. Mas não se preocupe, você pode tentar novamente.

DETALHES DA REJEIÇÃO:
- Referência: ${payment.reference_number}
- Valor: ${payment.amount} ${payment.currency}
- Status: Rejeitado

MOTIVO DA REJEIÇÃO:
${reason}

COMO PROCEDER (PARA TENTAR NOVAMENTE):
1. Verifique o motivo da rejeição acima
2. Corrija o problema identificado
3. Envie um novo comprovante de pagamento
4. Aguarde a nova análise da nossa equipe

Você pode enviar um novo comprovante através da mesma página do pagamento.

VER DETALHES E ENVIAR NOVO COMPROVANTE:
${this.getCustomerPaymentUrl(payment.id)}

Se tiver dúvidas sobre o motivo da rejeição, entre em contato com nosso suporte.

Atenciosamente,
Equipe Ordax`;

    return { subject, html, text };
  }

  private getInfoRequestedTemplate(payment: PaymentDetails, message: string): EmailTemplate {
    const subject = `📋 Informações Adicionais Necessárias - ${payment.reference_number}`;
    const html = this.generateEmailTemplate(`
      <h1 style="color: #7c3aed; margin-bottom: 20px;">Informações Adicionais Necessárias</h1>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background-color: #f3e8ff; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          <span style="font-size: 40px; color: #7c3aed;">?</span>
        </div>
        <p style="font-size: 18px; color: #7c3aed; font-weight: 600; margin: 0;">
          Precisamos de mais informações
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Olá <strong>${payment.customer_name || "Cliente"}</strong>,
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Para continuar a análise do seu pagamento, nossa equipe precisa de algumas informações adicionais.
      </p>
      
      <div style="background-color: #faf5ff; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #7c3aed;">
        <h2 style="color: #5b21b6; margin-top: 0; margin-bottom: 15px;">Detalhes do Pagamento</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9d5ff;"><strong>Referência:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9d5ff; text-align: right;">${payment.reference_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0;"><strong>Valor:</strong></td>
            <td style="padding: 10px 0; text-align: right;">${payment.amount} ${payment.currency}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #fbbf24;">
        <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">Mensagem da Equipe Administrativa</h3>
        <div style="background-color: white; border-radius: 6px; padding: 20px; border: 1px solid #fde68a;">
          <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
            <div style="background-color: #fef3c7; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
              <span style="color: #92400e; font-weight: bold;">A</span>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; font-weight: 600; color: #92400e;">Administrador</p>
              <p style="margin: 0; font-size: 14px; color: #64748b;">Solicitando informações adicionais</p>
            </div>
          </div>
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; border-left: 3px solid #f59e0b;">
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #1e293b;">
              ${message}
            </p>
          </div>
        </div>
      </div>
      
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #bae6fd;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">Como Responder</h3>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 10px;">
          <strong>Para fornecer as informações solicitadas:</strong>
        </p>
        <ol style="font-size: 15px; line-height: 1.6; margin: 0 0 15px 0; padding-left: 20px;">
          <li>Acesse a página do pagamento</li>
          <li>Envie uma mensagem na conversa de suporte</li>
          <li>Inclua as informações ou documentos solicitados</li>
          <li>Clique em "Enviar"</li>
        </ol>
        <p style="font-size: 14px; color: #64748b; margin: 0;">
          Após receber suas informações, retomaremos a análise do pagamento.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.getCustomerPaymentUrl(payment.id)}" 
           style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
          Responder e Enviar Informações
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 30px;">
        Sua resposta ajudará a agilizar a análise do seu pagamento.
      </p>
    `);

    const text = `INFORMAÇÕES ADICIONAIS NECESSÁRIAS - REFERÊNCIA: ${payment.reference_number}

📋 PRECISAMOS DE MAIS INFORMAÇÕES

Olá ${payment.customer_name || "Cliente"},

Para continuar a análise do seu pagamento, nossa equipe precisa de algumas informações adicionais.

DETALHES DO PAGAMENTO:
- Referência: ${payment.reference_number}
- Valor: ${payment.amount} ${payment.currency}

MENSAGEM DA EQUIPE ADMINISTRATIVA:
${message}

COMO RESPONDER (PARA FORNECER AS INFORMAÇÕES SOLICITADAS):
1. Acesse a página do pagamento
2. Envie uma mensagem na conversa de suporte
3. Inclua as informações ou documentos solicitados
4. Clique em "Enviar"

Após receber suas informações, retomaremos a análise do pagamento.

RESPONDER E ENVIAR INFORMAÇÕES:
${this.getCustomerPaymentUrl(payment.id)}

Sua resposta ajudará a agilizar a análise do seu pagamento.

Atenciosamente,
Equipe Ordax`;

    return { subject, html, text };
  }

  private getNewMessageTemplate(conversation: any, message: any): EmailTemplate {
    const subject = `💬 Nova mensagem - ${conversation.subject}`;
    const html = this.generateEmailTemplate(`
      <h1 style="color: #2563eb; margin-bottom: 20px;">Nova Mensagem Recebida</h1>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Você recebeu uma nova mensagem na conversa de suporte.
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 10px;">${conversation.subject}</h3>
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
          ID da Conversa: ${conversation.id}
        </p>
      </div>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
        <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">Nova Mensagem</h3>
        
        <div style="background-color: white; border-radius: 6px; padding: 20px; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
            <div style="background-color: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
              <span style="font-weight: bold; font-size: 18px;">${message.sender_name?.charAt(0) || "U"}</span>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; font-weight: 600; color: #1e293b;">
                ${message.sender_name}
              </p>
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                ${new Date().toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; border-left: 4px solid #3b82f6; margin-top: 15px;">
            <p style="margin: 0; line-height: 1.6; color: #1e293b;">
              ${message.message}
            </p>
          </div>
        </div>
      </div>
      
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #bae6fd;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">Ação Necessária</h3>
        <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6;">
          Para visualizar a conversa completa e responder, acesse o link abaixo:
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.getConversationUrl(conversation.id)}" 
           style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
          Ver Conversa Completa
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 30px;">
        Esta é uma notificação automática. Por favor, não responda este e-mail.
      </p>
    `);

    const text = `NOVA MENSAGEM RECEBIDA

Você recebeu uma nova mensagem na conversa de suporte.

ASSUNTO: ${conversation.subject}
ID DA CONVERSA: ${conversation.id}

NOVA MENSAGEM:
De: ${message.sender_name}
Data: ${new Date().toLocaleString("pt-BR")}

${message.message}

ACESSAR CONVERSA COMPLETA:
${this.getConversationUrl(conversation.id)}

Esta é uma notificação automática. Por favor, não responda este e-mail.

Atenciosamente,
Equipe de Suporte Ordax`;

    return { subject, html, text };
  }

  /**
   * URL helpers
   */
  private getAdminPaymentUrl(paymentId: string): string {
    return `${window.location.origin}/admin/payments/${paymentId}`;
  }

  private getCustomerPaymentUrl(paymentId: string): string {
    return `${window.location.origin}/my-payments/${paymentId}`;
  }

  private getConversationUrl(conversationId: string): string {
    return `${window.location.origin}/support/conversations/${conversationId}`;
  }
}

/**
 * Default email service implementation using Supabase Edge Functions
 * This is a placeholder - should be replaced with actual email service integration
 */
export class DefaultEmailService implements EmailService {
  async sendEmail(
    to: EmailRecipient[],
    template: EmailTemplate,
    data?: Record<string, any>
  ): Promise<void> {
    // This is a placeholder implementation
    // In a real implementation, this would call an email service API
    // For now, we'll log the email and use Supabase Edge Functions if available

    console.log("Email would be sent:", {
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

/**
 * Singleton instance of NotificationService
 */
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    const emailService = new DefaultEmailService();
    notificationServiceInstance = new NotificationService(emailService);
  }
  return notificationServiceInstance;
}
