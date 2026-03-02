/**
 * Order Management Forms Sanitization Tests
 * 
 * Tests for DeliveryDetailModal and BulkUpdateModal sanitization
 * Validates HTML sanitization for notes fields
 * 
 * Requirements: 1.1, 1.5, 6.5, 6.6
 * Task: 6.3
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHTML } from '@/lib/security/input-sanitizer';

describe('Order Management Forms - Notes Sanitization', () => {
  describe('HTML Sanitization for Notes Fields', () => {
    it('should sanitize XSS attempts in notes', () => {
      const maliciousInput = '<script>alert("XSS")</script>Observação válida';
      const sanitized = sanitizeHTML(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Observação válida');
    });

    it('should preserve safe HTML formatting in notes', () => {
      const safeInput = '<p>Entrega <strong>urgente</strong></p><ul><li>Item 1</li><li>Item 2</li></ul>';
      const sanitized = sanitizeHTML(safeInput);
      
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('<ul>');
      expect(sanitized).toContain('<li>');
      expect(sanitized).toContain('Entrega');
      expect(sanitized).toContain('urgente');
    });

    it('should remove event handlers from notes', () => {
      const maliciousInput = '<p onclick="alert(\'XSS\')">Clique aqui</p>';
      const sanitized = sanitizeHTML(maliciousInput);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Clique aqui');
    });

    it('should remove javascript: URLs from notes', () => {
      const maliciousInput = '<a href="javascript:alert(\'XSS\')">Link malicioso</a>';
      const sanitized = sanitizeHTML(maliciousInput);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('alert');
    });

    it('should preserve plain text notes without HTML', () => {
      const plainText = 'Entrega realizada com sucesso. Cliente satisfeito.';
      const sanitized = sanitizeHTML(plainText);
      
      expect(sanitized).toBe(plainText);
    });

    it('should handle empty notes', () => {
      const emptyInput = '';
      const sanitized = sanitizeHTML(emptyInput);
      
      expect(sanitized).toBe('');
    });

    it('should handle notes with line breaks', () => {
      const inputWithBreaks = 'Linha 1\nLinha 2\nLinha 3';
      const sanitized = sanitizeHTML(inputWithBreaks);
      
      expect(sanitized).toContain('Linha 1');
      expect(sanitized).toContain('Linha 2');
      expect(sanitized).toContain('Linha 3');
    });

    it('should remove dangerous iframe tags', () => {
      const maliciousInput = '<iframe src="http://evil.com"></iframe>Nota válida';
      const sanitized = sanitizeHTML(maliciousInput);
      
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('evil.com');
      expect(sanitized).toContain('Nota válida');
    });

    it('should remove object and embed tags', () => {
      const maliciousInput = '<object data="malicious.swf"></object><embed src="bad.swf">Nota';
      const sanitized = sanitizeHTML(maliciousInput);
      
      expect(sanitized).not.toContain('<object');
      expect(sanitized).not.toContain('<embed');
      expect(sanitized).toContain('Nota');
    });

    it('should preserve safe links in notes', () => {
      const safeInput = '<a href="https://example.com">Link seguro</a>';
      const sanitized = sanitizeHTML(safeInput);
      
      expect(sanitized).toContain('<a');
      expect(sanitized).toContain('href="https://example.com"');
      expect(sanitized).toContain('Link seguro');
    });
  });

  describe('Customer Notes Sanitization', () => {
    it('should sanitize customer feedback with HTML', () => {
      const customerInput = '<p>Produto <em>excelente</em>!</p><script>steal()</script>';
      const sanitized = sanitizeHTML(customerInput);
      
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<em>');
      expect(sanitized).toContain('excelente');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('steal');
    });

    it('should handle special characters in customer notes', () => {
      const specialChars = 'Preço: R$ 100,00 & entrega rápida!';
      const sanitized = sanitizeHTML(specialChars);
      
      expect(sanitized).toContain('R$ 100,00');
      expect(sanitized).toContain('entrega rápida');
    });

    it('should preserve formatted lists in customer notes', () => {
      const listInput = '<ul><li>Qualidade ótima</li><li>Entrega rápida</li><li>Embalagem perfeita</li></ul>';
      const sanitized = sanitizeHTML(listInput);
      
      expect(sanitized).toContain('<ul>');
      expect(sanitized).toContain('<li>');
      expect(sanitized).toContain('Qualidade ótima');
      expect(sanitized).toContain('Entrega rápida');
      expect(sanitized).toContain('Embalagem perfeita');
    });
  });

  describe('Idempotence Property', () => {
    it('should be idempotent for notes sanitization', () => {
      const input = '<p>Nota <strong>importante</strong></p><script>bad()</script>';
      const sanitized1 = sanitizeHTML(input);
      const sanitized2 = sanitizeHTML(sanitized1);
      
      expect(sanitized1).toBe(sanitized2);
    });

    it('should be idempotent for plain text notes', () => {
      const plainText = 'Entrega confirmada para amanhã';
      const sanitized1 = sanitizeHTML(plainText);
      const sanitized2 = sanitizeHTML(sanitized1);
      
      expect(sanitized1).toBe(sanitized2);
      expect(sanitized1).toBe(plainText);
    });

    it('should be idempotent for customer notes with formatting', () => {
      const formatted = '<p>Cliente <em>muito</em> satisfeito</p>';
      const sanitized1 = sanitizeHTML(formatted);
      const sanitized2 = sanitizeHTML(sanitized1);
      
      expect(sanitized1).toBe(sanitized2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long notes', () => {
      const longNote = 'A'.repeat(5000);
      const sanitized = sanitizeHTML(longNote);
      
      expect(sanitized.length).toBeLessThanOrEqual(5000);
    });

    it('should handle notes with only whitespace', () => {
      const whitespaceOnly = '   \n\t   ';
      const sanitized = sanitizeHTML(whitespaceOnly);
      
      expect(sanitized.trim()).toBe('');
    });

    it('should handle notes with unicode characters', () => {
      const unicode = 'Entrega realizada 🎉 Cliente feliz 😊';
      const sanitized = sanitizeHTML(unicode);
      
      expect(sanitized).toContain('🎉');
      expect(sanitized).toContain('😊');
      expect(sanitized).toContain('Entrega realizada');
    });

    it('should handle notes with nested HTML', () => {
      const nested = '<div><p><strong><em>Muito importante</em></strong></p></div>';
      const sanitized = sanitizeHTML(nested);
      
      // div is not in allowed tags, but p, strong, em are
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('<em>');
      expect(sanitized).toContain('Muito importante');
    });

    it('should handle malformed HTML in notes', () => {
      const malformed = '<p>Nota <strong>importante</p></strong>';
      const sanitized = sanitizeHTML(malformed);
      
      // DOMPurify should fix malformed HTML
      expect(sanitized).toContain('Nota');
      expect(sanitized).toContain('importante');
    });
  });
});
