// @ts-nocheck
/**
 * Hook para usar configurações de conteúdo (SSOT)
 * Atualiza automaticamente quando as configurações mudam
 */

import { useQuery } from "@tanstack/react-query";
import { fetchContentSettings, type ContentSettings } from "@/lib/services/contentService";

export function useContentSettings() {
  return useQuery<ContentSettings>({
    queryKey: ["content-settings"],
    queryFn: fetchContentSettings,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (garbage collection time)
    refetchOnWindowFocus: false,
  });
}
