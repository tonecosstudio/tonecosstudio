/**
 * Collection Details Page - character select layout.
 *
 * The public collection view is driven by collection_characters. Catalog models
 * can back entries, but collection naming, imagery, release dates, and locks
 * remain presentation data owned by the collection.
 */

import { Link, useNavigate, useParams } from "react-router-dom";
import {
  type CollectionDetailsCharacter,
  useCollectionDetails,
} from "@/hooks/collections/usePublicCollections";
import { Page } from "@/components/layouts/Page";
import { ArcadeCTA } from "@/components/arcade/ArcadeLayout";
import {
  FloatingParticles,
  GlitchText,
} from "@/components/arcade/ArcadeEffects";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Crown, Eye, Lock, Package, Star } from "lucide-react";
import { PUBLIC_ROUTES, collectionCharacterDetailsPath } from "@/config/routes";
import { getCollectionBackdropUrl } from "@/lib/collection-assets";

const SILHOUETTE_PLACEHOLDER =
  "/assets/collections/character-silhouette-arcade.svg";
const LOCKED_PLACEHOLDER = "/assets/collections/character-locked-arcade.svg";
const MIN_COLLECTION_SLOT_COUNT = 12;

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const SHORT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

type Character = CollectionDetailsCharacter;

function parseLocalDate(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isCharacterUnlocked(character: Character) {
  if (character.unlock_override) return true;
  if (character.status === "released" || character.status === "available")
    return true;

  const releaseDate = parseLocalDate(character.release_date);
  return Boolean(releaseDate && releaseDate <= startOfToday());
}

function getReleaseSortValue(character: Character) {
  const releaseDate = parseLocalDate(character.release_date);
  if (releaseDate) return releaseDate.getTime();
  return (character.release_month ?? 99) * 100 + (character.release_order ?? 0);
}

function getReleaseLabel(character: Character) {
  const releaseDate = parseLocalDate(character.release_date);
  if (releaseDate) {
    return releaseDate.toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
  }

  if (character.release_month) {
    return MONTHS[character.release_month - 1] ?? null;
  }

  return null;
}

function getEditionDateLabel(character: Character | null) {
  const releaseDate = parseLocalDate(character?.release_date);
  const monthIndex =
    typeof character?.release_order === "number" && character.release_order > 0
      ? character.release_order - 1
      : typeof character?.release_month === "number" &&
          character.release_month > 0
        ? character.release_month - 1
        : 0;
  const month = SHORT_MONTHS[monthIndex] ?? SHORT_MONTHS[0];
  const year = String(releaseDate?.getFullYear() ?? 2026).slice(-2);

  return `${month} / ${year}`;
}

function getDetailsPath(character: Character, collectionSlug: string) {
  return (
    character.detail_url ||
    collectionCharacterDetailsPath(collectionSlug, character.id)
  );
}

function getLockedImage(lockVariant: "silhouette" | "locked") {
  return lockVariant === "silhouette"
    ? SILHOUETTE_PLACEHOLDER
    : LOCKED_PLACEHOLDER;
}

function getCharacterImage(
  character: Character,
  isLocked: boolean,
  lockVariant: "silhouette" | "locked",
) {
  if (isLocked) return getLockedImage(lockVariant);
  return character.image_url;
}

function CharacterSlotCard({
  character,
  index,
  isLocked,
  isSelected,
  lockVariant,
  collectionSlug,
  layout = "compact",
}: {
  character: Character;
  index: number;
  isLocked: boolean;
  isSelected: boolean;
  lockVariant: "silhouette" | "locked";
  collectionSlug: string;
  layout?: "compact" | "wide";
}) {
  const imageUrl = getCharacterImage(character, isLocked, lockVariant);
  const releaseLabel = getReleaseLabel(character);
  const detailsPath = getDetailsPath(character, collectionSlug);
  const layoutClass =
    layout === "wide"
      ? "collection-slot-card collection-slot-card--wide"
      : "collection-slot-card collection-slot-card--compact";
  const label = isLocked ? "???" : character.name;
  const statusLabel = isLocked
    ? lockVariant === "silhouette"
      ? "Próximo"
      : "Em breve"
    : releaseLabel || "Disponível";

  return (
    <Link
      to={isLocked ? "#" : detailsPath}
      onClick={(event) => isLocked && event.preventDefault()}
      className={`${layoutClass} group relative block overflow-hidden border bg-black transition-all duration-300 ${
        isLocked ? "cursor-not-allowed" : "hover:-translate-y-1"
      } ${
        isSelected
          ? "border-[hsl(var(--gold-accent))] shadow-[0_0_34px_hsl(var(--gold-accent)/0.22)]"
          : "border-[hsl(var(--gold-accent)/0.18)] hover:border-[hsl(var(--gold-accent)/0.65)]"
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={isLocked ? "Personagem bloqueado" : character.name}
          className={`absolute inset-0 h-full w-full object-contain p-2 transition-transform duration-700 ${
            isLocked
              ? "grayscale opacity-55"
              : "grayscale-[0.25] group-hover:scale-110"
          }`}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[hsl(0,0%,8%)]">
          <Package className="h-12 w-12 text-[hsl(0,0%,28%)]" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,3%)] via-[hsl(0,0%,3%)/0.35] to-transparent" />

      <div className="absolute left-3 top-3 font-mono text-base text-[hsl(var(--gold-accent))] opacity-90">
        {String(index + 1).padStart(2, "0")}
      </div>

      {isLocked && (
        <div className="absolute right-3 top-3 rounded-sm border border-[hsl(0,0%,22%)] bg-black/50 p-1">
          <Lock className="h-3.5 w-3.5 text-[hsl(0,0%,45%)]" />
        </div>
      )}

      <div className="absolute inset-x-3 bottom-3 text-center">
        <div
          className={`mx-auto mb-2 h-px max-w-24 ${
            isSelected
              ? "bg-[hsl(var(--gold-accent))]"
              : "bg-[hsl(var(--gold-accent)/0.24)]"
          }`}
        />
        <h3
          className={`truncate text-lg font-black uppercase tracking-[0.08em] ${
            isLocked ? "text-[hsl(0,0%,58%)]" : "text-[hsl(0,0%,92%)]"
          }`}
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
        >
          {label}
        </h3>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[hsl(0,0%,42%)]">
          {statusLabel}
        </p>
      </div>
    </Link>
  );
}

function PlaceholderSlotCard({ index }: { index: number }) {
  return (
    <div className="collection-slot-card collection-slot-card--compact relative block overflow-hidden border border-[hsl(var(--gold-accent)/0.14)] bg-black">
      <img
        src={LOCKED_PLACEHOLDER}
        alt=""
        className="absolute inset-0 h-full w-full object-contain p-3 grayscale opacity-45"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,3%)] via-[hsl(0,0%,3%)/0.4] to-transparent" />
      <div className="absolute left-3 top-3 font-mono text-base text-[hsl(var(--gold-accent))] opacity-70">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="absolute right-3 top-3 rounded-sm border border-[hsl(0,0%,22%)] bg-black/50 p-1">
        <Lock className="h-3.5 w-3.5 text-[hsl(0,0%,45%)]" />
      </div>
      <div className="absolute inset-x-3 bottom-3 text-center">
        <div className="mx-auto mb-2 h-px max-w-24 bg-[hsl(var(--gold-accent)/0.18)]" />
        <h3
          className="truncate text-lg font-black uppercase tracking-[0.08em] text-[hsl(0,0%,58%)]"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
        >
          ???
        </h3>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[hsl(0,0%,42%)]">
          A revelar
        </p>
      </div>
    </div>
  );
}

function EmptyCollectionState({ onBack }: { onBack: () => void }) {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="text-center">
        <Package className="mx-auto mb-4 h-16 w-16 text-[hsl(0,0%,25%)]" />
        <h1
          className="mb-4 text-3xl font-black uppercase tracking-[0.1em]"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
        >
          Coleção sem personagens
        </h1>
        <button
          onClick={onBack}
          className="border border-[hsl(var(--gold-accent)/0.4)] px-6 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.1)]"
        >
          Voltar para coleções
        </button>
      </div>
    </section>
  );
}

export default function CollectionDetailsArcade() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: collection, isLoading } = useCollectionDetails(slug);

  if (isLoading) {
    return (
      <Page title="Carregando..." description="Carregando coleção">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <Skeleton className="mb-8 h-10 w-48 bg-[hsl(0,0%,10%)]" />
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Skeleton className="min-h-[620px] bg-[hsl(0,0%,10%)]" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[...Array(8)].map((_, index) => (
                <Skeleton
                  key={index}
                  className="min-h-[190px] bg-[hsl(0,0%,10%)]"
                />
              ))}
            </div>
          </div>
        </div>
      </Page>
    );
  }

  if (!collection) {
    return (
      <Page title="Coleção não encontrada" description="Coleção não encontrada">
        <EmptyCollectionState
          onBack={() => navigate(PUBLIC_ROUTES.collections)}
        />
      </Page>
    );
  }

  const safeCharacters = Array.isArray(collection.collection_characters)
    ? collection.collection_characters.filter(
        (character): character is Character =>
          Boolean(character && character.id && character.name),
      )
    : [];

  const catalogCharacters = safeCharacters.filter(
    (character) => character.is_catalog === true,
  );
  const monthlyCharacters = safeCharacters
    .filter((character) => character.is_catalog !== true)
    .sort((a, b) => getReleaseSortValue(a) - getReleaseSortValue(b));
  const usesReleaseSchedule = monthlyCharacters.length > 0;
  const selectorCharacters = usesReleaseSchedule
    ? monthlyCharacters
    : catalogCharacters;
  const unlockedCharacters = usesReleaseSchedule
    ? monthlyCharacters.filter(isCharacterUnlocked)
    : selectorCharacters;
  const lockedCharacters = usesReleaseSchedule
    ? monthlyCharacters.filter((character) => !isCharacterUnlocked(character))
    : [];
  const nextLockedCharacterId = lockedCharacters[0]?.id;
  const featuredCharacter =
    unlockedCharacters[0] || selectorCharacters[0] || null;
  const featuredIsLocked = Boolean(
    featuredCharacter &&
    usesReleaseSchedule &&
    !isCharacterUnlocked(featuredCharacter),
  );
  const featuredLockVariant =
    featuredCharacter?.id === nextLockedCharacterId ? "silhouette" : "locked";
  const featuredImageUrl = featuredCharacter
    ? getCharacterImage(
        featuredCharacter,
        featuredIsLocked,
        featuredLockVariant,
      )
    : collection.cover_image_url;
  const collectionBackdropUrl = getCollectionBackdropUrl(
    collection.slug,
    collection.cover_image_url,
  );
  const availableCount = unlockedCharacters.length;
  const totalCount = Math.max(
    selectorCharacters.length,
    MIN_COLLECTION_SLOT_COUNT,
  );
  const progress =
    totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;
  const showCatalogSection =
    usesReleaseSchedule && catalogCharacters.length > 0;
  const displayedSlotCount = Math.max(
    selectorCharacters.length,
    MIN_COLLECTION_SLOT_COUNT,
  );
  const placeholderSlotIndexes = Array.from(
    {
      length: Math.max(0, displayedSlotCount - selectorCharacters.length),
    },
    (_, index) => selectorCharacters.length + index,
  );

  return (
    <Page
      title={`${collection.name} | Coleção`}
      description={
        collection.description ||
        `Coleção ${collection.name} - Personagens exclusivos`
      }
    >
      <section className="collection-select-shell relative overflow-hidden border-b border-[hsl(var(--gold-accent)/0.12)] bg-[hsl(0,0%,3%)]">
        <FloatingParticles />

        <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-none flex-col px-0 py-0">
          <div className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 md:px-8 lg:px-10">
            <button
              onClick={() => navigate(PUBLIC_ROUTES.collections)}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(0,0%,48%)] transition-colors hover:text-[hsl(var(--gold-accent))]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Coleções
            </button>
            <div className="hidden items-center gap-2 border border-[hsl(var(--gold-accent)/0.28)] px-3 py-1.5 text-[hsl(var(--gold-accent))] md:flex">
              <Crown className="h-3.5 w-3.5" />
              <span
                className="text-[8px] uppercase tracking-[0.28em]"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                Coleção
              </span>
            </div>
          </div>

          {selectorCharacters.length === 0 ? (
            <EmptyCollectionState
              onBack={() => navigate(PUBLIC_ROUTES.collections)}
            />
          ) : (
            <div className="collection-select-grid flex-1">
              <div className="collection-hero-stage relative overflow-hidden bg-transparent">
                {collectionBackdropUrl && (
                  <div
                    className="absolute inset-0 bg-center bg-no-repeat opacity-85"
                    style={{
                      backgroundImage: `url(${collectionBackdropUrl})`,
                      backgroundSize: "min(96%, 1040px) auto",
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(0,0%,3%)/0.94] via-[hsl(0,0%,3%)/0.5] to-[hsl(0,0%,3%)/0.08]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,3%)/0.8] via-transparent to-[hsl(0,0%,3%)/0.36]" />

                <div className="collection-hero-content">
                  <div className="collection-hero-copy relative z-10 flex flex-col justify-center">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 text-[hsl(var(--gold-accent))]">
                        <Star className="h-3 w-3" />
                        <span className="font-mono text-[8px] uppercase tracking-[0.18em]">
                          Personagem do mês
                        </span>
                      </span>
                    </div>

                    <h1
                      className="mb-4 break-words text-[2rem] font-black uppercase leading-none tracking-[0.04em] text-[hsl(0,0%,92%)] sm:text-5xl sm:tracking-[0.08em] md:text-6xl lg:text-5xl xl:text-7xl 2xl:text-8xl"
                      style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                    >
                      <GlitchText
                        text={
                          featuredIsLocked
                            ? "???"
                            : featuredCharacter?.name || collection.name
                        }
                      />
                    </h1>

                    {featuredCharacter && !featuredIsLocked && (
                      <Link
                        to={getDetailsPath(featuredCharacter, collection.slug)}
                        className="mt-2 inline-flex w-fit items-center gap-3 border border-[hsl(var(--gold-accent)/0.82)] bg-[hsl(var(--gold-accent)/0.06)] px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] shadow-[0_0_28px_hsl(var(--gold-accent)/0.18)] transition-colors hover:bg-[hsl(var(--gold-accent)/0.14)]"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalhes
                      </Link>
                    )}

                    <div className="mt-8 w-fit font-mono uppercase tracking-[0.16em] sm:mt-12 xl:mt-16">
                      <span className="text-[10px] font-semibold text-[hsl(0,0%,80%)]">
                        Edição
                      </span>
                      <span className="mt-1 block text-4xl leading-none text-[hsl(var(--gold-accent))] drop-shadow-[0_0_14px_hsl(var(--gold-accent)/0.28)] sm:text-5xl">
                        {String(featuredCharacter?.release_order || 1).padStart(
                          2,
                          "0",
                        )}
                      </span>
                      <span className="mt-3 block whitespace-nowrap text-[10px] font-semibold normal-case tracking-[0.24em] text-[hsl(0,0%,88%)] drop-shadow-[0_0_10px_hsl(0,0%,100%/0.12)]">
                        {getEditionDateLabel(featuredCharacter)}
                      </span>
                    </div>
                  </div>

                  <div className="collection-hero-figure-panel">
                    {featuredImageUrl ? (
                      <img
                        src={featuredImageUrl}
                        alt={
                          featuredIsLocked
                            ? "Personagem bloqueado"
                            : featuredCharacter?.name || collection.name
                        }
                        className={`collection-featured-figure transition-transform duration-700 ${
                          featuredIsLocked
                            ? "grayscale opacity-55"
                            : "collection-featured-figure--unlocked"
                        }`}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <Package className="h-24 w-24 text-[hsl(0,0%,22%)]" />
                    )}
                  </div>
                </div>
              </div>

              <aside className="collection-selector-panel relative flex flex-col border-t border-[hsl(var(--gold-accent)/0.14)] bg-[hsl(0_0%_5%/0.92)] py-6 lg:border-l lg:border-t-0 lg:py-4">
                <div className="mb-3 text-center lg:mb-3">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--gold-accent))]">
                    Coleção {collection.name}
                  </p>
                  <h2
                    className="mx-auto max-w-[18rem] text-2xl font-black uppercase tracking-[0.08em] text-[hsl(0,0%,90%)] sm:max-w-none sm:text-3xl sm:tracking-[0.12em] xl:text-4xl"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                  >
                    Selecione um personagem
                  </h2>
                </div>

                <div className="collection-slot-grid grid gap-2 sm:gap-3 xl:gap-4">
                  {selectorCharacters.map((character, index) => {
                    const isLocked =
                      usesReleaseSchedule && !isCharacterUnlocked(character);
                    const lockVariant =
                      character.id === nextLockedCharacterId
                        ? "silhouette"
                        : "locked";

                    return (
                      <CharacterSlotCard
                        key={character.id}
                        character={character}
                        index={index}
                        isLocked={isLocked}
                        isSelected={
                          character.id === featuredCharacter?.id && !isLocked
                        }
                        lockVariant={lockVariant}
                        collectionSlug={collection.slug}
                      />
                    );
                  })}

                  {placeholderSlotIndexes.map((index) => (
                    <PlaceholderSlotCard
                      key={`placeholder-${index}`}
                      index={index}
                    />
                  ))}
                </div>

                <div className="mt-4 grid gap-3 border border-[hsl(var(--gold-accent)/0.16)] bg-[hsl(0_0%_6%/0.72)] p-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,48%)]">
                      <span>Desbloqueados</span>
                      <span className="text-[hsl(0,0%,72%)]">
                        {String(availableCount).padStart(2, "0")} /{" "}
                        {String(totalCount).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden bg-[hsl(0,0%,14%)]">
                      <div
                        className="h-full bg-[hsl(var(--gold-accent))] shadow-[0_0_18px_hsl(var(--gold-accent)/0.55)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    to={PUBLIC_ROUTES.collections}
                    className="inline-flex items-center justify-center gap-3 border border-[hsl(var(--gold-accent)/0.35)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)]"
                  >
                    Ver coleções
                    <Crown className="h-4 w-4" />
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      {showCatalogSection && (
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-6 flex items-center gap-4">
            <h2
              className="text-2xl font-black uppercase tracking-[0.12em] text-[hsl(var(--gold-accent))]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              Modelos da coleção
            </h2>
            <span className="border border-[hsl(var(--gold-accent)/0.35)] px-2 py-0.5 font-mono text-[10px] text-[hsl(var(--gold-accent))]">
              {catalogCharacters.length}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-[hsl(var(--gold-accent)/0.2)] to-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {catalogCharacters.map((character, index) => (
              <CharacterSlotCard
                key={character.id}
                character={character}
                index={index}
                isLocked={false}
                isSelected={false}
                lockVariant="locked"
                collectionSlug={collection.slug}
              />
            ))}
          </div>
        </section>
      )}

      <ArcadeCTA
        badge="Assine Agora"
        title="JUNTE-SE AO CLUBE"
        description="Assine e tenha acesso exclusivo aos personagens desta coleção com preços especiais."
        primaryAction={{
          label: "Ver Planos",
          href: PUBLIC_ROUTES.plans,
          icon: <Crown className="h-4 w-4" />,
        }}
        secondaryAction={{
          label: "Ver Coleções",
          href: PUBLIC_ROUTES.collections,
        }}
      />
    </Page>
  );
}
