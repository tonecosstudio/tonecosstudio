/**
 * Hook para gerenciar sistema de coins de assinatura
 * Sistema híbrido: cliente escolhe coleção ativa e personagens mensais
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

export interface MonthlyRelease {
  id: string;
  collection_id: string;
  character_id: string;
  release_month: string;
  collection_name: string;
  collection_slug: string;
  character_name: string;
  character_description: string | null;
  character_image_url: string | null;
  character_type: string;
}

export interface MonthlySelection {
  id: string;
  subscription_id: string;
  character_id: string;
  collection_id: string;
  delivery_month: string;
  coins_spent: number;
  is_auto_selected: boolean;
  status: string;
  selected_at: string;
  character_name: string;
  collection_name: string;
  is_active_collection: boolean;
}

export interface SelectionImpact {
  current_balance: number;
  character_price: number;
  new_balance: number;
  months_remaining: number;
  min_price_next_month: number;
  will_be_insufficient: boolean;
  coins_needed: number;
  is_active_collection: boolean;
}

export interface SubscriptionCoinsData {
  subscription_id: string;
  active_collection_id: string | null;
  active_collection_name: string | null;
  coins_balance: number;
  coins_initial: number;
  coins_spent: number;
  plan_type: string;
  status: string;
}

/**
 * Helper para verificar se pode trocar escolha
 */
export function canChangeSelection(selection: MonthlySelection | null, deliveryMonth: string): {
  canChange: boolean;
  reason?: string;
} {
  // Se não há escolha, pode escolher (desde que dentro do prazo)
  if (!selection) {
    const today = new Date();
    const [year, month] = deliveryMonth.split('-');
    const deadline = new Date(parseInt(year), parseInt(month) - 1, 15, 23, 59, 59);
    
    if (today > deadline) {
      return {
        canChange: false,
        reason: 'Prazo encerrado (dia 15 às 23:59)',
      };
    }
    
    return { canChange: true };
  }

  // Verificar prazo
  const today = new Date();
  const [year, month] = deliveryMonth.split('-');
  const deadline = new Date(parseInt(year), parseInt(month) - 1, 15, 23, 59, 59);
  
  if (today > deadline) {
    return {
      canChange: false,
      reason: 'Prazo encerrado (dia 15 às 23:59)',
    };
  }

  // Verificar status
  if (selection.status === 'in_production') {
    return {
      canChange: false,
      reason: 'Peça em produção',
    };
  }

  if (selection.status === 'shipped') {
    return {
      canChange: false,
      reason: 'Peça já enviada',
    };
  }

  if (selection.status === 'delivered') {
    return {
      canChange: false,
      reason: 'Peça já entregue',
    };
  }

  // Pode trocar se status = 'pending' ou 'confirmed'
  if (['pending', 'confirmed'].includes(selection.status)) {
    return { canChange: true };
  }

  return {
    canChange: false,
    reason: 'Status não permite alteração',
  };
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar dados de coins da assinatura
 */
export function useSubscriptionCoins(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ['subscription-coins', subscriptionId],
    enabled: Boolean(subscriptionId),
    queryFn: async (): Promise<SubscriptionCoinsData | null> => {
      if (!subscriptionId) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          active_collection_id,
          coins_balance,
          coins_initial,
          plan_type,
          status,
          collections:active_collection_id (
            name
          )
        `)
        .eq('id', subscriptionId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        subscription_id: data.id,
        active_collection_id: data.active_collection_id,
        active_collection_name: data.collections?.name || null,
        coins_balance: data.coins_balance || 0,
        coins_initial: data.coins_initial || 0,
        coins_spent: (data.coins_initial || 0) - (data.coins_balance || 0),
        plan_type: data.plan_type,
        status: data.status,
      };
    },
  });
}

/**
 * Hook para buscar lançamentos mensais disponíveis
 */
export function useMonthlyReleases(month: string) {
  return useQuery({
    queryKey: ['monthly-releases', month],
    enabled: Boolean(month),
    queryFn: async (): Promise<MonthlyRelease[]> => {
      const { data, error } = await supabase
        .from('collection_monthly_releases')
        .select(`
          id,
          collection_id,
          character_id,
          release_month,
          collections (
            name,
            slug
          ),
          collection_characters (
            name,
            description,
            image_url,
            character_type
          )
        `)
        .eq('release_month', month)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        collection_id: item.collection_id,
        character_id: item.character_id,
        release_month: item.release_month,
        collection_name: item.collections?.name || '',
        collection_slug: item.collections?.slug || '',
        character_name: item.collection_characters?.name || '',
        character_description: item.collection_characters?.description || null,
        character_image_url: item.collection_characters?.image_url || null,
        character_type: item.collection_characters?.character_type || 'standard',
      }));
    },
  });
}

/**
 * Hook para buscar escolhas mensais do usuário
 */
export function useMonthlySelections(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ['monthly-selections', subscriptionId],
    enabled: Boolean(subscriptionId),
    queryFn: async (): Promise<MonthlySelection[]> => {
      if (!subscriptionId) return [];

      const { data, error } = await supabase
        .from('subscription_selections_detailed')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('delivery_month', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });
}

/**
 * Hook para simular impacto de uma escolha
 */
export function useSimulateSelection() {
  return useMutation({
    mutationFn: async ({
      subscriptionId,
      characterId,
      deliveryMonth,
    }: {
      subscriptionId: string;
      characterId: string;
      deliveryMonth: string;
    }): Promise<SelectionImpact> => {
      const { data, error } = await supabase.rpc('simulate_character_selection_impact', {
        p_subscription_id: subscriptionId,
        p_character_id: characterId,
        p_delivery_month: deliveryMonth,
      });

      if (error) throw error;

      return data as SelectionImpact;
    },
  });
}

/**
 * Hook para selecionar personagem
 */
export function useSelectCharacter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      characterId,
      collectionId,
      deliveryMonth,
      coinsSpent,
    }: {
      subscriptionId: string;
      characterId: string;
      collectionId: string;
      deliveryMonth: string;
      coinsSpent: number;
    }) => {
      // Validar prazo de escolha (até dia 15 do mês)
      const today = new Date();
      const [year, month] = deliveryMonth.split('-');
      const deadline = new Date(parseInt(year), parseInt(month) - 1, 15, 23, 59, 59);
      
      if (today > deadline) {
        throw new Error(
          `O prazo para escolher personagens de ${deliveryMonth} encerrou no dia 15 às 23:59. ` +
          'Não é mais possível fazer ou alterar escolhas para este mês.'
        );
      }

      // Verificar se já existe escolha para este mês
      const { data: existing } = await supabase
        .from('subscription_monthly_selections')
        .select('id, status')
        .eq('subscription_id', subscriptionId)
        .eq('delivery_month', deliveryMonth)
        .maybeSingle();

      if (existing) {
        // Validar status antes de permitir troca
        if (existing.status === 'in_production') {
          throw new Error(
            'Não é possível trocar o personagem. A peça já entrou em produção.'
          );
        }

        if (['shipped', 'delivered'].includes(existing.status)) {
          throw new Error(
            'Não é possível trocar o personagem. A peça já foi enviada.'
          );
        }

        // Permitir troca apenas se status = 'pending' ou 'confirmed'
        if (!['pending', 'confirmed'].includes(existing.status)) {
          throw new Error(
            'Não é possível trocar o personagem neste momento.'
          );
        }

        // Atualizar escolha existente
        const { error } = await supabase
          .from('subscription_monthly_selections')
          .update({
            character_id: characterId,
            collection_id: collectionId,
            coins_spent: coinsSpent,
            is_auto_selected: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar nova escolha
        const { error } = await supabase
          .from('subscription_monthly_selections')
          .insert({
            subscription_id: subscriptionId,
            character_id: characterId,
            collection_id: collectionId,
            delivery_month: deliveryMonth,
            coins_spent: coinsSpent,
            is_auto_selected: false,
            status: 'pending',
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-coins', variables.subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-selections', variables.subscriptionId] });
      
      toast({
        title: 'Personagem selecionado!',
        description: 'Sua escolha foi salva com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao selecionar personagem',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para calcular preço contextual
 */
export function useContextualPrice() {
  return useMutation({
    mutationFn: async ({
      characterId,
      activeCollectionId,
    }: {
      characterId: string;
      activeCollectionId: string;
    }): Promise<number> => {
      const { data, error } = await supabase.rpc('get_contextual_character_price', {
        p_character_id: characterId,
        p_active_collection_id: activeCollectionId,
      });

      if (error) throw error;

      return data as number;
    },
  });
}

/**
 * Hook para executar escolha automática
 */
export function useAutoSelectCharacters() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.rpc('auto_select_characters_for_subscription', {
        p_subscription_id: subscriptionId,
      });

      if (error) throw error;

      return data;
    },
    onSuccess: (_, subscriptionId) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-coins', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-selections', subscriptionId] });
      
      toast({
        title: 'Escolha automática realizada',
        description: 'Personagens da sua coleção ativa foram selecionados automaticamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro na escolha automática',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
