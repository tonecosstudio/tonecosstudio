/**
 * BusinessDayService
 * 
 * Serviço para cálculo de dias úteis considerando feriados.
 * Exclui sábados, domingos e feriados nacionais/estaduais.
 * 
 * @module businessDayService
 */

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';
import {
  addHolidayRpc,
  deleteHolidayRpc,
  updateHolidayRpc,
} from '@/services/calendar/holiday-mutations-service';
import { timezoneService } from "@/services/system/timezone-service";

/**
 * Interface para feriado
 */
export interface Holiday {
  id: string;
  holiday_date: string;
  name: string;
  description?: string;
  type: 'national' | 'state';
  state_code?: string;
  is_recurring: boolean;
}

/**
 * Interface para input de feriado
 */
export interface HolidayInput {
  holiday_date: string;
  name: string;
  description?: string;
  type: 'national' | 'state';
  state_code?: string;
  is_recurring?: boolean;
}

type HolidayRow = {
  id: string;
  holiday_date?: string | null;
  date?: string | null;
  name: string;
  description?: string | null;
  type?: 'national' | 'state' | null;
  state_code?: string | null;
  is_recurring?: boolean | null;
};

function toHoliday(row: HolidayRow): Holiday {
  return {
    id: row.id,
    holiday_date: row.holiday_date ?? row.date ?? '',
    name: row.name,
    description: row.description ?? undefined,
    type: row.type ?? 'national',
    state_code: row.state_code ?? undefined,
    is_recurring: row.is_recurring ?? false,
  };
}

/**
 * Serviço de dias úteis
 */
class BusinessDayService {
  /**
   * Cache de feriados por ano
   * Map<ano, Set<data_formatada>>
   */
  private holidayCache: Map<number, Set<string>> = new Map();
  
  /**
   * Timestamp de expiração do cache por ano
   * Map<ano, timestamp>
   */
  private cacheExpiry: Map<number, number> = new Map();
  
  /**
   * TTL do cache em milissegundos (24 horas)
   */
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000;

  /**
   * Calcula o N-ésimo dia útil de um mês
   * 
   * @param month - Mês (1-12)
   * @param year - Ano
   * @param n - Qual dia útil buscar (ex: 5 para o 5º dia útil)
   * @returns Data do N-ésimo dia útil
   * @throws Error se não houver dias úteis suficientes no mês
   * 
   * @example
   * // Calcular o 5º dia útil de março de 2026
   * const fifthBusinessDay = await businessDayService.calculateNthBusinessDay(3, 2026, 5);
   */
  async calculateNthBusinessDay(month: number, year: number, n: number): Promise<Date> {
    // Validar inputs
    if (month < 1 || month > 12) {
      throw new Error(`Mês inválido: ${month}. Deve estar entre 1 e 12.`);
    }
    if (n < 1) {
      throw new Error(`N deve ser maior que 0, recebido: ${n}`);
    }

    // Obter feriados do ano
    const holidays = await this.getHolidays(year);
    const holidayDates = new Set(holidays.map(h => h.holiday_date));

    // Começar do primeiro dia do mês
    let currentDate = timezoneService.createDate(year, month, 1);
    let businessDayCount = 0;

    // Iterar pelos dias do mês
    while (currentDate.getMonth() === month - 1) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = this.formatDateForComparison(currentDate);

      // Verificar se é dia útil
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou Sábado
      const isHoliday = holidayDates.has(dateStr);

      if (!isWeekend && !isHoliday) {
        businessDayCount++;

        if (businessDayCount === n) {
          return currentDate;
        }
      }

      // Avançar para o próximo dia
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Se chegou aqui, não há dias úteis suficientes no mês
    throw new Error(
      `Não há ${n} dias úteis em ${month}/${year}. Encontrados apenas ${businessDayCount} dias úteis.`
    );
  }

  /**
   * Conta quantos dias úteis existem entre duas datas (inclusive)
   * 
   * @param startDate - Data inicial
   * @param endDate - Data final
   * @returns Número de dias úteis
   * 
   * @example
   * const start = new Date('2026-03-01');
   * const end = new Date('2026-03-31');
   * const count = await businessDayService.countBusinessDays(start, end);
   */
  async countBusinessDays(startDate: Date, endDate: Date): Promise<number> {
    const start = timezoneService.toSystemTimezone(startDate);
    const end = timezoneService.toSystemTimezone(endDate);

    if (start > end) {
      throw new Error('Data inicial deve ser anterior à data final');
    }

    // Obter anos envolvidos
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    // Obter feriados de todos os anos envolvidos
    const allHolidays: Holiday[] = [];
    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = await this.getHolidays(year);
      allHolidays.push(...yearHolidays);
    }
    
    const holidayDates = new Set(allHolidays.map(h => h.holiday_date));

    let count = 0;
    // eslint-disable-next-line prefer-const -- currentDate is mutated with setDate()
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = this.formatDateForComparison(currentDate);

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateStr);

      if (!isWeekend && !isHoliday) {
        count++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  /**
   * Verifica se uma data é dia útil
   * 
   * @param date - Data a verificar
   * @returns true se for dia útil
   * 
   * @example
   * const date = new Date('2026-03-15');
   * const isBusinessDay = await businessDayService.isBusinessDay(date);
   */
  async isBusinessDay(date: Date): Promise<boolean> {
    const zonedDate = timezoneService.toSystemTimezone(date);
    const dayOfWeek = zonedDate.getDay();

    // Verificar se é fim de semana
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Verificar se é feriado
    const year = zonedDate.getFullYear();
    const holidays = await this.getHolidays(year);
    const dateStr = this.formatDateForComparison(zonedDate);
    
    return !holidays.some(h => h.holiday_date === dateStr);
  }

  /**
   * Obtém todos os feriados de um ano (com cache)
   * 
   * @param year - Ano
   * @returns Lista de feriados
   * 
   * @example
   * const holidays = await businessDayService.getHolidays(2026);
   */
  async getHolidays(year: number): Promise<Holiday[]> {
    const now = Date.now();
    const cached = this.holidayCache.get(year);
    const expiry = this.cacheExpiry.get(year);

    // Verificar se o cache é válido
    if (cached && expiry && expiry > now) {
      // Reconstruir array de holidays do cache
      return Array.from(cached).map(dateStr => ({
        id: '',
        holiday_date: dateStr,
        name: '',
        type: 'national' as const,
        is_recurring: false,
      }));
    }

    // Buscar do banco de dados
    const holidays = await this.fetchHolidaysFromDB(year);

    // Atualizar cache
    const holidayDates = new Set(holidays.map(h => h.holiday_date));
    this.holidayCache.set(year, holidayDates);
    this.cacheExpiry.set(year, now + this.CACHE_TTL);

    return holidays;
  }

  /**
   * Busca feriados do banco de dados
   * 
   * @param year - Ano
   * @returns Lista de feriados
   * @private
   */
  private async fetchHolidaysFromDB(year: number): Promise<Holiday[]> {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('holiday_date', `${year}-01-01`)
      .lte('holiday_date', `${year}-12-31`)
      .order('holiday_date');

    if (error) {
      log.error('Erro ao buscar feriados', { error, year });
      return [];
    }

    return ((data || []) as unknown as HolidayRow[]).map(toHoliday);
  }

  /**
   * Verifica se uma data é feriado
   * 
   * @param date - Data a verificar
   * @returns true se for feriado
   * 
   * @example
   * const date = new Date('2026-01-01');
   * const isHoliday = await businessDayService.isHoliday(date);
   * // true (Ano Novo)
   */
  async isHoliday(date: Date): Promise<boolean> {
    const zonedDate = timezoneService.toSystemTimezone(date);
    const year = zonedDate.getFullYear();
    const holidays = await this.getHolidays(year);
    const dateStr = this.formatDateForComparison(zonedDate);
    
    return holidays.some(h => h.holiday_date === dateStr);
  }

  /**
   * Adiciona um novo feriado
   * 
   * @param holiday - Dados do feriado
   * @returns Feriado criado
   * 
   * @example
   * const holiday = await businessDayService.addHoliday({
   *   holiday_date: '2026-12-31',
   *   name: 'Véspera de Ano Novo',
   *   type: 'national'
   * });
   */
  async addHoliday(holiday: HolidayInput): Promise<Holiday> {
    const data = await addHolidayRpc<Holiday>({
      holiday_date: holiday.holiday_date,
      name: holiday.name,
      description: holiday.description ?? null,
      type: holiday.type,
      state_code: holiday.state_code ?? null,
      is_recurring: holiday.is_recurring ?? false,
    });

    // Limpar cache do ano afetado
    const year = new Date(holiday.holiday_date).getFullYear();
    this.clearCacheForYear(year);

    return data;
  }

  /**
   * Atualiza um feriado existente
   * 
   * @param id - ID do feriado
   * @param holiday - Dados atualizados
   * @returns Feriado atualizado
   */
  async updateHoliday(id: string, holiday: Partial<HolidayInput>): Promise<Holiday> {
    const data = await updateHolidayRpc<Holiday>(id, {
      holiday_date: holiday.holiday_date,
      name: holiday.name,
      description: holiday.description ?? null,
      type: holiday.type,
      state_code: holiday.state_code ?? null,
      is_recurring: holiday.is_recurring,
    });

    // Limpar cache do ano afetado
    if (data.holiday_date) {
      const year = new Date(data.holiday_date).getFullYear();
      this.clearCacheForYear(year);
    }

    return data;
  }

  /**
   * Remove um feriado
   * 
   * @param id - ID do feriado
   */
  async deleteHoliday(id: string): Promise<void> {
    const holiday = await deleteHolidayRpc<Holiday>(id);

    // Limpar cache do ano afetado
    if (holiday) {
      const year = new Date(holiday.holiday_date).getFullYear();
      this.clearCacheForYear(year);
    }
  }

  /**
   * Limpa todo o cache de feriados
   */
  clearHolidayCache(): void {
    this.holidayCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Limpa o cache de um ano específico
   * 
   * @param year - Ano
   * @private
   */
  private clearCacheForYear(year: number): void {
    this.holidayCache.delete(year);
    this.cacheExpiry.delete(year);
  }

  /**
   * Formata uma data para comparação (YYYY-MM-DD)
   * 
   * @param date - Data
   * @returns String formatada
   * @private
   */
  private formatDateForComparison(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Instância singleton do serviço de dias úteis
 */
export const businessDayService = new BusinessDayService();

/**
 * Export default para compatibilidade
 */
export default businessDayService;
