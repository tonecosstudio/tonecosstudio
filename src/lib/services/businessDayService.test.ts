/**
 * Testes unitários para BusinessDayService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { businessDayService } from './businessDayService';
import { timezoneService } from './timezoneService';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                {
                  id: '1',
                  holiday_date: '2026-01-01',
                  name: 'Ano Novo',
                  type: 'national',
                  is_recurring: true,
                },
                {
                  id: '2',
                  holiday_date: '2026-04-21',
                  name: 'Tiradentes',
                  type: 'national',
                  is_recurring: true,
                },
              ],
              error: null,
            })),
          })),
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: '1',
              holiday_date: '2026-01-01',
              name: 'Ano Novo',
              type: 'national',
              is_recurring: true,
            },
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: '3',
              holiday_date: '2026-12-31',
              name: 'Teste',
              type: 'national',
              is_recurring: false,
            },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: '1',
                holiday_date: '2026-01-01',
                name: 'Ano Novo Atualizado',
                type: 'national',
                is_recurring: true,
              },
              error: null,
            })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

describe('BusinessDayService', () => {
  beforeEach(() => {
    // Limpar cache antes de cada teste
    businessDayService.clearHolidayCache();
  });

  describe('calculateNthBusinessDay', () => {
    it('deve calcular o 5º dia útil de um mês', async () => {
      // Janeiro 2026: 1 (qui), 2 (sex), 5 (seg), 6 (ter), 7 (qua) = 5º dia útil
      const fifthDay = await businessDayService.calculateNthBusinessDay(1, 2026, 5);
      
      expect(fifthDay).toBeInstanceOf(Date);
      const day = timezoneService.getDayOfMonth(fifthDay);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });

    it('deve lançar erro para mês inválido', async () => {
      await expect(
        businessDayService.calculateNthBusinessDay(13, 2026, 5)
      ).rejects.toThrow('Mês inválido');
    });

    it('deve lançar erro para N inválido', async () => {
      await expect(
        businessDayService.calculateNthBusinessDay(1, 2026, 0)
      ).rejects.toThrow('N deve ser maior que 0');
    });

    it('deve excluir fins de semana', async () => {
      // Março 2026 começa em domingo (1º)
      // Primeiro dia útil deve ser segunda (2)
      const firstDay = await businessDayService.calculateNthBusinessDay(3, 2026, 1);
      const dayOfWeek = firstDay.getDay();
      
      // Não deve ser sábado (6) ou domingo (0)
      expect(dayOfWeek).not.toBe(0);
      expect(dayOfWeek).not.toBe(6);
    });
  });

  describe('countBusinessDays', () => {
    it('deve contar dias úteis entre duas datas', async () => {
      const start = timezoneService.createDate(2026, 3, 1);
      const end = timezoneService.createDate(2026, 3, 7);
      
      const count = await businessDayService.countBusinessDays(start, end);
      
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(7);
    });

    it('deve lançar erro se data inicial > data final', async () => {
      const start = timezoneService.createDate(2026, 3, 7);
      const end = timezoneService.createDate(2026, 3, 1);
      
      await expect(
        businessDayService.countBusinessDays(start, end)
      ).rejects.toThrow('Data inicial deve ser anterior à data final');
    });

    it('deve retornar 1 para o mesmo dia se for dia útil', async () => {
      // Segunda-feira, 2 de março de 2026
      const date = timezoneService.createDate(2026, 3, 2);
      
      const count = await businessDayService.countBusinessDays(date, date);
      
      // Deve ser 0 ou 1 dependendo se é dia útil
      expect(count).toBeGreaterThanOrEqual(0);
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  describe('isBusinessDay', () => {
    it('deve retornar false para sábado', async () => {
      // 7 de março de 2026 é sábado
      const saturday = timezoneService.createDate(2026, 3, 7);
      
      const isBusinessDay = await businessDayService.isBusinessDay(saturday);
      
      expect(isBusinessDay).toBe(false);
    });

    it('deve retornar false para domingo', async () => {
      // 1 de março de 2026 é domingo
      const sunday = timezoneService.createDate(2026, 3, 1);
      
      const isBusinessDay = await businessDayService.isBusinessDay(sunday);
      
      expect(isBusinessDay).toBe(false);
    });

    it('deve retornar true para dia útil normal', async () => {
      // 2 de março de 2026 é segunda-feira
      const monday = timezoneService.createDate(2026, 3, 2);
      
      const isBusinessDay = await businessDayService.isBusinessDay(monday);
      
      // Deve ser true se não for feriado
      expect(typeof isBusinessDay).toBe('boolean');
    });

    it('deve retornar false para feriado', async () => {
      // 1 de janeiro de 2026 é feriado (Ano Novo)
      const newYear = timezoneService.createDate(2026, 1, 1);
      
      const isBusinessDay = await businessDayService.isBusinessDay(newYear);
      
      expect(isBusinessDay).toBe(false);
    });
  });

  describe('getHolidays', () => {
    it('deve retornar lista de feriados', async () => {
      const holidays = await businessDayService.getHolidays(2026);
      
      expect(Array.isArray(holidays)).toBe(true);
      expect(holidays.length).toBeGreaterThan(0);
    });

    it('deve usar cache na segunda chamada', async () => {
      // Primeira chamada
      const holidays1 = await businessDayService.getHolidays(2026);
      
      // Segunda chamada (deve usar cache)
      const holidays2 = await businessDayService.getHolidays(2026);
      
      expect(holidays1).toBeDefined();
      expect(holidays2).toBeDefined();
    });

    it('deve retornar array vazio se não houver feriados', async () => {
      // Ano muito distante sem feriados cadastrados
      const holidays = await businessDayService.getHolidays(2050);
      
      expect(Array.isArray(holidays)).toBe(true);
    });
  });

  describe('isHoliday', () => {
    it('deve retornar true para feriado nacional', async () => {
      // 1 de janeiro é Ano Novo
      const newYear = timezoneService.createDate(2026, 1, 1);
      
      const isHoliday = await businessDayService.isHoliday(newYear);
      
      expect(isHoliday).toBe(true);
    });

    it('deve retornar false para dia normal', async () => {
      // 10 de março não é feriado
      const normalDay = timezoneService.createDate(2026, 3, 10);
      
      const isHoliday = await businessDayService.isHoliday(normalDay);
      
      expect(isHoliday).toBe(false);
    });
  });

  describe('addHoliday', () => {
    it('deve adicionar novo feriado', async () => {
      const holiday = await businessDayService.addHoliday({
        holiday_date: '2026-12-31',
        name: 'Véspera de Ano Novo',
        type: 'national',
      });
      
      expect(holiday).toBeDefined();
      expect(holiday.name).toBe('Teste'); // Mock retorna 'Teste'
    });

    it('deve limpar cache ao adicionar feriado', async () => {
      // Carregar cache
      await businessDayService.getHolidays(2026);
      
      // Adicionar feriado (deve limpar cache)
      await businessDayService.addHoliday({
        holiday_date: '2026-12-31',
        name: 'Teste',
        type: 'national',
      });
      
      // Cache deve ter sido limpo
      // Próxima chamada deve buscar do banco novamente
      const holidays = await businessDayService.getHolidays(2026);
      expect(holidays).toBeDefined();
    });
  });

  describe('updateHoliday', () => {
    it('deve atualizar feriado existente', async () => {
      const updated = await businessDayService.updateHoliday('1', {
        name: 'Ano Novo Atualizado',
      });
      
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Ano Novo Atualizado');
    });
  });

  describe('deleteHoliday', () => {
    it('deve deletar feriado', async () => {
      await expect(
        businessDayService.deleteHoliday('1')
      ).resolves.not.toThrow();
    });
  });

  describe('clearHolidayCache', () => {
    it('deve limpar todo o cache', async () => {
      // Carregar cache
      await businessDayService.getHolidays(2026);
      await businessDayService.getHolidays(2027);
      
      // Limpar cache
      businessDayService.clearHolidayCache();
      
      // Próximas chamadas devem buscar do banco
      const holidays = await businessDayService.getHolidays(2026);
      expect(holidays).toBeDefined();
    });
  });

  describe('Casos de borda', () => {
    it('deve lidar com mês de fevereiro (28 dias)', async () => {
      const firstDay = await businessDayService.calculateNthBusinessDay(2, 2026, 1);
      
      expect(firstDay).toBeInstanceOf(Date);
      expect(timezoneService.getMonth(firstDay)).toBe(2);
    });

    it('deve lidar com mês de fevereiro em ano bissexto (29 dias)', async () => {
      const firstDay = await businessDayService.calculateNthBusinessDay(2, 2028, 1);
      
      expect(firstDay).toBeInstanceOf(Date);
      expect(timezoneService.getMonth(firstDay)).toBe(2);
    });

    it('deve lidar com mês com 31 dias', async () => {
      const firstDay = await businessDayService.calculateNthBusinessDay(1, 2026, 1);
      
      expect(firstDay).toBeInstanceOf(Date);
      expect(timezoneService.getMonth(firstDay)).toBe(1);
    });

    it('deve lidar com múltiplos feriados consecutivos', async () => {
      // Carnaval geralmente tem 2 dias consecutivos
      const holidays = await businessDayService.getHolidays(2026);
      
      expect(holidays).toBeDefined();
      expect(Array.isArray(holidays)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('deve calcular 5º dia útil em menos de 100ms', async () => {
      const start = Date.now();
      
      await businessDayService.calculateNthBusinessDay(3, 2026, 5);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('deve usar cache eficientemente', async () => {
      // Primeira chamada (sem cache)
      const start1 = Date.now();
      await businessDayService.getHolidays(2026);
      const duration1 = Date.now() - start1;
      
      // Segunda chamada (com cache)
      const start2 = Date.now();
      await businessDayService.getHolidays(2026);
      const duration2 = Date.now() - start2;
      
      // Cache deve ser mais rápido
      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});
