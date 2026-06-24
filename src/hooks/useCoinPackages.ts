import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import {
  getCoinPackage,
  listActiveCoinPackages,
  type CoinPackage,
} from "@/services/coins/coin-packages-service";
import type { PriceInCoins } from "@/types/contextual-pricing";

export type { CoinPackage } from "@/services/coins/coin-packages-service";

export const coinPackagesKeys = {
  all: ["coin-packages"] as const,
  active: () => [...coinPackagesKeys.all, "active"] as const,
};

export function useCoinPackages() {
  return useQuery({
    queryKey: coinPackagesKeys.active(),
    queryFn: listActiveCoinPackages,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCoinPackage(packageId?: string | null) {
  return useQuery({
    queryKey: packageId ? [...coinPackagesKeys.all, packageId] : ["coin-packages", "none"],
    queryFn: async () => {
      if (!packageId) return null;
      return getCoinPackage(packageId);
    },
    enabled: !!packageId,
    staleTime: 5 * 60 * 1000,
  });
}

export function getTotalCoins(pkg: CoinPackage): PriceInCoins {
  return pkg.amount + pkg.bonus;
}

export function getBonusPercentage(pkg: CoinPackage): number {
  if (pkg.bonus === 0 || pkg.amount === 0) return 0;
  return Math.round((pkg.bonus / pkg.amount) * 100);
}

export function formatPriceBRL(price: number): string {
  return formatCurrency(price);
}
