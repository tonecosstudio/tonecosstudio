import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignCollectionToTierRpc,
  assignCollectionsToTierRpc,
  bulkAssignCollectionsToTierRpc,
  bulkUpdateCharacterPriceMultipliersRpc,
  deletePricingTierRpc,
  saveCollectionTypeRpc,
  savePricingTierPlanRpc,
  updateCharacterPriceMultiplierRpc,
  updatePricingContextMultipliersRpc,
  updatePurchaseModeRpc,
  updateStandalonePricingRpc,
  updateSubscriptionPlanCollectionLimitRpc,
  upsertAdminSystemSettings,
} from "./admin-config-mutations-service";

const mocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

const planId = "11111111-1111-4111-8111-111111111111";
const tierId = "22222222-2222-4222-8222-222222222222";
const typeId = "33333333-3333-4333-8333-333333333333";
const collectionId = "44444444-4444-4444-8444-444444444444";
const collectionId2 = "55555555-5555-4555-8555-555555555555";
const characterId = "66666666-6666-4666-8666-666666666666";
const otherId = "77777777-7777-4777-8777-777777777777";
const modeId = "88888888-8888-4888-8888-888888888888";

describe("admin-config-mutations-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callAdminRpc.mockResolvedValue(null);
  });

  it("envia configuracoes publicas permitidas ao RPC administrativo", async () => {
    await expect(
      upsertAdminSystemSettings({
        company_name: "OrdaX",
        shipping_business_days: "5",
      }),
    ).resolves.toBeUndefined();

    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_upsert_system_settings", {
      p_updates: {
        company_name: "OrdaX",
        shipping_business_days: "5",
      },
    });
  });

  it.each([
    "stripe_secret",
    "stripe_secret_key",
    "api_key",
    "provider_api_key_v2",
    "service_role_key",
    "access_token",
    "refresh_token",
    "client_secret",
    "database_password",
    "integration_credential",
  ])("bloqueia chave sensivel antes de chamar o RPC: %s", async (key) => {
    await expect(upsertAdminSystemSettings({ [key]: "sensitive-value" })).rejects.toThrow(
      "Configuracao sensivel nao pode ser salva em system_settings publico",
    );

    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("aceita limite de plano apenas quando id e quantidade conferem", async () => {
    mocks.callAdminRpc.mockResolvedValue([{ id: planId, collections_count: 6 }]);

    await expect(updateSubscriptionPlanCollectionLimitRpc(planId, 6)).resolves.toEqual({
      id: planId,
      collections_count: 6,
    });
  });

  it.each([
    null,
    [],
    [{ id: otherId, collections_count: 6 }],
    [{ id: planId, collections_count: 5 }],
    [{ id: planId, collections_count: 6 }, { id: planId, collections_count: 6 }],
  ])("rejeita retorno inconsistente de limite de plano %#", async (value) => {
    mocks.callAdminRpc.mockResolvedValue(value);
    await expect(updateSubscriptionPlanCollectionLimitRpc(planId, 6)).rejects.toThrow();
  });

  it("exige confirmacao de todas as linhas de pricing avulso", async () => {
    mocks.callAdminRpc.mockResolvedValue({ updated: 2 });

    await expect(
      updateStandalonePricingRpc({
        updates: [
          { id: collectionId, price: 250 },
          { id: collectionId2, price: 300 },
        ],
        pixDiscount: 5,
      }),
    ).resolves.toBeUndefined();

    mocks.callAdminRpc.mockResolvedValue({ updated: 1 });
    await expect(
      updateStandalonePricingRpc({
        updates: [
          { id: collectionId, price: 250 },
          { id: collectionId2, price: 300 },
        ],
        pixDiscount: 5,
      }),
    ).rejects.toThrow("Standalone pricing update returned an unexpected updated");
  });

  it("exige exatamente tres linhas no pricing contextual", async () => {
    mocks.callAdminRpc.mockResolvedValue({ updated: 3 });

    await expect(
      updatePricingContextMultipliersRpc({
        chosenMultiplier: 0.9,
        notChosenMultiplier: 1,
        noSubscriptionMultiplier: 1.2,
      }),
    ).resolves.toBeUndefined();

    mocks.callAdminRpc.mockResolvedValue({ updated: 2 });
    await expect(
      updatePricingContextMultipliersRpc({
        chosenMultiplier: 0.9,
        notChosenMultiplier: 1,
        noSubscriptionMultiplier: 1.2,
      }),
    ).rejects.toThrow("Pricing context update returned an unexpected updated");
  });

  it("vincula save de pricing tier ao id persistido", async () => {
    mocks.callAdminRpc.mockResolvedValue(tierId);
    await expect(savePricingTierPlanRpc({ id: tierId, data: { name: "Premium" } })).resolves.toBeUndefined();

    mocks.callAdminRpc.mockResolvedValue(otherId);
    await expect(savePricingTierPlanRpc({ id: tierId, data: { name: "Premium" } })).rejects.toThrow(
      "Pricing tier plan save returned an unexpected resource id",
    );
  });

  it("vincula exclusao de pricing tier ao id removido", async () => {
    mocks.callAdminRpc.mockResolvedValue(tierId);
    await expect(deletePricingTierRpc(tierId)).resolves.toBeUndefined();

    mocks.callAdminRpc.mockResolvedValue(otherId);
    await expect(deletePricingTierRpc(tierId)).rejects.toThrow(
      "Pricing tier deletion returned an unexpected resource id",
    );
  });

  it("confirma a quantidade da substituicao de atribuicoes de tier", async () => {
    mocks.callAdminRpc.mockResolvedValue({ assigned: 2 });
    await expect(
      assignCollectionsToTierRpc({ tierId, collectionIds: [collectionId, collectionId2] }),
    ).resolves.toBeUndefined();

    mocks.callAdminRpc.mockResolvedValue({ assigned: 1 });
    await expect(
      assignCollectionsToTierRpc({ tierId, collectionIds: [collectionId, collectionId2] }),
    ).rejects.toThrow("Collection tier assignment returned an unexpected assigned");
  });

  it("vincula purchase mode ao mode_key solicitado", async () => {
    mocks.callAdminRpc.mockResolvedValue({ id: modeId, mode_key: "semestral" });
    await expect(updatePurchaseModeRpc("semestral", { price_multiplier: 0.95 })).resolves.toBeUndefined();

    mocks.callAdminRpc.mockResolvedValue({ id: modeId, mode_key: "anual" });
    await expect(updatePurchaseModeRpc("semestral", { price_multiplier: 0.95 })).rejects.toThrow(
      "Purchase mode update returned an unexpected mode_key",
    );
  });

  it("valida collection type e exige o id solicitado em updates", async () => {
    const row = {
      id: typeId,
      name: "premium",
      display_name: "Premium",
      description: null,
      sort_order: 2,
      is_active: true,
      created_at: "2026-09-13T12:00:00Z",
      updated_at: "2026-09-13T12:00:00Z",
    };
    mocks.callAdminRpc.mockResolvedValue(row);

    await expect(
      saveCollectionTypeRpc<typeof row>({ id: typeId, data: { display_name: "Premium" } }),
    ).resolves.toEqual(row);

    mocks.callAdminRpc.mockResolvedValue({ ...row, id: otherId });
    await expect(
      saveCollectionTypeRpc<typeof row>({ id: typeId, data: { display_name: "Premium" } }),
    ).rejects.toThrow("Collection type save returned an unexpected resource id");
  });

  it("vincula atribuicao individual ao collection id solicitado", async () => {
    mocks.callAdminRpc.mockResolvedValue(collectionId);
    await expect(assignCollectionToTierRpc({ collectionId, tierId })).resolves.toBeUndefined();

    mocks.callAdminRpc.mockResolvedValue(otherId);
    await expect(assignCollectionToTierRpc({ collectionId, tierId })).rejects.toThrow(
      "Collection tier assignment returned an unexpected resource id",
    );
  });

  it("exige ids exatos e zero falhas na atribuicao em massa", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      ok: true,
      success: [collectionId, collectionId2],
      failed: [],
    });

    await expect(
      bulkAssignCollectionsToTierRpc<{ ok: boolean; success: string[]; failed: unknown[] }>({
        tierId,
        collectionIds: [collectionId, collectionId2],
      }),
    ).resolves.toMatchObject({ ok: true, success: [collectionId, collectionId2], failed: [] });

    mocks.callAdminRpc.mockResolvedValue({
      ok: true,
      success: [collectionId2, collectionId],
      failed: [],
    });
    await expect(
      bulkAssignCollectionsToTierRpc({ tierId, collectionIds: [collectionId, collectionId2] }),
    ).rejects.toThrow("Bulk collection tier assignment returned an unexpected resource id");
  });

  it("vincula multiplicador individual ao personagem e valor solicitados", async () => {
    mocks.callAdminRpc.mockResolvedValue({ id: characterId, price_multiplier: 1.5 });

    await expect(
      updateCharacterPriceMultiplierRpc<{ id: string; price_multiplier: number }>({
        characterId,
        newMultiplier: 1.5,
      }),
    ).resolves.toEqual({ id: characterId, price_multiplier: 1.5 });

    mocks.callAdminRpc.mockResolvedValue({ id: characterId, price_multiplier: 1.2 });
    await expect(
      updateCharacterPriceMultiplierRpc({ characterId, newMultiplier: 1.5 }),
    ).rejects.toThrow(
      "Character price multiplier update returned an unexpected price_multiplier",
    );
  });

  it("exige que bulk multiplier confirme todos os personagens", async () => {
    mocks.callAdminRpc.mockResolvedValue({ updated: 2 });

    await expect(
      bulkUpdateCharacterPriceMultipliersRpc({
        characterIds: [characterId, otherId],
        newMultiplier: 1.2,
      }),
    ).resolves.toEqual({ updated: 2 });

    mocks.callAdminRpc.mockResolvedValue({ updated: 1 });
    await expect(
      bulkUpdateCharacterPriceMultipliersRpc({
        characterIds: [characterId, otherId],
        newMultiplier: 1.2,
      }),
    ).rejects.toThrow("Bulk character price multiplier update returned an unexpected updated");
  });
});
