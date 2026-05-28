/**
 * Hook para gerenciar multiplicador de preço por personagem
 * 
 * Permite admin configurar multiplicador individual para cada personagem,
 * ajustando o preço final baseado em características como tamanho,
 * complexidade ou raridade.
 * 
 * Spec: contextual-pricing-system
 * Task: 5.10 (RN008 - Character Price Multiplier)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  bulkUpdateCharacterPriceMultipliersRpc,
  updateCharacterPriceMultiplierRpc,
} from "@/services/admin/admin-config-mutations-service";
import {
  isValidMultiplier,
  CACHE_CONFIG,
} from "@/types/contextual-pricing";
import { characterPriceKeys } from "./useCharacterPrice";

// =====================================================
// TYPES
// =====================================================

export interface CharacterMultiplierData {
  character_id: string;
  character_name: string;
  price_multiplier: number | null;
  collection_id: string;
  collection_name: string;
}

export interface UpdateCharacterMultiplierInput {
  character_id: string;
  new_multiplier: number | null; // null = usar 1.0 padrão
}

export interface CharacterMultiplierPreset {
  label: string;
  value: number;
  description: string;
}

interface CharacterWithCollectionRow {
  id: string;
  name: string;
  price_multiplier: number | null;
  collection_id: string;
  collections: {
    name: string;
  } | null;
}

type QueryError = { message: string } | null;

interface CharacterMultiplierSupabaseClient {
  from(table: "characters"): {
    select(columns: string): {
      eq(column: "id", value: string): {
        single(): PromiseLike<{ data: CharacterWithCollectionRow | null; error: QueryError }>;
      };
      not(column: "price_multiplier", operator: "is", value: null): {
        order(column: "price_multiplier", options: { ascending: boolean }): PromiseLike<{
          data: CharacterWithCollectionRow[] | null;
          error: QueryError;
        }>;
      };
    };
  };
}

const characterMultiplierSupabase = supabase as unknown as CharacterMultiplierSupabaseClient;

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Presets comuns de multiplicadores
 */
export const MULTIPLIER_PRESETS: CharacterMultiplierPreset[] = [
  {
    label: "Normal",
    value: 1.0,
    description: "Personagem padrão (sem alteração de preço)",
  },
  {
    label: "Complexo",
    value: 1.2,
    description: "Personagem com detalhes elaborados (+20%)",
  },
  {
    label: "Grande",
    value: 1.3,
    description: "Personagem de tamanho maior (+30%)",
  },
  {
    label: "Premium",
    value: 1.5,
    description: "Personagem especial ou exclusivo (+50%)",
  },
  {
    label: "Raro",
    value: 2.0,
    description: "Personagem raro ou edição limitada (+100%)",
  },
];

// =====================================================
// QUERY KEYS
// =====================================================

export const characterMultiplierKeys = {
  all: ["character-multiplier"] as const,
  lists: () => [...characterMultiplierKeys.all, "list"] as const,
  detail: (characterId: string) => [...characterMultiplierKeys.all, "detail", characterId] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar multiplicador de um personagem
 */
export function useCharacterMultiplier(characterId: string | null | undefined) {
  return useQuery({
    queryKey: characterMultiplierKeys.detail(characterId || ""),
    queryFn: async () => {
      if (!characterId) return null;

      const { data, error } = await characterMultiplierSupabase
        .from("characters")
        .select(`
          id,
          name,
          price_multiplier,
          collection_id,
          collections!inner (
            name
          )
        `)
        .eq("id", characterId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar multiplicador: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      const character = data;

      return {
        character_id: character.id,
        character_name: character.name,
        price_multiplier: character.price_multiplier,
        collection_id: character.collection_id,
        collection_name: character.collections?.name ?? "",
      } as CharacterMultiplierData;
    },
    enabled: !!characterId,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

/**
 * Hook para buscar todos os personagens com multiplicadores customizados
 * 
 * Útil para admin visualizar quais personagens têm multiplicadores ativos
 */
export function useCharactersWithMultipliers() {
  return useQuery({
    queryKey: characterMultiplierKeys.lists(),
    queryFn: async () => {
      const { data, error } = await characterMultiplierSupabase
        .from("characters")
        .select(`
          id,
          name,
          price_multiplier,
          collection_id,
          collections!inner (
            name
          )
        `)
        .not("price_multiplier", "is", null)
        .order("price_multiplier", { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar personagens: ${error.message}`);
      }

      return (data || []).map((item) => ({
        character_id: item.id,
        character_name: item.name,
        price_multiplier: item.price_multiplier,
        collection_id: item.collection_id,
        collection_name: item.collections?.name ?? "",
      })) as CharacterMultiplierData[];
    },
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para atualizar multiplicador de um personagem
 */
export function useUpdateCharacterMultiplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateCharacterMultiplierInput) => {
      // Validar input
      if (input.new_multiplier !== null && !isValidMultiplier(input.new_multiplier)) {
        throw new Error("Multiplicador deve ser maior que 0");
      }

      return updateCharacterPriceMultiplierRpc({
        characterId: input.character_id,
        newMultiplier: input.new_multiplier,
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidar queries relacionadas (RN010 - Cache Strategy)
      queryClient.invalidateQueries({ 
        queryKey: characterMultiplierKeys.detail(variables.character_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: characterMultiplierKeys.lists() 
      });
      
      // Invalidar preço do personagem específico (RN010)
      queryClient.invalidateQueries({ 
        queryKey: characterPriceKeys.detail(variables.character_id) 
      });

      const multiplierText = variables.new_multiplier 
        ? `${variables.new_multiplier}x`
        : "padrão (1.0x)";

      toast({
        title: "Multiplicador atualizado",
        description: `Multiplicador definido como ${multiplierText}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar multiplicador",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar multiplicadores em lote
 * 
 * Útil para aplicar mesmo multiplicador a múltiplos personagens
 */
export function useBatchUpdateCharacterMultipliers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { character_ids: string[]; new_multiplier: number | null }) => {
      // Validar input
      if (input.new_multiplier !== null && !isValidMultiplier(input.new_multiplier)) {
        throw new Error("Multiplicador deve ser maior que 0");
      }

      return bulkUpdateCharacterPriceMultipliersRpc({
        characterIds: input.character_ids,
        newMultiplier: input.new_multiplier,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: characterMultiplierKeys.all });
      
      // Invalidar preços de todos os personagens afetados (RN010)
      variables.character_ids.forEach((characterId) => {
        queryClient.invalidateQueries({ 
          queryKey: characterPriceKeys.detail(characterId) 
        });
      });

      const multiplierText = variables.new_multiplier 
        ? `${variables.new_multiplier}x`
        : "padrão (1.0x)";

      toast({
        title: "Multiplicadores atualizados",
        description: `${data.updated} personagens atualizados para ${multiplierText}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar multiplicadores",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Obtém o preset correspondente a um multiplicador
 */
export function getMultiplierPreset(multiplier: number | null): CharacterMultiplierPreset | null {
  if (multiplier === null) return MULTIPLIER_PRESETS[0]; // Normal (1.0)
  
  return MULTIPLIER_PRESETS.find((preset) => preset.value === multiplier) || null;
}

/**
 * Formata multiplicador para exibição
 */
export function formatMultiplier(multiplier: number | null): string {
  if (multiplier === null || multiplier === 1.0) {
    return "Normal (1.0x)";
  }
  
  const preset = getMultiplierPreset(multiplier);
  if (preset) {
    return `${preset.label} (${multiplier}x)`;
  }
  
  return `${multiplier}x`;
}

/**
 * Calcula o percentual de acréscimo/desconto do multiplicador
 */
export function calculateMultiplierPercentage(multiplier: number | null): number {
  const value = multiplier ?? 1.0;
  return Math.round((value - 1.0) * 100);
}

/**
 * Formata percentual de acréscimo/desconto
 */
export function formatMultiplierPercentage(multiplier: number | null): string {
  const percentage = calculateMultiplierPercentage(multiplier);
  
  if (percentage === 0) return "sem alteração";
  if (percentage > 0) return `+${percentage}%`;
  return `${percentage}%`;
}
