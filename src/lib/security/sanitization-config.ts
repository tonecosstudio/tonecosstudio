/**
 * Sanitization Configuration
 * 
 * Centralized configuration for form sanitization across the application.
 * Defines field-level settings, rate limits, allowed HTML tags, and file types.
 * 
 * Requirements: 5.1, 5.3, 5.4, 5.6, 9.2
 * 
 * ## Sanitization Event Logging
 * 
 * The system automatically logs sanitization events when user input is modified.
 * This helps detect potential attack attempts and monitor security events.
 * 
 * To use logging in your forms:
 * 
 * ```typescript
 * import { sanitizeTextWithResult, logSanitizationEvent } from '@/lib/security/input-sanitizer';
 * 
 * // Sanitize input and get detailed result
 * const result = sanitizeTextWithResult(userInput);
 * 
 * // Log the event if input was modified
 * logSanitizationEvent('username', 'text', result, {
 *   formName: 'userProfileForm',
 *   userId: currentUser.id
 * });
 * 
 * // Use the sanitized value
 * setValue(result.value);
 * ```
 * 
 * Logging features:
 * - Only logs when input is actually modified (wasModified = true)
 * - Uses INFO severity for normal sanitization
 * - Uses WARNING severity when errors are detected
 * - Includes field name, sanitization type, and modifications
 * - Adds breadcrumbs for debugging in Sentry
 * - Supports additional context (form name, user ID, etc.)
 */

import type { RateLimitConfig } from './rate-limiter';

/**
 * Sanitization type for different input fields
 */
export type SanitizationType = 'text' | 'html' | 'email' | 'phone' | 'url' | 'search' | 'none';

/**
 * Field-level sanitization configuration
 */
export interface FieldSanitizationConfig {
  /** Type of sanitization to apply */
  type: SanitizationType;
  /** Whether the field is required */
  required: boolean;
  /** Maximum length for the field */
  maxLength?: number;
  /** Validation pattern (regex) */
  pattern?: RegExp;
  /** Custom sanitizer function */
  customSanitizer?: (value: string) => string;
}

/**
 * Standard sanitization configuration for common field types
 * Requirement 5.1: Define standard sanitization configuration for each input type
 */
export const SANITIZATION_CONFIG: Record<string, FieldSanitizationConfig> = {
  // User profile fields
  userName: {
    type: 'text',
    required: true,
    maxLength: 100
  },
  
  userEmail: {
    type: 'email',
    required: true,
    maxLength: 255
  },
  
  userPhone: {
    type: 'phone',
    required: false,
    maxLength: 15
  },
  
  userBio: {
    type: 'html',
    required: false,
    maxLength: 1000
  },
  
  userWebsite: {
    type: 'url',
    required: false,
    maxLength: 255
  },
  
  // Product fields
  productName: {
    type: 'text',
    required: true,
    maxLength: 200
  },
  
  productDescription: {
    type: 'html',
    required: true,
    maxLength: 5000
  },
  
  productCategory: {
    type: 'text',
    required: true,
    maxLength: 100
  },
  
  // Order fields
  orderNotes: {
    type: 'html',
    required: false,
    maxLength: 2000
  },
  
  customerNotes: {
    type: 'html',
    required: false,
    maxLength: 2000
  },
  
  // Contact form fields
  contactName: {
    type: 'text',
    required: true,
    maxLength: 100
  },
  
  contactEmail: {
    type: 'email',
    required: true,
    maxLength: 255
  },
  
  contactMessage: {
    type: 'html',
    required: true,
    maxLength: 5000
  },
  
  // Chat and messaging fields
  chatMessage: {
    type: 'text',
    required: true,
    maxLength: 2000
  },
  
  quickReply: {
    type: 'text',
    required: true,
    maxLength: 500
  },
  
  // Search fields
  searchQuery: {
    type: 'search',
    required: true,
    maxLength: 200
  },
  
  // Payment fields
  pixKey: {
    type: 'text',
    required: true,
    maxLength: 100
  },
  
  apiKey: {
    type: 'text',
    required: true,
    maxLength: 255
  },
  
  // Bonus pieces fields
  bonusPieceName: {
    type: 'text',
    required: true,
    maxLength: 200
  },
  
  bonusPieceDescription: {
    type: 'html',
    required: false,
    maxLength: 2000
  }
};

/**
 * Rate limits for different form types
 * Requirement 9.2: Apply different rate limits for different form types
 */
export const FORM_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Profile and user management
  profileUpdate: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitas atualizações de perfil. Tente novamente em 1 hora.'
  },
  
  // Contact forms
  contactForm: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitas mensagens de contato. Tente novamente em 1 hora.'
  },
  
  // Chat and messaging
  chatMessage: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    message: 'Muitas mensagens. Aguarde 1 minuto.'
  },
  
  groupMessage: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Muitas mensagens em grupo. Aguarde 1 minuto.'
  },
  
  // Search
  search: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Muitas buscas. Aguarde 1 minuto.'
  },
  
  // File uploads
  fileUpload: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitos uploads. Tente novamente em 1 hora.'
  },
  
  // Admin operations
  adminUserUpdate: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitas atualizações de usuário. Aguarde alguns minutos.'
  },
  
  adminProductUpdate: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitas atualizações de produto. Aguarde alguns minutos.'
  },
  
  adminOrderUpdate: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitas atualizações de pedido. Aguarde alguns minutos.'
  },
  
  adminDeliveryUpdate: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitas atualizações de entrega. Aguarde alguns minutos.'
  },
  
  // Payment operations
  paymentSubmit: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Muitas operações de pagamento. Aguarde 1 minuto.'
  }
};

/**
 * Allowed HTML tags for rich text fields
 * Requirement 5.3: Maintain centralized configuration for allowed HTML tags
 */
export const ALLOWED_HTML_TAGS = [
  // Text formatting
  'p', 'br', 'strong', 'em', 'u', 's', 'mark',
  
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  
  // Lists
  'ul', 'ol', 'li',
  
  // Links
  'a',
  
  // Quotes and code
  'blockquote', 'code', 'pre',
  
  // Tables (for structured content)
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
] as const;

/**
 * Allowed HTML attributes for rich text fields
 */
export const ALLOWED_HTML_ATTRIBUTES = [
  'href',
  'title',
  'target',
  'rel'
] as const;

/**
 * Allowed URL protocols for links
 */
export const ALLOWED_URL_PROTOCOLS = [
  'http',
  'https',
  'mailto',
  'tel'
] as const;

/**
 * Allowed image file types
 * Requirement 5.4: Maintain centralized configuration for allowed file types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
] as const;

/**
 * Allowed document file types
 */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const;

/**
 * Maximum file sizes (in bytes)
 * Requirement 5.4: Maintain centralized configuration for file size limits
 */
export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB
  avatar: 5 * 1024 * 1024 // 5MB
} as const;

/**
 * Maximum input lengths for different field types
 */
export const MAX_INPUT_LENGTHS = {
  text: 1000,
  html: 5000,
  email: 255,
  phone: 15,
  url: 255,
  search: 200,
  shortText: 100,
  longText: 10000
} as const;

/**
 * Get sanitization config for a specific field
 * 
 * @param fieldName - Name of the field
 * @returns Field sanitization configuration or default text config
 */
export function getFieldConfig(fieldName: string): FieldSanitizationConfig {
  return SANITIZATION_CONFIG[fieldName] || {
    type: 'text',
    required: false,
    maxLength: MAX_INPUT_LENGTHS.text
  };
}

/**
 * Get rate limit config for a specific form type
 * 
 * @param formType - Type of form
 * @returns Rate limit configuration or default config
 */
export function getFormRateLimit(formType: string): RateLimitConfig {
  return FORM_RATE_LIMITS[formType] || {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Muitas requisições. Aguarde alguns instantes.'
  };
}

/**
 * Validate file type against allowed types
 * 
 * @param fileType - MIME type of the file
 * @param category - File category ('image' or 'document')
 * @returns Whether the file type is allowed
 */
export function isFileTypeAllowed(
  fileType: string,
  category: 'image' | 'document'
): boolean {
  if (category === 'image') {
    return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(fileType);
  }
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(fileType);
}

/**
 * Get maximum file size for a category
 * 
 * @param category - File category
 * @returns Maximum file size in bytes
 */
export function getMaxFileSize(category: keyof typeof MAX_FILE_SIZES): number {
  return MAX_FILE_SIZES[category];
}
