/**
 * Custom Hook for Sanitized Input
 * 
 * Automatically sanitizes user input to prevent XSS and other attacks.
 * Use this hook instead of useState for user-facing inputs.
 */

import { useState, useCallback } from 'react';
import { 
  sanitizeText, 
  sanitizeHTML, 
  sanitizeEmail,
  sanitizeURL,
  sanitizePhoneNumber,
  sanitizeSearchQuery,
  sanitizeTextWithResult,
  sanitizeHTMLWithResult,
  sanitizeEmailWithResult,
  sanitizeURLWithResult,
  sanitizePhoneNumberWithResult,
  sanitizeSearchQueryWithResult,
  logSanitizationEvent
} from '@/lib/security/input-sanitizer';

export type SanitizationType = 'text' | 'html' | 'email' | 'phone' | 'url' | 'search' | 'none';

/**
 * Hook for sanitized text input
 * 
 * @param initialValue - Initial value
 * @param type - Type of sanitization to apply
 * @returns [value, setValue, sanitizedValue]
 */
export function useSanitizedInput(
  initialValue: string = '',
  type: SanitizationType = 'text'
) {
  const [rawValue, setRawValue] = useState(initialValue);

  const sanitize = useCallback((value: string): string => {
    switch (type) {
      case 'text':
        return sanitizeText(value);
      case 'html':
        return sanitizeHTML(value);
      case 'email':
        try {
          return sanitizeEmail(value);
        } catch {
          return value; // Return raw value if validation fails (let form validation handle it)
        }
      case 'phone':
        return sanitizePhoneNumber(value);
      case 'url':
        try {
          return sanitizeURL(value);
        } catch {
          return value; // Return raw value if validation fails
        }
      case 'search':
        return sanitizeSearchQuery(value);
      case 'none':
        return value;
      default:
        return sanitizeText(value);
    }
  }, [type]);

  const sanitizedValue = sanitize(rawValue);

  return [rawValue, setRawValue, sanitizedValue] as const;
}

/**
 * Hook for sanitized form data
 * 
 * @param initialData - Initial form data
 * @param sanitizationMap - Map of field names to sanitization types
 * @returns Form state and handlers
 */
export function useSanitizedForm<T extends Record<string, any>>(
  initialData: T,
  sanitizationMap: Partial<Record<keyof T, SanitizationType>> = {}
) {
  const [formData, setFormData] = useState<T>(initialData);

  const setValue = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const getSanitizedValue = useCallback((field: keyof T): any => {
    const value = formData[field];
    const sanitizationType = sanitizationMap[field] || 'text';

    if (typeof value !== 'string') {
      return value;
    }

    switch (sanitizationType) {
      case 'text':
        return sanitizeText(value);
      case 'html':
        return sanitizeHTML(value);
      case 'email':
        try {
          return sanitizeEmail(value);
        } catch {
          return value;
        }
      case 'phone':
        return sanitizePhoneNumber(value);
      case 'url':
        try {
          return sanitizeURL(value);
        } catch {
          return value;
        }
      case 'search':
        return sanitizeSearchQuery(value);
      case 'none':
        return value;
      default:
        return sanitizeText(value);
    }
  }, [formData, sanitizationMap]);

  const getSanitizedData = useCallback((): T => {
    const sanitized = { ...formData };
    
    Object.keys(formData).forEach((key) => {
      const field = key as keyof T;
      sanitized[field] = getSanitizedValue(field);
    });

    return sanitized;
  }, [formData, getSanitizedValue]);

  const reset = useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  return {
    formData,
    setValue,
    getSanitizedValue,
    getSanitizedData,
    reset,
    setFormData
  };
}

/**
 * Hook for sanitized form data with event logging
 * 
 * This enhanced version logs sanitization events for security monitoring.
 * Use this for forms where you want to track potential attack attempts.
 * 
 * @param initialData - Initial form data
 * @param sanitizationMap - Map of field names to sanitization types
 * @param options - Additional options including logging context
 * @returns Form state and handlers
 */
export function useSanitizedFormWithLogging<T extends Record<string, any>>(
  initialData: T,
  sanitizationMap: Partial<Record<keyof T, SanitizationType>> = {},
  options?: {
    formName?: string;
    userId?: string;
    enableLogging?: boolean;
  }
) {
  const [formData, setFormData] = useState<T>(initialData);

  const setValue = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const getSanitizedValue = useCallback((field: keyof T): any => {
    const value = formData[field];
    const sanitizationType = sanitizationMap[field] || 'text';

    if (typeof value !== 'string') {
      return value;
    }

    let result;

    switch (sanitizationType) {
      case 'text':
        result = sanitizeTextWithResult(value);
        break;
      case 'html':
        result = sanitizeHTMLWithResult(value);
        break;
      case 'email':
        result = sanitizeEmailWithResult(value);
        break;
      case 'phone':
        result = sanitizePhoneNumberWithResult(value);
        break;
      case 'url':
        result = sanitizeURLWithResult(value);
        break;
      case 'search':
        result = sanitizeSearchQueryWithResult(value);
        break;
      case 'none':
        return value;
      default:
        result = sanitizeTextWithResult(value);
    }

    // Log sanitization event if enabled
    if (options?.enableLogging !== false) {
      logSanitizationEvent(
        String(field),
        sanitizationType,
        result,
        {
          formName: options?.formName,
          userId: options?.userId
        }
      );
    }

    return result.value;
  }, [formData, sanitizationMap, options]);

  const getSanitizedData = useCallback((): T => {
    const sanitized = { ...formData };
    
    Object.keys(formData).forEach((key) => {
      const field = key as keyof T;
      sanitized[field] = getSanitizedValue(field);
    });

    return sanitized;
  }, [formData, getSanitizedValue]);

  const reset = useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  return {
    formData,
    setValue,
    getSanitizedValue,
    getSanitizedData,
    reset,
    setFormData
  };
}
