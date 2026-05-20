import { supabase } from "@/integrations/supabase/client";

export interface StandalonePurchaseCharacter {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  release_order: number;
  release_month: number | null;
  status: "upcoming" | "revealed" | "released";
}

export interface StandalonePurchaseCollection {
  id: string;
  name: string;
  slug: string;
  collection_characters?: StandalonePurchaseCharacter[] | null;
}

interface OpenCycleRow {
  id: string;
}

interface CreateStandalonePurchaseResponse {
  success?: boolean;
  error?: string;
}

export async function getStandalonePurchaseCollectionBySlug(
  slug?: string
): Promise<StandalonePurchaseCollection | null> {
  if (!slug) return null;

  const { data, error } = await supabase
    .from("collections")
    .select(
      `
      id,
      name,
      slug,
      collection_characters (
        id,
        name,
        description,
        image_url,
        release_order,
        release_month,
        status
      )
    `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;

  return data as StandalonePurchaseCollection | null;
}

export async function createStandalonePurchaseReservation(input: {
  collectionId: string;
  characterId: string;
}): Promise<void> {
  const { data: currentCycle, error: cycleError } = await supabase
    .from("cycles")
    .select("id")
    .eq("status", "open")
    .single<OpenCycleRow>();

  if (cycleError || !currentCycle) {
    throw new Error("CYCLE_NOT_OPEN");
  }

  const { data, error } = await supabase.functions.invoke<CreateStandalonePurchaseResponse>(
    "create-standalone-purchase",
    {
      body: {
        collectionId: input.collectionId,
        cycleId: currentCycle.id,
        characterId: input.characterId,
        depositVoucherUrl: null,
      },
    }
  );

  if (error) throw error;

  if (!data?.success) {
    throw new Error(data?.error || "Erro ao criar compra");
  }
}
