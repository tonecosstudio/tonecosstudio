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
  collectionKind: "internal";
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

export type CatalogVerifiedCharacter = {
  id: string;
  name: string;
  franchise: string;
  evidenceOrigin: string;
  evidenceNote: string | null;
};

export type CatalogCurationMembership = {
  modelId: string;
  slug: string;
  state: CatalogCurationState;
  evidenceOrigin: string;
  evidenceNote: string | null;
  characters: CatalogVerifiedCharacter[];
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
  if (row.collectionKind !== "internal") {
    throw new Error("catalog_internal_collection_invalid");
  }
  // This response is editorial-only. Never accept an active/published row
  // even if a malformed or stale RPC labels it as internal.
  if (
    row.curationVisibility !== "private" ||
    row.isActive !== false ||
    row.status !== "draft"
  ) {
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

function parseVerifiedCharacter(value: unknown): CatalogVerifiedCharacter {
  const row = asRecord(value, "catalog_curation_character_invalid");
  const id = asString(row.id, "catalog_curation_character_invalid");
  const name = asString(row.name, "catalog_curation_character_invalid");
  const franchise = asString(row.franchise, "catalog_curation_character_invalid");
  const evidenceOrigin = asString(row.evidenceOrigin, "catalog_curation_character_invalid");
  const evidenceNote = asOptionalString(row.evidenceNote, "catalog_curation_character_invalid");
  const unsafe = /[<>\u0000-\u001f\u007f]/;
  if (
    !UUID_PATTERN.test(id) || name.length > 160 || franchise.length > 160 ||
    evidenceOrigin.length > 240 || unsafe.test(name) ||
    unsafe.test(franchise) || unsafe.test(evidenceOrigin) ||
    evidenceOrigin.toLowerCase().startsWith("automatic:") ||
    (evidenceNote !== null && (evidenceNote.length > 1000 || unsafe.test(evidenceNote)))
  ) {
    throw new Error("catalog_curation_character_invalid");
  }
  return { id, name, franchise, evidenceOrigin, evidenceNote };
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
    !Array.isArray(row.characters) ||
    row.characters.length > 12 ||
    !Array.isArray(row.tags)
  ) {
    throw new Error("catalog_curation_membership_invalid");
  }
  const characters = row.characters.map(parseVerifiedCharacter);
  if (new Set(characters.map((character) => character.id)).size !== characters.length) {
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
    characters,
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

function assertUniqueCanonicalCurationModels(
  models: readonly CanonicalCurationModelRef[],
): void {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const model of models) {
    validateCanonicalCurationModelRef(model);
    if (ids.has(model.modelId) || slugs.has(model.slug)) {
      throw new Error("catalog_curation_duplicate_model_reference");
    }
    ids.add(model.modelId);
    slugs.add(model.slug);
  }
}

/**
 * Reject editorial approvals for missing/renamed canonical catalog references.
 * The supplied current catalog snapshot is read from the catalog owner; this
 * service never creates a second catalog identity or persists a model mirror.
 */
export function assertCurrentCanonicalCurationModels(
  selected: readonly CanonicalCurationModelRef[],
  current: readonly CanonicalCurationModelRef[],
): void {
  assertUniqueCanonicalCurationModels(selected);
  const currentById = new Map(current.map((model) => [model.modelId, model.slug]));
  if (
    selected.some(
      (model) =>
        !currentById.has(model.modelId) ||
        currentById.get(model.modelId) !== model.slug,
    )
  ) {
    throw new Error("catalog_curation_model_reference_stale");
  }
}

export async function listAdminInternalCollections(): Promise<
  AdminInternalCollection[]
> {
  const data = await callAdminRpc<unknown>("admin_list_internal_collections");
  if (!Array.isArray(data)) throw new Error("catalog_internal_collections_invalid");
  return data.map(parseCollection);
}

/** Build an owner-named private collection using the existing editorial SSOT. */
export function createInternalCollectionTemplate(
  nameInput: string,
  descriptionInput: string,
): InternalCollectionTemplate {
  if (typeof nameInput !== "string" || typeof descriptionInput !== "string") {
    throw new Error("catalog_internal_collection_template_invalid");
  }
  const name = nameInput.trim();
  const description = descriptionInput.trim();
  const unsafe = (value: string) =>
    Array.from(value).some((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 || char === "<" || char === ">";
    });
  const slug = normalizeCurationAliasSlug(name, 120);
  if (
    !name ||
    name.length > 160 ||
    unsafe(name) ||
    !description ||
    description.length > 2000 ||
    unsafe(description) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new Error("catalog_internal_collection_template_invalid");
  }
  return { name, slug, description };
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

function normalizeCurationAliasSlug(value: string, maxLength = 80): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

export async function createCatalogCurationTag(input: {
  dimension: CatalogCurationTagDimension;
  label: string;
}): Promise<CatalogCurationTag> {
  if (
    !input ||
    !tagDimensions.has(input.dimension) ||
    typeof input.label !== "string" ||
    !input.label.trim() ||
    input.label.trim().length > 120 ||
    Array.from(input.label).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === "<" || char === ">")
  ) {
    throw new Error("catalog_curation_tag_definition_invalid");
  }
  const label = input.label.trim();
  const slug = normalizeCurationAliasSlug(label);
  if (!CURATION_ALIAS_SLUG.test(slug)) {
    throw new Error("catalog_curation_tag_definition_invalid");
  }
  const data = await callAdminRpc<unknown>("admin_create_catalog_curation_tag", {
    p_dimension: input.dimension,
    p_slug: slug,
    p_label: label,
  });
  const tag = parseTag(data);
  if (
    tag.dimension !== input.dimension ||
    tag.slug !== slug ||
    tag.label !== label ||
    tag.status !== "active" ||
    tag.definitionOrigin !== "manual_admin:controlled_vocabulary" ||
    tag.aliases.length !== 0
  ) {
    throw new Error("catalog_curation_tag_definition_result_invalid");
  }
  return tag;
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
  tagId?: string;
  offset?: number;
  limit?: number;
}): Promise<CatalogCurationPage> {
  if (!UUID_PATTERN.test(input.collectionId)) {
    throw new Error("catalog_internal_collection_id_invalid");
  }
  if (input.tagId !== undefined && !UUID_PATTERN.test(input.tagId)) {
    throw new Error("catalog_curation_tag_filter_invalid");
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
      p_tag_id: input.tagId ?? null,
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
  assertUniqueCanonicalCurationModels(input.models);
  if (!input.evidenceOrigin.trim()) throw new Error("catalog_curation_save_invalid");
  if (input.evidenceOrigin.trim().toLowerCase().startsWith("automatic:")) {
    if (input.state !== "suggested") {
      throw new Error("catalog_curation_automatic_must_be_suggested");
    }
    if (!input.evidenceNote?.trim()) {
      throw new Error("catalog_curation_automatic_evidence_required");
    }
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
    input.evidenceOrigin.trim().toLowerCase().startsWith("automatic:")
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
  assertUniqueCanonicalCurationModels(input.models);
  if (input.evidenceOrigin.trim().toLowerCase().startsWith("automatic:")) {
    if (input.reviewState !== "suggested") {
      throw new Error("catalog_curation_automatic_must_be_suggested");
    }
    if (!input.evidenceNote?.trim()) {
      throw new Error("catalog_curation_automatic_evidence_required");
    }
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
