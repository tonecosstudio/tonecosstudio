import {
  isApprovedPublicCover,
  isApprovedPublicMediaKey,
} from "./approved-public-renders";
import specialstlQuarantine from "./specialstl-quarantine.json";

/**
 * Read-only boundary for the canonical Tonecos catalog.
 *
 * Authority: the catalog's Cloudflare Worker (D1/R2), not Supabase.
 * No model mirroring, write path, token or implicit health preflight.
 * The public MVP uses the verified first-party Cloudflare Pages Function.
 */
export type PublicCatalogModel = {
  id: string;
  slug: string;
  code: string;
  name: string;
  variantName: string;
  category: string;
  categorySlug: string;
  franchise: string;
  franchiseSlug: string;
  collection: string | null;
  folderPath: string | null;
  imageCount: number;
  galleryVersion: number;
  coverStorageKey: string | null;
};

export type PublicCatalogCategory = {
  id: string;
  label: string;
  count: number;
  coverStorageKey?: string | null;
};
export type PublicCatalogFolder = {
  id: string;
  label: string;
  count: number;
  hasChildren: boolean;
  /** Missing on older Workers; null means the indexed lookup found no cover. */
  coverStorageKey?: string | null;
};
export type PublicCatalogFolderPage = {
  current: { id: string; label: string; count: number } | null;
  trail: Array<{ id: string; label: string }>;
  items: PublicCatalogFolder[];
};
export type PublicCatalogFolderFilters = {
  category: string;
  franchise: string;
  parent?: string;
};

export type PublicCatalogFranchise = PublicCatalogCategory & {
  category: string;
};

export type PublicCatalogFranchisePage = {
  items: PublicCatalogFranchise[];
  truncated: boolean;
};

export type PublicCatalogFranchiseFilters = {
  category?: string;
  search?: string;
  limit?: number;
};

export type PublicCatalogDetail = PublicCatalogModel & {
  description: string | null;
  material: string | null;
  heightCm: number | null;
};

/**
 * Versioned public editorial projection. These shapes are deliberately
 * stricter than the private curation records: only published, reviewed rows
 * with source references can cross the public gateway.
 */
export type PublicCatalogEditorialEvidence = {
  id: string;
  title: string;
  url: string;
  kind: "official" | "primary" | "publisher" | "catalog";
};

export type PublicCatalogEditorialPublication = {
  contractVersion: 1;
  editorialStatus: "approved";
  visibility: "public";
  revision: string;
  reviewedAt: string;
};

export type PublicCatalogEditorialModelReference = {
  modelId: string;
  slug: string;
  name: string;
  variantName: string;
  coverStorageKey: string | null;
  reviewStatus: "approved";
  evidenceIds: string[];
};

export type PublicCatalogCharacterProfile = {
  publication: PublicCatalogEditorialPublication;
  character: {
    id: string;
    slug: string;
    name: string;
    aliases: Array<{ value: string; evidenceIds: string[] }>;
    summary: string | null;
    summaryEvidenceIds: string[];
    biography: string | null;
    biographyEvidenceIds: string[];
    ageContext: {
      value: string;
      context: string;
      evidenceIds: string[];
    } | null;
    originWork: string | null;
    originWorkEvidenceIds: string[];
    mediaTypes: string[];
    mediaTypeEvidenceIds: string[];
    identityEvidenceIds: string[];
  };
  universe: {
    id: string;
    slug: string;
    name: string;
    categorySlug: string;
    evidenceIds: string[];
  };
  evidence: PublicCatalogEditorialEvidence[];
  sameCharacterModels: PublicCatalogEditorialModelReference[];
  otherUniverseModels: PublicCatalogEditorialModelReference[];
};

export type PublicCatalogCharacterSearchItem = {
  publication: PublicCatalogEditorialPublication;
  character: {
    id: string;
    slug: string;
    name: string;
    aliases: Array<{ value: string; evidenceIds: string[] }>;
    summary: string | null;
    summaryEvidenceIds: string[];
    identityEvidenceIds: string[];
  };
  universe: {
    id: string;
    slug: string;
    name: string;
    categorySlug: string;
    evidenceIds: string[];
  };
  evidence: PublicCatalogEditorialEvidence[];
  matchedBy: "name_exact" | "name" | "alias" | "franchise";
};

export type PublicCatalogCharacterSearchPage = {
  items: PublicCatalogCharacterSearchItem[];
  truncated: boolean;
};

export type PublicCatalogUniverseProfile = {
  publication: PublicCatalogEditorialPublication;
  universe: {
    id: string;
    slug: string;
    name: string;
    categorySlug: string;
    mediaTypes: string[];
    summary: string | null;
    summaryEvidenceIds: string[];
    overview: string | null;
    overviewEvidenceIds: string[];
    identityEvidenceIds: string[];
  };
  evidence: PublicCatalogEditorialEvidence[];
  characters: Array<{
    id: string;
    slug: string;
    name: string;
    summary: string | null;
    reviewStatus: "approved";
    evidenceIds: string[];
  }>;
  models: PublicCatalogEditorialModelReference[];
};

export type PublicCatalogPage = {
  items: PublicCatalogModel[];
  nextCursor: string | null;
};

export type PublicCatalogImage = {
  id: string;
  role: "cover" | "gallery";
  width: number;
  height: number;
  bytes: number;
  mime: string;
  qualityScore: number;
  sourceSha256: string;
  variantKeys: {
    thumb: string | null;
    card: string | null;
    detail: string | null;
    original: string | null;
  };
};

export type PublicCatalogGalleryPage = {
  items: PublicCatalogImage[];
  nextCursor: string | null;
  total: number;
  version: number;
};
export type PublicCatalogGalleryFilters = {
  version: number;
  cursor?: string;
  limit?: number;
  /** From the same published model detail, not an external index. */
  expectedTotal?: number;
  expectedCoverStorageKey?: string | null;
};
export type PublicCatalogFilters = {
  category?: string;
  franchise?: string;
  folder?: string;
  search?: string;
  cursor?: string;
  limit?: number;
};

type CatalogWireModel = {
  id?: unknown;
  slug?: unknown;
  code?: unknown;
  name?: unknown;
  variant_name?: unknown;
  category?: unknown;
  category_slug?: unknown;
  franchise?: unknown;
  franchise_slug?: unknown;
  collection?: unknown;
  folder_path?: unknown;
  image_count?: unknown;
  gallery_version?: unknown;
  cover_storage_key?: unknown;
  description?: unknown;
  material?: unknown;
  height_cm?: unknown;
};

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`invalid_catalog_${field}`);
  }
  return value;
}

function optionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`invalid_catalog_${field}`);
  return value;
}

function validateCatalogCursor(value: string | undefined, field: string): void {
  if (
    value !== undefined &&
    (typeof value !== "string" || !value || value.length > 2048)
  ) {
    throw new Error(field);
  }
}

export function validCatalogSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,239}$/.test(value);
}

export function validCatalogFolder(value: string): boolean {
  return (
    // The Worker rejects folder paths longer than 240 characters.
    value.length <= 240 &&
    !Array.from(value).some(
      (part) => part.charCodeAt(0) < 32 || part.charCodeAt(0) === 127,
    ) &&
    !value
      .split(String.fromCharCode(92))
      .join("/")
      .split("/")
      .some((part) => part === "." || part === "..")
  );
}

function wholeNumber(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`invalid_catalog_${field}`);
  }
  return value as number;
}

function decodeModel(value: unknown): PublicCatalogModel {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_catalog_model");
  }
  const row = value as CatalogWireModel;
  return {
    id: requiredText(row.id, "id"),
    slug: requiredText(row.slug, "slug"),
    code: requiredText(row.code, "code"),
    name: requiredText(row.name, "name"),
    variantName: optionalText(row.variant_name, "variant_name") ?? "",
    category: requiredText(row.category, "category"),
    categorySlug: requiredText(row.category_slug, "category_slug"),
    franchise: requiredText(row.franchise, "franchise"),
    franchiseSlug: requiredText(row.franchise_slug, "franchise_slug"),
    collection: optionalText(row.collection, "collection"),
    folderPath: optionalText(row.folder_path, "folder_path"),
    imageCount: wholeNumber(row.image_count, "image_count"),
    galleryVersion: wholeNumber(row.gallery_version, "gallery_version"),
    coverStorageKey: optionalText(row.cover_storage_key, "cover_storage_key"),
  };
}

function editorialTimestamp(value: unknown, field: string): string {
  const timestamp = requiredText(value, field);
  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new Error(`invalid_catalog_editorial_${field}`);
  }
  return timestamp;
}

function decodeEditorialEvidence(
  value: unknown,
): PublicCatalogEditorialEvidence[] {
  if (!Array.isArray(value) || value.length > 80) {
    throw new Error("invalid_catalog_editorial_evidence");
  }
  const seen = new Set<string>();
  return value.map((item: unknown): PublicCatalogEditorialEvidence => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("invalid_catalog_editorial_evidence_item");
    }
    const row = item as {
      id?: unknown;
      title?: unknown;
      url?: unknown;
      kind?: unknown;
    };
    const id = requiredText(row.id, "editorial_evidence_id");
    if (seen.has(id))
      throw new Error("duplicate_catalog_editorial_evidence_id");
    seen.add(id);
    if (
      !["official", "primary", "publisher", "catalog"].includes(
        row.kind as string,
      )
    ) {
      throw new Error("invalid_catalog_editorial_evidence_kind");
    }
    const rawUrl = requiredText(row.url, "editorial_evidence_url");
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new Error("invalid_catalog_editorial_evidence_url");
    }
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("invalid_catalog_editorial_evidence_url");
    }
    return {
      id,
      title: requiredText(row.title, "editorial_evidence_title"),
      url: url.toString(),
      kind: row.kind as PublicCatalogEditorialEvidence["kind"],
    };
  });
}

function decodeEvidenceIds(
  value: unknown,
  evidence: PublicCatalogEditorialEvidence[],
  field: string,
  requireIndependent = false,
): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 40) {
    throw new Error(`invalid_catalog_editorial_${field}`);
  }
  const seen = new Set<string>();
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const ids = value.map((item: unknown) => {
    const id = requiredText(item, `editorial_${field}_id`);
    if (seen.has(id) || !evidenceById.has(id)) {
      throw new Error(`invalid_catalog_editorial_${field}_reference`);
    }
    seen.add(id);
    return id;
  });
  if (
    requireIndependent &&
    !ids.some((id) => evidenceById.get(id)?.kind !== "catalog")
  ) {
    throw new Error(`catalog_editorial_${field}_needs_independent_evidence`);
  }
  return ids;
}

function decodeEditorialPublication(
  value: unknown,
): PublicCatalogEditorialPublication {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_catalog_editorial_publication");
  }
  const row = value as {
    contractVersion?: unknown;
    editorialStatus?: unknown;
    visibility?: unknown;
    revision?: unknown;
    reviewedAt?: unknown;
  };
  if (
    row.contractVersion !== 1 ||
    row.editorialStatus !== "approved" ||
    row.visibility !== "public"
  ) {
    throw new Error("catalog_editorial_projection_not_approved");
  }
  return {
    contractVersion: 1,
    editorialStatus: "approved",
    visibility: "public",
    revision: requiredText(row.revision, "editorial_revision"),
    reviewedAt: editorialTimestamp(row.reviewedAt, "reviewed_at"),
  };
}

function editorialStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 40) {
    throw new Error(`invalid_catalog_editorial_${field}`);
  }
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    const text = requiredText(item, `editorial_${field}_item`);
    if (seen.has(text)) throw new Error(`duplicate_catalog_editorial_${field}`);
    seen.add(text);
    return text;
  });
}

function editorialOptionalText(value: unknown, field: string): string | null {
  const text = optionalText(value, `editorial_${field}`);
  if (text && text.length > 4000)
    throw new Error(`invalid_catalog_editorial_${field}`);
  return text;
}

function decodeEditorialModelReferences(
  value: unknown,
  evidence: PublicCatalogEditorialEvidence[],
  field: string,
  requireIndependentEvidence = false,
): PublicCatalogEditorialModelReference[] {
  if (!Array.isArray(value) || value.length > 60) {
    throw new Error(`invalid_catalog_editorial_${field}`);
  }
  const seen = new Set<string>();
  const seenSlugs = new Set<string>();
  return value.map((item: unknown): PublicCatalogEditorialModelReference => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`invalid_catalog_editorial_${field}_item`);
    }
    const row = item as {
      modelId?: unknown;
      slug?: unknown;
      name?: unknown;
      variantName?: unknown;
      coverStorageKey?: unknown;
      reviewStatus?: unknown;
      evidenceIds?: unknown;
    };
    const modelId = requiredText(row.modelId, "editorial_model_id");
    if (seen.has(modelId))
      throw new Error(`duplicate_catalog_editorial_${field}_model`);
    seen.add(modelId);
    const slug = requiredText(row.slug, "editorial_model_slug");
    if (!validCatalogSlug(slug))
      throw new Error("invalid_catalog_editorial_model_slug");
    if (seenSlugs.has(slug))
      throw new Error(`duplicate_catalog_editorial_${field}_slug`);
    seenSlugs.add(slug);
    if (row.reviewStatus !== "approved") {
      throw new Error("catalog_editorial_model_relation_not_approved");
    }
    return {
      modelId,
      slug,
      name: requiredText(row.name, "editorial_model_name"),
      variantName:
        optionalText(row.variantName, "editorial_model_variant") ?? "",
      coverStorageKey: optionalText(
        row.coverStorageKey,
        "editorial_model_cover",
      ),
      reviewStatus: "approved",
      evidenceIds: decodeEvidenceIds(
        row.evidenceIds,
        evidence,
        `${field}_relation`,
        requireIndependentEvidence,
      ),
    };
  });
}

function decodePublicCharacterProfile(
  value: unknown,
  expectedSlug: string,
  expectedUniverse?: { categorySlug: string; franchiseSlug: string },
): PublicCatalogCharacterProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_catalog_character_profile");
  }
  const row = value as {
    publication?: unknown;
    character?: unknown;
    universe?: unknown;
    evidence?: unknown;
    sameCharacterModels?: unknown;
    otherUniverseModels?: unknown;
  };
  const publication = decodeEditorialPublication(row.publication);
  const evidence = decodeEditorialEvidence(row.evidence);
  if (
    !row.character ||
    typeof row.character !== "object" ||
    Array.isArray(row.character)
  ) {
    throw new Error("invalid_catalog_character_identity");
  }
  if (
    !row.universe ||
    typeof row.universe !== "object" ||
    Array.isArray(row.universe)
  ) {
    throw new Error("invalid_catalog_character_universe");
  }
  const character = row.character as Record<string, unknown>;
  const universe = row.universe as Record<string, unknown>;
  const slug = requiredText(character.slug, "character_slug");
  if (!validCatalogSlug(slug) || slug !== expectedSlug) {
    throw new Error("catalog_character_slug_mismatch");
  }
  const universeSlug = requiredText(universe.slug, "universe_slug");
  const categorySlug = requiredText(
    universe.categorySlug,
    "universe_category_slug",
  );
  if (!validCatalogSlug(universeSlug) || !validCatalogSlug(categorySlug)) {
    throw new Error("invalid_catalog_character_universe_slug");
  }
  if (
    expectedUniverse &&
    (universeSlug !== expectedUniverse.franchiseSlug ||
      categorySlug !== expectedUniverse.categorySlug)
  ) {
    throw new Error("catalog_character_universe_context_mismatch");
  }
  const identityEvidenceIds = decodeEvidenceIds(
    character.identityEvidenceIds,
    evidence,
    "character_identity_evidence",
    true,
  );
  const biography = editorialOptionalText(
    character.biography,
    "character_biography",
  );
  const biographyEvidenceIds = biography
    ? decodeEvidenceIds(
        character.biographyEvidenceIds,
        evidence,
        "character_biography_evidence",
        true,
      )
    : [];
  const summary = editorialOptionalText(character.summary, "character_summary");
  const summaryEvidenceIds = summary
    ? decodeEvidenceIds(
        character.summaryEvidenceIds,
        evidence,
        "character_summary_evidence",
        true,
      )
    : [];
  const originWork = editorialOptionalText(
    character.originWork,
    "character_origin_work",
  );
  const originWorkEvidenceIds = originWork
    ? decodeEvidenceIds(
        character.originWorkEvidenceIds,
        evidence,
        "character_origin_evidence",
        true,
      )
    : [];
  const mediaTypes = editorialStringList(
    character.mediaTypes,
    "character_media_types",
  );
  const mediaTypeEvidenceIds = mediaTypes.length
    ? decodeEvidenceIds(
        character.mediaTypeEvidenceIds,
        evidence,
        "character_media_type_evidence",
        true,
      )
    : [];
  let ageContext: PublicCatalogCharacterProfile["character"]["ageContext"] =
    null;
  if (character.ageContext !== null && character.ageContext !== undefined) {
    if (
      typeof character.ageContext !== "object" ||
      Array.isArray(character.ageContext)
    ) {
      throw new Error("invalid_catalog_character_age_context");
    }
    const age = character.ageContext as Record<string, unknown>;
    ageContext = {
      value: requiredText(age.value, "character_age"),
      context: requiredText(age.context, "character_age_context"),
      evidenceIds: decodeEvidenceIds(
        age.evidenceIds,
        evidence,
        "character_age_evidence",
        true,
      ),
    };
  }
  if (character.aliases !== undefined && !Array.isArray(character.aliases)) {
    throw new Error("invalid_catalog_character_aliases");
  }
  const aliases = ((character.aliases as unknown[] | undefined) ?? []).map(
    (item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error("invalid_catalog_character_alias");
      }
      const alias = item as { value?: unknown; evidenceIds?: unknown };
      return {
        value: requiredText(alias.value, "character_alias"),
        evidenceIds: decodeEvidenceIds(
          alias.evidenceIds,
          evidence,
          "character_alias_evidence",
          true,
        ),
      };
    },
  );
  if (!row.universe || typeof row.universe !== "object")
    throw new Error("invalid_catalog_character_universe");
  const universeEvidenceIds = decodeEvidenceIds(
    universe.evidenceIds,
    evidence,
    "character_universe_evidence",
    true,
  );
  const sameCharacterModels = decodeEditorialModelReferences(
    row.sameCharacterModels,
    evidence,
    "same_character_models",
    true,
  );
  const otherUniverseModels = decodeEditorialModelReferences(
    row.otherUniverseModels,
    evidence,
    "other_universe_models",
  );
  if (
    sameCharacterModels.some((model) =>
      otherUniverseModels.some(
        (other) => other.modelId === model.modelId || other.slug === model.slug,
      ),
    )
  ) {
    throw new Error("duplicate_catalog_editorial_related_model");
  }

  return {
    publication,
    character: {
      id: requiredText(character.id, "character_id"),
      slug,
      name: requiredText(character.name, "character_name"),
      aliases,
      summary,
      summaryEvidenceIds,
      biography,
      biographyEvidenceIds,
      ageContext,
      originWork,
      originWorkEvidenceIds,
      mediaTypes,
      mediaTypeEvidenceIds,
      identityEvidenceIds,
    },
    universe: {
      id: requiredText(universe.id, "universe_id"),
      slug: universeSlug,
      name: requiredText(universe.name, "universe_name"),
      categorySlug,
      evidenceIds: universeEvidenceIds,
    },
    evidence,
    sameCharacterModels,
    otherUniverseModels,
  };
}

function decodePublicCharacterSearchPage(
  value: unknown,
  limit: number,
): PublicCatalogCharacterSearchPage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_catalog_character_search");
  }
  const row = value as { items?: unknown; truncated?: unknown };
  if (
    !Array.isArray(row.items) ||
    row.items.length > limit ||
    typeof row.truncated !== "boolean"
  ) {
    throw new Error("invalid_catalog_character_search");
  }
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const items = row.items.map(
    (item: unknown): PublicCatalogCharacterSearchItem => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error("invalid_catalog_character_search_item");
      }
      const result = item as {
        publication?: unknown;
        character?: unknown;
        universe?: unknown;
        evidence?: unknown;
        matchedBy?: unknown;
      };
      const publication = decodeEditorialPublication(result.publication);
      const evidence = decodeEditorialEvidence(result.evidence);
      if (
        !result.character ||
        typeof result.character !== "object" ||
        Array.isArray(result.character) ||
        !result.universe ||
        typeof result.universe !== "object" ||
        Array.isArray(result.universe)
      ) {
        throw new Error("invalid_catalog_character_search_item");
      }
      const character = result.character as Record<string, unknown>;
      const universe = result.universe as Record<string, unknown>;
      const id = requiredText(character.id, "character_search_id");
      const slug = requiredText(character.slug, "character_search_slug");
      const universeSlug = requiredText(
        universe.slug,
        "character_search_universe_slug",
      );
      const categorySlug = requiredText(
        universe.categorySlug,
        "character_search_category_slug",
      );
      if (
        !validCatalogSlug(slug) ||
        !validCatalogSlug(universeSlug) ||
        !validCatalogSlug(categorySlug) ||
        seenIds.has(id) ||
        seenSlugs.has(slug) ||
        !["name_exact", "name", "alias", "franchise"].includes(
          result.matchedBy as string,
        )
      ) {
        throw new Error("invalid_catalog_character_search_item");
      }
      seenIds.add(id);
      seenSlugs.add(slug);
      const identityEvidenceIds = decodeEvidenceIds(
        character.identityEvidenceIds,
        evidence,
        "character_search_identity_evidence",
        true,
      );
      const summary = editorialOptionalText(
        character.summary,
        "character_search_summary",
      );
      const summaryEvidenceIds = summary
        ? decodeEvidenceIds(
            character.summaryEvidenceIds,
            evidence,
            "character_search_summary_evidence",
            true,
          )
        : [];
      if (!Array.isArray(character.aliases) || character.aliases.length > 40) {
        throw new Error("invalid_catalog_character_search_aliases");
      }
      const aliases = character.aliases.map((rawAlias: unknown) => {
        if (
          !rawAlias ||
          typeof rawAlias !== "object" ||
          Array.isArray(rawAlias)
        ) {
          throw new Error("invalid_catalog_character_search_alias");
        }
        const alias = rawAlias as { value?: unknown; evidenceIds?: unknown };
        return {
          value: requiredText(alias.value, "character_search_alias"),
          evidenceIds: decodeEvidenceIds(
            alias.evidenceIds,
            evidence,
            "character_search_alias_evidence",
            true,
          ),
        };
      });
      return {
        publication,
        character: {
          id,
          slug,
          name: requiredText(character.name, "character_search_name"),
          aliases,
          summary,
          summaryEvidenceIds,
          identityEvidenceIds,
        },
        universe: {
          id: requiredText(universe.id, "character_search_universe_id"),
          slug: universeSlug,
          name: requiredText(universe.name, "character_search_universe_name"),
          categorySlug,
          evidenceIds: decodeEvidenceIds(
            universe.evidenceIds,
            evidence,
            "character_search_universe_evidence",
            true,
          ),
        },
        evidence,
        matchedBy:
          result.matchedBy as PublicCatalogCharacterSearchItem["matchedBy"],
      };
    },
  );
  return { items, truncated: row.truncated };
}

function decodePublicUniverseProfile(
  value: unknown,
  expectedCategorySlug: string,
  expectedFranchiseSlug: string,
): PublicCatalogUniverseProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_catalog_universe_profile");
  }
  const row = value as {
    publication?: unknown;
    universe?: unknown;
    evidence?: unknown;
    characters?: unknown;
    models?: unknown;
  };
  const publication = decodeEditorialPublication(row.publication);
  const evidence = decodeEditorialEvidence(row.evidence);
  if (
    !row.universe ||
    typeof row.universe !== "object" ||
    Array.isArray(row.universe)
  ) {
    throw new Error("invalid_catalog_universe_profile_identity");
  }
  const universe = row.universe as Record<string, unknown>;
  const slug = requiredText(universe.slug, "universe_slug");
  const categorySlug = requiredText(
    universe.categorySlug,
    "universe_category_slug",
  );
  if (
    !validCatalogSlug(slug) ||
    !validCatalogSlug(categorySlug) ||
    slug !== expectedFranchiseSlug ||
    categorySlug !== expectedCategorySlug
  ) {
    throw new Error("catalog_universe_scope_mismatch");
  }
  if (!Array.isArray(row.characters) || row.characters.length > 120) {
    throw new Error("invalid_catalog_universe_characters");
  }
  const summary = editorialOptionalText(universe.summary, "universe_summary");
  const summaryEvidenceIds = summary
    ? decodeEvidenceIds(
        universe.summaryEvidenceIds,
        evidence,
        "universe_summary_evidence",
        true,
      )
    : [];
  const overview = editorialOptionalText(
    universe.overview,
    "universe_overview",
  );
  const overviewEvidenceIds = overview
    ? decodeEvidenceIds(
        universe.overviewEvidenceIds,
        evidence,
        "universe_overview_evidence",
        true,
      )
    : [];
  const seenCharacters = new Set<string>();
  const seenCharacterSlugs = new Set<string>();
  const characters = row.characters.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("invalid_catalog_universe_character");
    }
    const character = item as Record<string, unknown>;
    const id = requiredText(character.id, "universe_character_id");
    const characterSlug = requiredText(
      character.slug,
      "universe_character_slug",
    );
    if (
      seenCharacters.has(id) ||
      seenCharacterSlugs.has(characterSlug) ||
      !validCatalogSlug(characterSlug)
    ) {
      throw new Error("duplicate_or_invalid_catalog_universe_character");
    }
    seenCharacters.add(id);
    seenCharacterSlugs.add(characterSlug);
    if (character.reviewStatus !== "approved") {
      throw new Error("catalog_universe_character_not_approved");
    }
    return {
      id,
      slug: characterSlug,
      name: requiredText(character.name, "universe_character_name"),
      summary: editorialOptionalText(
        character.summary,
        "universe_character_summary",
      ),
      reviewStatus: "approved" as const,
      evidenceIds: decodeEvidenceIds(
        character.evidenceIds,
        evidence,
        "universe_character_evidence",
        true,
      ),
    };
  });

  return {
    publication,
    universe: {
      id: requiredText(universe.id, "universe_id"),
      slug,
      name: requiredText(universe.name, "universe_name"),
      categorySlug,
      mediaTypes: editorialStringList(
        universe.mediaTypes,
        "universe_media_types",
      ),
      summary,
      summaryEvidenceIds,
      overview,
      overviewEvidenceIds,
      identityEvidenceIds: decodeEvidenceIds(
        universe.identityEvidenceIds,
        evidence,
        "universe_identity_evidence",
        true,
      ),
    },
    evidence,
    characters,
    models: decodeEditorialModelReferences(
      row.models,
      evidence,
      "universe_models",
    ),
  };
}

/**
 * Quarantine externally branded catalog media when the public metadata
 * itself identifies the source. No pixel scanning, hidden Worker calls,
 * destructive data edits or replacement photos are implied.
 *
 * An image whose branding exists only inside its pixels must be reviewed
 * separately before it can be called clean.
 */
const EXTERNAL_MEDIA_BRAND =
  /(?:^|[^a-z0-9])special[\s._-]*stl(?:\.com)?(?=$|[^a-z0-9])/i;

/**
 * One image was matched visually, pixel-for-pixel by subject/composition,
 * between the owner's SpecialSTL example and the actual public catalog cover
 * of Ace Duck (TMNT), on 2026-11-06. The API does not identify the watermark
 * in text metadata; quarantine by the model's exact published ID instead.
 * A product's creator logo/Patreon credit alone never belongs in this list.
 * Do not remove this entry without a verified replacement and permission.
 */
// A single, reviewable data file holds every confirmed SpecialSTL ID.
// Batch decisions update data once, not application logic per photograph.
const CONFIRMED_SPECIALSTL_MODEL_IDS = new Set(
  specialstlQuarantine.confirmed.map((entry) => entry.modelId),
);

/**
 * A creator's own logo, signature or Patreon credit is not evidence of
 * unauthorized redistribution. Only explicitly identified redistribution
 * branding is blocked by the metadata rules below. Never quarantine a
 * product merely because its artwork credits a sculptor or studio.
 */
function hasRestrictedExternalBrand(value: string | null | undefined): boolean {
  return typeof value === "string" && EXTERNAL_MEDIA_BRAND.test(value);
}

function isPubliclyEligibleCatalogModel(model: PublicCatalogModel): boolean {
  return (
    (!CONFIRMED_SPECIALSTL_MODEL_IDS.has(model.id) ||
      isApprovedPublicCover(model)) &&
    ![
      model.slug,
      model.code,
      model.name,
      model.variantName,
      model.category,
      model.categorySlug,
      model.franchise,
      model.franchiseSlug,
      model.collection,
      model.folderPath,
      model.coverStorageKey,
    ].some(hasRestrictedExternalBrand)
  );
}

/**
 * Same-origin Cloudflare Pages calls may carry the browser's own Access cookie.
 * Cross-origin catalog origins must never receive session credentials.
 */
export function resolveCatalogFetchCredentials(
  catalogOrigin: string,
  siteOrigin?: string,
): RequestCredentials {
  return siteOrigin && siteOrigin === catalogOrigin ? "same-origin" : "omit";
}

/**
 * Probe one byte of a specifically approved public media URL, on demand.
 * Uses the existing first-party catalog gateway and validated Range proxy.
 * Never downloads the full R2 object or accepts a third-party/redirect URL.
 */
export async function probeCanonicalCatalogMediaByte(
  baseUrl: string,
  approvedMediaUrl: string | null,
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<void> {
  if (!approvedMediaUrl) throw new Error("catalog_media_probe_url_missing");
  const base = new URL(baseUrl);
  const url = new URL(approvedMediaUrl);
  if (
    base.protocol !== "https:" ||
    url.origin !== base.origin ||
    !url.href.startsWith(base.href + "media/") ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("catalog_media_probe_url_invalid");
  }
  const response = await fetcher(url.toString(), {
    method: "GET",
    headers: {
      Range: "bytes=0-0",
      Accept: "image/webp,image/avif,image/png,image/jpeg",
    },
    credentials: "omit",
    redirect: "error",
    signal,
  });
  const reader = response.body?.getReader();
  try {
    const range = response.headers.get("Content-Range");
    const mime = response.headers.get("Content-Type");
    if (
      response.status !== 206 ||
      !range ||
      !/^bytes 0-0\/[1-9][0-9]*$/.test(range) ||
      !mime ||
      !/^image\/(?:webp|avif|png|jpeg)(?:;|$)/i.test(mime) ||
      !reader
    ) {
      throw new Error("catalog_media_probe_invalid_response");
    }
    const chunk = await reader.read();
    if (chunk.done || chunk.value?.byteLength !== 1) {
      throw new Error("catalog_media_probe_invalid_body");
    }
  } finally {
    // Even if the server ignores Range, do not consume or buffer a full image.
    if (reader) await reader.cancel().catch(() => undefined);
    else await response.body?.cancel().catch(() => undefined);
  }
}

export function createPublicCatalogGateway(
  baseUrl: string,
  fetcher: typeof fetch,
) {
  // A base URL is an explicit deployment setting, never inferred from old
  // ordax.com.br defaults or synthesized from a user-entered search term.
  let base: URL;
  try {
    const raw = baseUrl.trim();
    if (!raw) throw new Error("invalid_origin");
    base = new URL(raw.endsWith("/") ? raw : `${raw}/`);
    if (base.username || base.password || base.search || base.hash) {
      throw new Error("invalid_origin");
    }
    const localDevelopmentProxy =
      import.meta.env.DEV &&
      typeof window !== "undefined" &&
      base.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(base.hostname) &&
      base.pathname === "/catalogo-api/" &&
      base.origin === window.location.origin;
    if (base.protocol !== "https:" && !localDevelopmentProxy) {
      throw new Error("invalid_origin");
    }
  } catch {
    throw new Error("catalog_endpoint_not_configured");
  }

  if (
    base.hostname === "ordax.com.br" ||
    base.hostname === "www.ordax.com.br"
  ) {
    throw new Error("catalog_endpoint_not_configured");
  }

  const credentials = resolveCatalogFetchCredentials(
    base.origin,
    typeof window === "undefined" ? undefined : window.location.origin,
  );

  async function read(
    path: string | URL,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const response = await fetcher(new URL(path, base).toString(), {
      method: "GET",
      credentials,
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok)
      throw new Error(`catalog_request_failed_${response.status}`);
    return response.json() as Promise<unknown>;
  }

  return {
    mediaUrl(key: string | null): string | null {
      // The Worker and Pages proxy expose only /media/*, never arbitrary
      // catalog API routes. Validate before turning untrusted keys into URLs.
      if (!key?.startsWith("media/") || hasRestrictedExternalBrand(key))
        return null;
      const segments = key.split("/");
      if (
        CONFIRMED_SPECIALSTL_MODEL_IDS.has(segments[1] ?? "") &&
        !isApprovedPublicMediaKey(key)
      )
        return null;
      if (
        segments.length < 2 ||
        segments.length > 17 ||
        segments
          .slice(1)
          .some(
            (part) =>
              !part ||
              part === "." ||
              part === ".." ||
              /[:?#%\\]/.test(part) ||
              Array.from(part).some(
                (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
              ),
          )
      )
        return null;
      try {
        // encodeURIComponent leaves !'()* raw; Pages media paths permit only
        // unreserved characters and valid percent-escaped bytes.
        const encoded = segments.map((part) =>
          encodeURIComponent(part).replace(
            /[!'()*]/g,
            (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase(),
          ),
        );
        if (encoded.some((part) => part.length > 256)) return null;
        const route = encoded.join("/");
        if (base.pathname.length + route.length > 4096) return null;
        return new URL(route, base).toString();
      } catch {
        // URI encoding rejects malformed Unicode rather than crashing a view.
        return null;
      }
    },

    async listCategories(
      signal?: AbortSignal,
    ): Promise<PublicCatalogCategory[]> {
      const result = await read("api/categories", signal);
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("invalid_catalog_categories");
      }
      const { items } = result as { items?: unknown };
      if (!Array.isArray(items) || items.length > 100) {
        throw new Error("invalid_catalog_categories");
      }
      const seen = new Set<string>();
      return items.map((value: unknown) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error("invalid_catalog_category");
        }
        const category = value as {
          id?: unknown;
          label?: unknown;
          count?: unknown;
          cover_storage_key?: unknown;
        };
        const id = requiredText(category.id, "category_id");
        if (!validCatalogSlug(id)) {
          throw new Error("invalid_catalog_category_id");
        }
        if (seen.has(id)) throw new Error("duplicate_catalog_category");
        seen.add(id);
        return {
          id,
          label: requiredText(category.label, "category_label"),
          count: wholeNumber(category.count, "category_count"),
          ...(category.cover_storage_key === undefined
            ? {}
            : {
                coverStorageKey: optionalText(
                  category.cover_storage_key,
                  "category_cover_key",
                ),
              }),
        };
      });
    },

    async listFranchises(
      filters: PublicCatalogFranchiseFilters = {},
      signal?: AbortSignal,
    ): Promise<PublicCatalogFranchisePage> {
      const query = filters.search?.trim();
      if (
        query &&
        (Array.from(query).length < 3 || Array.from(query).length > 80)
      ) {
        throw new Error("catalog_franchise_search_length_invalid");
      }
      if (filters.category && !validCatalogSlug(filters.category)) {
        throw new Error("catalog_franchise_category_invalid");
      }
      const limit = filters.limit ?? 24;
      if (!Number.isInteger(limit) || limit < 1 || limit > 48) {
        throw new Error("catalog_franchise_limit_invalid");
      }
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (query) params.set("q", query);
      params.set("limit", String(limit));

      const payload = await read("api/franchises?" + params.toString(), signal);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("invalid_catalog_franchises");
      }
      const { items, truncated } = payload as {
        items?: unknown;
        truncated?: unknown;
      };
      if (
        !Array.isArray(items) ||
        items.length > limit ||
        typeof truncated !== "boolean"
      ) {
        throw new Error("invalid_catalog_franchises");
      }
      const seen = new Set<string>();
      return {
        items: items.map((value: unknown): PublicCatalogFranchise => {
          if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("invalid_catalog_franchise");
          }
          const row = value as {
            id?: unknown;
            label?: unknown;
            count?: unknown;
            category?: unknown;
            cover_storage_key?: unknown;
          };
          const franchise = {
            id: requiredText(row.id, "franchise_id"),
            label: requiredText(row.label, "franchise_label"),
            count: wholeNumber(row.count, "franchise_count"),
            category: requiredText(row.category, "franchise_category"),
            ...(row.cover_storage_key === undefined
              ? {}
              : {
                  coverStorageKey: optionalText(
                    row.cover_storage_key,
                    "franchise_cover_key",
                  ),
                }),
          };
          if (!validCatalogSlug(franchise.id)) {
            throw new Error("invalid_catalog_franchise_id");
          }
          if (!validCatalogSlug(franchise.category)) {
            throw new Error("invalid_catalog_franchise_category");
          }
          if (filters.category && franchise.category !== filters.category) {
            throw new Error("invalid_catalog_franchise_category");
          }
          const identity = franchise.category + "/" + franchise.id;
          if (seen.has(identity)) {
            throw new Error("duplicate_catalog_franchise");
          }
          seen.add(identity);
          return franchise;
        }),
        truncated,
      };
    },

    async listFolders(
      filters: PublicCatalogFolderFilters,
      signal?: AbortSignal,
    ): Promise<PublicCatalogFolderPage> {
      if (
        !validCatalogSlug(filters.category) ||
        !validCatalogSlug(filters.franchise)
      ) {
        throw new Error("catalog_folder_scope_invalid");
      }
      const parent = filters.parent ?? "";
      if (typeof parent !== "string" || !validCatalogFolder(parent)) {
        throw new Error("catalog_folder_path_invalid");
      }
      const params = new URLSearchParams();
      params.set("category", filters.category);
      params.set("franchise", filters.franchise);
      if (parent) params.set("parent", parent);
      const payload = await read("api/folders?" + params.toString(), signal);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("invalid_catalog_folders");
      }
      const data = payload as {
        current?: unknown;
        trail?: unknown;
        items?: unknown;
      };
      if (
        !Array.isArray(data.trail) ||
        data.trail.length > 24 ||
        !Array.isArray(data.items) ||
        data.items.length > 256
      ) {
        throw new Error("invalid_catalog_folder_page");
      }
      const decodePath = (input: unknown, field: string): string => {
        const value = requiredText(input, field);
        if (!validCatalogFolder(value)) {
          throw new Error("invalid_catalog_folder_path");
        }
        return value;
      };
      const decodeTrail = (value: unknown) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error("invalid_catalog_folder_trail");
        }
        const row = value as { id?: unknown; label?: unknown };
        return {
          id: decodePath(row.id, "folder_trail_id"),
          label: requiredText(row.label, "folder_trail_label"),
        };
      };
      let current: PublicCatalogFolderPage["current"] = null;
      if (data.current !== null && data.current !== undefined) {
        if (typeof data.current !== "object" || Array.isArray(data.current)) {
          throw new Error("invalid_catalog_folder_current");
        }
        const row = data.current as {
          id?: unknown;
          label?: unknown;
          count?: unknown;
        };
        current = {
          id: decodePath(row.id, "folder_current_id"),
          label: requiredText(row.label, "folder_current_label"),
          count: wholeNumber(row.count, "folder_current_count"),
        };
      }
      if ((parent && current?.id !== parent) || (!parent && current !== null)) {
        throw new Error("catalog_folder_parent_mismatch");
      }
      const trail = data.trail.map(decodeTrail);
      if (
        (parent &&
          (trail.length === 0 || trail[trail.length - 1].id !== parent)) ||
        (!parent && trail.length > 0)
      ) {
        throw new Error("catalog_folder_trail_mismatch");
      }
      const seen = new Set<string>();
      const items = data.items.map((value: unknown): PublicCatalogFolder => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error("invalid_catalog_folder");
        }
        const row = value as {
          id?: unknown;
          label?: unknown;
          count?: unknown;
          hasChildren?: unknown;
          cover_storage_key?: unknown;
        };
        const id = decodePath(row.id, "folder_id");
        if (seen.has(id)) throw new Error("duplicate_catalog_folder");
        seen.add(id);
        if (parent && !id.startsWith(parent + "/")) {
          throw new Error("catalog_folder_child_outside_parent");
        }
        if (typeof row.hasChildren !== "boolean") {
          throw new Error("invalid_catalog_folder_has_children");
        }
        return {
          id,
          label: requiredText(row.label, "folder_label"),
          count: wholeNumber(row.count, "folder_count"),
          hasChildren: row.hasChildren,
          ...(row.cover_storage_key === undefined
            ? {}
            : {
                coverStorageKey: optionalText(
                  row.cover_storage_key,
                  "folder_cover_key",
                ),
              }),
        };
      });
      return { current, trail, items };
    },

    async getModel(
      slug: string,
      signal?: AbortSignal,
    ): Promise<PublicCatalogDetail> {
      if (!validCatalogSlug(slug)) throw new Error("invalid_catalog_slug");
      const result = await read(
        `api/models/${encodeURIComponent(slug)}`,
        signal,
      );
      const model = decodeModel(result);
      if (model.slug !== slug) throw new Error("invalid_catalog_model_slug");
      if (!isPubliclyEligibleCatalogModel(model)) {
        throw new Error("catalog_model_media_restricted");
      }
      const row = result as CatalogWireModel;
      if (
        row.height_cm !== null &&
        row.height_cm !== undefined &&
        (typeof row.height_cm !== "number" ||
          !Number.isFinite(row.height_cm) ||
          row.height_cm < 0)
      ) {
        throw new Error("invalid_catalog_height");
      }
      return {
        ...model,
        description: optionalText(row.description, "description"),
        material: optionalText(row.material, "material"),
        heightCm: (row.height_cm as number | null) ?? null,
      };
    },

    async getCharacterProfile(
      slug: string,
      signal?: AbortSignal,
      expectedUniverse?: { categorySlug: string; franchiseSlug: string },
    ): Promise<PublicCatalogCharacterProfile> {
      if (!validCatalogSlug(slug))
        throw new Error("invalid_catalog_character_slug");
      const result = await read(
        `api/editorial/v1/characters/${encodeURIComponent(slug)}`,
        signal,
      );
      return decodePublicCharacterProfile(result, slug, expectedUniverse);
    },

    async searchCharacters(
      query: string,
      limit = 8,
      signal?: AbortSignal,
    ): Promise<PublicCatalogCharacterSearchPage> {
      const normalized = query.trim();
      const length = Array.from(normalized).length;
      if (length < 3 || length > 80) {
        throw new Error("catalog_character_search_length_invalid");
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 12) {
        throw new Error("catalog_character_search_limit_invalid");
      }
      const params = new URLSearchParams({
        q: normalized,
        limit: String(limit),
      });
      const result = await read(
        `api/editorial/v1/characters/search?${params.toString()}`,
        signal,
      );
      return decodePublicCharacterSearchPage(result, limit);
    },

    async getUniverseProfile(
      categorySlug: string,
      franchiseSlug: string,
      signal?: AbortSignal,
    ): Promise<PublicCatalogUniverseProfile> {
      if (!validCatalogSlug(categorySlug) || !validCatalogSlug(franchiseSlug)) {
        throw new Error("invalid_catalog_universe_slug");
      }
      const result = await read(
        `api/editorial/v1/universes/${encodeURIComponent(categorySlug)}/${encodeURIComponent(franchiseSlug)}`,
        signal,
      );
      return decodePublicUniverseProfile(result, categorySlug, franchiseSlug);
    },

    async listGallery(
      slug: string,
      filters: PublicCatalogGalleryFilters,
      signal?: AbortSignal,
    ): Promise<PublicCatalogGalleryPage> {
      if (!validCatalogSlug(slug)) throw new Error("invalid_catalog_slug");
      if (!Number.isInteger(filters.version) || filters.version < 1)
        throw new Error("catalog_gallery_version_invalid");
      const limit = filters.limit ?? 24;
      if (!Number.isInteger(limit) || limit < 1 || limit > 60)
        throw new Error("catalog_gallery_limit_invalid");
      validateCatalogCursor(filters.cursor, "catalog_gallery_cursor_invalid");
      const url = new URL(
        "api/models/" + encodeURIComponent(slug) + "/images",
        base,
      );
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("v", String(filters.version));
      if (filters.cursor) url.searchParams.set("cursor", filters.cursor);
      const payload = await read(url, signal);
      if (!payload || typeof payload !== "object" || Array.isArray(payload))
        throw new Error("invalid_catalog_gallery");
      const row = payload as {
        items?: unknown;
        nextCursor?: unknown;
        total?: unknown;
        version?: unknown;
      };
      if (!Array.isArray(row.items) || row.items.length > limit)
        throw new Error("invalid_catalog_gallery_items");
      const total = wholeNumber(row.total, "gallery_total");
      const version = wholeNumber(row.version, "gallery_version");
      if (version !== filters.version)
        throw new Error("catalog_gallery_version_mismatch");
      if (
        filters.expectedTotal !== undefined &&
        (!Number.isSafeInteger(filters.expectedTotal) ||
          filters.expectedTotal < 1 ||
          total !== filters.expectedTotal)
      ) {
        throw new Error("catalog_gallery_count_mismatch");
      }
      if (row.items.length > total) {
        throw new Error("catalog_gallery_count_mismatch");
      }
      const nextCursor = row.nextCursor;
      if (
        nextCursor !== null &&
        nextCursor !== undefined &&
        (typeof nextCursor !== "string" ||
          !nextCursor ||
          nextCursor.length > 2048)
      )
        throw new Error("invalid_catalog_gallery_cursor");
      if (
        nextCursor &&
        (nextCursor === filters.cursor || row.items.length === 0)
      ) {
        throw new Error("invalid_catalog_gallery_cursor");
      }
      const items = row.items.map((value: unknown): PublicCatalogImage => {
        if (!value || typeof value !== "object" || Array.isArray(value))
          throw new Error("invalid_catalog_gallery_image");
        const image = value as {
          id?: unknown;
          role?: unknown;
          width?: unknown;
          height?: unknown;
          bytes?: unknown;
          mime?: unknown;
          qualityScore?: unknown;
          sourceSha256?: unknown;
          variantKeys?: unknown;
        };
        if (image.role !== "cover" && image.role !== "gallery")
          throw new Error("invalid_catalog_gallery_role");
        if (
          typeof image.qualityScore !== "number" ||
          !Number.isFinite(image.qualityScore)
        )
          throw new Error("invalid_catalog_gallery_quality");
        if (
          !image.variantKeys ||
          typeof image.variantKeys !== "object" ||
          Array.isArray(image.variantKeys)
        )
          throw new Error("invalid_catalog_gallery_variants");
        const variants = image.variantKeys as {
          thumb?: unknown;
          card?: unknown;
          detail?: unknown;
          original?: unknown;
        };
        return {
          id: requiredText(image.id, "gallery_image_id"),
          role: image.role,
          width: wholeNumber(image.width, "gallery_width"),
          height: wholeNumber(image.height, "gallery_height"),
          bytes: wholeNumber(image.bytes, "gallery_bytes"),
          mime: requiredText(image.mime, "gallery_mime"),
          qualityScore: image.qualityScore,
          sourceSha256: requiredText(
            image.sourceSha256,
            "gallery_source_sha256",
          ),
          variantKeys: {
            thumb: optionalText(variants.thumb, "gallery_thumb"),
            card: optionalText(variants.card, "gallery_card"),
            detail: optionalText(variants.detail, "gallery_detail"),
            original: optionalText(variants.original, "gallery_original"),
          },
        };
      });
      const seenImages = new Set<string>();
      for (const image of items) {
        if (seenImages.has(image.id)) {
          throw new Error("duplicate_catalog_gallery_image");
        }
        seenImages.add(image.id);
      }
      if (
        !filters.cursor &&
        filters.expectedCoverStorageKey !== undefined &&
        (!filters.expectedCoverStorageKey ||
          items.length === 0 ||
          items[0].role !== "cover" ||
          items[0].variantKeys.card !== filters.expectedCoverStorageKey)
      ) {
        throw new Error("catalog_gallery_cover_mismatch");
      }
      return {
        items,
        nextCursor: (nextCursor as string | null | undefined) ?? null,
        total,
        version,
      };
    },
    // Recent publications use the existing indexed Worker route, never a
    // full catalog scan or a client-side sort over paginated pages.
    async listRecent(
      limit = 6,
      signal?: AbortSignal,
    ): Promise<PublicCatalogModel[]> {
      if (!Number.isInteger(limit) || limit < 1 || limit > 24) {
        throw new Error("catalog_recent_limit_invalid");
      }
      const result = await read("api/recent?limit=" + limit, signal);
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("invalid_catalog_recent");
      }
      const { items } = result as { items?: unknown };
      if (!Array.isArray(items) || items.length > limit) {
        throw new Error("invalid_catalog_recent_items");
      }
      const seen = new Set<string>();
      return items
        .map((value: unknown) => {
          const model = decodeModel(value);
          if (!validCatalogSlug(model.slug)) {
            throw new Error("invalid_catalog_recent_slug");
          }
          if (seen.has(model.id)) {
            throw new Error("duplicate_catalog_recent_model");
          }
          seen.add(model.id);
          return model;
        })
        .filter(isPubliclyEligibleCatalogModel);
    },
    async listPage(
      filters: PublicCatalogFilters = {},
      signal?: AbortSignal,
    ): Promise<PublicCatalogPage> {
      const url = new URL("api/catalog", base);
      const query = filters.search?.trim();
      if (
        query &&
        (Array.from(query).length < 3 || Array.from(query).length > 80)
      ) {
        throw new Error("catalog_search_length_invalid");
      }
      if (
        filters.category &&
        filters.category !== "all" &&
        !validCatalogSlug(filters.category)
      ) {
        throw new Error("catalog_category_invalid");
      }
      if (filters.franchise && !validCatalogSlug(filters.franchise)) {
        throw new Error("catalog_franchise_invalid");
      }
      if (filters.folder && !validCatalogFolder(filters.folder)) {
        throw new Error("catalog_folder_invalid");
      }
      if (filters.folder && (!filters.category || !filters.franchise)) {
        throw new Error("catalog_folder_requires_scope");
      }
      const limit = filters.limit ?? 24;
      if (!Number.isInteger(limit) || limit < 1 || limit > 60) {
        throw new Error("catalog_limit_invalid");
      }
      validateCatalogCursor(filters.cursor, "catalog_cursor_invalid");
      url.searchParams.set("limit", String(limit));
      if (filters.category && filters.category !== "all")
        url.searchParams.set("category", filters.category);
      if (filters.franchise)
        url.searchParams.set("franchise", filters.franchise);
      if (filters.folder) url.searchParams.set("folder", filters.folder);
      if (query) url.searchParams.set("q", query);
      if (filters.cursor) url.searchParams.set("cursor", filters.cursor);

      const payload = await read(url, signal);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("invalid_catalog_page");
      }
      const { items, nextCursor } = payload as {
        items?: unknown;
        nextCursor?: unknown;
      };
      if (!Array.isArray(items) || items.length > limit) {
        throw new Error("invalid_catalog_page_items");
      }
      if (
        nextCursor !== null &&
        nextCursor !== undefined &&
        (typeof nextCursor !== "string" ||
          !nextCursor ||
          nextCursor.length > 2048)
      ) {
        throw new Error("invalid_catalog_page_cursor");
      }
      if (nextCursor && (nextCursor === filters.cursor || items.length === 0)) {
        throw new Error("invalid_catalog_page_cursor");
      }
      const seen = new Set<string>();
      const models = items.map((item: unknown) => {
        const model = decodeModel(item);
        if (seen.has(model.id)) throw new Error("duplicate_catalog_model_id");
        seen.add(model.id);
        return model;
      });
      return {
        items: models.filter(isPubliclyEligibleCatalogModel),
        nextCursor: (nextCursor as string | null | undefined) ?? null,
      };
    },
  };
}
