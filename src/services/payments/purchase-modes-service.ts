import { supabase } from "@/integrations/supabase/client";
import type { PurchaseMode } from "@/types/pricing-restructure";

type QueryError = { message: string } | null;

interface PurchaseModesSupabaseClient {
  from(table: "purchase_modes"): {
    select(columns: string): {
      order(column: "display_order", options: { ascending: boolean }): PromiseLike<{
        data: PurchaseMode[] | null;
        error: QueryError;
      }>;
      eq(column: "is_active", value: boolean): {
        order(column: "display_order", options: { ascending: boolean }): PromiseLike<{
          data: PurchaseMode[] | null;
          error: QueryError;
        }>;
      };
    };
  };
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
