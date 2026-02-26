/**
 * Testes de propriedade (Property-Based Tests) para BusinessDayService
 * 
 * Feature: premium-club-fixed-price-model
 * 
 * Estes testes verificam propriedades universais que devem ser verdadeiras
 * para qualquer entrada válida, usando geração aleatória de dados.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { businessDayService } from './businessDayService';
import { timezoneService } from './timezoneService';

// Mock do Supabase para testes de propriedade
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                // Feriados fixos para testes
                { id: '1', holiday_date: '2026-01-01', name: 'Ano Novo', type: 'national', is_recurring: true },
                { id: '2', holiday_date: '2026-12-25', name: 'Natal', type: 'national', is_recurring: true },
              ],
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('BusinessDayService - Property-Based Tests', () => {
  beforeEach(() => {
    businessDayService.clearHolidayCache();
  });

  describe('Property 14: Weekend Exclusion from Business Days', () => {
    it('Feature: premium-club-fixed-price-model, Property 14: Sábados e domingos não devem ser contados como dias úteis', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
          async (date) => {
            const zonedDate = timezoneService.toSystemTimezone(date);
            const dayOfWeek = zonedDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            const isBusinessDay = await businessDayService.isBusinessDay(zonedDate);
            
            // Se é fim de semana, NÃO deve ser dia útil
            if (isWeekend) {
              expect(isBusinessDay).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15: Holiday Exclusion from Business Days', () => {
    it('Feature: premium-club-fixed-price-model, Property 15: Feriados não devem ser contados como dias úteis', async () => {
      // Testar com feriados conhecidos
      const knownHolidays = [
        timezoneService.createDate(2026, 1, 1),  // Ano Novo
        timezoneService.createDate(2026, 12, 25), // Natal
      ];

      for (const holiday of knownHolidays) {
        const isBusinessDay = await businessDayService.isBusinessDay(holiday);
        expect(isBusinessDay).toBe(false);
      }
    });
  });

  describe('Property 16: Business Day Counting Start Point', () => {
    it('Feature: premium-club-fixed-price-model, Property 16: Contagem deve começar do dia 1 do mês', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // mês
          fc.integer({ min: 2026, max: 2030 }), // ano
          fc.integer({ min: 1, max: 5 }), // N (1º ao 5º dia útil)
          async (month, year, n) => {
            try {
              const nthDay = await businessDayService.calculateNthBusinessDay(month, year, n);
              
              // O N-ésimo dia útil deve estar no mês correto
              const resultMonth = timezoneService.getMonth(nthDay);
              expect(resultMonth).toBe(month);
              
              // O dia deve ser >= 1
              const day = timezoneService.getDayOfMonth(nthDay);
              expect(day).toBeGreaterThanOrEqual(1);
              
              // O dia deve ser <= último dia do mês
              const lastDay = new Date(year, month, 0).getDate();
              expect(day).toBeLessThanOrEqual(lastDay);
            } catch (error) {
              // Alguns meses podem não ter N dias úteis suficientes
              // Isso é aceitável
              if (error instanceof Error && !error.message.includes('Não há')) {
                throw error;
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Propriedade: Dias úteis são sempre segunda a sexta', () => {
    it('Qualquer dia útil deve ser segunda (1) a sexta (5)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 20 }),
          async (month, year, n) => {
            try {
              const nthDay = await businessDayService.calculateNthBusinessDay(month, year, n);
              const dayOfWeek = nthDay.getDay();
              
              // Dia da semana deve ser 1-5 (segunda a sexta)
              expect(dayOfWeek).toBeGreaterThanOrEqual(1);
              expect(dayOfWeek).toBeLessThanOrEqual(5);
            } catch (error) {
              // Aceitar erro se não houver dias úteis suficientes
              if (error instanceof Error && !error.message.includes('Não há')) {
                throw error;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Propriedade: Contagem de dias úteis é consistente', () => {
    it('Contar dias úteis de A até B deve dar o mesmo resultado que somar dias úteis individuais', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 10 }),
          async (month, year, days) => {
            const startDate = timezoneService.createDate(year, month, 1);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + days);
            
            // Garantir que estamos no mesmo mês
            if (timezoneService.getMonth(endDate) !== month) {
              return; // Skip se mudou de mês
            }
            
            const totalCount = await businessDayService.countBusinessDays(startDate, endDate);
            
            // Contar manualmente
            let manualCount = 0;
            let currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
              if (await businessDayService.isBusinessDay(currentDate)) {
                manualCount++;
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            expect(totalCount).toBe(manualCount);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Propriedade: N-ésimo dia útil é sempre posterior ao (N-1)-ésimo', () => {
    it('O 5º dia útil deve ser depois do 4º dia útil', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          async (month, year) => {
            try {
              const fourthDay = await businessDayService.calculateNthBusinessDay(month, year, 4);
              const fifthDay = await businessDayService.calculateNthBusinessDay(month, year, 5);
              
              expect(fifthDay.getTime()).toBeGreaterThan(fourthDay.getTime());
            } catch (error) {
              // Aceitar erro se não houver dias úteis suficientes
              if (error instanceof Error && !error.message.includes('Não há')) {
                throw error;
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Propriedade: Primeiro dia útil nunca é fim de semana', () => {
    it('O 1º dia útil de qualquer mês não deve ser sábado ou domingo', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          async (month, year) => {
            const firstBusinessDay = await businessDayService.calculateNthBusinessDay(month, year, 1);
            const dayOfWeek = firstBusinessDay.getDay();
            
            expect(dayOfWeek).not.toBe(0); // Não é domingo
            expect(dayOfWeek).not.toBe(6); // Não é sábado
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Propriedade: Meses têm pelo menos 20 dias úteis', () => {
    it('Qualquer mês deve ter pelo menos 20 dias úteis (exceto fevereiro)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          async (month, year) => {
            const firstDay = timezoneService.createDate(year, month, 1);
            const lastDay = new Date(year, month, 0); // Último dia do mês
            lastDay.setDate(lastDay.getDate() + 1); // Ajustar para último dia
            
            const businessDays = await businessDayService.countBusinessDays(firstDay, lastDay);
            
            // Fevereiro pode ter menos de 20 dias úteis
            if (month === 2) {
              expect(businessDays).toBeGreaterThanOrEqual(18);
            } else {
              expect(businessDays).toBeGreaterThanOrEqual(20);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Propriedade: Cache não afeta resultados', () => {
    it('Resultado com cache deve ser igual ao resultado sem cache', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2026, max: 2030 }),
          async (year) => {
            // Limpar cache
            businessDayService.clearHolidayCache();
            
            // Primeira chamada (sem cache)
            const holidays1 = await businessDayService.getHolidays(year);
            
            // Segunda chamada (com cache)
            const holidays2 = await businessDayService.getHolidays(year);
            
            // Resultados devem ser iguais
            expect(holidays1.length).toBe(holidays2.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Propriedade: Performance - Cálculo rápido', () => {
    it('Calcular 5º dia útil deve levar menos de 100ms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          async (month, year) => {
            const start = Date.now();
            
            try {
              await businessDayService.calculateNthBusinessDay(month, year, 5);
            } catch (error) {
              // Ignorar erros de dias insuficientes
            }
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Casos de borda - Fevereiro', () => {
    it('Fevereiro em ano bissexto deve ter 29 dias', async () => {
      // 2028 é ano bissexto
      const lastDay = new Date(2028, 2, 0).getDate();
      expect(lastDay).toBe(29);
      
      // Deve conseguir calcular dias úteis em fevereiro bissexto
      const firstBusinessDay = await businessDayService.calculateNthBusinessDay(2, 2028, 1);
      expect(timezoneService.getMonth(firstBusinessDay)).toBe(2);
    });

    it('Fevereiro em ano não-bissexto deve ter 28 dias', async () => {
      // 2026 não é ano bissexto
      const lastDay = new Date(2026, 2, 0).getDate();
      expect(lastDay).toBe(28);
      
      // Deve conseguir calcular dias úteis em fevereiro normal
      const firstBusinessDay = await businessDayService.calculateNthBusinessDay(2, 2026, 1);
      expect(timezoneService.getMonth(firstBusinessDay)).toBe(2);
    });
  });
});
