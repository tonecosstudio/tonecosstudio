/**
 * Email Template Loader
 * 
 * Utility for loading and processing HTML email templates with variable replacement.
 * 
 * Usage:
 * ```typescript
 * const loader = new EmailTemplateLoader();
 * const html = loader.loadTemplate('character-choice-reminder-first', {
 *   userName: 'João Silva',
 *   collectionName: 'Marvel Legends',
 *   deadline: '15/01/2024',
 *   choiceUrl: 'https://example.com/assinatura/123',
 * });
 * ```
 */

import { log } from "@/lib/logger";
import { sanitizeURL } from "@/lib/security/input-sanitizer";
import adminExpirationNoticeTemplate from "./admin-expiration-notice.html?raw";
import reminderFinalTemplate from "./character-choice-reminder-final.html?raw";
import reminderFirstTemplate from "./character-choice-reminder-first.html?raw";
import reminderSecondTemplate from "./character-choice-reminder-second.html?raw";

const TEMPLATE_CONTENT: Record<string, string> = {
  "admin-expiration-notice": adminExpirationNoticeTemplate,
  "character-choice-reminder-final": reminderFinalTemplate,
  "character-choice-reminder-first": reminderFirstTemplate,
  "character-choice-reminder-second": reminderSecondTemplate,
};

const URL_VARIABLES = new Set(["adminUrl", "choiceUrl"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTemplateValue(key: string, value: string | number): string {
  const text = String(value);

  if (URL_VARIABLES.has(key)) {
    return escapeHtml(sanitizeURL(text, ["https"]));
  }

  return escapeHtml(text);
}

export type ReminderType = 'first' | 'second' | 'final';

export interface ReminderTemplateData {
  userName: string;
  collectionName: string;
  deadline: string;
  choiceUrl: string;
}

export interface AdminExpirationTemplateData {
  customerName: string;
  customerEmail: string;
  collectionName: string;
  orderId: string;
  orderType: string;
  deadline: string;
  daysExpired: number;
  adminUrl: string;
}

/**
 * Email template loader and processor
 */
export class EmailTemplateLoader {
  /**
   * Load a template file and replace variables
   */
  public loadTemplate(templateName: string, variables: Record<string, string | number>): string {
    const template = this.getTemplateContent(templateName);
    return this.replaceVariables(template, variables);
  }

  /**
   * Load a character choice reminder template
   */
  public loadReminderTemplate(type: ReminderType, data: ReminderTemplateData): string {
    const templateName = `character-choice-reminder-${type}`;
    return this.loadTemplate(templateName, {
      ...data,
      year: new Date().getFullYear().toString(),
    });
  }

  /**
   * Load the admin expiration notice template
   */
  public loadAdminExpirationTemplate(data: AdminExpirationTemplateData): string {
    return this.loadTemplate('admin-expiration-notice', {
      ...data,
      daysExpired: data.daysExpired.toString(),
      year: new Date().getFullYear().toString(),
    });
  }

  private getTemplateContent(templateName: string): string {
    const template = TEMPLATE_CONTENT[templateName];

    if (!template) {
      throw new Error(`Unknown email template requested: ${templateName}`);
    }

    return template;
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(template: string, variables: Record<string, string | number>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, formatTemplateValue(key, value));
    }
    
    // Check for unreplaced variables (useful for debugging)
    const unreplacedVars = result.match(/{{[^}]+}}/g);
    if (unreplacedVars && unreplacedVars.length > 0) {
      log.warn('Unreplaced template variables found', { unreplacedVars });
    }
    
    return result;
  }

  /**
   * Validate that all required variables are present
   */
  public validateVariables(template: string, variables: Record<string, string | number>): {
    valid: boolean;
    missing: string[];
  } {
    const requiredVars = this.extractVariableNames(template);
    const providedVars = Object.keys(variables);
    const missing = requiredVars.filter(v => !providedVars.includes(v));
    
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Extract variable names from template
   */
  private extractVariableNames(template: string): string[] {
    const matches = template.match(/{{([^}]+)}}/g);
    if (!matches) return [];
    
    return matches.map(match => match.replace(/{{|}}/g, ''));
  }
}

/**
 * Get email subject for reminder type
 */
export function getReminderSubject(type: ReminderType, collectionName: string): string {
  switch (type) {
    case 'first':
      return `Escolha seu Personagem - ${collectionName}`;
    case 'second':
      return `⏰ Lembrete: Escolha seu Personagem - ${collectionName}`;
    case 'final':
      return `🚨 URGENTE: Último Dia para Escolher - ${collectionName}`;
  }
}

/**
 * Get email subject for admin expiration notice
 */
export function getAdminExpirationSubject(collectionName: string): string {
  return `⚠️ Escolha de Personagem Expirada - ${collectionName}`;
}

/**
 * Singleton instance for convenience
 */
export const emailTemplateLoader = new EmailTemplateLoader();
