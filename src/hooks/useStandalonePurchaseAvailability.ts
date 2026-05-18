import { useEffect, useState } from "react";
import { canCreateStandalonePurchase } from "@/services/standalone-purchase-service";

export function useStandalonePurchaseAvailability(cycleId: string) {
  const [canPurchase, setCanPurchase] = useState(true);
  const [reason, setReason] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPurchaseAvailability = async () => {
      setIsLoading(true);
      try {
        const result = await canCreateStandalonePurchase(cycleId);
        setCanPurchase(result.canCreate);
        setReason(result.reason);
      } catch {
        setCanPurchase(false);
        setReason("Failed to check availability");
      } finally {
        setIsLoading(false);
      }
    };

    checkPurchaseAvailability();
  }, [cycleId]);

  return {
    canPurchase,
    reason,
    isLoading,
  };
}
