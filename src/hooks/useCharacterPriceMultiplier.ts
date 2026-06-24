import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  bulkUpdateCharacterPriceMultipliersRpc,
  updateCharacterPriceMultiplierRpc,
} from "@/services/admin/config/admin-config-mutations-service";
import {
  getCharacterMultiplier,
  listCharactersWithMultipliers,
  type CharacterMultiplierData,
} from "@/services/pricing/character-multiplier-service";
import { CACHE_CONFIG, isValidMultiplier } from "@/types/contextual-pricing";
import { characterPriceKeys } from "./useCharacterPrice";

export type { CharacterMultiplierData } from "@/services/pricing/character-multiplier-service";

export interface UpdateCharacterMultiplierInput {
  character_id: string;
  new_multiplier: number | null;
}

export interface CharacterMultiplierPreset {
  label: string;
  value: number;
  description: string;
}

export const MULTIPLIER_PRESETS: CharacterMultiplierPreset[] = [
  {
    label: "Normal",
    value: 1.0,
    description: "Personagem padrao (sem alteracao de preco)",
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
    description: "Personagem raro ou edicao limitada (+100%)",
  },
];

export const characterMultiplierKeys = {
  all: ["character-multiplier"] as const,
  lists: () => [...characterMultiplierKeys.all, "list"] as const,
  detail: (characterId: string) => [...characterMultiplierKeys.all, "detail", characterId] as const,
};

export function useCharacterMultiplier(characterId: string | null | undefined) {
  return useQuery({
    queryKey: characterMultiplierKeys.detail(characterId || ""),
    queryFn: (): Promise<CharacterMultiplierData | null> => getCharacterMultiplier(characterId),
    enabled: !!characterId,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useCharactersWithMultipliers() {
  return useQuery({
    queryKey: characterMultiplierKeys.lists(),
    queryFn: listCharactersWithMultipliers,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useUpdateCharacterMultiplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateCharacterMultiplierInput) => {
      if (input.new_multiplier !== null && !isValidMultiplier(input.new_multiplier)) {
        throw new Error("Multiplicador deve ser maior que 0");
      }

      return updateCharacterPriceMultiplierRpc({
        characterId: input.character_id,
        newMultiplier: input.new_multiplier,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterMultiplierKeys.detail(variables.character_id),
      });
      queryClient.invalidateQueries({
        queryKey: characterMultiplierKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: characterPriceKeys.detail(variables.character_id),
      });

      const multiplierText = variables.new_multiplier
        ? `${variables.new_multiplier}x`
        : "padrao (1.0x)";

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

export function useBatchUpdateCharacterMultipliers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { character_ids: string[]; new_multiplier: number | null }) => {
      if (input.new_multiplier !== null && !isValidMultiplier(input.new_multiplier)) {
        throw new Error("Multiplicador deve ser maior que 0");
      }

      return bulkUpdateCharacterPriceMultipliersRpc({
        characterIds: input.character_ids,
        newMultiplier: input.new_multiplier,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: characterMultiplierKeys.all });

      variables.character_ids.forEach((characterId) => {
        queryClient.invalidateQueries({
          queryKey: characterPriceKeys.detail(characterId),
        });
      });

      const multiplierText = variables.new_multiplier
        ? `${variables.new_multiplier}x`
        : "padrao (1.0x)";

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

export function getMultiplierPreset(multiplier: number | null): CharacterMultiplierPreset | null {
  if (multiplier === null) return MULTIPLIER_PRESETS[0];

  return MULTIPLIER_PRESETS.find((preset) => preset.value === multiplier) || null;
}

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

export function calculateMultiplierPercentage(multiplier: number | null): number {
  const value = multiplier ?? 1.0;
  return Math.round((value - 1.0) * 100);
}

export function formatMultiplierPercentage(multiplier: number | null): string {
  const percentage = calculateMultiplierPercentage(multiplier);

  if (percentage === 0) return "sem alteracao";
  if (percentage > 0) return `+${percentage}%`;
  return `${percentage}%`;
}
