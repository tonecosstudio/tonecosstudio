// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin(userId?: string) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId, // Só executa se houver userId
    staleTime: 5 * 60 * 1000, // 5 minutos - evita refetches desnecessários
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnMount: false, // Não refetch ao montar se já tem dados em cache
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
    refetchOnReconnect: false, // Não refetch ao reconectar
    retry: 1, // Apenas 1 tentativa em caso de erro
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (error) throw error;
      return Boolean(data);
    },
  });
}
