/**
 * Browser email client.
 *
 * The browser is not an authority for subscription/delivery orchestration. Domain-specific
 * email jobs belong in server-side flows; this module only sends already-authorized email
 * payloads through the authenticated `send-email` Edge Function.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { CONTACT } from "@/config/constants";
import { logInfo, logWarn } from "@/lib/logger";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";

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

class EmailServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "EmailServiceError";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function legacyFlowRetired(flow: string): never {
  throw new EmailServiceError(
    `${flow} is server-side only. Use the canonical notification/Edge Function flow.`,
    "LEGACY_BROWSER_EMAIL_FLOW_RETIRED",
    false,
  );
}

export class EmailService {
  private config: EmailConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): EmailConfig {
    const parsedRetries = Number.parseInt(
      import.meta.env.VITE_EMAIL_MAX_RETRIES || "3",
      10,
    );
    const parsedDelay = Number.parseInt(
      import.meta.env.VITE_EMAIL_RETRY_DELAY || "2000",
      10,
    );

    return {
      provider: "edge-function",
      from: import.meta.env.VITE_EMAIL_FROM || CONTACT.SUPPORT_EMAIL,
      fromName:
        import.meta.env.VITE_EMAIL_FROM_NAME ||
        import.meta.env.VITE_COMPANY_NAME ||
        CONTACT.COMPANY_NAME,
      maxRetries:
        Number.isInteger(parsedRetries) && parsedRetries >= 0 ? parsedRetries : 3,
      retryDelay:
        Number.isFinite(parsedDelay) && parsedDelay > 0 ? parsedDelay : 2000,
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isRetryableError(error: Error): boolean {
    if (error instanceof EmailServiceError) return error.retryable;
    return error.name === "TypeError" || error.message.includes("fetch");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async sendEmailAttempt(
    options: EmailOptions,
    tracking: {
      emailType: string;
      userId?: string;
      metadata: EmailMetadata;
    },
  ): Promise<void> {
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

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    emailType = "other",
    userId?: string,
    metadata: EmailMetadata = {},
  ): Promise<void> {
    const options: EmailOptions = {
      to,
      subject,
      html,
      from: this.config.from,
      fromName: this.config.fromName,
    };

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.config.maxRetries) {
      try {
        await this.sendEmailAttempt(options, { emailType, userId, metadata });
        logInfo(
          "Email sent successfully",
          { to, attempt: attempt + 1 },
          "email",
        );
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt += 1;

        if (!this.isRetryableError(lastError) || attempt > this.config.maxRetries) {
          break;
        }

        const delay = this.config.retryDelay * 2 ** (attempt - 1);
        logWarn(
          `Email send failed (attempt ${attempt}/${this.config.maxRetries + 1}); retrying`,
          { delay, error: lastError.message },
          "email",
        );
        await this.sleep(delay);
      }
    }

    throw new EmailServiceError(
      `Failed to send email after ${attempt} attempts: ${lastError?.message || "unknown error"}`,
      "SEND_FAILED",
      false,
    );
  }

  getConfig(): EmailConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return Boolean(this.config.from && this.config.fromName);
  }

  /**
   * The only remaining domain helper with an active browser caller.
   * `markProductionComplete()` calls this with a standalone purchase id, so resolve exactly
   * that resource instead of pretending it is a subscription delivery.
   */
  async sendProductionStarted(purchaseId: string): Promise<void> {
    if (!UUID_PATTERN.test(purchaseId)) {
      throw new EmailServiceError(
        "Invalid standalone purchase id",
        "PURCHASE_NOT_FOUND",
        false,
      );
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from("standalone_purchases")
      .select("id, user_id, collection_id, status")
      .eq("id", purchaseId)
      .maybeSingle();

    if (purchaseError || !purchase) {
      throw new EmailServiceError(
        `Standalone purchase not found: ${purchaseError?.message || purchaseId}`,
        "PURCHASE_NOT_FOUND",
        false,
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, display_name")
      .eq("id", purchase.user_id)
      .maybeSingle();

    if (profileError || !profile?.email) {
      throw new EmailServiceError(
        `User email not found: ${profileError?.message || purchase.user_id}`,
        "USER_EMAIL_NOT_FOUND",
        false,
      );
    }

    let collectionName = "sua coleção";
    if (purchase.collection_id) {
      const { data: collection, error: collectionError } = await supabase
        .from("collections")
        .select("name")
        .eq("id", purchase.collection_id)
        .maybeSingle();

      if (collectionError) {
        throw new EmailServiceError(
          `Collection lookup failed: ${collectionError.message}`,
          "COLLECTION_NOT_FOUND",
          false,
        );
      }
      if (collection?.name) collectionName = collection.name;
    }

    const userName = profile.full_name || profile.display_name || profile.email.split("@")[0];
    const safeUserName = escapeHtml(userName);
    const safeCollection = escapeHtml(collectionName);
    const dashboardUrl = `${window.location.origin}/my-orders`;

    const html = `
      <p>Olá, ${safeUserName}.</p>
      <p>Há uma atualização de produção para ${safeCollection}.</p>
      <p>Status atual do pedido: <strong>${escapeHtml(purchase.status)}</strong>.</p>
      <p><a href="${escapeHtml(dashboardUrl)}">Acompanhar pedido</a></p>
    `.trim();

    await this.sendEmail(
      profile.email,
      `Atualização de produção do seu pedido ${CONTACT.COMPANY_NAME}`,
      html,
      "production_update",
      purchase.user_id,
      { purchase_id: purchase.id, status: purchase.status },
    );
  }

  // The methods below remain as an explicit compatibility surface for old callers/tests.
  // Their browser-side orchestration was retired because it queried stale domain schemas.
  async sendWelcomeEmail(_subscriptionId: string): Promise<void> {
    legacyFlowRetired("Welcome email orchestration");
  }

  async sendCharacterRevelation(
    _collectionId: string,
    _subscriberEmails: string[],
  ): Promise<void> {
    legacyFlowRetired("Character revelation email orchestration");
  }

  async sendChoiceReminder(
    _deliveryId: string,
    _daysUntilCutoff: number,
  ): Promise<void> {
    legacyFlowRetired("Choice reminder email orchestration");
  }

  async sendShippingNotification(
    _deliveryId: string,
    _trackingCode: string,
  ): Promise<void> {
    legacyFlowRetired("Shipping email orchestration");
  }

  async sendBalanceReminder(
    _purchaseId: string,
    _daysRemaining: number,
  ): Promise<void> {
    legacyFlowRetired("Balance reminder email orchestration");
  }

  async sendCancellationNotice(
    _purchaseId: string,
    _reason: string,
  ): Promise<void> {
    legacyFlowRetired("Cancellation email orchestration");
  }
}

export const emailService = new EmailService();
