import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATALOG_SLUG = /^[a-z0-9][a-z0-9-]{0,239}$/;
const CURATION_ALIAS_SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export type CatalogCurationState =
  | "suggested"
  | "approved"
  | "selected_for_offer"
  | "discarded";
export type CatalogCurationTagReviewState =
  | "suggested"
  | "approved"
  | "discarded";
export type CatalogCurationTagDimension =
  | "theme_genre"
  | "characteristic"
  | "narrative_role";

export type InternalCollectionTemplate = {
  name: string;
  slug: string;
  description: string;
};

export const INTERNAL_COLLECTION_TEMPLATES: readonly InternalCollectionTemplate[] = [
  {
    name: "Terror",
    slug: "terror",
    description:
      "Candidatos editoriais para uma futura coleção de terror. A associação interna não publica nem autoriza venda.",
  },
  {
    name: "Digimon",
    slug: "digimon",
    description:
      "Candidatos editoriais encontrados pela franquia canônica Digimon. A associação interna não publica nem autoriza venda.",
  },
  {
    name: "Inimigos da Vizinhança",
    slug: "inimigos-da-vizinhanca",
    description:
      "Candidatos editoriais a antagonistas relacionados ao universo do Homem-Aranha. Cada associação exige revisão e evidência.",
  },
] as const;

export type AdminInternalCollection = {
  id: string;
  name: string;
  slug: string;
  collectionKind: "internal" | "hybrid";
  curationVisibility: "private";
  isActive: boolean;
  status: string;
};

export type CatalogCurationTag = {
  id: string;
  dimension: CatalogCurationTagDimension;
  slug: string;
  label: string;
  status: "active" | "deprecated";
  definitionOrigin: string;
  aliases: string[];
};

export type CatalogCurationMembershipTag = {
  id: string;
  dimension: CatalogCurationTagDimension;
  slug: string;
  label: string;
  reviewState: CatalogCurationTagReviewState;
  evidenceOrigin: string;
  evidenceNote: string | null;
};

export type CatalogCurationMembership = {
  modelId: string;
  slug: string;
  state: CatalogCurationState;
  evidenceOrigin: string;
  evidenceNote: string | null;
  identityVerified: boolean;
  characterIdentityId: string | null;
  tags: CatalogCurationMembershipTag[];
};

export type CatalogCurationPage = {
  items: CatalogCurationMembership[];
  total: number;
  offset: number;
  limit: number;
};

export type CatalogCurationSummary = {
  modelCount: number;
  distinctVerifiedCharacterCount: number;
  unverifiedModelCount: number;
  suggestedCount: number;
  approvedCount: number;
  selectedForOfferCount: number;
  discardedCount: number;
};

export type CanonicalCurationModelRef = {
  modelId: string;
  slug: string;
};

const curationStates = new Set<CatalogCurationState>([
  "suggested",
  "approved",
  "selected_for_offer",
  "discarded",
]);
const tagReviewStates = new Set<CatalogCurationTagReviewState>([
  "suggested",
  "approved",
  "discarded",
]);
const tagDimensions = new Set<CatalogCurationTagDimension>([
  "theme_genre",
  "characteristic",
  "narrative_role",
]);

function asRecord(value: unknown, error: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(error);
  }
  return value as Record<string, unknown>;
}

function asNonNegativeInteger(value: unknown, error: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(error);
  }
  return value as number;
}

function asString(value: unknown, error: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(error);
  return value;
}

function asOptionalString(value: unknown, error: string): string | null {
  if (value === null || value === undefined) return null;
  return asString(value, error);
}

function parseCollection(value: unknown): AdminInternalCollection {
  const row = asRecord(value, "catalog_internal_collection_invalid");
  const id = asString(row.id, "catalog_internal_collection_invalid");
  const name = asString(row.name, "catalog_internal_collection_invalid");
  const slug = asString(row.slug, "catalog_internal_collection_invalid");
  if (!UUID_PATTERN.test(id) || !CATALOG_SLUG.test(slug)) {
    throw new Error("catalog_internal_collection_invalid");
  }
  if (row.collectionKind !== "internal" && row.collectionKind !== "hybrid") {
    throw new Error("catalog_internal_collection_invalid");
  }
  if (row.curationVisibility !== "private" || typeof row.isActive !== "boolean") {
    throw new Error("catalog_internal_collection_invalid");
  }
  return {
    id,
    name,
    slug,
    collectionKind: row.collectionKind,
    curationVisibility: row.curationVisibility,
    isActive: row.isActive,
    status: asString(row.status, "catalog_internal_collection_invalid"),
  };
}

function parseTag(value: unknown): CatalogCurationTag {
  const row = asRecord(value, "catalog_curation_tag_invalid");
  const id = asString(row.id, "catalog_curation_tag_invalid");
  const dimension = row.dimension;
  if (
    !UUID_PATTERN.test(id) ||
    typeof dimension !== "string" ||
    !tagDimensions.has(dimension as CatalogCurationTagDimension) ||
    (row.status !== "active" && row.status !== "deprecated")
  ) {
    throw new Error("catalog_curation_tag_invalid");
  }
  if (
    !Array.isArray(row.aliases) ||
    row.aliases.some(
      (alias) => typeof alias !== "string" || !CURATION_ALIAS_SLUG.test(alias),
    )
  ) {
    throw new Error("catalog_curation_tag_invalid");
  }
  return {
    id,
    dimension: dimension as CatalogCurationTagDimension,
    slug: asString(row.slug, "catalog_curation_tag_invalid"),
    label: asString(row.label, "catalog_curation_tag_invalid"),
    status: row.status,
    definitionOrigin: asString(
      row.definitionOrigin,
      "catalog_curation_tag_invalid",
    ),
    aliases: row.aliases as string[],
  };
}

function parseMembershipTag(value: unknown): CatalogCurationMembershipTag {
  const row = asRecord(value, "catalog_curation_membership_tag_invalid");
  const base = parseTag({
    ...row,
    status: "active",
    definitionOrigin: "membership",
    aliases: [],
  });
  if (
    typeof row.reviewState !== "string" ||
    !tagReviewStates.has(row.reviewState as CatalogCurationTagReviewState)
  ) {
    throw new Error("catalog_curation_membership_tag_invalid");
  }
  return {
    id: base.id,
    dimension: base.dimension,
    slug: base.slug,
    label: base.label,
    reviewState: row.reviewState as CatalogCurationTagReviewState,
    evidenceOrigin: asString(
      row.evidenceOrigin,
      "catalog_curation_membership_tag_invalid",
    ),
    evidenceNote: asOptionalString(
      row.evidenceNote,
      "catalog_curation_membership_tag_invalid",
    ),
  };
}

function parseMembership(value: unknown): CatalogCurationMembership {
  const row = asRecord(value, "catalog_curation_membership_invalid");
  const modelId = asString(row.modelId, "catalog_curation_membership_invalid");
  const slug = asString(row.slug, "catalog_curation_membership_invalid");
  const state = row.state;
  if (
    modelId.length > 160 ||
    !CATALOG_SLUG.test(slug) ||
    typeof state !== "string" ||
    !curationStates.has(state as CatalogCurationState) ||
    typeof row.identityVerified !== "boolean" ||
    !Array.isArray(row.tags)
  ) {
    throw new Error("catalog_curation_membership_invalid");
  }
  const identityId = row.characterIdentityId;
  if (
    identityId !== null &&
    identityId !== undefined &&
    (typeof identityId !== "string" || !UUID_PATTERN.test(identityId))
  ) {
    throw new Error("catalog_curation_membership_invalid");
  }
  if (row.identityVerified !== (typeof identityId === "string")) {
    throw new Error("catalog_curation_membership_invalid");
  }
  return {
    modelId,
    slug,
    state: state as CatalogCurationState,
    evidenceOrigin: asString(
      row.evidenceOrigin,
      "catalog_curation_membership_invalid",
    ),
    evidenceNote: asOptionalString(
      row.evidenceNote,
      "catalog_curation_membership_invalid",
    ),
    identityVerified: row.identityVerified,
    characterIdentityId: (identityId as string | null | undefined) ?? null,
    tags: row.tags.map(parseMembershipTag),
  };
}

export function validateCanonicalCurationModelRef(
  model: CanonicalCurationModelRef,
): void {
  if (
    !model ||
    typeof model.modelId !== "string" ||
    !model.modelId ||
    model.modelId.length > 160 ||
    /[\s<>\u0000-\u001f\u007f]/.test(model.modelId) ||
    !CATALOG_SLUG.test(model.slug)
  ) {
    throw new Error("catalog_curation_model_reference_invalid");
  }
}

export async function listAdminInternalCollections(): Promise<
  AdminInternalCollection[]
> {
  const data = await callAdminRpc<unknown>("admin_list_internal_collections");
  if (!Array.isArray(data)) throw new Error("catalog_internal_collections_invalid");
  return data.map(parseCollection);
}

export async function ensureAdminInternalCollection(
  template: InternalCollectionTemplate,
): Promise<AdminInternalCollection> {
  if (
    !template ||
    !template.name.trim() ||
    !CATALOG_SLUG.test(template.slug) ||
    !template.description.trim()
  ) {
    throw new Error("catalog_internal_collection_template_invalid");
  }
  const data = await callAdminRpc<unknown>("admin_ensure_internal_collection", {
    p_name: template.name,
    p_slug: template.slug,
    p_description: template.description,
  });
  return parseCollection(data);
}

export async function listCatalogCurationTags(): Promise<CatalogCurationTag[]> {
  const data = await callAdminRpc<unknown>("admin_list_catalog_curation_tags");
  if (!Array.isArray(data)) throw new Error("catalog_curation_tags_invalid");
  return data.map(parseTag);
}

function normalizeCurationAliasSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function addCatalogCurationTagAlias(input: {
  tagId: string;
  alias: string;
}): Promise<string> {
  if (!UUID_PATTERN.test(input.tagId)) {
    throw new Error("catalog_curation_tag_alias_invalid");
  }
  const aliasSlug = normalizeCurationAliasSlug(input.alias);
  if (!CURATION_ALIAS_SLUG.test(aliasSlug)) {
    throw new Error("catalog_curation_tag_alias_invalid");
  }

  const data = asRecord(
    await callAdminRpc<unknown>("admin_add_catalog_curation_tag_alias", {
      p_tag_id: input.tagId,
      p_alias_slug: aliasSlug,
    }),
    "catalog_curation_tag_alias_result_invalid",
  );
  if (data.tagId !== input.tagId || data.aliasSlug !== aliasSlug) {
    throw new Error("catalog_curation_tag_alias_result_invalid");
  }
  return aliasSlug;
}

export async function removeCatalogCurationTagAlias(input: {
  tagId: string;
  aliasSlug: string;
}): Promise<string> {
  if (
    !UUID_PATTERN.test(input.tagId) ||
    !CURATION_ALIAS_SLUG.test(input.aliasSlug)
  ) {
    throw new Error("catalog_curation_tag_alias_invalid");
  }

  const data = asRecord(
    await callAdminRpc<unknown>("admin_remove_catalog_curation_tag_alias", {
      p_tag_id: input.tagId,
      p_alias_slug: input.aliasSlug,
    }),
    "catalog_curation_tag_alias_result_invalid",
  );
  if (
    data.tagId !== input.tagId ||
    data.aliasSlug !== input.aliasSlug ||
    data.removed !== true
  ) {
    throw new Error("catalog_curation_tag_alias_result_invalid");
  }
  return input.aliasSlug;
}

export async function getInternalCollectionCurationSummary(
  collectionId: string,
): Promise<CatalogCurationSummary> {
  if (!UUID_PATTERN.test(collectionId)) {
    throw new Error("catalog_internal_collection_id_invalid");
  }
  const data = asRecord(
    await callAdminRpc<unknown>("admin_get_collection_curation_summary", {
      p_collection_id: collectionId,
    }),
    "catalog_curation_summary_invalid",
  );
  return {
    modelCount: asNonNegativeInteger(data.modelCount, "catalog_curation_summary_invalid"),
    distinctVerifiedCharacterCount: asNonNegativeInteger(
      data.distinctVerifiedCharacterCount,
      "catalog_curation_summary_invalid",
    ),
    unverifiedModelCount: asNonNegativeInteger(
      data.unverifiedModelCount,
      "catalog_curation_summary_invalid",
    ),
    suggestedCount: asNonNegativeInteger(
      data.suggestedCount,
      "catalog_curation_summary_invalid",
    ),
    approvedCount: asNonNegativeInteger(
      data.approvedCount,
      "catalog_curation_summary_invalid",
    ),
    selectedForOfferCount: asNonNegativeInteger(
      data.selectedForOfferCount,
      "catalog_curation_summary_invalid",
    ),
    discardedCount: asNonNegativeInteger(
      data.discardedCount,
      "catalog_curation_summary_invalid",
    ),
  };
}

export async function getInternalCollectionCurationPage(input: {
  collectionId: string;
  state?: CatalogCurationState | "all";
  offset?: number;
  limit?: number;
}): Promise<CatalogCurationPage> {
  if (!UUID_PATTERN.test(input.collectionId)) {
    throw new Error("catalog_internal_collection_id_invalid");
  }
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 20
  ) {
    throw new Error("catalog_curation_page_bounds_invalid");
  }
  if (
    input.state &&
    input.state !== "all" &&
    !curationStates.has(input.state)
  ) {
    throw new Error("catalog_curation_state_invalid");
  }

  const data = asRecord(
    await callAdminRpc<unknown>("admin_get_collection_curation_page", {
      p_collection_id: input.collectionId,
      p_state: !input.state || input.state === "all" ? null : input.state,
      p_offset: offset,
      p_limit: limit,
    }),
    "catalog_curation_page_invalid",
  );
  if (!Array.isArray(data.items)) throw new Error("catalog_curation_page_invalid");
  const parsedOffset = asNonNegativeInteger(data.offset, "catalog_curation_page_invalid");
  const parsedLimit = asNonNegativeInteger(data.limit, "catalog_curation_page_invalid");
  if (parsedLimit < 1 || parsedLimit > 20 || parsedOffset !== offset) {
    throw new Error("catalog_curation_page_invalid");
  }
  return {
    items: data.items.map(parseMembership),
    total: asNonNegativeInteger(data.total, "catalog_curation_page_invalid"),
    offset: parsedOffset,
    limit: parsedLimit,
  };
}

export async function saveInternalCollectionCuration(input: {
  collectionId: string;
  models: readonly CanonicalCurationModelRef[];
  state: CatalogCurationState;
  evidenceOrigin: string;
  evidenceNote?: string;
}): Promise<number> {
  if (!UUID_PATTERN.test(input.collectionId) || !curationStates.has(input.state)) {
    throw new Error("catalog_curation_save_invalid");
  }
  if (input.models.length < 1 || input.models.length > 50) {
    throw new Error("catalog_curation_save_invalid");
  }
  input.models.forEach(validateCanonicalCurationModelRef);
  if (!input.evidenceOrigin.trim()) throw new Error("catalog_curation_save_invalid");
  if (
    input.evidenceOrigin.startsWith("automatic:") &&
    input.state !== "suggested"
  ) {
    throw new Error("catalog_curation_automatic_must_be_suggested");
  }

  const data = asRecord(
    await callAdminRpc<unknown>("admin_upsert_collection_curation_models", {
      p_collection_id: input.collectionId,
      p_items: input.models.map((model) => ({
        modelId: model.modelId,
        slug: model.slug,
        state: input.state,
        evidenceOrigin: input.evidenceOrigin,
        evidenceNote: input.evidenceNote?.trim() || null,
      })),
    }),
    "catalog_curation_save_result_invalid",
  );
  if (data.id !== input.collectionId) {
    throw new Error("catalog_curation_save_result_invalid");
  }
  const count = asNonNegativeInteger(data.count, "catalog_curation_save_result_invalid");
  if (count !== input.models.length) {
    throw new Error("catalog_curation_save_result_invalid");
  }
  return count;
}

export async function verifyCatalogModelCharacterIdentity(input: {
  model: CanonicalCurationModelRef;
  characterName: string;
  franchise: string;
  evidenceOrigin: string;
  evidenceNote?: string;
}): Promise<string> {
  validateCanonicalCurationModelRef(input.model);
  if (
    !input.characterName.trim() ||
    !input.franchise.trim() ||
    !input.evidenceOrigin.trim() ||
    input.evidenceOrigin.startsWith("automatic:")
  ) {
    throw new Error("catalog_character_identity_verification_invalid");
  }
  const data = asRecord(
    await callAdminRpc<unknown>("admin_verify_catalog_model_identity", {
      p_model_id: input.model.modelId,
      p_model_slug: input.model.slug,
      p_character_name: input.characterName.trim(),
      p_franchise: input.franchise.trim(),
      p_evidence_origin: input.evidenceOrigin,
      p_evidence_note: input.evidenceNote?.trim() || null,
    }),
    "catalog_character_identity_verification_result_invalid",
  );
  if (data.modelId !== input.model.modelId || data.verified !== true) {
    throw new Error("catalog_character_identity_verification_result_invalid");
  }
  const identityId = asString(
    data.identityId,
    "catalog_character_identity_verification_result_invalid",
  );
  if (!UUID_PATTERN.test(identityId)) {
    throw new Error("catalog_character_identity_verification_result_invalid");
  }
  return identityId;
}

export async function saveCatalogModelClassifications(input: {
  models: readonly CanonicalCurationModelRef[];
  tagId: string;
  reviewState: CatalogCurationTagReviewState;
  evidenceOrigin: string;
  evidenceNote?: string;
}): Promise<number> {
  if (
    !UUID_PATTERN.test(input.tagId) ||
    !tagReviewStates.has(input.reviewState) ||
    input.models.length < 1 ||
    input.models.length > 100 ||
    !input.evidenceOrigin.trim()
  ) {
    throw new Error("catalog_curation_classification_invalid");
  }
  input.models.forEach(validateCanonicalCurationModelRef);
  if (
    input.evidenceOrigin.startsWith("automatic:") &&
    input.reviewState !== "suggested"
  ) {
    throw new Error("catalog_curation_automatic_must_be_suggested");
  }

  const data = asRecord(
    await callAdminRpc<unknown>("admin_upsert_catalog_curation_tags", {
      p_items: input.models.map((model) => ({
        modelId: model.modelId,
        slug: model.slug,
        tagId: input.tagId,
        reviewState: input.reviewState,
        evidenceOrigin: input.evidenceOrigin,
        evidenceNote: input.evidenceNote?.trim() || null,
      })),
    }),
    "catalog_curation_classification_result_invalid",
  );
  const count = asNonNegativeInteger(
    data.count,
    "catalog_curation_classification_result_invalid",
  );
  if (count !== input.models.length) {
    throw new Error("catalog_curation_classification_result_invalid");
  }
  return count;
}
