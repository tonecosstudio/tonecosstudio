/**
 * Hook para usar configurações de conteúdo (SSOT)
 * Atualiza automaticamente quando as configurações mudam
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchContentSettings,
  processContentVariables,
  type ContentSettings,
} from "@/services/content/content-settings-service";

export function useContentSettings() {
  return useQuery<ContentSettings>({
    queryKey: ["content-settings"],
    queryFn: fetchContentSettings,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (garbage collection time)
    refetchOnWindowFocus: false,
  });
}

export function useContentVariable(field: keyof ContentSettings, fallback = "") {
  const query = useContentSettings();
  const value = query.data?.[field];

  if (!query.data || typeof value !== "string") {
    return fallback;
  }

  return processContentVariables(value, query.data);
}
