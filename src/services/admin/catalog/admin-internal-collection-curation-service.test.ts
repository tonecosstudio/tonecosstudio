import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

import {
  addCatalogCurationTagAlias,
  assertCurrentCanonicalCurationModels,
  createCatalogCurationTag,
  createInternalCollectionTemplate,
  ensureAdminInternalCollection,
  getInternalCollectionCurationPage,
  INTERNAL_COLLECTION_TEMPLATES,
  removeCatalogCurationTagAlias,
  saveCatalogModelClassifications,
  saveInternalCollectionCuration,
  verifyCatalogModelCharacterIdentity,
  unlinkCatalogModelCharacterIdentity,
} from "./admin-internal-collection-curation-service";

const COLLECTION_ID = "11111111-1111-4111-8111-111111111111";
const MODEL_ID = "22222222-2222-4222-8222-222222222222";
const TAG_ID = "33333333-3333-4333-8333-333333333301";

describe("internal catalog curation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves all commercial admin identities and private editorial RPCs in the single gateway", () => {
    const gateway = readFileSync(
      "supabase/functions/admin-rpc/index.ts",
      "utf8",
    );
    const entries = (registry: string): string[] => {
      const start = gateway.indexOf(`const ${registry} = new Set([`);
      expect(start).toBeGreaterThanOrEqual(0);
      const end = gateway.indexOf("]);", start);
      expect(end).toBeGreaterThan(start);
      return [...gateway.slice(start, end).matchAll(/"([^"]+)"/g)].map(
        (match) => match[1],
      );
    };

    const allowed = entries("ADMIN_RPC_ALLOWLIST");
    const userContext = entries("ADMIN_USER_CONTEXT_RPCS");
    expect(new Set(allowed).size).toBe(allowed.length);
    expect(new Set(userContext).size).toBe(userContext.length);
    for (const name of userContext) expect(allowed).toContain(name);

    // The 15 user-JWT RPCs are the full verified commercial contract from PR #27.
    for (const name of [
      "admin_get_or_create_delivery_cycle",
      "admin_process_subscription_payment",
      "admin_save_tonart_commercial_offer",
      "tonart_admin_commercial_offers_directory",
      "admin_save_subscription_plan_configuration",
      "admin_set_subscription_collection_models",
      "admin_schedule_subscription_deliveries",
      "admin_update_payment_setting",
      "admin_update_production_setting",
      "admin_upsert_system_settings",
      "admin_verify_subscription_payment_voucher",
      "admin_register_preorder_manual_payment",
      "admin_reject_preorder_payment_voucher",
      "admin_release_preorder_final_payment",
      "admin_send_payment_link",
    ]) {
      expect(userContext).toContain(name);
    }
    // Editorial RPCs remain service-scoped after the admin gateway check.
    for (const name of [
      "admin_create_catalog_curation_tag",
      "admin_add_catalog_curation_tag_alias",
      "admin_remove_catalog_curation_tag_alias",
      "admin_get_collection_curation_page",
      "admin_get_collection_curation_summary",
      "admin_ensure_internal_collection",
      "admin_list_catalog_curation_tags",
      "admin_list_internal_collections",
      "admin_upsert_catalog_curation_tags",
      "admin_upsert_collection_curation_models",
      "admin_verify_catalog_model_identity",
      "admin_unlink_catalog_model_character",
    ]) {
      expect(allowed).toContain(name);
      expect(userContext).not.toContain(name);
    }
  });

  it("keeps both curation migrations atomic and the vocabulary RPC admin-only", () => {
    const paths = [
      "../../../../supabase/migrations/20261115154500_tonart_internal_collection_curation.sql",
      "../../../../supabase/migrations/20261115154600_tonart_curation_controlled_tag_creation.sql",
    ];
    const migrations = paths.map((path) =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(
        /\r\n/g,
        "\n",
      ),
    );
    for (const migration of migrations) {
      expect(migration.match(/^BEGIN;$/gm)).toHaveLength(1);
      expect(migration.match(/^COMMIT;$/gm)).toHaveLength(1);
      expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
      expect(migration).not.toContain("public.assert_admin_access");
      expect(migration).not.toContain("public.collections");
      expect(migration).not.toContain("public.collection_tier_assignments");
      const functions = [
        ...migration.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\(/g),
      ].map((match) => match[1]);
      expect(new Set(functions).size).toBe(functions.length);
    }
    expect(migrations[0]).toContain(
      "CREATE TABLE IF NOT EXISTS public.catalog_curation_tags",
    );
    expect(migrations[0]).toContain(
      "CREATE TABLE IF NOT EXISTS public.tonart_editorial_collections",
    );
    expect(migrations[0]).toContain(
      "REVOKE ALL ON TABLE public.tonart_editorial_collections FROM PUBLIC, anon, authenticated, service_role",
    );
    expect(migrations[0]).toContain(
      "FROM PUBLIC, anon, authenticated, service_role;",
    );
    expect(migrations[0]).toContain(
      "IF p_offset IS NULL OR p_limit IS NULL OR p_offset < 0",
    );
    expect(migrations[0]).toContain(
      "REVOKE ALL ON TABLE\n  public.catalog_character_identities,",
    );
    expect(migrations[0]).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE\n  public.catalog_character_identities,",
    );
    expect(migrations[0]).not.toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE",
    );
    expect(migrations[0]).toContain(
      "REFERENCES public.tonart_editorial_collections(id)",
    );
    expect(migrations[0]).toContain("IF v_collection.name <> v_name THEN");
    expect(migrations[0]).toContain(
      "Editorial collection slug belongs to a different name",
    );
    expect(migrations[0]).toContain(
      "private_api.assert_tonart_curation_service_role()",
    );
    for (const helper of [
      "guard_catalog_curation_tag_alias()",
      "guard_catalog_curation_tag_slug()",
      "admin_validate_catalog_curation_text(text, text, integer, boolean)",
      "admin_validate_catalog_model_reference(text, text)",
    ]) {
      expect(migrations[0]).toContain(
        `REVOKE ALL ON FUNCTION public.${helper}`,
      );
    }
    expect(migrations[0]).toContain(
      "GRANT EXECUTE ON FUNCTION public.admin_validate_catalog_curation_text(text, text, integer, boolean)",
    );
    expect(migrations[0]).toContain(
      "GRANT EXECUTE ON FUNCTION public.admin_validate_catalog_model_reference(text, text)",
    );
    expect(migrations[0]).toContain("public.is_tonecos_admin()");
    expect(migrations[0]).not.toContain("public.collections");
    expect(migrations[0]).not.toContain("public.collection_tier_assignments");
    expect(migrations[0]).not.toContain("public.assert_admin_access");
    expect(migrations[1]).toContain(
      "CREATE OR REPLACE FUNCTION public.admin_create_catalog_curation_tag(",
    );
    expect(migrations[1]).toContain(
      "private_api.assert_tonart_curation_service_role()",
    );
    expect(migrations[1]).toContain(
      "REVOKE ALL ON FUNCTION public.admin_create_catalog_curation_tag(text, text, text)",
    );
    expect(migrations[1]).toContain("FROM PUBLIC, anon, authenticated;");
    expect(migrations[1]).toContain(
      "GRANT EXECUTE ON FUNCTION public.admin_create_catalog_curation_tag(text, text, text)",
    );
    expect(migrations[1]).toContain("TO service_role;");
  });

  it("builds valid custom editorial collections without inventing models", () => {
    expect(
      createInternalCollectionTemplate(
        " Vilões do Homem-Aranha ",
        " Revisão editorial de antagonistas ",
      ),
    ).toEqual({
      name: "Vilões do Homem-Aranha",
      slug: "viloes-do-homem-aranha",
      description: "Revisão editorial de antagonistas",
    });
    expect(
      createInternalCollectionTemplate("A".repeat(110), "Revisão editorial")
        .slug,
    ).toHaveLength(110);
    expect(
      createInternalCollectionTemplate("A".repeat(150), "Revisão editorial")
        .slug,
    ).toHaveLength(120);
    expect(() =>
      createInternalCollectionTemplate("<script>", "Descrição"),
    ).toThrow("catalog_internal_collection_template_invalid");
    expect(() => createInternalCollectionTemplate("  ", "Descrição")).toThrow(
      "catalog_internal_collection_template_invalid",
    );
    expect(() => createInternalCollectionTemplate("Tema", " ")).toThrow(
      "catalog_internal_collection_template_invalid",
    );
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("allows manually discarding an incorrect controlled classification", async () => {
    mocks.callAdminRpc.mockResolvedValue({ count: 1 });
    await expect(
      saveCatalogModelClassifications({
        models: [{ modelId: MODEL_ID, slug: "modelo-real" }],
        tagId: TAG_ID,
        reviewState: "discarded",
        evidenceOrigin: "manual_admin:controlled_classification",
        evidenceNote: "Revisão editorial: classificação removida.",
      }),
    ).resolves.toBe(1);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_upsert_catalog_curation_tags",
      expect.objectContaining({
        p_items: [
          expect.objectContaining({
            reviewState: "discarded",
            tagId: TAG_ID,
          }),
        ],
      }),
    );
  });

  it("prepares owner-defined collections without seeding models", async () => {
    const terror = INTERNAL_COLLECTION_TEMPLATES[0];
    mocks.callAdminRpc.mockResolvedValue({
      id: COLLECTION_ID,
      name: terror.name,
      slug: terror.slug,
      collectionKind: "internal",
      curationVisibility: "private",
      isActive: false,
      status: "draft",
    });

    await expect(ensureAdminInternalCollection(terror)).resolves.toMatchObject({
      slug: "terror",
      collectionKind: "internal",
      curationVisibility: "private",
      isActive: false,
    });

    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_ensure_internal_collection",
      expect.objectContaining({
        p_name: "Terror",
        p_slug: "terror",
      }),
    );
    expect(mocks.callAdminRpc.mock.calls[0][1]).not.toHaveProperty("models");
  });

  it("rejects active or published editorial collection responses", async () => {
    const template = INTERNAL_COLLECTION_TEMPLATES[0];
    const safeResponse = {
      id: COLLECTION_ID,
      name: template.name,
      slug: template.slug,
      collectionKind: "internal",
      curationVisibility: "private",
      isActive: false,
      status: "draft",
    };
    for (const unsafe of [
      { ...safeResponse, isActive: true },
      { ...safeResponse, status: "active" },
      { ...safeResponse, status: "inactive" },
    ]) {
      mocks.callAdminRpc.mockResolvedValueOnce(unsafe);
      await expect(ensureAdminInternalCollection(template)).rejects.toThrow(
        "catalog_internal_collection_invalid",
      );
    }
    expect(mocks.callAdminRpc).toHaveBeenCalledTimes(3);
  });

  it("does not accept a commercial collection as an internal curation template", async () => {
    const template = INTERNAL_COLLECTION_TEMPLATES[0];
    mocks.callAdminRpc.mockResolvedValue({
      id: COLLECTION_ID,
      name: template.name,
      slug: template.slug,
      collectionKind: "commercial",
      curationVisibility: "public",
      isActive: true,
      status: "active",
    });

    await expect(ensureAdminInternalCollection(template)).rejects.toThrow(
      "catalog_internal_collection_invalid",
    );
    expect(mocks.callAdminRpc).toHaveBeenCalledTimes(1);
  });

  it("does not accept an implicit hybrid collection from the admin RPC", async () => {
    const template = INTERNAL_COLLECTION_TEMPLATES[0];
    mocks.callAdminRpc.mockResolvedValue({
      id: COLLECTION_ID,
      name: template.name,
      slug: template.slug,
      collectionKind: "hybrid",
      curationVisibility: "private",
      isActive: false,
      status: "draft",
    });
    await expect(ensureAdminInternalCollection(template)).rejects.toThrow(
      "catalog_internal_collection_invalid",
    );
    expect(mocks.callAdminRpc).toHaveBeenCalledTimes(1);
  });

  it("requires an exact current catalog ID and slug before editorial review", () => {
    const selected = [{ modelId: MODEL_ID, slug: "modelo-real" }];
    expect(() => assertCurrentCanonicalCurationModels(selected, [])).toThrow(
      "catalog_curation_model_reference_stale",
    );
    expect(() =>
      assertCurrentCanonicalCurationModels(selected, [
        { modelId: MODEL_ID, slug: "modelo-antigo" },
      ]),
    ).toThrow("catalog_curation_model_reference_stale");
    expect(() =>
      assertCurrentCanonicalCurationModels(selected, [
        {
          modelId: "44444444-4444-4444-8444-444444444444",
          slug: "modelo-real",
        },
      ]),
    ).toThrow("catalog_curation_model_reference_stale");

    expect(() =>
      assertCurrentCanonicalCurationModels(selected, [
        { modelId: MODEL_ID, slug: "modelo-real" },
      ]),
    ).not.toThrow();
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("rejects duplicate canonical IDs or slugs before either batch RPC", async () => {
    const duplicateIds = [
      { modelId: MODEL_ID, slug: "modelo-real" },
      { modelId: MODEL_ID, slug: "modelo-variante-incorreta" },
    ];
    const duplicateSlugs = [
      { modelId: MODEL_ID, slug: "modelo-real" },
      {
        modelId: "44444444-4444-4444-8444-444444444444",
        slug: "modelo-real",
      },
    ];

    for (const models of [duplicateIds, duplicateSlugs]) {
      await expect(
        saveInternalCollectionCuration({
          collectionId: COLLECTION_ID,
          models,
          state: "suggested",
          evidenceOrigin: "manual_admin:review",
        }),
      ).rejects.toThrow("catalog_curation_duplicate_model_reference");
      await expect(
        saveCatalogModelClassifications({
          models,
          tagId: TAG_ID,
          reviewState: "suggested",
          evidenceOrigin: "manual_admin:review",
        }),
      ).rejects.toThrow("catalog_curation_duplicate_model_reference");
    }

    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("keeps automatic collection classifications in suggested state", async () => {
    await expect(
      saveInternalCollectionCuration({
        collectionId: COLLECTION_ID,
        models: [{ modelId: MODEL_ID, slug: "modelo-real" }],
        state: "approved",
        evidenceOrigin: "automatic:catalog-name-match",
      }),
    ).rejects.toThrow("catalog_curation_automatic_must_be_suggested");

    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("keeps automatic controlled tags in suggested state", async () => {
    await expect(
      saveCatalogModelClassifications({
        models: [{ modelId: MODEL_ID, slug: "modelo-real" }],
        tagId: TAG_ID,
        reviewState: "approved",
        evidenceOrigin: "automatic:classifier-v1",
      }),
    ).rejects.toThrow("catalog_curation_automatic_must_be_suggested");

    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("requires specific evidence for automated collection and tag suggestions", async () => {
    const models = [{ modelId: MODEL_ID, slug: "modelo-real" }];
    await expect(
      saveInternalCollectionCuration({
        collectionId: COLLECTION_ID,
        models,
        state: "suggested",
        evidenceOrigin: "automatic:catalog-match",
      }),
    ).rejects.toThrow("catalog_curation_automatic_evidence_required");
    await expect(
      saveCatalogModelClassifications({
        models,
        tagId: TAG_ID,
        reviewState: "suggested",
        evidenceOrigin: "automatic:catalog-match",
      }),
    ).rejects.toThrow("catalog_curation_automatic_evidence_required");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("rejects uppercase automatic provenance as an attempted manual approval", async () => {
    const models = [{ modelId: MODEL_ID, slug: "modelo-real" }];
    await expect(
      saveInternalCollectionCuration({
        collectionId: COLLECTION_ID,
        models,
        state: "approved",
        evidenceOrigin: "Automatic:catalog-match",
        evidenceNote: "Catalog metadata matched",
      }),
    ).rejects.toThrow("catalog_curation_automatic_must_be_suggested");
    await expect(
      saveCatalogModelClassifications({
        models,
        tagId: TAG_ID,
        reviewState: "approved",
        evidenceOrigin: "AUTOMATIC:catalog-match",
        evidenceNote: "Catalog metadata matched",
      }),
    ).rejects.toThrow("catalog_curation_automatic_must_be_suggested");
    await expect(
      verifyCatalogModelCharacterIdentity({
        model: models[0],
        characterName: "Personagem revisado",
        franchise: "Universo revisado",
        evidenceOrigin: "Automatic:unverified",
      }),
    ).rejects.toThrow("catalog_character_identity_verification_invalid");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("preserves source evidence when an automatic suggestion is admissible", async () => {
    mocks.callAdminRpc.mockResolvedValue({ id: COLLECTION_ID, count: 1 });
    await expect(
      saveInternalCollectionCuration({
        collectionId: COLLECTION_ID,
        models: [{ modelId: MODEL_ID, slug: "modelo-real" }],
        state: "suggested",
        evidenceOrigin: "automatic:catalog-match",
        evidenceNote: "Named metadata field: franchise",
      }),
    ).resolves.toBe(1);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_upsert_collection_curation_models",
      expect.objectContaining({
        p_items: [
          expect.objectContaining({
            state: "suggested",
            evidenceOrigin: "automatic:catalog-match",
            evidenceNote: "Named metadata field: franchise",
          }),
        ],
      }),
    );
  });

  it("creates a reviewed tag in its chosen dimension without model assignments", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      id: TAG_ID,
      dimension: "characteristic",
      slug: "armadura",
      label: "Armadura",
      status: "active",
      definitionOrigin: "manual_admin:controlled_vocabulary",
      aliases: [],
    });
    await expect(
      createCatalogCurationTag({
        dimension: "characteristic",
        label: " Armadura ",
      }),
    ).resolves.toMatchObject({
      id: TAG_ID,
      dimension: "characteristic",
      slug: "armadura",
    });
    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_create_catalog_curation_tag",
      {
        p_dimension: "characteristic",
        p_slug: "armadura",
        p_label: "Armadura",
      },
    );
    expect(mocks.callAdminRpc.mock.calls[0][1]).not.toHaveProperty("models");
  });

  it("rejects malformed controlled tag definitions before any RPC", async () => {
    await expect(
      createCatalogCurationTag({
        dimension: "free_text" as never,
        label: "Armadura",
      }),
    ).rejects.toThrow("catalog_curation_tag_definition_invalid");
    await expect(
      createCatalogCurationTag({
        dimension: "characteristic",
        label: "<script>",
      }),
    ).rejects.toThrow("catalog_curation_tag_definition_invalid");
    await expect(
      createCatalogCurationTag({
        dimension: "characteristic",
        label: "  ",
      }),
    ).rejects.toThrow("catalog_curation_tag_definition_invalid");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("normalizes a manually reviewed curation alias before persisting it", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      tagId: TAG_ID,
      dimension: "narrative_role",
      aliasSlug: "vilao-principal",
    });

    await expect(
      addCatalogCurationTagAlias({
        tagId: TAG_ID,
        alias: "Vilão principal",
      }),
    ).resolves.toBe("vilao-principal");

    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_add_catalog_curation_tag_alias",
      {
        p_tag_id: TAG_ID,
        p_alias_slug: "vilao-principal",
      },
    );
  });

  it("removes only the reviewed alias selected by the admin", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      tagId: TAG_ID,
      aliasSlug: "vilao-principal",
      removed: true,
    });

    await expect(
      removeCatalogCurationTagAlias({
        tagId: TAG_ID,
        aliasSlug: "vilao-principal",
      }),
    ).resolves.toBe("vilao-principal");

    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_remove_catalog_curation_tag_alias",
      {
        p_tag_id: TAG_ID,
        p_alias_slug: "vilao-principal",
      },
    );
  });

  it("rejects invalid tag filters before any RPC", async () => {
    await expect(
      getInternalCollectionCurationPage({
        collectionId: COLLECTION_ID,
        tagId: "not-a-tag-id",
      }),
    ).rejects.toThrow("catalog_curation_tag_filter_invalid");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("forwards a controlled tag filter to the bounded curation page", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      items: [],
      total: 0,
      offset: 0,
      limit: 20,
    });
    await expect(
      getInternalCollectionCurationPage({
        collectionId: COLLECTION_ID,
        state: "approved",
        tagId: TAG_ID,
        offset: 0,
        limit: 20,
      }),
    ).resolves.toMatchObject({ items: [], total: 0 });
    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_get_collection_curation_page",
      {
        p_collection_id: COLLECTION_ID,
        p_state: "approved",
        p_offset: 0,
        p_limit: 20,
        p_tag_id: TAG_ID,
      },
    );
  });

  it("preserves several reviewed identities on one catalog model without a duplicate profile", async () => {
    const characters = [
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Zoro",
        franchise: "One Piece",
        evidenceOrigin: "manual_admin:reviewed",
        evidenceNote: "Confirmado na imagem",
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: "Sanji",
        franchise: "One Piece",
        evidenceOrigin: "manual_admin:reviewed",
        evidenceNote: null,
      },
    ];
    mocks.callAdminRpc.mockResolvedValue({
      items: [
        {
          modelId: MODEL_ID,
          slug: "cena-entre-personagens",
          state: "approved",
          evidenceOrigin: "manual_admin:collection",
          evidenceNote: null,
          characters,
          tags: [],
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
    });
    const page = await getInternalCollectionCurationPage({
      collectionId: COLLECTION_ID,
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].characters).toEqual(characters);
    expect(page.items[0]).not.toHaveProperty("characterIdentityId");
    expect(page.items[0]).not.toHaveProperty("identityVerified");
  });

  it("fails closed on duplicated or unreviewed character links", async () => {
    const character = {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Zoro",
      franchise: "One Piece",
      evidenceOrigin: "manual_admin:reviewed",
      evidenceNote: null,
    };
    const makeResponse = (characters: unknown[]) => ({
      items: [
        {
          modelId: MODEL_ID,
          slug: "cena-entre-personagens",
          state: "approved",
          evidenceOrigin: "manual_admin:collection",
          evidenceNote: null,
          characters,
          tags: [],
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
    });
    for (const characters of [
      [character, character],
      [{ ...character, id: "not-a-uuid" }],
      [{ ...character, evidenceOrigin: "automatic:image-guess" }],
      [{ ...character, name: "<script>" }],
      Array.from({ length: 13 }, (_, index) => ({
        ...character,
        id: "44444444-4444-4444-8444-" + (111111111111 + index),
      })),
    ]) {
      mocks.callAdminRpc.mockResolvedValueOnce(makeResponse(characters));
      await expect(
        getInternalCollectionCurationPage({
          collectionId: COLLECTION_ID,
        }),
      ).rejects.toThrow(/catalog_curation_/);
    }
  });

  it("unlinks only the explicitly confirmed identity from one model", async () => {
    const characterId = "44444444-4444-4444-8444-444444444444";
    mocks.callAdminRpc.mockResolvedValue({
      modelId: MODEL_ID,
      identityId: characterId,
      unlinked: true,
    });
    await expect(
      unlinkCatalogModelCharacterIdentity({
        model: { modelId: MODEL_ID, slug: "cena-entre-personagens" },
        characterId,
        reason: "Associação editorial atribuída ao personagem incorreto",
      }),
    ).resolves.toBeUndefined();
    expect(mocks.callAdminRpc).toHaveBeenCalledExactlyOnceWith(
      "admin_unlink_catalog_model_character",
      {
        p_model_id: MODEL_ID,
        p_model_slug: "cena-entre-personagens",
        p_character_identity_id: characterId,
        p_reason: "Associação editorial atribuída ao personagem incorreto",
      },
    );
  });

  it("rejects invalid unlink requests and mismatched deletion receipts", async () => {
    await expect(
      unlinkCatalogModelCharacterIdentity({
        model: { modelId: MODEL_ID, slug: "cena-entre-personagens" },
        characterId: "not-a-uuid",
        reason: "Personagem incorreto",
      }),
    ).rejects.toThrow("catalog_character_identity_unlink_invalid");
    await expect(
      unlinkCatalogModelCharacterIdentity({
        model: { modelId: MODEL_ID, slug: "cena-entre-personagens" },
        characterId: "44444444-4444-4444-8444-444444444444",
        reason: " ",
      }),
    ).rejects.toThrow("catalog_character_identity_unlink_invalid");
    await expect(
      unlinkCatalogModelCharacterIdentity({
        model: { modelId: MODEL_ID, slug: "cena-entre-personagens" },
        characterId: "44444444-4444-4444-8444-444444444444",
        reason: "Associação <não revisada>",
      }),
    ).rejects.toThrow("catalog_character_identity_unlink_invalid");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();

    const characterId = "44444444-4444-4444-8444-444444444444";
    for (const response of [
      { modelId: MODEL_ID, identityId: characterId, unlinked: false },
      {
        modelId: MODEL_ID,
        identityId: "55555555-5555-4555-8555-555555555555",
        unlinked: true,
      },
      { modelId: "wrong-id", identityId: characterId, unlinked: true },
    ]) {
      mocks.callAdminRpc.mockResolvedValueOnce(response);
      await expect(
        unlinkCatalogModelCharacterIdentity({
          model: { modelId: MODEL_ID, slug: "cena-entre-personagens" },
          characterId,
          reason: "Relação incorreta",
        }),
      ).rejects.toThrow("catalog_character_identity_unlink_result_invalid");
    }
  });

  it("stages a lossless and private many-to-many cutover with no second writer", () => {
    const migration = readFileSync(
      "supabase/migrations/20261117030000_tonart_curated_model_characters.sql",
      "utf8",
    ).replace(/\r\n/g, "\n");
    expect(migration.match(/^BEGIN;$/gm)).toHaveLength(1);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain(
      "CREATE TABLE public.catalog_curation_model_characters",
    );
    expect(migration).toContain(
      "PRIMARY KEY (catalog_model_id, character_identity_id)",
    );
    expect(migration).toContain("WHERE identity_verified = true");
    expect(migration).toContain("IF v_legacy <> v_links");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain(
      "FROM PUBLIC, anon, authenticated, service_role",
    );
    expect(migration).toContain("TO service_role;");
    expect(migration).toContain("DROP COLUMN character_identity_id");
    expect(migration).toContain("DROP COLUMN identity_verified");
    expect(migration).toContain(
      "ON CONFLICT (catalog_model_id, character_identity_id) DO UPDATE",
    );
    expect(migration).toContain("Maximum 12 verified characters per model");
    expect(migration).toContain("ON CONFLICT (identity_key) DO NOTHING");
    const sharedIdentityUpsert = migration
      .split("INSERT INTO public.catalog_character_identities (")[1]
      ?.split("-- The catalog model remains a single canonical reference.")[0];
    expect(sharedIdentityUpsert).toBeDefined();
    expect(sharedIdentityUpsert).not.toContain(
      "evidence_origin = EXCLUDED.evidence_origin",
    );
    expect(migration.match(/AS \$\$/g)).toHaveLength(4);
    expect(migration.match(/\$\$;/g)).toHaveLength(4);
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.admin_unlink_catalog_model_character",
    );
    expect(migration).toContain(
      "UPDATE public.catalog_curation_model_characters",
    );
    expect(migration).not.toContain(
      "DELETE FROM public.catalog_curation_model_characters",
    );
    expect(migration).toContain("unlinked_at timestamptz");
    expect(migration).toContain("unlink_reason text");
    expect(migration).toContain("review_history jsonb");
    expect(migration).toContain("jsonb_array_length(review_history) <= 100");
    expect(migration).toContain("'action', 'unlinked'");
    expect(migration).toContain("'action', 'restored'");
    expect(migration).toContain("AND cmc.unlinked_at IS NULL");
    expect(migration).toContain("AND unlinked_at IS NULL");
    expect(migration).toContain(
      "AND character_identity_id = p_character_identity_id",
    );
    expect(migration).toContain("GET DIAGNOSTICS v_updated = ROW_COUNT");
    expect(migration).toContain("p_reason text");
    expect(migration).toContain("p_reason, 'identity unlink reason', 1000");
    expect(migration).toContain("AND character_identity_id = p_character_identity_id");
    expect(migration).toContain("ON CONFLICT (catalog_model_id, character_identity_id) DO UPDATE");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.admin_unlink_catalog_model_character",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.admin_unlink_catalog_model_character",
    );
    expect(migration).toContain(
      "private_api.assert_tonart_curation_service_role()",
    );
    expect(migration).not.toContain(
      "CREATE POLICY catalog_curation_model_characters_public",
    );
    for (const rpc of [
      "admin_get_collection_curation_summary",
      "admin_get_collection_curation_page",
      "admin_verify_catalog_model_identity",
      "admin_unlink_catalog_model_character",
    ]) {
      expect(
        migration.split("CREATE OR REPLACE FUNCTION public." + rpc + "("),
      ).toHaveLength(2);
    }
  });

  it("reads only one bounded curation page and preserves evidence", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      items: [
        {
          modelId: MODEL_ID,
          slug: "modelo-real",
          state: "suggested",
          evidenceOrigin: "manual_admin:canonical_catalog_search",
          evidenceNote: "Revisar variante",
          characters: [],
          tags: [],
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
    });

    await expect(
      getInternalCollectionCurationPage({
        collectionId: COLLECTION_ID,
        state: "suggested",
        offset: 0,
        limit: 20,
      }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        {
          modelId: MODEL_ID,
          state: "suggested",
          evidenceOrigin: "manual_admin:canonical_catalog_search",
        },
      ],
    });

    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_get_collection_curation_page",
      {
        p_collection_id: COLLECTION_ID,
        p_state: "suggested",
        p_offset: 0,
        p_limit: 20,
        p_tag_id: null,
      },
    );
  });
});
