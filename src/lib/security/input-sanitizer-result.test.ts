/**
 * Tests for SanitizationResult functions
 * Validates that the new *WithResult functions return proper modification tracking
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeTextWithResult,
  sanitizeHTMLWithResult,
  sanitizeEmailWithResult,
  sanitizeURLWithResult,
  sanitizePathWithResult,
  sanitizeFilenameWithResult,
  sanitizeSearchQueryWithResult,
  sanitizePhoneNumberWithResult,
} from './input-sanitizer';

describe('sanitizeTextWithResult', () => {
  it('should track HTML tag removal', () => {
    const result = sanitizeTextWithResult('Hello <script>alert("xss")</script> World');
    
    // Tags are removed but content inside remains, then special chars are encoded
    expect(result.value).toContain('Hello');
    expect(result.value).toContain('alert');
    expect(result.value).not.toContain('<script>');
    expect(result.wasModified).toBe(true);
    expect(result.modifications).toBeDefined();
    expect(result.modifications?.some(m => m.includes('Removed') && m.includes('HTML tag'))).toBe(true);
  });

  it('should track special character encoding', () => {
    const result = sanitizeTextWithResult('Hello & <World>');
    
    // Tags are removed first, then special chars are encoded
    expect(result.value).toContain('&amp;');
    expect(result.value).not.toContain('<World>');
    expect(result.wasModified).toBe(true);
    expect(result.modifications).toBeDefined();
    expect(result.modifications?.length).toBeGreaterThan(0);
  });

  it('should indicate no modification for clean text', () => {
    const result = sanitizeTextWithResult('Hello World');
    
    expect(result.value).toBe('Hello World');
    expect(result.wasModified).toBe(false);
    expect(result.modifications).toBeUndefined();
  });
});

describe('sanitizeHTMLWithResult', () => {
  it('should track removed script tags', () => {
    const result = sanitizeHTMLWithResult('<p>Hello</p><script>alert("xss")</script>');
    
    expect(result.value).not.toContain('script');
    expect(result.wasModified).toBe(true);
    expect(result.modifications).toBeDefined();
    expect(result.modifications?.some(m => m.includes('script'))).toBe(true);
  });

  it('should track removed event handlers', () => {
    const result = sanitizeHTMLWithResult('<p onclick="alert()">Click me</p>');
    
    expect(result.value).not.toContain('onclick');
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('event handler'))).toBe(true);
  });

  it('should indicate no modification for safe HTML', () => {
    const result = sanitizeHTMLWithResult('<p>Hello <strong>World</strong></p>');
    
    expect(result.wasModified).toBe(false);
    expect(result.modifications).toBeUndefined();
  });
});

describe('sanitizeEmailWithResult', () => {
  it('should track whitespace removal', () => {
    const result = sanitizeEmailWithResult('  test@example.com  ');
    
    expect(result.value).toBe('test@example.com');
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('whitespace'))).toBe(true);
  });

  it('should track case conversion', () => {
    const result = sanitizeEmailWithResult('Test@Example.COM');
    
    expect(result.value).toBe('test@example.com');
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('lowercase'))).toBe(true);
  });

  it('should return errors for invalid email', () => {
    const result = sanitizeEmailWithResult('not-an-email');
    
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain('Invalid email format');
  });

  it('should indicate no modification for clean email', () => {
    const result = sanitizeEmailWithResult('test@example.com');
    
    expect(result.value).toBe('test@example.com');
    expect(result.wasModified).toBe(false);
    expect(result.modifications).toBeUndefined();
  });
});

describe('sanitizeURLWithResult', () => {
  it('should track URL normalization', () => {
    const result = sanitizeURLWithResult('https://example.com//path/../page');
    
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('normalized'))).toBe(true);
  });

  it('should return errors for invalid protocol', () => {
    const result = sanitizeURLWithResult('javascript:alert(1)');
    
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain('Protocol');
  });

  it('should return errors for invalid URL', () => {
    const result = sanitizeURLWithResult('not a url');
    
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain('Invalid URL format');
  });
});

describe('sanitizePathWithResult', () => {
  it('should track path traversal removal', () => {
    const result = sanitizePathWithResult('../../../etc/passwd');
    
    expect(result.value).not.toContain('..');
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('traversal'))).toBe(true);
  });

  it('should track invalid character removal', () => {
    const result = sanitizePathWithResult('path/with spaces/and!special@chars');
    
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('invalid characters'))).toBe(true);
  });

  it('should indicate no modification for clean path', () => {
    const result = sanitizePathWithResult('path/to/file.txt');
    
    expect(result.value).toBe('path/to/file.txt');
    expect(result.wasModified).toBe(false);
    expect(result.modifications).toBeUndefined();
  });
});

describe('sanitizeFilenameWithResult', () => {
  it('should track path component removal', () => {
    const result = sanitizeFilenameWithResult('/path/to/file.txt');
    
    expect(result.value).toBe('file.txt');
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('path components'))).toBe(true);
  });

  it('should track space replacement', () => {
    const result = sanitizeFilenameWithResult('my file name.txt');
    
    expect(result.value).toBe('my_file_name.txt');
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('spaces'))).toBe(true);
  });

  it('should track special character removal', () => {
    const result = sanitizeFilenameWithResult('file@#$%.txt');
    
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('special characters'))).toBe(true);
  });

  it('should indicate no modification for clean filename', () => {
    const result = sanitizeFilenameWithResult('file.txt');
    
    expect(result.value).toBe('file.txt');
    expect(result.wasModified).toBe(false);
    expect(result.modifications).toBeUndefined();
  });
});

describe('sanitizeSearchQueryWithResult', () => {
  it('should track SQL injection pattern detection', () => {
    const result = sanitizeSearchQueryWithResult('SELECT * FROM users');
    
    expect(result.value).toBe('');
    expect(result.wasModified).toBe(true);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain('SQL injection');
  });

  it('should track dangerous character removal', () => {
    const result = sanitizeSearchQueryWithResult('search <term> {with} [brackets]');
    
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('dangerous'))).toBe(true);
  });

  it('should track length truncation', () => {
    const longQuery = 'a'.repeat(250);
    const result = sanitizeSearchQueryWithResult(longQuery);
    
    expect(result.value.length).toBe(200);
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('Truncated'))).toBe(true);
  });

  it('should indicate no modification for clean query', () => {
    const result = sanitizeSearchQueryWithResult('simple search');
    
    expect(result.value).toBe('simple search');
    expect(result.wasModified).toBe(false);
    expect(result.modifications).toBeUndefined();
  });
});

describe('sanitizePhoneNumberWithResult', () => {
  it('should track non-numeric character removal', () => {
    const result = sanitizePhoneNumberWithResult('(11) 98765-4321');
    
    expect(result.value).toBe('11987654321');
    expect(result.wasModified).toBe(true);
    expect(result.modifications?.some(m => m.includes('non-numeric'))).toBe(true);
  });

  it('should return errors for invalid length', () => {
    const result = sanitizePhoneNumberWithResult('123');
    
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain('10 or 11 digits');
  });

  it('should indicate no modification for clean phone', () => {
    const result = sanitizePhoneNumberWithResult('11987654321');
    
    expect(result.value).toBe('11987654321');
    expect(result.wasModified).toBe(false);
    expect(result.modifications).toBeUndefined();
  });
});
