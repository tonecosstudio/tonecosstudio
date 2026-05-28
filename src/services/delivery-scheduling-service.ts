import type { Tables } from "@/integrations/supabase/types";
import { scheduleSubscriptionDeliveriesRpc } from "./delivery-cycle-mutations-service";

export interface ScheduledDelivery {
  deliveryNumber: number;
  month: number;
  year: number;
  cycleId: string | null;
  expectedDeliveryDate: Date;
  shippingDeadline: Date;
}

type SubscriptionDeliveryRecord = Tables<"subscription_deliveries">;

export async function scheduleConsecutiveDeliveries(
  subscriptionId: string,
  entryCycleId: string,
  planType: 'trimestral' | 'semestral'
): Promise<SubscriptionDeliveryRecord[]> {
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    throw new Error('subscriptionId is required and must be a string');
  }

  if (!entryCycleId || typeof entryCycleId !== 'string') {
    throw new Error('entryCycleId is required and must be a string');
  }

  if (planType !== 'trimestral' && planType !== 'semestral') {
    throw new Error('planType must be either "trimestral" or "semestral"');
  }

  return scheduleSubscriptionDeliveriesRpc<SubscriptionDeliveryRecord>(
    subscriptionId,
    planType,
    entryCycleId
  );
}
