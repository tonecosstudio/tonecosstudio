import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateLevelProgress,
  calculateXPForNextLevel,
  checkUsernameAvailability,
  getMyCollectorProfile,
  updateCollectorProfile,
} from "./collector-service";
import {
  analyzePreferencesWithAI,
  getMyProfile,
  upsertMyProfile,
} from "./customer-profile-self-service";
import {
  getCustomerDashboardStats,
  listCustomerDashboardNotifications,
} from "./customer-dashboard-service";
import { submitCustomerContact } from "./contact-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  assertCurrentUserId: vi.fn(),
  updateCollectorProfileRpc: vi.fn(),
  upsertCurrentUserProfileRpc: vi.fn(),
  callAuthenticatedEdgeFunction: vi.fn(),
  createConversation: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/services/auth/current-user", () => ({
  assertCurrentUserId: mocks.assertCurrentUserId,
}));

vi.mock("@/services/customer/collector-mutations-service", () => ({
  updateCollectorProfileRpc: mocks.updateCollectorProfileRpc,
}));

vi.mock("@/services/customer/customer-account-mutations-service", () => ({
  upsertCurrentUserProfileRpc: mocks.upsertCurrentUserProfileRpc,
}));

vi.mock("@/services/supabase/edge-function-client", () => ({
  callAuthenticatedEdgeFunction: mocks.callAuthenticatedEdgeFunction,
}));

vi.mock("@/services/support/conversation-service", () => ({
  conversationService: { createConversation: mocks.createConversation },
}));

vi.mock("@/services/support/message-service", () => ({
  messageService: { sendMessage: mocks.sendMessage },
}));

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

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

function createUsernameQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  return query;
}

function createLimitedQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

function createTerminalEqQuery(result: QueryResult) {
  const eq = vi.fn().mockResolvedValue(result);
  return {
    select: vi.fn().mockReturnValue({ eq }),
    eq,
  };
}

describe("collector self service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertCurrentUserId.mockResolvedValue(undefined);
  });

  it("loads the current user's collector profile", async () => {
    const profile = {
      id: USER_ID,
      username: "collector",
      display_name: "Collector",
      bio: null,
      avatar_url: null,
      is_public: true,
      collector_level: 2,
      collector_xp: 150,
      pieces_owned: 5,
      total_spent: 200,
    };
    const query = createMaybeSingleQuery({ data: profile, error: null });
    mocks.from.mockReturnValue(query);

    await expect(getMyCollectorProfile(USER_ID)).resolves.toEqual(profile);
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER_ID);
    expect(query.eq).toHaveBeenCalledWith("id", USER_ID);
  });

  it("propagates collector profile read failures", async () => {
    const error = { message: "profile failed" };
    mocks.from.mockReturnValue(createMaybeSingleQuery({ data: null, error }));
    await expect(getMyCollectorProfile(USER_ID)).rejects.toBe(error);
  });

  it("updates the current user's collector profile through the canonical RPC", async () => {
    const updated = { id: USER_ID, username: "novo" };
    mocks.updateCollectorProfileRpc.mockResolvedValue(updated);

    await expect(updateCollectorProfile(USER_ID, { username: "novo", is_public: false })).resolves.toEqual(
      updated,
    );
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER_ID);
    expect(mocks.updateCollectorProfileRpc).toHaveBeenCalledWith({
      username: "novo",
      is_public: false,
    });
  });

  it("checks username availability and excludes the current user when supplied", async () => {
    const query = createUsernameQuery({ data: null, error: null });
    mocks.from.mockReturnValue(query);

    await expect(checkUsernameAvailability("collector", USER_ID)).resolves.toBe(true);
    expect(query.eq).toHaveBeenCalledWith("username", "collector");
    expect(query.neq).toHaveBeenCalledWith("id", USER_ID);
  });

  it("reports an occupied username and propagates lookup failures", async () => {
    mocks.from.mockReturnValueOnce(
      createUsernameQuery({ data: { id: "other-user" }, error: null }),
    );
    await expect(checkUsernameAvailability("collector")).resolves.toBe(false);

    const error = { message: "username failed" };
    mocks.from.mockReturnValueOnce(createUsernameQuery({ data: null, error }));
    await expect(checkUsernameAvailability("collector")).rejects.toBe(error);
  });

  it.each([
    [1, 100],
    [2, 200],
    [3, 300],
    [4, 400],
    [5, 500],
    [10, 500],
  ] as const)("calculates the XP threshold for level %s", (level, expected) => {
    expect(calculateXPForNextLevel(level)).toBe(expected);
  });

  it("calculates progress within the current collector level", () => {
    expect(calculateLevelProgress(150, 2)).toBe(75);
    expect(calculateLevelProgress(500, 5)).toBe(0);
  });
});

describe("customer profile self service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertCurrentUserId.mockResolvedValue(undefined);
  });

  it("loads the authenticated profile and permits a missing row", async () => {
    const profile = { id: USER_ID, full_name: "Cliente" };
    mocks.from.mockReturnValueOnce(createMaybeSingleQuery({ data: profile, error: null }));
    await expect(getMyProfile(USER_ID)).resolves.toEqual(profile);

    mocks.from.mockReturnValueOnce(createMaybeSingleQuery({ data: null, error: null }));
    await expect(getMyProfile(USER_ID)).resolves.toBeNull();
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER_ID);
  });

  it("propagates profile read failures", async () => {
    const error = { message: "profile read failed" };
    mocks.from.mockReturnValue(createMaybeSingleQuery({ data: null, error }));
    await expect(getMyProfile(USER_ID)).rejects.toBe(error);
  });

  it("upserts only supported profile fields and removes the id/address wrapper", async () => {
    const deliveryAddress = {
      street: "Rua A",
      number: "10",
      complement: "Apto 1",
      neighborhood: "Centro",
      city: "Salvador",
      state: "BA",
      zip_code: "40000-000",
    };
    mocks.upsertCurrentUserProfileRpc.mockResolvedValue({ id: USER_ID, full_name: "Cliente" });

    await upsertMyProfile({
      id: USER_ID,
      address: null,
      delivery_address: deliveryAddress,
      full_name: "Cliente",
      phone: undefined,
      marketing_emails: false,
    });

    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER_ID);
    expect(mocks.upsertCurrentUserProfileRpc).toHaveBeenCalledWith({
      delivery_address: deliveryAddress,
      full_name: "Cliente",
      marketing_emails: false,
    });
  });

  it("delegates preference analysis to the authenticated Edge boundary", async () => {
    mocks.callAuthenticatedEdgeFunction.mockResolvedValue({ tags: ["anime", "games"] });

    await expect(analyzePreferencesWithAI("Gosto de anime e games")).resolves.toEqual({
      tags: ["anime", "games"],
    });
    expect(mocks.callAuthenticatedEdgeFunction).toHaveBeenCalledWith(
      "analyze-preferences",
      { text: "Gosto de anime e games" },
      "Erro ao analisar preferencias",
    );
  });
});

describe("customer dashboard service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertCurrentUserId.mockResolvedValue(undefined);
  });

  it("aggregates quotes, likes, wishlist and collector stats", async () => {
    const quotes = createLimitedQuery({
      data: [{ id: "quote-1", status: "pending", created_at: "2026-09-17T12:00:00.000Z" }],
      error: null,
    });
    const likes = createTerminalEqQuery({ data: [{ id: "like-1" }, { id: "like-2" }], error: null });
    const wishlist = createTerminalEqQuery({ data: [{ id: "wish-1" }], error: null });
    const collector = createMaybeSingleQuery({
      data: { collector_level: 3, collector_xp: 250, pieces_owned: 8, total_spent: 900 },
      error: null,
    });

    mocks.from.mockImplementation((table: string) => {
      if (table === "quotes") return quotes;
      if (table === "model_likes") return likes;
      if (table === "wishlist") return wishlist;
      if (table === "profiles") return collector;
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(getCustomerDashboardStats(USER_ID)).resolves.toEqual({
      quotes: [{ id: "quote-1", status: "pending", created_at: "2026-09-17T12:00:00.000Z" }],
      totalQuotes: 1,
      totalLikes: 2,
      totalWishlist: 1,
      collector: { collector_level: 3, collector_xp: 250, pieces_owned: 8, total_spent: 900 },
    });
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER_ID);
    expect(quotes.limit).toHaveBeenCalledWith(5);
  });

  it.each(["quotes", "model_likes", "wishlist", "profiles"] as const)(
    "fails closed when the %s dashboard query fails",
    async (failedTable) => {
      const error = { message: `${failedTable} failed` };
      const quotes = createLimitedQuery({ data: [], error: failedTable === "quotes" ? error : null });
      const likes = createTerminalEqQuery({ data: [], error: failedTable === "model_likes" ? error : null });
      const wishlist = createTerminalEqQuery({ data: [], error: failedTable === "wishlist" ? error : null });
      const collector = createMaybeSingleQuery({ data: null, error: failedTable === "profiles" ? error : null });

      mocks.from.mockImplementation((table: string) => {
        if (table === "quotes") return quotes;
        if (table === "model_likes") return likes;
        if (table === "wishlist") return wishlist;
        if (table === "profiles") return collector;
        throw new Error(`Unexpected table ${table}`);
      });

      await expect(getCustomerDashboardStats(USER_ID)).rejects.toBe(error);
    },
  );

  it("lists only unread dashboard notifications and normalizes null messages", async () => {
    const query = createLimitedQuery({
      data: [
        {
          id: "notification-1",
          title: "Atualizacao",
          message: null,
          created_at: "2026-09-17T12:00:00.000Z",
        },
      ],
      error: null,
    });
    mocks.from.mockReturnValue(query);

    await expect(listCustomerDashboardNotifications(USER_ID)).resolves.toEqual([
      {
        id: "notification-1",
        title: "Atualizacao",
        message: "",
        created_at: "2026-09-17T12:00:00.000Z",
      },
    ]);
    expect(query.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(query.eq).toHaveBeenCalledWith("is_read", false);
    expect(query.limit).toHaveBeenCalledWith(5);
  });

  it("propagates dashboard notification failures", async () => {
    const error = { message: "notifications failed" };
    mocks.from.mockReturnValue(createLimitedQuery({ data: null, error }));
    await expect(listCustomerDashboardNotifications(USER_ID)).rejects.toBe(error);
  });
});

describe("customer contact service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertCurrentUserId.mockResolvedValue(undefined);
  });

  it("creates a waiting-admin conversation before sending the customer message", async () => {
    mocks.createConversation.mockResolvedValue({ id: "conversation-1" });
    mocks.sendMessage.mockResolvedValue({ id: "message-1" });

    await expect(
      submitCustomerContact({
        userId: USER_ID,
        name: "Cliente",
        message: "Preciso de ajuda",
      }),
    ).resolves.toBeUndefined();

    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER_ID);
    expect(mocks.createConversation).toHaveBeenCalledWith({
      user_id: USER_ID,
      subject: "Contato: Cliente",
      status: "waiting_admin",
      tags: ["duvida"],
    });
    expect(mocks.sendMessage).toHaveBeenCalledWith({
      conversation_id: "conversation-1",
      sender_id: USER_ID,
      sender_type: "customer",
      message: "Preciso de ajuda",
    });
    expect(mocks.createConversation.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendMessage.mock.invocationCallOrder[0],
    );
  });
});
