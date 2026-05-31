import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Calendar,
  Crown,
  Package,
  Shield,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import {
  type RelatedCharacter,
  useCharacterDetails,
  useRelatedCharacters,
} from "@/hooks/collections/usePublicCollections";
import { Page } from "@/components/layouts/Page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PUBLIC_ROUTES,
  collectionCharacterDetailsPath,
  collectionDetailsPath,
} from "@/config/routes";
import { getCollectionBackdropUrl } from "@/lib/collection-assets";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Em breve",
  revealed: "Revelado",
  released: "Disponível",
  available: "Disponível",
  archived: "Arquivado",
};

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

function uniqueImages(urls: Array<string | null | undefined>) {
  return Array.from(
    new Set(urls.filter((url): url is string => Boolean(url?.trim()))),
  );
}

function parseLocalDate(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatReleaseLabel(
  releaseDate: string | null | undefined,
  releaseMonth: number | null | undefined,
) {
  const date = parseLocalDate(releaseDate);
  if (date) {
    return date.toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
  }

  if (releaseMonth && MONTHS[releaseMonth - 1]) {
    return MONTHS[releaseMonth - 1];
  }

  return "A definir";
}

function formatMoneyFromCents(value: number | null | undefined) {
  if (!value) return "Sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getBuyCharacterPath(slug: string, characterId: string) {
  return `${PUBLIC_ROUTES.buyCharacter.replace(
    ":slug",
    encodeURIComponent(slug),
  )}?character=${encodeURIComponent(characterId)}`;
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="border-l border-[hsl(var(--gold-accent)/0.18)] px-4 py-2 first:border-l-0">
      <Icon className="mx-auto mb-2 h-5 w-5 text-[hsl(var(--gold-accent))]" />
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent)/0.7)]">
        {label}
      </p>
      <p className="mt-1 text-center text-xs uppercase tracking-[0.12em] text-[hsl(0,0%,82%)]">
        {value}
      </p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4 text-xs">
      <span className="font-mono uppercase tracking-[0.18em] text-[hsl(0,0%,58%)]">
        {label}
      </span>
      <span className="uppercase tracking-[0.08em] text-[hsl(0,0%,86%)]">
        {value}
      </span>
    </div>
  );
}

function GalleryStrip({
  images,
  activeImage,
  characterName,
  onSelect,
}: {
  images: string[];
  activeImage: string | null;
  characterName: string;
  onSelect: (image: string) => void;
}) {
  if (images.length <= 1) return null;

  return (
    <section className="border border-[hsl(var(--gold-accent)/0.16)] bg-black/35 p-3">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[hsl(var(--gold-accent))]">
        Galeria
      </h2>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {images.map((image, index) => {
          const isActive = image === activeImage;

          return (
            <button
              key={image}
              type="button"
              onClick={() => onSelect(image)}
              className={`aspect-square overflow-hidden border bg-[hsl(0,0%,4%)] transition-all ${
                isActive
                  ? "border-[hsl(var(--gold-accent))] shadow-[0_0_18px_hsl(var(--gold-accent)/0.2)]"
                  : "border-[hsl(var(--gold-accent)/0.22)] opacity-70 hover:opacity-100"
              }`}
              aria-label={`Ver foto ${index + 1} de ${characterName}`}
            >
              <img
                src={image}
                alt={`${characterName} - foto ${index + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RelatedCharacterCard({
  character,
  collectionSlug,
}: {
  character: RelatedCharacter;
  collectionSlug: string;
}) {
  return (
    <Link
      to={collectionCharacterDetailsPath(collectionSlug, character.id)}
      className="group block border border-[hsl(var(--gold-accent)/0.16)] bg-black/55 transition-colors hover:border-[hsl(var(--gold-accent)/0.7)]"
    >
      <div className="aspect-[3/4] bg-[hsl(0,0%,5%)]">
        {character.image_url ? (
          <img
            src={character.image_url}
            alt={character.name}
            className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-10 w-10 text-[hsl(0,0%,25%)]" />
          </div>
        )}
      </div>
      <div className="border-t border-[hsl(var(--gold-accent)/0.12)] p-3">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(0,0%,82%)] group-hover:text-[hsl(var(--gold-accent))]">
          {character.name}
        </p>
      </div>
    </Link>
  );
}

export default function CharacterDetailsArcade() {
  const { slug, characterId } = useParams<{
    slug: string;
    characterId: string;
  }>();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: character, isLoading } = useCharacterDetails(characterId);
  const { data: relatedCharacters } = useRelatedCharacters(
    character?.collection_id,
    characterId,
  );

  const allImages = useMemo(
    () =>
      uniqueImages([character?.image_url, ...(character?.image_urls ?? [])]),
    [character?.image_url, character?.image_urls],
  );

  const activeImage =
    selectedImage && allImages.includes(selectedImage)
      ? selectedImage
      : (allImages[0] ?? null);
  const collectionSlug = character?.collections?.slug || slug || "";
  const collectionName = character?.collections?.name || "";
  const collectionTotal = character?.collections?.total_characters ?? null;
  const statusLabel = STATUS_LABELS[character?.status ?? ""] ?? "A definir";
  const releaseOrder = character?.release_order ?? 1;
  const releaseLabel = formatReleaseLabel(
    character?.release_date,
    character?.release_month,
  );
  const editionLabel = String(releaseOrder).padStart(2, "0");
  const totalLabel = collectionTotal
    ? String(collectionTotal).padStart(2, "0")
    : null;
  const franchiseLabel = character?.franchise || collectionName;
  const lineLabel = character?.product_line || "Colecao";
  const categoryLabel =
    character?.theme_category || character?.product_line || "Personagem";
  const headlineLabel =
    character?.theme_category ||
    character?.product_line ||
    character?.franchise ||
    "Personagem de coleção";
  const priceCategory = character?.price_categories;
  const canBuy =
    character?.status === "released" || character?.status === "available";
  const primaryCtaPath =
    canBuy && collectionSlug && character
      ? getBuyCharacterPath(collectionSlug, character.id)
      : collectionSlug
        ? collectionDetailsPath(collectionSlug)
        : PUBLIC_ROUTES.collections;
  const backdropUrl = getCollectionBackdropUrl(
    collectionSlug,
    character?.collections?.cover_image_url ?? activeImage,
  );

  if (isLoading) {
    return (
      <Page title="Carregando..." description="Carregando detalhes">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Skeleton className="min-h-[620px] bg-[hsl(0,0%,9%)]" />
          <div className="space-y-4">
            <Skeleton className="h-16 bg-[hsl(0,0%,9%)]" />
            <Skeleton className="h-28 bg-[hsl(0,0%,9%)]" />
            <Skeleton className="h-24 bg-[hsl(0,0%,9%)]" />
            <Skeleton className="h-40 bg-[hsl(0,0%,9%)]" />
          </div>
        </div>
      </Page>
    );
  }

  if (!character) {
    return (
      <Page title="Personagem não encontrado" description="Item não encontrado">
        <section className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="max-w-md text-center">
            <Package className="mx-auto mb-5 h-14 w-14 text-[hsl(0,0%,28%)]" />
            <h1
              className="text-3xl font-black uppercase tracking-[0.08em]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              Personagem não encontrado
            </h1>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              Este item pode ter sido removido ou o link está incorreto.
            </p>
            <Button
              onClick={() =>
                navigate(
                  slug
                    ? collectionDetailsPath(slug)
                    : PUBLIC_ROUTES.collections,
                )
              }
              className="mt-6 bg-[hsl(var(--gold-accent))] font-mono text-xs uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--gold-accent)/0.88)]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </section>
      </Page>
    );
  }

  return (
    <Page
      title={`${character.name} | ${collectionName}`}
      description={
        character.description ||
        `Detalhes do personagem ${character.name} da coleção ${collectionName}`
      }
    >
      <section className="relative overflow-hidden bg-[hsl(0,0%,3%)]">
        {backdropUrl && (
          <div
            className="absolute inset-0 bg-center bg-no-repeat opacity-55"
            style={{
              backgroundImage: `url(${backdropUrl})`,
              backgroundSize: "min(92vw, 900px) auto",
            }}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_46%,hsl(var(--gold-accent)/0.16),transparent_34%),linear-gradient(90deg,hsl(0,0%,3%)/0.24,hsl(0,0%,3%)_58%)]" />

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-72px)] max-w-[1680px] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(420px,0.94fr)] lg:gap-10 lg:px-8 lg:py-8">
          <div className="relative flex min-h-[520px] flex-col justify-between border-b border-[hsl(var(--gold-accent)/0.12)] pb-6 lg:min-h-[780px] lg:border-b-0 lg:pb-0">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    collectionSlug
                      ? collectionDetailsPath(collectionSlug)
                      : PUBLIC_ROUTES.collections,
                  )
                }
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(0,0%,62%)] transition-colors hover:text-[hsl(var(--gold-accent))]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Coleções
              </button>
              {collectionName && (
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.26em] text-[hsl(var(--gold-accent)/0.72)] sm:inline">
                  {collectionName}
                </span>
              )}
            </div>

            <div className="pointer-events-none absolute bottom-24 left-0 hidden items-center gap-5 lg:flex">
              <div className="h-24 w-px bg-[hsl(var(--gold-accent)/0.45)]" />
              <span className="-rotate-90 font-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(0,0%,58%)]">
                Coleção {collectionName}
              </span>
            </div>

            <div className="flex flex-1 items-center justify-center py-8">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={character.name}
                  className="max-h-[64svh] w-full max-w-[760px] object-contain drop-shadow-[0_28px_80px_hsl(0,0%,0%/0.72)] lg:max-h-[78svh]"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex aspect-[4/5] w-full max-w-md items-center justify-center border border-[hsl(var(--gold-accent)/0.14)] bg-black/45">
                  <Package className="h-20 w-20 text-[hsl(0,0%,24%)]" />
                </div>
              )}
            </div>

            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(0,0%,58%)]">
                  Edição
                </p>
                <p className="mt-1 font-mono text-5xl leading-none text-[hsl(var(--gold-accent))]">
                  {editionLabel}
                </p>
                {totalLabel && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(0,0%,66%)]">
                    de {totalLabel}
                  </p>
                )}
              </div>
              <p className="max-w-40 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(0,0%,58%)]">
                {releaseLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-6 lg:py-6">
            <header>
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-[hsl(var(--gold-accent))]">
                {franchiseLabel}
              </p>
              <h1
                className="mt-3 text-5xl font-black uppercase leading-none tracking-[0.05em] text-[hsl(0,0%,92%)] sm:text-7xl xl:text-8xl"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                {character.name}
              </h1>
              <div className="mt-4 flex items-center gap-4">
                <div className="h-px flex-1 bg-[hsl(var(--gold-accent)/0.28)]" />
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[hsl(0,0%,72%)]">
                  {headlineLabel}
                </p>
                <div className="h-px flex-1 bg-[hsl(var(--gold-accent)/0.28)]" />
              </div>
            </header>

            {character.description && (
              <p className="max-w-3xl text-base leading-8 text-[hsl(0,0%,72%)]">
                {character.description}
              </p>
            )}

            <div className="grid grid-cols-2 border-y border-[hsl(var(--gold-accent)/0.16)] py-4 sm:grid-cols-4">
              <DetailStat icon={Crown} label="Coleção" value={collectionName} />
              <DetailStat icon={Users} label="Linha" value={lineLabel} />
              <DetailStat icon={Sparkles} label="Status" value={statusLabel} />
              <DetailStat
                icon={Shield}
                label="Tipo"
                value={character.is_catalog ? "Catálogo" : "Coleção"}
              />
            </div>

            <GalleryStrip
              images={allImages}
              activeImage={activeImage}
              characterName={character.name}
              onSelect={setSelectedImage}
            />

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="border border-[hsl(var(--gold-accent)/0.16)] bg-black/35 p-5">
                <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-[hsl(var(--gold-accent))]">
                  Especificações
                </h2>
                <div className="space-y-3">
                  <SpecRow label="Escala" value="Sob consulta" />
                  <SpecRow label="Lançamento" value={releaseLabel} />
                  <SpecRow label="Categoria" value={categoryLabel} />
                  <SpecRow label="Franquia" value={franchiseLabel} />
                  <SpecRow label="Status" value={statusLabel} />
                </div>
              </section>

              <section className="border border-[hsl(var(--gold-accent)/0.16)] bg-black/35 p-5">
                <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-[hsl(var(--gold-accent))]">
                  Disponibilidade
                </h2>
                <div className="space-y-3">
                  <SpecRow
                    label="Coins"
                    value={
                      priceCategory?.price_coins
                        ? `${priceCategory.price_coins} coins`
                        : "Sob consulta"
                    }
                  />
                  <SpecRow
                    label="Avulso"
                    value={formatMoneyFromCents(
                      priceCategory?.price_standalone,
                    )}
                  />
                  <SpecRow
                    label="Estoque"
                    value={
                      typeof character.stock_quantity === "number"
                        ? String(character.stock_quantity)
                        : "Sob consulta"
                    }
                  />
                </div>
              </section>
            </div>

            <Button
              asChild
              className="h-14 w-full border border-[hsl(var(--gold-accent)/0.78)] bg-[hsl(var(--gold-accent)/0.08)] font-mono text-sm uppercase tracking-[0.28em] text-[hsl(var(--gold-accent))] shadow-[0_0_28px_hsl(var(--gold-accent)/0.18)] hover:bg-[hsl(var(--gold-accent)/0.16)]"
            >
              <Link to={primaryCtaPath}>
                {canBuy ? "Quero esta peça" : "Acompanhar coleção"}
                {canBuy ? (
                  <ShoppingBag className="ml-3 h-4 w-4" />
                ) : (
                  <Calendar className="ml-3 h-4 w-4" />
                )}
              </Link>
            </Button>

            {relatedCharacters && relatedCharacters.length > 0 && (
              <section>
                <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-[hsl(var(--gold-accent))]">
                  Outros personagens
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {relatedCharacters.slice(0, 4).map((relatedCharacter) => (
                    <RelatedCharacterCard
                      key={relatedCharacter.id}
                      character={relatedCharacter}
                      collectionSlug={collectionSlug}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </Page>
  );
}
