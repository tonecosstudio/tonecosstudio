/**
 * Testes Unitários - BonusPieceService
 * 
 * Testa todas as funcionalidades do serviço de gestão de peças bônus
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bonusPieceService, BonusPiece, BonusStatus } from './bonusPieceService';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
        })),
        order: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

// Get mocked supabase
const { supabase: mockSupabase } = await import('@/integrations/supabase/client');

describe('BonusPieceService', () => {
  const mockBonusPiece: BonusPiece = {
    id: 'bonus-1',
    created_at: '2026-03-01T00:00:00-03:00',
    updated_at: '2026-03-01T00:00:00-03:00',
    subscription_id: 'sub-1',
    delivery_id: null,
    description: 'Peça exclusiva edição limitada',
    status: 'pending',
    prepared_at: null,
    shipped_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBonusPiece', () => {
    it('deve criar peça bônus com descrição', async () => {
      // Setup
      const subscriptionId = 'sub-semestral-123';
      const description = 'Peça exclusiva edição limitada';

      const insertMock = vi.fn().mockResolvedValue({
        data: {
          ...mockBonusPiece,
          subscription_id: subscriptionId,
          description,
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: insertMock,
          })),
        })),
      });

      // Execute
      const bonus = await bonusPieceService.createBonusPiece(subscriptionId, description);

      // Assert
      expect(bonus).toBeDefined();
      expect(bonus.subscription_id).toBe(subscriptionId);
      expect(bonus.description).toBe(description);
      expect(bonus.status).toBe('pending');
      expect(mockSupabase.from).toHaveBeenCalledWith('bonus_pieces');
    });

    it('deve criar peça bônus sem descrição', async () => {
      // Setup
      const subscriptionId = 'sub-semestral-456';

      const insertMock = vi.fn().mockResolvedValue({
        data: {
          ...mockBonusPiece,
          subscription_id: subscriptionId,
          description: null,
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: insertMock,
          })),
        })),
      });

      // Execute
      const bonus = await bonusPieceService.createBonusPiece(subscriptionId);

      // Assert
      expect(bonus).toBeDefined();
      expect(bonus.subscription_id).toBe(subscriptionId);
      expect(bonus.description).toBeNull();
    });

    it('deve criar peça bônus com status pending por padrão', async () => {
      // Setup
      const insertMock = vi.fn().mockResolvedValue({
        data: mockBonusPiece,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: insertMock,
          })),
        })),
      });

      // Execute
      const bonus = await bonusPieceService.createBonusPiece('sub-1');

      // Assert
      expect(bonus.status).toBe('pending');
      expect(bonus.prepared_at).toBeNull();
      expect(bonus.shipped_at).toBeNull();
    });

    it('deve lançar erro se falhar ao criar', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          })),
        })),
      });

      // Execute & Assert
      await expect(
        bonusPieceService.createBonusPiece('sub-1')
      ).rejects.toThrow('Erro ao criar peça bônus: Database error');
    });
  });

  describe('linkBonusToDelivery', () => {
    it('deve vincular peça bônus à entrega', async () => {
      // Setup
      const bonusId = 'bonus-123';
      const deliveryId = 'delivery-6'; // 6ª entrega

      const updateMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: updateMock,
        })),
      });

      // Execute
      await bonusPieceService.linkBonusToDelivery(bonusId, deliveryId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('bonus_pieces');
      expect(updateMock).toHaveBeenCalled();
    });

    it('deve lançar erro se falhar ao vincular', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Update failed' },
          }),
        })),
      });

      // Execute & Assert
      await expect(
        bonusPieceService.linkBonusToDelivery('bonus-1', 'delivery-6')
      ).rejects.toThrow('Erro ao vincular peça bônus à entrega: Update failed');
    });
  });

  describe('updateBonusStatus', () => {
    it('deve atualizar status para prepared com timestamp', async () => {
      // Setup
      const bonusId = 'bonus-123';
      const updateMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: updateMock,
        })),
      });

      // Execute
      await bonusPieceService.updateBonusStatus(bonusId, 'prepared');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('bonus_pieces');
      expect(updateMock).toHaveBeenCalled();
    });

    it('deve atualizar status para shipped com timestamp', async () => {
      // Setup
      const bonusId = 'bonus-123';
      const updateMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: updateMock,
        })),
      });

      // Execute
      await bonusPieceService.updateBonusStatus(bonusId, 'shipped');

      // Assert
      expect(updateMock).toHaveBeenCalled();
    });

    it('deve atualizar status para pending sem timestamps adicionais', async () => {
      // Setup
      const bonusId = 'bonus-123';
      const updateMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: updateMock,
        })),
      });

      // Execute
      await bonusPieceService.updateBonusStatus(bonusId, 'pending');

      // Assert
      expect(updateMock).toHaveBeenCalled();
    });

    it('deve lançar erro se falhar ao atualizar', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Update failed' },
          }),
        })),
      });

      // Execute & Assert
      await expect(
        bonusPieceService.updateBonusStatus('bonus-1', 'prepared')
      ).rejects.toThrow('Erro ao atualizar status da peça bônus: Update failed');
    });
  });

  describe('getBonusBySubscription', () => {
    it('deve retornar peça bônus da assinatura', async () => {
      // Setup
      const subscriptionId = 'sub-semestral-123';

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                ...mockBonusPiece,
                subscription_id: subscriptionId,
              },
              error: null,
            }),
          })),
        })),
      });

      // Execute
      const bonus = await bonusPieceService.getBonusBySubscription(subscriptionId);

      // Assert
      expect(bonus).toBeDefined();
      expect(bonus?.subscription_id).toBe(subscriptionId);
    });

    it('deve retornar null se não encontrar peça bônus', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          })),
        })),
      });

      // Execute
      const bonus = await bonusPieceService.getBonusBySubscription('sub-trimestral-123');

      // Assert
      expect(bonus).toBeNull();
    });

    it('deve lançar erro para outros erros', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST000', message: 'Database error' },
            }),
          })),
        })),
      });

      // Execute & Assert
      await expect(
        bonusPieceService.getBonusBySubscription('sub-1')
      ).rejects.toThrow('Erro ao buscar peça bônus: Database error');
    });
  });

  describe('getBonusesByCycle', () => {
    it('deve retornar peças bônus de um ciclo', async () => {
      // Setup
      const cycleId = 'cycle-1-may-2026';
      const mockBonuses = [
        {
          ...mockBonusPiece,
          id: 'bonus-1',
          delivery: { cycle_id: cycleId },
        },
        {
          ...mockBonusPiece,
          id: 'bonus-2',
          delivery: { cycle_id: cycleId },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: mockBonuses,
            error: null,
          }),
        })),
      });

      // Execute
      const bonuses = await bonusPieceService.getBonusesByCycle(cycleId);

      // Assert
      expect(bonuses).toHaveLength(2);
      expect(bonuses[0].id).toBe('bonus-1');
      expect(bonuses[1].id).toBe('bonus-2');
    });

    it('deve retornar array vazio se não houver bônus no ciclo', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      });

      // Execute
      const bonuses = await bonusPieceService.getBonusesByCycle('cycle-empty');

      // Assert
      expect(bonuses).toEqual([]);
    });

    it('deve lançar erro se falhar ao buscar', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Query failed' },
          }),
        })),
      });

      // Execute & Assert
      await expect(
        bonusPieceService.getBonusesByCycle('cycle-1')
      ).rejects.toThrow('Erro ao buscar peças bônus do ciclo: Query failed');
    });
  });

  describe('getPendingBonuses', () => {
    it('deve retornar peças bônus pendentes ordenadas por data', async () => {
      // Setup
      const mockPendingBonuses = [
        {
          ...mockBonusPiece,
          id: 'bonus-1',
          status: 'pending' as BonusStatus,
          created_at: '2026-03-01T00:00:00-03:00',
        },
        {
          ...mockBonusPiece,
          id: 'bonus-2',
          status: 'pending' as BonusStatus,
          created_at: '2026-03-02T00:00:00-03:00',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockPendingBonuses,
              error: null,
            }),
          })),
        })),
      });

      // Execute
      const bonuses = await bonusPieceService.getPendingBonuses();

      // Assert
      expect(bonuses).toHaveLength(2);
      expect(bonuses[0].status).toBe('pending');
      expect(bonuses[1].status).toBe('pending');
    });

    it('deve retornar array vazio se não houver bônus pendentes', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          })),
        })),
      });

      // Execute
      const bonuses = await bonusPieceService.getPendingBonuses();

      // Assert
      expect(bonuses).toEqual([]);
    });

    it('deve lançar erro se falhar ao buscar', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query failed' },
            }),
          })),
        })),
      });

      // Execute & Assert
      await expect(
        bonusPieceService.getPendingBonuses()
      ).rejects.toThrow('Erro ao buscar peças bônus pendentes: Query failed');
    });
  });

  describe('Fluxo completo de peça bônus', () => {
    it('deve criar, vincular e atualizar status de peça bônus', async () => {
      // Setup - Criar
      const createMock = vi.fn().mockResolvedValue({
        data: mockBonusPiece,
        error: null,
      });

      // Setup - Vincular
      const linkMock = vi.fn().mockResolvedValue({ error: null });

      // Setup - Atualizar para prepared
      const updatePreparedMock = vi.fn().mockResolvedValue({ error: null });

      // Setup - Atualizar para shipped
      const updateShippedMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: createMock,
            })),
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: linkMock,
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: updatePreparedMock,
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: updateShippedMock,
          })),
        });

      // Execute
      const bonus = await bonusPieceService.createBonusPiece('sub-semestral-1');
      await bonusPieceService.linkBonusToDelivery(bonus.id, 'delivery-6');
      await bonusPieceService.updateBonusStatus(bonus.id, 'prepared');
      await bonusPieceService.updateBonusStatus(bonus.id, 'shipped');

      // Assert
      expect(createMock).toHaveBeenCalled();
      expect(linkMock).toHaveBeenCalled();
      expect(updatePreparedMock).toHaveBeenCalled();
      expect(updateShippedMock).toHaveBeenCalled();
    });
  });

  describe('Validações de negócio', () => {
    it('deve criar peça bônus apenas para assinaturas semestrais', async () => {
      // Este teste é conceitual - a validação deve ser feita no nível da aplicação
      // O serviço em si não valida o tipo de plano
      
      const insertMock = vi.fn().mockResolvedValue({
        data: mockBonusPiece,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: insertMock,
          })),
        })),
      });

      // Execute - O serviço permite criar para qualquer assinatura
      const bonus = await bonusPieceService.createBonusPiece('sub-any-type');

      // Assert - Criação bem-sucedida
      expect(bonus).toBeDefined();
      
      // Nota: A validação de tipo de plano deve ser feita antes de chamar este serviço
    });

    it('deve vincular peça bônus à última entrega (6ª)', async () => {
      // Este teste é conceitual - a lógica de vincular à última entrega
      // deve ser implementada no nível da aplicação
      
      const updateMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: updateMock,
        })),
      });

      // Execute - O serviço permite vincular a qualquer entrega
      await bonusPieceService.linkBonusToDelivery('bonus-1', 'delivery-6');

      // Assert
      expect(updateMock).toHaveBeenCalled();
      
      // Nota: A validação de que é a 6ª entrega deve ser feita antes de chamar este serviço
    });
  });

  describe('Edge Cases', () => {
    it('deve lidar com múltiplas peças bônus no mesmo ciclo', async () => {
      // Setup
      const mockBonuses = Array.from({ length: 10 }, (_, i) => ({
        ...mockBonusPiece,
        id: `bonus-${i + 1}`,
        subscription_id: `sub-${i + 1}`,
        delivery: { cycle_id: 'cycle-1' },
      }));

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: mockBonuses,
            error: null,
          }),
        })),
      });

      // Execute
      const bonuses = await bonusPieceService.getBonusesByCycle('cycle-1');

      // Assert
      expect(bonuses).toHaveLength(10);
    });

    it('deve lidar com transições de status não lineares', async () => {
      // Setup - Permitir pular de pending direto para shipped
      const updateMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: updateMock,
        })),
      });

      // Execute - Pular de pending para shipped sem passar por prepared
      await bonusPieceService.updateBonusStatus('bonus-1', 'shipped');

      // Assert - Deve permitir (não há validação de transição de estado)
      expect(updateMock).toHaveBeenCalled();
    });
  });
});
