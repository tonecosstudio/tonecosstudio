/**
 * CycleService
 * 
 * Serviço para gerenciamento de ciclos quinzenais de produção.
 * Responsável por identificar, criar e gerenciar ciclos de produção e envio.
 * 
 * @module cycleService
 */

import { supabase } from '@/integrations/supabase/client';
import { timezoneService } from './timezoneService';
import { businessDayService } from './businessDayService';

/**
 * Tipos
 */
export type CycleStatus = 'open' | 'production' | 'shipping' | 'completed';

export interface Cycle {
  id: string;
  created_at: string;
  updated_at: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  open_start: string;
  open_end: string;
  production_start: string;
  production_end: string;
  shipping_date: string;
  status: CycleStatus;
  status_changed_at: string | null;
  capacity_max: number;
  capacity_current: number;
}

export interface CycleCapacity {
  current: number;
  max: number;
  available: number;
}

/**
 * CycleService Class
 */
class CycleService {
  /**
   * Identifica o número do ciclo (1 ou 2) baseado na data
   * 
   * Ciclo 1: dias 1-15 do mês
   * Ciclo 2: dias 16-fim do mês
   * 
   * @param date - Data para identificar o ciclo (em America/Bahia timezone)
   * @returns 1 ou 2
   * 
   * @example
   * const cycleNum = cycleService.identifyCycleNumber(new Date('2026-03-10'));
   * // 1 (dia 10 está no Ciclo 1)
   * 
   * const cycleNum2 = cycleService.identifyCycleNumber(new Date('2026-03-20'));
   * // 2 (dia 20 está no Ciclo 2)
   */
  identifyCycleNumber(date: Date): 1 | 2 {
    // Converter para timezone do sistema
    const systemDate = timezoneService.toSystemTimezone(date);
    
    // Obter dia do mês
    const day = timezoneService.getDayOfMonth(systemDate);
    
    // Ciclo 1: dias 1-15, Ciclo 2: dias 16-fim
    return day <= 15 ? 1 : 2;
  }

  /**
   * Obtém o ciclo atual baseado na data fornecida ou data atual
   * 
   * @param date - Data de referência (opcional, padrão: agora)
   * @returns Ciclo atual ou null se não existir
   * 
   * @example
   * const cycle = await cycleService.getCurrentCycle();
   * console.log(`Ciclo ${cycle.cycle_number} de ${cycle.month}/${cycle.year}`);
   */
  async getCurrentCycle(date?: Date): Promise<Cycle | null> {
    const referenceDate = date || timezoneService.getCurrentTime();
    const systemDate = timezoneService.toSystemTimezone(referenceDate);
    
    const cycleNumber = this.identifyCycleNumber(systemDate);
    const month = timezoneService.getMonth(systemDate);
    const year = timezoneService.getYear(systemDate);
    
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('cycle_number', cycleNumber)
      .eq('month', month)
      .eq('year', year)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar ciclo atual: ${error.message}`);
    }
    
    return data as Cycle;
  }

  /**
   * Cria um ciclo se não existir
   * 
   * @param cycleNumber - Número do ciclo (1 ou 2)
   * @param month - Mês (1-12)
   * @param year - Ano
   * @returns Ciclo criado ou existente
   */
  async createCycleIfNotExists(
    cycleNumber: 1 | 2,
    month: number,
    year: number
  ): Promise<Cycle> {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('cycles')
      .select('*')
      .eq('cycle_number', cycleNumber)
      .eq('month', month)
      .eq('year', year)
      .single();
    
    if (existing) {
      return existing as Cycle;
    }
    
    // Calcular datas do ciclo
    const dates = this.calculateCycleDates(cycleNumber, month, year);
    
    // Calcular data de envio (5º dia útil do mês seguinte)
    const shippingDate = await this.calculateShippingDate(month, year);
    
    // Criar ciclo
    const { data, error } = await supabase
      .from('cycles')
      .insert({
        cycle_number: cycleNumber,
        month,
        year,
        open_start: dates.openStart.toISOString(),
        open_end: dates.openEnd.toISOString(),
        production_start: dates.productionStart.toISOString(),
        production_end: dates.productionEnd.toISOString(),
        shipping_date: shippingDate.toISOString().split('T')[0],
        status: 'open',
        capacity_max: 100,
        capacity_current: 0,
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erro ao criar ciclo: ${error.message}`);
    }
    
    return data as Cycle;
  }

  /**
   * Obtém ou cria o ciclo atual
   * 
   * @returns Ciclo atual (criado se não existir)
   */
  async getOrCreateCurrentCycle(): Promise<Cycle> {
    const now = timezoneService.getCurrentTime();
    const systemDate = timezoneService.toSystemTimezone(now);
    
    const cycleNumber = this.identifyCycleNumber(systemDate);
    const month = timezoneService.getMonth(systemDate);
    const year = timezoneService.getYear(systemDate);
    
    // Tentar buscar
    const existing = await this.getCurrentCycle(now);
    if (existing) {
      return existing;
    }
    
    // Criar se não existir
    return this.createCycleIfNotExists(cycleNumber, month, year);
  }

  /**
   * Calcula as datas de um ciclo
   * 
   * @param cycleNumber - Número do ciclo (1 ou 2)
   * @param month - Mês (1-12)
   * @param year - Ano
   * @returns Datas do ciclo
   */
  private calculateCycleDates(
    cycleNumber: 1 | 2,
    month: number,
    year: number
  ): {
    openStart: Date;
    openEnd: Date;
    productionStart: Date;
    productionEnd: Date;
  } {
    if (cycleNumber === 1) {
      // Ciclo 1: dias 1-15 (pedidos) → 16-fim (produção)
      const openStart = timezoneService.createDate(year, month, 1, 0, 0, 0);
      const openEnd = timezoneService.createDate(year, month, 15, 23, 59, 59);
      const productionStart = timezoneService.createDate(year, month, 16, 0, 0, 0);
      
      // Fim da produção = último dia do mês às 23:59:59
      const lastDay = new Date(year, month, 0).getDate(); // Último dia do mês
      const productionEnd = timezoneService.createDate(year, month, lastDay, 23, 59, 59);
      
      return { openStart, openEnd, productionStart, productionEnd };
    } else {
      // Ciclo 2: dias 16-fim (pedidos) → mês seguinte (produção)
      const openStart = timezoneService.createDate(year, month, 16, 0, 0, 0);
      
      // Fim do período de pedidos = último dia do mês às 23:59:59
      const lastDay = new Date(year, month, 0).getDate();
      const openEnd = timezoneService.createDate(year, month, lastDay, 23, 59, 59);
      
      // Produção no mês seguinte
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const productionStart = timezoneService.createDate(nextYear, nextMonth, 1, 0, 0, 0);
      
      // Fim da produção = último dia do mês seguinte às 23:59:59
      const lastDayNextMonth = new Date(nextYear, nextMonth, 0).getDate();
      const productionEnd = timezoneService.createDate(nextYear, nextMonth, lastDayNextMonth, 23, 59, 59);
      
      return { openStart, openEnd, productionStart, productionEnd };
    }
  }

  /**
   * Calcula a data de envio (5º dia útil do mês seguinte ao de produção)
   * 
   * @param month - Mês do ciclo
   * @param year - Ano do ciclo
   * @returns Data de envio
   */
  private async calculateShippingDate(month: number, year: number): Promise<Date> {
    // Envio é no mês seguinte ao de produção
    // Para Ciclo 1: produção em month, envio em month+1
    // Para Ciclo 2: produção em month+1, envio em month+2
    
    // Como esta função é chamada durante criação do ciclo,
    // vamos calcular para o mês seguinte ao mês do ciclo
    const shippingMonth = month === 12 ? 1 : month + 1;
    const shippingYear = month === 12 ? year + 1 : year;
    
    // 5º dia útil do mês de envio
    const fifthBusinessDay = await businessDayService.calculateNthBusinessDay(
      shippingMonth,
      shippingYear,
      5
    );
    
    return fifthBusinessDay;
  }

  /**
   * Transiciona o status de um ciclo
   * 
   * @param cycleId - ID do ciclo
   * @param newStatus - Novo status
   */
  async transitionCycleStatus(cycleId: string, newStatus: CycleStatus): Promise<void> {
    const { error } = await supabase
      .from('cycles')
      .update({
        status: newStatus,
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', cycleId);
    
    if (error) {
      throw new Error(`Erro ao atualizar status do ciclo: ${error.message}`);
    }
  }

  /**
   * Verifica e transiciona status de todos os ciclos
   * (Para ser executado por cron job)
   */
  async checkAndTransitionCycles(): Promise<void> {
    const now = timezoneService.getCurrentTime();
    
    // Buscar todos os ciclos que não estão completed
    const { data: cycles, error } = await supabase
      .from('cycles')
      .select('*')
      .neq('status', 'completed');
    
    if (error) {
      throw new Error(`Erro ao buscar ciclos: ${error.message}`);
    }
    
    if (!cycles || cycles.length === 0) {
      return;
    }
    
    // Verificar cada ciclo
    for (const cycle of cycles) {
      const openEnd = new Date(cycle.open_end);
      const productionEnd = new Date(cycle.production_end);
      const shippingDate = new Date(cycle.shipping_date);
      
      if (cycle.status === 'open' && now > openEnd) {
        // Período de pedidos encerrado → transicionar para production
        await this.transitionCycleStatus(cycle.id, 'production');
      } else if (cycle.status === 'production' && now > productionEnd) {
        // Produção encerrada → transicionar para shipping
        await this.transitionCycleStatus(cycle.id, 'shipping');
      } else if (cycle.status === 'shipping' && now > shippingDate) {
        // Envio realizado → transicionar para completed
        await this.transitionCycleStatus(cycle.id, 'completed');
      }
    }
  }

  /**
   * Verifica a capacidade de um ciclo
   * 
   * @param cycleId - ID do ciclo
   * @returns Capacidade atual, máxima e disponível
   */
  async checkCapacity(cycleId: string): Promise<CycleCapacity> {
    const { data, error } = await supabase
      .from('cycles')
      .select('capacity_current, capacity_max')
      .eq('id', cycleId)
      .single();
    
    if (error) {
      throw new Error(`Erro ao verificar capacidade: ${error.message}`);
    }
    
    return {
      current: data.capacity_current,
      max: data.capacity_max,
      available: data.capacity_max - data.capacity_current,
    };
  }

  /**
   * Incrementa a capacidade de um ciclo
   * 
   * @param cycleId - ID do ciclo
   */
  async incrementCapacity(cycleId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_cycle_capacity', {
      cycle_id: cycleId,
    });
    
    if (error) {
      // Se a função não existir, fazer manualmente
      const { data: cycle } = await supabase
        .from('cycles')
        .select('capacity_current')
        .eq('id', cycleId)
        .single();
      
      if (cycle) {
        await supabase
          .from('cycles')
          .update({ capacity_current: cycle.capacity_current + 1 })
          .eq('id', cycleId);
      }
    }
  }

  /**
   * Decrementa a capacidade de um ciclo
   * 
   * @param cycleId - ID do ciclo
   */
  async decrementCapacity(cycleId: string): Promise<void> {
    const { error } = await supabase.rpc('decrement_cycle_capacity', {
      cycle_id: cycleId,
    });
    
    if (error) {
      // Se a função não existir, fazer manualmente
      const { data: cycle } = await supabase
        .from('cycles')
        .select('capacity_current')
        .eq('id', cycleId)
        .single();
      
      if (cycle) {
        await supabase
          .from('cycles')
          .update({ capacity_current: Math.max(0, cycle.capacity_current - 1) })
          .eq('id', cycleId);
      }
    }
  }

  /**
   * Busca um ciclo por ID
   * 
   * @param cycleId - ID do ciclo
   * @returns Ciclo encontrado
   */
  async getCycleById(cycleId: string): Promise<Cycle> {
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('id', cycleId)
      .single();
    
    if (error) {
      throw new Error(`Erro ao buscar ciclo: ${error.message}`);
    }
    
    return data as Cycle;
  }

  /**
   * Busca ciclos de um mês específico
   * 
   * @param month - Mês (1-12)
   * @param year - Ano
   * @returns Lista de ciclos
   */
  async getCyclesByMonth(month: number, year: number): Promise<Cycle[]> {
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('cycle_number', { ascending: true });
    
    if (error) {
      throw new Error(`Erro ao buscar ciclos: ${error.message}`);
    }
    
    return (data as Cycle[]) || [];
  }

  /**
   * Busca os próximos N ciclos a partir de uma data
   * 
   * @param count - Quantidade de ciclos
   * @param startDate - Data inicial (opcional, padrão: agora)
   * @returns Lista de ciclos
   */
  async getNextCycles(count: number, startDate?: Date): Promise<Cycle[]> {
    const referenceDate = startDate || timezoneService.getCurrentTime();
    const systemDate = timezoneService.toSystemTimezone(referenceDate);
    
    let currentMonth = timezoneService.getMonth(systemDate);
    let currentYear = timezoneService.getYear(systemDate);
    let currentCycleNumber = this.identifyCycleNumber(systemDate);
    
    const cycles: Cycle[] = [];
    
    for (let i = 0; i < count; i++) {
      // Criar ciclo se não existir
      const cycle = await this.createCycleIfNotExists(
        currentCycleNumber,
        currentMonth,
        currentYear
      );
      
      cycles.push(cycle);
      
      // Avançar para próximo ciclo
      if (currentCycleNumber === 1) {
        currentCycleNumber = 2;
      } else {
        currentCycleNumber = 1;
        currentMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        if (currentMonth === 1) {
          currentYear++;
        }
      }
    }
    
    return cycles;
  }
}

// Exportar instância singleton
export const cycleService = new CycleService();
