import { supabase } from "@/integrations/supabase/client";

export type ProductionStageKey =
  | "queued"
  | "printing"
  | "finishing"
  | "painting"
  | "inspection"
  | "shipped";

export const PRODUCTION_STAGES: Array<{ key: ProductionStageKey; label: string }> = [
  { key: "queued", label: "Em fila" },
  { key: "printing", label: "Imprimindo" },
  { key: "finishing", label: "Acabamento" },
  { key: "painting", label: "Pintura" },
  { key: "inspection", label: "Inspeção" },
  { key: "shipped", label: "Enviado" },
];

export type ProductionRow = {
  id: string;
  quote_id: string;
  current_stage: ProductionStageKey;
  started_at: string;
  updated_at: string;
};

export type ProductionUpdateRow = {
  id: string;
  quote_id: string;
  stage: ProductionStageKey;
  note: string | null;
  created_at: string;
  created_by: string | null;
};

export type ProductionPhotoRow = {
  id: string;
  quote_id: string;
  update_id: string;
  url: string;
  caption: string | null;
  created_at: string;
  created_by: string | null;
};

export async function ensureProductionForQuote(quoteId: string) {
  // Client typing may not include these tables yet.
  const sb = supabase as any;
  const { data, error } = await sb
    .from("quote_production")
    .upsert({ quote_id: quoteId, current_stage: "queued" }, { onConflict: "quote_id" })
    .select("id,quote_id,current_stage,started_at,updated_at")
    .single();
  if (error) throw error;
  return data as ProductionRow;
}

export async function setProductionStage(
  quoteId: string,
  stage: ProductionStageKey,
  note?: string
) {
  const sb = supabase as any;

  const { error: prodErr } = await sb
    .from("quote_production")
    .upsert({ quote_id: quoteId, current_stage: stage }, { onConflict: "quote_id" });
  if (prodErr) throw prodErr;

  const { data: upd, error: updErr } = await sb
    .from("quote_production_updates")
    .insert({ quote_id: quoteId, stage, note: (note ?? "").trim() || null })
    .select("id")
    .single();
  if (updErr) throw updErr;

  return upd as { id: string };
}

export async function uploadProductionPhoto(params: {
  quoteId: string;
  updateId: string;
  file: File;
  caption?: string;
}) {
  const { quoteId, updateId, file, caption } = params;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `${quoteId}/${updateId}/${crypto.randomUUID()}.${safeExt}`;

  // Bucket is expected to exist as public bucket named "production".
  const { error: upErr } = await supabase.storage.from("production").upload(key, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  const url = supabase.storage.from("production").getPublicUrl(key).data.publicUrl;

  const sb = supabase as any;
  const { data, error } = await sb
    .from("quote_production_photos")
    .insert({
      quote_id: quoteId,
      update_id: updateId,
      url,
      caption: (caption ?? "").trim() || null,
    })
    .select("id,quote_id,update_id,url,caption,created_at,created_by")
    .single();
  if (error) throw error;

  return data as ProductionPhotoRow;
}
