/**
 * Hook para buscar informações de produção de um pedido
 *
 * Busca dados da production_queue e character_choices para exibir
 * status de produção e escolha de personagem.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProductionStage, ChoiceStatus } from '@/services/admin/production-service';

export interface ProductionInfo {
  id: string;
  orderId: string;
  currentStage: ProductionStage;
  choiceStatus: ChoiceStatus;
  choiceDeadline: string | null;
  characterName: string | null;
  estimatedCompletionDate: string | null;
}

export interface CharacterChoiceInfo {
  id: string;
  status: ChoiceStatus;
  deadline: string | null;
  characterId: string | null;
  characterName: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
}

/**
 * Busca informações de produção para um pedido específico
 */
export function useProductionInfo(orderId: string | null, orderType: 'subscription_delivery' | 'standalone_purchase' | null) {
  return useQuery({
    queryKey: ['production-info', orderId, orderType],
    queryFn: async () => {
      if (!orderId || !orderType) {
        return null;
      }

      // Buscar na production_queue
      const { data, error } = await supabase
        .from('production_queue')
        .select('id, order_id, current_stage, choice_status, choice_deadline, character_name, estimated_completion_date')
        .eq('order_id', orderId)
        .eq('order_type', orderType)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar informações de produção:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        orderId: data.order_id,
        currentStage: data.current_stage as ProductionStage,
        choiceStatus: data.choice_status as ChoiceStatus,
        choiceDeadline: data.choice_deadline,
        characterName: data.character_name,
        estimatedCompletionDate: data.estimated_completion_date
      } as ProductionInfo;
    },
    enabled: !!orderId && !!orderType,
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true
  });
}

/**
 * Busca informações de escolha de personagem para um pedido
 */
export function useCharacterChoice(orderId: string | null, orderType: 'subscription_delivery' | 'standalone_purchase' | null) {
  return useQuery({
    queryKey: ['character-choice', orderId, orderType],
    queryFn: async () => {
      if (!orderId || !orderType) {
        return null;
      }

      // Buscar na character_choices (usando campos desnormalizados)
      const { data, error } = await supabase
        .from('character_choices')
        .select(`
          id,
          status,
          deadline,
          character_id,
          character_name,
          submitted_at,
          approved_at
        `)
        .eq('order_id', orderId)
        .eq('order_type', orderType)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar escolha de personagem:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        status: data.status as ChoiceStatus,
        deadline: data.deadline,
        characterId: data.character_id,
        characterName: data.character_name || null,
        submittedAt: data.submitted_at,
        approvedAt: data.approved_at
      } as CharacterChoiceInfo;
    },
    enabled: !!orderId && !!orderType,
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true
  });
}
