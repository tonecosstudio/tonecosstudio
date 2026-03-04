// @ts-nocheck
/**
 * Hook para gerenciar níveis de preço (Pricing Tiers)
 * 
 * Fornece queries e mutations para operações CRUD de níveis de preço.
 * Requisitos: 1.1, 1.5, 1.6, 1.7, 12.1
 * Tarefa: 8.1
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  PricingTier,
  PricingTierWithStats,
  CreatePricingTierInput,
  UpdatePricingTierInput,
  PropagateTierPricingResponse,
} from "@/types/pricing-tiers";
import {
  createPricingTierSchema,
  updatePricingTierSchema,
} from "@/lib/validations/pricing-tiers";

// =====================================================
// QUERY KEYS
// =====================================================

export const pricingTiersKeys = {
  all: ["pricing-tiers"] as const,
  lists: () => [...pricingTiersKeys.all, "list"] as const,
  list: (filters?: string) => [...pricingTiersKeys.lists(), filters] as const,
  details: () => [...pricingTiersKeys.all, "detail"] as const,
  detail: (id: string) => [...pricingTiersKeys.details(), id] as const,
  stats: () => [...pricingTiersKeys.all, "stats"] as const,
  active: () => [...pricingTiersKeys.all, "active"] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar todos os níveis de preço com estatísticas
 * Requisitos: 1.9, 11.2
 */
export function usePricingTiers() {
  return useQuery({
    queryKey: pricingTiersKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_tier_stats")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar níveis de preço: ${error.message}`);
      }

      return data as PricingTierWithStats[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar apenas níveis ativos
 * Requisitos: 1.5, 2.1
 */
export function useActivePricingTiers() {
  return useQuery({
    queryKey: pricingTiersKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar níveis ativos: ${error.message}`);
      }

      return data as PricingTier[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar um nível específico por ID
 * Requisitos: 1.5
 */
export function usePricingTier(tierId: string | null | undefined) {
  return useQuery({
    queryKey: pricingTiersKeys.detail(tierId || ""),
    queryFn: async () => {
      if (!tierId) return null;

      const { data, error } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("id", tierId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar nível: ${error.message}`);
      }

      return data as PricingTier;
    },
    enabled: !!tierId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar o nível padrão
 * Requisitos: 9.2, 9.3
 */
export function useDefaultPricingTier() {
  return useQuery({
    queryKey: [...pricingTiersKeys.all, "default"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        throw new Error(`Erro ao buscar nível padrão: ${error.message}`);
      }

      return data as PricingTier | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para criar um novo nível de preço
 * Requisitos: 1.1, 1.2, 1.3, 1.4
 */
export function useCreatePricingTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreatePricingTierInput) => {
      // Validar input
      const validated = createPricingTierSchema.parse(input);

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { data, error } = await supabase.rpc("create_pricing_tier", {
        p_name: validated.name,
        p_description: validated.description || null,
        p_price_full: validated.price_full,
        p_deposit_amount: validated.deposit_amount,
        p_pix_discount_percentage: validated.pix_discount_percentage || 5,
        p_is_default: validated.is_default || false,
        p_created_by: user.id,
      });

      if (error) {
        throw new Error(`Erro ao criar nível: ${error.message}`);
      }

      return data as string; // Retorna o ID do nível criado
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });

      toast({
        title: "Nível criado",
        description: "O nível de preço foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar nível",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar um nível de preço existente
 * Requisitos: 1.6, 3.1, 3.2
 */
export function useUpdatePricingTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tierId,
      input,
    }: {
      tierId: string;
      input: UpdatePricingTierInput;
    }) => {
      // Validar input
      const validated = updatePricingTierSchema.parse(input);

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { error } = await supabase.rpc("update_pricing_tier", {
        p_tier_id: tierId,
        p_name: validated.name || null,
        p_description: validated.description || null,
        p_price_full: validated.price_full || null,
        p_deposit_amount: validated.deposit_amount || null,
        p_pix_discount_percentage: validated.pix_discount_percentage || null,
        p_is_active: validated.is_active ?? null,
        p_is_default: validated.is_default ?? null,
        p_display_order: validated.display_order ?? null,
        p_updated_by: user.id,
      });

      if (error) {
        throw new Error(`Erro ao atualizar nível: ${error.message}`);
      }

      return tierId;
    },
    onSuccess: (tierId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.detail(tierId) });

      toast({
        title: "Nível atualizado",
        description: "O nível de preço foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar nível",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para desativar um nível de preço
 * Requisitos: 1.7, 1.8
 */
export function useDeactivatePricingTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tierId: string) => {
      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função de atualização para desativar
      const { error } = await supabase.rpc("update_pricing_tier", {
        p_tier_id: tierId,
        p_name: null,
        p_description: null,
        p_price_full: null,
        p_deposit_amount: null,
        p_pix_discount_percentage: null,
        p_is_active: false,
        p_is_default: null,
        p_display_order: null,
        p_updated_by: user.id,
      });

      if (error) {
        throw new Error(`Erro ao desativar nível: ${error.message}`);
      }

      return tierId;
    },
    onSuccess: (tierId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.detail(tierId) });

      toast({
        title: "Nível desativado",
        description: "O nível de preço foi desativado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desativar nível",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para propagar mudanças de preço de um nível
 * Requisitos: 3.1, 3.2, 3.3, 3.7
 */
export function usePropagateTierPricing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tierId: string) => {
      // Obter token de autenticação
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // Chamar Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/propagate-tier-pricing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tierId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao propagar preços");
      }

      const result = (await response.json()) as PropagateTierPricingResponse;
      return result;
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      const message =
        result.failed_count > 0
          ? `${result.updated_count} coleções atualizadas, ${result.failed_count} falharam.`
          : `${result.updated_count} coleções atualizadas com sucesso.`;

      toast({
        title: "Preços propagados",
        description: message,
        variant: result.failed_count > 0 ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao propagar preços",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
