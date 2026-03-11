/**
 * Email Service
 * 
 * Provides email sending functionality with retry logic and error handling.
 * Supports multiple email providers (SendGrid, AWS SES, SMTP).
 * 
 * Environment Variables Required:
 * - VITE_EMAIL_PROVIDER: 'sendgrid' | 'ses' | 'smtp' (default: 'smtp')
 * - VITE_EMAIL_FROM: Sender email address
 * - VITE_EMAIL_FROM_NAME: Sender name
 * 
 * For SendGrid:
 * - VITE_SENDGRID_API_KEY: SendGrid API key
 * 
 * For AWS SES:
 * - VITE_AWS_SES_REGION: AWS region (e.g., 'us-east-1')
 * - VITE_AWS_SES_ACCESS_KEY_ID: AWS access key
 * - VITE_AWS_SES_SECRET_ACCESS_KEY: AWS secret key
 * 
 * For SMTP:
 * - VITE_SMTP_HOST: SMTP server host
 * - VITE_SMTP_PORT: SMTP server port
 * - VITE_SMTP_USER: SMTP username
 * - VITE_SMTP_PASSWORD: SMTP password
 * - VITE_SMTP_SECURE: Use TLS (true/false)
 */

import { supabase } from '@/integrations/supabase/client';
import { logInfo, logError, logDebug, logWarn } from '@/lib/logger';
import { notificationPreferencesService, EmailType } from './notification-preferences-service';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

interface EmailConfig {
  provider: 'sendgrid' | 'ses' | 'smtp';
  from: string;
  fromName: string;
  maxRetries: number;
  retryDelay: number;
}

interface SendGridConfig {
  apiKey: string;
}

interface SESConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
}

class EmailServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

/**
 * Email Service
 * Handles sending emails with retry logic and error handling
 */
export class EmailService {
  private config: EmailConfig;
  private providerConfig: SendGridConfig | SESConfig | SMTPConfig | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.providerConfig = this.loadProviderConfig();
  }

  /**
   * Load email configuration from environment variables
   */
  private loadConfig(): EmailConfig {
    const provider = (import.meta.env.VITE_EMAIL_PROVIDER || 'smtp') as EmailConfig['provider'];
    const from = import.meta.env.VITE_EMAIL_FROM || import.meta.env.VITE_SUPPORT_EMAIL || 'noreply@ordax.com.br';
    const fromName = import.meta.env.VITE_EMAIL_FROM_NAME || import.meta.env.VITE_COMPANY_NAME || 'ORDAX';
    const maxRetries = parseInt(import.meta.env.VITE_EMAIL_MAX_RETRIES || '3', 10);
    const retryDelay = parseInt(import.meta.env.VITE_EMAIL_RETRY_DELAY || '2000', 10);

    return {
      provider,
      from,
      fromName,
      maxRetries,
      retryDelay,
    };
  }

  /**
   * Load provider-specific configuration
   */
  private loadProviderConfig(): SendGridConfig | SESConfig | SMTPConfig | null {
    switch (this.config.provider) {
      case 'sendgrid':
        return {
          apiKey: import.meta.env.VITE_SENDGRID_API_KEY || '',
        } as SendGridConfig;

      case 'ses':
        return {
          region: import.meta.env.VITE_AWS_SES_REGION || 'us-east-1',
          accessKeyId: import.meta.env.VITE_AWS_SES_ACCESS_KEY_ID || '',
          secretAccessKey: import.meta.env.VITE_AWS_SES_SECRET_ACCESS_KEY || '',
        } as SESConfig;

      case 'smtp':
        return {
          host: import.meta.env.VITE_SMTP_HOST || '',
          port: parseInt(import.meta.env.VITE_SMTP_PORT || '587', 10),
          user: import.meta.env.VITE_SMTP_USER || '',
          password: import.meta.env.VITE_SMTP_PASSWORD || '',
          secure: import.meta.env.VITE_SMTP_SECURE === 'true',
        } as SMTPConfig;

      default:
        return null;
    }
  }

  /**
   * Send an email with retry logic and tracking
   * 
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - Email HTML content
   * @param emailType - Type of email for tracking (optional)
   * @param userId - User ID for tracking (optional)
   * @param metadata - Additional metadata for tracking (optional)
   * @returns Promise that resolves when email is sent
   * @throws EmailServiceError if sending fails after all retries
   */
  async sendEmail(
    to: string, 
    subject: string, 
    html: string,
    emailType: string = 'other',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const options: EmailOptions = {
      to,
      subject,
      html,
      from: this.config.from,
      fromName: this.config.fromName,
    };

    // Create initial log entry
    const logId = await this.createEmailLog({
      userId,
      recipientEmail: to,
      emailType,
      subject,
      status: 'pending',
      provider: this.config.provider,
      metadata: metadata || {}
    });

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.config.maxRetries) {
      try {
        await this.sendEmailAttempt(options);
        logInfo('Email sent successfully', { to, attempt: attempt + 1 }, 'email');
        
        // Update log entry to sent
        await this.updateEmailLog(logId, {
          status: 'sent',
          sentAt: new Date().toISOString(),
          retryCount: attempt
        });
        
        return;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error as Error);
        
        if (!isRetryable || attempt > this.config.maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        logWarn(
          `Email send failed (attempt ${attempt}/${this.config.maxRetries + 1}). ` +
          `Retrying in ${delay}ms...`,
          error,
          'email'
        );
        await this.sleep(delay);
      }
    }

    // All retries failed - update log entry
    await this.updateEmailLog(logId, {
      status: 'failed',
      errorMessage: lastError?.message || 'Unknown error',
      retryCount: attempt
    });

    throw new EmailServiceError(
      `Failed to send email after ${attempt} attempts: ${lastError?.message}`,
      'SEND_FAILED',
      false
    );
  }

  /**
   * Create email delivery log entry
   */
  private async createEmailLog(data: {
    userId?: string;
    recipientEmail: string;
    emailType: string;
    subject: string;
    status: string;
    provider: string;
    metadata: Record<string, any>;
  }): Promise<string> {
    try {
      const { data: log, error } = await supabase
        .from('email_delivery_logs')
        .insert({
          user_id: data.userId || null,
          recipient_email: data.recipientEmail,
          email_type: data.emailType,
          subject: data.subject,
          status: data.status,
          provider: data.provider,
          metadata: data.metadata
        })
        .select('id')
        .single();

      if (error) {
        logError('Failed to create email log', error, 'email');
        // Return a dummy ID if logging fails - don't block email sending
        return 'log-failed';
      }

      return log.id;
    } catch (error) {
      logError('Failed to create email log', error, 'email');
      return 'log-failed';
    }
  }

  /**
   * Update email delivery log entry
   */
  private async updateEmailLog(logId: string, updates: {
    status?: string;
    sentAt?: string;
    errorMessage?: string;
    retryCount?: number;
    providerMessageId?: string;
  }): Promise<void> {
    if (logId === 'log-failed') {
      return; // Skip update if initial log creation failed
    }

    try {
      const updateData: any = {};
      
      if (updates.status) updateData.status = updates.status;
      if (updates.sentAt) updateData.sent_at = updates.sentAt;
      if (updates.errorMessage) updateData.error_message = updates.errorMessage;
      if (updates.retryCount !== undefined) updateData.retry_count = updates.retryCount;
      if (updates.providerMessageId) updateData.provider_message_id = updates.providerMessageId;

      const { error } = await supabase
        .from('email_delivery_logs')
        .update(updateData)
        .eq('id', logId);

      if (error) {
        logError('Failed to update email log', error, 'email');
      }
    } catch (error) {
      logError('Failed to update email log', error, 'email');
    }
  }

  /**
   * Attempt to send email using configured provider
   */
  private async sendEmailAttempt(options: EmailOptions): Promise<void> {
    // Validate email address
    if (!this.isValidEmail(options.to)) {
      throw new EmailServiceError(
        `Invalid email address: ${options.to}`,
        'INVALID_EMAIL',
        false
      );
    }

    // Check if provider is configured
    if (!this.providerConfig) {
      throw new EmailServiceError(
        `Email provider ${this.config.provider} is not configured`,
        'PROVIDER_NOT_CONFIGURED',
        false
      );
    }

    switch (this.config.provider) {
      case 'sendgrid':
        return this.sendViaSendGrid(options);
      case 'ses':
        return this.sendViaSES(options);
      case 'smtp':
        return this.sendViaSMTP(options);
      default:
        throw new EmailServiceError(
          `Unsupported email provider: ${this.config.provider}`,
          'UNSUPPORTED_PROVIDER',
          false
        );
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(options: EmailOptions): Promise<void> {
    const config = this.providerConfig as SendGridConfig;

    if (!config.apiKey) {
      throw new EmailServiceError(
        'SendGrid API key not configured',
        'MISSING_API_KEY',
        false
      );
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject,
          },
        ],
        from: {
          email: options.from || this.config.from,
          name: options.fromName || this.config.fromName,
        },
        content: [
          {
            type: 'text/html',
            value: options.html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new EmailServiceError(
        `SendGrid API error: ${response.status} - ${errorText}`,
        'SENDGRID_ERROR',
        response.status >= 500 || response.status === 429
      );
    }
  }

  /**
   * Send email via AWS SES
   */
  private async sendViaSES(options: EmailOptions): Promise<void> {
    const config = this.providerConfig as SESConfig;

    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new EmailServiceError(
        'AWS SES credentials not configured',
        'MISSING_CREDENTIALS',
        false
      );
    }

    // Note: In production, you would use AWS SDK here
    // For now, this is a placeholder that shows the structure
    throw new EmailServiceError(
      'AWS SES integration requires AWS SDK implementation',
      'NOT_IMPLEMENTED',
      false
    );
  }

  /**
   * Send email via SMTP
   */
  private async sendViaSMTP(options: EmailOptions): Promise<void> {
    const config = this.providerConfig as SMTPConfig;

    if (!config.host || !config.user || !config.password) {
      throw new EmailServiceError(
        'SMTP configuration incomplete',
        'MISSING_SMTP_CONFIG',
        false
      );
    }

    // Note: In production, you would use a library like nodemailer here
    // For now, this is a placeholder that shows the structure
    throw new EmailServiceError(
      'SMTP integration requires nodemailer or similar library',
      'NOT_IMPLEMENTED',
      false
    );
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof EmailServiceError) {
      return error.retryable;
    }

    // Network errors are generally retryable
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if user wants to receive a specific email type
   * 
   * @param userId - User ID
   * @param emailType - Type of email
   * @returns True if email should be sent
   */
  private async checkEmailPreference(userId: string, emailType: EmailType): Promise<boolean> {
    try {
      return await notificationPreferencesService.shouldSendEmail(userId, emailType);
    } catch (error) {
      // If preference check fails, default to sending (fail-open)
      logWarn(`Failed to check email preference for user ${userId}`, error, 'email');
      return true;
    }
  }

  /**
   * Get current configuration (for testing/debugging)
   */
  getConfig(): EmailConfig {
    return { ...this.config };
  }

  /**
   * Check if email service is properly configured
   */
  isConfigured(): boolean {
    if (!this.providerConfig) {
      return false;
    }

    switch (this.config.provider) {
      case 'sendgrid':
        return !!(this.providerConfig as SendGridConfig).apiKey;
      case 'ses':
        const sesConfig = this.providerConfig as SESConfig;
        return !!(sesConfig.accessKeyId && sesConfig.secretAccessKey);
      case 'smtp':
        const smtpConfig = this.providerConfig as SMTPConfig;
        return !!(smtpConfig.host && smtpConfig.user && smtpConfig.password);
      default:
        return false;
    }
  }

  /**
   * Send welcome email to new subscriber
   *
   * @param subscriptionId - ID of the subscription
   * @returns Promise that resolves when email is sent
   * @throws EmailServiceError if sending fails
   */
  async sendWelcomeEmail(subscriptionId: string): Promise<void> {
    try {
      // Import Handlebars and template dynamically
      const Handlebars = (await import('handlebars')).default;
      const { welcomeTemplate } = await import('@/email-templates/welcome-template');

      // Fetch subscription details with user and deliveries
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          user:user_id (
            id,
            email,
            raw_user_meta_data
          ),
          collection:collection_id (
            id,
            name
          )
        `)
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        throw new EmailServiceError(
          `Failed to fetch subscription: ${subError?.message}`,
          'SUBSCRIPTION_NOT_FOUND',
          false
        );
      }

      // Type assertion for user data
      const user = subscription.user as any;
      if (!user || !user.email) {
        throw new EmailServiceError(
          'User email not found',
          'USER_EMAIL_NOT_FOUND',
          false
        );
      }

      // Check if user wants to receive welcome emails
      const shouldSend = await this.checkEmailPreference(user.id, 'welcome');
      if (!shouldSend) {
        logDebug('User disabled welcome emails, skipping', { email: user.email }, 'email');
        return;
      }

      // Fetch deliveries for this subscription
      const { data: deliveries, error: delError } = await supabase
        .from('subscription_deliveries')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('delivery_number', { ascending: true });

      if (delError) {
        throw new EmailServiceError(
          `Failed to fetch deliveries: ${delError.message}`,
          'DELIVERIES_NOT_FOUND',
          false
        );
      }

      // Compile template
      const template = Handlebars.compile(welcomeTemplate);

      // Prepare template data
      const userName = user.raw_user_meta_data?.full_name ||
                       user.email?.split('@')[0] ||
                       'Cliente';

      const planTypeMap: Record<string, string> = {
        'trimestral': 'Trimestral (3 entregas)',
        'semestral': 'Semestral (6 entregas)',
        'anual': 'Anual (12 entregas)'
      };

      const deliveryData = deliveries?.map((delivery) => {
        const expectedDate = delivery.expected_delivery_date
          ? new Date(delivery.expected_delivery_date).toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric'
            })
          : 'A definir';

        return {
          deliveryNumber: delivery.delivery_number,
          expectedDate,
          isBonusPiece: subscription.plan_type === 'semestral' && delivery.delivery_number === 6
        };
      }) || [];

      const dashboardUrl = `${window.location.origin}/my-subscriptions`;
      const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@ordax.com.br';

      const templateData = {
        userName,
        planType: planTypeMap[subscription.plan_type] || subscription.plan_type,
        deliveriesTotal: subscription.deliveries_total,
        totalPaid: subscription.total_paid.toFixed(2),
        deliveries: deliveryData,
        dashboardUrl,
        supportEmail
      };

      // Render template
      const html = template(templateData);

      // Send email
      await this.sendEmail(
        user.email,
        'Bem-vindo ao ORDAX - Sua assinatura foi confirmada! 🎉',
        html,
        'welcome',
        user.id,
        { subscription_id: subscriptionId }
      );

      logInfo('Welcome email sent successfully', { email: user.email }, 'email');
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send welcome email: ${(error as Error).message}`,
        'WELCOME_EMAIL_FAILED',
        false
      );
    }
  }

  /**
   * Send character revelation email to subscribers
   *
   * @param collectionId - ID of the collection being revealed
   * @param subscriberEmails - Array of subscriber email addresses
   * @returns Promise that resolves when all emails are sent
   * @throws EmailServiceError if sending fails
   */
  async sendCharacterRevelation(collectionId: string, subscriberEmails: string[]): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import('handlebars')).default;

      // Fetch collection details with character information
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();

      if (collectionError || !collection) {
        throw new EmailServiceError(
          `Failed to fetch collection: ${collectionError?.message}`,
          'COLLECTION_NOT_FOUND',
          false
        );
      }

      // Type assertion for collection with character fields
      const collectionData = collection as any;

      // Verify collection has been revealed
      if (!collectionData.revealed || !collectionData.character_name) {
        throw new EmailServiceError(
          'Collection character has not been revealed yet',
          'CHARACTER_NOT_REVEALED',
          false
        );
      }

      // Load the HTML template
      const templateResponse = await fetch('/src/email-templates/character-revelation.html');
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          'Failed to load character-revelation template',
          'TEMPLATE_NOT_FOUND',
          false
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@ordax.com.br';
      const dashboardUrl = `${window.location.origin}/my-subscriptions`;

      // Send email to each subscriber
      const emailPromises = subscriberEmails.map(async (email) => {
        try {
          // Check email preferences first
          const shouldSend = await this.checkEmailPreference(email, 'revelation');
          if (!shouldSend) {
            logDebug('Skipping character revelation email - user preference disabled', { email }, 'email');
            return;
          }

          // Fetch user details for personalization
          const { data: users } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('email', email)
            .single();

          const userName = users?.full_name ||
                          email.split('@')[0] ||
                          'Cliente';

          // Fetch delivery details for this user and collection
          const { data: delivery } = await supabase
            .from('subscription_deliveries')
            .select(`
              delivery_number,
              expected_delivery_date,
              subscription:subscription_id (
                user:user_id (
                  email
                )
              )
            `)
            .eq('collection_id', collectionId)
            .eq('subscription.user.email', email)
            .order('delivery_number', { ascending: true })
            .limit(1)
            .single();

          const deliveryNumber = delivery?.delivery_number || 1;
          const expectedShippingDate = delivery?.expected_delivery_date
            ? new Date(delivery.expected_delivery_date).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric'
              })
            : 'A definir';

          // Prepare template data
          const templateData = {
            userName,
            collectionName: collectionData.name,
            characterName: collectionData.character_name,
            characterImageUrl: collectionData.character_image_url || collectionData.image_url,
            characterDescription: collectionData.description,
            deliveryNumber,
            expectedShippingDate,
            dashboardUrl,
            supportEmail
          };

          // Render template
          const html = template(templateData);

          // Send email
          await this.sendEmail(
            email,
            `✨ Revelação: ${collectionData.character_name} - ${collectionData.name}`,
            html,
            'character_revelation',
            undefined,
            { collection_id: collectionId, delivery_number: deliveryNumber }
          );

          logInfo('Character revelation email sent successfully', { email }, 'email');
        } catch (error) {
          logError('Failed to send character revelation email', { email, error }, 'email');
          // Continue with other emails even if one fails
        }
      });

      // Wait for all emails to be sent
      await Promise.all(emailPromises);

      logInfo('Character revelation emails sent', { count: subscriberEmails.length }, 'email');
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send character revelation emails: ${(error as Error).message}`,
        'CHARACTER_REVELATION_FAILED',
        false
      );
    }
  }

  /**
   * Send collection choice reminder email to subscriber
   *
   * @param deliveryId - ID of the delivery
   * @param daysUntilCutoff - Number of days remaining until cutoff
   * @returns Promise that resolves when email is sent
   * @throws EmailServiceError if sending fails
   */
  async sendChoiceReminder(deliveryId: string, daysUntilCutoff: number): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import('handlebars')).default;

      // Register eq helper for Handlebars
      Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
      });

      // Fetch delivery details with subscription and user
      const { data: delivery, error: deliveryError } = await supabase
        .from('subscription_deliveries')
        .select(`
          *,
          collection:collection_id (
            id,
            name
          ),
          subscription:subscription_id (
            id,
            user:user_id (
              id,
              email,
              raw_user_meta_data
            )
          )
        `)
        .eq('id', deliveryId)
        .single();

      if (deliveryError || !delivery) {
        throw new EmailServiceError(
          `Failed to fetch delivery: ${deliveryError?.message}`,
          'DELIVERY_NOT_FOUND',
          false
        );
      }

      // Type assertion for nested data
      const subscription = delivery.subscription as any;
      const user = subscription?.user as any;

      if (!user || !user.email) {
        throw new EmailServiceError(
          'User email not found',
          'USER_EMAIL_NOT_FOUND',
          false
        );
      }

      // Load the HTML template
      const templateResponse = await fetch('/src/email-templates/choice-reminder.html');
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          'Failed to load choice-reminder template',
          'TEMPLATE_NOT_FOUND',
          false
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName = user.raw_user_meta_data?.full_name ||
                       user.email?.split('@')[0] ||
                       'Cliente';

      const isUrgent = daysUntilCutoff <= 3;

      // Format expected shipping date
      const expectedShippingDate = delivery.expected_delivery_date
        ? new Date(delivery.expected_delivery_date).toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
          })
        : 'A definir';

      const currentCollection = delivery.collection ? (delivery.collection as any).name : null;

      const collectionSelectionUrl = `${window.location.origin}/my-subscriptions`;
      const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@ordax.com.br';

      const templateData = {
        userName,
        isUrgent,
        daysUntilCutoff,
        deliveryNumber: delivery.delivery_number,
        expectedShippingDate,
        currentCollection,
        collectionSelectionUrl,
        supportEmail
      };

      // Render template
      const html = template(templateData);

      // Determine subject based on urgency
      const subject = isUrgent
        ? `⚠️ URGENTE: ${daysUntilCutoff} ${daysUntilCutoff === 1 ? 'dia' : 'dias'} para escolher sua coleção!`
        : `📦 Escolha sua coleção ORDAX - ${daysUntilCutoff} dias restantes`;

      // Send email
      await this.sendEmail(
        user.email, 
        subject, 
        html,
        'choice_reminder',
        user.id,
        { delivery_id: deliveryId, days_until_cutoff: daysUntilCutoff }
      );

      logInfo('Choice reminder email sent successfully', 
        { email: user.email, daysUntilCutoff }, 
        'email');
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send choice reminder email: ${(error as Error).message}`,
        'CHOICE_REMINDER_FAILED',
        false
      );
    }
  }

  /**
   * Send production started notification email
   *
   * @param deliveryId - ID of the delivery
   * @returns Promise that resolves when email is sent
   * @throws EmailServiceError if sending fails
   */
  async sendProductionStarted(deliveryId: string): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import('handlebars')).default;

      // Fetch delivery details with subscription, user, and collection
      const { data: delivery, error: deliveryError } = await supabase
        .from('subscription_deliveries')
        .select(`
          *,
          collection:collection_id (
            id,
            name,
            description
          ),
          subscription:subscription_id (
            id,
            plan_type,
            user:user_id (
              id,
              email,
              raw_user_meta_data
            )
          )
        `)
        .eq('id', deliveryId)
        .single();

      if (deliveryError || !delivery) {
        throw new EmailServiceError(
          `Failed to fetch delivery: ${deliveryError?.message}`,
          'DELIVERY_NOT_FOUND',
          false
        );
      }

      // Type assertions for nested data
      const subscription = delivery.subscription as any;
      const user = subscription?.user as any;
      const collection = delivery.collection as any;
      const collectionData = collection as any;

      if (!user || !user.email) {
        throw new EmailServiceError(
          'User email not found',
          'USER_EMAIL_NOT_FOUND',
          false
        );
      }

      // Check email preferences
      const shouldSend = await this.checkEmailPreference(user.email, 'shipping');
      if (!shouldSend) {
        logDebug(`Skipping production started email - user preference disabled`, { email: user.email }, 'email');
        return;
      }

      // Load the HTML template
      const templateResponse = await fetch('/src/email-templates/production-started.html');
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          'Failed to load production-started template',
          'TEMPLATE_NOT_FOUND',
          false
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName = user.raw_user_meta_data?.full_name ||
                       user.email?.split('@')[0] ||
                       'Cliente';

      const expectedShippingDate = delivery.expected_delivery_date
        ? new Date(delivery.expected_delivery_date).toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
          })
        : 'A definir';

      const isBonusPiece = subscription.plan_type === 'semestral' && delivery.delivery_number === 6;

      const trackingUrl = `${window.location.origin}/my-subscriptions`;
      const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@ordax.com.br';

      const templateData = {
        userName,
        collectionName: collectionData.name,
        characterName: collectionData.character_name || null,
        deliveryNumber: delivery.delivery_number,
        expectedShippingDate,
        isBonusPiece,
        trackingUrl,
        supportEmail
      };

      // Render template
      const html = template(templateData);

      // Send email
      await this.sendEmail(
        user.email,
        `🎨 Sua peça entrou em produção - ${collectionData.name}`,
        html,
        'production_started',
        user.id,
        { delivery_id: deliveryId, collection_id: collectionData.id }
      );

      logInfo('Production started email sent successfully', { email: user.email }, 'email');
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send production started email: ${(error as Error).message}`,
        'PRODUCTION_STARTED_FAILED',
        false
      );
    }
  }

  /**
   * Send shipping notification email with tracking code
   *
   * @param deliveryId - ID of the delivery
   * @param trackingCode - Tracking code for the shipment
   * @returns Promise that resolves when email is sent
   * @throws EmailServiceError if sending fails
   */
  async sendShippingNotification(deliveryId: string, trackingCode: string): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import('handlebars')).default;

      // Fetch delivery details with all related data
      const { data: delivery, error: deliveryError } = await supabase
        .from('subscription_deliveries')
        .select(`
          *,
          collection:collection_id (
            id,
            name
          ),
          subscription:subscription_id (
            id,
            plan_type,
            shipping_address,
            user:user_id (
              id,
              email,
              raw_user_meta_data
            )
          )
        `)
        .eq('id', deliveryId)
        .single();

      if (deliveryError || !delivery) {
        throw new EmailServiceError(
          `Failed to fetch delivery: ${deliveryError?.message}`,
          'DELIVERY_NOT_FOUND',
          false
        );
      }

      // Type assertions for nested data
      const subscription = delivery.subscription as any;
      const user = subscription?.user as any;
      const collection = delivery.collection as any;
      const collectionData = collection as any;

      if (!user || !user.email) {
        throw new EmailServiceError(
          'User email not found',
          'USER_EMAIL_NOT_FOUND',
          false
        );
      }

      // Check email preferences
      const shouldSend = await this.checkEmailPreference(user.email, 'shipping');
      if (!shouldSend) {
        logDebug(`Skipping shipping notification email - user preference disabled`, { email: user.email }, 'email');
        return;
      }

      // Load the HTML template
      const templateResponse = await fetch('/src/email-templates/shipping-notification.html');
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          'Failed to load shipping-notification template',
          'TEMPLATE_NOT_FOUND',
          false
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName = user.raw_user_meta_data?.full_name ||
                       user.email?.split('@')[0] ||
                       'Cliente';

      const shippingDate = delivery.updated_at
        ? new Date(delivery.updated_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });

      const estimatedDeliveryDate = delivery.expected_delivery_date
        ? new Date(delivery.expected_delivery_date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : 'A definir';

      const isBonusPiece = subscription.plan_type === 'semestral' && delivery.delivery_number === 6;

      // Parse shipping address
      const shippingAddress = subscription.shipping_address || {};

      const trackingUrl = `https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${trackingCode}`;
      const dashboardUrl = `${window.location.origin}/my-subscriptions`;
      const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@ordax.com.br';

      const templateData = {
        userName,
        shippingDate,
        trackingCode,
        trackingUrl,
        collectionName: collectionData.name,
        characterName: collectionData.character_name || null,
        deliveryNumber: delivery.delivery_number,
        carrier: 'Correios',
        estimatedDeliveryDate,
        isBonusPiece,
        shippingAddress: {
          street: shippingAddress.street || '',
          number: shippingAddress.number || '',
          complement: shippingAddress.complement || '',
          neighborhood: shippingAddress.neighborhood || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          zipCode: shippingAddress.zip_code || ''
        },
        dashboardUrl,
        supportEmail
      };

      // Render template
      const html = template(templateData);

      // Send email
      await this.sendEmail(
        user.email,
        `📦 Seu pedido foi enviado - Código: ${trackingCode}`,
        html,
        'shipping_notification',
        user.id,
        { delivery_id: deliveryId, tracking_code: trackingCode }
      );

      logInfo('Shipping notification email sent successfully', { email: user.email }, 'email');
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send shipping notification email: ${(error as Error).message}`,
        'SHIPPING_NOTIFICATION_FAILED',
        false
      );
    }
  }

  /**
   * Send balance payment reminder email for standalone purchase
   *
   * @param purchaseId - ID of the standalone purchase
   * @param daysRemaining - Number of days remaining until deadline
   * @returns Promise that resolves when email is sent
   * @throws EmailServiceError if sending fails
   */
  async sendBalanceReminder(purchaseId: string, daysRemaining: number): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import('handlebars')).default;

      // Register eq helper for Handlebars
      Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
      });

      // Fetch standalone purchase details with user and collection
      const { data: purchase, error: purchaseError } = await supabase
        .from('standalone_purchases')
        .select(`
          *,
          collection:collection_id (
            id,
            name
          ),
          user:user_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('id', purchaseId)
        .single();

      if (purchaseError || !purchase) {
        throw new EmailServiceError(
          `Failed to fetch standalone purchase: ${purchaseError?.message}`,
          'PURCHASE_NOT_FOUND',
          false
        );
      }

      // Type assertions for nested data
      const user = purchase.user as any;
      const collection = purchase.collection as any;
      const collectionData = collection as any;

      if (!user || !user.email) {
        throw new EmailServiceError(
          'User email not found',
          'USER_EMAIL_NOT_FOUND',
          false
        );
      }

      // Check email preferences
      const shouldSend = await this.checkEmailPreference(user.email, 'payment');
      if (!shouldSend) {
        logDebug('Skipping balance reminder email - user preference disabled', { email: user.email }, 'email');
        return;
      }

      // Load the HTML template
      const templateResponse = await fetch('/src/email-templates/balance-reminder.html');
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          'Failed to load balance-reminder template',
          'TEMPLATE_NOT_FOUND',
          false
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName = user.raw_user_meta_data?.full_name ||
                       user.email?.split('@')[0] ||
                       'Cliente';

      const isUrgent = daysRemaining <= 1;

      const balanceDueDate = purchase.balance_due_date
        ? new Date(purchase.balance_due_date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : 'A definir';

      const paymentUrl = `${window.location.origin}/pay-balance/${purchaseId}`;
      const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@ordax.com.br';

      const templateData = {
        userName,
        isUrgent,
        balanceAmount: purchase.balance_amount.toFixed(2),
        depositAmount: purchase.deposit_amount.toFixed(2),
        totalAmount: purchase.total_amount.toFixed(2),
        balanceDueDate,
        daysRemaining,
        orderId: purchase.id.substring(0, 8).toUpperCase(),
        collectionName: collectionData.name,
        characterName: collectionData.character_name || null,
        paymentUrl,
        supportEmail
      };

      // Render template
      const html = template(templateData);

      // Determine subject based on urgency
      const subject = isUrgent
        ? `🚨 URGENTE: Último dia para pagar o saldo - Pedido #${templateData.orderId}`
        : `💰 Lembrete: Pagamento do saldo - ${daysRemaining} dias restantes`;

      // Send email
      await this.sendEmail(
        user.email, 
        subject, 
        html,
        'balance_reminder',
        user.id,
        { purchase_id: purchaseId, days_remaining: daysRemaining }
      );

      logInfo('Balance reminder email sent successfully', 
        { email: user.email, daysRemaining }, 
        'email');
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send balance reminder email: ${(error as Error).message}`,
        'BALANCE_REMINDER_FAILED',
        false
      );
    }
  }

  /**
   * Send cancellation notice email for standalone purchase
   *
   * @param purchaseId - ID of the standalone purchase
   * @param reason - Reason for cancellation
   * @returns Promise that resolves when email is sent
   * @throws EmailServiceError if sending fails
   */
  async sendCancellationNotice(purchaseId: string, reason: string): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import('handlebars')).default;

      // Fetch standalone purchase details with user and collection
      const { data: purchase, error: purchaseError } = await supabase
        .from('standalone_purchases')
        .select(`
          *,
          collection:collection_id (
            id,
            name
          ),
          user:user_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('id', purchaseId)
        .single();

      if (purchaseError || !purchase) {
        throw new EmailServiceError(
          `Failed to fetch standalone purchase: ${purchaseError?.message}`,
          'PURCHASE_NOT_FOUND',
          false
        );
      }

      // Type assertions for nested data
      const user = purchase.user as any;
      const collection = purchase.collection as any;
      const collectionData = collection as any;

      if (!user || !user.email) {
        throw new EmailServiceError(
          'User email not found',
          'USER_EMAIL_NOT_FOUND',
          false
        );
      }

      // Check email preferences
      const shouldSend = await this.checkEmailPreference(user.email, 'payment');
      if (!shouldSend) {
        logDebug('Skipping cancellation notice email - user preference disabled', { email: user.email }, 'email');
        return;
      }

      // Load the HTML template
      const templateResponse = await fetch('/src/email-templates/cancellation-notice.html');
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          'Failed to load cancellation-notice template',
          'TEMPLATE_NOT_FOUND',
          false
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName = user.raw_user_meta_data?.full_name ||
                       user.email?.split('@')[0] ||
                       'Cliente';

      const cancellationDate = purchase.cancelled_at
        ? new Date(purchase.cancelled_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });

      const purchaseDate = purchase.created_at
        ? new Date(purchase.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : 'Data não disponível';

      const balanceDueDate = purchase.balance_due_date
        ? new Date(purchase.balance_due_date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : 'Data não disponível';

      const shopUrl = `${window.location.origin}/shop`;
      const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@ordax.com.br';

      const templateData = {
        userName,
        orderId: purchase.id.substring(0, 8).toUpperCase(),
        cancellationDate,
        cancellationReason: reason,
        collectionName: collectionData.name,
        characterName: collectionData.character_name || null,
        purchaseDate,
        balanceDueDate,
        depositAmount: purchase.deposit_amount.toFixed(2),
        balanceAmount: purchase.balance_amount.toFixed(2),
        totalAmount: purchase.total_amount.toFixed(2),
        shopUrl,
        supportEmail
      };

      // Render template
      const html = template(templateData);

      // Send email
      await this.sendEmail(
        user.email,
        `❌ Pedido Cancelado - #${templateData.orderId}`,
        html,
        'cancellation_notice',
        user.id,
        { purchase_id: purchaseId, cancellation_reason: reason }
      );

      logInfo('Cancellation notice email sent successfully', { email: user.email }, 'email');
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send cancellation notice email: ${(error as Error).message}`,
        'CANCELLATION_NOTICE_FAILED',
        false
      );
    }
  }

}

// Export singleton instance
export const emailService = new EmailService();
