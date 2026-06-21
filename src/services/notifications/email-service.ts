/**
 * Email Service
 *
 * Provides email sending functionality with retry logic and error handling.
 * Sends through the Supabase Edge Function `send-email`.
 *
 * Environment Variables Required:
 * - VITE_EMAIL_FROM: Sender email address
 * - VITE_EMAIL_FROM_NAME: Sender name
 *
 * Provider credentials must stay server-side in Supabase function secrets.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { CONTACT } from "@/config/constants";
import { logDebug, logError, logInfo, logWarn } from "@/lib/logger";
import { normalizeAddressBR, type DeliveryAddress } from "@/lib/profile";
import { buildTrackingUrl } from "@/lib/tracking-links";
import { formatDate } from "@/lib/utils";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import {
  notificationPreferencesService,
  EmailType,
} from "./notification-preferences-service";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

interface EmailConfig {
  provider: "edge-function";
  from: string;
  fromName: string;
  maxRetries: number;
  retryDelay: number;
}

type EmailMetadata = Record<string, Json>;

interface EmailUser {
  id: string;
  email: string;
  raw_user_meta_data?: {
    full_name?: string;
  } | null;
}

interface EmailCollection {
  id: string;
  name: string;
  description?: string | null;
  character_name?: string | null;
  character_image_url?: string | null;
  image_url?: string | null;
  revealed?: boolean | null;
}

interface EmailSubscription {
  id?: string;
  plan_type: string | null;
  deliveries_total?: number | null;
  total_paid?: number | null;
}

interface ShippingAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

interface EmailProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  delivery_address: Json | null;
}

interface EmailSubscriptionRow {
  id: string;
  user_id: string;
  collection_id: string | null;
  plan_type: string | null;
  deliveries_total: number | null;
  total_paid: number | null;
}

interface EmailDeliveryRow {
  id: string;
  subscription_id: string;
  delivery_number: number | null;
  delivery_order: number;
  shipping_date: string | null;
  reveal_date: string | null;
  actual_delivery_date: string | null;
  delivered_date: string | null;
  updated_at: string;
  shipping_carrier: string | null;
  tracking_code: string | null;
}

interface EmailStandalonePurchaseRow {
  id: string;
  user_id: string;
  collection_id: string | null;
  amount: number;
  paid_amount: number | null;
  balance_amount: number | null;
  created_at: string;
  updated_at: string;
}

interface EmailDeliveryContext {
  delivery: EmailDeliveryRow;
  subscription: EmailSubscription;
  user: EmailUser;
  collection: EmailCollection | null;
  shippingAddress: ShippingAddress;
}

interface EmailStandalonePurchaseContext {
  purchase: EmailStandalonePurchaseRow;
  user: EmailUser;
  collection: EmailCollection | null;
}

class EmailServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "EmailServiceError";
  }
}

/**
 * Email Service
 * Handles sending emails with retry logic and error handling
 */
export class EmailService {
  private config: EmailConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load email configuration from environment variables
   */
  private loadConfig(): EmailConfig {
    const from = import.meta.env.VITE_EMAIL_FROM || CONTACT.SUPPORT_EMAIL;
    const fromName =
      import.meta.env.VITE_EMAIL_FROM_NAME ||
      import.meta.env.VITE_COMPANY_NAME ||
      "ORDAX";
    const maxRetries = parseInt(
      import.meta.env.VITE_EMAIL_MAX_RETRIES || "3",
      10,
    );
    const retryDelay = parseInt(
      import.meta.env.VITE_EMAIL_RETRY_DELAY || "2000",
      10,
    );

    return {
      provider: "edge-function",
      from,
      fromName,
      maxRetries,
      retryDelay,
    };
  }

  private toEmailUser(profile: EmailProfileRow): EmailUser {
    return {
      id: profile.id,
      email: profile.email ?? "",
      raw_user_meta_data: {
        full_name: profile.full_name ?? profile.display_name ?? undefined,
      },
    };
  }

  private toShippingAddress(profile: EmailProfileRow): ShippingAddress {
    const normalized = normalizeAddressBR(
      profile.delivery_address as DeliveryAddress | null,
    );

    return {
      street: normalized?.rua,
      number: normalized?.numero,
      complement: normalized?.complemento,
      neighborhood: normalized?.bairro,
      city: normalized?.cidade,
      state: normalized?.uf,
      zip_code: normalized?.cep,
    };
  }

  private getDeliveryReferenceDate(delivery: EmailDeliveryRow): string | null {
    return (
      delivery.shipping_date ??
      delivery.reveal_date ??
      delivery.actual_delivery_date ??
      delivery.delivered_date
    );
  }

  private formatMonthYear(date: string | null): string {
    return date
      ? formatDate(date, {
          month: "long",
          year: "numeric",
        })
      : "A definir";
  }

  private formatLongDate(date: string | null): string {
    return date
      ? formatDate(date, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "A definir";
  }

  private formatDateAfterDays(days: number): string {
    if (!Number.isFinite(days)) return "A definir";

    const date = new Date();
    date.setDate(date.getDate() + Math.max(0, Math.ceil(days)));
    return this.formatLongDate(date.toISOString());
  }

  private getDeliveryNumber(delivery: EmailDeliveryRow): number {
    return delivery.delivery_number ?? delivery.delivery_order;
  }

  private getStandalonePurchaseAmounts(purchase: EmailStandalonePurchaseRow): {
    balanceAmount: number;
    depositAmount: number;
    totalAmount: number;
  } {
    const totalAmount = purchase.amount;
    const balanceAmount = purchase.balance_amount ?? 0;
    const depositAmount =
      purchase.paid_amount ?? Math.max(totalAmount - balanceAmount, 0);

    return {
      balanceAmount,
      depositAmount,
      totalAmount,
    };
  }

  private async fetchProfileById(userId: string): Promise<EmailProfileRow> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, display_name, delivery_address")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new EmailServiceError(
        `Failed to fetch profile: ${error?.message}`,
        "USER_EMAIL_NOT_FOUND",
        false,
      );
    }

    return data as EmailProfileRow;
  }

  private async fetchProfileByEmail(
    email: string,
  ): Promise<EmailProfileRow | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, display_name, delivery_address")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new EmailServiceError(
        `Failed to fetch profile: ${error.message}`,
        "USER_EMAIL_NOT_FOUND",
        false,
      );
    }

    return data as EmailProfileRow | null;
  }

  private async fetchCollectionById(
    collectionId: string | null,
  ): Promise<EmailCollection | null> {
    if (!collectionId) return null;

    const { data, error } = await supabase
      .from("collections")
      .select("id, name, description, cover_image_url")
      .eq("id", collectionId)
      .maybeSingle();

    if (error) {
      throw new EmailServiceError(
        `Failed to fetch collection: ${error.message}`,
        "COLLECTION_NOT_FOUND",
        false,
      );
    }

    return data
      ? {
          id: data.id,
          name: data.name,
          description: data.description,
          image_url: data.cover_image_url,
        }
      : null;
  }

  private async fetchSubscriptionEmailContext(
    subscriptionId: string,
  ): Promise<Omit<EmailDeliveryContext, "delivery">> {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, collection_id, plan_type, deliveries_total, total_paid",
      )
      .eq("id", subscriptionId)
      .single();

    if (error || !subscription) {
      throw new EmailServiceError(
        `Failed to fetch subscription: ${error?.message}`,
        "SUBSCRIPTION_NOT_FOUND",
        false,
      );
    }

    const subscriptionRow = subscription as EmailSubscriptionRow;
    const profile = await this.fetchProfileById(subscriptionRow.user_id);
    const collection = await this.fetchCollectionById(
      subscriptionRow.collection_id,
    );

    return {
      subscription: {
        id: subscriptionRow.id,
        plan_type: subscriptionRow.plan_type,
        deliveries_total: subscriptionRow.deliveries_total,
        total_paid: subscriptionRow.total_paid,
      },
      user: this.toEmailUser(profile),
      collection,
      shippingAddress: this.toShippingAddress(profile),
    };
  }

  private async fetchDeliveryEmailContext(
    deliveryId: string,
  ): Promise<EmailDeliveryContext> {
    const { data: delivery, error } = await supabase
      .from("subscription_deliveries")
      .select(
        "id, subscription_id, delivery_number, delivery_order, shipping_date, reveal_date, actual_delivery_date, delivered_date, updated_at, shipping_carrier, tracking_code",
      )
      .eq("id", deliveryId)
      .single();

    if (error || !delivery) {
      throw new EmailServiceError(
        `Failed to fetch delivery: ${error?.message}`,
        "DELIVERY_NOT_FOUND",
        false,
      );
    }

    const deliveryRow = delivery as EmailDeliveryRow;
    const context = await this.fetchSubscriptionEmailContext(
      deliveryRow.subscription_id,
    );

    return {
      delivery: deliveryRow,
      ...context,
    };
  }

  private async fetchStandalonePurchaseEmailContext(
    purchaseId: string,
  ): Promise<EmailStandalonePurchaseContext> {
    const { data: purchase, error } = await supabase
      .from("standalone_purchases")
      .select(
        "id, user_id, collection_id, amount, paid_amount, balance_amount, created_at, updated_at",
      )
      .eq("id", purchaseId)
      .single();

    if (error || !purchase) {
      throw new EmailServiceError(
        `Failed to fetch standalone purchase: ${error?.message}`,
        "PURCHASE_NOT_FOUND",
        false,
      );
    }

    const purchaseRow = purchase as EmailStandalonePurchaseRow;
    const profile = await this.fetchProfileById(purchaseRow.user_id);
    const collection = await this.fetchCollectionById(
      purchaseRow.collection_id,
    );

    return {
      purchase: purchaseRow,
      user: this.toEmailUser(profile),
      collection,
    };
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
    emailType: string = "other",
    userId?: string,
    metadata?: EmailMetadata,
  ): Promise<void> {
    const options: EmailOptions = {
      to,
      subject,
      html,
      from: this.config.from,
      fromName: this.config.fromName,
    };

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.config.maxRetries) {
      try {
        await this.sendEmailAttempt(options, {
          emailType,
          userId,
          metadata: metadata || {},
        });
        logInfo(
          "Email sent successfully",
          { to, attempt: attempt + 1 },
          "email",
        );

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
          "email",
        );
        await this.sleep(delay);
      }
    }

    throw new EmailServiceError(
      `Failed to send email after ${attempt} attempts: ${lastError?.message}`,
      "SEND_FAILED",
      false,
    );
  }

  /**
   * Attempt to send email using configured provider
   */
  private async sendEmailAttempt(
    options: EmailOptions,
    tracking: {
      emailType: string;
      userId?: string;
      metadata: EmailMetadata;
    },
  ): Promise<void> {
    // Validate email address
    if (!this.isValidEmail(options.to)) {
      throw new EmailServiceError(
        `Invalid email address: ${options.to}`,
        "INVALID_EMAIL",
        false,
      );
    }

    try {
      await callAuthenticatedEdgeFunction(
        "send-email",
        {
          to: options.to,
          subject: options.subject,
          html: options.html,
          from: options.from || this.config.from,
          fromName: options.fromName || this.config.fromName,
          emailType: tracking.emailType,
          userId: tracking.userId,
          metadata: tracking.metadata,
        },
        "Email function failed",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = error instanceof TypeError || message.includes("fetch");
      throw new EmailServiceError(
        `Email function failed: ${message}`,
        "EMAIL_FUNCTION_FAILED",
        retryable,
      );
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof EmailServiceError) {
      return error.retryable;
    }

    // Network errors are generally retryable
    if (error.name === "TypeError" || error.message.includes("fetch")) {
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if user wants to receive a specific email type
   *
   * @param userId - User ID
   * @param emailType - Type of email
   * @returns True if email should be sent
   */
  private async checkEmailPreference(
    userId: string,
    emailType: EmailType,
  ): Promise<boolean> {
    try {
      return await notificationPreferencesService.shouldSendEmail(
        userId,
        emailType,
      );
    } catch (error) {
      logWarn(
        `Failed to check email preference for user ${userId}`,
        error,
        "email",
      );
      return false;
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
    return true;
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
      const Handlebars = (await import("handlebars")).default;
      const { welcomeTemplate } =
        await import("@/email-templates/welcome-template");

      const { subscription, user } =
        await this.fetchSubscriptionEmailContext(subscriptionId);

      if (!user || !user.email) {
        throw new EmailServiceError(
          "User email not found",
          "USER_EMAIL_NOT_FOUND",
          false,
        );
      }

      // Check if user wants to receive welcome emails
      const shouldSend = await this.checkEmailPreference(user.id, "welcome");
      if (!shouldSend) {
        logDebug(
          "User disabled welcome emails, skipping",
          { email: user.email },
          "email",
        );
        return;
      }

      // Fetch deliveries for this subscription
      const { data: deliveries, error: delError } = await supabase
        .from("subscription_deliveries")
        .select(
          "id, subscription_id, delivery_number, delivery_order, shipping_date, reveal_date, actual_delivery_date, delivered_date, updated_at, shipping_carrier, tracking_code",
        )
        .eq("subscription_id", subscriptionId)
        .order("delivery_number", { ascending: true });

      if (delError) {
        throw new EmailServiceError(
          `Failed to fetch deliveries: ${delError.message}`,
          "DELIVERIES_NOT_FOUND",
          false,
        );
      }

      // Compile template
      const template = Handlebars.compile(welcomeTemplate);

      // Prepare template data
      const userName =
        user.raw_user_meta_data?.full_name ||
        user.email?.split("@")[0] ||
        "Cliente";

      const planTypeMap: Record<string, string> = {
        trimestral: "Trimestral (3 entregas)",
        semestral: "Semestral (6 entregas)",
        anual: "Anual (12 entregas)",
      };

      const deliveryData = ((deliveries ?? []) as EmailDeliveryRow[]).map(
        (delivery) => {
          const expectedDate = this.formatMonthYear(
            this.getDeliveryReferenceDate(delivery),
          );

          return {
            deliveryNumber: delivery.delivery_number ?? delivery.delivery_order,
            expectedDate,
            isBonusPiece:
              subscription.plan_type === "semestral" &&
              (delivery.delivery_number ?? delivery.delivery_order) === 6,
          };
        },
      );

      const dashboardUrl = `${window.location.origin}/my-subscriptions`;
      const supportEmail = CONTACT.SUPPORT_EMAIL;

      const templateData = {
        userName,
        planType: subscription.plan_type
          ? planTypeMap[subscription.plan_type] || subscription.plan_type
          : "Plano não informado",
        deliveriesTotal: subscription.deliveries_total ?? deliveryData.length,
        totalPaid: (subscription.total_paid ?? 0).toFixed(2),
        deliveries: deliveryData,
        dashboardUrl,
        supportEmail,
      };

      // Render template
      const html = template(templateData);

      // Send email
      await this.sendEmail(
        user.email,
        "Bem-vindo ao ORDAX - Sua assinatura foi confirmada! 🎉",
        html,
        "welcome",
        user.id,
        { subscription_id: subscriptionId },
      );

      logInfo(
        "Welcome email sent successfully",
        { email: user.email },
        "email",
      );
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send welcome email: ${(error as Error).message}`,
        "WELCOME_EMAIL_FAILED",
        false,
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
  async sendCharacterRevelation(
    collectionId: string,
    subscriberEmails: string[],
  ): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import("handlebars")).default;

      // Fetch collection details with character information
      const { data: collection, error: collectionError } = await supabase
        .from("collections")
        .select("*")
        .eq("id", collectionId)
        .single();

      if (collectionError || !collection) {
        throw new EmailServiceError(
          `Failed to fetch collection: ${collectionError?.message}`,
          "COLLECTION_NOT_FOUND",
          false,
        );
      }

      // Type assertion for collection with character fields
      const collectionData = collection as unknown as EmailCollection;

      // Verify collection has been revealed
      if (!collectionData.revealed || !collectionData.character_name) {
        throw new EmailServiceError(
          "Collection character has not been revealed yet",
          "CHARACTER_NOT_REVEALED",
          false,
        );
      }

      // Load the HTML template
      const templateResponse = await fetch(
        "/src/email-templates/character-revelation.html",
      );
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          "Failed to load character-revelation template",
          "TEMPLATE_NOT_FOUND",
          false,
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      const supportEmail = CONTACT.SUPPORT_EMAIL;
      const dashboardUrl = `${window.location.origin}/my-subscriptions`;

      // Send email to each subscriber
      const emailPromises = subscriberEmails.map(async (email) => {
        try {
          const profile = await this.fetchProfileByEmail(email);

          if (!profile) {
            logWarn(
              "Skipping character revelation email - profile not found",
              { email },
              "email",
            );
            return;
          }

          // Check email preferences first
          const shouldSend = await this.checkEmailPreference(
            profile.id,
            "revelation",
          );
          if (!shouldSend) {
            logDebug(
              "Skipping character revelation email - user preference disabled",
              { email },
              "email",
            );
            return;
          }

          const recipientEmail = profile.email ?? email;

          const userName =
            profile?.full_name ||
            profile?.display_name ||
            recipientEmail.split("@")[0] ||
            "Cliente";

          const { data: subscription, error: subscriptionError } =
            await supabase
              .from("subscriptions")
              .select("id")
              .eq("user_id", profile.id)
              .eq("collection_id", collectionId)
              .maybeSingle();

          if (subscriptionError) {
            throw new EmailServiceError(
              `Failed to fetch subscription: ${subscriptionError.message}`,
              "SUBSCRIPTION_NOT_FOUND",
              false,
            );
          }

          let deliveryRow: EmailDeliveryRow | null = null;

          if (subscription) {
            const { data: delivery, error: deliveryError } = await supabase
              .from("subscription_deliveries")
              .select(
                "id, subscription_id, delivery_number, delivery_order, shipping_date, reveal_date, actual_delivery_date, delivered_date, updated_at, shipping_carrier, tracking_code",
              )
              .eq("subscription_id", subscription.id)
              .order("delivery_order", { ascending: true })
              .limit(1)
              .maybeSingle();

            if (deliveryError) {
              throw new EmailServiceError(
                `Failed to fetch delivery: ${deliveryError.message}`,
                "DELIVERY_NOT_FOUND",
                false,
              );
            }

            deliveryRow = delivery as EmailDeliveryRow | null;
          }

          const deliveryNumber = deliveryRow
            ? this.getDeliveryNumber(deliveryRow)
            : 1;
          const expectedShippingDate = deliveryRow
            ? this.formatMonthYear(this.getDeliveryReferenceDate(deliveryRow))
            : "A definir";

          // Prepare template data
          const templateData = {
            userName,
            collectionName: collectionData.name,
            characterName: collectionData.character_name,
            characterImageUrl:
              collectionData.character_image_url || collectionData.image_url,
            characterDescription: collectionData.description,
            deliveryNumber,
            expectedShippingDate,
            dashboardUrl,
            supportEmail,
          };

          // Render template
          const html = template(templateData);

          // Send email
          await this.sendEmail(
            recipientEmail,
            `✨ Revelação: ${collectionData.character_name} - ${collectionData.name}`,
            html,
            "character_revelation",
            profile.id,
            { collection_id: collectionId, delivery_number: deliveryNumber },
          );

          logInfo(
            "Character revelation email sent successfully",
            { email: recipientEmail },
            "email",
          );
        } catch (error) {
          logError(
            "Failed to send character revelation email",
            { email, error },
            "email",
          );
          // Continue with other emails even if one fails
        }
      });

      // Wait for all emails to be sent
      await Promise.all(emailPromises);

      logInfo(
        "Character revelation emails sent",
        { count: subscriberEmails.length },
        "email",
      );
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send character revelation emails: ${(error as Error).message}`,
        "CHARACTER_REVELATION_FAILED",
        false,
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
  async sendChoiceReminder(
    deliveryId: string,
    daysUntilCutoff: number,
  ): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import("handlebars")).default;

      // Register eq helper for Handlebars
      Handlebars.registerHelper("eq", function (a, b) {
        return a === b;
      });

      const { delivery, user, collection } =
        await this.fetchDeliveryEmailContext(deliveryId);

      if (!user || !user.email) {
        throw new EmailServiceError(
          "User email not found",
          "USER_EMAIL_NOT_FOUND",
          false,
        );
      }

      const shouldSend = await this.checkEmailPreference(user.id, "reminder");
      if (!shouldSend) {
        logDebug(
          "Skipping choice reminder email - user preference disabled",
          { email: user.email },
          "email",
        );
        return;
      }

      // Load the HTML template
      const templateResponse = await fetch(
        "/src/email-templates/choice-reminder.html",
      );
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          "Failed to load choice-reminder template",
          "TEMPLATE_NOT_FOUND",
          false,
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName =
        user.raw_user_meta_data?.full_name ||
        user.email?.split("@")[0] ||
        "Cliente";

      const isUrgent = daysUntilCutoff <= 3;

      const deliveryNumber = this.getDeliveryNumber(delivery);
      const expectedShippingDate = this.formatMonthYear(
        this.getDeliveryReferenceDate(delivery),
      );
      const currentCollection = collection?.name ?? null;

      const collectionSelectionUrl = `${window.location.origin}/my-subscriptions`;
      const supportEmail = CONTACT.SUPPORT_EMAIL;

      const templateData = {
        userName,
        isUrgent,
        daysUntilCutoff,
        deliveryNumber,
        expectedShippingDate,
        currentCollection,
        collectionSelectionUrl,
        supportEmail,
      };

      // Render template
      const html = template(templateData);

      // Determine subject based on urgency
      const subject = isUrgent
        ? `⚠️ URGENTE: ${daysUntilCutoff} ${daysUntilCutoff === 1 ? "dia" : "dias"} para escolher sua coleção!`
        : `📦 Escolha sua coleção ORDAX - ${daysUntilCutoff} dias restantes`;

      // Send email
      await this.sendEmail(
        user.email,
        subject,
        html,
        "choice_reminder",
        user.id,
        {
          delivery_id: deliveryId,
          days_until_cutoff: daysUntilCutoff,
          collection_id: collection?.id ?? null,
        },
      );

      logInfo(
        "Choice reminder email sent successfully",
        { email: user.email, daysUntilCutoff },
        "email",
      );
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send choice reminder email: ${(error as Error).message}`,
        "CHOICE_REMINDER_FAILED",
        false,
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
      const Handlebars = (await import("handlebars")).default;

      const {
        delivery,
        subscription,
        user,
        collection: collectionData,
      } = await this.fetchDeliveryEmailContext(deliveryId);

      if (!user || !user.email) {
        throw new EmailServiceError(
          "User email not found",
          "USER_EMAIL_NOT_FOUND",
          false,
        );
      }

      if (!collectionData?.name) {
        throw new EmailServiceError(
          "Collection not found",
          "COLLECTION_NOT_FOUND",
          false,
        );
      }

      // Check email preferences
      const shouldSend = await this.checkEmailPreference(user.id, "shipping");
      if (!shouldSend) {
        logDebug(
          `Skipping production started email - user preference disabled`,
          { email: user.email },
          "email",
        );
        return;
      }

      // Load the HTML template
      const templateResponse = await fetch(
        "/src/email-templates/production-started.html",
      );
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          "Failed to load production-started template",
          "TEMPLATE_NOT_FOUND",
          false,
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName =
        user.raw_user_meta_data?.full_name ||
        user.email?.split("@")[0] ||
        "Cliente";

      const deliveryNumber = this.getDeliveryNumber(delivery);
      const expectedShippingDate = this.formatMonthYear(
        this.getDeliveryReferenceDate(delivery),
      );

      const isBonusPiece =
        subscription.plan_type === "semestral" && deliveryNumber === 6;

      const trackingUrl = `${window.location.origin}/my-subscriptions`;
      const supportEmail = CONTACT.SUPPORT_EMAIL;

      const templateData = {
        userName,
        collectionName: collectionData.name,
        characterName: collectionData?.character_name || null,
        deliveryNumber,
        expectedShippingDate,
        isBonusPiece,
        trackingUrl,
        supportEmail,
      };

      // Render template
      const html = template(templateData);

      // Send email
      await this.sendEmail(
        user.email,
        `🎨 Sua peça entrou em produção - ${collectionData.name}`,
        html,
        "production_started",
        user.id,
        { delivery_id: deliveryId, collection_id: collectionData.id },
      );

      logInfo(
        "Production started email sent successfully",
        { email: user.email },
        "email",
      );
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send production started email: ${(error as Error).message}`,
        "PRODUCTION_STARTED_FAILED",
        false,
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
  async sendShippingNotification(
    deliveryId: string,
    trackingCode: string,
  ): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import("handlebars")).default;

      const {
        delivery,
        subscription,
        user,
        collection: collectionData,
        shippingAddress,
      } = await this.fetchDeliveryEmailContext(deliveryId);

      if (!user || !user.email) {
        throw new EmailServiceError(
          "User email not found",
          "USER_EMAIL_NOT_FOUND",
          false,
        );
      }

      if (!collectionData?.name) {
        throw new EmailServiceError(
          "Collection not found",
          "COLLECTION_NOT_FOUND",
          false,
        );
      }

      // Check email preferences
      const shouldSend = await this.checkEmailPreference(user.id, "shipping");
      if (!shouldSend) {
        logDebug(
          `Skipping shipping notification email - user preference disabled`,
          { email: user.email },
          "email",
        );
        return;
      }

      // Load the HTML template
      const templateResponse = await fetch(
        "/src/email-templates/shipping-notification.html",
      );
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          "Failed to load shipping-notification template",
          "TEMPLATE_NOT_FOUND",
          false,
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName =
        user.raw_user_meta_data?.full_name ||
        user.email?.split("@")[0] ||
        "Cliente";

      const shippingDate = delivery.updated_at
        ? formatDate(delivery.updated_at, {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        : formatDate(new Date(), {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });

      const deliveryNumber = this.getDeliveryNumber(delivery);
      const estimatedDeliveryDate = this.formatLongDate(
        this.getDeliveryReferenceDate(delivery),
      );
      const isBonusPiece =
        subscription.plan_type === "semestral" && deliveryNumber === 6;

      const trackingUrl =
        buildTrackingUrl(trackingCode, delivery.shipping_carrier) || "";
      const dashboardUrl = `${window.location.origin}/my-subscriptions`;
      const supportEmail = CONTACT.SUPPORT_EMAIL;

      const templateData = {
        userName,
        shippingDate,
        trackingCode,
        trackingUrl,
        collectionName: collectionData.name,
        characterName: collectionData?.character_name || null,
        deliveryNumber,
        carrier: delivery.shipping_carrier || "Transportadora",
        estimatedDeliveryDate,
        isBonusPiece,
        shippingAddress: {
          street: shippingAddress.street || "",
          number: shippingAddress.number || "",
          complement: shippingAddress.complement || "",
          neighborhood: shippingAddress.neighborhood || "",
          city: shippingAddress.city || "",
          state: shippingAddress.state || "",
          zipCode: shippingAddress.zip_code || "",
        },
        dashboardUrl,
        supportEmail,
      };

      // Render template
      const html = template(templateData);

      // Send email
      await this.sendEmail(
        user.email,
        `📦 Seu pedido foi enviado - Código: ${trackingCode}`,
        html,
        "shipping_notification",
        user.id,
        { delivery_id: deliveryId, tracking_code: trackingCode },
      );

      logInfo(
        "Shipping notification email sent successfully",
        { email: user.email },
        "email",
      );
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send shipping notification email: ${(error as Error).message}`,
        "SHIPPING_NOTIFICATION_FAILED",
        false,
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
  async sendBalanceReminder(
    purchaseId: string,
    daysRemaining: number,
  ): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import("handlebars")).default;

      // Register eq helper for Handlebars
      Handlebars.registerHelper("eq", function (a, b) {
        return a === b;
      });

      const {
        purchase,
        user,
        collection: collectionData,
      } = await this.fetchStandalonePurchaseEmailContext(purchaseId);

      if (!user || !user.email) {
        throw new EmailServiceError(
          "User email not found",
          "USER_EMAIL_NOT_FOUND",
          false,
        );
      }

      if (!collectionData?.name) {
        throw new EmailServiceError(
          "Collection not found",
          "COLLECTION_NOT_FOUND",
          false,
        );
      }

      // Check email preferences
      const shouldSend = await this.checkEmailPreference(user.id, "payment");
      if (!shouldSend) {
        logDebug(
          "Skipping balance reminder email - user preference disabled",
          { email: user.email },
          "email",
        );
        return;
      }

      // Load the HTML template
      const templateResponse = await fetch(
        "/src/email-templates/balance-reminder.html",
      );
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          "Failed to load balance-reminder template",
          "TEMPLATE_NOT_FOUND",
          false,
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName =
        user.raw_user_meta_data?.full_name ||
        user.email?.split("@")[0] ||
        "Cliente";

      const isUrgent = daysRemaining <= 1;

      const balanceDueDate = this.formatDateAfterDays(daysRemaining);
      const { balanceAmount, depositAmount, totalAmount } =
        this.getStandalonePurchaseAmounts(purchase);

      const paymentUrl = `${window.location.origin}/pay-balance/${purchaseId}`;
      const supportEmail = CONTACT.SUPPORT_EMAIL;

      const templateData = {
        userName,
        isUrgent,
        balanceAmount: balanceAmount.toFixed(2),
        depositAmount: depositAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        balanceDueDate,
        daysRemaining,
        orderId: purchase.id.substring(0, 8).toUpperCase(),
        collectionName: collectionData.name,
        characterName: collectionData?.character_name || null,
        paymentUrl,
        supportEmail,
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
        "balance_reminder",
        user.id,
        { purchase_id: purchaseId, days_remaining: daysRemaining },
      );

      logInfo(
        "Balance reminder email sent successfully",
        { email: user.email, daysRemaining },
        "email",
      );
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send balance reminder email: ${(error as Error).message}`,
        "BALANCE_REMINDER_FAILED",
        false,
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
  async sendCancellationNotice(
    purchaseId: string,
    reason: string,
  ): Promise<void> {
    try {
      // Import Handlebars dynamically
      const Handlebars = (await import("handlebars")).default;

      const {
        purchase,
        user,
        collection: collectionData,
      } = await this.fetchStandalonePurchaseEmailContext(purchaseId);

      if (!user || !user.email) {
        throw new EmailServiceError(
          "User email not found",
          "USER_EMAIL_NOT_FOUND",
          false,
        );
      }

      if (!collectionData?.name) {
        throw new EmailServiceError(
          "Collection not found",
          "COLLECTION_NOT_FOUND",
          false,
        );
      }

      // Check email preferences
      const shouldSend = await this.checkEmailPreference(user.id, "payment");
      if (!shouldSend) {
        logDebug(
          "Skipping cancellation notice email - user preference disabled",
          { email: user.email },
          "email",
        );
        return;
      }

      // Load the HTML template
      const templateResponse = await fetch(
        "/src/email-templates/cancellation-notice.html",
      );
      if (!templateResponse.ok) {
        throw new EmailServiceError(
          "Failed to load cancellation-notice template",
          "TEMPLATE_NOT_FOUND",
          false,
        );
      }
      const templateHtml = await templateResponse.text();

      // Compile template
      const template = Handlebars.compile(templateHtml);

      // Prepare template data
      const userName =
        user.raw_user_meta_data?.full_name ||
        user.email?.split("@")[0] ||
        "Cliente";

      const cancellationDate = this.formatLongDate(purchase.updated_at);
      const purchaseDate = this.formatLongDate(purchase.created_at);
      const balanceDueDate = "Data não disponível";
      const { balanceAmount, depositAmount, totalAmount } =
        this.getStandalonePurchaseAmounts(purchase);

      const shopUrl = `${window.location.origin}/shop`;
      const supportEmail = CONTACT.SUPPORT_EMAIL;

      const templateData = {
        userName,
        orderId: purchase.id.substring(0, 8).toUpperCase(),
        cancellationDate,
        cancellationReason: reason,
        collectionName: collectionData.name,
        characterName: collectionData?.character_name || null,
        purchaseDate,
        balanceDueDate,
        depositAmount: depositAmount.toFixed(2),
        balanceAmount: balanceAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        shopUrl,
        supportEmail,
      };

      // Render template
      const html = template(templateData);

      // Send email
      await this.sendEmail(
        user.email,
        `❌ Pedido Cancelado - #${templateData.orderId}`,
        html,
        "cancellation_notice",
        user.id,
        { purchase_id: purchaseId, cancellation_reason: reason },
      );

      logInfo(
        "Cancellation notice email sent successfully",
        { email: user.email },
        "email",
      );
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }
      throw new EmailServiceError(
        `Failed to send cancellation notice email: ${(error as Error).message}`,
        "CANCELLATION_NOTICE_FAILED",
        false,
      );
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
