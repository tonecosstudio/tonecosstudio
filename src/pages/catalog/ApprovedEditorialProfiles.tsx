import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, ExternalLink } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { ArcadeCard, ArcadeHero } from "@/components/arcade/ArcadeLayout";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import {
  PUBLIC_ROUTES,
  catalogModelDetailsPath,
  catalogUniverseCharacterPath,
  catalogUniverseFranchisePath,
} from "@/config/routes";
import type {
  PublicCatalogCharacterProfile,
  PublicCatalogEditorialEvidence,
  PublicCatalogEditorialModelReference,
  PublicCatalogUniverseProfile,
} from "@/services/catalog/public-catalog-gateway";

type CatalogGateway = ReturnType<
  typeof import("@/services/catalog/public-catalog-gateway").createPublicCatalogGateway
>;

function EditorialSources({
  sources,
}: {
  sources: PublicCatalogEditorialEvidence[];
}) {
  if (sources.length === 0) return null;
  const sourceKindLabel = {
    official: "Oficial",
    primary: "Primária",
    publisher: "Editora",
    catalog: "Catálogo",
  } as const;
  return (
    <details className="border-t border-[hsl(0,0%,18%)] pt-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-[hsl(0,0%,74%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        Fontes editoriais
      </summary>
      <ul className="space-y-2 pb-3 text-sm">
        {sources.map((source) => (
          <li key={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span>{source.title}</span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            <span className="ml-2 text-xs text-[hsl(0,0%,55%)]">
              {sourceKindLabel[source.kind]}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function EditorialModelSection({
  title,
  models,
  gateway,
}: {
  title: string;
  models: PublicCatalogEditorialModelReference[];
  gateway: CatalogGateway;
}) {
  const eligibleModels = models.filter((model) =>
    gateway.mediaUrl(model.coverStorageKey),
  );
  if (eligibleModels.length === 0) return null;
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-[0.08em] text-[hsl(var(--gold-accent))]">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {eligibleModels.map((model) => (
          <ArcadeCard key={model.modelId}>
            <Link
              to={catalogModelDetailsPath(model.modelId, model.slug)}
              className="group block h-full min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
              aria-label={`Abrir modelo ${model.name}${model.variantName ? ` — ${model.variantName}` : ""}`}
            >
              <div className="aspect-[3/4] overflow-hidden bg-[hsl(0,0%,9%)]">
                <CanonicalCatalogImage
                  src={gateway.mediaUrl(model.coverStorageKey)}
                  alt={`Referência visual de ${model.name}`}
                  imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                  loading="lazy"
                  fetchPriority="low"
                  fallbackLabel="Imagem indisponível"
                />
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-[hsl(0,0%,94%)]">
                  {model.name}
                </p>
                {model.variantName ? (
                  <p className="mt-1 line-clamp-1 text-xs text-[hsl(0,0%,56%)]">
                    {model.variantName}
                  </p>
                ) : null}
                <span className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-mono uppercase text-[hsl(var(--gold-accent))]">
                  Ver modelo <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          </ArcadeCard>
        ))}
      </div>
    </section>
  );
}

export function ApprovedCharacterProfile({
  profile,
  gateway,
}: {
  profile: PublicCatalogCharacterProfile;
  gateway: CatalogGateway;
}) {
  const { character, universe } = profile;
  const universePath = catalogUniverseFranchisePath(
    universe.categorySlug,
    universe.slug,
  );
  return (
    <Page
      title={`${character.name} — personagem | TONART Studio`}
      description={
        character.summary ?? `Ficha editorial revisada de ${character.name}.`
      }
      keywords={["TONART", character.name, universe.name, "personagem"]}
    >
      <main className="min-h-[70vh] bg-[hsl(0,0%,4%)] pb-20 text-[hsl(0,0%,94%)]">
        <ArcadeHero
          badge="FICHA EDITORIAL"
          title={character.name.toLocaleUpperCase("pt-BR")}
          subtitle={
            character.summary ?? `Personagem do universo ${universe.name}.`
          }
          stats={[]}
          compact
        />
        <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 pt-8 md:px-6">
          <nav
            aria-label="Trilha da ficha"
            className="flex flex-wrap items-center gap-3 text-sm"
          >
            <Link
              className="inline-flex min-h-11 items-center text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline-2"
              to={PUBLIC_ROUTES.catalog}
            >
              Universo
            </Link>
            <span aria-hidden="true" className="text-[hsl(0,0%,48%)]">
              /
            </span>
            <Link
              className="inline-flex min-h-11 items-center text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline-2"
              to={universePath}
            >
              {universe.name}
            </Link>
          </nav>

          <ArcadeCard>
            <section
              aria-labelledby="character-profile-heading"
              className="space-y-5 p-5 sm:p-7"
            >
              <h2
                id="character-profile-heading"
                className="flex items-center gap-3 text-lg font-semibold uppercase tracking-[0.08em] text-[hsl(var(--gold-accent))]"
              >
                <BookOpen size={18} aria-hidden="true" /> Perfil
              </h2>
              {character.biography ? (
                <div className="space-y-4 text-sm leading-relaxed text-[hsl(0,0%,78%)]">
                  {character.summary ? (
                    <p className="font-medium text-[hsl(0,0%,92%)]">
                      {character.summary}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-line">{character.biography}</p>
                </div>
              ) : character.summary ? (
                <p className="text-sm leading-relaxed text-[hsl(0,0%,78%)]">
                  {character.summary}
                </p>
              ) : null}

              <dl className="grid gap-4 border-y border-[hsl(0,0%,18%)] py-4 text-sm sm:grid-cols-2">
                {character.originWork ? (
                  <div>
                    <dt className="text-xs font-mono uppercase text-[hsl(0,0%,54%)]">
                      Obra de origem
                    </dt>
                    <dd className="mt-1">{character.originWork}</dd>
                  </div>
                ) : null}
                {character.mediaTypes.length > 0 ? (
                  <div>
                    <dt className="text-xs font-mono uppercase text-[hsl(0,0%,54%)]">
                      Meios
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {character.mediaTypes.map((type) => (
                        <span
                          key={type}
                          className="border border-[hsl(var(--gold-accent)/0.35)] px-2 py-1 text-xs"
                        >
                          {type}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
                {character.characteristics.length > 0 ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-mono uppercase text-[hsl(0,0%,54%)]">
                      Características verificadas
                    </dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {character.characteristics.map((claim) => (
                        <span
                          key={claim.value}
                          className="border border-[hsl(var(--gold-accent)/0.35)] px-2.5 py-1.5 text-xs text-[hsl(0,0%,82%)]"
                        >
                          {claim.value}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
                {character.ageContext ? (
                  <div>
                    <dt className="text-xs font-mono uppercase text-[hsl(0,0%,54%)]">
                      Idade contextual
                    </dt>
                    <dd className="mt-1">
                      {character.ageContext.value}{" "}
                      <span className="text-[hsl(0,0%,58%)]">
                        · {character.ageContext.context}
                      </span>
                    </dd>
                  </div>
                ) : null}
                {character.aliases.length > 0 ? (
                  <div>
                    <dt className="text-xs font-mono uppercase text-[hsl(0,0%,54%)]">
                      Nomes alternativos revisados
                    </dt>
                    <dd className="mt-1">
                      {character.aliases.map((alias) => alias.value).join(", ")}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <EditorialSources sources={profile.evidence} />
            </section>
          </ArcadeCard>

          <EditorialModelSection
            title={`Mais modelos de ${character.name}`}
            models={profile.sameCharacterModels}
            gateway={gateway}
          />
          <EditorialModelSection
            title={`Explore ${universe.name}`}
            models={profile.otherUniverseModels}
            gateway={gateway}
          />
        </div>
      </main>
    </Page>
  );
}

export function ApprovedUniverseProfile({
  profile,
  gateway,
}: {
  profile: PublicCatalogUniverseProfile;
  gateway: CatalogGateway;
}) {
  const { universe } = profile;
  return (
    <section
      aria-labelledby="universe-profile-heading"
      className="mb-8 space-y-6"
    >
      <ArcadeCard>
        <div className="space-y-5 p-5 sm:p-7">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">
              FICHA DE UNIVERSO · REVISADA
            </p>
            <h2
              id="universe-profile-heading"
              className="text-2xl font-bold uppercase tracking-[0.06em] text-[hsl(var(--gold-accent))]"
            >
              {universe.name}
            </h2>
          </div>
          {universe.summary ? (
            <p className="text-sm leading-relaxed text-[hsl(0,0%,78%)]">
              {universe.summary}
            </p>
          ) : null}
          {universe.overview ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-[hsl(0,0%,72%)]">
              {universe.overview}
            </p>
          ) : null}
          {universe.mediaTypes.length > 0 ? (
            <div aria-label="Meios revisados" className="flex flex-wrap gap-2">
              {universe.mediaTypes.map((type) => (
                <span
                  key={type}
                  className="border border-[hsl(var(--gold-accent)/0.35)] px-2 py-1 text-xs"
                >
                  {type}
                </span>
              ))}
            </div>
          ) : null}
          {profile.characters.length > 0 ? (
            <section aria-label={`Personagens de ${universe.name}`}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[hsl(var(--gold-accent))]">
                Personagens revisados
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.characters.map((character) => (
                  <li key={character.id}>
                    <Link
                      to={catalogUniverseCharacterPath(
                        universe.categorySlug,
                        universe.slug,
                        character.slug,
                      )}
                      className="flex min-h-12 items-center justify-between gap-3 border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,7%)] px-4 py-3 text-sm transition-colors hover:border-[hsl(var(--gold-accent)/0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                    >
                      <span>{character.name}</span>
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <EditorialSources sources={profile.evidence} />
        </div>
      </ArcadeCard>
      <EditorialModelSection
        title={`Modelos de ${universe.name}`}
        models={profile.models}
        gateway={gateway}
      />
    </section>
  );
}
