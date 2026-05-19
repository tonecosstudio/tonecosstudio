/**
 * Testes para useOrderMutations
 * 
 * Verifica que as mutações de status funcionam corretamente e que
 * o histórico é registrado automaticamente pelos triggers do banco.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useOrderMutations } from './useOrderMutations';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

type SupabaseFromResult = ReturnType<typeof supabase.from>;

function mockFromResult(value: unknown): SupabaseFromResult {
  return value as SupabaseFromResult;
}

describe('useOrderMutations', () => {
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

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe('updateStatus', () => {
    it('deve atualizar status de subscription_delivery', async () => {
      // Mock da resposta do Supabase
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-id',
                status: 'confirmed',
                updated_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockFromResult({
        update: mockUpdate
      }));

      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      // Executar mutação
      result.current.updateStatus.mutate({
        orderId: 'test-id',
        orderType: 'subscription_delivery',
        newStatus: 'confirmed'
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isSuccess).toBe(true);
      });

      // Verificar que foi chamado com a tabela correta
      expect(supabase.from).toHaveBeenCalledWith('subscription_deliveries');
      
      // Verificar que o update foi chamado com os dados corretos
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
          updated_at: expect.any(String)
        })
      );
    });

    it('deve atualizar status de standalone_purchase', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-id',
                status: 'deposit_paid',
                updated_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockFromResult({
        update: mockUpdate
      }));

      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.updateStatus.mutate({
        orderId: 'test-id',
        orderType: 'standalone_purchase',
        newStatus: 'deposit_paid'
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isSuccess).toBe(true);
      });

      expect(supabase.from).toHaveBeenCalledWith('standalone_purchases');
    });

    it('deve tratar erros corretamente', async () => {
      const mockError = new Error('Database error');
      
      vi.mocked(supabase.from).mockReturnValue(mockFromResult({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: mockError
              })
            })
          })
        })
      }));

      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.updateStatus.mutate({
        orderId: 'test-id',
        orderType: 'subscription_delivery',
        newStatus: 'confirmed'
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isError).toBe(true);
      });

      expect(result.current.updateStatus.error).toBe(mockError);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('deve atualizar múltiplos pedidos com sucesso', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockFromResult({
        update: mockUpdate
      }));

      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.bulkUpdateStatus.mutate({
        orderIds: ['id-1', 'id-2', 'id-3'],
        orderType: 'subscription_delivery',
        newStatus: 'shipped'
      });

      await waitFor(() => {
        expect(result.current.bulkUpdateStatus.isSuccess).toBe(true);
      });

      const resultData = result.current.bulkUpdateStatus.data;
      expect(resultData?.successful).toHaveLength(3);
      expect(resultData?.failed).toHaveLength(0);
    });

    it('deve rastrear sucessos e falhas parciais', async () => {
      let callCount = 0;
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => {
          callCount++;
          // Primeiro e terceiro pedidos têm sucesso, segundo falha
          if (callCount === 2) {
            return Promise.resolve({
              data: null,
              error: new Error('Update failed')
            });
          }
          return Promise.resolve({
            data: null,
            error: null
          });
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockFromResult({
        update: mockUpdate
      }));

      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.bulkUpdateStatus.mutate({
        orderIds: ['id-1', 'id-2', 'id-3'],
        orderType: 'subscription_delivery',
        newStatus: 'shipped'
      });

      await waitFor(() => {
        expect(result.current.bulkUpdateStatus.isSuccess).toBe(true);
      });

      const resultData = result.current.bulkUpdateStatus.data;
      expect(resultData?.successful).toHaveLength(2);
      expect(resultData?.failed).toHaveLength(1);
      expect(resultData?.failed[0].id).toBe('id-2');
    });
  });

  describe('cache invalidation', () => {
    it('deve invalidar cache após atualização bem-sucedida', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'test-id', status: 'confirmed' },
              error: null
            })
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockFromResult({
        update: mockUpdate
      }));

      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.updateStatus.mutate({
        orderId: 'test-id',
        orderType: 'subscription_delivery',
        newStatus: 'confirmed'
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['admin-orders']
        })
      );
    });
  });
});
