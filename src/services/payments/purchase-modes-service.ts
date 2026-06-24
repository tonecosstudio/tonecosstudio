import { supabase } from "@/integrations/supabase/client";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import type {
  PurchaseMode,
  UpdatePurchaseModeMultiplierResult,
} from "@/types/pricing-restructure";

type RpcError = { message: string } | null;

interface PurchaseModesSupabaseClient {
  from(table: "purchase_modes"): {
    select(columns: string): {
      order(column: "display_order", options: { ascending: boolean }): PromiseLike<{
        data: PurchaseMode[] | null;
        error: RpcError;
      }>;
      eq(column: "is_active", value: boolean): {
        order(column: "display_order", options: { ascending: boolean }): PromiseLike<{
          data: PurchaseMode[] | null;
          error: RpcError;
        }>;
      };
    };
  };
  rpc(functionName: "update_purchase_mode_multiplier", args: {
    p_mode_key: string;
    p_new_multiplier: number;
    p_changed_by: string;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
}

const purchaseModesSupabase = supabase as unknown as PurchaseModesSupabaseClient;

export async function listPurchaseModes(): Promise<PurchaseMode[]> {
  const { data, error } = await purchaseModesSupabase
    .from("purchase_modes")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar modalidades: ${error.message}`);
  }

  return data ?? [];
}

export async function listActivePurchaseModes(): Promise<PurchaseMode[]> {
  const { data, error } = await purchaseModesSupabase
    .from("purchase_modes")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar modalidades ativas: ${error.message}`);
  }

  return data ?? [];
}

export async function updatePurchaseModeMultiplier(params: {
  modeKey: string;
  newMultiplier: number;
}): Promise<UpdatePurchaseModeMultiplierResult> {
  const userId = await requireAuthenticatedUserId();

  const { data, error } = await purchaseModesSupabase.rpc("update_purchase_mode_multiplier", {
    p_mode_key: params.modeKey,
    p_new_multiplier: params.newMultiplier,
    p_changed_by: userId,
  });

  if (error) {
    throw new Error(`Erro ao atualizar multiplicador: ${error.message}`);
  }

  return data as UpdatePurchaseModeMultiplierResult;
}
