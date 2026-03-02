/**
 * Input Sanitizer Tests
 * 
 * Tests for sanitization functions with focus on idempotence property
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizePath,
  sanitizeFilename,
  sanitizeSearchQuery,
  sanitizeText,
  detectSQLInjection,
  validateFileUpload,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE
} from './input-sanitizer';

describe('sanitizePath', () => {
  it('should remove path traversal attempts', () => {
    expect(sanitizePath('../etc/passwd')).toBe('etc/passwd');
    expect(sanitizePath('../../secret')).toBe('secret');
    expect(sanitizePath('~/config')).toBe('config');
  });

  it('should remove invalid characters', () => {
    expect(sanitizePath('path<>with|invalid')).toBe('pathwithinvalid');
    expect(sanitizePath('path with spaces')).toBe('pathwithspaces');
  });

  it('should normalize slashes', () => {
    expect(sanitizePath('//path///to////file')).toBe('path/to/file');
    expect(sanitizePath('/leading/slash')).toBe('leading/slash');
  });

  it('should be idempotent', () => {
    const inputs = [
      '../etc/passwd',
      'normal/path/file.txt',
      '//multiple///slashes',
      'path<>with|special',
      ''
    ];

    inputs.forEach(input => {
      const once = sanitizePath(input);
      const twice = sanitizePath(once);
      expect(twice).toBe(once);
    });
  });

  it('should return empty string for invalid input', () => {
    expect(sanitizePath('')).toBe('');
    expect(sanitizePath(null as any)).toBe('');
    expect(sanitizePath(undefined as any)).toBe('');
  });
});

describe('sanitizeFilename', () => {
  it('should remove path components', () => {
    expect(sanitizeFilename('/path/to/file.txt')).toBe('file.txt');
    expect(sanitizeFilename('C:\\Windows\\file.txt')).toBe('file.txt');
    expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd');
  });

  it('should replace spaces with underscores', () => {
    expect(sanitizeFilename('my file.txt')).toBe('my_file.txt');
    expect(sanitizeFilename('multiple   spaces.pdf')).toBe('multiple_spaces.pdf');
  });

  it('should remove special characters', () => {
    expect(sanitizeFilename('file@#$%.txt')).toBe('file.txt');
    expect(sanitizeFilename('file<>|?.doc')).toBe('file.doc');
  });

  it('should remove leading dots', () => {
    expect(sanitizeFilename('.hidden')).toBe('hidden');
    expect(sanitizeFilename('..file.txt')).toBe('file.txt');
  });

  it('should truncate long filenames', () => {
    const longName = 'a'.repeat(300) + '.txt';
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(255);
    expect(result.endsWith('.txt')).toBe(true);
  });

  it('should be idempotent', () => {
    const inputs = [
      '/path/to/file.txt',
      'my file name.pdf',
      'file@#$%.doc',
      'normal-file_123.jpg',
      ''
    ];

    inputs.forEach(input => {
      const once = sanitizeFilename(input);
      const twice = sanitizeFilename(once);
      expect(twice).toBe(once);
    });
  });

  it('should return empty string for invalid input', () => {
    expect(sanitizeFilename('')).toBe('');
    expect(sanitizeFilename(null as any)).toBe('');
    expect(sanitizeFilename(undefined as any)).toBe('');
    expect(sanitizeFilename('.')).toBe('');
    expect(sanitizeFilename('...')).toBe('');
  });
});

describe('sanitizeSearchQuery', () => {
  it('should remove dangerous characters', () => {
    expect(sanitizeSearchQuery('search<script>')).toBe('searchscript');
    expect(sanitizeSearchQuery('query{with}brackets')).toBe('querywithbrackets');
  });

  it('should detect and reject SQL injection patterns', () => {
    expect(sanitizeSearchQuery("' OR 1=1--")).toBe('');
    expect(sanitizeSearchQuery('SELECT * FROM users')).toBe('');
    expect(sanitizeSearchQuery('DROP TABLE users')).toBe('');
    expect(sanitizeSearchQuery('UNION SELECT password')).toBe('');
  });

  it('should limit query length', () => {
    const longQuery = 'a'.repeat(300);
    const result = sanitizeSearchQuery(longQuery);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it('should normalize whitespace', () => {
    expect(sanitizeSearchQuery('  multiple   spaces  ')).toBe('multiple spaces');
    expect(sanitizeSearchQuery('query\n\nwith\nnewlines')).toBe('query with newlines');
  });

  it('should preserve legitimate search terms', () => {
    expect(sanitizeSearchQuery('javascript tutorial')).toBe('javascript tutorial');
    expect(sanitizeSearchQuery('react hooks')).toBe('react hooks');
    expect(sanitizeSearchQuery('node.js')).toBe('node.js');
  });

  it('should be idempotent', () => {
    const inputs = [
      'normal search',
      'search<with>tags',
      'query   with   spaces',
      'a'.repeat(250),
      ''
    ];

    inputs.forEach(input => {
      const once = sanitizeSearchQuery(input);
      const twice = sanitizeSearchQuery(once);
      expect(twice).toBe(once);
    });
  });

  it('should return empty string for invalid input', () => {
    expect(sanitizeSearchQuery('')).toBe('');
    expect(sanitizeSearchQuery(null as any)).toBe('');
    expect(sanitizeSearchQuery(undefined as any)).toBe('');
  });
});

describe('sanitizeText', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert(&quot;xss&quot;)');
    expect(sanitizeText('Hello <b>World</b>')).toBe('Hello World');
  });

  it('should encode special characters', () => {
    expect(sanitizeText('a & b')).toBe('a &amp; b');
    expect(sanitizeText('a < b')).toBe('a &lt; b');
    expect(sanitizeText('a > b')).toBe('a &gt; b');
  });

  it('should be idempotent', () => {
    const inputs = [
      'normal text',
      '<script>alert("xss")</script>',
      'text with & special < characters >',
      ''
    ];

    inputs.forEach(input => {
      const once = sanitizeText(input);
      const twice = sanitizeText(once);
      expect(twice).toBe(once);
    });
  });
});

describe('detectSQLInjection', () => {
  it('should detect SQL keywords', () => {
    expect(detectSQLInjection('SELECT * FROM users')).toBe(true);
    expect(detectSQLInjection('DROP TABLE users')).toBe(true);
    expect(detectSQLInjection('INSERT INTO users')).toBe(true);
    expect(detectSQLInjection('DELETE FROM users')).toBe(true);
  });

  it('should detect SQL injection patterns', () => {
    expect(detectSQLInjection("' OR 1=1--")).toBe(true);
    expect(detectSQLInjection("admin'--")).toBe(true);
    expect(detectSQLInjection('UNION SELECT password')).toBe(true);
  });

  it('should not flag normal text', () => {
    expect(detectSQLInjection('normal search query')).toBe(false);
    expect(detectSQLInjection('javascript tutorial')).toBe(false);
  });
});

describe('validateFileUpload', () => {
  it('should validate file size', () => {
    const largeFile = new File(['x'.repeat(MAX_IMAGE_SIZE + 1)], 'large.jpg', {
      type: 'image/jpeg'
    });
    const result = validateFileUpload(largeFile, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('muito grande');
  });

  it('should validate file type', () => {
    const invalidFile = new File(['content'], 'file.exe', {
      type: 'application/x-msdownload'
    });
    const result = validateFileUpload(invalidFile, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('não permitido');
  });

  it('should accept valid files', () => {
    const validFile = new File(['content'], 'image.jpg', {
      type: 'image/jpeg'
    });
    const result = validateFileUpload(validFile, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
