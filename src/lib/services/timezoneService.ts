// @ts-nocheck
/**
 * TimezoneService
 * 
 * Serviço centralizado para operações de timezone.
 * Garante uso consistente de America/Bahia (UTC-3) em todo o sistema.
 * 
 * @module timezoneService
 */

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Constantes de timezone do sistema
 */
export const SYSTEM_TIMEZONE = 'America/Bahia' as const;
export const SYSTEM_UTC_OFFSET = -3;

/**
 * Configuração de timezone e formatação
 */
export const TIMEZONE_CONFIG = {
  timezone: SYSTEM_TIMEZONE,
  utcOffset: SYSTEM_UTC_OFFSET,
  locale: 'pt-BR',
  dateFormat: 'dd/MM/yyyy',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  timeFormat: 'HH:mm',
} as const;

/**
 * Serviço de timezone
 */
class TimezoneService {
  /**
   * Timezone oficial do sistema
   */
  readonly TIMEZONE = SYSTEM_TIMEZONE;
  
  /**
   * Offset UTC do timezone
   */
  readonly UTC_OFFSET = SYSTEM_UTC_OFFSET;

  /**
   * Converte uma data para o timezone do sistema (America/Bahia)
   * 
   * @param date - Data a ser convertida
   * @returns Data no timezone do sistema
   * 
   * @example
   * const utcDate = new Date('2026-03-15T23:59:59Z');
   * const bahiaDate = timezoneService.toSystemTimezone(utcDate);
   * // bahiaDate será 2026-03-15T20:59:59 (UTC-3)
   */
  toSystemTimezone(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return toZonedTime(dateObj, this.TIMEZONE);
  }

  /**
   * Converte uma data do timezone do sistema para UTC
   * 
   * @param date - Data no timezone do sistema
   * @returns Data em UTC
   * 
   * @example
   * const bahiaDate = new Date('2026-03-15T23:59:59');
   * const utcDate = timezoneService.fromSystemTimezone(bahiaDate);
   * // utcDate será 2026-03-16T02:59:59Z (UTC)
   */
  fromSystemTimezone(date: Date): Date {
    return fromZonedTime(date, this.TIMEZONE);
  }

  /**
   * Formata uma data usando o formato especificado
   * 
   * @param date - Data a ser formatada
   * @param formatStr - String de formato (padrão date-fns)
   * @returns Data formatada
   * 
   * @example
   * const date = new Date('2026-03-15T23:59:59');
   * const formatted = timezoneService.formatDate(date, 'dd/MM/yyyy');
   * // '15/03/2026'
   */
  formatDate(date: Date | string, formatStr: string = TIMEZONE_CONFIG.dateFormat): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const zonedDate = this.toSystemTimezone(dateObj);
    return format(zonedDate, formatStr, { locale: ptBR });
  }

  /**
   * Formata uma data com hora no formato brasileiro
   * 
   * @param date - Data a ser formatada
   * @returns Data e hora formatadas (DD/MM/YYYY HH:mm)
   * 
   * @example
   * const date = new Date('2026-03-15T23:59:59');
   * const formatted = timezoneService.formatDateTime(date);
   * // '15/03/2026 23:59'
   */
  formatDateTime(date: Date | string): string {
    return this.formatDate(date, TIMEZONE_CONFIG.dateTimeFormat);
  }

  /**
   * Retorna a data/hora atual no timezone do sistema
   * 
   * @returns Data atual no timezone America/Bahia
   * 
   * @example
   * const now = timezoneService.getCurrentTime();
   */
  getCurrentTime(): Date {
    return this.toSystemTimezone(new Date());
  }

  /**
   * Retorna o início do dia (00:00:00) para uma data no timezone do sistema
   * 
   * @param date - Data de referência
   * @returns Início do dia no timezone do sistema
   * 
   * @example
   * const date = new Date('2026-03-15T14:30:00');
   * const startOfDay = timezoneService.startOfDay(date);
   * // 2026-03-15T00:00:00 (America/Bahia)
   */
  startOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const zonedDate = this.toSystemTimezone(dateObj);
    
    const year = zonedDate.getFullYear();
    const month = zonedDate.getMonth();
    const day = zonedDate.getDate();
    
    // Criar data no timezone do sistema
    const startDate = new Date(year, month, day, 0, 0, 0, 0);
    return this.toSystemTimezone(startDate);
  }

  /**
   * Retorna o fim do dia (23:59:59.999) para uma data no timezone do sistema
   * 
   * @param date - Data de referência
   * @returns Fim do dia no timezone do sistema
   * 
   * @example
   * const date = new Date('2026-03-15T14:30:00');
   * const endOfDay = timezoneService.endOfDay(date);
   * // 2026-03-15T23:59:59.999 (America/Bahia)
   */
  endOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const zonedDate = this.toSystemTimezone(dateObj);
    
    const year = zonedDate.getFullYear();
    const month = zonedDate.getMonth();
    const day = zonedDate.getDate();
    
    // Criar data no timezone do sistema
    const endDate = new Date(year, month, day, 23, 59, 59, 999);
    return this.toSystemTimezone(endDate);
  }

  /**
   * Verifica se duas datas são do mesmo dia no timezone do sistema
   * 
   * @param date1 - Primeira data
   * @param date2 - Segunda data
   * @returns true se as datas são do mesmo dia
   * 
   * @example
   * const date1 = new Date('2026-03-15T10:00:00');
   * const date2 = new Date('2026-03-15T20:00:00');
   * const isSame = timezoneService.isSameDay(date1, date2);
   * // true
   */
  isSameDay(date1: Date | string, date2: Date | string): boolean {
    const zoned1 = this.toSystemTimezone(date1);
    const zoned2 = this.toSystemTimezone(date2);
    
    return (
      zoned1.getFullYear() === zoned2.getFullYear() &&
      zoned1.getMonth() === zoned2.getMonth() &&
      zoned1.getDate() === zoned2.getDate()
    );
  }

  /**
   * Verifica se date1 é depois de date2
   * 
   * @param date1 - Primeira data
   * @param date2 - Segunda data
   * @returns true se date1 > date2
   */
  isAfter(date1: Date | string, date2: Date | string): boolean {
    const zoned1 = this.toSystemTimezone(date1);
    const zoned2 = this.toSystemTimezone(date2);
    return zoned1.getTime() > zoned2.getTime();
  }

  /**
   * Verifica se date1 é antes de date2
   * 
   * @param date1 - Primeira data
   * @param date2 - Segunda data
   * @returns true se date1 < date2
   */
  isBefore(date1: Date | string, date2: Date | string): boolean {
    const zoned1 = this.toSystemTimezone(date1);
    const zoned2 = this.toSystemTimezone(date2);
    return zoned1.getTime() < zoned2.getTime();
  }

  /**
   * Extrai o dia do mês de uma data no timezone do sistema
   * 
   * @param date - Data de referência
   * @returns Dia do mês (1-31)
   * 
   * @example
   * const date = new Date('2026-03-15T23:59:59');
   * const day = timezoneService.getDayOfMonth(date);
   * // 15
   */
  getDayOfMonth(date: Date | string): number {
    const zonedDate = this.toSystemTimezone(date);
    return zonedDate.getDate();
  }

  /**
   * Extrai o mês de uma data no timezone do sistema
   * 
   * @param date - Data de referência
   * @returns Mês (1-12)
   * 
   * @example
   * const date = new Date('2026-03-15T23:59:59');
   * const month = timezoneService.getMonth(date);
   * // 3
   */
  getMonth(date: Date | string): number {
    const zonedDate = this.toSystemTimezone(date);
    return zonedDate.getMonth() + 1; // JavaScript months are 0-indexed
  }

  /**
   * Extrai o ano de uma data no timezone do sistema
   * 
   * @param date - Data de referência
   * @returns Ano
   * 
   * @example
   * const date = new Date('2026-03-15T23:59:59');
   * const year = timezoneService.getYear(date);
   * // 2026
   */
  getYear(date: Date | string): number {
    const zonedDate = this.toSystemTimezone(date);
    return zonedDate.getFullYear();
  }

  /**
   * Cria uma data específica no timezone do sistema
   * 
   * @param year - Ano
   * @param month - Mês (1-12)
   * @param day - Dia (1-31)
   * @param hour - Hora (0-23, padrão: 0)
   * @param minute - Minuto (0-59, padrão: 0)
   * @param second - Segundo (0-59, padrão: 0)
   * @returns Data no timezone do sistema
   * 
   * @example
   * const date = timezoneService.createDate(2026, 3, 15, 23, 59, 59);
   * // 2026-03-15T23:59:59 (America/Bahia)
   */
  createDate(
    year: number,
    month: number,
    day: number,
    hour: number = 0,
    minute: number = 0,
    second: number = 0
  ): Date {
    // JavaScript months are 0-indexed
    const date = new Date(year, month - 1, day, hour, minute, second);
    return this.toSystemTimezone(date);
  }
}

/**
 * Instância singleton do serviço de timezone
 */
export const timezoneService = new TimezoneService();

/**
 * Export default para compatibilidade
 */
export default timezoneService;
