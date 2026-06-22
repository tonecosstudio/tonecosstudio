import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";

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

export async function ensureQuoteProductionRpc(quoteId: string): Promise<ProductionRowRpc> {
  return callAdminRpc<ProductionRowRpc>("ensure_quote_production", {
    p_quote_id: quoteId,
  });
}

export async function setQuoteProductionStageRpc(input: {
  quoteId: string;
  stage: ProductionStageKey;
  note?: string;
}): Promise<ProductionUpdateRpc> {
  return callAdminRpc<ProductionUpdateRpc>("set_quote_production_stage", {
    p_quote_id: input.quoteId,
    p_stage: input.stage,
    p_note: input.note ?? null,
  });
}

export async function addQuoteProductionPhotoRpc(input: {
  quoteId: string;
  updateId: string;
  url: string;
  caption?: string;
}): Promise<ProductionPhotoRpc> {
  return callAdminRpc<ProductionPhotoRpc>("add_quote_production_photo", {
    p_quote_id: input.quoteId,
    p_update_id: input.updateId,
    p_url: input.url,
    p_caption: input.caption ?? null,
  });
}
