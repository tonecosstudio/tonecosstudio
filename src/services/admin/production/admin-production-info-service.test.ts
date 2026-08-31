import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCharacterChoiceInfo,
  fetchProductionInfo,
} from "./admin-production-info-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  log: { error: vi.fn() },
}));

function mockMaybeSingle(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  vi.mocked(supabase.from).mockReturnValue(query as never);
}

describe("admin-production-info-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null only when production data is genuinely absent", async () => {
    mockMaybeSingle({ data: null, error: null });

    await expect(
      fetchProductionInfo("order-1", "standalone_purchase"),
    ).resolves.toBeNull();
  });

  it("surfaces production query failures instead of masking them as absence", async () => {
    mockMaybeSingle({ data: null, error: { message: "database unavailable" } });

    await expect(
      fetchProductionInfo("order-1", "standalone_purchase"),
    ).rejects.toThrow("Erro ao buscar informações de produção: database unavailable");
  });

  it("preserves an unconfigured choice status as null", async () => {
    mockMaybeSingle({
      data: {
        id: "queue-1",
        order_id: "order-1",
        current_stage: "awaiting_choice",
        choice_status: null,
        choice_deadline: null,
        character_name: null,
        estimated_completion_date: null,
      },
      error: null,
    });

    await expect(
      fetchProductionInfo("order-1", "subscription_delivery"),
    ).resolves.toMatchObject({
      id: "queue-1",
      currentStage: "awaiting_choice",
      choiceStatus: null,
      choiceDeadline: null,
    });
  });

  it("rejects unknown persisted production stages", async () => {
    mockMaybeSingle({
      data: {
        id: "queue-1",
        order_id: "order-1",
        current_stage: "mystery_stage",
        choice_status: "pending",
        choice_deadline: null,
        character_name: null,
        estimated_completion_date: null,
      },
      error: null,
    });

    await expect(
      fetchProductionInfo("order-1", "subscription_delivery"),
    ).rejects.toThrow("Informações de produção inválidas: estágio de produção inválido");
  });

  it("surfaces character-choice query failures", async () => {
    mockMaybeSingle({ data: null, error: { message: "permission denied" } });

    await expect(
      fetchCharacterChoiceInfo("order-1", "subscription_delivery"),
    ).rejects.toThrow("Erro ao buscar escolha de personagem: permission denied");
  });

  it("rejects unknown persisted choice statuses", async () => {
    mockMaybeSingle({
      data: {
        id: "choice-1",
        status: "mystery",
        deadline: null,
        character_id: null,
        character_name: null,
        submitted_at: null,
        approved_at: null,
      },
      error: null,
    });

    await expect(
      fetchCharacterChoiceInfo("order-1", "subscription_delivery"),
    ).rejects.toThrow("Escolha de personagem inválida: status de escolha inválido");
  });
});
