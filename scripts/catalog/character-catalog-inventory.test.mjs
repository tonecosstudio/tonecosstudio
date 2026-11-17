import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCharacterReviewInventory,
  fetchPublishedCatalogModels,
  mergeCandidateAndPublicModels,
  reconcileCandidateContract,
  serializeReviewQueueCsv,
} from "./character-catalog-inventory.mjs";

const row = (overrides = {}) => ({
  id: "model-1",
  slug: "character-model",
  code: "TC-001",
  name: "Hero Figure",
  variant_name: "Standard",
  category: "Anime",
  category_slug: "anime",
  franchise: "Series",
  franchise_slug: "series",
  collection: null,
  folder_path: null,
  ...overrides,
});

const response = (payload) => Response.json(payload);

test("paginates the public catalog and creates review slots without inventing identities", async () => {
  const requests = [];
  const fetcher = async (input) => {
    const url = new URL(input);
    requests.push(url);
    if (!url.searchParams.has("cursor")) {
      return response({ items: [row()], nextCursor: "page-2" });
    }
    return response({
      items: [row({ id: "model-2", slug: "second-model", name: "Second Figure" })],
      nextCursor: null,
    });
  };

  const result = await fetchPublishedCatalogModels({
    baseUrl: "https://catalog.example.test/catalogo-api/",
    fetcher,
    pageDelayMs: 0,
  });
  const inventory = buildCharacterReviewInventory({
    ...result,
    capturedAt: "2026-11-17T00:00:00.000Z",
  });

  assert.equal(result.pages, 2);
  assert.equal(result.models.length, 2);
  assert.equal(requests[0].searchParams.get("limit"), "60");
  assert.equal(requests[1].searchParams.get("cursor"), "page-2");
  assert.equal(inventory.recordCount, 2);
  assert.equal(inventory.policy.verifiedCharacterLinks, 0);
  assert.equal(inventory.policy.biographyDrafts, 0);
  assert.equal(inventory.models[0].characterReview.status, "pending_evidence");
  assert.equal(inventory.models[0].characterReview.characterId, null);
  assert.deepEqual(inventory.models[0].characterReview.evidence, []);
  assert.equal(inventory.models[0].biographyReview.status, "not_started_identity_unverified");
});

test("rejects an insecure catalog base before making requests", async () => {
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "http://catalog.example.test/",
      fetcher: async () => { throw new Error("must not fetch"); },
    }),
    /invalid_catalog_api_base/,
  );
});

test("rejects repeated cursors", async () => {
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => response({ items: [row()], nextCursor: "same" }),
      pageDelayMs: 0,
    }),
    /catalog_page_cursor_invalid/,
  );
});

test("rejects a cursor cycle that revisits an earlier page", async () => {
  let calls = 0;
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => {
        calls += 1;
        const nextCursor = ["page-a", "page-b", "page-a"][calls - 1] ?? null;
        return response({
          items: [row({ id: `model-${calls}`, slug: `model-${calls}` })],
          nextCursor,
        });
      },
      pageDelayMs: 0,
    }),
    /catalog_page_cursor_repeated/,
  );
});

test("rejects duplicate IDs across pages", async () => {
  let calls = 0;
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => {
        calls += 1;
        return calls === 1
          ? response({ items: [row()], nextCursor: "next" })
          : response({ items: [row()], nextCursor: null });
      },
      pageDelayMs: 0,
    }),
    /duplicate_catalog_model_id/,
  );
});

test("rejects duplicate slugs across pages even when IDs differ", async () => {
  let calls = 0;
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => {
        calls += 1;
        return calls === 1
          ? response({ items: [row()], nextCursor: "next" })
          : response({
            items: [row({ id: "model-2", name: "Second figure" })],
            nextCursor: null,
          });
      },
      pageDelayMs: 0,
    }),
    /duplicate_catalog_model_slug/,
  );
});

test("rejects incomplete responses and invalid rows", async () => {
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => response({ items: [{ id: "missing-fields" }], nextCursor: null }),
    }),
    /invalid_catalog_slug_at_row_1/,
  );
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => response({ items: "not-an-array", nextCursor: null }),
    }),
    /catalog_page_items_invalid/,
  );
});

test("reconciles candidate and live model IDs without treating either as identity evidence", () => {
  const result = reconcileCandidateContract({
    modelTotal: 2,
    models: [
      {
        id: "model-1",
        slug: "changed-slug",
        code: "TC-001",
        displayName: "Model One",
        variantName: null,
        categoryName: "Anime",
        categorySlug: "anime",
        franchiseName: "Series",
        franchiseSlug: "series",
        published: true,
      },
      {
        id: "candidate-only",
        slug: "candidate-only",
        code: "TC-002",
        displayName: "Candidate Only",
        variantName: null,
        categoryName: "Games",
        categorySlug: "games",
        franchiseName: "Series",
        franchiseSlug: "series",
        published: false,
      },
    ],
  }, [
    { id: "model-1", slug: "character-model" },
    { id: "public-only", slug: "public-only" },
  ]);

  assert.equal(result.matchingIds, 1);
  assert.deepEqual(result.candidateOnlyIds, ["candidate-only"]);
  assert.deepEqual(result.publicOnlyIds, ["public-only"]);
  assert.deepEqual(result.slugMismatches, [{
    id: "model-1",
    candidateSlug: "changed-slug",
    publicSlug: "character-model",
  }]);
  assert.match(result.note, /no character identity/);
});

test("merges candidate and published inventories once per ID and preserves provenance", () => {
  const candidate = {
    modelTotal: 2,
    models: [
      {
        id: "model-1",
        slug: "candidate-slug",
        code: "TC-001",
        displayName: "Candidate Name",
        variantName: "Candidate Variant",
        categoryName: "Candidate Category",
        categorySlug: "candidate-category",
        franchiseName: "Candidate Franchise",
        franchiseSlug: "candidate-franchise",
        published: 1,
      },
      {
        id: "candidate-only",
        slug: "candidate-only",
        code: "TC-002",
        displayName: "Candidate Only",
        variantName: null,
        categoryName: "Games",
        categorySlug: "games",
        franchiseName: "Series",
        franchiseSlug: "series",
        folderPath: ["Candidate", "Folder"],
        published: 0,
      },
    ],
  };
  const live = [
    {
      id: "model-1",
      slug: "public-slug",
      code: "TC-001",
      name: "Public Name",
      variantName: "Public Variant",
      category: "Anime",
      categorySlug: "anime",
      franchise: "Series",
      franchiseSlug: "series",
      collection: null,
      folderPath: null,
    },
    {
      id: "public-only",
      slug: "public-only",
      code: "TC-003",
      name: "Public Only",
      variantName: "",
      category: "Games",
      categorySlug: "games",
      franchise: "Series",
      franchiseSlug: "series",
      collection: null,
      folderPath: null,
    },
  ];
  const merged = mergeCandidateAndPublicModels(candidate, live);
  const inventory = buildCharacterReviewInventory({
    models: merged,
    source: "https://catalog.example.test/api/catalog",
    capturedAt: "2026-11-17T00:00:00.000Z",
  });

  assert.equal(merged.length, 3);
  assert.equal(merged[0].sourceStatus, "candidate_and_published");
  assert.equal(merged[0].name, "Public Name");
  assert.equal(merged[0].candidateContract.slug, "candidate-slug");
  assert.equal(merged[0].candidateContract.published, true);
  assert.equal(merged[0].publicCatalog.slug, "public-slug");
  assert.equal(merged[1].sourceStatus, "candidate_only");
  assert.equal(merged[1].folderPath, "Candidate/Folder");
  assert.equal(merged[1].publicCatalog, null);
  assert.equal(merged[2].sourceStatus, "published_only");
  assert.equal(inventory.models[0].characterReview.status, "pending_evidence");
  assert.match(inventory.models[1].catalogEvidence.scope, /does not prove character identity/);
});

test("exports a spreadsheet-safe review queue with empty biography and evidence fields", () => {
  const inventory = buildCharacterReviewInventory({
    source: "https://catalog.example.test/api/catalog",
    capturedAt: "2026-11-17T00:00:00.000Z",
    models: [row({ name: 'Hero, "First Edition"' })].map((model) => ({
      id: model.id,
      slug: model.slug,
      code: model.code,
      name: model.name,
      variantName: model.variant_name,
      category: model.category,
      categorySlug: model.category_slug,
      franchise: model.franchise,
      franchiseSlug: model.franchise_slug,
      collection: model.collection,
      folderPath: model.folder_path,
    })),
  });
  const csv = serializeReviewQueueCsv(inventory);
  const [header, record] = csv.trimEnd().split("\r\n");

  assert.match(header, /identity_evidence,biography_status,biography_synopsis/);
  assert.match(record, /"Hero, ""First Edition"""/);
  assert.match(record, /pending_evidence,,,,not_started_identity_unverified/);
});
