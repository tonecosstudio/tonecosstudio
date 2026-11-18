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

export const INTERNAL_COLLECTION_TEMPLATES: readonly InternalCollectionTemplate[] =
  [
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

export type CatalogEditorialEvidenceKind =
  | "official"
  | "publisher"
  | "licensor"
  | "institution"
  | "reputable_reference"
  | "other";

export type CatalogEditorialEvidenceSource = {
  title: string;
  url: string;
  kind: CatalogEditorialEvidenceKind;
};

export type CatalogCharacterEditorialClaim = {
  name: string;
  sources: CatalogEditorialEvidenceSource[];
};

export type CatalogCharacterEditorialProfile = {
  slug: string | null;
  aliases: CatalogCharacterEditorialClaim[];
  biography: string;
  biographySources: CatalogEditorialEvidenceSource[];
  ageContext: string | null;
  ageSources: CatalogEditorialEvidenceSource[];
  originWork: string;
  originWorkSources: CatalogEditorialEvidenceSource[];
  characteristics: CatalogCharacterEditorialClaim[];
  nameSources: CatalogEditorialEvidenceSource[];
  franchiseSources: CatalogEditorialEvidenceSource[];
};

export type AdminCatalogCharacterEditorialProfile = {
  identityId: string;
  name: string;
  franchise: string;
  profile: CatalogCharacterEditorialProfile;
  status: "draft" | "reviewed";
  revision: number;
  reviewedAt: string | null;
  reviewedBy: string | null;
  relationRevision: number;
  publicationStatus: "not_approved" | "approved";
  publicationRevision: number | null;
  publicationRelationRevision: number | null;
  publicationApprovalRef: string | null;
  publicationApprovedAt: string | null;
  publicationApprovedBy: string | null;
  publicationHistory: unknown[];
};

export const EMPTY_CATALOG_CHARACTER_EDITORIAL_PROFILE: CatalogCharacterEditorialProfile =
  {
    slug: null,
    aliases: [],
    biography: "",
    biographySources: [],
    ageContext: null,
    ageSources: [],
    originWork: "",
    originWorkSources: [],
    characteristics: [],
    nameSources: [],
    franchiseSources: [],
  };

export type CatalogUnlinkedCharacter = CatalogVerifiedCharacter & {
  unlinkedAt: string;
  unlinkReason: string;
  reviewCount: number;
};

export type CatalogCurationMembership = {
  modelId: string;
  slug: string;
  state: CatalogCurationState;
  evidenceOrigin: string;
  evidenceNote: string | null;
  characters: CatalogVerifiedCharacter[];
  inactiveCharacters: CatalogUnlinkedCharacter[];
  inactiveCharacterCount: number;
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
const editorialEvidenceKinds = new Set<CatalogEditorialEvidenceKind>([
  "official",
  "publisher",
  "licensor",
  "institution",
  "reputable_reference",
  "other",
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

function parseEditorialText(
  value: unknown,
  maxLength: number,
  error: string,
  required = false,
): string {
  if (value === null || value === undefined) {
    if (required) throw new Error(error);
    return "";
  }
  if (
    typeof value !== "string" ||
    value.length > maxLength ||
    hasUnsafeCurationCharacter(value) ||
    (required && !value.trim())
  ) {
    throw new Error(error);
  }
  return value.trim();
}

function parseEditorialSources(
  value: unknown,
  error: string,
): CatalogEditorialEvidenceSource[] {
  if (!Array.isArray(value) || value.length > 10) throw new Error(error);
  return value.map((item) => {
    const row = asRecord(item, error);
    if (
      Object.keys(row).some((key) => !["title", "url", "kind"].includes(key))
    ) {
      throw new Error(error);
    }
    const title = parseEditorialText(row.title, 200, error, true);
    const url = parseEditorialText(row.url, 2048, error, true);
    const kind = row.kind;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(error);
    }
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.username ||
      parsedUrl.password ||
      !parsedUrl.hostname ||
      ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname) ||
      typeof kind !== "string" ||
      !editorialEvidenceKinds.has(kind as CatalogEditorialEvidenceKind)
    ) {
      throw new Error(error);
    }
    return { title, url, kind: kind as CatalogEditorialEvidenceKind };
  });
}

function parseEditorialClaims(
  value: unknown,
  error: string,
  maxNameLength = 240,
) {
  if (!Array.isArray(value) || value.length > 30) throw new Error(error);
  const parsed = value.map((item) => {
    const row = asRecord(item, error);
    if (Object.keys(row).some((key) => !["name", "sources"].includes(key))) {
      throw new Error(error);
    }
    return {
      name: parseEditorialText(row.name, maxNameLength, error, true),
      sources: parseEditorialSources(row.sources, error),
    };
  });
  if (
    new Set(parsed.map((item) => item.name.toLocaleLowerCase())).size !==
    parsed.length
  ) {
    throw new Error(error);
  }
  return parsed;
}

function parseCharacterEditorialProfile(
  value: unknown,
): CatalogCharacterEditorialProfile {
  const row = asRecord(value, "catalog_character_editorial_profile_invalid");
  const allowedFields = new Set([
    "slug",
    "aliases",
    "biography",
    "biographySources",
    "ageContext",
    "ageSources",
    "originWork",
    "originWorkSources",
    "characteristics",
    "nameSources",
    "franchiseSources",
  ]);
  if (Object.keys(row).some((key) => !allowedFields.has(key))) {
    throw new Error("catalog_character_editorial_profile_invalid");
  }
  const slug =
    row.slug === null || row.slug === undefined
      ? null
      : parseEditorialText(
          row.slug,
          120,
          "catalog_character_editorial_profile_invalid",
          true,
        );
  if (slug !== null && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("catalog_character_editorial_profile_invalid");
  }
  const aliases = parseEditorialClaims(
    row.aliases ?? [],
    "catalog_character_editorial_profile_invalid",
    160,
  );
  const biography = parseEditorialText(
    row.biography ?? "",
    6000,
    "catalog_character_editorial_profile_invalid",
  );
  const biographySources = parseEditorialSources(
    row.biographySources ?? [],
    "catalog_character_editorial_profile_invalid",
  );
  const ageContext =
    row.ageContext === null || row.ageContext === undefined
      ? null
      : parseEditorialText(
          row.ageContext,
          500,
          "catalog_character_editorial_profile_invalid",
          true,
        );
  const ageSources = parseEditorialSources(
    row.ageSources ?? [],
    "catalog_character_editorial_profile_invalid",
  );
  const originWork = parseEditorialText(
    row.originWork ?? "",
    240,
    "catalog_character_editorial_profile_invalid",
  );
  const originWorkSources = parseEditorialSources(
    row.originWorkSources ?? [],
    "catalog_character_editorial_profile_invalid",
  );
  const characteristics = parseEditorialClaims(
    row.characteristics ?? [],
    "catalog_character_editorial_profile_invalid",
  );
  const nameSources = parseEditorialSources(
    row.nameSources ?? [],
    "catalog_character_editorial_profile_invalid",
  );
  const franchiseSources = parseEditorialSources(
    row.franchiseSources ?? [],
    "catalog_character_editorial_profile_invalid",
  );
  return {
    slug,
    aliases,
    biography,
    biographySources,
    ageContext,
    ageSources,
    originWork,
    originWorkSources,
    characteristics,
    nameSources,
    franchiseSources,
  };
}

function assertReviewedEditorialProfile(
  profile: CatalogCharacterEditorialProfile,
): void {
  if (
    !profile.slug ||
    !profile.biography ||
    !profile.originWork ||
    !profile.nameSources.length ||
    !profile.franchiseSources.length ||
    !profile.biographySources.length ||
    !profile.originWorkSources.length ||
    (profile.ageContext !== null && !profile.ageSources.length) ||
    profile.aliases.some((claim) => claim.sources.length === 0) ||
    profile.characteristics.some((claim) => claim.sources.length === 0)
  ) {
    throw new Error("catalog_character_editorial_review_evidence_required");
  }
}

function parseAdminCharacterEditorialProfile(
  value: unknown,
): AdminCatalogCharacterEditorialProfile {
  const row = asRecord(value, "catalog_character_editorial_profile_invalid");
  const identityId = asString(
    row.identityId,
    "catalog_character_editorial_profile_invalid",
  );
  const name = asString(
    row.name,
    "catalog_character_editorial_profile_invalid",
  );
  const franchise = asString(
    row.franchise,
    "catalog_character_editorial_profile_invalid",
  );
  const status = row.status;
  const revision = asNonNegativeInteger(
    row.revision,
    "catalog_character_editorial_profile_invalid",
  );
  const reviewedAt = asOptionalString(
    row.reviewedAt,
    "catalog_character_editorial_profile_invalid",
  );
  const reviewedBy = asOptionalString(
    row.reviewedBy,
    "catalog_character_editorial_profile_invalid",
  );
  const relationRevision = asNonNegativeInteger(
    row.relationRevision,
    "catalog_character_editorial_profile_invalid",
  );
  const publicationStatus = row.publicationStatus;
  const publicationRevision =
    row.publicationRevision === null
      ? null
      : asNonNegativeInteger(
          row.publicationRevision,
          "catalog_character_editorial_profile_invalid",
        );
  const publicationRelationRevision =
    row.publicationRelationRevision === null
      ? null
      : asNonNegativeInteger(
          row.publicationRelationRevision,
          "catalog_character_editorial_profile_invalid",
        );
  const publicationApprovalRef = asOptionalString(
    row.publicationApprovalRef,
    "catalog_character_editorial_profile_invalid",
  );
  const publicationApprovedAt = asOptionalString(
    row.publicationApprovedAt,
    "catalog_character_editorial_profile_invalid",
  );
  const publicationApprovedBy = asOptionalString(
    row.publicationApprovedBy,
    "catalog_character_editorial_profile_invalid",
  );
  const publicationHistory = Array.isArray(row.publicationHistory)
    ? row.publicationHistory
    : null;
  if (
    !UUID_PATTERN.test(identityId) ||
    name.length > 160 ||
    franchise.length > 160 ||
    typeof status !== "string" ||
    (status !== "draft" && status !== "reviewed") ||
    (reviewedAt !== null &&
      (!Number.isFinite(Date.parse(reviewedAt)) || reviewedAt.length > 64)) ||
    (reviewedBy !== null && !UUID_PATTERN.test(reviewedBy)) ||
    (status === "reviewed" && (!reviewedAt || !reviewedBy)) ||
    (status === "draft" && (reviewedAt || reviewedBy)) ||
    (publicationStatus !== "not_approved" &&
      publicationStatus !== "approved") ||
    (publicationApprovedAt !== null &&
      (!Number.isFinite(Date.parse(publicationApprovedAt)) ||
        publicationApprovedAt.length > 64)) ||
    (publicationApprovedBy !== null &&
      !UUID_PATTERN.test(publicationApprovedBy)) ||
    (publicationApprovalRef !== null && publicationApprovalRef.length > 120) ||
    publicationHistory === null ||
    publicationHistory.length > 25 ||
    (publicationStatus === "approved" &&
      (publicationRevision !== revision ||
        publicationRelationRevision !== relationRevision ||
        !publicationApprovalRef ||
        !publicationApprovedAt ||
        !publicationApprovedBy ||
        status !== "reviewed")) ||
    (publicationStatus === "not_approved" &&
      (publicationRevision !== null ||
        publicationRelationRevision !== null ||
        publicationApprovalRef !== null ||
        publicationApprovedAt !== null ||
        publicationApprovedBy !== null))
  ) {
    throw new Error("catalog_character_editorial_profile_invalid");
  }
  const profile = parseCharacterEditorialProfile(row.profile);
  if (status === "reviewed") assertReviewedEditorialProfile(profile);
  return {
    identityId,
    name,
    franchise,
    profile,
    status,
    revision,
    reviewedAt,
    reviewedBy,
    relationRevision,
    publicationStatus,
    publicationRevision,
    publicationRelationRevision,
    publicationApprovalRef,
    publicationApprovedAt,
    publicationApprovedBy,
    publicationHistory,
  };
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

function hasUnsafeCurationCharacter(value: string): boolean {
  return Array.from(value).some(
    (char) =>
      char === "<" ||
      char === ">" ||
      char.charCodeAt(0) < 32 ||
      char.charCodeAt(0) === 127,
  );
}

function parseVerifiedCharacter(value: unknown): CatalogVerifiedCharacter {
  const row = asRecord(value, "catalog_curation_character_invalid");
  const id = asString(row.id, "catalog_curation_character_invalid");
  const name = asString(row.name, "catalog_curation_character_invalid");
  const franchise = asString(
    row.franchise,
    "catalog_curation_character_invalid",
  );
  const evidenceOrigin = asString(
    row.evidenceOrigin,
    "catalog_curation_character_invalid",
  );
  const evidenceNote = asOptionalString(
    row.evidenceNote,
    "catalog_curation_character_invalid",
  );

  if (
    !UUID_PATTERN.test(id) ||
    name.length > 160 ||
    franchise.length > 160 ||
    evidenceOrigin.length > 240 ||
    hasUnsafeCurationCharacter(name) ||
    hasUnsafeCurationCharacter(franchise) ||
    hasUnsafeCurationCharacter(evidenceOrigin) ||
    evidenceOrigin.toLowerCase().startsWith("automatic:") ||
    (evidenceNote !== null &&
      (evidenceNote.length > 1000 || hasUnsafeCurationCharacter(evidenceNote)))
  ) {
    throw new Error("catalog_curation_character_invalid");
  }
  return { id, name, franchise, evidenceOrigin, evidenceNote };
}

function parseUnlinkedCharacter(value: unknown): CatalogUnlinkedCharacter {
  const row = asRecord(value, "catalog_curation_unlinked_character_invalid");
  const character = parseVerifiedCharacter(value);
  const unlinkedAt = asString(
    row.unlinkedAt,
    "catalog_curation_unlinked_character_invalid",
  );
  const unlinkReason = asString(
    row.unlinkReason,
    "catalog_curation_unlinked_character_invalid",
  );
  const reviewCount = asNonNegativeInteger(
    row.reviewCount,
    "catalog_curation_unlinked_character_invalid",
  );
  if (
    unlinkedAt.length > 64 ||
    !Number.isFinite(Date.parse(unlinkedAt)) ||
    hasUnsafeCurationCharacter(unlinkedAt) ||
    unlinkReason.length < 3 ||
    unlinkReason.length > 1000 ||
    hasUnsafeCurationCharacter(unlinkReason) ||
    reviewCount < 1 ||
    reviewCount > 100
  ) {
    throw new Error("catalog_curation_unlinked_character_invalid");
  }
  return { ...character, unlinkedAt, unlinkReason, reviewCount };
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
    !Array.isArray(row.inactiveCharacters) ||
    row.inactiveCharacters.length > 12 ||
    !Array.isArray(row.tags)
  ) {
    throw new Error("catalog_curation_membership_invalid");
  }
  const characters = row.characters.map(parseVerifiedCharacter);
  const inactiveCharacters = row.inactiveCharacters.map(parseUnlinkedCharacter);
  const inactiveCharacterCount = asNonNegativeInteger(
    row.inactiveCharacterCount,
    "catalog_curation_membership_invalid",
  );
  const allCharacterIds = [
    ...characters.map((character) => character.id),
    ...inactiveCharacters.map((character) => character.id),
  ];
  if (
    new Set(allCharacterIds).size !== allCharacterIds.length ||
    inactiveCharacterCount < inactiveCharacters.length
  ) {
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
    inactiveCharacters,
    inactiveCharacterCount,
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
    /\s/.test(model.modelId) ||
    hasUnsafeCurationCharacter(model.modelId) ||
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
  const currentById = new Map(
    current.map((model) => [model.modelId, model.slug]),
  );
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
  if (!Array.isArray(data))
    throw new Error("catalog_internal_collections_invalid");
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
    Array.from(input.label).some(
      (char) =>
        char.charCodeAt(0) < 32 ||
        char.charCodeAt(0) === 127 ||
        char === "<" ||
        char === ">",
    )
  ) {
    throw new Error("catalog_curation_tag_definition_invalid");
  }
  const label = input.label.trim();
  const slug = normalizeCurationAliasSlug(label);
  if (!CURATION_ALIAS_SLUG.test(slug)) {
    throw new Error("catalog_curation_tag_definition_invalid");
  }
  const data = await callAdminRpc<unknown>(
    "admin_create_catalog_curation_tag",
    {
      p_dimension: input.dimension,
      p_slug: slug,
      p_label: label,
    },
  );
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
    modelCount: asNonNegativeInteger(
      data.modelCount,
      "catalog_curation_summary_invalid",
    ),
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
  if (!Array.isArray(data.items))
    throw new Error("catalog_curation_page_invalid");
  const parsedOffset = asNonNegativeInteger(
    data.offset,
    "catalog_curation_page_invalid",
  );
  const parsedLimit = asNonNegativeInteger(
    data.limit,
    "catalog_curation_page_invalid",
  );
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
  if (
    !UUID_PATTERN.test(input.collectionId) ||
    !curationStates.has(input.state)
  ) {
    throw new Error("catalog_curation_save_invalid");
  }
  if (input.models.length < 1 || input.models.length > 50) {
    throw new Error("catalog_curation_save_invalid");
  }
  assertUniqueCanonicalCurationModels(input.models);
  if (!input.evidenceOrigin.trim())
    throw new Error("catalog_curation_save_invalid");
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
  const count = asNonNegativeInteger(
    data.count,
    "catalog_curation_save_result_invalid",
  );
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
  let evidenceUrl: URL | null = null;
  try {
    evidenceUrl = new URL(input.evidenceOrigin.trim());
  } catch {
    evidenceUrl = null;
  }
  const evidenceNote = input.evidenceNote?.trim() ?? "";
  if (
    !input.characterName.trim() ||
    !input.franchise.trim() ||
    !evidenceUrl ||
    evidenceUrl.protocol !== "https:" ||
    evidenceUrl.username.length > 0 ||
    evidenceUrl.password.length > 0 ||
    evidenceUrl.hostname === "localhost" ||
    evidenceUrl.hostname === "127.0.0.1" ||
    input.evidenceOrigin.trim().length > 240 ||
    !evidenceNote ||
    evidenceNote.length > 1000 ||
    hasUnsafeCurationCharacter(evidenceNote)
  ) {
    throw new Error("catalog_character_identity_verification_invalid");
  }
  const data = asRecord(
    await callAdminRpc<unknown>("admin_verify_catalog_model_identity", {
      p_model_id: input.model.modelId,
      p_model_slug: input.model.slug,
      p_character_name: input.characterName.trim(),
      p_franchise: input.franchise.trim(),
      p_evidence_origin: evidenceUrl.toString(),
      p_evidence_note: evidenceNote,
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

export async function getCatalogCharacterEditorialProfile(
  identityId: string,
): Promise<AdminCatalogCharacterEditorialProfile> {
  if (!UUID_PATTERN.test(identityId)) {
    throw new Error("catalog_character_editorial_identity_invalid");
  }
  const response = await callAdminRpc<unknown>(
    "admin_get_catalog_character_editorial_profile",
    { p_identity_id: identityId },
  );
  const parsed = parseAdminCharacterEditorialProfile(response);
  if (parsed.identityId !== identityId) {
    throw new Error("catalog_character_editorial_profile_invalid");
  }
  return parsed;
}

export async function saveCatalogCharacterEditorialProfile(input: {
  identityId: string;
  profile: CatalogCharacterEditorialProfile;
  status: "draft" | "reviewed";
  expectedRevision: number;
}): Promise<AdminCatalogCharacterEditorialProfile> {
  if (
    !UUID_PATTERN.test(input.identityId) ||
    (input.status !== "draft" && input.status !== "reviewed") ||
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0
  ) {
    throw new Error("catalog_character_editorial_profile_invalid");
  }
  const profile = parseCharacterEditorialProfile(input.profile);
  if (input.status === "reviewed") assertReviewedEditorialProfile(profile);
  const response = await callAdminRpc<unknown>(
    "admin_save_catalog_character_editorial_profile",
    {
      p_identity_id: input.identityId,
      p_profile: profile,
      p_status: input.status,
      p_expected_revision: input.expectedRevision,
    },
  );
  const parsed = parseAdminCharacterEditorialProfile(response);
  if (
    parsed.identityId !== input.identityId ||
    parsed.status !== input.status
  ) {
    throw new Error("catalog_character_editorial_profile_save_result_invalid");
  }
  return parsed;
}

export async function setCatalogCharacterPublicationApproval(input: {
  identityId: string;
  expectedRevision: number;
  expectedRelationRevision: number;
  approved: boolean;
}): Promise<AdminCatalogCharacterEditorialProfile> {
  if (
    !UUID_PATTERN.test(input.identityId) ||
    typeof input.approved !== "boolean" ||
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    !Number.isSafeInteger(input.expectedRelationRevision) ||
    input.expectedRelationRevision < 0
  ) {
    throw new Error("catalog_character_publication_approval_invalid");
  }
  const response = await callAdminRpc<unknown>(
    "admin_set_catalog_character_publication_approval",
    {
      p_identity_id: input.identityId,
      p_expected_revision: input.expectedRevision,
      p_expected_relation_revision: input.expectedRelationRevision,
      p_approved: input.approved,
    },
  );
  const parsed = parseAdminCharacterEditorialProfile(response);
  if (
    parsed.identityId !== input.identityId ||
    (input.approved && parsed.publicationStatus !== "approved") ||
    (!input.approved && parsed.publicationStatus !== "not_approved")
  ) {
    throw new Error("catalog_character_publication_approval_result_invalid");
  }
  return parsed;
}

/** Remove only the reviewed link, never the character identity or other models.
 * An orphaned catalog model can be cleaned up with its stored exact ID/slug.
 */
export async function unlinkCatalogModelCharacterIdentity(input: {
  model: CanonicalCurationModelRef;
  characterId: string;
  reason: string;
}): Promise<void> {
  validateCanonicalCurationModelRef(input.model);
  const reason = input.reason.trim();
  if (
    !UUID_PATTERN.test(input.characterId) ||
    reason.length < 3 ||
    reason.length > 1000 ||
    hasUnsafeCurationCharacter(reason)
  ) {
    throw new Error("catalog_character_identity_unlink_invalid");
  }
  const data = asRecord(
    await callAdminRpc<unknown>("admin_unlink_catalog_model_character", {
      p_model_id: input.model.modelId,
      p_model_slug: input.model.slug,
      p_character_identity_id: input.characterId,
      p_reason: reason,
    }),
    "catalog_character_identity_unlink_result_invalid",
  );
  if (
    data.modelId !== input.model.modelId ||
    data.identityId !== input.characterId ||
    data.unlinked !== true
  ) {
    throw new Error("catalog_character_identity_unlink_result_invalid");
  }
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
