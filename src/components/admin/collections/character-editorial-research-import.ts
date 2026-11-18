import type { CatalogCharacterEditorialProfile } from "@/services/admin/catalog/admin-internal-collection-curation-service";

export const MAX_EDITORIAL_RESEARCH_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_CANDIDATES = 2609;
const MAX_SOURCES = 5000;
const MAX_MODEL_LINKS = 20000;
const REQUIRED_APPROVALS = [
  "identity",
  "franchise",
  "each biography claim",
  "each model relationship",
] as const;
const ALLOWED_SOURCE_KINDS = new Set([
  "official",
  "publisher",
  "licensor",
  "institution",
  "reputable_reference",
  "other",
]);

export type EditorialResearchSource = {
  id: string;
  publisher: string;
  title: string;
  url: string;
  sourceKind: string;
  consultedOn: string;
};

export type EditorialResearchClaim = {
  attribute: string;
  value: string;
  sourceIds: string[];
};

export type EditorialResearchModelLink = {
  modelId: string;
  modelSlug: string;
  relationshipStatus: "candidate_pending_visual_and_editorial_review";
};

export type EditorialResearchCandidate = {
  candidateName: string;
  catalogDisplayNameCandidate: string;
  identityStatus: "prepared_pending_human_review";
  franchiseCandidate: string;
  franchiseStatus:
    | "prepared_pending_human_review"
    | "ambiguous_pending_human_review";
  biographyStatus: "prepared_pending_human_review";
  claims: EditorialResearchClaim[];
  biographyDraft: string;
  biographySourceIds: string[];
  ambiguities: string[];
  candidateModelLinks: EditorialResearchModelLink[];
};

export type EditorialResearchPreparation = {
  sources: EditorialResearchSource[];
  candidates: EditorialResearchCandidate[];
};

export type EditorialResearchMatch = {
  candidate: EditorialResearchCandidate;
  modelLink: EditorialResearchModelLink;
  sources: EditorialResearchSource[];
};

function invalid(): never {
  throw new Error("Dossiê inválido ou incompatível com a revisão editorial.");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid();
  return value as Record<string, unknown>;
}

function asText(value: unknown, maxLength: number): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > maxLength ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13;
    })
  ) {
    return invalid();
  }
  return value.trim();
}

function asStringList(
  value: unknown,
  maxItems: number,
  itemLength: number,
): string[] {
  if (!Array.isArray(value) || value.length > maxItems) return invalid();
  const items = value.map((item) => asText(item, itemLength));
  if (new Set(items).size !== items.length) return invalid();
  return items;
}

function isHttpsSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const containsWhitespaceOrControl = Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 32 || code === 127;
    });
    return (
      url.protocol === "https:" &&
      hostname.includes(".") &&
      !hostname.includes(":") &&
      !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) &&
      !containsWhitespaceOrControl &&
      !url.username &&
      !url.password &&
      !["localhost", "localhost.localdomain", "127.0.0.1"].includes(hostname)
    );
  } catch {
    return false;
  }
}

function parseSource(value: unknown): EditorialResearchSource {
  const row = asRecord(value);
  const source = {
    id: asText(row.id, 100),
    publisher: asText(row.publisher, 200),
    title: asText(row.title, 300),
    url: asText(row.url, 2048),
    sourceKind: asText(row.sourceKind, 40),
    consultedOn: asText(row.consultedOn, 10),
  };
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id) ||
    !isHttpsSourceUrl(source.url) ||
    !ALLOWED_SOURCE_KINDS.has(source.sourceKind) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(source.consultedOn)
  ) {
    return invalid();
  }
  return source;
}

function parseClaim(value: unknown): EditorialResearchClaim {
  const row = asRecord(value);
  const attribute = asText(row.attribute, 120);
  const claim = {
    attribute,
    value: asText(row.value, 6000),
    sourceIds: asStringList(row.sourceIds, 10, 100),
  };
  if (
    !/^[a-z][a-z0-9_.-]*$/.test(attribute) ||
    row.reviewStatus !== "pending_human_review" ||
    !claim.sourceIds.length
  ) {
    return invalid();
  }
  return claim;
}

function parseModelLink(value: unknown): EditorialResearchModelLink {
  const row = asRecord(value);
  if (
    row.relationshipStatus !==
      "candidate_pending_visual_and_editorial_review" ||
    row.reviewRequired !== true ||
    !Array.isArray(row.independentModelEvidence) ||
    row.independentModelEvidence.length !== 0
  ) {
    return invalid();
  }
  const modelId = asText(row.modelId, 160);
  const modelSlug = asText(row.modelSlug, 240);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(modelSlug)) return invalid();
  const snapshot = asRecord(row.catalogEvidenceSnapshot);
  if (
    snapshot.publicCatalogSlug !== null &&
    snapshot.publicCatalogSlug !== modelSlug
  ) {
    return invalid();
  }
  return {
    modelId,
    modelSlug,
    relationshipStatus: "candidate_pending_visual_and_editorial_review",
  };
}

function parseCandidate(value: unknown): EditorialResearchCandidate {
  const row = asRecord(value);
  if (
    row.identityStatus !== "prepared_pending_human_review" ||
    ![
      "prepared_pending_human_review",
      "ambiguous_pending_human_review",
    ].includes(String(row.franchiseStatus)) ||
    row.biographyStatus !== "prepared_pending_human_review"
  ) {
    return invalid();
  }
  const claims = Array.isArray(row.claims)
    ? row.claims.map(parseClaim)
    : invalid();
  const candidateModelLinks = Array.isArray(row.candidateModelLinks)
    ? row.candidateModelLinks.map(parseModelLink)
    : invalid();
  const candidate = {
    candidateName: asText(row.candidateName, 240),
    catalogDisplayNameCandidate: asText(row.catalogDisplayNameCandidate, 240),
    identityStatus: "prepared_pending_human_review" as const,
    franchiseCandidate: asText(row.franchiseCandidate, 240),
    franchiseStatus:
      row.franchiseStatus as EditorialResearchCandidate["franchiseStatus"],
    biographyStatus: "prepared_pending_human_review" as const,
    claims,
    biographyDraft: asText(row.biographyDraft, 6000),
    biographySourceIds: asStringList(row.biographySourceIds, 20, 100),
    ambiguities: asStringList(row.ambiguities, 30, 2000),
    candidateModelLinks,
  };
  if (
    candidate.claims.filter(
      (claim) => claim.attribute === "identity.canonical_name_candidate",
    ).length !== 1 ||
    candidate.claims.filter(
      (claim) => claim.attribute === "franchise.candidate",
    ).length !== 1 ||
    !candidate.claims.some((claim) =>
      claim.attribute.startsWith("biography."),
    ) ||
    !candidate.biographySourceIds.length ||
    !candidate.candidateModelLinks.length ||
    row.catalogCandidateModelCount !== candidate.candidateModelLinks.length ||
    new Set(candidate.candidateModelLinks.map((link) => link.modelId)).size !==
      candidate.candidateModelLinks.length
  ) {
    return invalid();
  }
  return candidate;
}

export function getEditorialResearchClaimValue(
  candidate: EditorialResearchCandidate,
  attribute: string,
): string | null {
  return (
    candidate.claims.find((claim) => claim.attribute === attribute)?.value ??
    null
  );
}

export function parseEditorialResearchPreparation(
  text: string,
): EditorialResearchPreparation {
  if (
    new TextEncoder().encode(text).byteLength >
    MAX_EDITORIAL_RESEARCH_IMPORT_BYTES
  ) {
    return invalid();
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return invalid();
  }
  const root = asRecord(value);
  const policy = asRecord(root.policy);
  const approvalRequirements = policy.humanApprovalRequiredFor;
  if (!Array.isArray(approvalRequirements)) return invalid();
  if (
    root.schemaVersion !== 1 ||
    root.recordType !== "editorial_research_preparation" ||
    root.authority !==
      "review-only; not a character catalog or publication source" ||
    policy.publicProjectionEligible !== false ||
    policy.databaseWritePerformed !== false ||
    REQUIRED_APPROVALS.some((item) => !approvalRequirements.includes(item)) ||
    policy.approvedIdentityCount !== 0 ||
    policy.approvedModelLinkCount !== 0 ||
    policy.independentlyEvidenceBackedModelLinkCount !== 0 ||
    !Array.isArray(root.sources) ||
    !Array.isArray(root.candidates) ||
    root.sources.length > MAX_SOURCES ||
    root.candidates.length > MAX_CANDIDATES
  ) {
    return invalid();
  }
  const sources = root.sources.map(parseSource);
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  if (sourceMap.size !== sources.length) return invalid();

  const candidates = root.candidates.map(parseCandidate);
  if (
    new Set(
      candidates.map((candidate) =>
        candidate.candidateName.toLocaleLowerCase(),
      ),
    ).size !== candidates.length
  ) {
    return invalid();
  }
  const modelLinks = candidates.flatMap(
    (candidate) => candidate.candidateModelLinks,
  );
  if (
    modelLinks.length > MAX_MODEL_LINKS ||
    new Set(modelLinks.map((link) => `${link.modelId}\u0000${link.modelSlug}`))
      .size !== modelLinks.length ||
    candidates.some((candidate) =>
      [
        ...candidate.biographySourceIds,
        ...candidate.claims.flatMap((claim) => claim.sourceIds),
      ].some((sourceId) => !sourceMap.has(sourceId)),
    )
  ) {
    return invalid();
  }
  return { sources, candidates };
}

export function findEditorialResearchMatches(
  preparation: EditorialResearchPreparation,
  model: { modelId: string; slug: string },
): EditorialResearchMatch[] {
  return findEditorialResearchMatchesForModels(preparation, [model]);
}

export function findEditorialResearchMatchesForModels(
  preparation: EditorialResearchPreparation,
  models: readonly { modelId: string; slug: string }[],
): EditorialResearchMatch[] {
  const sourceMap = new Map(
    preparation.sources.map((source) => [source.id, source]),
  );
  const modelKeys = new Set(
    models.map((model) => `${model.modelId}\u0000${model.slug}`),
  );
  return preparation.candidates.flatMap((candidate) => {
    const modelLink = candidate.candidateModelLinks.find((link) =>
      modelKeys.has(`${link.modelId}\u0000${link.modelSlug}`),
    );
    if (!modelLink) return [];
    const sourceIds = new Set([
      ...candidate.biographySourceIds,
      ...candidate.claims.flatMap((claim) => claim.sourceIds),
    ]);
    return [
      {
        candidate,
        modelLink,
        sources: Array.from(sourceIds)
          .map((sourceId) => sourceMap.get(sourceId))
          .filter((source): source is EditorialResearchSource =>
            Boolean(source),
          ),
      },
    ];
  });
}

function editorialKind(
  sourceKind: string,
): CatalogCharacterEditorialProfile["biographySources"][number]["kind"] {
  if (
    sourceKind === "official" ||
    sourceKind === "publisher" ||
    sourceKind === "licensor" ||
    sourceKind === "institution" ||
    sourceKind === "reputable_reference"
  ) {
    return sourceKind;
  }
  return "other";
}

export function buildEditorialResearchDraft(
  candidate: EditorialResearchCandidate,
  sources: readonly EditorialResearchSource[],
): CatalogCharacterEditorialProfile {
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const toEvidence = (sourceIds: readonly string[]) =>
    Array.from(new Set(sourceIds)).flatMap((sourceId) => {
      const source = sourceMap.get(sourceId);
      return source
        ? [
            {
              title: source.title,
              url: source.url,
              kind: editorialKind(source.sourceKind),
            },
          ]
        : [];
    });
  const claimSources = (attribute: string) =>
    candidate.claims
      .filter((claim) => claim.attribute === attribute)
      .flatMap((claim) => claim.sourceIds);
  const biographyClaimSources = candidate.claims
    .filter((claim) => claim.attribute.startsWith("biography."))
    .flatMap((claim) => claim.sourceIds);

  return {
    slug: null,
    aliases: [],
    biography: candidate.biographyDraft,
    biographySources: toEvidence([
      ...candidate.biographySourceIds,
      ...biographyClaimSources,
    ]),
    ageContext: null,
    ageSources: [],
    originWork: "",
    originWorkSources: [],
    characteristics: [],
    nameSources: toEvidence(claimSources("identity.canonical_name_candidate")),
    franchiseSources: toEvidence(claimSources("franchise.candidate")),
  };
}

export function fillEmptyEditorialProfileFields(
  current: CatalogCharacterEditorialProfile,
  draft: CatalogCharacterEditorialProfile,
): CatalogCharacterEditorialProfile {
  const hasManualBiography =
    Boolean(current.biography.trim()) || current.biographySources.length > 0;
  return {
    ...current,
    biography: hasManualBiography ? current.biography : draft.biography,
    biographySources: hasManualBiography
      ? current.biographySources
      : draft.biographySources,
    nameSources: current.nameSources.length
      ? current.nameSources
      : draft.nameSources,
    franchiseSources: current.franchiseSources.length
      ? current.franchiseSources
      : draft.franchiseSources,
  };
}
