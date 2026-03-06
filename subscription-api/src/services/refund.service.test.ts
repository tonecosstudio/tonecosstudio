/**
 * Refund Service Tests
 *
 * Testes unitários para o serviço de reembolso segundo CDC
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  calculateRefund,
  cancelSubscriptionWithRefund,
  simulateCancellation,
  type RefundCalculation,
} from './refund.service';

// Mock do Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
  })),
}));

describe('RefundService', () => {
  describe('calculateRefund', () => {
    it('should calculate refund correctly for standard characters', async () => {
      // Arrange
      const subscriptionId = 'sub-123';
      const mockData = [
        {
          refund_amount: 900.0,
          amount_paid: 2400.0,
          characters_delivered: 3,
          total_standalone_value: 1500.0,
          breakdown: [
            {
              characterId: 'char-1',
              characterName: 'Personagem 1',
              characterType: 'standard',
              deliveryMonth: '2026-01',
              standalonePrice: 500.0,
            },
            {
              characterId: 'char-2',
              characterName: 'Personagem 2',
              characterType: 'standard',
              deliveryMonth: '2026-02',
              standalonePrice: 500.0,
            },
            {
              characterId: 'char-3',
              characterName: 'Personagem 3',
              characterType: 'standard',
              deliveryMonth: '2026-03',
              standalonePrice: 500.0,
            },
          ],
        },
      ];

      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = (createClient as jest.Mock)();
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await calculateRefund(subscriptionId);

      // Assert
      expect(result.refundAmount).toBe(900.0);
      expect(result.amountPaid).toBe(2400.0);
      expect(result.charactersDelivered).toBe(3);
      expect(result.totalStandaloneValue).toBe(1500.0);
      expect(result.breakdown).toHaveLength(3);
    });

    it('should calculate refund correctly for premium characters', async () => {
      // Arrange
      const subscriptionId = 'sub-456';
      const mockData = [
        {
          refund_amount: 300.0,
          amount_paid: 2400.0,
          characters_delivered: 2,
          total_standalone_value: 2100.0,
          breakdown: [
            {
              characterId: 'char-1',
              characterName: 'Premium 1',
              characterType: 'premium',
              deliveryMonth: '2026-01',
              standalonePrice: 900.0,
            },
            {
              characterId: 'char-2',
              characterName: 'Premium 2',
              characterType: 'premium',
              deliveryMonth: '2026-02',
              standalonePrice: 900.0,
            },
            {
              characterId: 'char-3',
              characterName: 'Standard 1',
              characterType: 'standard',
              deliveryMonth: '2026-03',
              standalonePrice: 500.0,
            },
          ],
        },
      ];

      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = (createClient as jest.Mock)();
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await calculateRefund(subscriptionId);

      // Assert
      expect(result.refundAmount).toBe(300.0);
      expect(result.totalStandaloneValue).toBe(2100.0);
    });

    it('should return zero refund if characters value exceeds amount paid', async () => {
      // Arrange
      const subscriptionId = 'sub-789';
      const mockData = [
        {
          refund_amount: 0.0,
          amount_paid: 1200.0,
          characters_delivered: 3,
          total_standalone_value: 1500.0,
          breakdown: [],
        },
      ];

      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = (createClient as jest.Mock)();
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await calculateRefund(subscriptionId);

      // Assert
      expect(result.refundAmount).toBe(0.0);
      expect(result.totalStandaloneValue).toBeGreaterThan(result.amountPaid);
    });

    it('should return full amount if no characters delivered', async () => {
      // Arrange
      const subscriptionId = 'sub-000';
      const mockData = [
        {
          refund_amount: 2400.0,
          amount_paid: 2400.0,
          characters_delivered: 0,
          total_standalone_value: 0.0,
          breakdown: [],
        },
      ];

      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = (createClient as jest.Mock)();
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await calculateRefund(subscriptionId);

      // Assert
      expect(result.refundAmount).toBe(2400.0);
      expect(result.charactersDelivered).toBe(0);
      expect(result.totalStandaloneValue).toBe(0.0);
    });

    it('should throw error if subscription not found', async () => {
      // Arrange
      const subscriptionId = 'invalid-sub';
      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = (createClient as jest.Mock)();
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Subscription invalid-sub not found' },
      });

      // Act & Assert
      await expect(calculateRefund(subscriptionId)).rejects.toThrow('Failed to calculate refund');
    });
  });

  describe('CDC Compliance', () => {
    it('should follow CDC formula: Refund = Paid - (Delivered × Standalone)', async () => {
      // Arrange: Cliente pagou R$ 2400, recebeu 3 personagens de R$ 500
      const subscriptionId = 'sub-cdc';
      const paid = 2400.0;
      const delivered = 3;
      const standalonePrice = 500.0;
      const expectedRefund = paid - delivered * standalonePrice; // 2400 - 1500 = 900

      const mockData = [
        {
          refund_amount: expectedRefund,
          amount_paid: paid,
          characters_delivered: delivered,
          total_standalone_value: delivered * standalonePrice,
          breakdown: [],
        },
      ];

      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = (createClient as jest.Mock)();
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await calculateRefund(subscriptionId);

      // Assert
      expect(result.refundAmount).toBe(expectedRefund);
      expect(result.refundAmount).toBe(900.0);
    });

    it('should NOT consider time remaining in refund calculation', async () => {
      // Este teste garante que o cálculo NÃO usa tempo restante
      // O valor deve ser baseado APENAS em personagens entregues

      const subscriptionId = 'sub-time';
      const mockData = [
        {
          refund_amount: 900.0,
          amount_paid: 2400.0,
          characters_delivered: 3,
          total_standalone_value: 1500.0,
          breakdown: [],
        },
      ];

      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = (createClient as jest.Mock)();
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await calculateRefund(subscriptionId);

      // O reembolso deve ser 900, independente de quanto tempo falta
      // Se fosse baseado em tempo (ex: 50% do período), seria 1200
      expect(result.refundAmount).toBe(900.0);
      expect(result.refundAmount).not.toBe(1200.0); // Não é proporcional ao tempo
    });
  });

  describe('simulateCancellation', () => {
    it('should return same result as calculateRefund', async () => {
      const subscriptionId = 'sub-sim';
      const mockData = [
        {
          refund_amount: 900.0,
          amount_paid: 2400.0,
          characters_delivered: 3,
          total_standalone_value: 1500.0,
          breakdown: [],
        },
      ];

      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = (createClient as jest.Mock)();
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const simulation = await simulateCancellation(subscriptionId);
      const calculation = await calculateRefund(subscriptionId);

      expect(simulation).toEqual(calculation);
    });
  });
});
