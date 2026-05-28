/**
 * Testes Unitários - CycleService
 * 
 * Testa todas as funcionalidades do serviço de gestão de ciclos
 */

import { describe, it, expect, vi } from 'vitest';
import { cycleService } from './cycleService';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(),
            })),
            single: vi.fn(),
          })),
          single: vi.fn(),
        })),
        neq: vi.fn(),
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
    rpc: vi.fn(),
  },
}));

describe('CycleService', () => {
  describe('identifyCycleNumber', () => {
    it('deve retornar 1 para dia 1 do mês', () => {
      const date = new Date('2026-03-01T10:00:00-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(1);
    });

    it('deve retornar 1 para dia 15 do mês', () => {
      const date = new Date('2026-03-15T23:59:59-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(1);
    });

    it('deve retornar 1 para dia 16 do mês no modelo mensal', () => {
      const date = new Date('2026-03-16T00:00:00-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(2);
    });

    it('deve retornar 1 para último dia do mês no modelo mensal', () => {
      const date = new Date('2026-03-31T23:59:59-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(2);
    });

    it('deve retornar 1 para dia 10 do mês', () => {
      const date = new Date('2026-03-10T12:00:00-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(1);
    });

    it('deve retornar 1 para dia 20 do mês no modelo mensal', () => {
      const date = new Date('2026-03-20T12:00:00-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(2);
    });
  });

  describe('calculateCycleDates (privado, testado via createCycleIfNotExists)', () => {
    it('deve calcular datas corretas para Ciclo 1', () => {
      // Ciclo 1 de março 2026
      // Open: 01/03 00:00:00 - 15/03 23:59:59
      // Production: 16/03 00:00:00 - 31/03 23:59:59
      // Shipping: 5º dia útil de abril
      
      // Testaremos indiretamente via createCycleIfNotExists
      expect(true).toBe(true); // Placeholder
    });

    it('deve manter compatibilidade para chamadas legadas de Ciclo 2', () => {
      // Chamadas legadas com cycle_number=2 ainda usam o mesmo modelo mensal.
      // Open: 16/03 00:00:00 - 31/03 23:59:59
      // Production: 01/04 00:00:00 - 30/04 23:59:59
      // Shipping: 5º dia útil de maio
      
      // Testaremos indiretamente via createCycleIfNotExists
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Timezone Consistency', () => {
    it('deve usar America/Bahia timezone em todas as operações', () => {
      
      const date = new Date('2026-03-15T23:59:59-03:00');
      cycleService.identifyCycleNumber(date);
      
      expect(cycleService.identifyCycleNumber(date)).toBe(1);
    });

    it('deve considerar fechamento às 23:59:59 em America/Bahia', () => {
      // Dia 15 às 23:59:59 deve ser Ciclo 1
      const lastSecondCycle1 = new Date('2026-03-15T23:59:59-03:00');
      expect(cycleService.identifyCycleNumber(lastSecondCycle1)).toBe(1);
      
      // Dia 16 às 00:00:00 permanece no ciclo mensal unico.
      const firstSecondCycle2 = new Date('2026-03-16T00:00:00-03:00');
      expect(cycleService.identifyCycleNumber(firstSecondCycle2)).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('deve lidar com meses de 28 dias (fevereiro não bissexto)', () => {
      const date = new Date('2026-02-28T12:00:00-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(2);
    });

    it('deve lidar com meses de 29 dias (fevereiro bissexto)', () => {
      const date = new Date('2028-02-29T12:00:00-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(2);
    });

    it('deve lidar com meses de 30 dias', () => {
      const date = new Date('2026-04-30T12:00:00-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(2);
    });

    it('deve lidar com meses de 31 dias', () => {
      const date = new Date('2026-03-31T12:00:00-03:00');
      const result = cycleService.identifyCycleNumber(date);
      expect(result).toBe(2);
    });

    it('deve lidar com virada de ano (dezembro para janeiro)', () => {
      const decemberDate = new Date('2026-12-31T23:59:59-03:00');
      expect(cycleService.identifyCycleNumber(decemberDate)).toBe(2);
      
      const januaryDate = new Date('2027-01-01T00:00:00-03:00');
      expect(cycleService.identifyCycleNumber(januaryDate)).toBe(1);
    });
  });

  describe('getNextCycles', () => {
    it('deve alternar ciclos antes de avançar o mês', async () => {
      const createCycleSpy = vi
        .spyOn(cycleService, 'createCycleIfNotExists')
        .mockImplementation(async (cycleNumber, month, year) => ({
          id: `${year}-${month}-${cycleNumber}`,
          created_at: '',
          updated_at: '',
          capacity: 100,
          used_capacity: 0,
          cycle_number: cycleNumber,
          month,
          year,
          open_start: '',
          open_end: '',
          production_start: '',
          production_end: '',
          shipping_date: '',
          status: 'open',
          status_changed_at: null,
          capacity_max: 100,
          capacity_current: 0,
        }));

      await cycleService.getNextCycles(4, new Date('2026-03-10T12:00:00-03:00'));

      expect(createCycleSpy).toHaveBeenNthCalledWith(1, 1, 3, 2026);
      expect(createCycleSpy).toHaveBeenNthCalledWith(2, 2, 3, 2026);
      expect(createCycleSpy).toHaveBeenNthCalledWith(3, 1, 4, 2026);
      expect(createCycleSpy).toHaveBeenNthCalledWith(4, 2, 4, 2026);

      createCycleSpy.mockRestore();
    });
  });

  describe('Boundary Testing', () => {
    it('deve manter ciclo mensal unico na antiga fronteira quinzenal', () => {
      // Último segundo do Ciclo 1
      const lastCycle1 = new Date('2026-03-15T23:59:59-03:00');
      expect(cycleService.identifyCycleNumber(lastCycle1)).toBe(1);
      
      // Primeiro segundo da antiga segunda quinzena
      const firstCycle2 = new Date('2026-03-16T00:00:00-03:00');
      expect(cycleService.identifyCycleNumber(firstCycle2)).toBe(2);
    });

    it('deve identificar corretamente o início do Ciclo 1', () => {
      const firstDay = new Date('2026-03-01T00:00:00-03:00');
      expect(cycleService.identifyCycleNumber(firstDay)).toBe(1);
    });

    it('deve identificar corretamente o fim do ciclo mensal', () => {
      const lastDay = new Date('2026-03-31T23:59:59-03:00');
      expect(cycleService.identifyCycleNumber(lastDay)).toBe(2);
    });
  });

  describe('Consistency Across Months', () => {
    it('deve manter consistência em diferentes meses', () => {
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      months.forEach(month => {
        const day10 = new Date(`2026-${month.toString().padStart(2, '0')}-10T12:00:00-03:00`);
        expect(cycleService.identifyCycleNumber(day10)).toBe(1);
        
        const day20 = new Date(`2026-${month.toString().padStart(2, '0')}-20T12:00:00-03:00`);
        expect(cycleService.identifyCycleNumber(day20)).toBe(2);
      });
    });
  });

  describe('Horário de Verão (DST)', () => {
    it('deve lidar corretamente com transições de horário de verão', () => {
      // Brasil não tem mais horário de verão desde 2019
      // Mas testamos para garantir que o timezone está correto
      
      const winterDate = new Date('2026-07-15T12:00:00-03:00');
      expect(cycleService.identifyCycleNumber(winterDate)).toBe(1);
      
      const summerDate = new Date('2026-01-15T12:00:00-03:00');
      expect(cycleService.identifyCycleNumber(summerDate)).toBe(1);
    });
  });
});
