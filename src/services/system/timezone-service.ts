/**
 * TimezoneService
 *
 * Serviço centralizado para operações de timezone.
 * Garante uso consistente de America/Bahia (UTC-3) em todo o sistema.
 *
 * JavaScript Date representa um instante. Conversões para Bahia devem ser
 * usadas para leitura/formatação de calendário, sem alterar o instante atual.
 *
 * @module timezoneService
 */

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const SYSTEM_TIMEZONE = 'America/Bahia' as const;
export const SYSTEM_UTC_OFFSET = -3;

export const TIMEZONE_CONFIG = {
  timezone: SYSTEM_TIMEZONE,
  utcOffset: SYSTEM_UTC_OFFSET,
  locale: 'pt-BR',
  dateFormat: 'dd/MM/yyyy',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  timeFormat: 'HH:mm',
} as const;

class TimezoneService {
  readonly TIMEZONE = SYSTEM_TIMEZONE;
  readonly UTC_OFFSET = SYSTEM_UTC_OFFSET;

  /**
   * Retorna uma representação de parede no timezone do sistema.
   * Use para getters locais/formatação legada, não para comparar timestamps.
   */
  toSystemTimezone(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return toZonedTime(dateObj, this.TIMEZONE);
  }

  /** Converte uma data de parede de Bahia para seu instante UTC. */
  fromSystemTimezone(date: Date): Date {
    return fromZonedTime(date, this.TIMEZONE);
  }

  formatDate(date: Date | string, formatStr: string = TIMEZONE_CONFIG.dateFormat): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const zonedDate = this.toSystemTimezone(dateObj);
    return format(zonedDate, formatStr, { locale: ptBR });
  }

  formatDateTime(date: Date | string): string {
    return this.formatDate(date, TIMEZONE_CONFIG.dateTimeFormat);
  }

  /**
   * Retorna o instante atual. O timezone é aplicado quando campos civis são
   * lidos ou formatados; deslocar o timestamp aqui causa conversão dupla.
   */
  getCurrentTime(): Date {
    return new Date();
  }

  /** Retorna o instante correspondente a 00:00:00.000 do dia civil em Bahia. */
  startOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const zonedDate = this.toSystemTimezone(dateObj);

    return this.createDate(
      zonedDate.getFullYear(),
      zonedDate.getMonth() + 1,
      zonedDate.getDate(),
      0,
      0,
      0,
    );
  }

  /** Retorna o instante correspondente a 23:59:59.999 do dia civil em Bahia. */
  endOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const zonedDate = this.toSystemTimezone(dateObj);
    const wallClock = new Date(
      zonedDate.getFullYear(),
      zonedDate.getMonth(),
      zonedDate.getDate(),
      23,
      59,
      59,
      999,
    );

    return fromZonedTime(wallClock, this.TIMEZONE);
  }

  isSameDay(date1: Date | string, date2: Date | string): boolean {
    const zoned1 = this.toSystemTimezone(date1);
    const zoned2 = this.toSystemTimezone(date2);

    return (
      zoned1.getFullYear() === zoned2.getFullYear() &&
      zoned1.getMonth() === zoned2.getMonth() &&
      zoned1.getDate() === zoned2.getDate()
    );
  }

  isAfter(date1: Date | string, date2: Date | string): boolean {
    const dateObj1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const dateObj2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    return dateObj1.getTime() > dateObj2.getTime();
  }

  isBefore(date1: Date | string, date2: Date | string): boolean {
    const dateObj1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const dateObj2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    return dateObj1.getTime() < dateObj2.getTime();
  }

  getDayOfMonth(date: Date | string): number {
    return this.toSystemTimezone(date).getDate();
  }

  getMonth(date: Date | string): number {
    return this.toSystemTimezone(date).getMonth() + 1;
  }

  getYear(date: Date | string): number {
    return this.toSystemTimezone(date).getFullYear();
  }

  /**
   * Cria um instante correspondente aos campos civis informados em
   * America/Bahia. A construção é deliberadamente em duas etapas: primeiro os
   * campos de parede, depois a interpretação desses campos no timezone alvo.
   */
  createDate(
    year: number,
    month: number,
    day: number,
    hour: number = 0,
    minute: number = 0,
    second: number = 0
  ): Date {
    const wallClock = new Date(year, month - 1, day, hour, minute, second);
    return fromZonedTime(wallClock, this.TIMEZONE);
  }
}

export const timezoneService = new TimezoneService();
export default timezoneService;
