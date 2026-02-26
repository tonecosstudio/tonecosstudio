/**
 * Testes unitários para TimezoneService
 */

import { describe, it, expect } from 'vitest';
import { timezoneService, SYSTEM_TIMEZONE, SYSTEM_UTC_OFFSET } from './timezoneService';

describe('TimezoneService', () => {
  describe('Constantes', () => {
    it('deve ter timezone America/Bahia', () => {
      expect(timezoneService.TIMEZONE).toBe('America/Bahia');
      expect(SYSTEM_TIMEZONE).toBe('America/Bahia');
    });

    it('deve ter offset UTC-3', () => {
      expect(timezoneService.UTC_OFFSET).toBe(-3);
      expect(SYSTEM_UTC_OFFSET).toBe(-3);
    });
  });

  describe('toSystemTimezone', () => {
    it('deve converter UTC para America/Bahia', () => {
      const utcDate = new Date('2026-03-16T02:59:59Z'); // UTC
      const bahiaDate = timezoneService.toSystemTimezone(utcDate);
      
      // Em America/Bahia (UTC-3), deve ser 23:59:59 do dia anterior
      expect(bahiaDate.getDate()).toBe(15);
      expect(bahiaDate.getHours()).toBe(23);
      expect(bahiaDate.getMinutes()).toBe(59);
    });

    it('deve aceitar string ISO', () => {
      const isoString = '2026-03-16T02:59:59Z';
      const bahiaDate = timezoneService.toSystemTimezone(isoString);
      
      expect(bahiaDate.getDate()).toBe(15);
    });
  });

  describe('formatDate', () => {
    it('deve formatar data no padrão brasileiro', () => {
      const date = new Date('2026-03-15T12:00:00Z');
      const formatted = timezoneService.formatDate(date);
      
      // Formato: DD/MM/YYYY
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('deve formatar com formato customizado', () => {
      const date = new Date('2026-03-15T12:00:00Z');
      const formatted = timezoneService.formatDate(date, 'yyyy-MM-dd');
      
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateTime', () => {
    it('deve formatar data e hora', () => {
      const date = new Date('2026-03-15T12:00:00Z');
      const formatted = timezoneService.formatDateTime(date);
      
      // Formato: DD/MM/YYYY HH:mm
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    });
  });

  describe('getCurrentTime', () => {
    it('deve retornar data atual no timezone do sistema', () => {
      const now = timezoneService.getCurrentTime();
      
      expect(now).toBeInstanceOf(Date);
      expect(now.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('startOfDay', () => {
    it('deve retornar início do dia (00:00:00)', () => {
      const date = new Date('2026-03-15T14:30:45Z');
      const start = timezoneService.startOfDay(date);
      
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });

    it('deve manter o mesmo dia', () => {
      const date = new Date('2026-03-15T14:30:45Z');
      const start = timezoneService.startOfDay(date);
      const zonedDate = timezoneService.toSystemTimezone(date);
      
      expect(start.getDate()).toBe(zonedDate.getDate());
    });
  });

  describe('endOfDay', () => {
    it('deve retornar fim do dia (23:59:59.999)', () => {
      const date = new Date('2026-03-15T14:30:45Z');
      const end = timezoneService.endOfDay(date);
      
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });
  });

  describe('isSameDay', () => {
    it('deve retornar true para datas do mesmo dia', () => {
      const date1 = new Date('2026-03-15T10:00:00Z');
      const date2 = new Date('2026-03-15T20:00:00Z');
      
      const isSame = timezoneService.isSameDay(date1, date2);
      expect(isSame).toBe(true);
    });

    it('deve retornar false para datas de dias diferentes', () => {
      // 2026-03-16T02:59:59Z = 2026-03-15T23:59:59 em America/Bahia (dia 15)
      // 2026-03-16T03:00:00Z = 2026-03-16T00:00:00 em America/Bahia (dia 16)
      const date1 = new Date('2026-03-16T02:59:59Z');
      const date2 = new Date('2026-03-16T03:00:00Z');
      
      const isSame = timezoneService.isSameDay(date1, date2);
      expect(isSame).toBe(false);
    });
  });

  describe('isAfter', () => {
    it('deve retornar true quando date1 > date2', () => {
      const date1 = new Date('2026-03-16T00:00:00Z');
      const date2 = new Date('2026-03-15T00:00:00Z');
      
      expect(timezoneService.isAfter(date1, date2)).toBe(true);
    });

    it('deve retornar false quando date1 <= date2', () => {
      const date1 = new Date('2026-03-15T00:00:00Z');
      const date2 = new Date('2026-03-16T00:00:00Z');
      
      expect(timezoneService.isAfter(date1, date2)).toBe(false);
    });
  });

  describe('isBefore', () => {
    it('deve retornar true quando date1 < date2', () => {
      const date1 = new Date('2026-03-15T00:00:00Z');
      const date2 = new Date('2026-03-16T00:00:00Z');
      
      expect(timezoneService.isBefore(date1, date2)).toBe(true);
    });

    it('deve retornar false quando date1 >= date2', () => {
      const date1 = new Date('2026-03-16T00:00:00Z');
      const date2 = new Date('2026-03-15T00:00:00Z');
      
      expect(timezoneService.isBefore(date1, date2)).toBe(false);
    });
  });

  describe('getDayOfMonth', () => {
    it('deve retornar o dia do mês', () => {
      const date = new Date('2026-03-15T12:00:00Z');
      const day = timezoneService.getDayOfMonth(date);
      
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });
  });

  describe('getMonth', () => {
    it('deve retornar o mês (1-12)', () => {
      const date = new Date('2026-03-15T12:00:00Z');
      const month = timezoneService.getMonth(date);
      
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
    });
  });

  describe('getYear', () => {
    it('deve retornar o ano', () => {
      const date = new Date('2026-03-15T12:00:00Z');
      const year = timezoneService.getYear(date);
      
      expect(year).toBe(2026);
    });
  });

  describe('createDate', () => {
    it('deve criar data no timezone do sistema', () => {
      const date = timezoneService.createDate(2026, 3, 15, 23, 59, 59);
      
      const zonedDate = timezoneService.toSystemTimezone(date);
      expect(zonedDate.getFullYear()).toBe(2026);
      expect(zonedDate.getMonth() + 1).toBe(3);
      expect(zonedDate.getDate()).toBe(15);
      expect(zonedDate.getHours()).toBe(23);
      expect(zonedDate.getMinutes()).toBe(59);
      expect(zonedDate.getSeconds()).toBe(59);
    });

    it('deve usar valores padrão para hora/minuto/segundo', () => {
      const date = timezoneService.createDate(2026, 3, 15);
      
      const zonedDate = timezoneService.toSystemTimezone(date);
      expect(zonedDate.getHours()).toBe(0);
      expect(zonedDate.getMinutes()).toBe(0);
      expect(zonedDate.getSeconds()).toBe(0);
    });
  });

  describe('Casos de borda - Ciclo 1 vs Ciclo 2', () => {
    it('deve identificar corretamente dia 15 às 23:59:59 como Ciclo 1', () => {
      const date = timezoneService.createDate(2026, 3, 15, 23, 59, 59);
      const day = timezoneService.getDayOfMonth(date);
      
      expect(day).toBe(15);
      expect(day).toBeLessThanOrEqual(15); // Ciclo 1
    });

    it('deve identificar corretamente dia 16 às 00:00:00 como Ciclo 2', () => {
      const date = timezoneService.createDate(2026, 3, 16, 0, 0, 0);
      const day = timezoneService.getDayOfMonth(date);
      
      expect(day).toBe(16);
      expect(day).toBeGreaterThanOrEqual(16); // Ciclo 2
    });
  });

  describe('Casos de borda - Mudança de mês', () => {
    it('deve lidar corretamente com último dia do mês', () => {
      const date = timezoneService.createDate(2026, 2, 28, 23, 59, 59);
      const day = timezoneService.getDayOfMonth(date);
      const month = timezoneService.getMonth(date);
      
      expect(day).toBe(28);
      expect(month).toBe(2);
    });

    it('deve lidar corretamente com primeiro dia do mês', () => {
      const date = timezoneService.createDate(2026, 3, 1, 0, 0, 0);
      const day = timezoneService.getDayOfMonth(date);
      const month = timezoneService.getMonth(date);
      
      expect(day).toBe(1);
      expect(month).toBe(3);
    });
  });

  describe('Casos de borda - Ano bissexto', () => {
    it('deve lidar com 29 de fevereiro em ano bissexto', () => {
      const date = timezoneService.createDate(2028, 2, 29);
      const day = timezoneService.getDayOfMonth(date);
      const month = timezoneService.getMonth(date);
      
      expect(day).toBe(29);
      expect(month).toBe(2);
    });
  });
});
