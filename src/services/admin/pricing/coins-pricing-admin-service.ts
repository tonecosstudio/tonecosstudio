import {
  updateCollectionBasePricesRpc,
  updatePricingContextMultipliersRpc,
} from "@/services/admin/config/admin-config-mutations-service";

export async function updateBasePrices(params: {
  subscriptionPrice: number;
  standardPrice: number;
  premiumPrice: number;
}) {
  await updateCollectionBasePricesRpc(params);
}

export async function updateContextMultipliers(params: {
  chosenMultiplier: number;
  notChosenMultiplier: number;
  noSubscriptionMultiplier: number;
}) {
  await updatePricingContextMultipliersRpc(params);
}
