import { supabase } from "@/integrations/supabase/client";

type CollectionTypeRow = { id: string; name: string };

export async function updateBasePrices(params: {
  subscriptionPrice: number;
  standardPrice: number;
  premiumPrice: number;
}) {
  const { data: collectionTypes } = await supabase.from("collection_types").select("id, name");
  if (!collectionTypes) throw new Error("Tipos de colecao nao encontrados");

  const typed = collectionTypes as CollectionTypeRow[];
  const subscriptionId = typed.find((t) => t.name === "subscription")?.id;
  const standardId = typed.find((t) => t.name === "standard_catalog")?.id;
  const premiumId = typed.find((t) => t.name === "premium_catalog")?.id;

  if (subscriptionId) {
    const { error } = await supabase
      .from("collection_base_pricing")
      .update({ base_price_coins: params.subscriptionPrice, updated_at: new Date().toISOString() })
      .eq("collection_type_id", subscriptionId);
    if (error) throw error;
  }

  if (standardId) {
    const { error } = await supabase
      .from("collection_base_pricing")
      .update({ base_price_coins: params.standardPrice, updated_at: new Date().toISOString() })
      .eq("collection_type_id", standardId);
    if (error) throw error;
  }

  if (premiumId) {
    const { error } = await supabase
      .from("collection_base_pricing")
      .update({ base_price_coins: params.premiumPrice, updated_at: new Date().toISOString() })
      .eq("collection_type_id", premiumId);
    if (error) throw error;
  }
}

export async function updateContextMultipliers(params: {
  chosenMultiplier: number;
  notChosenMultiplier: number;
  noSubscriptionMultiplier: number;
}) {
  const { error: chosenError } = await supabase
    .from("pricing_context_multipliers")
    .update({ multiplier: params.chosenMultiplier, updated_at: new Date().toISOString() })
    .eq("user_context", "subscribed_chosen");
  if (chosenError) throw chosenError;

  const { error: notChosenError } = await supabase
    .from("pricing_context_multipliers")
    .update({ multiplier: params.notChosenMultiplier, updated_at: new Date().toISOString() })
    .eq("user_context", "subscribed_not_chosen");
  if (notChosenError) throw notChosenError;

  const { error: noSubError } = await supabase
    .from("pricing_context_multipliers")
    .update({ multiplier: params.noSubscriptionMultiplier, updated_at: new Date().toISOString() })
    .eq("user_context", "no_subscription");
  if (noSubError) throw noSubError;
}
