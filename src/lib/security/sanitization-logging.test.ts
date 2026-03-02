/**
 * Tests for sanitization event logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logSanitizationEvent, SanitizationResult } from './input-sanitizer';
import * as errorTracking from '@/lib/error-tracking';

// Mock error-tracking module
vi.mock('@/lib/error-tracking', () => ({
  errorTracking: {
    log: vi.fn(),
    addBreadcrumb: vi.fn()
  },
  ErrorSeverity: {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    FATAL: 'fatal'
  }
}));

describe('logSanitizationEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not log when input was not modified', () => {
    const result: SanitizationResult = {
      value: 'clean input',
      wasModified: false
    };

    logSanitizationEvent('username', 'text', result);

    expect(errorTracking.errorTracking.log).not.toHaveBeenCalled();
    expect(errorTracking.errorTracking.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('should log with INFO severity when input was modified without errors', () => {
    const result: SanitizationResult = {
      value: 'sanitized input',
      wasModified: true,
      modifications: ['Removed HTML tags']
    };

    logSanitizationEvent('bio', 'html', result);

    expect(errorTracking.errorTracking.log).toHaveBeenCalledWith(
      'Sanitization modified input in field "bio"',
      errorTracking.ErrorSeverity.INFO,
      expect.objectContaining({
        fieldName: 'bio',
        sanitizationType: 'html',
        wasModified: true,
        modifications: ['Removed HTML tags']
      })
    );

    expect(errorTracking.errorTracking.addBreadcrumb).toHaveBeenCalledWith(
      'Sanitization: bio',
      'sanitization',
      expect.objectContaining({
        type: 'html',
        modified: true,
        modifications: 'Removed HTML tags'
      })
    );
  });

  it('should log with WARNING severity when input has errors', () => {
    const result: SanitizationResult = {
      value: '',
      wasModified: true,
      modifications: ['Removed invalid characters'],
      errors: ['Invalid email format']
    };

    logSanitizationEvent('email', 'email', result);

    expect(errorTracking.errorTracking.log).toHaveBeenCalledWith(
      'Sanitization modified input in field "email"',
      errorTracking.ErrorSeverity.WARNING,
      expect.objectContaining({
        fieldName: 'email',
        sanitizationType: 'email',
        wasModified: true,
        errors: ['Invalid email format']
      })
    );
  });

  it('should include additional context in log', () => {
    const result: SanitizationResult = {
      value: 'sanitized',
      wasModified: true,
      modifications: ['Removed script tags']
    };

    const context = {
      formName: 'contactForm',
      userId: '12345'
    };

    logSanitizationEvent('message', 'text', result, context);

    expect(errorTracking.errorTracking.log).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        formName: 'contactForm',
        userId: '12345'
      })
    );
  });

  it('should handle multiple modifications', () => {
    const result: SanitizationResult = {
      value: 'clean',
      wasModified: true,
      modifications: [
        'Removed script tags',
        'Removed event handlers',
        'Sanitized URLs'
      ]
    };

    logSanitizationEvent('content', 'html', result);

    expect(errorTracking.errorTracking.addBreadcrumb).toHaveBeenCalledWith(
      'Sanitization: content',
      'sanitization',
      expect.objectContaining({
        modifications: 'Removed script tags, Removed event handlers, Sanitized URLs'
      })
    );
  });
});
