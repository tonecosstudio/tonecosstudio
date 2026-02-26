/**
 * Testes Unitários - DeliveryService
 * 
 * Testa todas as funcionalidades do serviço de gestão de entregas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deliveryService, Delivery, DeliveryStatus, PlanType } from './deliveryService';
import { cycleService, Cycle } from './cycleService';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
          single: vi.fn(),
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
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

// Mock do CycleService
vi.mock('./cycleService', () => ({
  cycleService: {
    getCycleById: vi.fn(),
    createCycleIfNotExists: vi.fn(),
  },
  Cycle: {},
}));

// Get mocked supabase
const { supabase: mockSupabase } = await import('@/integrations/supabase/client');

describe('DeliveryService', () => {
  const mockCycle: Cycle = {
    id: 'cycle-1',
    created_at: '2026-03-01T00:00:00-03:00',
    updated_at: '2026-03-01T00:00:00-03:00',
    cycle_number: 1,
    month: 3,
    year: 2026,
    open_start: '2026-03-01T00:00:00-03:00',
    open_end: '2026-03-15T23:59:59-03:00',
    production_start: '2026-03-16T00:00:00-03:00',
    production_end: '2026-03-31T23:59:59-03:00',
    shipping_date: '2026-04-07',
    status: 'open',
    status_changed_at: null,
    capacity_max: 100,
    capacity_current: 0,
  };

  const mockDelivery: Delivery = {
    id: 'delivery-1',
    created_at: '2026-03-01T00:00:00-03:00',
    updated_at: '2026-03-01T00:00:00-03:00',
    subscription_id: 'sub-1',
    cycle_id: 'cycle-1',
    character_id: null,
    delivery_number: 1,
    status: 'scheduled',
    status_changed_at: null,
    scheduled_date: '2026-04-07',
    shipped_at: null,
    delivered_at: null,
    tracking_code: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scheduleConsecutiveDeliveries', () => {
    it('deve criar 3 entregas para plano trimestral', async () => {
      // Setup
      const subscriptionId = 'sub-123';
      const planType: PlanType = 'trimestral';
      const entryCycleId = 'cycle-2-march-2026';

      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        id: entryCycleId,
        cycle_number: 2,
      });

      // Mock para criar 3 ciclos consecutivos
      vi.mocked(cycleService.createCycleIfNotExists)
        .mockResolvedValueOnce({ ...mockCycle, id: 'cycle-1-april', cycle_number: 1, month: 4 })
        .mockResolvedValueOnce({ ...mockCycle, id: 'cycle-2-april', cycle_number: 2, month: 4 })
        .mockResolvedValueOnce({ ...mockCycle, id: 'cycle-1-may', cycle_number: 1, month: 5 });

      // Mock para inserir entregas
      const insertMock = vi.fn()
        .mockResolvedValueOnce({ data: { ...mockDelivery, id: 'delivery-1', delivery_number: 1 }, error: null })
        .mockResolvedValueOnce({ data: { ...mockDelivery, id: 'delivery-2', delivery_number: 2 }, error: null })
        .mockResolvedValueOnce({ data: { ...mockDelivery, id: 'delivery-3', delivery_number: 3 }, error: null });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: insertMock,
          })),
        })),
      });

      // Execute
      const deliveries = await deliveryService.scheduleConsecutiveDeliveries(
        subscriptionId,
        planType,
        entryCycleId
      );

      // Assert
      expect(deliveries).toHaveLength(3);
      expect(deliveries[0].delivery_number).toBe(1);
      expect(deliveries[1].delivery_number).toBe(2);
      expect(deliveries[2].delivery_number).toBe(3);
      expect(cycleService.createCycleIfNotExists).toHaveBeenCalledTimes(3);
    });

    it('deve criar 6 entregas para plano semestral', async () => {
      // Setup
      const subscriptionId = 'sub-456';
      const planType: PlanType = 'semestral';
      const entryCycleId = 'cycle-1-march-2026';

      vi.mocked(cycleService.getCycleById).mockResolvedValue(mockCycle);

      // Mock para criar 6 ciclos consecutivos
      vi.mocked(cycleService.createCycleIfNotExists)
        .mockResolvedValueOnce({ ...mockCycle, id: 'cycle-2-march', cycle_number: 2, month: 3 })
        .mockResolvedValueOnce({ ...mockCycle, id: 'cycle-1-april', cycle_number: 1, month: 4 })
        .mockResolvedValueOnce({ ...mockCycle, id: 'cycle-2-april', cycle_number: 2, month: 4 })
        .mockResolvedValueOnce({ ...mockCycle, id: 'cycle-1-may', cycle_number: 1, month: 5 })
        .mockResolvedValueOnce({ ...mockCycle, id: 'cycle-2-may', cycle_number: 2, month: 5 })
        .mockResolvedValueOnce({ ...mockCycle, id: 'cycle-1-june', cycle_number: 1, month: 6 });

      // Mock para inserir entregas
      const insertMock = vi.fn();
      for (let i = 1; i <= 6; i++) {
        insertMock.mockResolvedValueOnce({
          data: { ...mockDelivery, id: `delivery-${i}`, delivery_number: i },
          error: null,
        });
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: insertMock,
          })),
        })),
      });

      // Execute
      const deliveries = await deliveryService.scheduleConsecutiveDeliveries(
        subscriptionId,
        planType,
        entryCycleId
      );

      // Assert
      expect(deliveries).toHaveLength(6);
      expect(deliveries[0].delivery_number).toBe(1);
      expect(deliveries[5].delivery_number).toBe(6);
      expect(cycleService.createCycleIfNotExists).toHaveBeenCalledTimes(6);
    });

    it('deve criar entregas em ciclos consecutivos corretos', async () => {
      // Setup - Assinatura criada no Ciclo 2 de Março
      const entryCycleId = 'cycle-2-march-2026';

      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        id: entryCycleId,
        cycle_number: 2,
        month: 3,
      });

      const createCycleSpy = vi.mocked(cycleService.createCycleIfNotExists);
      createCycleSpy
        .mockResolvedValueOnce({ ...mockCycle, cycle_number: 1, month: 4 })
        .mockResolvedValueOnce({ ...mockCycle, cycle_number: 2, month: 4 })
        .mockResolvedValueOnce({ ...mockCycle, cycle_number: 1, month: 5 });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
              .mockResolvedValueOnce({ data: mockDelivery, error: null })
              .mockResolvedValueOnce({ data: mockDelivery, error: null })
              .mockResolvedValueOnce({ data: mockDelivery, error: null }),
          })),
        })),
      });

      // Execute
      await deliveryService.scheduleConsecutiveDeliveries('sub-1', 'trimestral', entryCycleId);

      // Assert - Verificar sequência de ciclos
      expect(createCycleSpy).toHaveBeenNthCalledWith(1, 1, 4, 2026); // Ciclo 1 de Abril
      expect(createCycleSpy).toHaveBeenNthCalledWith(2, 2, 4, 2026); // Ciclo 2 de Abril
      expect(createCycleSpy).toHaveBeenNthCalledWith(3, 1, 5, 2026); // Ciclo 1 de Maio
    });

    it('deve lidar com virada de ano', async () => {
      // Setup - Assinatura criada no Ciclo 2 de Dezembro
      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        cycle_number: 2,
        month: 12,
        year: 2026,
      });

      const createCycleSpy = vi.mocked(cycleService.createCycleIfNotExists);
      createCycleSpy
        .mockResolvedValueOnce({ ...mockCycle, cycle_number: 1, month: 1, year: 2027 })
        .mockResolvedValueOnce({ ...mockCycle, cycle_number: 2, month: 1, year: 2027 })
        .mockResolvedValueOnce({ ...mockCycle, cycle_number: 1, month: 2, year: 2027 });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockDelivery, error: null }),
          })),
        })),
      });

      // Execute
      await deliveryService.scheduleConsecutiveDeliveries('sub-1', 'trimestral', 'cycle-2-dec-2026');

      // Assert - Verificar virada de ano
      expect(createCycleSpy).toHaveBeenNthCalledWith(1, 1, 1, 2027); // Janeiro 2027
      expect(createCycleSpy).toHaveBeenNthCalledWith(2, 2, 1, 2027);
      expect(createCycleSpy).toHaveBeenNthCalledWith(3, 1, 2, 2027); // Fevereiro 2027
    });

    it('deve lançar erro se falhar ao criar entrega', async () => {
      // Setup
      vi.mocked(cycleService.getCycleById).mockResolvedValue(mockCycle);
      vi.mocked(cycleService.createCycleIfNotExists).mockResolvedValue(mockCycle);

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
        deliveryService.scheduleConsecutiveDeliveries('sub-1', 'trimestral', 'cycle-1')
      ).rejects.toThrow('Erro ao criar entrega 1: Database error');
    });
  });

  describe('updateDeliveryStatus', () => {
    it('deve atualizar status para shipped com timestamp', async () => {
      // Setup
      const updateMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: updateMock,
        })),
      });

      // Execute
      await deliveryService.updateDeliveryStatus('delivery-1', 'shipped');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('subscription_deliveries');
      expect(updateMock).toHaveBeenCalled();
    });

    it('deve atualizar status para delivered com timestamp', async () => {
      // Setup
      const updateMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: updateMock,
        })),
      });

      // Execute
      await deliveryService.updateDeliveryStatus('delivery-1', 'delivered');

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
        deliveryService.updateDeliveryStatus('delivery-1', 'shipped')
      ).rejects.toThrow('Erro ao atualizar status da entrega: Update failed');
    });
  });

  describe('getDeliveriesBySubscription', () => {
    it('deve retornar entregas ordenadas por número', async () => {
      // Setup
      const mockDeliveries = [
        { ...mockDelivery, delivery_number: 1 },
        { ...mockDelivery, delivery_number: 2 },
        { ...mockDelivery, delivery_number: 3 },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockDeliveries,
              error: null,
            }),
          })),
        })),
      });

      // Execute
      const deliveries = await deliveryService.getDeliveriesBySubscription('sub-1');

      // Assert
      expect(deliveries).toHaveLength(3);
      expect(deliveries[0].delivery_number).toBe(1);
      expect(deliveries[2].delivery_number).toBe(3);
    });

    it('deve retornar array vazio se não houver entregas', async () => {
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
      const deliveries = await deliveryService.getDeliveriesBySubscription('sub-1');

      // Assert
      expect(deliveries).toEqual([]);
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
        deliveryService.getDeliveriesBySubscription('sub-1')
      ).rejects.toThrow('Erro ao buscar entregas: Query failed');
    });
  });

  describe('canChangeCharacter', () => {
    it('deve retornar true se ciclo está open', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: 'cycle-1' },
              error: null,
            }),
          })),
        })),
      });

      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        status: 'open',
      });

      // Execute
      const canChange = await deliveryService.canChangeCharacter('delivery-1');

      // Assert
      expect(canChange).toBe(true);
    });

    it('deve retornar false se ciclo está em production', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: 'cycle-1' },
              error: null,
            }),
          })),
        })),
      });

      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        status: 'production',
      });

      // Execute
      const canChange = await deliveryService.canChangeCharacter('delivery-1');

      // Assert
      expect(canChange).toBe(false);
    });

    it('deve retornar false se não houver cycle_id', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: null },
              error: null,
            }),
          })),
        })),
      });

      // Execute
      const canChange = await deliveryService.canChangeCharacter('delivery-1');

      // Assert
      expect(canChange).toBe(false);
    });
  });

  describe('changeCharacter', () => {
    it('deve trocar personagem se permitido', async () => {
      // Setup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: 'cycle-1' },
              error: null,
            }),
          })),
        })),
      }).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        status: 'open',
      });

      // Execute
      await deliveryService.changeCharacter('delivery-1', 'character-2');

      // Assert - Não deve lançar erro
      expect(mockSupabase.from).toHaveBeenCalledWith('subscription_deliveries');
    });

    it('deve lançar erro se troca não for permitida', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: 'cycle-1' },
              error: null,
            }),
          })),
        })),
      });

      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        status: 'production',
      });

      // Execute & Assert
      await expect(
        deliveryService.changeCharacter('delivery-1', 'character-2')
      ).rejects.toThrow('Não é possível trocar o personagem');
    });
  });

  describe('getCurrentDelivery', () => {
    it('deve retornar entrega atual em andamento', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: mockDelivery,
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      });

      // Execute
      const delivery = await deliveryService.getCurrentDelivery('sub-1');

      // Assert
      expect(delivery).toBeDefined();
      expect(delivery?.id).toBe('delivery-1');
    });

    it('deve retornar null se não houver entrega atual', async () => {
      // Setup
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                })),
              })),
            })),
          })),
        })),
      });

      // Execute
      const delivery = await deliveryService.getCurrentDelivery('sub-1');

      // Assert
      expect(delivery).toBeNull();
    });
  });
});
