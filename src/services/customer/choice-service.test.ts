import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changeCharacterChoice,
  getAvailableCharacters,
  getMyChoice,
  submitCharacterChoice,
} from "./choice-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const COLLECTION_ID = "22222222-2222-4222-8222-222222222222";
const CHARACTER_ID = "33333333-3333-4333-8333-333333333333";
const CHOICE_ID = "44444444-4444-4444-8444-444444444444";
const ORDER_ID = "55555555-5555-4555-8555-555555555555";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  submitCharacterChoiceRpc: vi.fn(),
  changeCharacterChoiceRpc: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("./choice-mutations-service", () => ({
  submitCharacterChoiceRpc: mocks.submitCharacterChoiceRpc,
  changeCharacterChoiceRpc: mocks.changeCharacterChoiceRpc,
}));

vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function createCharacterListQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function createMaybeSingleQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function choiceRow(status = "submitted") {
  return {
    id: CHOICE_ID,
    order_id: ORDER_ID,
    order_type: "subscription_delivery" as const,
    user_id: USER_ID,
    collection_id: COLLECTION_ID,
    character_id: CHARACTER_ID,
    character_name: "Heroi",
    character_image_url: "https://example.com/hero.png",
    status,
    submitted_at: "2026-09-17T12:00:00.000Z",
    approved_at: undefined,
    approved_by: undefined,
    approved_by_name: undefined,
    rejected_at: null,
    rejection_reason: null,
    deadline: "2026-09-20T23:59:59.999Z",
    reminders_sent: undefined,
    last_reminder_at: undefined,
    previous_choice_id: undefined,
    change_reason: undefined,
    change_count: undefined,
    created_at: "2026-09-17T12:00:00.000Z",
    updated_at: "2026-09-17T12:00:00.000Z",
  };
}

describe("customer choice service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUserId.mockResolvedValue(USER_ID);
  });

  it("loads catalog characters and computes availability per character", async () => {
    const listQuery = createCharacterListQuery({
      data: [
        {
          id: CHARACTER_ID,
          name: "Heroi",
          description: "Descricao",
          image_url: "https://example.com/hero.png",
          collection_id: COLLECTION_ID,
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          name: "Vilao",
          description: null,
          image_url: null,
          collection_id: COLLECTION_ID,
        },
      ],
      error: null,
    });
    const availableQuery = createMaybeSingleQuery({ data: { id: CHARACTER_ID }, error: null });
    const unavailableQuery = createMaybeSingleQuery({ data: null, error: { message: "not available" } });
    mocks.from
      .mockReturnValueOnce(listQuery)
      .mockReturnValueOnce(availableQuery)
      .mockReturnValueOnce(unavailableQuery);

    await expect(getAvailableCharacters(COLLECTION_ID)).resolves.toEqual([
      {
        id: CHARACTER_ID,
        name: "Heroi",
        description: "Descricao",
        imageUrl: "https://example.com/hero.png",
        collectionId: COLLECTION_ID,
        isAvailable: true,
      },
      {
        id: "66666666-6666-4666-8666-666666666666",
        name: "Vilao",
        description: null,
        imageUrl: null,
        collectionId: COLLECTION_ID,
        isAvailable: false,
      },
    ]);
    expect(listQuery.eq).toHaveBeenCalledWith("collection_id", COLLECTION_ID);
    expect(listQuery.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(availableQuery.eq).toHaveBeenCalledWith("id", CHARACTER_ID);
    expect(availableQuery.eq).toHaveBeenCalledWith("collection_id", COLLECTION_ID);
  });

  it("rejects missing collection ids and catalog query errors", async () => {
    await expect(getAvailableCharacters("")).rejects.toThrow("Collection ID e obrigatorio");

    mocks.from.mockReturnValue(
      createCharacterListQuery({ data: null, error: { message: "catalog failed" } }),
    );
    await expect(getAvailableCharacters(COLLECTION_ID)).rejects.toThrow(
      "Erro ao buscar personagens: catalog failed",
    );
  });

  it("fails closed when a catalog character is incomplete", async () => {
    mocks.from.mockReturnValue(
      createCharacterListQuery({
        data: [
          {
            id: CHARACTER_ID,
            name: null,
            description: null,
            image_url: null,
            collection_id: COLLECTION_ID,
          },
        ],
        error: null,
      }),
    );

    await expect(getAvailableCharacters(COLLECTION_ID)).rejects.toThrow(
      `Personagem ${CHARACTER_ID} possui dados de catalogo incompletos`,
    );
  });

  it("submits a character choice through the canonical RPC and transforms defaults", async () => {
    mocks.submitCharacterChoiceRpc.mockResolvedValue(choiceRow());

    await expect(submitCharacterChoice(ORDER_ID, CHARACTER_ID)).resolves.toEqual({
      id: CHOICE_ID,
      orderId: ORDER_ID,
      orderType: "subscription_delivery",
      userId: USER_ID,
      collectionId: COLLECTION_ID,
      characterId: CHARACTER_ID,
      characterName: "Heroi",
      characterImageUrl: "https://example.com/hero.png",
      status: "submitted",
      submittedAt: "2026-09-17T12:00:00.000Z",
      approvedAt: null,
      approvedBy: null,
      approvedByName: null,
      rejectedAt: null,
      rejectionReason: null,
      deadline: "2026-09-20T23:59:59.999Z",
      remindersSent: 0,
      lastReminderAt: null,
      previousChoiceId: null,
      changeReason: null,
      changeCount: 0,
      createdAt: "2026-09-17T12:00:00.000Z",
      updatedAt: "2026-09-17T12:00:00.000Z",
    });
    expect(mocks.submitCharacterChoiceRpc).toHaveBeenCalledWith(ORDER_ID, CHARACTER_ID);
  });

  it("rejects incomplete submit input", async () => {
    await expect(submitCharacterChoice("", CHARACTER_ID)).rejects.toThrow(
      "Order ID e Character ID sao obrigatorios",
    );
    await expect(submitCharacterChoice(ORDER_ID, "")).rejects.toThrow(
      "Order ID e Character ID sao obrigatorios",
    );
    expect(mocks.submitCharacterChoiceRpc).not.toHaveBeenCalled();
  });

  it("changes a choice only with a non-empty reason", async () => {
    mocks.changeCharacterChoiceRpc.mockResolvedValue({
      ...choiceRow("approved"),
      change_reason: "Cliente pediu",
      change_count: 1,
    });

    await expect(changeCharacterChoice(CHOICE_ID, CHARACTER_ID, "Cliente pediu")).resolves.toEqual(
      expect.objectContaining({
        id: CHOICE_ID,
        status: "approved",
        changeReason: "Cliente pediu",
        changeCount: 1,
      }),
    );
    expect(mocks.changeCharacterChoiceRpc).toHaveBeenCalledWith(
      CHOICE_ID,
      CHARACTER_ID,
      "Cliente pediu",
    );
  });

  it("rejects incomplete change input and blank reasons", async () => {
    await expect(changeCharacterChoice("", CHARACTER_ID, "motivo")).rejects.toThrow(
      "Choice ID e Character ID sao obrigatorios",
    );
    await expect(changeCharacterChoice(CHOICE_ID, "", "motivo")).rejects.toThrow(
      "Choice ID e Character ID sao obrigatorios",
    );
    await expect(changeCharacterChoice(CHOICE_ID, CHARACTER_ID, "   ")).rejects.toThrow(
      "Motivo da mudanca e obrigatorio",
    );
    expect(mocks.changeCharacterChoiceRpc).not.toHaveBeenCalled();
  });

  it("loads the authenticated user's choice and transforms it", async () => {
    const query = createMaybeSingleQuery({ data: choiceRow("pending"), error: null });
    mocks.from.mockReturnValue(query);

    await expect(getMyChoice(ORDER_ID)).resolves.toEqual(
      expect.objectContaining({ id: CHOICE_ID, orderId: ORDER_ID, status: "pending" }),
    );
    expect(mocks.requireAuthenticatedUserId).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenNthCalledWith(1, "order_id", ORDER_ID);
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", USER_ID);
  });

  it("returns null when no choice exists and wraps query failures", async () => {
    mocks.from.mockReturnValueOnce(createMaybeSingleQuery({ data: null, error: null }));
    await expect(getMyChoice(ORDER_ID)).resolves.toBeNull();

    mocks.from.mockReturnValueOnce(
      createMaybeSingleQuery({ data: null, error: { message: "choice failed" } }),
    );
    await expect(getMyChoice(ORDER_ID)).rejects.toThrow("Erro ao buscar escolha: choice failed");
  });

  it("rejects missing order ids before authentication", async () => {
    await expect(getMyChoice("")).rejects.toThrow("Order ID e obrigatorio");
    expect(mocks.requireAuthenticatedUserId).not.toHaveBeenCalled();
  });

  it("fails closed for unknown persisted choice statuses", async () => {
    mocks.submitCharacterChoiceRpc.mockResolvedValue(choiceRow("unknown"));
    await expect(submitCharacterChoice(ORDER_ID, CHARACTER_ID)).rejects.toThrow(
      `Character choice ${CHOICE_ID} has an invalid status`,
    );
  });
});
