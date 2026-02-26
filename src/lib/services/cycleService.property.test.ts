/**
 * Testes de Propriedade - CycleService
 * 
 * Usa property-based testing (fast-check) para validar propriedades
 * de corretude do sistema de atribuição de ciclos
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { cycleService } from './cycleService';
import { timezoneService } from './timezoneService';

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

describe('CycleService - Property-Based Tests', () => {
  /**
   * Property 7: Cycle 1 Assignment
   * 
   * For any subscription created between day 1 at 00:00:00 and day 15 at 23:59:59
   * (America/Bahia timezone), it should be assigned to Cycle 1 of that month.
   */
  describe('Property 7: Cycle 1 Assignment', () => {
    it('qualquer data entre dia 1 e 15 deve ser atribuída ao Ciclo 1', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }), // ano
          fc.integer({ min: 1, max: 12 }), // mês
          fc.integer({ min: 1, max: 15 }), // dia (1-15)
          fc.integer({ min: 0, max: 23 }), // hora
          fc.integer({ min: 0, max: 59 }), // minuto
          fc.integer({ min: 0, max: 59 }), // segundo
          (year, month, day, hour, minute, second) => {
            // Criar data no timezone America/Bahia
            const date = timezoneService.createDate(year, month, day, hour, minute, second);
            
            // Identificar ciclo
            const cycleNumber = cycleService.identifyCycleNumber(date);
            
            // Deve ser Ciclo 1
            expect(cycleNumber).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Cycle 2 Assignment
   * 
   * For any subscription created between day 16 at 00:00:00 and the last day
   * of the month at 23:59:59 (America/Bahia timezone), it should be assigned
   * to Cycle 2 of that month.
   */
  describe('Property 8: Cycle 2 Assignment', () => {
    it('qualquer data entre dia 16 e fim do mês deve ser atribuída ao Ciclo 2', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }), // ano
          fc.integer({ min: 1, max: 12 }), // mês
          fc.integer({ min: 16, max: 28 }), // dia (16-28, seguro para todos os meses)
          fc.integer({ min: 0, max: 23 }), // hora
          fc.integer({ min: 0, max: 59 }), // minuto
          fc.integer({ min: 0, max: 59 }), // segundo
          (year, month, day, hour, minute, second) => {
            // Criar data no timezone America/Bahia
            const date = timezoneService.createDate(year, month, day, hour, minute, second);
            
            // Identificar ciclo
            const cycleNumber = cycleService.identifyCycleNumber(date);
            
            // Deve ser Ciclo 2
            expect(cycleNumber).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('último dia de qualquer mês deve ser atribuído ao Ciclo 2', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }), // ano
          fc.integer({ min: 1, max: 12 }), // mês
          fc.integer({ min: 0, max: 23 }), // hora
          fc.integer({ min: 0, max: 59 }), // minuto
          fc.integer({ min: 0, max: 59 }), // segundo
          (year, month, hour, minute, second) => {
            // Calcular último dia do mês
            const lastDay = new Date(year, month, 0).getDate();
            
            // Criar data no último dia do mês
            const date = timezoneService.createDate(year, month, lastDay, hour, minute, second);
            
            // Identificar ciclo
            const cycleNumber = cycleService.identifyCycleNumber(date);
            
            // Deve ser Ciclo 2
            expect(cycleNumber).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Deterministic Cycle Assignment
   * 
   * For any given date, the cycle assignment should be deterministic
   * (same input always produces same output)
   */
  describe('Property: Deterministic Cycle Assignment', () => {
    it('mesma data deve sempre retornar mesmo ciclo', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 0, max: 59 }),
          (year, month, day, hour, minute, second) => {
            const date = timezoneService.createDate(year, month, day, hour, minute, second);
            
            // Chamar múltiplas vezes
            const result1 = cycleService.identifyCycleNumber(date);
            const result2 = cycleService.identifyCycleNumber(date);
            const result3 = cycleService.identifyCycleNumber(date);
            
            // Todos devem ser iguais
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Cycle Number Range
   * 
   * For any date, the cycle number should always be either 1 or 2
   */
  describe('Property: Cycle Number Range', () => {
    it('ciclo deve sempre ser 1 ou 2', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 0, max: 59 }),
          (year, month, day, hour, minute, second) => {
            const date = timezoneService.createDate(year, month, day, hour, minute, second);
            const cycleNumber = cycleService.identifyCycleNumber(date);
            
            // Deve ser 1 ou 2
            expect([1, 2]).toContain(cycleNumber);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Boundary Consistency
   * 
   * The boundary between Cycle 1 and Cycle 2 should be consistent:
   * - Day 15 at 23:59:59 → Cycle 1
   * - Day 16 at 00:00:00 → Cycle 2
   */
  describe('Property: Boundary Consistency', () => {
    it('limite entre ciclos deve ser consistente em todos os meses', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          (year, month) => {
            // Último segundo do Ciclo 1
            const lastCycle1 = timezoneService.createDate(year, month, 15, 23, 59, 59);
            expect(cycleService.identifyCycleNumber(lastCycle1)).toBe(1);
            
            // Primeiro segundo do Ciclo 2
            const firstCycle2 = timezoneService.createDate(year, month, 16, 0, 0, 0);
            expect(cycleService.identifyCycleNumber(firstCycle2)).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Month Independence
   * 
   * Cycle assignment should be independent of the month
   * (day 10 is always Cycle 1, day 20 is always Cycle 2, regardless of month)
   */
  describe('Property: Month Independence', () => {
    it('atribuição de ciclo deve ser independente do mês', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 12 }),
          (year, month1, month2) => {
            // Dia 10 em dois meses diferentes
            const date1 = timezoneService.createDate(year, month1, 10, 12, 0, 0);
            const date2 = timezoneService.createDate(year, month2, 10, 12, 0, 0);
            
            // Ambos devem ser Ciclo 1
            expect(cycleService.identifyCycleNumber(date1)).toBe(1);
            expect(cycleService.identifyCycleNumber(date2)).toBe(1);
            
            // Dia 20 em dois meses diferentes
            const date3 = timezoneService.createDate(year, month1, 20, 12, 0, 0);
            const date4 = timezoneService.createDate(year, month2, 20, 12, 0, 0);
            
            // Ambos devem ser Ciclo 2
            expect(cycleService.identifyCycleNumber(date3)).toBe(2);
            expect(cycleService.identifyCycleNumber(date4)).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Year Independence
   * 
   * Cycle assignment should be independent of the year
   */
  describe('Property: Year Independence', () => {
    it('atribuição de ciclo deve ser independente do ano', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          (year1, year2, month, day) => {
            const date1 = timezoneService.createDate(year1, month, day, 12, 0, 0);
            const date2 = timezoneService.createDate(year2, month, day, 12, 0, 0);
            
            // Mesmo dia/mês em anos diferentes deve ter mesmo ciclo
            expect(cycleService.identifyCycleNumber(date1)).toBe(
              cycleService.identifyCycleNumber(date2)
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Time of Day Independence
   * 
   * Cycle assignment should only depend on the day, not the time of day
   * (except at boundaries)
   */
  describe('Property: Time of Day Independence', () => {
    it('atribuição de ciclo deve ser independente da hora do dia (exceto limites)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2, max: 14 }), // Evitar limites (dia 1, 15, 16)
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 23 }),
          (year, month, day, hour1, hour2) => {
            const date1 = timezoneService.createDate(year, month, day, hour1, 0, 0);
            const date2 = timezoneService.createDate(year, month, day, hour2, 0, 0);
            
            // Mesma data em horas diferentes deve ter mesmo ciclo
            expect(cycleService.identifyCycleNumber(date1)).toBe(
              cycleService.identifyCycleNumber(date2)
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Leap Year Handling
   * 
   * Cycle assignment should handle leap years correctly
   */
  describe('Property: Leap Year Handling', () => {
    it('deve lidar corretamente com anos bissextos', () => {
      // 2028 é bissexto
      const feb29_2028 = timezoneService.createDate(2028, 2, 29, 12, 0, 0);
      expect(cycleService.identifyCycleNumber(feb29_2028)).toBe(2);
      
      // Fevereiro de 2026 não é bissexto (só tem 28 dias)
      const feb28_2026 = timezoneService.createDate(2026, 2, 28, 12, 0, 0);
      expect(cycleService.identifyCycleNumber(feb28_2026)).toBe(2);
    });
  });

  /**
   * Property: Consecutive Days Transition
   * 
   * When moving from day 15 to day 16, cycle should transition from 1 to 2
   */
  describe('Property: Consecutive Days Transition', () => {
    it('transição de dia 15 para 16 deve mudar de Ciclo 1 para 2', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          (year, month) => {
            const day15 = timezoneService.createDate(year, month, 15, 12, 0, 0);
            const day16 = timezoneService.createDate(year, month, 16, 12, 0, 0);
            
            expect(cycleService.identifyCycleNumber(day15)).toBe(1);
            expect(cycleService.identifyCycleNumber(day16)).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
