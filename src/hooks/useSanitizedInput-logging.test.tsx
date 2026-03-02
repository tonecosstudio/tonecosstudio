/**
 * Tests for useSanitizedFormWithLogging hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSanitizedFormWithLogging } from './useSanitizedInput';
import * as inputSanitizer from '@/lib/security/input-sanitizer';

// Mock the input-sanitizer module
vi.mock('@/lib/security/input-sanitizer', () => ({
  sanitizeTextWithResult: vi.fn((value: string) => {
    const cleaned = value.replace(/<[^>]*>/g, '');
    return {
      value: cleaned,
      wasModified: value !== cleaned,
      modifications: value !== cleaned ? ['Removed HTML tags'] : undefined
    };
  }),
  sanitizeHTMLWithResult: vi.fn((value: string) => {
    const cleaned = value.replace(/<script[^>]*>.*?<\/script>/gi, '');
    return {
      value: cleaned,
      wasModified: value !== cleaned,
      modifications: value !== cleaned ? ['Removed script tags'] : undefined
    };
  }),
  sanitizeEmailWithResult: vi.fn((value: string) => {
    const cleaned = value.toLowerCase().trim();
    return {
      value: cleaned,
      wasModified: value !== cleaned,
      modifications: value !== cleaned ? ['Normalized email'] : undefined
    };
  }),
  sanitizePhoneNumberWithResult: vi.fn((value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return {
      value: cleaned,
      wasModified: value !== cleaned,
      modifications: value !== cleaned ? ['Removed non-numeric characters'] : undefined
    };
  }),
  sanitizeURLWithResult: vi.fn((value: string) => {
    const cleaned = value.trim();
    return {
      value: cleaned,
      wasModified: value !== cleaned,
      modifications: value !== cleaned ? ['Trimmed whitespace'] : undefined
    };
  }),
  sanitizeSearchQueryWithResult: vi.fn((value: string) => {
    const cleaned = value.replace(/[;'"]/g, '');
    return {
      value: cleaned,
      wasModified: value !== cleaned,
      modifications: value !== cleaned ? ['Removed SQL injection patterns'] : undefined
    };
  }),
  logSanitizationEvent: vi.fn()
}));

describe('useSanitizedFormWithLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sanitize form data and log events', () => {
    const initialData = {
      name: '<b>John</b>',
      email: '  TEST@EXAMPLE.COM  '
    };

    const { result } = renderHook(() =>
      useSanitizedFormWithLogging(
        initialData,
        { name: 'text', email: 'email' },
        { formName: 'testForm', userId: '123' }
      )
    );

    act(() => {
      const sanitized = result.current.getSanitizedData();
      // Just verify the function returns something
      expect(sanitized.name).toBeDefined();
      expect(sanitized.email).toBeDefined();
    });

    // Verify logging was called for modified fields
    expect(inputSanitizer.logSanitizationEvent).toHaveBeenCalledWith(
      'name',
      'text',
      expect.objectContaining({ wasModified: true }),
      expect.objectContaining({ formName: 'testForm', userId: '123' })
    );

    expect(inputSanitizer.logSanitizationEvent).toHaveBeenCalledWith(
      'email',
      'email',
      expect.objectContaining({ wasModified: true }),
      expect.objectContaining({ formName: 'testForm', userId: '123' })
    );
  });

  it('should not log when logging is disabled', () => {
    const initialData = {
      name: '<script>alert("xss")</script>John'
    };

    const { result } = renderHook(() =>
      useSanitizedFormWithLogging(
        initialData,
        { name: 'text' },
        { enableLogging: false }
      )
    );

    act(() => {
      result.current.getSanitizedData();
    });

    expect(inputSanitizer.logSanitizationEvent).not.toHaveBeenCalled();
  });

  it('should handle different sanitization types', () => {
    const initialData = {
      text: '<b>Bold</b>',
      html: '<script>alert("xss")</script><p>Content</p>',
      phone: '(11) 98765-4321',
      search: "'; DROP TABLE users; --"
    };

    const { result } = renderHook(() =>
      useSanitizedFormWithLogging(
        initialData,
        {
          text: 'text',
          html: 'html',
          phone: 'phone',
          search: 'search'
        },
        { formName: 'multiTypeForm' }
      )
    );

    act(() => {
      result.current.getSanitizedData();
    });

    // Verify each field was logged with correct type
    expect(inputSanitizer.logSanitizationEvent).toHaveBeenCalledWith(
      'text',
      'text',
      expect.any(Object),
      expect.objectContaining({ formName: 'multiTypeForm' })
    );

    expect(inputSanitizer.logSanitizationEvent).toHaveBeenCalledWith(
      'html',
      'html',
      expect.any(Object),
      expect.objectContaining({ formName: 'multiTypeForm' })
    );

    expect(inputSanitizer.logSanitizationEvent).toHaveBeenCalledWith(
      'phone',
      'phone',
      expect.any(Object),
      expect.objectContaining({ formName: 'multiTypeForm' })
    );

    expect(inputSanitizer.logSanitizationEvent).toHaveBeenCalledWith(
      'search',
      'search',
      expect.any(Object),
      expect.objectContaining({ formName: 'multiTypeForm' })
    );
  });

  it('should not log for fields with type "none"', () => {
    const initialData = {
      password: 'secret123',
      username: 'john'
    };

    const { result } = renderHook(() =>
      useSanitizedFormWithLogging(
        initialData,
        {
          password: 'none',
          username: 'text'
        },
        { formName: 'loginForm' }
      )
    );

    act(() => {
      result.current.getSanitizedData();
    });

    // Should only log for username, not password
    expect(inputSanitizer.logSanitizationEvent).toHaveBeenCalledTimes(1);
    expect(inputSanitizer.logSanitizationEvent).toHaveBeenCalledWith(
      'username',
      'text',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should update form data correctly', () => {
    const initialData = {
      name: 'John',
      email: 'john@example.com'
    };

    const { result } = renderHook(() =>
      useSanitizedFormWithLogging(
        initialData,
        { name: 'text', email: 'email' }
      )
    );

    act(() => {
      result.current.setValue('name', 'Jane');
    });

    expect(result.current.formData.name).toBe('Jane');
    expect(result.current.formData.email).toBe('john@example.com');
  });

  it('should reset form data', () => {
    const initialData = {
      name: 'John',
      email: 'john@example.com'
    };

    const { result } = renderHook(() =>
      useSanitizedFormWithLogging(
        initialData,
        { name: 'text', email: 'email' }
      )
    );

    act(() => {
      result.current.setValue('name', 'Jane');
      result.current.setValue('email', 'jane@example.com');
    });

    expect(result.current.formData.name).toBe('Jane');

    act(() => {
      result.current.reset();
    });

    expect(result.current.formData.name).toBe('John');
    expect(result.current.formData.email).toBe('john@example.com');
  });
});
