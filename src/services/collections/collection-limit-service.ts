import { supabase } from "@/integrations/supabase/client";

export interface CollectionLimitRPCResponse {
  can_add: boolean;
  current_count: number;
  max_count: number;
  message: string;
  is_unlimited: boolean;
}

export function unauthenticatedCollectionLimit(): CollectionLimitRPCResponse {
  return {
    can_add: false,
    current_count: 0,
    max_count: 0,
    message: "Usuario nao autenticado",
    is_unlimited: false,
  };
}

export function invalidCollectionLimitParameters(): CollectionLimitRPCResponse {
  return {
    can_add: false,
    current_count: 0,
    max_count: 0,
    message: "Parametros invalidos",
    is_unlimited: false,
  };
}

export async function validateCollectionLimit(params: {
  userId: string;
  collectionId?: string | null;
}): Promise<CollectionLimitRPCResponse> {
  const { data, error } = await supabase.rpc("validate_collection_limit", {
    p_user_id: params.userId,
    p_new_collection_id: params.collectionId ?? undefined,
  });

  if (error) {
    throw new Error(`Erro ao validar limite: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Nenhum resultado retornado");
  }

  return data[0] as CollectionLimitRPCResponse;
}
