import {
  LOCAL_SUPABASE_FALLBACK,
  PREVIEW_READ_ONLY,
} from "@/config/supabase-environment";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";
import { callAuthenticatedEdgeFunctionData } from "@/services/supabase/edge-function-client";
import {
  decodeTonartCommercialOffer,
  validateTonartCommercialOfferSlug,
  type TonartCommercialOffer,
} from "@/services/commercial/tonart-commercial-offer";

const OFFER_READ_ERROR = "commercial_offers_unavailable";

export async function listTonartCommercialOffersForModel(
  modelSlug: string,
): Promise<TonartCommercialOffer[]> {
  if (LOCAL_SUPABASE_FALLBACK || PREVIEW_READ_ONLY) {
    throw new Error("commercial_offers_preview_read_only");
  }
  assertTonecosCommercialEnabled();

  const safeSlug = validateTonartCommercialOfferSlug(modelSlug);
  const rows = await callAuthenticatedEdgeFunctionData<
    unknown,
    { modelSlug: string }
  >("tonart-commercial-offers", { modelSlug: safeSlug }, OFFER_READ_ERROR);

  if (!Array.isArray(rows) || rows.length > 4) {
    throw new Error(OFFER_READ_ERROR);
  }

  const offers = rows.map(decodeTonartCommercialOffer);
  if (
    offers.some(
      (offer) => !offer.isActive || offer.catalogModelSlug !== safeSlug,
    )
  ) {
    throw new Error(OFFER_READ_ERROR);
  }
  return offers;
}
