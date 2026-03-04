// @ts-nocheck
/**
 * Tests for AdminModels (Product Management) Form Sanitization
 * Task: 6.2 Retrofit Product Management form (/admin/products)
 * Requirements: 1.1, 1.2, 1.5
 */

import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeSearchQuery } from '@/lib/security/input-sanitizer';

describe('AdminModels - Product Name Sanitization', () => {
  it('should sanitize product name with XSS attempt', () => {
    const maliciousInput = '<script>alert("xss")</script>Product Name';
    const sanitized = sanitizeText(maliciousInput);
    
    // Script tags are removed, but the text content is HTML-encoded
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Product Name');
  });

  it('should preserve valid product name', () => {
    const validInput = 'LEGO Star Wars Millennium Falcon';
    const sanitized = sanitizeText(validInput);
    
    expect(sanitized).toBe(validInput);
  });

  it('should sanitize product name with HTML tags', () => {
    const htmlInput = '<b>Bold Product</b> <i>Name</i>';
    const sanitized = sanitizeText(htmlInput);
    
    expect(sanitized).not.toContain('<b>');
    expect(sanitized).not.toContain('<i>');
    expect(sanitized).toContain('Bold Product');
    expect(sanitized).toContain('Name');
  });
});

describe('AdminModels - Category Sanitization', () => {
  it('should sanitize category with special characters', () => {
    const maliciousInput = 'Category<script>alert(1)</script>';
    const sanitized = sanitizeText(maliciousInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Category');
  });

  it('should preserve valid category name', () => {
    const validInput = 'Action Figures';
    const sanitized = sanitizeText(validInput);
    
    expect(sanitized).toBe(validInput);
  });

  it('should handle category with accents', () => {
    const accentInput = 'Miniaturas & Acessórios';
    const sanitized = sanitizeText(accentInput);
    
    expect(sanitized).toContain('Miniaturas');
    expect(sanitized).toContain('Acessórios');
  });
});

describe('AdminModels - Franchise Sanitization', () => {
  it('should sanitize franchise with XSS attempt', () => {
    const maliciousInput = 'Star Wars<img src=x onerror=alert(1)>';
    const sanitized = sanitizeText(maliciousInput);
    
    expect(sanitized).not.toContain('<img');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).toContain('Star Wars');
  });

  it('should preserve valid franchise name', () => {
    const validInput = 'Marvel Cinematic Universe';
    const sanitized = sanitizeText(validInput);
    
    expect(sanitized).toBe(validInput);
  });
});

describe('AdminModels - Tags Sanitization', () => {
  it('should sanitize tags with XSS attempt', () => {
    const maliciousInput = 'lego, <script>alert("xss")</script>, star-wars';
    const sanitized = sanitizeText(maliciousInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('lego');
    expect(sanitized).toContain('star-wars');
  });

  it('should preserve valid comma-separated tags', () => {
    const validInput = 'lego, star-wars, millennium-falcon, collectible';
    const sanitized = sanitizeText(validInput);
    
    expect(sanitized).toBe(validInput);
  });

  it('should handle tags with special characters', () => {
    const specialInput = 'tag1, tag&special, tag#3';
    const sanitized = sanitizeText(specialInput);
    
    expect(sanitized).toContain('tag1');
    expect(sanitized).toContain('tag');
  });
});

describe('AdminModels - Search Query Sanitization', () => {
  it('should sanitize search with SQL injection attempt', () => {
    const sqlInjection = "'; DROP TABLE models; --";
    const sanitized = sanitizeSearchQuery(sqlInjection);
    
    expect(sanitized).not.toContain('DROP TABLE');
    expect(sanitized).not.toContain('--');
  });

  it('should sanitize search with XSS attempt', () => {
    const xssAttempt = '<script>alert("xss")</script>LEGO';
    const sanitized = sanitizeSearchQuery(xssAttempt);
    
    // Search sanitization removes script tags and their content
    expect(sanitized).not.toContain('<script>');
    // The remaining text may be empty or sanitized depending on implementation
  });

  it('should preserve legitimate search terms', () => {
    const validSearch = 'Star Wars Millennium Falcon';
    const sanitized = sanitizeSearchQuery(validSearch);
    
    expect(sanitized).toBe(validSearch);
  });

  it('should handle search with special characters', () => {
    const specialSearch = 'LEGO® Star Wars™';
    const sanitized = sanitizeSearchQuery(specialSearch);
    
    expect(sanitized).toContain('LEGO');
    expect(sanitized).toContain('Star Wars');
  });
});

describe('AdminModels - Idempotence Property', () => {
  it('should be idempotent for product name sanitization', () => {
    const input = '<script>alert("xss")</script>Product Name';
    const sanitized1 = sanitizeText(input);
    const sanitized2 = sanitizeText(sanitized1);
    
    expect(sanitized1).toBe(sanitized2);
  });

  it('should be idempotent for search query sanitization', () => {
    const input = "'; DROP TABLE models; --LEGO";
    const sanitized1 = sanitizeSearchQuery(input);
    const sanitized2 = sanitizeSearchQuery(sanitized1);
    
    expect(sanitized1).toBe(sanitized2);
  });

  it('should be idempotent for category sanitization', () => {
    const input = 'Category<img src=x onerror=alert(1)>';
    const sanitized1 = sanitizeText(input);
    const sanitized2 = sanitizeText(sanitized1);
    
    expect(sanitized1).toBe(sanitized2);
  });
});
