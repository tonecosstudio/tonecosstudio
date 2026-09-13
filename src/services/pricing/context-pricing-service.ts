import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import {
  isValidDiscountPercentage,
  isValidMultiplier,
  PricingContextMultiplier,
} from "@/types/contextual-pricing";

export interface UpdateMultiplierInput {
  user_context: string;
  new_multiplier: number;
  reason?: string;
}

export interface UpdateDiscountInput {
  new_discount_percentage: number;
  reason?: string;
}

export interface UpdateMultiplierResponse {
  success: boolean;
  old_multiplier: number;
  new_multiplier: number;
  message: string;
}

export interface UpdateDiscountResponse {
  success: boolean;
  old_discount: number;
  new_discount: number;
  message: string;
}

interface ContextPricingRpcClient {
  rpc(
    fn: "update_multiplier_with_history",
    args: {
      p_user_context: string;
      p_new_multiplier: number;
      p_changed_by: string;
      p_reason?: string;
    },
  ): Promise<{ data: unknown; error: { message: string } | null }>;
  rpc(
    fn: "update_chosen_discount_with_history",
    args: {
      p_new_discount_percentage: number;
      p_changed_by: string;
      p_reason?: string;
    },
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

const contextPricingRpc = supabase as unknown as ContextPricingRpcClient;

const updateMultiplierResponseSchema = z.object({
  success: z.boolean(),
  old_multiplier: z.number().finite().positive(),
  new_multiplier: z.number().finite().positive(),
  message: z.string(),
});

const updateDiscountResponseSchema = z.object({
  success: z.boolean(),
  old_discount: z.number().int().min(0).max(100),
  new_discount: z.number().int().min(0).max(100),
  message: z.string(),
});

function parseSingleRpcRow<T>(
  value: unknown,
  schema: z.ZodType<T>,
  invalidResponseMessage: string,
): T {
  const parsed = z.array(schema).length(1).safeParse(value);
  if (!parsed.success) {
    throw new Error(invalidResponseMessage);
  }

  return parsed.data[0];
}

export async function listActiveContextPricing(): Promise<PricingContextMultiplier[]> {
  const { data, error } = await supabase
    .from("pricing_context_multipliers")
    .select("*")
    .eq("is_active", true)
    .order("user_context", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar multiplicadores: ${error.message}`);
  }

  return data as PricingContextMultiplier[];
}

export async function getActiveContextMultiplier(
  userContext: string,
): Promise<PricingContextMultiplier> {
  const { data, error } = await supabase
    .from("pricing_context_multipliers")
    .select("*")
    .eq("user_context", userContext)
    .eq("is_active", true)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar multiplicador: ${error.message}`);
  }

  return data as PricingContextMultiplier;
}

export async function getChosenCollectionDiscount(): Promise<number> {
  const { data, error } = await supabase
    .from("pricing_context_multipliers")
    .select("chosen_collection_discount_percentage")
    .eq("user_context", "subscribed_chosen")
    .eq("is_active", true)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar desconto: ${error.message}`);
  }

  return data.chosen_collection_discount_percentage as number;
}

export async function updateMultiplierWithHistory(
  input: UpdateMultiplierInput,
): Promise<UpdateMultiplierResponse> {
  if (!isValidMultiplier(input.new_multiplier)) {
    throw new Error("Multiplicador deve ser maior que 0");
  }

  const userId = await requireAuthenticatedUserId();

  const { data, error } = await contextPricingRpc.rpc("update_multiplier_with_history", {
    p_user_context: input.user_context,
    p_new_multiplier: input.new_multiplier,
    p_changed_by: userId,
    p_reason: input.reason || undefined,
  });

  if (error) {
    throw new Error(`Erro ao atualizar multiplicador: ${error.message}`);
  }

  const result = parseSingleRpcRow(
    data,
    updateMultiplierResponseSchema,
    "Resposta invalida ao atualizar multiplicador contextual",
  );

  if (!result.success) {
    throw new Error(result.message);
  }

  return result;
}

export async function updateChosenDiscountWithHistory(
  input: UpdateDiscountInput,
): Promise<UpdateDiscountResponse> {
  if (!isValidDiscountPercentage(input.new_discount_percentage)) {
    throw new Error("Desconto deve ser um numero inteiro entre 0 e 100%");
  }

  const userId = await requireAuthenticatedUserId();

  const { data, error } = await contextPricingRpc.rpc("update_chosen_discount_with_history", {
    p_new_discount_percentage: input.new_discount_percentage,
    p_changed_by: userId,
    p_reason: input.reason || undefined,
  });

  if (error) {
    throw new Error(`Erro ao atualizar desconto: ${error.message}`);
  }

  const result = parseSingleRpcRow(
    data,
    updateDiscountResponseSchema,
    "Resposta invalida ao atualizar desconto contextual",
  );

  if (!result.success) {
    throw new Error(result.message);
  }

  return result;
}
