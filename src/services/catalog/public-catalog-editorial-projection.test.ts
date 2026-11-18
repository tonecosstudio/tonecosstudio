import { describe, expect, it, vi } from "vitest";
import { createPublicCatalogGateway } from "./public-catalog-gateway";

const characterProjection = () => ({
  publication: {
    contractVersion: 1,
    editorialStatus: "approved",
    visibility: "public",
    revision: "editorial-17",
    reviewedAt: "2026-11-16T14:00:00.000Z",
  },
  character: {
    id: "f13d17aa-0d14-4ac5-9543-84b2e7ce8476",
    slug: "zoro-one-piece",
    name: "Roronoa Zoro",
    aliases: [{ value: "Zoro", evidenceIds: ["official-one-piece"] }],
    summary: "Resumo editorial original.",
    summaryEvidenceIds: ["official-one-piece"],
    biography: "Biografia editorial revisada.",
    biographyEvidenceIds: ["official-one-piece"],
    ageContext: {
      value: "21",
      context: "Fase pós-timeskip",
      evidenceIds: ["official-one-piece"],
    },
    originWork: "One Piece",
    originWorkEvidenceIds: ["official-one-piece"],
    mediaTypes: ["Anime", "Mangá"],
    mediaTypeEvidenceIds: ["official-one-piece"],
    identityEvidenceIds: ["official-one-piece"],
  },
  universe: {
    id: "universe-one-piece",
    slug: "one-piece",
    name: "One Piece",
    categorySlug: "anime",
    evidenceIds: ["official-one-piece"],
  },
  evidence: [
    {
      id: "official-one-piece",
      title: "Fonte oficial de One Piece",
      url: "https://www.onepiece.example/characters/zoro",
      kind: "official",
    },
    {
      id: "catalog-model",
      title: "Registro público do modelo",
      url: "https://tonartstudio.com.br/modelos/one-piece-zoro",
      kind: "catalog",
    },
  ],
  sameCharacterModels: [
    {
      modelId: "mdl_zoro_01",
      slug: "one-piece-zoro-01",
      name: "Roronoa Zoro",
      variantName: "Posição de combate",
      coverStorageKey: "media/mdl_zoro_01/cover.webp",
      reviewStatus: "approved",
      evidenceIds: ["official-one-piece", "catalog-model"],
    },
  ],
  otherUniverseModels: [],
});

const universeProjection = () => ({
  publication: {
    contractVersion: 1,
    editorialStatus: "approved",
    visibility: "public",
    revision: "universe-5",
    reviewedAt: "2026-11-16T14:00:00.000Z",
  },
  universe: {
    id: "universe-one-piece",
    slug: "one-piece",
    name: "One Piece",
    categorySlug: "anime",
    mediaTypes: ["Anime", "Mangá"],
    summary: "Resumo revisado.",
    summaryEvidenceIds: ["official-one-piece"],
    overview: "Visão editorial revisada.",
    overviewEvidenceIds: ["official-one-piece"],
    identityEvidenceIds: ["official-one-piece"],
  },
  evidence: [
    {
      id: "official-one-piece",
      title: "Fonte oficial de One Piece",
      url: "https://www.onepiece.example/",
      kind: "publisher",
    },
  ],
  characters: [
    {
      id: "f13d17aa-0d14-4ac5-9543-84b2e7ce8476",
      slug: "zoro-one-piece",
      name: "Roronoa Zoro",
      summary: "Resumo revisado.",
      reviewStatus: "approved",
      evidenceIds: ["official-one-piece"],
    },
  ],
  models: [],
});

function gatewayFor(payload: unknown) {
  const fetcher = vi.fn(async () => Response.json(payload));
  return {
    gateway: createPublicCatalogGateway(
      "https://catalog.example.test/catalogo-api/",
      fetcher,
    ),
    fetcher,
  };
}

describe("public catalog editorial projection contract", () => {
  it("searches only approved characters and validates alias/franchise evidence", async () => {
    const profile = characterProjection();
    const result = {
      publication: profile.publication,
      character: {
        id: profile.character.id,
        slug: profile.character.slug,
        name: profile.character.name,
        aliases: profile.character.aliases,
        summary: profile.character.summary,
        summaryEvidenceIds: profile.character.summaryEvidenceIds,
        identityEvidenceIds: profile.character.identityEvidenceIds,
      },
      universe: {
        id: profile.universe.id,
        slug: profile.universe.slug,
        name: profile.universe.name,
        categorySlug: profile.universe.categorySlug,
        evidenceIds: profile.universe.evidenceIds,
      },
      evidence: profile.evidence,
      matchedBy: "alias",
    };
    const { gateway, fetcher } = gatewayFor({
      items: [result],
      truncated: false,
    });
    const page = await gateway.searchCharacters("  Zoro  ");

    expect(page.items[0].character.aliases[0].value).toBe("Zoro");
    expect(page.items[0].matchedBy).toBe("alias");
    const [url] = fetcher.mock.calls[0] as unknown as [string];
    expect(new URL(url).pathname).toBe(
      "/catalogo-api/api/editorial/v1/characters/search",
    );
    expect(new URL(url).searchParams.get("q")).toBe("Zoro");
    expect(new URL(url).searchParams.get("limit")).toBe("8");
  });

  it("rejects invalid character search windows and unapproved or unsupported matches", async () => {
    const { gateway, fetcher } = gatewayFor({ items: [], truncated: false });
    await expect(gateway.searchCharacters("ab")).rejects.toThrow(
      "catalog_character_search_length_invalid",
    );
    await expect(gateway.searchCharacters("valid", 13)).rejects.toThrow(
      "catalog_character_search_limit_invalid",
    );
    expect(fetcher).not.toHaveBeenCalled();

    const profile = characterProjection();
    const match = {
      publication: { ...profile.publication, editorialStatus: "draft" },
      character: {
        id: profile.character.id,
        slug: profile.character.slug,
        name: profile.character.name,
        aliases: [],
        summary: null,
        identityEvidenceIds: profile.character.identityEvidenceIds,
      },
      universe: {
        id: profile.universe.id,
        slug: profile.universe.slug,
        name: profile.universe.name,
        categorySlug: profile.universe.categorySlug,
        evidenceIds: profile.universe.evidenceIds,
      },
      evidence: profile.evidence,
      matchedBy: "name",
    };
    await expect(
      gatewayFor({ items: [match], truncated: false }).gateway.searchCharacters(
        "Roronoa",
      ),
    ).rejects.toThrow("catalog_editorial_projection_not_approved");
  });

  it("loads and validates an approved character profile through the existing catalog gateway", async () => {
    const { gateway, fetcher } = gatewayFor(characterProjection());
    const profile = await gateway.getCharacterProfile(
      "zoro-one-piece",
      undefined,
      {
        categorySlug: "anime",
        franchiseSlug: "one-piece",
      },
    );

    expect(profile.character.name).toBe("Roronoa Zoro");
    expect(profile.sameCharacterModels).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(
      "https://catalog.example.test/catalogo-api/api/editorial/v1/characters/zoro-one-piece",
      expect.objectContaining({
        method: "GET",
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("fails closed for unapproved, unsupported, mismatched or weakly sourced character data", async () => {
    const unapproved = characterProjection();
    unapproved.publication.editorialStatus = "draft";
    await expect(
      gatewayFor(unapproved).gateway.getCharacterProfile("zoro-one-piece"),
    ).rejects.toThrow("catalog_editorial_projection_not_approved");

    const missingIdentityEvidence = characterProjection();
    missingIdentityEvidence.character.identityEvidenceIds = ["catalog-model"];
    await expect(
      gatewayFor(missingIdentityEvidence).gateway.getCharacterProfile(
        "zoro-one-piece",
      ),
    ).rejects.toThrow(
      "catalog_editorial_character_identity_evidence_needs_independent_evidence",
    );

    await expect(
      gatewayFor(characterProjection()).gateway.getCharacterProfile(
        "zoro-one-piece",
        undefined,
        {
          categorySlug: "anime",
          franchiseSlug: "naruto",
        },
      ),
    ).rejects.toThrow("catalog_character_universe_context_mismatch");

    const original = characterProjection();
    const duplicateRelatedModel = {
      ...characterProjection(),
      otherUniverseModels: [{ ...original.sameCharacterModels[0] }],
    };
    await expect(
      gatewayFor(duplicateRelatedModel).gateway.getCharacterProfile(
        "zoro-one-piece",
      ),
    ).rejects.toThrow("duplicate_catalog_editorial_related_model");
  });

  it("requires source URLs over HTTPS and independent citations for biographical and age claims", async () => {
    const insecure = characterProjection();
    insecure.evidence[0].url = "http://publisher.example/character";
    await expect(
      gatewayFor(insecure).gateway.getCharacterProfile("zoro-one-piece"),
    ).rejects.toThrow("invalid_catalog_editorial_evidence_url");

    const unsupportedAge = characterProjection();
    unsupportedAge.character.ageContext.evidenceIds = ["catalog-model"];
    await expect(
      gatewayFor(unsupportedAge).gateway.getCharacterProfile("zoro-one-piece"),
    ).rejects.toThrow(
      "catalog_editorial_character_age_evidence_needs_independent_evidence",
    );
  });

  it("loads a universe profile from the category-scoped canonical projection route", async () => {
    const { gateway, fetcher } = gatewayFor(universeProjection());
    const profile = await gateway.getUniverseProfile("anime", "one-piece");

    expect(profile.characters[0].slug).toBe("zoro-one-piece");
    expect(fetcher).toHaveBeenCalledWith(
      "https://catalog.example.test/catalogo-api/api/editorial/v1/universes/anime/one-piece",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects universe context drift and character rows without approved evidence", async () => {
    const wrongScope = universeProjection();
    wrongScope.universe.categorySlug = "games";
    await expect(
      gatewayFor(wrongScope).gateway.getUniverseProfile("anime", "one-piece"),
    ).rejects.toThrow("catalog_universe_scope_mismatch");

    const unreviewedCharacter = universeProjection();
    unreviewedCharacter.characters[0].reviewStatus = "suggested";
    await expect(
      gatewayFor(unreviewedCharacter).gateway.getUniverseProfile(
        "anime",
        "one-piece",
      ),
    ).rejects.toThrow("catalog_universe_character_not_approved");
  });
});
