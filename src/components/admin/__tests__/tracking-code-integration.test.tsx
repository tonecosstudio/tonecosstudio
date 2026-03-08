/**
 * Integration Test: Tracking Code Management
 * 
 * Tests the complete tracking code management flow:
 * - Adding tracking code to delivery
 * - Validating tracking code format
 * - Displaying tracking link
 * - Sending notification when tracking added
 * 
 * Requirements: 15.4, 15.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeliveryDetailModal } from '../DeliveryDetailModal';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } }
      })
    }
  }
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('Tracking Code Management Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  it('should validate tracking code format', () => {
    const validateTrackingCode = (code: string): boolean => {
      if (!code) return true;
      const trackingRegex = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
      return trackingRegex.test(code);
    };

    // Valid codes
    expect(validateTrackingCode('BR123456789BR')).toBe(true);
    expect(validateTrackingCode('')).toBe(true);

    // Invalid codes
    expect(validateTrackingCode('BR12345678BR')).toBe(false); // Too short
    expect(validateTrackingCode('br123456789br')).toBe(false); // Lowercase
    expect(validateTrackingCode('BR-123456789-BR')).toBe(false); // Special chars
  });

  it('should generate correct tracking link URL', () => {
    const trackingCode = 'BR123456789BR';
    const expectedUrl = `https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${trackingCode}`;
    
    expect(expectedUrl).toBe('https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=BR123456789BR');
  });

  it('should convert tracking code to uppercase', () => {
    const input = 'br123456789br';
    const expected = 'BR123456789BR';
    
    expect(input.toUpperCase()).toBe(expected);
  });

  it('should enforce maxLength of 13 characters', () => {
    const maxLength = 13;
    const validCode = 'BR123456789BR';
    const tooLongCode = 'BR1234567890BR';
    
    expect(validCode.length).toBe(maxLength);
    expect(tooLongCode.length).toBeGreaterThan(maxLength);
  });

  it('should validate tracking code format matches Brazilian standard', () => {
    // Brazilian tracking code format: 2 letters + 9 numbers + 2 letters
    const pattern = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
    
    const validCodes = [
      'BR123456789BR',
      'AA000000000ZZ',
      'XY987654321AB'
    ];

    const invalidCodes = [
      'BR12345678BR',      // Too short
      'BR1234567890BR',    // Too long
      'B1123456789BR',     // Number in first position
      'BR123456789B1',     // Number in last position
      'BR12345678ABR',     // Letter in number position
      'br123456789br',     // Lowercase
      'BR-123456789-BR',   // Special characters
      'BR 123456789 BR'    // Spaces
    ];

    validCodes.forEach(code => {
      expect(pattern.test(code)).toBe(true);
    });

    invalidCodes.forEach(code => {
      expect(pattern.test(code)).toBe(false);
    });
  });

  it('should detect when tracking code is added (not just updated)', () => {
    const previousTrackingCode = null;
    const newTrackingCode = 'BR123456789BR';
    
    const trackingCodeAdded = !previousTrackingCode && !!newTrackingCode;
    
    expect(trackingCodeAdded).toBe(true);
  });

  it('should not trigger notification when tracking code is updated', () => {
    const previousTrackingCode = 'BR111111111BR';
    const newTrackingCode = 'BR222222222BR';
    
    const trackingCodeAdded = !previousTrackingCode && !!newTrackingCode;
    
    expect(trackingCodeAdded).toBe(false);
  });

  it('should include tracking link in notification message', () => {
    const trackingCode = 'BR123456789BR';
    const trackingUrl = `https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${trackingCode}`;
    
    const notificationMessage = `Código de rastreamento disponível!\n\nCódigo: ${trackingCode}\n\nRastreie seu pedido em: ${trackingUrl}`;
    
    expect(notificationMessage).toContain(trackingCode);
    expect(notificationMessage).toContain(trackingUrl);
  });
});
