import { supabase } from "@/integrations/supabase/client";

type RpcError = {
  message: string;
};

type RpcResult<T> = Promise<{
  data: T | null;
  error: RpcError | null;
}>;

type ProductionStageKey =
  | "queued"
  | "printing"
  | "finishing"
  | "painting"
  | "inspection"
  | "shipped";

type ProductionRowRpc = {
  id: string;
  quote_id: string;
  current_stage: ProductionStageKey;
  started_at: string;
  updated_at: string;
};

type ProductionUpdateRpc = {
  id: string;
};

type ProductionPhotoRpc = {
  id: string;
  quote_id: string;
  update_id: string;
  url: string;
  caption: string | null;
  created_at: string;
  created_by: string | null;
};

interface ProductionMutationRpcClient {
  rpc(fn: "ensure_quote_production", args: { p_quote_id: string }): RpcResult<ProductionRowRpc>;
  rpc(
    fn: "set_quote_production_stage",
    args: { p_quote_id: string; p_stage: ProductionStageKey; p_note: string | null }
  ): RpcResult<ProductionUpdateRpc>;
  rpc(
    fn: "add_quote_production_photo",
    args: { p_quote_id: string; p_update_id: string; p_url: string; p_caption: string | null }
  ): RpcResult<ProductionPhotoRpc>;
}

const productionMutationRpc = supabase as unknown as ProductionMutationRpcClient;

function unwrapRpcData<T>(data: T | null, error: RpcError | null, fallback: string): T {
  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(fallback);
  }

  return data;
}

export async function ensureQuoteProductionRpc(quoteId: string): Promise<ProductionRowRpc> {
  const { data, error } = await productionMutationRpc.rpc("ensure_quote_production", {
    p_quote_id: quoteId,
  });

  return unwrapRpcData(data, error, "Quote production ensure did not return data");
}

export async function setQuoteProductionStageRpc(input: {
  quoteId: string;
  stage: ProductionStageKey;
  note?: string;
}): Promise<ProductionUpdateRpc> {
  const { data, error } = await productionMutationRpc.rpc("set_quote_production_stage", {
    p_quote_id: input.quoteId,
    p_stage: input.stage,
    p_note: input.note ?? null,
  });

  return unwrapRpcData(data, error, "Quote production stage update did not return data");
}

export async function addQuoteProductionPhotoRpc(input: {
  quoteId: string;
  updateId: string;
  url: string;
  caption?: string;
}): Promise<ProductionPhotoRpc> {
  const { data, error } = await productionMutationRpc.rpc("add_quote_production_photo", {
    p_quote_id: input.quoteId,
    p_update_id: input.updateId,
    p_url: input.url,
    p_caption: input.caption ?? null,
  });

  return unwrapRpcData(data, error, "Quote production photo creation did not return data");
}
