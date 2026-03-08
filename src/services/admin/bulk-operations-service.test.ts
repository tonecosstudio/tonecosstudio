/**
 * Tests for Bulk Operations Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkAssignProduction, bulkUpdateStage } from './bulk-operations-service';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('bulk-operations-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bulkAssignProduction', () => {
    it('successfully assigns items to a user', async () => {
      const mockUser = { full_name: 'João Silva', email: 'joao@example.com' };
      
      // Mock user fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      // Mock successful updates
      const itemIds = ['item-1', 'item-2'];
      itemIds.forEach(() => {
        (supabase.from as any).mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });
      });

      const result = await bulkAssignProduction(itemIds, 'user-1');

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('handles partial failures', async () => {
      const mockUser = { full_name: 'João Silva', email: 'joao@example.com' };
      
      // Mock user fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      // Mock one success and one failure
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await bulkAssignProduction(['item-1', 'item-2'], 'user-1');

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('bulkUpdateStage', () => {
    it('successfully updates stages with valid transitions', async () => {
      const mockItems = [
        { id: 'item-1', current_stage: 'design', customer_name: 'João' },
        { id: 'item-2', current_stage: 'design', customer_name: 'Maria' },
      ];

      // Mock items fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
        }),
      });

      // Mock successful updates
      mockItems.forEach(() => {
        (supabase.from as any).mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });
      });

      const result = await bulkUpdateStage(['item-1', 'item-2'], 'production');

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('rejects invalid stage transitions', async () => {
      const mockItems = [
        { id: 'item-1', current_stage: 'design', customer_name: 'João' },
      ];

      // Mock items fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
        }),
      });

      // Try to skip stages (design -> shipped)
      const result = await bulkUpdateStage(['item-1'], 'shipped');

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Não é possível avançar');
    });

    it('allows moving forward one stage', async () => {
      const mockItems = [
        { id: 'item-1', current_stage: 'production', customer_name: 'João' },
      ];

      // Mock items fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
        }),
      });

      // Mock successful update
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await bulkUpdateStage(['item-1'], 'quality_check');

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('handles fetch errors', async () => {
      // Mock fetch error
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch failed' } }),
        }),
      });

      const result = await bulkUpdateStage(['item-1'], 'production');

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Erro ao buscar itens');
    });
  });
});
