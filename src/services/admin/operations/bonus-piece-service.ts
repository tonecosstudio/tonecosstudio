import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  createBonusPieceRpc,
  linkBonusPieceToDeliveryRpc,
  updateBonusPieceStatusRpc,
} from "@/services/delivery/delivery-cycle-mutations-service";

export type BonusStatus = "pending" | "prepared" | "shipped";

type BonusPieceRow = Database["public"]["Tables"]["bonus_pieces"]["Row"];

export type BonusPiece = Omit<BonusPieceRow, "status"> & {
  status: BonusStatus;
};

const BONUS_STATUSES = new Set<BonusStatus>(["pending", "prepared", "shipped"]);

function toBonusPiece(row: BonusPieceRow): BonusPiece {
  if (!BONUS_STATUSES.has(row.status as BonusStatus)) {
    throw new Error(`Status de peca bonus invalido: ${row.status}`);
  }

  return {
    ...row,
    status: row.status as BonusStatus,
  };
}

class BonusPieceService {
  async createBonusPiece(subscriptionId: string, description?: string): Promise<BonusPiece> {
    const row = await createBonusPieceRpc<BonusPieceRow>(
      subscriptionId,
      description ?? null,
    );
    return toBonusPiece(row);
  }

  async linkBonusToDelivery(bonusId: string, deliveryId: string): Promise<void> {
    await linkBonusPieceToDeliveryRpc<BonusPieceRow>(bonusId, deliveryId);
  }

  async updateBonusStatus(bonusId: string, status: BonusStatus): Promise<void> {
    await updateBonusPieceStatusRpc<BonusPieceRow>(bonusId, status);
  }

  async getBonusBySubscription(subscriptionId: string): Promise<BonusPiece | null> {
    const { data, error } = await supabase
      .from("bonus_pieces")
      .select("*")
      .eq("subscription_id", subscriptionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar peca bonus: ${error.message}`);
    }

    return data ? toBonusPiece(data) : null;
  }

  async getBonusesByCycle(cycleId: string): Promise<BonusPiece[]> {
    const { data, error } = await supabase
      .from("bonus_pieces")
      .select(`
        *,
        delivery:subscription_deliveries!inner(cycle_id)
      `)
      .eq("delivery.cycle_id", cycleId);

    if (error) {
      throw new Error(`Erro ao buscar pecas bonus do ciclo: ${error.message}`);
    }

    return (data ?? []).map((item) => {
      const { delivery: _delivery, ...row } = item;
      return toBonusPiece(row);
    });
  }

  async getPendingBonuses(): Promise<BonusPiece[]> {
    const { data, error } = await supabase
      .from("bonus_pieces")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar pecas bonus pendentes: ${error.message}`);
    }

    return (data ?? []).map(toBonusPiece);
  }
}

export const bonusPieceService = new BonusPieceService();
