/**
 * Shared Input Validation Utilities for Edge Functions
 *
 * Provides strict schema validation, field whitelisting, numeric range checks,
 * string length limits, UUID/URL validation, and content sanitization.
 *
 * Uses no external deps — pure Deno/TS.
 */

import { corsHeaders } from "./cors.ts";

// ─── UUID / URL helpers ────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_RE = /^https?:\/\/.{1,2048}$/i;

export function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function isURL(v: unknown): v is string {
  return typeof v === "string" && URL_RE.test(v);
}

// ─── Sanitisation ──────────────────────────────────────────────────

/** Strip HTML tags and trim — use for any user-supplied plain-text field. */
export function sanitizeString(v: unknown, maxLen = 1000): string {
  if (typeof v !== "string") return "";
  return v
    .replace(/<[^>]*>/g, "") // strip HTML
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 || code === 9 || code === 10 || code === 13;
    })
    .join("")
    .trim()
    .slice(0, maxLen);
}

/** Escape for safe embedding (e.g. in SQL strings passed to rpc). */
export function escapeSQL(v: string): string {
  return v.replace(/'/g, "''");
}

// ─── Schema definition types ──────────────────────────────────────

type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "uuid"
  | "url"
  | "array"
  | "object";

interface FieldDef {
  type: FieldType;
  required?: boolean;
  maxLength?: number; // strings
  minLength?: number; // strings
  trim?: boolean; // strings
  rejectHtml?: boolean; // strings
  min?: number; // numbers
  max?: number; // numbers
  minItems?: number; // arrays
  maxItems?: number; // arrays
  uniqueItems?: boolean; // arrays
  itemType?: FieldType; // array item type
  sanitize?: boolean; // auto-sanitize string (default false)
}

export type Schema = Record<string, FieldDef>;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: Record<string, unknown>;
}

// ─── Validator ─────────────────────────────────────────────────────

/**
 * Validate and sanitize a request body against a strict schema.
 *
 * - Rejects unknown fields
 * - Enforces type, length, range constraints
 * - Auto-strips HTML from string fields when `sanitize: true`
 */
export function validateBody(body: unknown, schema: Schema): ValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      valid: false,
      errors: ["Request body must be a JSON object"],
      sanitized: {},
    };
  }

  const obj = body as Record<string, unknown>;

  // Reject unknown fields
  const allowedKeys = new Set(Object.keys(schema));
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown field: '${key}'`);
    }
  }

  // Validate each field
  for (const [key, def] of Object.entries(schema)) {
    const value = obj[key];

    // Required check
    if (
      def.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`'${key}' is required`);
      continue;
    }

    // Skip optional missing fields
    if (value === undefined || value === null) {
      continue;
    }

    // Type checks
    switch (def.type) {
      case "uuid":
        if (!isUUID(value)) {
          errors.push(`'${key}' must be a valid UUID`);
        } else {
          sanitized[key] = value;
        }
        break;

      case "url":
        if (!isURL(value)) {
          errors.push(`'${key}' must be a valid HTTP(S) URL (max 2048 chars)`);
        } else {
          sanitized[key] = (value as string).slice(0, 2048);
        }
        break;

      case "string": {
        if (typeof value !== "string") {
          errors.push(`'${key}' must be a string`);
          break;
        }
        let str = value;
        if (def.trim) {
          str = str.trim();
        }
        if (def.rejectHtml && /<[^>]*>/g.test(str)) {
          errors.push(`'${key}' cannot contain HTML tags`);
          break;
        }
        if (def.sanitize) {
          str = sanitizeString(str, def.maxLength ?? 1000);
        }
        if (def.maxLength && str.length > def.maxLength) {
          errors.push(`'${key}' exceeds max length of ${def.maxLength}`);
          break;
        }
        if (def.minLength && str.length < def.minLength) {
          errors.push(`'${key}' must be at least ${def.minLength} characters`);
          break;
        }
        sanitized[key] = str;
        break;
      }

      case "number": {
        const num = typeof value === "number" ? value : Number(value);
        if (isNaN(num)) {
          errors.push(`'${key}' must be a number`);
          break;
        }
        if (def.min !== undefined && num < def.min) {
          errors.push(`'${key}' must be >= ${def.min}`);
          break;
        }
        if (def.max !== undefined && num > def.max) {
          errors.push(`'${key}' must be <= ${def.max}`);
          break;
        }
        sanitized[key] = num;
        break;
      }

      case "boolean": {
        if (typeof value !== "boolean") {
          errors.push(`'${key}' must be a boolean`);
          break;
        }
        sanitized[key] = value;
        break;
      }

      case "array": {
        if (!Array.isArray(value)) {
          errors.push(`'${key}' must be an array`);
          break;
        }
        if (def.minItems && value.length < def.minItems) {
          errors.push(`'${key}' must contain at least ${def.minItems} item(s)`);
          break;
        }
        if (def.maxItems && value.length > def.maxItems) {
          errors.push(`'${key}' exceeds max items of ${def.maxItems}`);
          break;
        }
        if (def.uniqueItems && new Set(value).size !== value.length) {
          errors.push(`'${key}' cannot contain duplicate items`);
          break;
        }
        if (def.itemType === "uuid") {
          const bad = value.filter((v) => !isUUID(v));
          if (bad.length > 0) {
            errors.push(`'${key}' contains invalid UUID(s)`);
            break;
          }
        }
        sanitized[key] = value;
        break;
      }

      case "object": {
        if (typeof value !== "object" || Array.isArray(value)) {
          errors.push(`'${key}' must be an object`);
          break;
        }
        sanitized[key] = value;
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validate body and return a 400 response if invalid, or the sanitized data.
 */
export function validateOrReject(
  body: unknown,
  schema: Schema,
): { error: Response } | { data: Record<string, unknown> } {
  const result = validateBody(body, schema);
  if (!result.valid) {
    return {
      error: new Response(
        JSON.stringify({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: result.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      ),
    };
  }
  return { data: result.sanitized };
}
