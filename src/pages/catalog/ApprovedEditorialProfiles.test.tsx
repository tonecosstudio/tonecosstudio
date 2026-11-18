import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { describe, expect, it, vi } from "vitest";
import {
  ApprovedCharacterProfile,
  ApprovedUniverseProfile,
} from "./ApprovedEditorialProfiles";
import { createPublicCatalogGateway } from "@/services/catalog/public-catalog-gateway";
import type {
  PublicCatalogCharacterProfile,
  PublicCatalogUniverseProfile,
} from "@/services/catalog/public-catalog-gateway";

const source = {
  id: "official-reference",
  title: "Fonte editorial oficial",
  url: "https://publisher.example/character",
  kind: "official" as const,
};

const characterProfile: PublicCatalogCharacterProfile = {
  publication: {
    contractVersion: 1,
    editorialStatus: "approved",
    visibility: "public",
    revision: "test-revision",
    reviewedAt: "2026-11-17T12:00:00.000Z",
  },
  character: {
    id: "f13d17aa-0d14-4ac5-9543-84b2e7ce8476",
    slug: "zoro-one-piece",
    name: "Roronoa Zoro",
    aliases: [{ value: "Zoro", evidenceIds: [source.id] }],
    summary: "Resumo original revisado.",
    summaryEvidenceIds: [source.id],
    biography: "Biografia original revisada.",
    biographyEvidenceIds: [source.id],
    ageContext: {
      value: "21",
      context: "Fase pós-timeskip",
      evidenceIds: [source.id],
    },
    originWork: "One Piece",
    originWorkEvidenceIds: [source.id],
    mediaTypes: ["Anime", "Mangá"],
    characteristics: [
      { value: "Espadachim", evidenceIds: [source.id] },
      { value: "Determinado", evidenceIds: [source.id] },
    ],
    mediaTypeEvidenceIds: [source.id],
    identityEvidenceIds: [source.id],
  },
  universe: {
    id: "universe-one-piece",
    slug: "one-piece",
    name: "One Piece",
    categorySlug: "anime",
    evidenceIds: [source.id],
  },
  evidence: [source],
  sameCharacterModels: [
    {
      modelId: "mdl_zoro_01",
      slug: "one-piece-zoro-01",
      name: "Roronoa Zoro",
      variantName: "Posição de combate",
      coverStorageKey: "media/mdl_zoro_01/cover.webp",
      reviewStatus: "approved",
      evidenceIds: [source.id],
    },
  ],
  otherUniverseModels: [],
};

const universeProfile: PublicCatalogUniverseProfile = {
  publication: {
    contractVersion: 1,
    editorialStatus: "approved",
    visibility: "public",
    revision: "test-revision",
    reviewedAt: "2026-11-17T12:00:00.000Z",
  },
  universe: {
    id: "universe-one-piece",
    slug: "one-piece",
    name: "One Piece",
    categorySlug: "anime",
    mediaTypes: ["Anime", "Mangá"],
    summary: "Resumo revisado.",
    summaryEvidenceIds: [source.id],
    overview: "Visão geral revisada.",
    overviewEvidenceIds: [source.id],
    identityEvidenceIds: [source.id],
  },
  evidence: [source],
  characters: [
    {
      id: "f13d17aa-0d14-4ac5-9543-84b2e7ce8476",
      slug: "zoro-one-piece",
      name: "Roronoa Zoro",
      summary: "Resumo revisado.",
      reviewStatus: "approved",
      evidenceIds: [source.id],
    },
  ],
  models: [],
};

const gateway = createPublicCatalogGateway(
  "https://catalog.example.test/catalogo-api/",
  vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json({}),
  ),
);

describe("approved editorial profile views", () => {
  it("renders only supplied approved character data, citations and model links", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ApprovedCharacterProfile
            profile={characterProfile}
            gateway={gateway}
          />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "RORONOA ZORO" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Biografia original revisada."),
    ).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText(/Fase pós-timeskip/)).toBeInTheDocument();
    expect(screen.getByText("Características verificadas")).toBeInTheDocument();
    expect(screen.getByText("Espadachim")).toBeInTheDocument();
    expect(screen.getByText("Determinado")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Fonte editorial oficial" }),
    ).toHaveAttribute("href", source.url);
    expect(screen.getByText("Oficial")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Abrir modelo Roronoa Zoro/ }),
    ).toHaveAttribute("href", "/modelos/mdl_zoro_01");
  });

  it("labels every supported public evidence kind", () => {
    const kinds = [
      ["official", "Oficial"],
      ["primary", "Primária"],
      ["publisher", "Editora"],
      ["licensor", "Licenciante"],
      ["institution", "Instituição"],
      ["reputable_reference", "Referência confiável"],
      ["other", "Outra fonte"],
      ["catalog", "Catálogo"],
    ] as const;
    const profileWithAllKinds: PublicCatalogCharacterProfile = {
      ...characterProfile,
      evidence: kinds.map(([kind], index) => ({
        ...source,
        id: `evidence-${index}`,
        kind,
      })),
    };

    render(
      <HelmetProvider>
        <MemoryRouter>
          <ApprovedCharacterProfile
            profile={profileWithAllKinds}
            gateway={gateway}
          />
        </MemoryRouter>
      </HelmetProvider>,
    );

    for (const [, label] of kinds) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders contextual age without inventing a numeric value", () => {
    const contextOnlyProfile: PublicCatalogCharacterProfile = {
      ...characterProfile,
      character: {
        ...characterProfile.character,
        ageContext: {
          value: null,
          context: "A idade varia entre adaptações.",
          evidenceIds: [source.id],
        },
      },
    };
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ApprovedCharacterProfile profile={contextOnlyProfile} gateway={gateway} />
        </MemoryRouter>
      </HelmetProvider>,
    );

    const context = screen.getByText(/A idade varia entre adaptações/);
    expect(context).toHaveTextContent("A idade varia entre adaptações.");
    expect(context).not.toHaveTextContent("·");
  });

  it("hides related models with no image eligible through the canonical media gateway", () => {
    const profileWithoutEligibleMedia: PublicCatalogCharacterProfile = {
      ...characterProfile,
      sameCharacterModels: characterProfile.sameCharacterModels.map(
        (model) => ({
          ...model,
          coverStorageKey: null,
        }),
      ),
    };
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ApprovedCharacterProfile
            profile={profileWithoutEligibleMedia}
            gateway={gateway}
          />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(
      screen.queryByRole("heading", { name: "Mais modelos de Roronoa Zoro" }),
    ).not.toBeInTheDocument();
  });

  it("links universe characters through the existing contextual route helper", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ApprovedUniverseProfile
            profile={universeProfile}
            gateway={gateway}
          />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "One Piece" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roronoa Zoro" })).toHaveAttribute(
      "href",
      "/universo/anime/one-piece/zoro-one-piece",
    );
  });
});
