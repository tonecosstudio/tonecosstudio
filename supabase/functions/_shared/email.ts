import { getPublicBaseUrl } from "./public-url.ts";

export type EmailProvider = "resend" | "sendgrid";

export interface EmailServiceConfig {
  provider: EmailProvider;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  baseUrl: string;
}

export interface EmailConfigOverrides {
  baseUrl?: string;
  baseUrlEnvNames?: string[];
  from?: string;
  fromName?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

const SUPPORTED_EMAIL_PROVIDERS = new Set<EmailProvider>(["resend", "sendgrid"]);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function textToHtml(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export function sanitizeEmailSubject(value: string): string {
  let subject = "";

  for (const char of value.replace(/\r?\n/g, " ")) {
    const code = char.charCodeAt(0);
    if (code >= 32 && code !== 127) subject += char;
  }

  return subject.trim().slice(0, 200);
}

export function getEmailConfig(overrides?: EmailConfigOverrides): EmailServiceConfig {
  const provider = (Deno.env.get("EMAIL_PROVIDER") || "resend").toLowerCase() as EmailProvider;
  if (!SUPPORTED_EMAIL_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }

  const apiKey = Deno.env.get("EMAIL_API_KEY");
  if (!apiKey) {
    throw new Error("EMAIL_API_KEY not configured");
  }

  const fromEmail = overrides?.from || Deno.env.get("EMAIL_FROM");
  if (!fromEmail) {
    throw new Error("EMAIL_FROM is not configured");
  }

  return {
    provider,
    apiKey,
    fromEmail,
    fromName: overrides?.fromName || Deno.env.get("EMAIL_FROM_NAME") || "Ordax",
    baseUrl: overrides?.baseUrl || getPublicBaseUrl(overrides?.baseUrlEnvNames),
  };
}

export class EmailService {
  constructor(private readonly config: EmailServiceConfig) {}

  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    if (!isValidEmail(params.to)) {
      throw new Error(`Invalid email address: ${params.to}`);
    }

    if (this.config.provider === "resend") {
      return this.sendViaResend(params);
    }

    return this.sendViaSendGrid(params);
  }

  private async sendViaResend(params: SendEmailParams): Promise<{ id: string }> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    return { id: data.id || "unknown" };
  }

  private async sendViaSendGrid(params: SendEmailParams): Promise<{ id: string }> {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: params.subject,
        content: [{ type: "text/html", value: params.html }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    return { id: response.headers.get("x-message-id") || "unknown" };
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
