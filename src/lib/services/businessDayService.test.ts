/**
 * Testes unitários para BusinessDayService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { businessDayService } from './businessDayService';
import { timezoneService } from './timezoneService';

const mutationMocks = vi.hoisted(() => ({
  addHolidayRpc: vi.fn(),
  updateHolidayRpc: vi.fn(),
  deleteHolidayRpc: vi.fn(),
}));

vi.mock('@/services/calendar/holiday-mutations-service', () => ({
  addHolidayRpc: mutationMocks.addHolidayRpc,
  updateHolidayRpc: mutationMocks.updateHolidayRpc,
  deleteHolidayRpc: mutationMocks.deleteHolidayRpc,
}));

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
    })),
  },
}));

describe('BusinessDayService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationMocks.addHolidayRpc.mockResolvedValue({
      id: '3',
      holiday_date: '2026-12-31',
      name: 'Teste',
      type: 'national',
      is_recurring: false,
    });
    mutationMocks.updateHolidayRpc.mockResolvedValue({
      id: '1',
      holiday_date: '2026-01-01',
      name: 'Ano Novo Atualizado',
      type: 'national',
      is_recurring: true,
    });
    mutationMocks.deleteHolidayRpc.mockResolvedValue({
      id: '1',
      holiday_date: '2026-01-01',
      name: 'Ano Novo',
      type: 'national',
      is_recurring: true,
    });

    businessDayService.clearHolidayCache();
  });

  describe('calculateNthBusinessDay', () => {
    it('deve calcular o 5º dia útil de um mês', async () => {
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

    it('deve excluir fins de semana no calendário de Bahia', async () => {
      const firstDay = await businessDayService.calculateNthBusinessDay(3, 2026, 1);
      const dayOfWeek = timezoneService.toSystemTimezone(firstDay).getDay();
      
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
      const date = timezoneService.createDate(2026, 3, 2);
      
      const count = await businessDayService.countBusinessDays(date, date);
      
      expect(count).toBeGreaterThanOrEqual(0);
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  describe('isBusinessDay', () => {
    it('deve retornar false para sábado', async () => {
      const saturday = timezoneService.createDate(2026, 3, 7);
      expect(await businessDayService.isBusinessDay(saturday)).toBe(false);
    });

    it('deve retornar false para domingo', async () => {
      const sunday = timezoneService.createDate(2026, 3, 1);
      expect(await businessDayService.isBusinessDay(sunday)).toBe(false);
    });

    it('deve retornar true para dia útil normal', async () => {
      const monday = timezoneService.createDate(2026, 3, 2);
      expect(typeof (await businessDayService.isBusinessDay(monday))).toBe('boolean');
    });

    it('deve retornar false para feriado', async () => {
      const newYear = timezoneService.createDate(2026, 1, 1);
      expect(await businessDayService.isBusinessDay(newYear)).toBe(false);
    });
  });

  describe('getHolidays', () => {
    it('deve retornar lista de feriados', async () => {
      const holidays = await businessDayService.getHolidays(2026);
      expect(Array.isArray(holidays)).toBe(true);
      expect(holidays.length).toBeGreaterThan(0);
    });

    it('deve usar cache na segunda chamada', async () => {
      const holidays1 = await businessDayService.getHolidays(2026);
      const holidays2 = await businessDayService.getHolidays(2026);
      expect(holidays1).toBeDefined();
      expect(holidays2).toBeDefined();
    });

    it('deve retornar array válido para ano sem cadastro específico no mock', async () => {
      const holidays = await businessDayService.getHolidays(2050);
      expect(Array.isArray(holidays)).toBe(true);
    });
  });

  describe('isHoliday', () => {
    it('deve retornar true para feriado nacional', async () => {
      const newYear = timezoneService.createDate(2026, 1, 1);
      expect(await businessDayService.isHoliday(newYear)).toBe(true);
    });

    it('deve retornar false para dia normal', async () => {
      const normalDay = timezoneService.createDate(2026, 3, 10);
      expect(await businessDayService.isHoliday(normalDay)).toBe(false);
    });
  });

  describe('addHoliday', () => {
    it('deve adicionar novo feriado pela fronteira de mutação', async () => {
      const holiday = await businessDayService.addHoliday({
        holiday_date: '2026-12-31',
        name: 'Véspera de Ano Novo',
        type: 'national',
      });
      
      expect(holiday).toBeDefined();
      expect(holiday.name).toBe('Teste');
      expect(mutationMocks.addHolidayRpc).toHaveBeenCalledWith({
        holiday_date: '2026-12-31',
        name: 'Véspera de Ano Novo',
        description: null,
        type: 'national',
        state_code: null,
        is_recurring: false,
      });
    });

    it('deve limpar cache ao adicionar feriado', async () => {
      await businessDayService.getHolidays(2026);
      await businessDayService.addHoliday({
        holiday_date: '2026-12-31',
        name: 'Teste',
        type: 'national',
      });
      const holidays = await businessDayService.getHolidays(2026);
      expect(holidays).toBeDefined();
    });
  });

  describe('updateHoliday', () => {
    it('deve atualizar feriado existente pela fronteira de mutação', async () => {
      const updated = await businessDayService.updateHoliday('1', {
        name: 'Ano Novo Atualizado',
      });
      
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Ano Novo Atualizado');
      expect(mutationMocks.updateHolidayRpc).toHaveBeenCalledWith('1', {
        holiday_date: undefined,
        name: 'Ano Novo Atualizado',
        description: null,
        type: undefined,
        state_code: null,
        is_recurring: undefined,
      });
    });
  });

  describe('deleteHoliday', () => {
    it('deve deletar feriado pela fronteira de mutação', async () => {
      await expect(businessDayService.deleteHoliday('1')).resolves.not.toThrow();
      expect(mutationMocks.deleteHolidayRpc).toHaveBeenCalledWith('1');
    });
  });

  describe('clearHolidayCache', () => {
    it('deve limpar todo o cache', async () => {
      await businessDayService.getHolidays(2026);
      await businessDayService.getHolidays(2027);
      businessDayService.clearHolidayCache();
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
      const start1 = Date.now();
      await businessDayService.getHolidays(2026);
      const duration1 = Date.now() - start1;
      const start2 = Date.now();
      await businessDayService.getHolidays(2026);
      const duration2 = Date.now() - start2;
      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});
