import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

export const DEFAULT_PUBLIC_CATALOG_API_BASE =
  "https://tonartstudio.com.br/catalogo-api/";
export const INVENTORY_SCHEMA_VERSION = "tonart-character-review-inventory/v1";
export const IDENTITY_EVIDENCE_NOTE =
  "Model title and franchise metadata do not prove character identity.";

function requiredText(value, field, rowNumber) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`invalid_catalog_${field}_at_row_${rowNumber}`);
  }
  return value.trim();
}

function optionalText(value, field, rowNumber) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`invalid_catalog_${field}_at_row_${rowNumber}`);
  }
  return value.trim() || null;
}

function optionalPath(value, field, rowNumber) {
  if (Array.isArray(value)) {
    if (value.some((segment) => typeof segment !== "string")) {
      throw new Error(`invalid_catalog_${field}_at_row_${rowNumber}`);
    }
    return value.map((segment) => segment.trim()).filter(Boolean).join("/") || null;
  }
  return optionalText(value, field, rowNumber);
}

function decodeModel(row, rowNumber) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`invalid_catalog_model_at_row_${rowNumber}`);
  }

  return {
    id: requiredText(row.id, "id", rowNumber),
    slug: requiredText(row.slug, "slug", rowNumber),
    code: requiredText(row.code, "code", rowNumber),
    name: requiredText(row.name, "name", rowNumber),
    variantName: optionalText(row.variant_name, "variant_name", rowNumber),
    category: requiredText(row.category, "category", rowNumber),
    categorySlug: requiredText(row.category_slug, "category_slug", rowNumber),
    franchise: requiredText(row.franchise, "franchise", rowNumber),
    franchiseSlug: requiredText(row.franchise_slug, "franchise_slug", rowNumber),
    collection: optionalText(row.collection, "collection", rowNumber),
    folderPath: optionalText(row.folder_path, "folder_path", rowNumber),
  };
}

function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_catalog_api_base");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("invalid_catalog_api_base");
  }
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

export async function fetchPublishedCatalogModels({
  baseUrl = DEFAULT_PUBLIC_CATALOG_API_BASE,
  fetcher = globalThis.fetch,
  limit = 60,
  signal,
  maxPages = 1000,
  pageDelayMs = 0,
} = {}) {
  if (typeof fetcher !== "function") throw new Error("catalog_fetch_unavailable");
  if (!Number.isInteger(limit) || limit < 1 || limit > 60) {
    throw new Error("catalog_limit_invalid");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error("catalog_max_pages_invalid");
  }
  if (!Number.isFinite(pageDelayMs) || pageDelayMs < 0) {
    throw new Error("catalog_page_delay_invalid");
  }

  const base = normalizeBaseUrl(baseUrl);
  const seenIds = new Set();
  const seenSlugs = new Set();
  const seenCursors = new Set();
  const models = [];
  let cursor = null;
  let pages = 0;

  do {
    if (pages >= maxPages) throw new Error("catalog_page_limit_exceeded");
    const url = new URL("api/catalog", base);
    url.searchParams.set("limit", String(limit));
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal,
    });
    if (!response?.ok) {
      throw new Error(`catalog_request_failed_${response?.status ?? "unknown"}`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("catalog_response_invalid_json");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("catalog_response_invalid");
    }
    if (!Array.isArray(payload.items) || payload.items.length > limit) {
      throw new Error("catalog_page_items_invalid");
    }
    const nextCursor = payload.nextCursor ?? null;
    if (
      nextCursor !== null &&
      (typeof nextCursor !== "string" || !nextCursor.trim() || nextCursor.length > 2048)
    ) {
      throw new Error("catalog_page_cursor_invalid");
    }
    if (nextCursor && (nextCursor === cursor || payload.items.length === 0)) {
      throw new Error("catalog_page_cursor_invalid");
    }
    if (nextCursor && seenCursors.has(nextCursor)) {
      throw new Error("catalog_page_cursor_repeated");
    }

    const pageModels = payload.items.map((row, index) =>
      decodeModel(row, models.length + index + 1),
    );
    for (const model of pageModels) {
      if (seenIds.has(model.id)) throw new Error("duplicate_catalog_model_id");
      if (seenSlugs.has(model.slug)) throw new Error("duplicate_catalog_model_slug");
      seenIds.add(model.id);
      seenSlugs.add(model.slug);
      models.push(model);
    }

    pages += 1;
    if (nextCursor) seenCursors.add(nextCursor);
    cursor = nextCursor;
    if (cursor && pageDelayMs > 0) await delay(pageDelayMs, undefined, { signal });
  } while (cursor);

  return { models, pages, source: new URL("api/catalog", base).toString() };
}

function buildIdentityCandidates(model, defaultSource) {
  const records = [];
  if (model.candidateContract) {
    records.push({
      source: "PR #26 offline candidate contract",
      fields: model.candidateContract,
    });
  }
  if (model.publicCatalog !== null) {
    records.push({
      source: model.publicCatalog ? "canonical public catalog gateway" : defaultSource,
      fields: model.publicCatalog ?? model,
    });
  }

  const names = new Map();
  const supportingLabels = new Map();
  const franchises = new Map();
  const addLabel = (target, value, field, source) => {
    if (typeof value !== "string" || !value.trim()) return;
    const label = value.trim();
    const record = target.get(label) ?? { value: label, evidence: [] };
    if (!record.evidence.some((item) => item.source === source && item.field === field)) {
      record.evidence.push({
        source,
        field,
        modelId: model.id ?? model.modelId,
        observedValue: label,
      });
    }
    target.set(label, record);
  };

  for (const record of records) {
    const fields = record.fields;
    addLabel(
      names,
      fields.name,
      record.source === "PR #26 offline candidate contract" ? "displayName" : "name",
      record.source,
    );
    for (const [field, value] of [
      ["variantName", fields.variantName],
      ["collection", fields.collection],
      ["folderPath", fields.folderPath],
    ]) {
      addLabel(supportingLabels, value, field, record.source);
    }
    if (typeof fields.franchise === "string" && fields.franchise.trim()) {
      const key = `${fields.franchiseSlug ?? ""}\u0000${fields.franchise.trim()}`;
      const franchise = franchises.get(key) ?? {
        label: fields.franchise.trim(),
        slug: fields.franchiseSlug ?? null,
        evidence: [],
      };
      franchise.evidence.push({
        source: record.source,
        field: record.source === "PR #26 offline candidate contract" ? "franchiseName" : "franchise",
        modelId: model.id ?? model.modelId,
        observedValue: fields.franchise.trim(),
      });
      franchises.set(key, franchise);
    }
  }

  const ambiguityCodes = [
    "catalog_title_may_not_be_a_character_name",
    "catalog_franchise_is_navigation_metadata_only",
  ];
  if (supportingLabels.size > 0) {
    ambiguityCodes.push("variant_collection_and_folder_labels_are_not_aliases");
  }
  if (names.size > 1) ambiguityCodes.push("candidate_sources_disagree_on_model_name");
  if (franchises.size > 1) ambiguityCodes.push("candidate_sources_disagree_on_franchise");

  return {
    status: "unverified_candidate",
    names: [...names.values()],
    supportingLabels: [...supportingLabels.values()],
    reviewRequired: true,
    verified: false,
    ambiguityCodes,
    note: "Exact catalog labels are review leads only; identity needs independent evidence and human approval.",
    franchises: {
      status: "catalog_context_only",
      candidates: [...franchises.values()],
      reviewRequired: true,
      verified: false,
    },
  };
}

export function buildCharacterReviewInventory({ models, source, capturedAt }) {
  const countsByCategory = new Map();
  const countsByFranchise = new Map();
  const rows = models.map((model) => {
    countsByCategory.set(model.category, (countsByCategory.get(model.category) ?? 0) + 1);
    countsByFranchise.set(model.franchise, (countsByFranchise.get(model.franchise) ?? 0) + 1);

    return {
      modelId: model.id,
      modelSlug: model.slug,
      modelCode: model.code,
      modelName: model.name,
      variantName: model.variantName,
      category: { label: model.category, slug: model.categorySlug },
      catalogFranchise: { label: model.franchise, slug: model.franchiseSlug },
      collection: model.collection,
      folderPath: model.folderPath,
      sourceStatus: model.sourceStatus ?? "published_inventory",
      candidateContract: model.candidateContract ?? null,
      publicCatalog: model.publicCatalog !== undefined
        ? model.publicCatalog
        : {
          slug: model.slug,
          category: model.category,
          categorySlug: model.categorySlug,
          franchise: model.franchise,
          franchiseSlug: model.franchiseSlug,
        },
      catalogEvidence: {
        sources: model.sources ?? [source],
        fields: ["category", "category_slug", "franchise", "franchise_slug"],
        scope: "Catalog metadata is provenance for the model row only; it does not prove character identity.",
      },
      identityCandidate: buildIdentityCandidates(model, source),
      characterReview: {
        status: "pending_evidence",
        characterId: null,
        candidateName: null,
        evidence: [],
        note: IDENTITY_EVIDENCE_NOTE,
      },
      biographyReview: {
        status: "not_started_identity_unverified",
        synopsis: null,
        biography: null,
        age: null,
        ageContext: null,
        sources: [],
        reviewedBy: null,
        reviewedAt: null,
      },
    };
  });

  return {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    capturedAt,
    source,
    recordCount: rows.length,
    policy: {
      authority: "Canonical public catalog gateway",
      generatedQueueOnly: true,
      writesToCatalog: false,
      verifiedCharacterLinks: 0,
      biographyDrafts: 0,
      note: "Regenerate this queue from the gateway. Approved identities and editorial text belong in the existing private curator, then in an authorized public projection.",
    },
    countsByCategory: Object.fromEntries(
      [...countsByCategory.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ),
    countsByCatalogFranchise: Object.fromEntries(
      [...countsByFranchise.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ),
    models: rows,
  };
}

function decodeCandidateContractModel(row, rowNumber) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`invalid_candidate_model_at_row_${rowNumber}`);
  }
  if (![true, false, 0, 1].includes(row.published)) {
    throw new Error(`invalid_candidate_published_at_row_${rowNumber}`);
  }
  return {
    id: requiredText(row.id, "candidate_id", rowNumber),
    slug: requiredText(row.slug, "candidate_slug", rowNumber),
    code: requiredText(row.code, "candidate_code", rowNumber),
    name: requiredText(row.displayName, "candidate_display_name", rowNumber),
    variantName: optionalText(row.variantName, "candidate_variant_name", rowNumber),
    category: requiredText(row.categoryName, "candidate_category", rowNumber),
    categorySlug: requiredText(row.categorySlug, "candidate_category_slug", rowNumber),
    franchise: requiredText(row.franchiseName, "candidate_franchise", rowNumber),
    franchiseSlug: requiredText(row.franchiseSlug, "candidate_franchise_slug", rowNumber),
    collection: optionalText(row.collection, "candidate_collection", rowNumber),
    folderPath: optionalPath(row.folderPath, "candidate_folder_path", rowNumber),
    published: row.published === true || row.published === 1,
  };
}

function decodeCandidateContract(candidate) {
  if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.models)) {
    throw new Error("candidate_contract_invalid");
  }
  if (candidate.modelTotal !== undefined && candidate.modelTotal !== candidate.models.length) {
    throw new Error("candidate_contract_count_invalid");
  }
  const ids = new Set();
  const slugs = new Set();
  const models = candidate.models.map((row, index) => {
    const model = decodeCandidateContractModel(row, index + 1);
    if (ids.has(model.id)) throw new Error("candidate_contract_duplicate_id");
    if (slugs.has(model.slug)) throw new Error("candidate_contract_duplicate_slug");
    ids.add(model.id);
    slugs.add(model.slug);
    return model;
  });
  return models;
}

export function mergeCandidateAndPublicModels(candidate, publicModels) {
  const candidateById = new Map(
    decodeCandidateContract(candidate).map((model) => [model.id, model]),
  );
  const publicById = new Map();
  for (const model of publicModels) {
    if (publicById.has(model.id)) throw new Error("duplicate_public_model_id");
    publicById.set(model.id, model);
  }

  const ids = [
    ...candidateById.keys(),
    ...[...publicById.keys()].filter((id) => !candidateById.has(id)),
  ];
  return ids.map((id) => {
    const candidateModel = candidateById.get(id) ?? null;
    const publicModel = publicById.get(id) ?? null;
    const model = publicModel ?? candidateModel;
    const sources = [];
    if (candidateModel) sources.push("PR #26 offline candidate contract");
    if (publicModel) sources.push("canonical public catalog gateway");
    return {
      ...model,
      sourceStatus: candidateModel && publicModel
        ? "candidate_and_published"
        : candidateModel
          ? "candidate_only"
          : "published_only",
      candidateContract: candidateModel ? {
        slug: candidateModel.slug,
        name: candidateModel.name,
        variantName: candidateModel.variantName,
        category: candidateModel.category,
        categorySlug: candidateModel.categorySlug,
        franchise: candidateModel.franchise,
        franchiseSlug: candidateModel.franchiseSlug,
        collection: candidateModel.collection,
        folderPath: candidateModel.folderPath,
        published: candidateModel.published,
      } : null,
      publicCatalog: publicModel ? {
        slug: publicModel.slug,
        name: publicModel.name,
        variantName: publicModel.variantName,
        category: publicModel.category,
        categorySlug: publicModel.categorySlug,
        franchise: publicModel.franchise,
        franchiseSlug: publicModel.franchiseSlug,
        collection: publicModel.collection,
        folderPath: publicModel.folderPath,
      } : null,
      sources,
    };
  });
}

export function reconcileCandidateContract(candidate, publicModels) {
  const candidateById = new Map(
    decodeCandidateContract(candidate).map((model) => [model.id, model.slug]),
  );

  const publicById = new Map(publicModels.map((model) => [model.id, model.slug]));
  const candidateOnlyIds = [...candidateById.keys()].filter((id) => !publicById.has(id));
  const publicOnlyIds = [...publicById.keys()].filter((id) => !candidateById.has(id));
  const slugMismatches = [...candidateById.entries()]
    .filter(([id, slug]) => publicById.has(id) && publicById.get(id) !== slug)
    .map(([id, candidateSlug]) => ({ id, candidateSlug, publicSlug: publicById.get(id) }));

  return {
    candidateModelCount: candidateById.size,
    publicModelCount: publicById.size,
    matchingIds: candidateById.size - candidateOnlyIds.length,
    candidateOnlyIds,
    publicOnlyIds,
    slugMismatches,
    note: "This compares model identifiers only; it provides no character identity or biography evidence.",
  };
}

const REVIEW_CSV_COLUMNS = [
  "model_id",
  "model_slug",
  "model_code",
  "model_name",
  "variant_name",
  "category",
  "category_slug",
  "catalog_franchise",
  "catalog_franchise_slug",
  "collection",
  "folder_path",
  "source_status",
  "catalog_sources",
  "candidate_contract_published",
  "candidate_contract_slug",
  "candidate_contract_variant_name",
  "candidate_contract_category",
  "candidate_contract_category_slug",
  "candidate_contract_franchise",
  "candidate_contract_franchise_slug",
  "public_catalog_slug",
  "catalog_evidence_scope",
  "identity_candidate_names",
  "candidate_status",
  "candidate_sources",
  "supporting_labels",
  "candidate_ambiguities",
  "identity_review_required",
  "identity_verified",
  "franchise_candidates",
  "franchise_sources",
  "franchise_review_required",
  "franchise_verified",
  "identity_status",
  "character_id",
  "candidate_name",
  "identity_evidence",
  "biography_status",
  "biography_synopsis",
  "biography_text",
  "biography_sources",
  "age",
  "age_context",
  "reviewed_by",
  "reviewed_at",
];

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeReviewQueueCsv(inventory) {
  const lines = [REVIEW_CSV_COLUMNS.join(",")];
  for (const model of inventory.models) {
    const row = {
      model_id: model.modelId,
      model_slug: model.modelSlug,
      model_code: model.modelCode,
      model_name: model.modelName,
      variant_name: model.variantName,
      category: model.category.label,
      category_slug: model.category.slug,
      catalog_franchise: model.catalogFranchise.label,
      catalog_franchise_slug: model.catalogFranchise.slug,
      collection: model.collection,
      folder_path: model.folderPath,
      source_status: model.sourceStatus,
      catalog_sources: model.catalogEvidence.sources.join(" | "),
      candidate_contract_published: model.candidateContract?.published,
      candidate_contract_slug: model.candidateContract?.slug,
      candidate_contract_variant_name: model.candidateContract?.variantName,
      candidate_contract_category: model.candidateContract?.category,
      candidate_contract_category_slug: model.candidateContract?.categorySlug,
      candidate_contract_franchise: model.candidateContract?.franchise,
      candidate_contract_franchise_slug: model.candidateContract?.franchiseSlug,
      public_catalog_slug: model.publicCatalog?.slug,
      catalog_evidence_scope: model.catalogEvidence.scope,
      identity_candidate_names: model.identityCandidate.names.map((candidate) => candidate.value).join(" | "),
      candidate_status: model.identityCandidate.status,
      candidate_sources: JSON.stringify(model.identityCandidate.names.flatMap((candidate) => candidate.evidence)),
      supporting_labels: JSON.stringify(model.identityCandidate.supportingLabels),
      candidate_ambiguities: model.identityCandidate.ambiguityCodes.join(" | "),
      identity_review_required: model.identityCandidate.reviewRequired,
      identity_verified: model.identityCandidate.verified,
      franchise_candidates: model.identityCandidate.franchises.candidates.map((candidate) => candidate.label).join(" | "),
      franchise_sources: JSON.stringify(model.identityCandidate.franchises.candidates.flatMap((candidate) => candidate.evidence)),
      franchise_review_required: model.identityCandidate.franchises.reviewRequired,
      franchise_verified: model.identityCandidate.franchises.verified,
      identity_status: model.characterReview.status,
      character_id: model.characterReview.characterId,
      candidate_name: model.characterReview.candidateName,
      identity_evidence: model.characterReview.evidence.join(" | "),
      biography_status: model.biographyReview.status,
      biography_synopsis: model.biographyReview.synopsis,
      biography_text: model.biographyReview.biography,
      biography_sources: model.biographyReview.sources.join(" | "),
      age: model.biographyReview.age,
      age_context: model.biographyReview.ageContext,
      reviewed_by: model.biographyReview.reviewedBy,
      reviewed_at: model.biographyReview.reviewedAt,
    };
    lines.push(REVIEW_CSV_COLUMNS.map((column) => csvCell(row[column])).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

function parseArguments(args) {
  const options = {
    baseUrl: DEFAULT_PUBLIC_CATALOG_API_BASE,
    candidateContractPath: null,
    format: "summary",
    outputPath: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === "--api-base" && value) {
      options.baseUrl = value;
      index += 1;
    } else if (arg === "--candidate-contract" && value) {
      options.candidateContractPath = value;
      index += 1;
    } else if (arg === "--format" && ["summary", "json", "csv"].includes(value)) {
      options.format = value;
      index += 1;
    } else if (arg === "--output" && value) {
      options.outputPath = value;
      index += 1;
    } else {
      throw new Error(`invalid_argument_${arg}`);
    }
  }
  if (options.outputPath && !["json", "csv"].includes(options.format)) {
    throw new Error("output_requires_json_or_csv_format");
  }
  return options;
}

async function main(args) {
  const options = parseArguments(args);
  let candidate = null;
  if (options.candidateContractPath) {
    const contractText = (await readFile(options.candidateContractPath, "utf8"))
      .replace(/^\uFEFF/, "");
    candidate = JSON.parse(contractText);
    if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.models)) {
      throw new Error("candidate_contract_invalid");
    }
    decodeCandidateContract(candidate);
  }
  const result = await fetchPublishedCatalogModels({
    baseUrl: options.baseUrl,
    pageDelayMs: 150,
  });
  let candidateReconciliation = null;
  let inventoryModels = result.models;
  if (candidate) {
    candidateReconciliation = reconcileCandidateContract(candidate, result.models);
    inventoryModels = mergeCandidateAndPublicModels(candidate, result.models);
  }
  const inventory = buildCharacterReviewInventory({
    models: inventoryModels,
    source: result.source,
    capturedAt: new Date().toISOString(),
  });

  const summary = {
    source: result.source,
    pagesRead: result.pages,
    publishedModelRecords: result.models.length,
    candidateModelRecords: candidateReconciliation?.candidateModelCount ?? null,
    uniqueModelRecords: inventory.models.length,
    categories: Object.keys(inventory.countsByCategory).length,
    catalogFranchises: Object.keys(inventory.countsByCatalogFranchise).length,
    verifiedCharacterLinks: 0,
    biographyDrafts: 0,
    candidateReconciliation: candidateReconciliation ? {
      candidateModelCount: candidateReconciliation.candidateModelCount,
      publicModelCount: candidateReconciliation.publicModelCount,
      matchingIds: candidateReconciliation.matchingIds,
      candidateOnlyCount: candidateReconciliation.candidateOnlyIds.length,
      publicOnlyCount: candidateReconciliation.publicOnlyIds.length,
      slugMismatchCount: candidateReconciliation.slugMismatches.length,
    } : null,
    note: "Catalog metadata is evidence only for the catalog fields. No character link or biography was inferred.",
  };
  const output = options.format === "json"
    ? `${JSON.stringify(inventory, null, 2)}\n`
    : options.format === "csv"
      ? serializeReviewQueueCsv(inventory)
      : `${JSON.stringify(summary, null, 2)}\n`;

  if (options.outputPath) {
    await mkdir(dirname(options.outputPath), { recursive: true });
    await writeFile(options.outputPath, output, "utf8");
    process.stdout.write(`${JSON.stringify({ ...summary, outputPath: options.outputPath }, null, 2)}\n`);
  } else {
    process.stdout.write(output);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`Catalog inventory failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
