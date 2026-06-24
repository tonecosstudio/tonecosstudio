import { useCallback } from "react";
import { validateStatusTransition } from "@/services/admin/orders/orders-validator";
import {
  canGenerateLabel,
  generateLabelForOrder,
  getLabelErrorMessage,
  isAddressError,
  isRetryableError,
} from "@/services/admin/delivery/label-service";
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

