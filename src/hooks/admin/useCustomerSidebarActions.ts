import { useCallback } from "react";
import {
  getOrderProductionStages,
  updateOrderStatus,
  updatePaymentStatus,
  type CustomerSidebarOrder,
  type OrderProductionStage,
} from "@/services/admin/customers/customer-sidebar-service";

export type { CustomerSidebarOrder, OrderProductionStage } from "@/services/admin/customers/customer-sidebar-service";
import type { OrderStatus } from "@/types/admin/orders";

export function useCustomerSidebarActions() {
  const loadOrderProductionStages = useCallback(async (orderId: string): Promise<OrderProductionStage[]> => {
    return getOrderProductionStages(orderId);
  }, []);

  const changeOrderStatus = useCallback(async (
    orderId: string,
    orderType: CustomerSidebarOrder["type"],
    status: OrderStatus
  ): Promise<void> => {
    await updateOrderStatus(orderId, orderType, status);
  }, []);

  const changePaymentStatus = useCallback(async (paymentId: string, status: string): Promise<void> => {
    await updatePaymentStatus(paymentId, status);
  }, []);

  return {
    loadOrderProductionStages,
    changeOrderStatus,
    changePaymentStatus,
  };
}
