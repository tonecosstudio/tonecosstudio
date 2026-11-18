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
  getCatalogCharacterEditorialProfile,
  saveCatalogCharacterEditorialProfile,
  setCatalogCharacterPublicationApproval,
  type CatalogCharacterEditorialProfile,
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
const CHARACTER_ID = "44444444-4444-4444-8444-444444444444";
const publicationPending = {
  activeModelLinks: [],
  relationRevision: 0,
  approvedRelationRevision: null,
  publicationStatus: "not_approved",
  publicationRevision: null,
  publicationApprovalRef: null,
  publicationApprovedAt: null,
  publicationApprovedBy: null,
  publicationHistory: [],
};

const verifiedEditorialProfile = {
  slug: "sample-character",
  aliases: [
    {
      name: "Sample Hero",
      sources: [
        {
          title: "Official profile",
          url: "https://example.org/hero",
          kind: "official",
        },
      ],
    },
  ],
  biography: "Biografia original sustentada por fonte oficial.",
  biographySources: [
    {
      title: "Official biography",
      url: "https://example.org/biography",
      kind: "official",
    },
  ],
  ageContext: null,
  ageSources: [],
  originWork: "Sample Origins",
  originWorkSources: [
    {
      title: "Publisher page",
      url: "https://example.org/origin",
      kind: "publisher",
    },
  ],
  characteristics: [
    {
      name: "Uses a shield",
      sources: [
        {
          title: "Publisher reference",
          url: "https://example.org/shield",
          kind: "publisher",
        },
      ],
    },
  ],
  nameSources: [
    {
      title: "Official profile",
      url: "https://example.org/name",
      kind: "official",
    },
  ],
  franchiseSources: [
    {
      title: "Official universe",
      url: "https://example.org/universe",
      kind: "official",
    },
  ],
} satisfies CatalogCharacterEditorialProfile;

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
    expect(gateway).toContain("p_reviewer_id: admin.userId");
    expect(gateway).toContain("p_approver_id: admin.userId");
    expect(gateway).toContain("status: 409");
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
      "admin_get_catalog_character_editorial_profile",
      "admin_save_catalog_character_editorial_profile",
      "admin_set_catalog_character_publication_approval",
    ]) {
      expect(allowed).toContain(name);
      expect(userContext).not.toContain(name);
    }
  });

  it("keeps curation migrations atomic and character profile RPCs private", () => {
    const paths = [
      "../../../../supabase/migrations/20261115154500_tonart_internal_collection_curation.sql",
      "../../../../supabase/migrations/20261115154600_tonart_curation_controlled_tag_creation.sql",
      "../../../../supabase/migrations/20261117040000_tonart_character_editorial_profiles.sql",
      "../../../../supabase/migrations/20261118010000_tonart_public_character_approval_and_export.sql",
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
    expect(migrations[2]).toContain(
      "ALTER TABLE public.catalog_character_identities",
    );
    expect(migrations[2]).toContain(
      "CREATE OR REPLACE FUNCTION public.admin_get_catalog_character_editorial_profile(",
    );
    expect(migrations[2]).toContain(
      "CREATE OR REPLACE FUNCTION public.admin_save_catalog_character_editorial_profile(",
    );
    expect(migrations[2]).toContain("editorial_profile_history");
    expect(migrations[2]).toContain("p_expected_revision integer");
    expect(migrations[2]).toContain("changed; reload before saving");
    expect(migrations[2]).toContain(
      "private_api.assert_tonart_curation_service_role()",
    );
    expect(migrations[2]).toContain("FROM PUBLIC, anon, authenticated;");
    expect(migrations[2]).toContain("TO service_role;");
    expect(migrations[2]).not.toContain(
      "catalog_character_editorial_profiles (",
    );
    expect(migrations[2]).not.toContain("api/editorial/v1");
    expect(migrations[3]).toContain("editorial_publication_status");
    expect(migrations[3]).toContain("invalidated_by_profile_change");
    expect(migrations[3]).toContain(
      "admin_set_catalog_character_publication_approval(uuid, integer, integer, boolean, uuid)",
    );
    expect(migrations[3]).toContain(
      "admin_export_approved_catalog_character_projection()",
    );
    expect(migrations[3]).toContain(
      "Every active model link needs its own HTTPS source",
    );
    expect(migrations[3]).toContain(
      "Every approved character needs at least one active model link",
    );
    expect(migrations[3]).toContain(
      "invalidated_by_model_relation_change",
    );
    expect(migrations[3]).toContain(
      "Approved character has no active model link",
    );
    expect(migrations[3]).toContain(
      "editorial_publication_revision = ci.editorial_profile_revision",
    );
    expect(migrations[3]).toContain("FROM PUBLIC, anon, authenticated;");
    const acceptance = readFileSync(
      "supabase/tests/tonart_curated_model_characters_acceptance.sql",
      "utf8",
    );
    expect(acceptance).toContain(
      "TONART acceptance requires explicit isolated staging session",
    );
    expect(acceptance).toContain("Fictitious staging-only biography.");
    expect(acceptance).toContain(
      "Stale editorial profile revision was accepted",
    );
    expect(acceptance).toContain(
      "Duplicate reviewed character route slug was accepted",
    );
    expect(acceptance).toContain(
      "Public approval accepted a reviewed identity without model links",
    );
    expect(acceptance).toContain(
      "Final model unlink failed to revoke publication",
    );
    expect(acceptance.trimEnd().endsWith("ROLLBACK;")).toBe(true);
  });

  it("loads a private character profile with its evidence and review state", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      identityId: CHARACTER_ID,
      name: "Sample Character",
      franchise: "Sample Universe",
      profile: verifiedEditorialProfile,
      status: "reviewed",
      revision: 3,
      reviewedAt: "2026-11-17T10:00:00.000Z",
      reviewedBy: "55555555-5555-4555-8555-555555555555",
      history: [],
      ...publicationPending,
    });

    await expect(
      getCatalogCharacterEditorialProfile(CHARACTER_ID),
    ).resolves.toMatchObject({
      identityId: CHARACTER_ID,
      status: "reviewed",
      revision: 3,
      profile: { slug: "sample-character", aliases: [{ name: "Sample Hero" }] },
    });
    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_get_catalog_character_editorial_profile",
      { p_identity_id: CHARACTER_ID },
    );
  });

  it("requires claim-level HTTPS evidence before reviewing a character profile", async () => {
    await expect(
      saveCatalogCharacterEditorialProfile({
        identityId: CHARACTER_ID,
        profile: { ...verifiedEditorialProfile, biographySources: [] },
        status: "reviewed",
        expectedRevision: 0,
      }),
    ).rejects.toThrow("catalog_character_editorial_review_evidence_required");
    await expect(
      saveCatalogCharacterEditorialProfile({
        identityId: CHARACTER_ID,
        profile: {
          ...verifiedEditorialProfile,
          biographySources: [
            {
              title: "Not HTTPS",
              url: "http://example.org/biography",
              kind: "official",
            },
          ],
        },
        status: "reviewed",
        expectedRevision: 0,
      }),
    ).rejects.toThrow("catalog_character_editorial_profile_invalid");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("rejects invalid profile revisions before calling the database", async () => {
    await expect(
      saveCatalogCharacterEditorialProfile({
        identityId: CHARACTER_ID,
        profile: verifiedEditorialProfile,
        status: "reviewed",
        expectedRevision: -1,
      }),
    ).rejects.toThrow("catalog_character_editorial_profile_invalid");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("saves reviewed profiles through the existing private admin RPC gateway", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      identityId: CHARACTER_ID,
      name: "Sample Character",
      franchise: "Sample Universe",
      profile: verifiedEditorialProfile,
      status: "reviewed",
      revision: 1,
      reviewedAt: "2026-11-17T10:00:00.000Z",
      reviewedBy: "55555555-5555-4555-8555-555555555555",
      ...publicationPending,
    });

    await expect(
      saveCatalogCharacterEditorialProfile({
        identityId: CHARACTER_ID,
        profile: verifiedEditorialProfile,
        status: "reviewed",
        expectedRevision: 0,
      }),
    ).resolves.toMatchObject({
      identityId: CHARACTER_ID,
      status: "reviewed",
      revision: 1,
      ...publicationPending,
    });
    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_save_catalog_character_editorial_profile",
      {
        p_identity_id: CHARACTER_ID,
        p_profile: verifiedEditorialProfile,
        p_status: "reviewed",
        p_expected_revision: 0,
      },
    );
  });

  it("approves and revokes only the exact reviewed profile revision", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      identityId: CHARACTER_ID,
      name: "Sample Character",
      franchise: "Sample Universe",
      profile: verifiedEditorialProfile,
      status: "reviewed",
      revision: 3,
      reviewedAt: "2026-11-17T10:00:00.000Z",
      reviewedBy: "55555555-5555-4555-8555-555555555555",
      publicationStatus: "approved",
      publicationRevision: 3,
      relationRevision: 7,
      approvedRelationRevision: 7,
      activeModelLinks: [{
        modelId: MODEL_ID,
        modelSlug: "modelo-real",
        evidenceUrl: "https://example.org/model-review",
        evidenceTitle: "Publicação revisada",
      }],
      publicationApprovalRef: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      publicationApprovedAt: "2026-11-18T10:00:00.000Z",
      publicationApprovedBy: "66666666-6666-4666-8666-666666666666",
      publicationHistory: [{ action: "approved" }],
    });
    await expect(
      setCatalogCharacterPublicationApproval({
        identityId: CHARACTER_ID,
        expectedRevision: 3,
        expectedRelationRevision: 7,
        approved: true,
      }),
    ).resolves.toMatchObject({
      publicationStatus: "approved",
      publicationRevision: 3,
      relationRevision: 7,
      approvedRelationRevision: 7,
    });
    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_set_catalog_character_publication_approval",
      {
        p_identity_id: CHARACTER_ID,
        p_expected_revision: 3,
        p_expected_relation_revision: 7,
        p_approved: true,
      },
    );
  });

  it("rejects malformed publication approvals before calling the gateway", async () => {
    await expect(
      setCatalogCharacterPublicationApproval({
        identityId: CHARACTER_ID,
        expectedRevision: -1,
        expectedRelationRevision: 7,
        approved: true,
      }),
    ).rejects.toThrow("catalog_character_publication_approval_invalid");
    await expect(
      setCatalogCharacterPublicationApproval({
        identityId: CHARACTER_ID,
        expectedRevision: 3,
        expectedRelationRevision: -1,
        approved: true,
      }),
    ).rejects.toThrow("catalog_character_publication_approval_invalid");
    mocks.callAdminRpc.mockResolvedValue({
      identityId: CHARACTER_ID,
      name: "Sample Character",
      franchise: "Sample Universe",
      profile: verifiedEditorialProfile,
      status: "reviewed",
      revision: 3,
      reviewedAt: "2026-11-17T10:00:00.000Z",
      reviewedBy: "55555555-5555-4555-8555-555555555555",
      ...publicationPending,
    });
    await expect(
      setCatalogCharacterPublicationApproval({
        identityId: CHARACTER_ID,
        expectedRevision: 3,
        expectedRelationRevision: 7,
        approved: true,
      }),
    ).rejects.toThrow("catalog_character_publication_approval_result_invalid");
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

  it("requires and preserves a real HTTPS citation for each model-character link", async () => {
    const model = { modelId: MODEL_ID, slug: "modelo-real" };
    for (const evidence of [
      {
        evidenceOrigin: "http://publisher.example/figure",
        evidenceNote: "Publisher page",
      },
      { evidenceOrigin: "https://publisher.example/figure", evidenceNote: " " },
    ]) {
      await expect(
        verifyCatalogModelCharacterIdentity({
          model,
          characterName: "Personagem confirmado",
          franchise: "Universo confirmado",
          ...evidence,
        }),
      ).rejects.toThrow("catalog_character_identity_verification_invalid");
    }
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();

    mocks.callAdminRpc.mockResolvedValue({
      modelId: MODEL_ID,
      identityId: CHARACTER_ID,
      verified: true,
    });
    await expect(
      verifyCatalogModelCharacterIdentity({
        model,
        characterName: "Personagem confirmado",
        franchise: "Universo confirmado",
        evidenceOrigin: "https://publisher.example/figure",
        evidenceNote: "Página oficial associa a peça ao personagem.",
      }),
    ).resolves.toBe(CHARACTER_ID);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_verify_catalog_model_identity",
      {
        p_model_id: MODEL_ID,
        p_model_slug: "modelo-real",
        p_character_name: "Personagem confirmado",
        p_franchise: "Universo confirmado",
        p_evidence_origin: "https://publisher.example/figure",
        p_evidence_note: "Página oficial associa a peça ao personagem.",
      },
    );
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
          inactiveCharacters: [],
          inactiveCharacterCount: 0,
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

  it("accepts 21 distinct reviewed characters on one canonical model", async () => {
    const characters = Array.from({ length: 21 }, (_, index) => ({
      id: "44444444-4444-4444-8444-" + (111111111111 + index),
      name: "Character " + (index + 1),
      franchise: "One Piece",
      evidenceOrigin: "manual_admin:reviewed",
      evidenceNote: null,
    }));
    mocks.callAdminRpc.mockResolvedValue({
      items: [
        {
          modelId: MODEL_ID,
          slug: "cena-entre-personagens",
          state: "approved",
          evidenceOrigin: "manual_admin:collection",
          evidenceNote: null,
          characters,
          inactiveCharacters: [],
          inactiveCharacterCount: 0,
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
    expect(
      new Set(page.items[0].characters.map((person) => person.id)).size,
    ).toBe(21);
  });

  it("does not impose a fixed per-statue cast size across the curation layers", () => {
    const service = readFileSync(
      "src/services/admin/catalog/admin-internal-collection-curation-service.ts",
      "utf8",
    );
    const ui = readFileSync(
      "src/components/admin/collections/InternalCollectionCuration.tsx",
      "utf8",
    );
    const migration = readFileSync(
      "supabase/migrations/20261117030000_tonart_curated_model_characters.sql",
      "utf8",
    );
    const acceptance = readFileSync(
      "supabase/tests/tonart_curated_model_characters_acceptance.sql",
      "utf8",
    );
    expect(service).not.toContain("row.characters.length > 12");
    expect(ui).not.toContain("item.characters.length < 12");
    expect(migration).not.toContain("Maximum 12 verified characters per model");
    expect(acceptance).toContain("Expected 21 active character links");
    expect(acceptance).toContain(
      "jsonb_array_length(v_member->'characters') <> 21",
    );
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
          inactiveCharacters: [],
          inactiveCharacterCount: 0,
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
    ]) {
      mocks.callAdminRpc.mockResolvedValueOnce(makeResponse(characters));
      await expect(
        getInternalCollectionCurationPage({
          collectionId: COLLECTION_ID,
        }),
      ).rejects.toThrow(/catalog_curation_/);
    }
  });

  it("returns private bounded inactive links for editorial review without treating them as verified", async () => {
    const inactiveCharacter = {
      id: "66666666-6666-4666-8666-666666666666",
      name: "Nami",
      franchise: "One Piece",
      evidenceOrigin: "manual_admin:reviewed",
      evidenceNote: null,
      unlinkedAt: "2026-11-17T04:00:00+00:00",
      unlinkReason: "Estatueta revisada; personagem não está presente",
      reviewCount: 3,
    };
    mocks.callAdminRpc.mockResolvedValue({
      items: [
        {
          modelId: MODEL_ID,
          slug: "cena-entre-personagens",
          state: "approved",
          evidenceOrigin: "manual_admin:collection",
          evidenceNote: null,
          characters: [],
          inactiveCharacters: [inactiveCharacter],
          inactiveCharacterCount: 5,
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
    expect(page.items[0].characters).toEqual([]);
    expect(page.items[0].inactiveCharacters).toEqual([inactiveCharacter]);
    expect(page.items[0].inactiveCharacterCount).toBe(5);
  });

  it("fails closed on duplicate active/archived identities and untrusted archive evidence", async () => {
    const character = {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Zoro",
      franchise: "One Piece",
      evidenceOrigin: "manual_admin:reviewed",
      evidenceNote: null,
    };
    const inactive = {
      ...character,
      unlinkedAt: "2026-11-17T04:00:00+00:00",
      unlinkReason: "Associação incorreta",
      reviewCount: 1,
    };
    const response = (
      inactiveCharacters: unknown[],
      count: unknown,
      characters: unknown[] = [],
    ) => ({
      items: [
        {
          modelId: MODEL_ID,
          slug: "cena-entre-personagens",
          state: "approved",
          evidenceOrigin: "manual_admin:collection",
          evidenceNote: null,
          characters,
          inactiveCharacters,
          inactiveCharacterCount: count,
          tags: [],
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
    });
    for (const payload of [
      response([inactive], 1, [character]),
      response([inactive, inactive], 2),
      response([{ ...inactive, unlinkedAt: "not-a-date" }], 1),
      response([{ ...inactive, unlinkReason: "<script>" }], 1),
      response([{ ...inactive, reviewCount: 101 }], 1),
      response([inactive], 0),
      response(
        Array.from({ length: 13 }, (_, index) => ({
          ...inactive,
          id: "44444444-4444-4444-8444-" + (111111111111 + index),
        })),
        13,
      ),
    ]) {
      mocks.callAdminRpc.mockResolvedValueOnce(payload);
      await expect(
        getInternalCollectionCurationPage({ collectionId: COLLECTION_ID }),
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
    expect(migration).not.toContain("Maximum 12 verified characters per model");
    expect(migration).not.toContain(") >= 12 THEN");
    expect(migration).toContain("ON CONFLICT (identity_key) DO NOTHING");
    const sharedIdentityUpsert = migration
      .split("INSERT INTO public.catalog_character_identities (")[1]
      ?.split("-- The catalog model remains a single canonical reference.")[0];
    expect(sharedIdentityUpsert).toBeDefined();
    expect(sharedIdentityUpsert).not.toContain(
      "evidence_origin = EXCLUDED.evidence_origin",
    );
    const linkUpsert = migration
      .split("INSERT INTO public.catalog_curation_model_characters (")[2]
      ?.split("RETURN jsonb_build_object(")[0];
    expect(linkUpsert).toBeDefined();
    expect(linkUpsert).toContain(
      "ON CONFLICT (catalog_model_id, character_identity_id) DO UPDATE",
    );
    expect(linkUpsert).not.toContain(
      "evidence_origin = EXCLUDED.evidence_origin",
    );
    expect(linkUpsert).not.toContain("evidence_note = EXCLUDED.evidence_note");
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
    expect(migration).toContain("'note', EXCLUDED.evidence_note");
    expect(migration).toContain(
      "WHERE public.catalog_curation_model_characters.unlinked_at IS NOT NULL",
    );
    expect(migration).toContain("AND cmc.unlinked_at IS NULL");
    expect(migration).toContain("'inactiveCharacters', COALESCE((");
    expect(migration).toContain("'inactiveCharacterCount', (");
    expect(migration).toContain(
      "idx_catalog_curation_model_characters_archived",
    );
    expect(migration).toContain("'unlinkReason', archived.unlink_reason");
    expect(migration).toContain(
      "'reviewCount', jsonb_array_length(archived.review_history)",
    );
    expect(migration).toContain("LIMIT 12");
    expect(migration).toContain("AND cmc.unlinked_at IS NOT NULL");
    expect(migration).toContain("AND unlinked_at IS NULL");
    expect(migration).toContain(
      "AND character_identity_id = p_character_identity_id",
    );
    expect(migration).toContain("GET DIAGNOSTICS v_updated = ROW_COUNT");
    expect(migration).toContain("p_reason text");
    expect(migration).toContain("p_reason, 'identity unlink reason', 1000");
    expect(migration).toContain(
      "AND character_identity_id = p_character_identity_id",
    );
    expect(migration).toContain(
      "ON CONFLICT (catalog_model_id, character_identity_id) DO UPDATE",
    );
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

  it("locks legacy writers and rejects unreviewed dependencies before the destructive cutover", () => {
    const migration = readFileSync(
      "supabase/migrations/20261117030000_tonart_curated_model_characters.sql",
      "utf8",
    ).replace(/\r\n/g, "\n");
    const lockPosition = migration.indexOf(
      "LOCK TABLE public.catalog_curation_model_profiles IN SHARE ROW EXCLUSIVE MODE",
    );
    const backfillPosition = migration.indexOf(
      "INSERT INTO public.catalog_curation_model_characters (",
    );
    const dropPosition = migration.indexOf("DROP COLUMN character_identity_id");
    expect(migration).toContain("SET LOCAL lock_timeout = '15s'");
    expect(lockPosition).toBeGreaterThan(0);
    expect(backfillPosition).toBeGreaterThan(lockPosition);
    expect(dropPosition).toBeGreaterThan(backfillPosition);
    expect(migration).toContain("DO $cutover_preflight$");
    expect(migration).toContain(
      "Unexpected dependent curation function: cutover blocked",
    );
    for (const rpc of [
      "admin_get_collection_curation_summary(uuid)",
      "admin_get_collection_curation_page(uuid,text,integer,integer,uuid)",
      "admin_verify_catalog_model_identity(text,text,text,text,text,text)",
    ]) {
      expect(migration).toContain("to_regprocedure('public." + rpc + "')");
    }
    expect(migration).not.toContain(
      "LOCK TABLE public.catalog_curation_model_profiles IN ACCESS EXCLUSIVE MODE",
    );
  });

  it("grants each private migration RPC with its exact PostgreSQL definition signature", () => {
    const migration = readFileSync(
      "supabase/migrations/20261117030000_tonart_curated_model_characters.sql",
      "utf8",
    ).replace(/\r\n/g, "\n");
    const declared = new Map(
      [
        ...migration.matchAll(
          /CREATE OR REPLACE FUNCTION public\.(\w+)\(([\s\S]*?)\)\s*RETURNS\s/g,
        ),
      ].map((match) => [
        match[1],
        match[2]
          .split(",")
          .map((argument) => argument.trim().split(/\s+/)[1])
          .join(","),
      ]),
    );
    expect(declared.size).toBe(4);
    const access = [
      ...migration.matchAll(
        /(?:GRANT EXECUTE|REVOKE ALL) ON FUNCTION public\.(\w+)\(([^)]*)\)/g,
      ),
    ];
    expect(access).toHaveLength(8);
    for (const [, name, signature] of access) {
      expect(declared.has(name)).toBe(true);
      expect(
        signature
          .split(",")
          .map((type) => type.trim())
          .join(","),
      ).toBe(declared.get(name));
    }
  });

  it("retains one canonical relation revision for every editorial publication", () => {
    const migration = readFileSync(
      "supabase/migrations/20261118010000_tonart_public_character_approval_and_export.sql",
      "utf8",
    ).replace(/\r\n/g, "\n");
    const acceptance = readFileSync(
      "supabase/tests/tonart_curated_model_characters_acceptance.sql",
      "utf8",
    ).replace(/\r\n/g, "\n");

    expect(migration).toContain(
      "editorial_relation_revision integer NOT NULL DEFAULT 0",
    );
    expect(migration).toContain(
      "editorial_publication_relation_revision = editorial_relation_revision",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION private_api.bump_tonart_character_relation_revision(",
    );
    expect(migration).toContain(
      "trg_catalog_character_publication_relation_revision",
    );
    expect(migration).toContain(
      "AFTER INSERT OR UPDATE OR DELETE ON public.catalog_curation_model_characters",
    );
    expect(migration).toContain(
      "trg_catalog_character_publication_model_slug_revision",
    );
    expect(migration).toContain(
      "private_api.tonart_character_active_link_snapshot",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION private_api.tonart_public_https_evidence_url(",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION private_api.tonart_editorial_sources_public_https(",
    );
    expect(migration.match(
      /NOT private_api\.tonart_public_https_evidence_url\(relation\.evidence_origin\)/g,
    )).toHaveLength(2);
    expect(migration.match(
      /IF NOT private_api\.tonart_editorial_sources_public_https\(v_profile\) THEN/g,
    )).toHaveLength(2);
    expect(acceptance).toContain(
      "Private or malformed editorial evidence URL was accepted",
    );
    expect(acceptance).toContain(
      "Profile or nested claim bypassed the public source validator",
    );

    expect(migration).toContain(
      "'activeModelLinks', private_api.tonart_character_active_link_snapshot(v_identity.id)",
    );
    expect(migration).toContain("OLD.review_history IS NOT DISTINCT FROM NEW.review_history");
    expect(migration).toContain("'invalidated_by_model_relation_change'");
    expect(migration).toContain(
      "editorial_publication_relation_revision = v_identity.editorial_relation_revision",
    );
    expect(migration).toContain(
      "ci.editorial_publication_relation_revision = ci.editorial_relation_revision",
    );
    expect(migration).toContain("'approvedRelationRevision'");
    expect(migration).toContain("FOR SHARE OF ci");
    expect(migration).not.toContain(
      "trg_catalog_character_publication_invalidated_by_last_model_unlink",
    );
    expect(migration).not.toContain("CREATE TABLE public.catalog_character_publications");

    expect(acceptance).toContain(
      "Partial model unlink failed to revoke the entire approved relation set",
    );
    expect(acceptance).toContain(
      "Model evidence replacement did not invalidate old approval",
    );
    expect(acceptance).toContain(
      "New model link remained covered by previous approval",
    );
    expect(acceptance).toContain(
      "Canonical model slug change failed to invalidate publication",
    );
    expect(acceptance).toContain(
      "Idempotent relation write invalidated an unchanged approval",
    );
  });

  it("keeps the PostgreSQL acceptance run staging-gated, transaction-scoped and reversible", () => {
    const acceptance = readFileSync(
      "supabase/tests/tonart_curated_model_characters_acceptance.sql",
      "utf8",
    ).replace(/\r\n/g, "\n");
    expect(acceptance.match(/^BEGIN;$/gm)).toHaveLength(1);
    expect(acceptance.match(/^ROLLBACK;$/gm)).toHaveLength(1);
    expect(acceptance).not.toMatch(/^COMMIT;$/gm);
    expect(acceptance).toContain(
      "current_setting('tonart.curation_acceptance_stage', true)",
    );
    expect(acceptance).toContain("IS DISTINCT FROM 'staging'");
    expect(acceptance).toContain("SET LOCAL request.jwt.claims");
    expect(acceptance).toContain("public.admin_verify_catalog_model_identity(");
    expect(acceptance).toContain(
      "public.admin_unlink_catalog_model_character(",
    );
    expect(acceptance).toContain(
      "public.admin_set_catalog_character_publication_approval(",
    );
    expect(acceptance).toContain(
      "public.admin_export_approved_catalog_character_projection()",
    );
    expect(acceptance).toContain(
      "Publication approved without source-backed model links",
    );
    expect(acceptance).toContain(
      "Profile change failed to invalidate the prior public approval",
    );
    expect(acceptance).toContain("public.admin_ensure_internal_collection(");
    expect(acceptance).toContain(
      "public.admin_upsert_collection_curation_models(",
    );
    expect(acceptance).toContain("public.admin_get_collection_curation_page(");
    expect(acceptance).toContain(
      "public.admin_get_collection_curation_summary(",
    );
    expect(acceptance).toContain(
      "Private page/summary failed to keep inactive links separate",
    );
    expect(acceptance).toContain(
      "Private page/summary failed to reflect restored character",
    );
    expect(acceptance).toContain("has_function_privilege('authenticated'");
    expect(acceptance).toContain("Expected 21 active character links");
    expect(acceptance).toContain(
      "Twenty-first verified character was rejected",
    );
    expect(acceptance).toContain(
      "Editorial function accepted non-service JWT claims",
    );
    expect(acceptance).toContain("Unreviewed automatic identity was accepted");
    expect(acceptance).toContain("Blank unlink explanation was accepted");
    expect(acceptance).toContain(
      "Mismatched model slug was allowed to unlink a character",
    );
    expect(acceptance).toContain(
      "Unbounded character audit history was accepted",
    );
    expect(acceptance).toContain(
      "History overflow attempt corrupted existing decisions",
    );
  });

  it("keeps biography optional from human review through the public export", () => {
    const publicationMigration = readFileSync(
      "supabase/migrations/20261118010000_tonart_public_character_approval_and_export.sql",
      "utf8",
    ).replace(/\r\n/g, "\n");
    const acceptance = readFileSync(
      "supabase/tests/tonart_curated_model_characters_acceptance.sql",
      "utf8",
    ).replace(/\r\n/g, "\n");
    const isolatedAcceptance = readFileSync(
      "supabase/tests/tonart_character_approval_ephemeral_postgres.sql",
      "utf8",
    ).replace(/\r\n/g, "\n");

    expect(publicationMigration.match(
      /NULLIF\(btrim\(v_profile ->> 'biography'\), ''\) IS NOT NULL AND NOT EXISTS/g,
    )).toHaveLength(2);
    expect(publicationMigration.match(
      /NULLIF\(btrim\(v_profile ->> 'biography'\), ''\) IS NULL\s+AND jsonb_array_length\(v_profile -> 'biographySources'\) > 0/g,
    )).toHaveLength(2);
    expect(acceptance).toContain(
      "Optional biography was not exported without invented evidence",
    );
    expect(isolatedAcceptance).toContain(
      "Approved export fabricated evidence for an optional biography",
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
          characters: [],
          inactiveCharacters: [],
          inactiveCharacterCount: 0,
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
