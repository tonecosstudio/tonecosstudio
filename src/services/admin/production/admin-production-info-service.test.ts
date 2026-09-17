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

type QueryResult = { data: unknown; error: { message: string } | null };

function createMaybeSingleQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

function mockTables(input: {
  productionQueue?: QueryResult;
  productionStage?: QueryResult;
  characterChoice?: QueryResult;
}) {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === "production_queue") {
      return createMaybeSingleQuery(
        input.productionQueue ?? { data: null, error: null },
      ) as never;
    }

    if (table === "production_stages") {
      return createMaybeSingleQuery(
        input.productionStage ?? { data: null, error: null },
      ) as never;
    }

    if (table === "character_choices") {
      return createMaybeSingleQuery(
        input.characterChoice ?? { data: null, error: null },
      ) as never;
    }

    throw new Error(`Unexpected table in test: ${table}`);
  }) as never);
}

describe("admin-production-info-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null only when production data is genuinely absent", async () => {
    mockTables({ productionQueue: { data: null, error: null } });

    await expect(
      fetchProductionInfo("order-1", "standalone_purchase"),
    ).resolves.toBeNull();
  });

  it("surfaces production query failures instead of masking them as absence", async () => {
    mockTables({
      productionQueue: { data: null, error: { message: "database unavailable" } },
    });

    await expect(
      fetchProductionInfo("order-1", "standalone_purchase"),
    ).rejects.toThrow("Erro ao buscar informações de produção: database unavailable");
  });

  it("preserves an unconfigured choice status as null", async () => {
    mockTables({
      productionQueue: {
        data: {
          id: "queue-1",
          order_id: "order-1",
          choice_status: null,
          choice_deadline: null,
          character_name: null,
          estimated_completion_date: null,
        },
        error: null,
      },
      productionStage: {
        data: { stage_name: "awaiting_choice" },
        error: null,
      },
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
    mockTables({
      productionQueue: {
        data: {
          id: "queue-1",
          order_id: "order-1",
          choice_status: "pending",
          choice_deadline: null,
          character_name: null,
          estimated_completion_date: null,
        },
        error: null,
      },
      productionStage: {
        data: { stage_name: "mystery_stage" },
        error: null,
      },
    });

    await expect(
      fetchProductionInfo("order-1", "subscription_delivery"),
    ).rejects.toThrow("Informações de produção inválidas: estágio de produção inválido");
  });

  it("surfaces character-choice query failures", async () => {
    mockTables({
      characterChoice: { data: null, error: { message: "permission denied" } },
    });

    await expect(
      fetchCharacterChoiceInfo("order-1", "subscription_delivery"),
    ).rejects.toThrow("Erro ao buscar escolha de personagem: permission denied");
  });

  it("rejects unknown persisted choice statuses", async () => {
    mockTables({
      characterChoice: {
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
      },
    });

    await expect(
      fetchCharacterChoiceInfo("order-1", "subscription_delivery"),
    ).rejects.toThrow("Escolha de personagem inválida: status de escolha inválido");
  });
});
