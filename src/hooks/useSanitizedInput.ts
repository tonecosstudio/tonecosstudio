/**
 * Custom Hook for Sanitized Input
 * 
 * Automatically sanitizes user input to prevent XSS and other attacks.
 * Use this hook instead of useState for user-facing inputs.
 */

import { useState, useCallback } from 'react';
import { sanitizeText, sanitizeHTML, sanitizeEmail } from '@/lib/security/input-sanitizer';

export type SanitizationType = 'text' | 'html' | 'email' | 'none';

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
