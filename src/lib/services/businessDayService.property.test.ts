/**
 * Testes de propriedade (Property-Based Tests) para BusinessDayService
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { businessDayService } from './businessDayService';
import { timezoneService } from './timezoneService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
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
    it('Sábados e domingos de Bahia não devem ser contados como dias úteis', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2026-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') }),
          async (date) => {
            const bahiaDate = timezoneService.toSystemTimezone(date);
            const dayOfWeek = bahiaDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isBusinessDay = await businessDayService.isBusinessDay(date);

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
    it('Feriados conhecidos não devem ser contados como dias úteis', async () => {
      const knownHolidays = [
        timezoneService.createDate(2026, 1, 1),
        timezoneService.createDate(2026, 12, 25),
      ];

      for (const holiday of knownHolidays) {
        expect(await businessDayService.isBusinessDay(holiday)).toBe(false);
      }
    });
  });

  describe('Property 16: Business Day Counting Start Point', () => {
    it('O N-ésimo dia útil deve permanecer no mês solicitado', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 5 }),
          async (month, year, n) => {
            try {
              const nthDay = await businessDayService.calculateNthBusinessDay(month, year, n);
              const resultMonth = timezoneService.getMonth(nthDay);
              const day = timezoneService.getDayOfMonth(nthDay);
              const lastDay = new Date(year, month, 0).getDate();

              expect(resultMonth).toBe(month);
              expect(day).toBeGreaterThanOrEqual(1);
              expect(day).toBeLessThanOrEqual(lastDay);
            } catch (error) {
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
    it('Qualquer dia útil retornado deve ser segunda (1) a sexta (5) em Bahia', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 20 }),
          async (month, year, n) => {
            try {
              const nthDay = await businessDayService.calculateNthBusinessDay(month, year, n);
              const dayOfWeek = timezoneService.toSystemTimezone(nthDay).getDay();

              expect(dayOfWeek).toBeGreaterThanOrEqual(1);
              expect(dayOfWeek).toBeLessThanOrEqual(5);
            } catch (error) {
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
    it('Contar A até B deve ser igual à soma das verificações individuais', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 10 }),
          async (month, year, days) => {
            const startDate = timezoneService.createDate(year, month, 1);
            const startWall = timezoneService.toSystemTimezone(startDate);
            const endWall = new Date(startWall);
            endWall.setDate(endWall.getDate() + days);
            const endDate = timezoneService.fromSystemTimezone(endWall);

            if (timezoneService.getMonth(endDate) !== month) {
              return;
            }

            const totalCount = await businessDayService.countBusinessDays(startDate, endDate);
            let manualCount = 0;
            let currentWall = new Date(startWall);

            while (currentWall <= endWall) {
              const currentInstant = timezoneService.fromSystemTimezone(currentWall);
              if (await businessDayService.isBusinessDay(currentInstant)) {
                manualCount++;
              }
              currentWall = new Date(currentWall);
              currentWall.setDate(currentWall.getDate() + 1);
            }

            expect(totalCount).toBe(manualCount);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Propriedade: N-ésimo dia útil é ordenado', () => {
    it('O 5º dia útil deve ser depois do 4º', async () => {
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
    it('O 1º dia útil de qualquer mês não deve ser sábado ou domingo em Bahia', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          async (month, year) => {
            const firstBusinessDay = await businessDayService.calculateNthBusinessDay(month, year, 1);
            const dayOfWeek = timezoneService.toSystemTimezone(firstBusinessDay).getDay();

            expect(dayOfWeek).not.toBe(0);
            expect(dayOfWeek).not.toBe(6);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Propriedade: Meses têm quantidade plausível de dias úteis', () => {
    it('Meses fora de fevereiro têm ao menos 20 dias úteis com os feriados do fixture', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          async (month, year) => {
            const firstDay = timezoneService.createDate(year, month, 1);
            const lastCalendarDay = new Date(year, month, 0).getDate();
            const lastDay = timezoneService.createDate(year, month, lastCalendarDay);
            const businessDays = await businessDayService.countBusinessDays(firstDay, lastDay);

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
    it('Resultado com cache deve ter o mesmo tamanho do resultado sem cache', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2026, max: 2030 }),
          async (year) => {
            businessDayService.clearHolidayCache();
            const holidays1 = await businessDayService.getHolidays(year);
            const holidays2 = await businessDayService.getHolidays(year);
            expect(holidays1.length).toBe(holidays2.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Propriedade: Performance', () => {
    it('Calcular 5º dia útil deve levar menos de 100ms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          async (month, year) => {
            const start = Date.now();
            try {
              await businessDayService.calculateNthBusinessDay(month, year, 5);
            } catch {
              // Sem dias suficientes é um resultado permitido pelo contrato.
            }
            expect(Date.now() - start).toBeLessThan(100);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Casos de borda - Fevereiro', () => {
    it('Fevereiro em ano bissexto deve ter 29 dias', async () => {
      expect(new Date(2028, 2, 0).getDate()).toBe(29);
      const firstBusinessDay = await businessDayService.calculateNthBusinessDay(2, 2028, 1);
      expect(timezoneService.getMonth(firstBusinessDay)).toBe(2);
    });

    it('Fevereiro em ano não-bissexto deve ter 28 dias', async () => {
      expect(new Date(2026, 2, 0).getDate()).toBe(28);
      const firstBusinessDay = await businessDayService.calculateNthBusinessDay(2, 2026, 1);
      expect(timezoneService.getMonth(firstBusinessDay)).toBe(2);
    });
  });
});
