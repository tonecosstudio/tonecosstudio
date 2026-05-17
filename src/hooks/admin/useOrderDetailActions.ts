import { useCallback } from "react";
import { validateStatusTransition } from "@/services/admin/orders-validator";
import {
  canGenerateLabel,
  generateLabelForOrder,
  getLabelErrorMessage,
  isAddressError,
  isRetryableError,
} from "@/services/admin/label-service";
import type { OrderStatus, UnifiedOrder } from "@/types/admin/orders";

export function useOrderDetailActions() {
  const validateTransition = useCallback(
    (currentStatus: OrderStatus, nextStatus: OrderStatus, orderType: UnifiedOrder["type"]) =>
      validateStatusTransition(currentStatus, nextStatus, orderType),
    []
  );

  return {
    validateTransition,
    canGenerateLabel,
    generateLabelForOrder,
    getLabelErrorMessage,
    isAddressError,
    isRetryableError,
  };
}

