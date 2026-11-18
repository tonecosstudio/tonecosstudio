import { describe, expect, it } from "vitest";
import {
  buildEditorialResearchDraft,
  fillEmptyEditorialProfileFields,
  findEditorialResearchMatches,
  findEditorialResearchMatchesForModels,
  getEditorialResearchClaimValue,
  parseEditorialResearchPreparation,
} from "@/components/admin/collections/character-editorial-research-import";

const packetFixture = () => ({
  schemaVersion: 1,
  recordType: "editorial_research_preparation",
  authority: "review-only; not a character catalog or publication source",
  snapshot: { catalogModelCount: 2609 },
  policy: {
    publicProjectionEligible: false,
    databaseWritePerformed: false,
    humanApprovalRequiredFor: [
      "identity",
      "franchise",
      "each biography claim",
      "each model relationship",
    ],
    approvedIdentityCount: 0,
    approvedModelLinkCount: 0,
    independentlyEvidenceBackedModelLinkCount: 0,
  },
  sources: [
    {
      id: "publisher-profile",
      publisher: "Example Publisher",
      title: "Official character profile",
      url: "https://publisher.example/characters/hero",
      sourceKind: "official",
      consultedOn: "2026-11-18",
    },
    {
      id: "publisher-history",
      publisher: "Example Publisher",
      title: "Official character history",
      url: "https://publisher.example/history/hero",
      sourceKind: "publisher",
      consultedOn: "2026-11-18",
    },
  ],
  candidates: [
    {
      candidateName: "Hero",
      catalogDisplayNameCandidate: "Herói",
      identityStatus: "prepared_pending_human_review",
      franchiseCandidate: "Hero Universe",
      franchiseStatus: "prepared_pending_human_review",
      biographyStatus: "prepared_pending_human_review",
      claims: [
        {
          attribute: "identity.canonical_name_candidate",
          value: "Hero",
          sourceIds: ["publisher-profile"],
          reviewStatus: "pending_human_review",
        },
        {
          attribute: "franchise.candidate",
          value: "Hero Universe",
          sourceIds: ["publisher-profile"],
          reviewStatus: "pending_human_review",
        },
        {
          attribute: "biography.fact.origin",
          value: "The publisher describes the hero's origin.",
          sourceIds: ["publisher-history"],
          reviewStatus: "pending_human_review",
        },
      ],
      biographyDraft: "The Hero is described in the official history.",
      biographySourceIds: ["publisher-history"],
      catalogFranchiseCandidates: ["Hero Universe"],
      ambiguities: [
        "The catalog title does not establish the render's identity.",
      ],
      candidateModelLinks: [
        {
          modelId: "mdl_0123456789",
          modelSlug: "hero-statue",
          catalogProvenanceFields: ["model_id", "model_slug", "model_name"],
          relationshipStatus: "candidate_pending_visual_and_editorial_review",
          independentModelEvidence: [],
          reviewRequired: true,
          catalogEvidenceSnapshot: {
            sourceStatus: "candidate_and_published",
            candidateContractPublished: true,
            publicCatalogSlug: "hero-statue",
          },
        },
      ],
      catalogCandidateModelCount: 1,
    },
  ],
});

describe("editorial research handoff", () => {
  it("accepts review-only research and matches only the exact model ID and slug", () => {
    const preparation = parseEditorialResearchPreparation(
      JSON.stringify(packetFixture()),
    );

    expect(preparation.candidates).toHaveLength(1);
    expect(
      findEditorialResearchMatches(preparation, {
        modelId: "mdl_0123456789",
        slug: "hero-statue",
      }),
    ).toHaveLength(1);
    expect(
      findEditorialResearchMatches(preparation, {
        modelId: "mdl_0123456789",
        slug: "different-slug",
      }),
    ).toEqual([]);
    expect(
      findEditorialResearchMatches(preparation, {
        modelId: "mdl_9999999999",
        slug: "hero-statue",
      }),
    ).toEqual([]);
    expect(
      findEditorialResearchMatchesForModels(preparation, [
        { modelId: "mdl_0123456789", slug: "hero-statue" },
        { modelId: "mdl_9999999999", slug: "other-model" },
      ]),
    ).toHaveLength(1);
  });

  it("maps sourced biography, name and franchise into a private draft only", () => {
    const preparation = parseEditorialResearchPreparation(
      JSON.stringify(packetFixture()),
    );
    const candidate = preparation.candidates[0];
    const draft = buildEditorialResearchDraft(candidate, preparation.sources);

    expect(
      getEditorialResearchClaimValue(
        candidate,
        "identity.canonical_name_candidate",
      ),
    ).toBe("Hero");
    expect(draft.biography).toBe(candidate.biographyDraft);
    expect(draft.biographySources.map((source) => source.title)).toEqual([
      "Official character history",
    ]);
    expect(draft.nameSources[0].title).toBe("Official character profile");
    expect(draft.franchiseSources[0].title).toBe("Official character profile");
    expect(draft.slug).toBeNull();
    expect(draft.originWork).toBe("");
    expect(draft.aliases).toEqual([]);
    expect(draft.characteristics).toEqual([]);
    expect(draft.ageContext).toBeNull();
  });

  it("fills only empty fields and preserves manual profile decisions", () => {
    const preparation = parseEditorialResearchPreparation(
      JSON.stringify(packetFixture()),
    );
    const draft = buildEditorialResearchDraft(
      preparation.candidates[0],
      preparation.sources,
    );
    const manual = {
      ...draft,
      slug: "human-reviewed-slug",
      biography: "Human-edited biography",
      originWork: "Human-reviewed origin work",
      aliases: [{ name: "Approved alias", sources: draft.nameSources }],
      characteristics: [{ name: "Approved trait", sources: draft.nameSources }],
    };
    const emptyFields = {
      ...manual,
      biography: "",
      biographySources: [],
      nameSources: [],
      franchiseSources: [],
    };

    expect(fillEmptyEditorialProfileFields(manual, draft)).toEqual(manual);
    expect(fillEmptyEditorialProfileFields(emptyFields, draft)).toEqual({
      ...manual,
      biography: draft.biography,
      biographySources: draft.biographySources,
      nameSources: draft.nameSources,
      franchiseSources: draft.franchiseSources,
    });
  });

  it("rejects approved or model-evidence-bearing packets", () => {
    const approvedCandidate = packetFixture();
    approvedCandidate.candidates[0].identityStatus = "approved" as never;
    expect(() =>
      parseEditorialResearchPreparation(JSON.stringify(approvedCandidate)),
    ).toThrow();

    const modelEvidence = packetFixture();
    modelEvidence.candidates[0].candidateModelLinks[0].independentModelEvidence =
      [{ url: "https://publisher.example/characters/hero" }] as never;
    expect(() =>
      parseEditorialResearchPreparation(JSON.stringify(modelEvidence)),
    ).toThrow();

    const published = packetFixture();
    published.policy.publicProjectionEligible = true;
    expect(() =>
      parseEditorialResearchPreparation(JSON.stringify(published)),
    ).toThrow();
  });

  it("rejects claims without known sources and local or non-HTTPS URLs", () => {
    const missingSource = packetFixture();
    missingSource.candidates[0].claims[0].sourceIds = ["missing-source"];
    expect(() =>
      parseEditorialResearchPreparation(JSON.stringify(missingSource)),
    ).toThrow();

    const unsafeSource = packetFixture();
    unsafeSource.sources[0].url = "http://localhost/source";
    expect(() =>
      parseEditorialResearchPreparation(JSON.stringify(unsafeSource)),
    ).toThrow();

    const privateNetworkSource = packetFixture();
    privateNetworkSource.sources[0].url = "https://192.168.1.12/source";
    expect(() =>
      parseEditorialResearchPreparation(JSON.stringify(privateNetworkSource)),
    ).toThrow();

    const unknownSourceKind = packetFixture();
    unknownSourceKind.sources[0].sourceKind = "unreviewed_claim";
    expect(() =>
      parseEditorialResearchPreparation(JSON.stringify(unknownSourceKind)),
    ).toThrow();

    const whitespaceUrl = packetFixture();
    whitespaceUrl.sources[0].url =
      "https://publisher.example/character\n/profile";
    expect(() =>
      parseEditorialResearchPreparation(JSON.stringify(whitespaceUrl)),
    ).toThrow();
  });
});
