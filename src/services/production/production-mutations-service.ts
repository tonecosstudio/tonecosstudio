import { z } from "zod";
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

const productionStageSchema = z.enum([
  "queued",
  "printing",
  "finishing",
  "painting",
  "inspection",
  "shipped",
]);

const productionRowSchema = z.object({
  id: z.string().uuid(),
  quote_id: z.string().uuid(),
  current_stage: productionStageSchema,
  started_at: z.string().min(1),
  updated_at: z.string().min(1),
});

const productionUpdateSchema = z.object({
  id: z.string().uuid(),
});

const productionPhotoSchema = z.object({
  id: z.string().uuid(),
  quote_id: z.string().uuid(),
  update_id: z.string().uuid(),
  url: z.string().url().refine((value) => value.startsWith("http://") || value.startsWith("https://")),
  caption: z.string().nullable(),
  created_at: z.string().min(1),
  created_by: z.string().uuid().nullable(),
});

export async function ensureQuoteProductionRpc(quoteId: string): Promise<ProductionRowRpc> {
  const value = await callAdminRpc<unknown>("ensure_quote_production", {
    p_quote_id: quoteId,
  });

  const parsed = productionRowSchema.safeParse(value);
  if (!parsed.success || parsed.data.quote_id !== quoteId) {
    throw new Error("Quote production did not return matching data");
  }

  return parsed.data;
}

export async function setQuoteProductionStageRpc(input: {
  quoteId: string;
  stage: ProductionStageKey;
  note?: string;
}): Promise<ProductionUpdateRpc> {
  const value = await callAdminRpc<unknown>("set_quote_production_stage", {
    p_quote_id: input.quoteId,
    p_stage: input.stage,
    p_note: input.note ?? null,
  });

  const parsed = productionUpdateSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Production stage update did not return valid data");
  }

  return parsed.data;
}

export async function addQuoteProductionPhotoRpc(input: {
  quoteId: string;
  updateId: string;
  url: string;
  caption?: string;
}): Promise<ProductionPhotoRpc> {
  const value = await callAdminRpc<unknown>("add_quote_production_photo", {
    p_quote_id: input.quoteId,
    p_update_id: input.updateId,
    p_url: input.url,
    p_caption: input.caption ?? null,
  });

  const parsed = productionPhotoSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.quote_id !== input.quoteId ||
    parsed.data.update_id !== input.updateId ||
    parsed.data.url !== input.url
  ) {
    throw new Error("Production photo did not return matching data");
  }

  return parsed.data;
}
