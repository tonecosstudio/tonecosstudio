// @ts-nocheck
/**
 * DeliveryService
 * 
 * Serviço para gerenciamento de entregas consecutivas de assinaturas.
 * Responsável por agendar, atualizar e gerenciar entregas vinculadas a ciclos.
 * 
 * @module deliveryService
 */

import { supabase } from '@/integrations/supabase/client';
import { cycleService, Cycle } from './cycleService';

/**
 * Tipos
 */
export type DeliveryStatus = 
  | 'scheduled'
  | 'pending_production'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PlanType = 'trimestral' | 'semestral';

export interface Delivery {
  id: string;
  created_at: string;
  updated_at: string;
  subscription_id: string;
  cycle_id: string;
  character_id: string | null;
  delivery_number: number;
  status: DeliveryStatus;
  status_changed_at: string | null;
  scheduled_date: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking_code: string | null;
}

/**
 * DeliveryService Class
 */
class DeliveryService {
  /**
   * Agenda entregas consecutivas para uma assinatura
   * 
   * Cria N entregas (3 para trimestral, 6 para semestral) nos próximos N ciclos
   * consecutivos após o ciclo de entrada da assinatura.
   * 
   * @param subscriptionId - ID da assinatura
   * @param planType - Tipo do plano ('trimestral' ou 'semestral')
   * @param entryCycleId - ID do ciclo de entrada (onde a assinatura foi criada)
   * @returns Array de entregas criadas
   * 
   * @example
   * // Assinatura criada no Ciclo 2 de Março
   * const deliveries = await deliveryService.scheduleConsecutiveDeliveries(
   *   'sub-123',
   *   'trimestral',
   *   'cycle-2-march-2026'
   * );
   * // Resultado: 3 entregas nos ciclos:
   * // - Ciclo 1 de Abril (1ª entrega)
   * // - Ciclo 2 de Abril (2ª entrega)
   * // - Ciclo 1 de Maio (3ª entrega)
   */
  async scheduleConsecutiveDeliveries(
    subscriptionId: string,
    planType: PlanType,
    entryCycleId: string
  ): Promise<Delivery[]> {
    // Determinar número de entregas baseado no tipo de plano
    const deliveryCount = planType === 'trimestral' ? 3 : 6;
    
    // Obter ciclo de entrada
    const entryCycle = await cycleService.getCycleById(entryCycleId);
    
    // Obter próximos N ciclos consecutivos após o ciclo de entrada
    const nextCycles = await this.getNextConsecutiveCycles(entryCycle, deliveryCount);
    
    // Criar entregas para cada ciclo
    const deliveries: Delivery[] = [];
    
    for (let i = 0; i < deliveryCount; i++) {
      const targetCycle = nextCycles[i];
      
      const { data, error } = await supabase
        .from('subscription_deliveries')
        .insert({
          subscription_id: subscriptionId,
          cycle_id: targetCycle.id,
          delivery_number: i + 1,
          status: 'scheduled',
          scheduled_date: targetCycle.shipping_date,
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Erro ao criar entrega ${i + 1}: ${error.message}`);
      }
      
      deliveries.push(data as Delivery);
    }
    
    return deliveries;
  }

  /**
   * Obtém os próximos N ciclos consecutivos após um ciclo inicial
   * 
   * @param startCycle - Ciclo inicial (ciclo de entrada)
   * @param count - Quantidade de ciclos consecutivos necessários
   * @returns Array de ciclos consecutivos
   * 
   * @private
   */
  private async getNextConsecutiveCycles(
    startCycle: Cycle,
    count: number
  ): Promise<Cycle[]> {
    const cycles: Cycle[] = [];
    
    let currentMonth = startCycle.month;
    let currentYear = startCycle.year;
    let currentCycleNumber = startCycle.cycle_number;
    
    for (let i = 0; i < count; i++) {
      // Avançar para o próximo ciclo
      if (currentCycleNumber === 1) {
        // Ciclo 1 → Ciclo 2 (mesmo mês)
        currentCycleNumber = 2;
      } else {
        // Ciclo 2 → Ciclo 1 (próximo mês)
        currentCycleNumber = 1;
        currentMonth++;
        
        // Virar o ano se necessário
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
      
      // Obter ou criar o ciclo
      const cycle = await cycleService.createCycleIfNotExists(
        currentCycleNumber,
        currentMonth,
        currentYear
      );
      
      cycles.push(cycle);
    }
    
    return cycles;
  }

  /**
   * Atualiza o status de uma entrega
   * 
   * @param deliveryId - ID da entrega
   * @param status - Novo status
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus
  ): Promise<void> {
    const updateData: any = {
      status,
      status_changed_at: new Date().toISOString(),
    };
    
    // Adicionar timestamps específicos baseado no status
    if (status === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('subscription_deliveries')
      .update(updateData)
      .eq('id', deliveryId);
    
    if (error) {
      throw new Error(`Erro ao atualizar status da entrega: ${error.message}`);
    }
  }

  /**
   * Associa uma entrega a um ciclo
   * 
   * @param deliveryId - ID da entrega
   * @param cycleId - ID do ciclo
   */
  async assignDeliveryToCycle(
    deliveryId: string,
    cycleId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('subscription_deliveries')
      .update({ cycle_id: cycleId })
      .eq('id', deliveryId);
    
    if (error) {
      throw new Error(`Erro ao associar entrega ao ciclo: ${error.message}`);
    }
  }

  /**
   * Busca entregas de uma assinatura
   * 
   * @param subscriptionId - ID da assinatura
   * @returns Lista de entregas ordenadas por número
   */
  async getDeliveriesBySubscription(subscriptionId: string): Promise<Delivery[]> {
    const { data, error } = await supabase
      .from('subscription_deliveries')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('delivery_number', { ascending: true });
    
    if (error) {
      throw new Error(`Erro ao buscar entregas: ${error.message}`);
    }
    
    return (data as Delivery[]) || [];
  }

  /**
   * Busca entregas de um ciclo
   * 
   * @param cycleId - ID do ciclo
   * @returns Lista de entregas do ciclo
   */
  async getDeliveriesByCycle(cycleId: string): Promise<Delivery[]> {
    const { data, error } = await supabase
      .from('subscription_deliveries')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('delivery_number', { ascending: true });
    
    if (error) {
      throw new Error(`Erro ao buscar entregas do ciclo: ${error.message}`);
    }
    
    return (data as Delivery[]) || [];
  }

  /**
   * Busca a entrega atual de uma assinatura
   * 
   * @param subscriptionId - ID da assinatura
   * @returns Entrega atual ou null se não houver
   */
  async getCurrentDelivery(subscriptionId: string): Promise<Delivery | null> {
    const { data, error } = await supabase
      .from('subscription_deliveries')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .in('status', ['scheduled', 'pending_production', 'pending', 'processing'])
      .order('delivery_number', { ascending: true })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar entrega atual: ${error.message}`);
    }
    
    return data as Delivery;
  }

  /**
   * Verifica se é possível trocar o personagem de uma entrega
   * 
   * Uma troca só é permitida se o ciclo da entrega estiver com status "open"
   * 
   * @param deliveryId - ID da entrega
   * @returns true se a troca é permitida, false caso contrário
   */
  async canChangeCharacter(deliveryId: string): Promise<boolean> {
    // Buscar entrega com informações do ciclo
    const { data: delivery, error } = await supabase
      .from('subscription_deliveries')
      .select('cycle_id')
      .eq('id', deliveryId)
      .single();
    
    if (error) {
      throw new Error(`Erro ao buscar entrega: ${error.message}`);
    }
    
    if (!delivery.cycle_id) {
      return false;
    }
    
    // Buscar ciclo
    const cycle = await cycleService.getCycleById(delivery.cycle_id);
    
    // Permitir troca apenas se ciclo estiver "open"
    return cycle.status === 'open';
  }

  /**
   * Troca o personagem de uma entrega
   * 
   * @param deliveryId - ID da entrega
   * @param newCharacterId - ID do novo personagem
   * @throws Error se a troca não for permitida
   */
  async changeCharacter(
    deliveryId: string,
    newCharacterId: string
  ): Promise<void> {
    // Verificar se a troca é permitida
    const canChange = await this.canChangeCharacter(deliveryId);
    
    if (!canChange) {
      throw new Error(
        'Não é possível trocar o personagem. O ciclo já está em produção ou foi encerrado.'
      );
    }
    
    // Realizar a troca
    const { error } = await supabase
      .from('subscription_deliveries')
      .update({ character_id: newCharacterId })
      .eq('id', deliveryId);
    
    if (error) {
      throw new Error(`Erro ao trocar personagem: ${error.message}`);
    }
  }
}

// Exportar instância singleton
export const deliveryService = new DeliveryService();
