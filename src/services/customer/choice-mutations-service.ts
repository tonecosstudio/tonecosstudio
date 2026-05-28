import { supabase } from "@/integrations/supabase/client";

interface ChoiceRpcError {
  message: string;
}

interface CustomerChoiceRpcClient {
  rpc(
    name: "customer_submit_character_choice",
    args: { p_order_id: string; p_character_id: string }
  ): Promise<{ data: unknown; error: ChoiceRpcError | null }>;
  rpc(
    name: "customer_change_character_choice",
    args: { p_choice_id: string; p_character_id: string; p_reason: string }
  ): Promise<{ data: unknown; error: ChoiceRpcError | null }>;
}

const customerChoiceRpc = supabase as unknown as CustomerChoiceRpcClient;

function unwrapChoiceRpc<T>(prefix: string, data: unknown, error: ChoiceRpcError | null): T {
  if (error) {
    throw new Error(`${prefix}: ${error.message}`);
  }

  return data as T;
}

export async function submitCharacterChoiceRpc<TChoice>(
  orderId: string,
  characterId: string
): Promise<TChoice> {
  const { data, error } = await customerChoiceRpc.rpc("customer_submit_character_choice", {
    p_order_id: orderId,
    p_character_id: characterId,
  });

  return unwrapChoiceRpc<TChoice>("Erro ao submeter escolha", data, error);
}

export async function changeCharacterChoiceRpc<TChoice>(
  choiceId: string,
  characterId: string,
  reason: string
): Promise<TChoice> {
  const { data, error } = await customerChoiceRpc.rpc("customer_change_character_choice", {
    p_choice_id: choiceId,
    p_character_id: characterId,
    p_reason: reason,
  });

  return unwrapChoiceRpc<TChoice>("Erro ao alterar escolha", data, error);
}
