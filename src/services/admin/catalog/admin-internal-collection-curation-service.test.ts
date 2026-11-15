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
  ensureAdminInternalCollection,
  getInternalCollectionCurationPage,
  INTERNAL_COLLECTION_TEMPLATES,
  removeCatalogCurationTagAlias,
  saveCatalogModelClassifications,
  saveInternalCollectionCuration,
  verifyCatalogModelCharacterIdentity,
} from "./admin-internal-collection-curation-service";

const COLLECTION_ID = "11111111-1111-4111-8111-111111111111";
const MODEL_ID = "22222222-2222-4222-8222-222222222222";
const TAG_ID = "33333333-3333-4333-8333-333333333301";

describe("internal catalog curation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps both curation migrations atomic and the vocabulary RPC admin-only", () => {
    const paths = [
      "../../../../supabase/migrations/20261115154500_tonart_internal_collection_curation.sql",
      "../../../../supabase/migrations/20261115154600_tonart_curation_controlled_tag_creation.sql",
    ];
    const migrations = paths.map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
    for (const migration of migrations) {
      expect(migration.match(/^BEGIN;$/gm)).toHaveLength(1);
      expect(migration.match(/^COMMIT;$/gm)).toHaveLength(1);
      expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
      expect(migration).not.toContain("public.assert_admin_access");
      expect(migration).not.toContain("public.collections");
      expect(migration).not.toContain("public.collection_tier_assignments");
      const functions = [...migration.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\(/g)].map(
        (match) => match[1],
      );
      expect(new Set(functions).size).toBe(functions.length);
    }
    expect(migrations[0]).toContain("CREATE TABLE IF NOT EXISTS public.catalog_curation_tags");
    expect(migrations[0]).toContain("CREATE TABLE IF NOT EXISTS public.tonart_editorial_collections");
    expect(migrations[0]).toContain(
      "REVOKE ALL ON TABLE public.tonart_editorial_collections FROM PUBLIC, anon, authenticated",
    );
    expect(migrations[0]).toContain(
      "REVOKE ALL ON TABLE\\n  public.catalog_character_identities,",
    );
    expect(migrations[0]).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE\\n  public.catalog_character_identities,",
    );
    expect(migrations[0]).not.toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE");
    expect(migrations[0]).toContain("REFERENCES public.tonart_editorial_collections(id)");
    expect(migrations[0]).toContain("private_api.assert_tonart_curation_service_role()");
    expect(migrations[0]).toContain("public.is_tonecos_admin()");
    expect(migrations[0]).not.toContain("public.collections");
    expect(migrations[0]).not.toContain("public.collection_tier_assignments");
    expect(migrations[0]).not.toContain("public.assert_admin_access");
    expect(migrations[1]).toContain("CREATE OR REPLACE FUNCTION public.admin_create_catalog_curation_tag(");
    expect(migrations[1]).toContain("private_api.assert_tonart_curation_service_role()");
    expect(migrations[1]).toContain(
      "REVOKE ALL ON FUNCTION public.admin_create_catalog_curation_tag(text, text, text)",
    );
    expect(migrations[1]).toContain("FROM PUBLIC, anon, authenticated;");
    expect(migrations[1]).toContain(
      "GRANT EXECUTE ON FUNCTION public.admin_create_catalog_curation_tag(text, text, text)",
    );
    expect(migrations[1]).toContain("TO service_role;");
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
        { modelId: "44444444-4444-4444-8444-444444444444", slug: "modelo-real" },
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

  it("reads only one bounded curation page and preserves evidence", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      items: [
        {
          modelId: MODEL_ID,
          slug: "modelo-real",
          state: "suggested",
          evidenceOrigin: "manual_admin:canonical_catalog_search",
          evidenceNote: "Revisar variante",
          identityVerified: false,
          characterIdentityId: null,
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
