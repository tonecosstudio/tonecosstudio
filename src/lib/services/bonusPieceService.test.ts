import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { supabase } from '@/integrations/supabase/client';
import { bonusPieceService, type BonusPiece, type BonusStatus } from './bonusPieceService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const mockBonusPiece: BonusPiece = {
  id: 'bonus-1',
  created_at: '2026-03-01T00:00:00-03:00',
  updated_at: '2026-03-01T00:00:00-03:00',
  subscription_id: 'sub-1',
  delivery_id: null,
  description: 'Peca exclusiva edicao limitada',
  status: 'pending',
  prepared_at: null,
  shipped_at: null,
};

function mockSelectResult(result: unknown) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(result),
        order: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

describe('BonusPieceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mutations', () => {
    it('creates a bonus piece through the canonical RPC', async () => {
      const subscriptionId = 'sub-semestral-123';
      const description = 'Peca exclusiva edicao limitada';
      const expected = { ...mockBonusPiece, subscription_id: subscriptionId, description };
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: expected, error: null });

      const bonus = await bonusPieceService.createBonusPiece(subscriptionId, description);

      expect(bonus).toEqual(expected);
      expect(supabase.rpc).toHaveBeenCalledWith('admin_create_bonus_piece', {
        p_subscription_id: subscriptionId,
        p_description: description,
      });
    });

    it('normalizes missing description to null when creating a bonus piece', async () => {
      const expected = { ...mockBonusPiece, description: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: expected, error: null });

      const bonus = await bonusPieceService.createBonusPiece('sub-semestral-456');

      expect(bonus.description).toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('admin_create_bonus_piece', {
        p_subscription_id: 'sub-semestral-456',
        p_description: null,
      });
    });

    it('propagates create RPC errors with a stable message', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(bonusPieceService.createBonusPiece('sub-1')).rejects.toThrow('Database error');
    });

    it('links a bonus piece to a delivery through RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockBonusPiece, error: null });

      await bonusPieceService.linkBonusToDelivery('bonus-123', 'delivery-6');

      expect(supabase.rpc).toHaveBeenCalledWith('admin_link_bonus_piece_to_delivery', {
        p_bonus_id: 'bonus-123',
        p_delivery_id: 'delivery-6',
      });
    });

    it('updates bonus status through RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { ...mockBonusPiece, status: 'prepared' },
        error: null,
      });

      await bonusPieceService.updateBonusStatus('bonus-123', 'prepared');

      expect(supabase.rpc).toHaveBeenCalledWith('admin_update_bonus_piece_status', {
        p_bonus_id: 'bonus-123',
        p_status: 'prepared',
      });
    });
  });

  describe('queries', () => {
    it('returns bonus piece by subscription', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        mockSelectResult({ data: { ...mockBonusPiece, subscription_id: 'sub-123' }, error: null }) as never
      );

      const bonus = await bonusPieceService.getBonusBySubscription('sub-123');

      expect(bonus?.subscription_id).toBe('sub-123');
      expect(supabase.from).toHaveBeenCalledWith('bonus_pieces');
    });

    it('returns null when subscription has no bonus piece', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        mockSelectResult({ data: null, error: { code: 'PGRST116' } }) as never
      );

      const bonus = await bonusPieceService.getBonusBySubscription('sub-empty');

      expect(bonus).toBeNull();
    });

    it('throws non-not-found subscription query errors', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        mockSelectResult({ data: null, error: { code: 'PGRST000', message: 'Database error' } }) as never
      );

      await expect(bonusPieceService.getBonusBySubscription('sub-1')).rejects.toThrow(
        'Erro ao buscar peca bonus: Database error'
      );
    });

    it('returns bonus pieces by cycle without leaking joined delivery data', async () => {
      const cycleId = 'cycle-1';
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [
              { ...mockBonusPiece, id: 'bonus-1', delivery: { cycle_id: cycleId } },
              { ...mockBonusPiece, id: 'bonus-2', delivery: { cycle_id: cycleId } },
            ],
            error: null,
          }),
        })),
      } as never);

      const bonuses = await bonusPieceService.getBonusesByCycle(cycleId);

      expect(bonuses).toHaveLength(2);
      expect(bonuses[0]).not.toHaveProperty('delivery');
    });

    it('returns pending bonuses ordered by creation date', async () => {
      const pendingBonuses = [
        { ...mockBonusPiece, id: 'bonus-1', status: 'pending' as BonusStatus },
        { ...mockBonusPiece, id: 'bonus-2', status: 'pending' as BonusStatus },
      ];
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: pendingBonuses, error: null }),
          })),
        })),
      } as never);

      const bonuses = await bonusPieceService.getPendingBonuses();

      expect(bonuses).toEqual(pendingBonuses);
    });
  });

  describe('bonus business invariants', () => {
    it('assigns bonus eligibility only to the sixth semestral delivery', () => {
      fc.assert(
        fc.property(
          fc.record({
            planType: fc.constantFrom('trimestral' as const, 'semestral' as const),
            deliveryNumber: fc.integer({ min: 1, max: 6 }),
          }),
          ({ planType, deliveryNumber }) => {
            const hasBonusPiece = planType === 'semestral' && deliveryNumber === 6;

            if (planType === 'trimestral') {
              expect(hasBonusPiece).toBe(false);
            } else {
              expect(hasBonusPiece).toBe(deliveryNumber === 6);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
