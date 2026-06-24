import { supabase } from "@/integrations/supabase/client";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";

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
    .in("status", ["open", "active", "sales"])
    .single<OpenCycleRow>();

  if (cycleError || !currentCycle) {
    throw new Error("CYCLE_NOT_OPEN");
  }

  const data = await callAuthenticatedEdgeFunction<CreateStandalonePurchaseResponse>(
    "create-standalone-purchase",
    {
      collectionId: input.collectionId,
      cycleId: currentCycle.id,
      characterId: input.characterId,
      depositVoucherUrl: null,
    },
    "Erro ao criar compra",
  );

  if (!data?.success) {
    throw new Error(data?.error || "Erro ao criar compra");
  }
}
