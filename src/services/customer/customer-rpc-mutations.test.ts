import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeCharacterChoiceRpc, submitCharacterChoiceRpc } from "./choice-mutations-service";
import { updateCollectorProfileRpc } from "./collector-mutations-service";
import {
  submitOrderMigrationRequestRpc,
  upsertCurrentUserProfileRpc,
} from "./customer-account-mutations-service";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

describe("customer rpc mutation boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits and changes character choices with the legacy RPC argument names", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: { id: "choice-1" }, error: null })
      .mockResolvedValueOnce({ data: { id: "choice-2" }, error: null });

    await expect(submitCharacterChoiceRpc("order-1", "collection-character-1")).resolves.toEqual({
      id: "choice-1",
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "customer_submit_character_choice", {
      p_order_id: "order-1",
      p_character_id: "collection-character-1",
    });

    await expect(
      changeCharacterChoiceRpc("choice-1", "collection-character-2", "troca solicitada"),
    ).resolves.toEqual({ id: "choice-2" });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "customer_change_character_choice", {
      p_choice_id: "choice-1",
      p_character_id: "collection-character-2",
      p_reason: "troca solicitada",
    });
  });

  it("wraps choice RPC errors and rejects empty responses", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "submit failed" } });
    await expect(submitCharacterChoiceRpc("order-1", "character-1")).rejects.toThrow(
      "Erro ao submeter escolha: submit failed",
    );

    mocks.rpc.mockResolvedValueOnce({ data: undefined, error: null });
    await expect(
      changeCharacterChoiceRpc("choice-1", "character-2", "motivo"),
    ).rejects.toThrow("Erro ao alterar escolha: resposta vazia");
  });

  it("filters undefined collector fields while preserving explicit null and false", async () => {
    mocks.rpc.mockResolvedValue({ data: { username: "collector" }, error: null });

    await expect(
      updateCollectorProfileRpc({
        username: "collector",
        display_name: undefined,
        bio: null,
        avatar_url: undefined,
        is_public: false,
      }),
    ).resolves.toEqual({ username: "collector" });

    expect(mocks.rpc).toHaveBeenCalledWith("update_current_user_collector_profile", {
      p_updates: {
        username: "collector",
        bio: null,
        is_public: false,
      },
    });
  });

  it("propagates collector RPC errors and rejects null data", async () => {
    const error = { message: "collector failed" };
    mocks.rpc.mockResolvedValueOnce({ data: null, error });
    await expect(updateCollectorProfileRpc({ username: "collector" })).rejects.toBe(error);

    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(updateCollectorProfileRpc({ username: "collector" })).rejects.toThrow(
      "Collector profile update did not return data",
    );
  });

  it("submits migration requests with nullable optional fields", async () => {
    mocks.rpc.mockResolvedValue({ data: "migration-1", error: null });

    await expect(
      submitOrderMigrationRequestRpc({
        fullName: "Cliente Teste",
        email: "cliente@example.com",
        orderDescription: "Pedido antigo",
      }),
    ).resolves.toBe("migration-1");

    expect(mocks.rpc).toHaveBeenCalledWith("submit_order_migration_request", {
      p_full_name: "Cliente Teste",
      p_email: "cliente@example.com",
      p_phone: null,
      p_old_order_number: null,
      p_order_description: "Pedido antigo",
    });
  });

  it("preserves supplied migration phone and order number", async () => {
    mocks.rpc.mockResolvedValue({ data: "migration-2", error: null });

    await submitOrderMigrationRequestRpc({
      fullName: "Cliente Teste",
      email: "cliente@example.com",
      phone: "71999999999",
      oldOrderNumber: "OLD-123",
      orderDescription: "Pedido antigo",
    });

    expect(mocks.rpc).toHaveBeenCalledWith("submit_order_migration_request", {
      p_full_name: "Cliente Teste",
      p_email: "cliente@example.com",
      p_phone: "71999999999",
      p_old_order_number: "OLD-123",
      p_order_description: "Pedido antigo",
    });
  });

  it("upserts the current user profile through the canonical RPC", async () => {
    const profile = { full_name: "Cliente", marketing_emails: false };
    mocks.rpc.mockResolvedValue({ data: profile, error: null });

    await expect(upsertCurrentUserProfileRpc(profile)).resolves.toEqual(profile);
    expect(mocks.rpc).toHaveBeenCalledWith("upsert_current_user_profile", {
      p_profile: profile,
    });
  });

  it("propagates account mutation errors and rejects null data", async () => {
    const error = { message: "profile failed" };
    mocks.rpc.mockResolvedValueOnce({ data: null, error });
    await expect(upsertCurrentUserProfileRpc({ full_name: "Cliente" })).rejects.toBe(error);

    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      submitOrderMigrationRequestRpc({
        fullName: "Cliente",
        email: "cliente@example.com",
        orderDescription: "Pedido",
      }),
    ).rejects.toThrow("Order migration request did not return an id");
  });
});
