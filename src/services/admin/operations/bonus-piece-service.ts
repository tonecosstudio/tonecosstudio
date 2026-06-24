import { supabase } from '@/integrations/supabase/client';
import {
  createBonusPieceRpc,
  linkBonusPieceToDeliveryRpc,
  updateBonusPieceStatusRpc,
} from '@/services/delivery/delivery-cycle-mutations-service';

export type BonusStatus = 'pending' | 'prepared' | 'shipped';

export interface BonusPiece {
  id: string;
  created_at: string;
  updated_at: string;
  subscription_id: string;
  delivery_id: string | null;
  description: string | null;
  status: BonusStatus;
  prepared_at: string | null;
  shipped_at: string | null;
}

type BonusPieceQueryResult = BonusPiece & {
  delivery?: {
    cycle_id: string;
  };
};

type BonusPieceQueryError = {
  code?: string;
  message: string;
};

interface BonusPieceQuery extends PromiseLike<{
  data: BonusPieceQueryResult[] | null;
  error: BonusPieceQueryError | null;
}> {
  eq(column: string, value: string): BonusPieceQuery;
  order(column: "created_at", options: { ascending: boolean }): BonusPieceQuery;
  single(): Promise<{ data: BonusPiece | null; error: BonusPieceQueryError | null }>;
}

interface BonusPieceTableClient {
  from(table: "bonus_pieces"): {
    select(columns: string): BonusPieceQuery;
  };
}

const bonusPieceSupabase = supabase as unknown as BonusPieceTableClient;

class BonusPieceService {
  async createBonusPiece(subscriptionId: string, description?: string): Promise<BonusPiece> {
    return createBonusPieceRpc<BonusPiece>(subscriptionId, description ?? null);
  }

  async linkBonusToDelivery(bonusId: string, deliveryId: string): Promise<void> {
    await linkBonusPieceToDeliveryRpc<BonusPiece>(bonusId, deliveryId);
  }

  async updateBonusStatus(bonusId: string, status: BonusStatus): Promise<void> {
    await updateBonusPieceStatusRpc<BonusPiece>(bonusId, status);
  }

  async getBonusBySubscription(subscriptionId: string): Promise<BonusPiece | null> {
    const { data, error } = await bonusPieceSupabase
      .from('bonus_pieces')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar peca bonus: ${error.message}`);
    }

    return data as BonusPiece;
  }

  async getBonusesByCycle(cycleId: string): Promise<BonusPiece[]> {
    const { data, error } = await bonusPieceSupabase
      .from('bonus_pieces')
      .select(`
        *,
        delivery:subscription_deliveries!inner(cycle_id)
      `)
      .eq('delivery.cycle_id', cycleId);

    if (error) {
      throw new Error(`Erro ao buscar pecas bonus do ciclo: ${error.message}`);
    }

    return ((data || []) as BonusPieceQueryResult[]).map((item) => ({
      id: item.id,
      created_at: item.created_at,
      updated_at: item.updated_at,
      subscription_id: item.subscription_id,
      delivery_id: item.delivery_id,
      description: item.description,
      status: item.status,
      prepared_at: item.prepared_at,
      shipped_at: item.shipped_at,
    }));
  }

  async getPendingBonuses(): Promise<BonusPiece[]> {
    const { data, error } = await bonusPieceSupabase
      .from('bonus_pieces')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar pecas bonus pendentes: ${error.message}`);
    }

    return data || [];
  }
}

export const bonusPieceService = new BonusPieceService();
