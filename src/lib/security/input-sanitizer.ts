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
import { ValidationError, ErrorCategory, errorTracking, ErrorSeverity } from '@/lib/error-tracking';

/**
 * Result of sanitization operation
 */
export interface SanitizationResult {
  /** Sanitized value */
  value: string;
  /** Whether sanitization modified the input */
  wasModified: boolean;
  /** What was removed or changed during sanitization */
  modifications?: string[];
  /** Validation errors */
  errors?: string[];
}
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
 * Dangerous file extensions that should ALWAYS be rejected,
 * regardless of MIME type. These can execute code in the browser
 * or on the server.
 */
export const DANGEROUS_EXTENSIONS = [
  // Executables
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif', 'gadget',
  // Scripts
  'js', 'jsx', 'ts', 'tsx', 'vbs', 'vbe', 'wsf', 'wsh', 'ps1', 'psm1',
  'sh', 'bash', 'csh', 'ksh', 'py', 'pyw', 'rb', 'pl', 'php', 'php3',
  'php4', 'php5', 'phtml', 'asp', 'aspx', 'jsp', 'jspx', 'cgi',
  // Web content that can execute scripts
  'html', 'htm', 'xhtml', 'svg', 'xml', 'xsl', 'xslt', 'mhtml', 'mht',
  'shtml', 'hta',
  // Archives that may contain executables
  'jar', 'war', 'ear',
  // Office macros
  'docm', 'xlsm', 'pptm', 'dotm', 'xltm', 'potm',
  // Other dangerous
  'reg', 'inf', 'lnk', 'url', 'iso', 'dmg', 'app', 'action', 'command',
  'workflow', 'cpl', 'msc', 'apk', 'deb', 'rpm',
] as const;

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * @param html - Raw HTML string
 * @param allowedTags - Optional array of allowed HTML tags
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string, allowedTags?: string[]): string {
  const result = sanitizeHTMLWithResult(html, allowedTags);
  return result.value;
}

/**
 * Sanitize HTML content with detailed result
 * 
 * @param html - Raw HTML string
 * @param allowedTags - Optional array of allowed HTML tags
 * @returns SanitizationResult with sanitized value and modifications
 */
export function sanitizeHTMLWithResult(html: string, allowedTags?: string[]): SanitizationResult {
  if (!html || typeof html !== 'string') {
    return {
      value: '',
      wasModified: html !== '',
      modifications: html ? ['Empty or invalid input'] : undefined
    };
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

  const sanitized = DOMPurify.sanitize(html, config);
  const modifications: string[] = [];
  
  // Check if content was modified
  if (html !== sanitized) {
    // Detect removed tags
    const originalTags = html.match(/<[^>]+>/g) || [];
    const sanitizedTags = sanitized.match(/<[^>]+>/g) || [];
    
    if (originalTags.length > sanitizedTags.length) {
      const removed = originalTags.length - sanitizedTags.length;
      modifications.push(`Removed ${removed} disallowed HTML tag(s)`);
    }
    
    // Detect removed attributes
    const originalAttrs = html.match(/\s+\w+=/g) || [];
    const sanitizedAttrs = sanitized.match(/\s+\w+=/g) || [];
    
    if (originalAttrs.length > sanitizedAttrs.length) {
      const removed = originalAttrs.length - sanitizedAttrs.length;
      modifications.push(`Removed ${removed} disallowed attribute(s)`);
    }
    
    // Check for script tags specifically
    if (/<script/i.test(html)) {
      modifications.push('Removed script tag(s)');
    }
    
    // Check for event handlers
    if (/on\w+\s*=/i.test(html)) {
      modifications.push('Removed event handler(s)');
    }
    
    // Check for javascript: URLs
    if (/javascript:/i.test(html)) {
      modifications.push('Removed javascript: URL(s)');
    }
  }
  
  return {
    value: sanitized,
    wasModified: modifications.length > 0,
    modifications: modifications.length > 0 ? modifications : undefined
  };
}

/**
 * Sanitize plain text to prevent XSS
 * Removes all HTML tags and encodes special characters
 * Idempotent: sanitizeText(sanitizeText(x)) === sanitizeText(x)
 * 
 * @param text - Raw text string
 * @returns Sanitized text string
 */
export function sanitizeText(text: string): string {
  const result = sanitizeTextWithResult(text);
  return result.value;
}

/**
 * Sanitize plain text with detailed result
 * Removes all HTML tags and encodes special characters
 * 
 * @param text - Raw text string
 * @returns SanitizationResult with sanitized value and modifications
 */
export function sanitizeTextWithResult(text: string): SanitizationResult {
  if (!text || typeof text !== 'string') {
    return {
      value: '',
      wasModified: text !== '',
      modifications: text ? ['Empty or invalid input'] : undefined
    };
  }

  const modifications: string[] = [];
  
  // Remove all HTML tags
  const htmlTagRegex = /<[^>]*>/g;
  const htmlTags = text.match(htmlTagRegex);
  const withoutTags = text.replace(htmlTagRegex, '');
  
  if (htmlTags && htmlTags.length > 0) {
    modifications.push(`Removed ${htmlTags.length} HTML tag(s): ${htmlTags.slice(0, 3).join(', ')}${htmlTags.length > 3 ? '...' : ''}`);
  }
  
  // Only encode if not already encoded (check for existing entities)
  // This ensures idempotence
  const needsEncoding = !withoutTags.includes('&amp;') && 
                        !withoutTags.includes('&lt;') && 
                        !withoutTags.includes('&gt;') &&
                        !withoutTags.includes('&quot;') &&
                        !withoutTags.includes('&#x27;') &&
                        !withoutTags.includes('&#x2F;');
  
  if (!needsEncoding) {
    return {
      value: withoutTags,
      wasModified: modifications.length > 0,
      modifications: modifications.length > 0 ? modifications : undefined
    };
  }
  
  // Track special characters that need encoding
  const specialChars: string[] = [];
  if (withoutTags.includes('&')) specialChars.push('&');
  if (withoutTags.includes('<')) specialChars.push('<');
  if (withoutTags.includes('>')) specialChars.push('>');
  if (withoutTags.includes('"')) specialChars.push('"');
  if (withoutTags.includes("'")) specialChars.push("'");
  if (withoutTags.includes('/')) specialChars.push('/');
  
  if (specialChars.length > 0) {
    modifications.push(`Encoded special characters: ${specialChars.join(', ')}`);
  }
  
  // Encode special characters
  const encoded = withoutTags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return {
    value: encoded,
    wasModified: modifications.length > 0,
    modifications: modifications.length > 0 ? modifications : undefined
  };
}

/**
 * Validate and sanitize email address
 * 
 * @param email - Email address to validate
 * @returns Sanitized email or throws ValidationError
 */
export function sanitizeEmail(email: string): string {
  const result = sanitizeEmailWithResult(email);
  if (result.errors && result.errors.length > 0) {
    throw new ValidationError(
      result.errors[0],
      ErrorCategory.VALIDATION,
      { email },
      result.errors[0]
    );
  }
  return result.value;
}

/**
 * Validate and sanitize email address with detailed result
 * 
 * @param email - Email address to validate
 * @returns SanitizationResult with sanitized value, modifications, and errors
 */
export function sanitizeEmailWithResult(email: string): SanitizationResult {
  if (!email || typeof email !== 'string') {
    return {
      value: '',
      wasModified: false,
      errors: ['Email must be a non-empty string']
    };
  }

  const modifications: string[] = [];
  const errors: string[] = [];
  
  // Remove whitespace and convert to lowercase
  const original = email;
  const trimmed = email.trim().toLowerCase();
  
  if (original !== trimmed) {
    if (original.trim() !== original) {
      modifications.push('Removed whitespace');
    }
    if (original.toLowerCase() !== original) {
      modifications.push('Converted to lowercase');
    }
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmed)) {
    errors.push('Invalid email format');
    return {
      value: trimmed,
      wasModified: modifications.length > 0,
      modifications: modifications.length > 0 ? modifications : undefined,
      errors
    };
  }

  return {
    value: trimmed,
    wasModified: modifications.length > 0,
    modifications: modifications.length > 0 ? modifications : undefined
  };
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
  const result = sanitizeURLWithResult(url, allowedProtocols);
  if (result.errors && result.errors.length > 0) {
    throw new ValidationError(
      result.errors[0],
      ErrorCategory.VALIDATION,
      { url, allowedProtocols },
      result.errors[0]
    );
  }
  return result.value;
}

/**
 * Validate and sanitize URL with detailed result
 * 
 * @param url - URL to validate
 * @param allowedProtocols - Allowed protocols (default: http, https)
 * @returns SanitizationResult with sanitized value, modifications, and errors
 */
export function sanitizeURLWithResult(
  url: string,
  allowedProtocols: string[] = ['http', 'https']
): SanitizationResult {
  if (!url || typeof url !== 'string') {
    return {
      value: '',
      wasModified: false,
      errors: ['URL must be a non-empty string']
    };
  }

  const modifications: string[] = [];
  const errors: string[] = [];

  try {
    const parsed = new URL(url);
    
    // Check protocol
    const protocol = parsed.protocol.replace(':', '');
    if (!allowedProtocols.includes(protocol)) {
      errors.push(`Protocol ${protocol} not allowed. Allowed: ${allowedProtocols.join(', ')}`);
      return {
        value: url,
        wasModified: false,
        errors
      };
    }

    const sanitized = parsed.toString();
    
    // Check if URL was normalized
    if (url !== sanitized) {
      modifications.push('URL normalized');
    }
    
    return {
      value: sanitized,
      wasModified: modifications.length > 0,
      modifications: modifications.length > 0 ? modifications : undefined
    };
  } catch (error) {
    errors.push('Invalid URL format');
    return {
      value: url,
      wasModified: false,
      errors
    };
  }
}

/**
 * Prevent path traversal attacks
 * Idempotent: sanitizePath(sanitizePath(x)) === sanitizePath(x)
 * 
 * @param path - File path to validate
 * @returns Sanitized path (empty string if invalid)
 */
export function sanitizePath(path: string): string {
  const result = sanitizePathWithResult(path);
  return result.value;
}

/**
 * Prevent path traversal attacks with detailed result
 * 
 * @param path - File path to validate
 * @returns SanitizationResult with sanitized value and modifications
 */
export function sanitizePathWithResult(path: string): SanitizationResult {
  if (!path || typeof path !== 'string') {
    return {
      value: '',
      wasModified: path !== '',
      modifications: path ? ['Empty or invalid input'] : undefined
    };
  }

  const modifications: string[] = [];
  let sanitized = path;

  // Remove path traversal attempts
  const beforeTraversal = sanitized;
  sanitized = sanitized.replace(/\.\./g, '').replace(/~/g, '');
  if (beforeTraversal !== sanitized) {
    modifications.push('Removed path traversal sequences (.., ~)');
  }

  // Remove leading slashes
  const beforeLeadingSlash = sanitized;
  sanitized = sanitized.replace(/^\/+/, '');
  if (beforeLeadingSlash !== sanitized) {
    modifications.push('Removed leading slashes');
  }

  // Remove invalid characters (keep only alphanumeric, dash, underscore, dot, slash)
  const beforeInvalidChars = sanitized;
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_./]/g, '');
  if (beforeInvalidChars !== sanitized) {
    modifications.push('Removed invalid characters');
  }

  // Remove consecutive slashes
  const beforeConsecutive = sanitized;
  sanitized = sanitized.replace(/\/+/g, '/');
  if (beforeConsecutive !== sanitized) {
    modifications.push('Removed consecutive slashes');
  }

  // Remove leading/trailing slashes
  const beforeTrim = sanitized;
  sanitized = sanitized.replace(/^\/|\/$/g, '');
  if (beforeTrim !== sanitized) {
    modifications.push('Removed trailing slashes');
  }

  return {
    value: sanitized,
    wasModified: modifications.length > 0,
    modifications: modifications.length > 0 ? modifications : undefined
  };
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

  // Check file extension against dangerous blocklist FIRST
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if ((DANGEROUS_EXTENSIONS as readonly string[]).includes(extension)) {
    return {
      valid: false,
      error: `Tipo de arquivo potencialmente perigoso (.${extension}) não é permitido.`
    };
  }

  // Check for double extensions (e.g. image.jpg.exe, file.pdf.html)
  const nameParts = file.name.split('.');
  if (nameParts.length > 2) {
    for (let i = 1; i < nameParts.length - 1; i++) {
      const midExt = nameParts[i].toLowerCase();
      if ((DANGEROUS_EXTENSIONS as readonly string[]).includes(midExt)) {
        return {
          valid: false,
          error: `Arquivo com extensão oculta perigosa (.${midExt}) não é permitido.`
        };
      }
    }
  }

  // Reject files with no extension
  if (!extension || extension === file.name.toLowerCase()) {
    return {
      valid: false,
      error: 'Arquivo sem extensão não é permitido.'
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

  // Check file size > 0 (empty files)
  if (file.size === 0) {
    return {
      valid: false,
      error: 'Arquivo vazio não é permitido.'
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
      error: 'Extensão do arquivo não corresponde ao tipo MIME declarado.'
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename for safe storage
 * Idempotent: sanitizeFilename(sanitizeFilename(x)) === sanitizeFilename(x)
 * 
 * @param filename - Original filename
 * @returns Sanitized filename (empty string if invalid)
 */
export function sanitizeFilename(filename: string): string {
  const result = sanitizeFilenameWithResult(filename);
  return result.value;
}

/**
 * Sanitize filename with detailed result
 * 
 * @param filename - Original filename
 * @returns SanitizationResult with sanitized value and modifications
 */
export function sanitizeFilenameWithResult(filename: string): SanitizationResult {
  if (!filename || typeof filename !== 'string') {
    return {
      value: '',
      wasModified: filename !== '',
      modifications: filename ? ['Empty or invalid input'] : undefined
    };
  }

  const modifications: string[] = [];
  
  // Remove path components (handle both / and \ separators)
  const basename = filename.split(/[/\\]/).pop() || filename;
  if (basename !== filename) {
    modifications.push('Removed path components');
  }

  // Replace multiple spaces with single underscore
  let sanitized = basename.replace(/\s+/g, '_');
  if (sanitized !== basename) {
    modifications.push('Replaced spaces with underscores');
  }

  // Remove special characters except dots, dashes, and underscores
  const beforeSpecialChars = sanitized;
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
  if (sanitized !== beforeSpecialChars) {
    modifications.push('Removed special characters');
  }

  // Remove leading dots (hidden files) and ensure not just dots
  const beforeDots = sanitized;
  sanitized = sanitized.replace(/^\.+/, '');
  if (sanitized !== beforeDots) {
    modifications.push('Removed leading dots');
  }

  // Ensure there's at least one character
  if (sanitized === '' || sanitized === '.') {
    return {
      value: '',
      wasModified: true,
      modifications: ['Invalid filename after sanitization'],
      errors: ['Filename is invalid']
    };
  }

  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const lastDotIndex = sanitized.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const extension = sanitized.substring(lastDotIndex);
      const nameWithoutExt = sanitized.substring(0, lastDotIndex);
      const truncated = nameWithoutExt.substring(0, maxLength - extension.length);
      sanitized = `${truncated}${extension}`;
    } else {
      sanitized = sanitized.substring(0, maxLength);
    }
    modifications.push(`Truncated to ${maxLength} characters`);
  }

  return {
    value: sanitized,
    wasModified: modifications.length > 0,
    modifications: modifications.length > 0 ? modifications : undefined
  };
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
 * Sanitize search query with SQL injection pattern detection
 * Idempotent: sanitizeSearchQuery(sanitizeSearchQuery(x)) === sanitizeSearchQuery(x)
 * 
 * @param query - Search query string
 * @returns Sanitized query (empty string if contains SQL injection patterns)
 */
export function sanitizeSearchQuery(query: string): string {
  const result = sanitizeSearchQueryWithResult(query);
  return result.value;
}

/**
 * Sanitize search query with detailed result
 * 
 * @param query - Search query string
 * @returns SanitizationResult with sanitized value, modifications, and errors
 */
export function sanitizeSearchQueryWithResult(query: string): SanitizationResult {
  if (!query || typeof query !== 'string') {
    return {
      value: '',
      wasModified: query !== '',
      modifications: query ? ['Empty or invalid input'] : undefined
    };
  }

  const modifications: string[] = [];
  const errors: string[] = [];

  // Trim and limit length first
  const original = query;
  let sanitized = query.trim().substring(0, 200);
  
  if (original !== sanitized) {
    if (original.trim() !== original) {
      modifications.push('Trimmed whitespace');
    }
    if (original.length > 200) {
      modifications.push('Truncated to 200 characters');
    }
  }

  // Check for SQL injection patterns and return empty if detected
  if (detectSQLInjection(sanitized)) {
    errors.push('Query contains SQL injection patterns');
    return {
      value: '',
      wasModified: true,
      modifications: ['Rejected due to SQL injection patterns'],
      errors
    };
  }

  // Remove dangerous special characters but keep spaces, quotes for search, and basic punctuation
  const beforeDangerous = sanitized;
  sanitized = sanitized.replace(/[<>{}[\]\\;]/g, '');
  if (beforeDangerous !== sanitized) {
    modifications.push('Removed dangerous special characters');
  }

  // Remove multiple spaces
  const beforeSpaces = sanitized;
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  if (beforeSpaces !== sanitized) {
    modifications.push('Normalized whitespace');
  }

  return {
    value: sanitized,
    wasModified: modifications.length > 0,
    modifications: modifications.length > 0 ? modifications : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
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
  const result = sanitizePhoneNumberWithResult(phone);
  if (result.errors && result.errors.length > 0) {
    throw new ValidationError(
      result.errors[0],
      ErrorCategory.VALIDATION,
      { phone },
      result.errors[0]
    );
  }
  return result.value;
}

/**
 * Validate and sanitize phone number with detailed result
 * 
 * @param phone - Phone number to validate
 * @returns SanitizationResult with sanitized value, modifications, and errors
 */
export function sanitizePhoneNumberWithResult(phone: string): SanitizationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      value: '',
      wasModified: false,
      errors: ['Phone number must be a non-empty string']
    };
  }

  const modifications: string[] = [];
  const errors: string[] = [];

  // Remove all non-numeric characters
  const original = phone;
  const numbers = phone.replace(/\D/g, '');
  
  if (original !== numbers) {
    modifications.push('Removed non-numeric characters');
  }

  // Validate Brazilian phone number (10 or 11 digits)
  if (numbers.length < 10 || numbers.length > 11) {
    errors.push('Phone number must have 10 or 11 digits');
    return {
      value: numbers,
      wasModified: modifications.length > 0,
      modifications: modifications.length > 0 ? modifications : undefined,
      errors
    };
  }

  return {
    value: numbers,
    wasModified: modifications.length > 0,
    modifications: modifications.length > 0 ? modifications : undefined
  };
}

/**
 * Log sanitization event for security monitoring
 * 
 * This function logs when sanitization modifies user input, which helps
 * detect potential attack attempts and monitor security events.
 * 
 * @param fieldName - Name of the field being sanitized
 * @param sanitizationType - Type of sanitization applied (text, html, email, etc.)
 * @param result - Result of the sanitization operation
 * @param context - Additional context (e.g., form name, user ID)
 */
export function logSanitizationEvent(
  fieldName: string,
  sanitizationType: string,
  result: SanitizationResult,
  context?: Record<string, unknown>
): void {
  // Only log if sanitization actually modified the input
  if (!result.wasModified) {
    return;
  }

  // Determine severity based on modifications
  const severity = result.errors && result.errors.length > 0 
    ? ErrorSeverity.WARNING 
    : ErrorSeverity.INFO;

  // Build log message
  const message = `Sanitization modified input in field "${fieldName}"`;

  // Build context object
  const logContext = {
    fieldName,
    sanitizationType,
    wasModified: result.wasModified,
    modifications: result.modifications,
    errors: result.errors,
    ...context
  };

  // Log the event
  errorTracking.log(message, severity, logContext);

  // Add breadcrumb for debugging
  errorTracking.addBreadcrumb(
    `Sanitization: ${fieldName}`,
    'sanitization',
    {
      type: sanitizationType,
      modified: result.wasModified,
      modifications: result.modifications?.join(', ')
    }
  );
}
