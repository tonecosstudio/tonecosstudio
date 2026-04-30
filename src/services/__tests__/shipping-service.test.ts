/**
 * Tests for Shipping Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShippingService, Address } from '../shipping-service';

// Mock environment variables
vi.stubEnv('VITE_SHIPPING_CARRIER', 'correios');
vi.stubEnv('VITE_SHIPPING_SERVICE_CODE', '04014');

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-delivery-id',
              subscription_id: 'test-subscription-id',
              subscriptions: {
                user_id: 'test-user-id',
                users: {
                  full_name: 'Test User',
                  phone: '71999999999',
                },
              },
            },
            error: null,
          })),
        })),
        not: vi.fn(() => ({
          in: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
  },
}));

describe('ShippingService', () => {
  let shippingService: ShippingService;
  let validAddress: Address;

  beforeEach(() => {
    shippingService = new ShippingService();
    validAddress = {
      name: 'João Silva',
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apt 45',
      neighborhood: 'Centro',
      city: 'Salvador',
      state: 'BA',
      zipCode: '40000-000',
      phone: '71999999999',
    };
  });

  describe('generateLabel', () => {
    it('should generate a shipping label with tracking code', async () => {
      const result = await shippingService.generateLabel('test-delivery-id', validAddress);

      expect(result).toHaveProperty('trackingCode');
      expect(result).toHaveProperty('labelUrl');
      expect(result).toHaveProperty('cost');
      expect(result.trackingCode).toMatch(/^BR\d{9}BR$/); // Correios format
      expect(result.cost).toBeGreaterThan(0);
    });

    it('should throw error for invalid address', async () => {
      const invalidAddress = { ...validAddress, zipCode: 'invalid' };

      await expect(
        shippingService.generateLabel('test-delivery-id', invalidAddress)
      ).rejects.toThrow('Invalid zip code format');
    });

    it('should throw error for missing required address fields', async () => {
      const incompleteAddress = { ...validAddress, street: '' };

      await expect(
        shippingService.generateLabel('test-delivery-id', incompleteAddress)
      ).rejects.toThrow('Missing required address fields');
    });

    it('should throw error for invalid state code', async () => {
      const invalidAddress = { ...validAddress, state: 'XX' };

      await expect(
        shippingService.generateLabel('test-delivery-id', invalidAddress)
      ).rejects.toThrow('Invalid state code');
    });
  });

  describe('getTrackingStatus', () => {
    it('should return tracking status for valid tracking code', async () => {
      const trackingCode = 'BR123456789BR';
      const status = await shippingService.getTrackingStatus(trackingCode);

      expect(status).toHaveProperty('trackingCode', trackingCode);
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('statusDescription');
      expect(status).toHaveProperty('lastUpdate');
      expect(status).toHaveProperty('delivered');
      expect(status).toHaveProperty('events');
      expect(Array.isArray(status.events)).toBe(true);
    });

    it('should throw error for empty tracking code', async () => {
      await expect(
        shippingService.getTrackingStatus('')
      ).rejects.toThrow('Tracking code is required');
    });

    it('should include tracking events in chronological order', async () => {
      const trackingCode = 'BR123456789BR';
      const status = await shippingService.getTrackingStatus(trackingCode);

      expect(status.events.length).toBeGreaterThan(0);
      expect(status.events[0]).toHaveProperty('date');
      expect(status.events[0]).toHaveProperty('location');
      expect(status.events[0]).toHaveProperty('description');
      expect(status.events[0]).toHaveProperty('status');
    });
  });

  describe('calculateShippingCost', () => {
    it('should calculate shipping cost based on weight', async () => {
      const cost1 = await shippingService.calculateShippingCost(validAddress, 0.5);
      const cost2 = await shippingService.calculateShippingCost(validAddress, 1.0);

      expect(cost1).toBeGreaterThan(0);
      expect(cost2).toBeGreaterThan(cost1); // Heavier package costs more
    });

    it('should add regional surcharge for states outside Bahia', async () => {
      const bahiaAddress = { ...validAddress, state: 'BA' };
      const spAddress = { ...validAddress, state: 'SP' };

      const bahiaCost = await shippingService.calculateShippingCost(bahiaAddress, 0.5);
      const spCost = await shippingService.calculateShippingCost(spAddress, 0.5);

      expect(spCost).toBeGreaterThan(bahiaCost); // SP should have surcharge
    });

    it('should throw error for invalid weight', async () => {
      await expect(
        shippingService.calculateShippingCost(validAddress, 0)
      ).rejects.toThrow('Weight must be greater than 0');

      await expect(
        shippingService.calculateShippingCost(validAddress, -1)
      ).rejects.toThrow('Weight must be greater than 0');
    });
  });

  describe('generateBatchLabels', () => {
    it('should generate labels for multiple deliveries', async () => {
      const deliveryIds = ['delivery-1', 'delivery-2', 'delivery-3'];
      const result = await shippingService.generateBatchLabels(deliveryIds);

      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('failed');
      expect(Array.isArray(result.successful)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);
    });

    it('should handle empty delivery list', async () => {
      const result = await shippingService.generateBatchLabels([]);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('updateTrackingStatuses', () => {
    it('should update tracking statuses for in-transit deliveries', async () => {
      const updatedCount = await shippingService.updateTrackingStatuses();

      expect(typeof updatedCount).toBe('number');
      expect(updatedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Address Validation', () => {
    it('should accept valid Brazilian zip codes', async () => {
      const addresses = [
        { ...validAddress, zipCode: '40000-000' },
        { ...validAddress, zipCode: '40000000' },
        { ...validAddress, zipCode: '01310-100' },
      ];

      for (const address of addresses) {
        await expect(
          shippingService.generateLabel('test-delivery-id', address)
        ).resolves.toBeDefined();
      }
    });

    it('should reject invalid zip codes', async () => {
      const invalidZipCodes = [
        '1234',
        '12345-67',
        'abcde-fgh',
        '12345-6789',
      ];

      for (const zipCode of invalidZipCodes) {
        const address = { ...validAddress, zipCode };
        await expect(
          shippingService.generateLabel('test-delivery-id', address)
        ).rejects.toThrow('Invalid zip code format');
      }
    });

    it('should accept all valid Brazilian state codes', async () => {
      const validStates = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
      ];

      for (const state of validStates) {
        const address = { ...validAddress, state };
        await expect(
          shippingService.generateLabel('test-delivery-id', address)
        ).resolves.toBeDefined();
      }
    }, 20000); // Increase timeout to 20 seconds for testing all states
  });

  describe('Error Handling', () => {
    it('should provide retryable flag for transient errors', async () => {
      try {
        await shippingService.calculateShippingCost(validAddress, -1);
      } catch (error: any) {
        expect(error).toHaveProperty('retryable');
        expect(error.retryable).toBe(false); // Invalid weight is not retryable
      }
    });

    it('should include error codes for different failure types', async () => {
      const testCases = [
        {
          address: { ...validAddress, zipCode: 'invalid' },
          expectedCode: 'INVALID_ZIP_CODE',
        },
        {
          address: { ...validAddress, state: 'XX' },
          expectedCode: 'INVALID_STATE',
        },
        {
          address: { ...validAddress, street: '' },
          expectedCode: 'INVALID_ADDRESS',
        },
      ];

      for (const testCase of testCases) {
        try {
          await shippingService.generateLabel('test-delivery-id', testCase.address);
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error).toHaveProperty('code', testCase.expectedCode);
        }
      }
    });
  });

  describe('Mock Implementation Indicators', () => {
    it('should log mock implementation warnings', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await shippingService.generateLabel('test-delivery-id', validAddress);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MOCK]'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('should generate mock tracking codes in Correios format', async () => {
      const result = await shippingService.generateLabel('test-delivery-id', validAddress);

      // Correios format: BR + 9 digits + BR
      expect(result.trackingCode).toMatch(/^BR\d{9}BR$/);
    });

    it('should generate mock label URLs', async () => {
      const result = await shippingService.generateLabel('test-delivery-id', validAddress);

      expect(result.labelUrl).toContain('mock');
      expect(result.labelUrl).toContain(result.trackingCode);
      expect(result.labelUrl).toContain('.pdf');
    });
  });
});
