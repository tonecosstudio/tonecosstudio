import { supabase } from "@/integrations/supabase/client";

type QueryError = { message?: string } | null;
type QueryResult<T> = PromiseLike<{ data: T | null; error: QueryError }>;
type QueryListResult<T> = PromiseLike<{ data: T[] | null; error: QueryError }>;

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

type QuoteProductionUpsert = {
  quote_id: string;
  current_stage: ProductionStageKey;
};

type QuoteProductionUpdateInsert = {
  quote_id: string;
  stage: ProductionStageKey;
  note: string | null;
};

type QuoteProductionPhotoInsert = {
  quote_id: string;
  update_id: string;
  url: string;
  caption: string | null;
};

type UpsertOptions = { onConflict: string };

type QuoteProductionTable = {
  upsert(
    value: QuoteProductionUpsert,
    options: UpsertOptions
  ): {
    select(columns: string): {
      single(): QueryResult<ProductionRow>;
    };
  } & QueryResult<null>;
};

type QuoteProductionUpdatesTable = {
  insert(value: QuoteProductionUpdateInsert): {
    select(columns: string): {
      single(): QueryResult<{ id: string }>;
    };
  };
};

type QuoteProductionPhotosTable = {
  insert(value: QuoteProductionPhotoInsert): {
    select(columns: string): {
      single(): QueryResult<ProductionPhotoRow>;
    };
  };
};

type ProductionTablesClient = {
  from(table: "quote_production"): QuoteProductionTable;
  from(table: "quote_production_updates"): QuoteProductionUpdatesTable;
  from(table: "quote_production_photos"): QuoteProductionPhotosTable;
};

const productionTables = supabase as unknown as ProductionTablesClient;

type QuoteProductionReadTable = {
  select(columns: string): {
    eq(column: "quote_id", value: string): {
      maybeSingle(): QueryResult<ProductionRow>;
    };
  };
};

type QuoteProductionUpdatesReadTable = {
  select(columns: string): {
    eq(column: "quote_id", value: string): {
      order(
        column: "created_at",
        options: { ascending: boolean }
      ): QueryListResult<ProductionUpdateRow>;
    };
  };
};

type QuoteProductionPhotosReadTable = {
  select(columns: string): {
    eq(column: "quote_id", value: string): {
      in(column: "update_id", values: string[]): {
        order(
          column: "created_at",
          options: { ascending: boolean }
        ): QueryListResult<ProductionPhotoRow>;
      };
    };
  };
};

type ProductionReadClient = {
  from(table: "quote_production"): QuoteProductionReadTable;
  from(table: "quote_production_updates"): QuoteProductionUpdatesReadTable;
  from(table: "quote_production_photos"): QuoteProductionPhotosReadTable;
};

const productionReadTables = supabase as unknown as ProductionReadClient;

export interface ProductionTimelineData {
  production: ProductionRow | null;
  updates: ProductionUpdateRow[];
  photos: ProductionPhotoRow[];
}

export async function fetchProductionTimeline(quoteId: string): Promise<ProductionTimelineData> {
  const { data: production, error: productionError } = await productionReadTables
    .from("quote_production")
    .select("id,quote_id,current_stage,started_at,updated_at")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (productionError) {
    throw productionError;
  }

  const { data: updates, error: updatesError } = await productionReadTables
    .from("quote_production_updates")
    .select("id,quote_id,stage,note,created_at,created_by")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });

  if (updatesError) {
    throw updatesError;
  }

  const updateIds = (updates ?? []).map((update) => update.id);
  const { data: photos, error: photosError } = updateIds.length
    ? await productionReadTables
        .from("quote_production_photos")
        .select("id,quote_id,update_id,url,caption,created_at,created_by")
        .eq("quote_id", quoteId)
        .in("update_id", updateIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (photosError) {
    throw photosError;
  }

  return {
    production: production ?? null,
    updates: updates ?? [],
    photos: photos ?? [],
  };
}

export async function ensureProductionForQuote(quoteId: string) {
  const { data, error } = await productionTables
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
  const { error: prodErr } = await productionTables
    .from("quote_production")
    .upsert({ quote_id: quoteId, current_stage: stage }, { onConflict: "quote_id" });
  if (prodErr) throw prodErr;

  const { data: upd, error: updErr } = await productionTables
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

  // Validate file before upload
  const { validateFileUpload, sanitizeFilename, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } = await import(
    "./security/input-sanitizer"
  );
  const validation = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
  if (!validation.valid) {
    throw new Error(validation.error || 'Arquivo inválido');
  }

  const sanitizedName = sanitizeFilename(file.name);
  const safeExt =
    (sanitizedName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `${quoteId}/${updateId}/${crypto.randomUUID()}.${safeExt}`;

  // Bucket is expected to exist as public bucket named "production".
  const { error: upErr } = await supabase.storage.from("production").upload(key, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  const url = supabase.storage.from("production").getPublicUrl(key).data.publicUrl;

  const { data, error } = await productionTables
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
