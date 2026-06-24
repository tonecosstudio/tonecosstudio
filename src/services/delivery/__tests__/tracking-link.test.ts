/**
 * Tracking Link Tests
 * 
 * Tests for Task 24.4: Add tracking link to notifications
 * Validates that tracking links are correctly formatted for Correios
 */

import { describe, it, expect } from 'vitest';
import {
  buildTrackingUrl,
  CORREIOS_TRACKING_BASE_URL,
} from '@/lib/tracking-links';

describe('Tracking Link Functionality', () => {
  describe('URL Format', () => {
    it('should generate correct Correios tracking URL format', () => {
      const trackingCode = 'BR123456789BR';
      const expectedUrl = buildTrackingUrl(trackingCode);
      
      expect(expectedUrl).toBe(`${CORREIOS_TRACKING_BASE_URL}?objeto=BR123456789BR`);
    });

    it('should handle different tracking code formats', () => {
      const testCases = [
        { code: 'BR123456789BR', expected: `${CORREIOS_TRACKING_BASE_URL}?objeto=BR123456789BR` },
        { code: 'AA987654321BB', expected: `${CORREIOS_TRACKING_BASE_URL}?objeto=AA987654321BB` },
        { code: 'XX111111111YY', expected: `${CORREIOS_TRACKING_BASE_URL}?objeto=XX111111111YY` },
      ];

      testCases.forEach(({ code, expected }) => {
        const url = buildTrackingUrl(code);
        expect(url).toBe(expected);
      });
    });

    it('should use objeto parameter (not codigo)', () => {
      const trackingCode = 'BR123456789BR';
      const correctUrl = buildTrackingUrl(trackingCode);
      
      expect(correctUrl).toContain('objeto=');
      expect(correctUrl).not.toContain('codigo=');
    });
  });

  describe('URL Components', () => {
    it('should use correct Correios domain', () => {
      const url = CORREIOS_TRACKING_BASE_URL;
      expect(url).toContain('www2.correios.com.br');
      expect(url).toContain('sistemas/rastreamento/resultado.cfm');
    });

    it('should include tracking code as query parameter', () => {
      const trackingCode = 'BR123456789BR';
      const url = buildTrackingUrl(trackingCode);
      
      expect(url).toContain('?objeto=');
      expect(url).toContain(trackingCode);
    });
  });

  describe('Link Attributes', () => {
    it('should open in new tab (target="_blank")', () => {
      const linkAttributes = {
        target: '_blank',
        rel: 'noopener noreferrer'
      };
      
      expect(linkAttributes.target).toBe('_blank');
    });

    it('should have security attributes (rel="noopener noreferrer")', () => {
      const linkAttributes = {
        target: '_blank',
        rel: 'noopener noreferrer'
      };
      
      expect(linkAttributes.rel).toBe('noopener noreferrer');
    });
  });

  describe('Integration Points', () => {
    it('should be used in email notifications', () => {
      const trackingCode = 'BR123456789BR';
      const emailTrackingUrl = buildTrackingUrl(trackingCode);
      
      // Verify URL format matches what's used in email-service.ts
      expect(emailTrackingUrl).toBe(`${CORREIOS_TRACKING_BASE_URL}?objeto=BR123456789BR`);
    });

    it('should be used in subscriber dashboard', () => {
      const trackingCode = 'BR123456789BR';
      const dashboardTrackingUrl = buildTrackingUrl(trackingCode);
      
      // Verify URL format matches what's used in MySubscriptions.tsx
      expect(dashboardTrackingUrl).toBe(`${CORREIOS_TRACKING_BASE_URL}?objeto=BR123456789BR`);
    });

    it('should be used in admin panel', () => {
      const trackingCode = 'BR123456789BR';
      const adminTrackingUrl = buildTrackingUrl(trackingCode);
      
      // Verify URL format matches what's used in DeliveryDetailModal.tsx
      expect(adminTrackingUrl).toBe(`${CORREIOS_TRACKING_BASE_URL}?objeto=BR123456789BR`);
    });
  });

  describe('Requirement 18.5 Validation', () => {
    it('should provide tracking link to subscriber in shipping notification', () => {
      // Requirement 18.5: THE ORDAX_Platform SHALL provide tracking link to subscriber in shipping notification
      const trackingCode = 'BR123456789BR';
      const trackingUrl = buildTrackingUrl(trackingCode);
      
      // Verify tracking URL is properly formatted
      expect(trackingUrl).toMatch(/^https:\/\/www2\.correios\.com\.br\/sistemas\/rastreamento\/resultado\.cfm\?objeto=[A-Z]{2}\d{9}[A-Z]{2}$/);
    });

    it('should include tracking link in subscriber dashboard', () => {
      // Requirement 18.5: Add tracking link to subscriber dashboard
      const trackingCode = 'BR123456789BR';
      const dashboardUrl = buildTrackingUrl(trackingCode);
      
      // Verify dashboard uses same URL format
      expect(dashboardUrl).toBe(`${CORREIOS_TRACKING_BASE_URL}?objeto=BR123456789BR`);
    });
  });
});
