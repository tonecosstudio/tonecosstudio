// @ts-nocheck
/**
 * BonusPieceService
 * 
 * Serviço para gerenciamento de peças bônus do plano semestral.
 * Responsável por criar, vincular e atualizar status de peças bônus.
 * 
 * @module bonusPieceService
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Tipos
 */
export type BonusStatus = 'pending' | 'prepared' | 'shipped';

export interface BonusPiece {
  id: string;
  created_at: string;
  updated_at: string;
  subscription_id: string;
  delivery_id: string | null;
  description: string | null;
  status: BonusStatus;
  prepared_at: string | null;
  shipped_at: string | null;
}

/**
 * BonusPieceService Class
 */
class BonusPieceService {
  /**
   * Cria uma peça bônus para uma assinatura semestral
   * 
   * Peças bônus são exclusivas do plano semestral e devem ser enviadas
   * junto com a última entrega (6ª entrega).
   * 
   * @param subscriptionId - ID da assinatura semestral
   * @param description - Descrição opcional da peça bônus
   * @returns Peça bônus criada
   * 
   * @example
   * const bonus = await bonusPieceService.createBonusPiece(
   *   'sub-123',
   *   'Peça exclusiva edição limitada'
   * );
   */
  async createBonusPiece(
    subscriptionId: string,
    description?: string
  ): Promise<BonusPiece> {
    const { data, error } = await supabase
      .from('bonus_pieces')
      .insert({
        subscription_id: subscriptionId,
        description: description || null,
        status: 'pending',
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erro ao criar peça bônus: ${error.message}`);
    }
    
    return data as BonusPiece;
  }

  /**
   * Vincula uma peça bônus a uma entrega específica
   * 
   * Normalmente, a peça bônus é vinculada à última entrega (6ª) da
   * assinatura semestral para ser enviada junto.
   * 
   * @param bonusId - ID da peça bônus
   * @param deliveryId - ID da entrega (geralmente a 6ª entrega)
   * 
   * @example
   * await bonusPieceService.linkBonusToDelivery(
   *   'bonus-123',
   *   'delivery-6-id'
   * );
   */
  async linkBonusToDelivery(
    bonusId: string,
    deliveryId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('bonus_pieces')
      .update({ delivery_id: deliveryId })
      .eq('id', bonusId);
    
    if (error) {
      throw new Error(`Erro ao vincular peça bônus à entrega: ${error.message}`);
    }
  }

  /**
   * Atualiza o status de uma peça bônus
   * 
   * Status possíveis:
   * - pending: Aguardando preparação
   * - prepared: Preparada e pronta para envio
   * - shipped: Enviada junto com a entrega
   * 
   * @param bonusId - ID da peça bônus
   * @param status - Novo status
   * 
   * @example
   * // Marcar como preparada
   * await bonusPieceService.updateBonusStatus('bonus-123', 'prepared');
   * 
   * // Marcar como enviada
   * await bonusPieceService.updateBonusStatus('bonus-123', 'shipped');
   */
  async updateBonusStatus(
    bonusId: string,
    status: BonusStatus
  ): Promise<void> {
    const updateData: any = {
      status,
    };
    
    // Adicionar timestamps específicos baseado no status
    if (status === 'prepared') {
      updateData.prepared_at = new Date().toISOString();
    } else if (status === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('bonus_pieces')
      .update(updateData)
      .eq('id', bonusId);
    
    if (error) {
      throw new Error(`Erro ao atualizar status da peça bônus: ${error.message}`);
    }
  }

  /**
   * Busca a peça bônus de uma assinatura
   * 
   * @param subscriptionId - ID da assinatura
   * @returns Peça bônus ou null se não existir
   */
  async getBonusBySubscription(subscriptionId: string): Promise<BonusPiece | null> {
    const { data, error } = await supabase
      .from('bonus_pieces')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar peça bônus: ${error.message}`);
    }
    
    return data as BonusPiece;
  }

  /**
   * Busca todas as peças bônus de um ciclo
   * 
   * Útil para o admin panel visualizar quais bônus devem ser enviados
   * em um determinado ciclo.
   * 
   * @param cycleId - ID do ciclo
   * @returns Lista de peças bônus do ciclo
   */
  async getBonusesByCycle(cycleId: string): Promise<BonusPiece[]> {
    const { data, error } = await supabase
      .from('bonus_pieces')
      .select(`
        *,
        delivery:subscription_deliveries!inner(cycle_id)
      `)
      .eq('delivery.cycle_id', cycleId);
    
    if (error) {
      throw new Error(`Erro ao buscar peças bônus do ciclo: ${error.message}`);
    }
    
    return (data as any[]).map(item => ({
      id: item.id,
      created_at: item.created_at,
      updated_at: item.updated_at,
      subscription_id: item.subscription_id,
      delivery_id: item.delivery_id,
      description: item.description,
      status: item.status,
      prepared_at: item.prepared_at,
      shipped_at: item.shipped_at,
    })) as BonusPiece[];
  }

  /**
   * Busca todas as peças bônus pendentes
   * 
   * Útil para o admin panel visualizar quais bônus ainda precisam
   * ser preparados.
   * 
   * @returns Lista de peças bônus com status 'pending'
   */
  async getPendingBonuses(): Promise<BonusPiece[]> {
    const { data, error } = await supabase
      .from('bonus_pieces')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new Error(`Erro ao buscar peças bônus pendentes: ${error.message}`);
    }
    
    return (data as BonusPiece[]) || [];
  }
}

// Exportar instância singleton
export const bonusPieceService = new BonusPieceService();
