import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  ArrowRight,
  Crosshair,
  Coins,
  EyeOff,
  Tags,
} from "lucide-react";
import type { CatalogModelRow } from "@/types/catalog";
import { ArcadeCard } from "@/components/arcade/ArcadeLayout";
import { catalogModelDetailsPath } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import {
  getCatalogCharacterName,
  getCatalogPublicTags,
  getCatalogSensitivity,
  getCatalogVersionName,
} from "@/lib/catalog-utils";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  anime: "Anime",
  manga: "Manga",
  movie: "Filme",
  series: "Serie",
  game: "Game",
  comic: "HQ",
  tokusatsu: "Tokusatsu",
  original: "Original",
  other: "Outro",
};

const VARIANT_TYPE_LABELS: Record<string, string> = {
  default: "Padrao",
  form: "Forma",
  costume: "Roupa",
  pose: "Pose",
  scale: "Escala",
  edition: "Edicao",
  variant: "Versao",
  other: "Outro",
};

export function UniverseModelCard({
  model,
  isLiked,
  onToggleLike,
  onTagClick,
  contextBadge,
}: {
  model: CatalogModelRow;
  isLiked: boolean;
  onToggleLike: () => void;
  onTagClick?: (tag: string) => void;
  contextBadge?: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  const imageUrl = model.thumbnailUrl ?? model.imageUrl;
  const displayTags = getCatalogPublicTags(model, 3);
  const sensitivity = getCatalogSensitivity(model);
  const isStaging =
    !model.is_active || (model.tags ?? []).includes("catalog-staging");
  const characterName = getCatalogCharacterName(model);
  const versionName = getCatalogVersionName(model);
  const cardTitle = versionName || characterName;
  const showCharacterLine = cardTitle !== characterName;
  const mediaLabel = model.source_type
    ? SOURCE_TYPE_LABELS[model.source_type] || model.source_type
    : null;
  const variantLabel = model.variant_type
    ? VARIANT_TYPE_LABELS[model.variant_type] || model.variant_type
    : null;
  const detailsPath = catalogModelDetailsPath(
    model.id,
    [model.character_name || model.name, model.variant_name]
      .filter(Boolean)
      .join(" "),
  );
  const fixedCashPrice =
    model.price_mode === "fixed" &&
    typeof model.price_standalone_override === "number" &&
    model.price_standalone_override > 0
      ? model.price_standalone_override
      : null;
  const hasFixedCoinPrice =
    model.price_mode === "fixed" &&
    typeof model.price_coins_override === "number" &&
    model.price_coins_override > 0;

  return (
    <ArcadeCard>
      <div
        className="flex h-full flex-col"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-[hsl(0,0%,9%)]">
          <Link
            to={detailsPath}
            className="block h-full w-full text-left"
            aria-label={`Abrir postagem de ${characterName}`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={characterName}
                className={`h-full w-full opacity-80 transition-all duration-700 group-hover:opacity-100 ${
                  isStaging
                    ? "object-contain p-2 group-hover:scale-105"
                    : "object-cover group-hover:scale-110"
                } ${sensitivity.shouldBlur ? "scale-105 blur-xl" : ""}`}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Crosshair className="h-10 w-10 text-[hsl(0,0%,15%)]" />
              </div>
            )}
          </Link>

          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleLike();
            }}
            className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center border transition-all ${
              isLiked
                ? "border-[hsl(0,70%,50%)/0.5] bg-[hsl(0,70%,50%)/0.2] text-[hsl(0,70%,60%)]"
                : "border-[hsl(0,0%,20%)] bg-[hsl(0,0%,5%)]/70 text-[hsl(0,0%,40%)] hover:text-[hsl(0,70%,60%)]"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
          </button>

          {(mediaLabel || model.category) && (
            <div className="absolute left-2 top-2 z-10 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(0,0%,5%)]/90 px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest text-[hsl(var(--gold-accent))]">
              {mediaLabel || model.category}
            </div>
          )}

          {contextBadge && (
            <div className="absolute bottom-2 right-2 z-10 border border-[hsl(var(--gold-accent)/0.28)] bg-[hsl(0,0%,5%)]/92 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[hsl(var(--gold-accent))]">
              {contextBadge}
            </div>
          )}

          {sensitivity.shouldBlur && (
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-[hsl(0,0%,5%)]/55 px-4 text-center backdrop-blur-sm">
              <span className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.35)] bg-[hsl(0,0%,5%)]/90 px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-[hsl(var(--gold-accent))]">
                <EyeOff className="h-3.5 w-3.5" />
                {sensitivity.label}
              </span>
            </div>
          )}

          {isStaging && (
            <div className="absolute bottom-2 left-2 z-10 border border-red-500/40 bg-red-500/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest text-red-300">
              Conferencia
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[hsl(0,0%,7%)] to-transparent" />
        </div>

        <div className="flex flex-1 flex-col p-2.5">
          <Link
            to={detailsPath}
            className="block w-full text-left text-sm font-black leading-none tracking-wider transition-colors group-hover:text-[hsl(var(--gold-accent))]"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            title={cardTitle}
            aria-label={`Abrir postagem de ${characterName}`}
          >
            <span className="line-clamp-2">{cardTitle}</span>
          </Link>
          {showCharacterLine && (
            <div className="mb-1 mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[hsl(0,0%,42%)]">
              {characterName}
            </div>
          )}

          {variantLabel &&
            variantLabel !== "Padrao" &&
            variantLabel !== "Versao" && (
              <div className="mb-1.5 w-fit max-w-full truncate border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[hsl(0,0%,55%)]">
                {variantLabel}
              </div>
            )}

          <div className="mb-2 flex items-center gap-1">
            {hasFixedCoinPrice && (
              <span className="inline-flex items-center gap-1 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.08)] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[hsl(var(--gold-accent))]">
                <Coins className="h-3 w-3" />
                {model.price_coins_override}
              </span>
            )}
            {fixedCashPrice !== null ? (
              <span className="border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[hsl(0,0%,85%)]">
                {formatCurrency(fixedCashPrice / 100)}
              </span>
            ) : null}
          </div>

          {displayTags.length > 0 && (
            <div className="mb-2 flex items-center gap-1 overflow-hidden whitespace-nowrap">
              {displayTags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className="inline-flex min-w-0 max-w-[31%] shrink items-center gap-1 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[hsl(0,0%,50%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.4)] hover:text-[hsl(var(--gold-accent))]"
                  aria-label={`Filtrar tag ${tag}`}
                >
                  <Tags className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{tag}</span>
                </button>
              ))}
            </div>
          )}

          <Link
            to={detailsPath}
            className="mt-auto flex w-full items-center justify-center gap-1.5 border border-[hsl(var(--gold-accent)/0.3)] py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[hsl(var(--gold-accent))] transition-all hover:bg-[hsl(var(--gold-accent)/0.1)]"
          >
            ABRIR POST <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="relative h-[2px] overflow-hidden">
          <div className="absolute inset-0 bg-[hsl(0,0%,10%)]" />
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[hsl(var(--gold-accent))] to-[hsl(var(--gold-accent)/0.5)] transition-all duration-700 ease-out"
            style={{ width: hovered ? "100%" : "0%" }}
          />
        </div>
      </div>
    </ArcadeCard>
  );
}
