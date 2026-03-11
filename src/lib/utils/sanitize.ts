import DOMPurify from "dompurify";

/**
 * Sanitization utilities for user-generated content
 * Protects against XSS attacks
 * 
 * @example
 * ```typescript
 * import { sanitizeHtml, sanitizeText } from '@/lib/utils/sanitize';
 * 
 * // Sanitize HTML content
 * const safeHtml = sanitizeHtml(userInput);
 * 
 * // Sanitize plain text (strips all HTML)
 * const safeText = sanitizeText(userInput);
 * ```
 */

/**
 * Default configuration for DOMPurify
 * Allows safe HTML tags while removing dangerous attributes and scripts
 */
const DEFAULT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre',
    'b', 'i', 'span', 'div'
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'alt', 'class'
  ],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true,
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Removes dangerous tags and attributes while preserving safe formatting
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  return DOMPurify.sanitize(dirty, DEFAULT_CONFIG);
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

/**
 * Sanitize filename to prevent path traversal attacks
 * 
 * @param filename - Untrusted filename string
 * @returns Safe filename without path traversal characters
 * 
 * @example
 * ```typescript
 * const userFile = '../../../etc/passwd';
 * const safe = sanitizeFilename(userFile);
 * // Result: 'passwd'
 * ```
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  // Remove path traversal attempts
  let safe = filename.replace(/\.\./g, '');
  
  // Remove path separators
  safe = safe.replace(/[\/\\]/g, '');
  
  // Remove null bytes
  safe = safe.replace(/\0/g, '');
  
  // Remove leading/trailing dots and spaces
  safe = safe.replace(/^[\s.]+|[\s.]+$/g, '');
  
  // Limit length
  if (safe.length > 255) {
    safe = safe.substring(0, 255);
  }

  return safe;
}

/**
 * Sanitize object by applying sanitization to all string values
 * Useful for sanitizing form data or API responses
 * 
 * @param obj - Object with potentially unsafe string values
 * @param sanitizer - Sanitization function to apply (default: sanitizeText)
 * @returns New object with sanitized values
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sanitizer: (value: string) => string = sanitizeText
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizer(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, sanitizer);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized as T;
}

/**
 * Create a safe React component for rendering user HTML
 * Use this instead of dangerouslySetInnerHTML
 * 
 * @param html - HTML string to render
 * @param config - Optional DOMPurify configuration
 * @returns Object with __html property for React
 * 
 * @example
 * ```tsx
 * function UserContent({ content }: { content: string }) {
 *   return <div dangerouslySetInnerHTML={createSafeHtml(content)} />;
 * }
 * ```
 */
export function createSafeHtml(
  html: string,
  config: DOMPurify.Config = DEFAULT_CONFIG
): { __html: string } {
  return {
    __html: DOMPurify.sanitize(html, config)
  };
}

/**
 * Validate and sanitize email address
 * 
 * @param email - Email address to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Sanitize phone number (remove non-numeric characters except +)
 * 
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Keep only digits, +, -, (, ), and spaces
  return phone.replace(/[^\d+\-() ]/g, '').trim();
}

// Export DOMPurify instance for advanced usage
export { DOMPurify };
