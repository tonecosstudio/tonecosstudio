import DOMPurify from "dompurify";

/**
 * Sanitization utilities for user-generated content
 * Protects against XSS attacks
 */

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Removes dangerous tags and attributes while preserving safe formatting
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitizes plain text by removing all HTML tags
 * Use for content that should never contain HTML
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return "";

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitizes URLs to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return "";

  const cleaned = DOMPurify.sanitize(url);

  // Additional check for dangerous protocols
  const dangerous = /^(javascript|data|vbscript):/i;
  if (dangerous.test(cleaned)) {
    return "";
  }

  return cleaned;
}

/**
 * Sanitizes group message content
 * Allows basic formatting but removes dangerous content
 */
export function sanitizeGroupMessage(message: string): string {
  if (!message) return "";

  return DOMPurify.sanitize(message, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "br"],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitizes group name
 * Removes all HTML tags
 */
export function sanitizeGroupName(name: string): string {
  return sanitizeText(name);
}

/**
 * Sanitizes user profile data
 */
export function sanitizeProfile(data: {
  full_name?: string;
  bio?: string;
  [key: string]: any;
}): typeof data {
  return {
    ...data,
    full_name: data.full_name ? sanitizeText(data.full_name) : undefined,
    bio: data.bio ? sanitizeHtml(data.bio) : undefined,
  };
}
