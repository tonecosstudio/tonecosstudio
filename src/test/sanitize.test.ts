/**
 * Sanitization Service Tests
 * 
 * Tests for XSS protection and input sanitization
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeGroupMessage,
  sanitizeFilename,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObject,
  sanitizeProfile,
  createSafeHtml,
} from '@/lib/utils/sanitize';

describe('Sanitization Service', () => {
  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const output = sanitizeHtml(input);
      
      expect(output).toContain('<p>');
      expect(output).toContain('<strong>');
      expect(output).toContain('Hello');
      expect(output).toContain('World');
    });

    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const output = sanitizeHtml(input);
      
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('alert');
      expect(output).toContain('Hello');
    });

    it('should remove event handlers', () => {
      const input = '<p onclick="alert(\'XSS\')">Click me</p>';
      const output = sanitizeHtml(input);
      
      expect(output).not.toContain('onclick');
      expect(output).not.toContain('alert');
      expect(output).toContain('Click me');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const output = sanitizeHtml(input);
      
      expect(output).not.toContain('javascript:');
      expect(output).toContain('Link');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const output = sanitizeText(input);
      
      expect(output).not.toContain('<p>');
      expect(output).not.toContain('<strong>');
      expect(output).toContain('Hello');
      expect(output).toContain('World');
    });

    it('should remove script tags and content', () => {
      const input = 'Hello<script>alert("XSS")</script>World';
      const output = sanitizeText(input);
      
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('alert');
    });

    it('should handle plain text', () => {
      const input = 'Plain text without HTML';
      const output = sanitizeText(input);
      
      expect(output).toBe(input);
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow safe URLs', () => {
      const input = 'https://example.com/page';
      const output = sanitizeUrl(input);
      
      expect(output).toBe(input);
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("XSS")';
      const output = sanitizeUrl(input);
      
      expect(output).toBe('');
    });

    it('should remove data: protocol', () => {
      const input = 'data:text/html,<script>alert("XSS")</script>';
      const output = sanitizeUrl(input);
      
      expect(output).toBe('');
    });

    it('should remove vbscript: protocol', () => {
      const input = 'vbscript:msgbox("XSS")';
      const output = sanitizeUrl(input);
      
      expect(output).toBe('');
    });

    it('should handle empty input', () => {
      expect(sanitizeUrl('')).toBe('');
    });
  });

  describe('sanitizeGroupMessage', () => {
    it('should allow basic formatting', () => {
      const input = 'Hello <b>World</b>';
      const output = sanitizeGroupMessage(input);
      
      expect(output).toContain('<b>');
      expect(output).toContain('World');
    });

    it('should remove dangerous tags', () => {
      const input = 'Hello <script>alert("XSS")</script>';
      const output = sanitizeGroupMessage(input);
      
      expect(output).not.toContain('<script>');
      expect(output).toContain('Hello');
    });

    it('should remove event handlers', () => {
      const input = '<b onclick="alert(\'XSS\')">Bold</b>';
      const output = sanitizeGroupMessage(input);
      
      expect(output).not.toContain('onclick');
      expect(output).toContain('Bold');
    });
  });

  describe('sanitizeFilename', () => {
    it('should allow safe filenames', () => {
      const input = 'document.pdf';
      const output = sanitizeFilename(input);
      
      expect(output).toBe(input);
    });

    it('should remove path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const output = sanitizeFilename(input);
      
      expect(output).not.toContain('..');
      expect(output).not.toContain('/');
      expect(output).toBe('etcpasswd');
    });

    it('should remove path separators', () => {
      const input = 'path/to/file.txt';
      const output = sanitizeFilename(input);
      
      expect(output).not.toContain('/');
      expect(output).toBe('pathtofile.txt');
    });

    it('should remove null bytes', () => {
      const input = 'file\0name.txt';
      const output = sanitizeFilename(input);
      
      expect(output).not.toContain('\0');
      expect(output).toBe('filename.txt');
    });

    it('should limit length', () => {
      const input = 'a'.repeat(300);
      const output = sanitizeFilename(input);
      
      expect(output.length).toBeLessThanOrEqual(255);
    });

    it('should handle empty input', () => {
      expect(sanitizeFilename('')).toBe('');
      expect(sanitizeFilename(null as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should allow valid emails', () => {
      const input = 'user@example.com';
      const output = sanitizeEmail(input);
      
      expect(output).toBe(input);
    });

    it('should normalize to lowercase', () => {
      const input = 'User@Example.COM';
      const output = sanitizeEmail(input);
      
      expect(output).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      const input = '  user@example.com  ';
      const output = sanitizeEmail(input);
      
      expect(output).toBe('user@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('invalid')).toBe('');
      expect(sanitizeEmail('invalid@')).toBe('');
      expect(sanitizeEmail('@example.com')).toBe('');
      expect(sanitizeEmail('user@')).toBe('');
    });

    it('should handle empty input', () => {
      expect(sanitizeEmail('')).toBe('');
      expect(sanitizeEmail(null as any)).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('should allow valid phone numbers', () => {
      const input = '+55 71 99999-9999';
      const output = sanitizePhone(input);
      
      expect(output).toContain('+55');
      expect(output).toContain('71');
      expect(output).toContain('99999');
    });

    it('should remove invalid characters', () => {
      const input = '+55 (71) 99999-9999 ext. 123';
      const output = sanitizePhone(input);
      
      expect(output).not.toContain('ext');
      expect(output).not.toContain('.');
    });

    it('should handle empty input', () => {
      expect(sanitizePhone('')).toBe('');
      expect(sanitizePhone(null as any)).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values', () => {
      const input = {
        name: '<script>alert("XSS")</script>John',
        email: 'john@example.com',
        bio: '<p>Hello <script>alert("XSS")</script></p>',
      };
      
      const output = sanitizeObject(input);
      
      expect(output.name).not.toContain('<script>');
      expect(output.name).toContain('John');
      expect(output.email).toBe('john@example.com');
      expect(output.bio).not.toContain('<script>');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<script>alert("XSS")</script>John',
          profile: {
            bio: '<p>Hello</p><script>alert("XSS")</script>',
          },
        },
      };
      
      const output = sanitizeObject(input);
      
      expect(output.user.name).not.toContain('<script>');
      expect(output.user.profile.bio).not.toContain('<script>');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['<script>alert("XSS")</script>tag1', 'tag2'],
      };
      
      const output = sanitizeObject(input);
      
      expect(output.tags[0]).not.toContain('<script>');
      expect(output.tags[1]).toBe('tag2');
    });

    it('should preserve non-string values', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        data: null,
      };
      
      const output = sanitizeObject(input);
      
      expect(output.age).toBe(30);
      expect(output.active).toBe(true);
      expect(output.data).toBeNull();
    });
  });

  describe('sanitizeProfile', () => {
    it('should sanitize profile data', () => {
      const input = {
        full_name: '<script>alert("XSS")</script>John Doe',
        bio: '<p>Hello</p><script>alert("XSS")</script>',
        email: 'john@example.com',
      };
      
      const output = sanitizeProfile(input);
      
      expect(output.full_name).not.toContain('<script>');
      expect(output.full_name).toContain('John Doe');
      expect(output.bio).not.toContain('<script>');
      expect(output.bio).toContain('Hello');
    });

    it('should handle missing fields', () => {
      const input = {
        email: 'john@example.com',
      };
      
      const output = sanitizeProfile(input);
      
      expect(output.full_name).toBeUndefined();
      expect(output.bio).toBeUndefined();
      expect(output.email).toBe('john@example.com');
    });
  });

  describe('createSafeHtml', () => {
    it('should create safe HTML object', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const output = createSafeHtml(input);
      
      expect(output).toHaveProperty('__html');
      expect(output.__html).toContain('<p>');
      expect(output.__html).toContain('<strong>');
    });

    it('should remove dangerous content', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const output = createSafeHtml(input);
      
      expect(output.__html).not.toContain('<script>');
      expect(output.__html).toContain('Hello');
    });
  });

  describe('XSS Attack Vectors', () => {
    const xssVectors = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<marquee onstart=alert("XSS")>',
      '<div style="background:url(javascript:alert(\'XSS\'))">',
    ];

    xssVectors.forEach((vector, index) => {
      it(`should block XSS vector ${index + 1}`, () => {
        const output = sanitizeHtml(vector);
        
        expect(output).not.toContain('alert');
        expect(output).not.toContain('javascript:');
        expect(output).not.toContain('onerror');
        expect(output).not.toContain('onload');
        expect(output).not.toContain('onfocus');
        expect(output).not.toContain('onstart');
      });
    });
  });
});

