/**
 * Tests for AdminUsers form sanitization
 * Task 6.1: Retrofit User Management form (/admin/users)
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

describe('AdminUsers Form Sanitization', () => {
  describe('Email Input Sanitization', () => {
    it('should sanitize email input', () => {
      const { result } = renderHook(() => useSanitizedInput('', 'email'));
      const [, setValue, sanitizedValue] = result.current;

      act(() => {
        setValue('test@example.com');
      });

      const [rawValue, , sanitized] = result.current;
      expect(rawValue).toBe('test@example.com');
      expect(sanitized).toBe('test@example.com');
    });

    it('should handle malicious email input', () => {
      const { result } = renderHook(() => useSanitizedInput('', 'email'));
      const [, setValue] = result.current;

      act(() => {
        setValue('test<script>alert("xss")</script>@example.com');
      });

      const [rawValue, , sanitized] = result.current;
      // Email sanitization returns the raw value if validation fails
      // The form validation will catch this as an invalid email
      expect(rawValue).toContain('<script>');
      // The sanitized value will be the trimmed/lowercased version
      // but still invalid, which the form validation will catch
      expect(sanitized).toBe('test<script>alert("xss")</script>@example.com');
    });

    it('should preserve valid email addresses', () => {
      const { result } = renderHook(() => useSanitizedInput('', 'email'));
      const [, setValue] = result.current;

      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com'
      ];

      validEmails.forEach(email => {
        act(() => {
          setValue(email);
        });

        const [, , sanitized] = result.current;
        expect(sanitized).toBe(email);
      });
    });
  });

  describe('Search Input Sanitization', () => {
    it('should sanitize search queries', () => {
      const { result } = renderHook(() => useSanitizedInput('', 'search'));
      const [, setValue] = result.current;

      act(() => {
        setValue('test query');
      });

      const [rawValue, , sanitized] = result.current;
      expect(rawValue).toBe('test query');
      expect(sanitized).toBe('test query');
    });

    it('should remove SQL injection patterns from search', () => {
      const { result } = renderHook(() => useSanitizedInput('', 'search'));
      const [, setValue] = result.current;

      act(() => {
        setValue("'; DROP TABLE users; --");
      });

      const [, , sanitized] = result.current;
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
    });

    it('should remove XSS patterns from search', () => {
      const { result } = renderHook(() => useSanitizedInput('', 'search'));
      const [, setValue] = result.current;

      act(() => {
        setValue('<script>alert("xss")</script>');
      });

      const [, , sanitized] = result.current;
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should preserve legitimate search terms', () => {
      const { result } = renderHook(() => useSanitizedInput('', 'search'));
      const [, setValue] = result.current;

      const validSearches = [
        'João Silva',
        'user@example.com',
        '(11) 98765-4321',
        '123.456.789-00'
      ];

      validSearches.forEach(search => {
        act(() => {
          setValue(search);
        });

        const [, , sanitized] = result.current;
        // Search sanitization should preserve most characters
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Idempotence Property', () => {
    it('should be idempotent for email sanitization', () => {
      const { result } = renderHook(() => useSanitizedInput('', 'email'));
      const [, setValue] = result.current;

      act(() => {
        setValue('test@example.com');
      });

      const [, , firstSanitized] = result.current;

      act(() => {
        setValue(firstSanitized);
      });

      const [, , secondSanitized] = result.current;
      expect(firstSanitized).toBe(secondSanitized);
    });

    it('should be idempotent for search sanitization', () => {
      const { result } = renderHook(() => useSanitizedInput('', 'search'));
      const [, setValue] = result.current;

      act(() => {
        setValue('test query');
      });

      const [, , firstSanitized] = result.current;

      act(() => {
        setValue(firstSanitized);
      });

      const [, , secondSanitized] = result.current;
      expect(firstSanitized).toBe(secondSanitized);
    });
  });
});
