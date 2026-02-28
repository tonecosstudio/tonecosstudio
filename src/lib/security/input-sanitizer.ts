/**
 * Input Sanitization Service
 * 
 * Provides comprehensive input sanitization to prevent XSS, SQL injection,
 * and other security vulnerabilities.
 * 
 * Features:
 * - HTML sanitization with DOMPurify
 * - SQL injection prevention
 * - Path traversal prevention
 * - Command injection prevention
 * - File upload validation
 */

import DOMPurify from 'dompurify';
import { ValidationError, ErrorCategory } from '@/lib/error-tracking';

/**
 * Allowed file types for uploads
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;

/**
 * Maximum file sizes (in bytes)
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * @param html - Raw HTML string
 * @param allowedTags - Optional array of allowed HTML tags
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string, allowedTags?: string[]): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const config: DOMPurify.Config = {
    ALLOWED_TAGS: allowedTags || [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  };

  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize plain text to prevent XSS
 * Removes all HTML tags and encodes special characters
 * 
 * @param text - Raw text string
 * @returns Sanitized text string
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove all HTML tags
  const withoutTags = text.replace(/<[^>]*>/g, '');
  
  // Encode special characters
  return withoutTags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize email address
 * 
 * @param email - Email address to validate
 * @returns Sanitized email or throws ValidationError
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new ValidationError(
      'Email must be a non-empty string',
      ErrorCategory.VALIDATION,
      { email },
      'Email inválido.'
    );
  }

  // Remove whitespace
  const trimmed = email.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmed)) {
    throw new ValidationError(
      'Invalid email format',
      ErrorCategory.VALIDATION,
      { email: trimmed },
      'Formato de email inválido.'
    );
  }

  return trimmed;
}

/**
 * Validate and sanitize URL
 * 
 * @param url - URL to validate
 * @param allowedProtocols - Allowed protocols (default: http, https)
 * @returns Sanitized URL or throws ValidationError
 */
export function sanitizeURL(
  url: string,
  allowedProtocols: string[] = ['http', 'https']
): string {
  if (!url || typeof url !== 'string') {
    throw new ValidationError(
      'URL must be a non-empty string',
      ErrorCategory.VALIDATION,
      { url },
      'URL inválida.'
    );
  }

  try {
    const parsed = new URL(url);
    
    // Check protocol
    const protocol = parsed.protocol.replace(':', '');
    if (!allowedProtocols.includes(protocol)) {
      throw new ValidationError(
        `Protocol ${protocol} not allowed`,
        ErrorCategory.VALIDATION,
        { url, allowedProtocols },
        'Protocolo de URL não permitido.'
      );
    }

    return parsed.toString();
  } catch (error) {
    throw new ValidationError(
      'Invalid URL format',
      ErrorCategory.VALIDATION,
      { url, error },
      'Formato de URL inválido.'
    );
  }
}

/**
 * Prevent path traversal attacks
 * 
 * @param path - File path to validate
 * @returns Sanitized path or throws ValidationError
 */
export function sanitizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    throw new ValidationError(
      'Path must be a non-empty string',
      ErrorCategory.VALIDATION,
      { path },
      'Caminho inválido.'
    );
  }

  // Check for path traversal attempts
  if (path.includes('..') || path.includes('~')) {
    throw new ValidationError(
      'Path traversal attempt detected',
      ErrorCategory.VALIDATION,
      { path },
      'Caminho inválido detectado.'
    );
  }

  // Remove leading slashes
  const sanitized = path.replace(/^\/+/, '');

  // Validate characters (alphanumeric, dash, underscore, dot, slash)
  if (!/^[a-zA-Z0-9\-_./]+$/.test(sanitized)) {
    throw new ValidationError(
      'Invalid characters in path',
      ErrorCategory.VALIDATION,
      { path: sanitized },
      'Caracteres inválidos no caminho.'
    );
  }

  return sanitized;
}

/**
 * Validate file upload
 * 
 * @param file - File object to validate
 * @param allowedTypes - Allowed MIME types
 * @param maxSize - Maximum file size in bytes
 * @returns Validation result
 */
export function validateFileUpload(
  file: File,
  allowedTypes: readonly string[],
  maxSize: number
): { valid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'Nenhum arquivo selecionado.'
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB.`
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(', ')}.`
    };
  }

  // Check file extension matches MIME type
  const extension = file.name.split('.').pop()?.toLowerCase();
  const expectedExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx']
  };

  const expected = expectedExtensions[file.type];
  if (expected && extension && !expected.includes(extension)) {
    return {
      valid: false,
      error: 'Extensão do arquivo não corresponde ao tipo.'
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename for safe storage
 * 
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new ValidationError(
      'Filename must be a non-empty string',
      ErrorCategory.VALIDATION,
      { filename },
      'Nome de arquivo inválido.'
    );
  }

  // Remove path components
  const basename = filename.split('/').pop() || filename;

  // Replace spaces with underscores
  let sanitized = basename.replace(/\s+/g, '_');

  // Remove special characters except dots, dashes, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');

  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const extension = sanitized.split('.').pop();
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - extension!.length - 1);
    sanitized = `${truncated}.${extension}`;
  }

  return sanitized;
}

/**
 * Prevent SQL injection by validating input
 * Note: This is a secondary defense. Always use parameterized queries!
 * 
 * @param input - User input to validate
 * @returns true if input appears safe
 */
export function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\*|;|'|"|\\)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(UNION.*SELECT)/i,
    /(\/\*|\*\/)/
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize search query
 * 
 * @param query - Search query string
 * @returns Sanitized query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Check for SQL injection
  if (detectSQLInjection(query)) {
    throw new ValidationError(
      'Potentially malicious query detected',
      ErrorCategory.VALIDATION,
      { query },
      'Consulta inválida detectada.'
    );
  }

  // Remove special characters but keep spaces and basic punctuation
  return query
    .trim()
    .replace(/[<>{}[\]\\]/g, '')
    .substring(0, 200); // Limit length
}

/**
 * Generate secure random token
 * 
 * @param length - Token length (default: 32)
 * @returns Random token string
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate and sanitize phone number (Brazilian format)
 * 
 * @param phone - Phone number to validate
 * @returns Sanitized phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    throw new ValidationError(
      'Phone number must be a non-empty string',
      ErrorCategory.VALIDATION,
      { phone },
      'Número de telefone inválido.'
    );
  }

  // Remove all non-numeric characters
  const numbers = phone.replace(/\D/g, '');

  // Validate Brazilian phone number (10 or 11 digits)
  if (numbers.length < 10 || numbers.length > 11) {
    throw new ValidationError(
      'Invalid phone number length',
      ErrorCategory.VALIDATION,
      { phone: numbers },
      'Número de telefone deve ter 10 ou 11 dígitos.'
    );
  }

  return numbers;
}
