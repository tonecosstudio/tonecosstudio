import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { cycleService } from "@/services/delivery/cycle-service";
import {
  assignDeliveryToCycleRpc,
  changeDeliveryCharacterRpc,
  scheduleSubscriptionDeliveriesRpc,
  updateDeliveryStatusRpc,
} from '@/services/delivery/delivery-cycle-mutations-service';

export type DeliveryStatus =
  | 'scheduled'
  | 'pending_production'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PlanType = 'trimestral' | 'semestral';

export interface Delivery {
  id: string;
  created_at: string;
  updated_at: string;
  subscription_id: string;
  cycle_id: string;
  character_id: string | null;
  delivery_number: number;
  status: DeliveryStatus;
  status_changed_at: string;
  scheduled_date: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking_code: string | null;
}

type DeliveryRow = Database['public']['Tables']['subscription_deliveries']['Row'];

function toDeliveryStatus(status: string): DeliveryStatus {
  return [
    'scheduled',
    'pending_production',
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ].includes(status)
    ? (status as DeliveryStatus)
    : 'scheduled';
}

function toDelivery(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    subscription_id: row.subscription_id,
    cycle_id: row.cycle_id,
    character_id: row.character_id,
    delivery_number: row.delivery_number ?? row.delivery_order ?? 0,
    status: toDeliveryStatus(row.status),
    status_changed_at: row.updated_at,
    scheduled_date: row.delivery_date ?? row.reveal_date ?? row.expected_delivery_date ?? null,
    shipped_at: row.shipping_date,
    delivered_at: row.actual_delivery_date ?? row.delivered_date ?? null,
    tracking_code: row.tracking_code,
  };
}

class DeliveryService {
  async scheduleConsecutiveDeliveries(
    subscriptionId: string,
    planType: PlanType,
    entryCycleId: string
  ): Promise<Delivery[]> {
    return scheduleSubscriptionDeliveriesRpc<Delivery>(subscriptionId, planType, entryCycleId);
  }

  async updateDeliveryStatus(deliveryId: string, status: DeliveryStatus): Promise<void> {
    await updateDeliveryStatusRpc<Delivery>(deliveryId, status);
  }

  async assignDeliveryToCycle(deliveryId: string, cycleId: string): Promise<void> {
    await assignDeliveryToCycleRpc<Delivery>(deliveryId, cycleId);
  }

  async getDeliveriesBySubscription(subscriptionId: string): Promise<Delivery[]> {
    const { data, error } = await supabase
      .from('subscription_deliveries')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('delivery_number', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar entregas: ${error.message}`);
    }

    return (data ?? []).map(toDelivery);
  }

  async getDeliveriesByCycle(cycleId: string): Promise<Delivery[]> {
    const { data, error } = await supabase
      .from('subscription_deliveries')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('delivery_number', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar entregas do ciclo: ${error.message}`);
    }

    return (data ?? []).map(toDelivery);
  }

  async getCurrentDelivery(subscriptionId: string): Promise<Delivery | null> {
    const { data, error } = await supabase
      .from('subscription_deliveries')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .in('status', ['scheduled', 'pending_production', 'pending', 'processing'])
      .order('delivery_number', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar entrega atual: ${error.message}`);
    }

    return toDelivery(data);
  }

  async canChangeCharacter(deliveryId: string): Promise<boolean> {
    const { data: delivery, error } = await supabase
      .from('subscription_deliveries')
      .select('cycle_id')
      .eq('id', deliveryId)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar entrega: ${error.message}`);
    }

    if (!delivery.cycle_id) {
      return false;
    }

    const cycle = await cycleService.getCycleById(delivery.cycle_id);
    return ['open', 'active', 'sales'].includes(cycle.status);
  }

  async changeCharacter(deliveryId: string, newCharacterId: string): Promise<void> {
    try {
      await changeDeliveryCharacterRpc<Delivery>(deliveryId, newCharacterId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not allowed') || message.includes('cycle')) {
        throw new Error(
          'Nao e possivel trocar o personagem. O ciclo ja esta em producao ou foi encerrado.'
        );
      }
      throw error;
    }
  }
}

export const deliveryService = new DeliveryService();
