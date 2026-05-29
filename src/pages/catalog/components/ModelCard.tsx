import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import type { ModelRow } from "../catalogTypes";
import {
  getCatalogCharacterName,
  getCatalogPublicTags,
  getCatalogSourceName,
  getCatalogTitle,
  getCatalogVersionName,
} from "@/lib/catalog-utils";
import { Link } from "react-router-dom";
import { catalogModelDetailsPath } from "@/config/routes";

export function ModelCard(props: {
  model: ModelRow;
  imageUrl: string;
  variant: "catalog" | "forYou";
  isLiked: boolean;
  onToggleLike: () => void;
}) {
  const { model: m, imageUrl, variant, isLiked, onToggleLike } = props;
  const title = getCatalogTitle(m);
  const characterName = getCatalogCharacterName(m);
  const detailsPath = catalogModelDetailsPath(m.id);

  if (variant === "forYou") {
    return (
      <Card className="group h-full overflow-hidden border border-border bg-card shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-premium">
        <div className="relative aspect-[3/4] w-full bg-muted overflow-hidden">
          <Link to={detailsPath} aria-label={`Abrir detalhes de ${title}`}>
            <img
              src={imageUrl}
              alt={characterName}
              className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </Link>
          <button
            type="button"
            className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-popover/95 text-foreground shadow-elevated backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleLike();
            }}
            aria-pressed={isLiked}
            aria-label={
              isLiked ? "Remover dos favoritos" : "Adicionar aos favoritos"
            }
          >
            <Heart className={isLiked ? "h-5 w-5 fill-current" : "h-5 w-5"} />
          </button>
        </div>
        <CardContent className="flex h-full min-w-0 flex-col p-5">
          <Link to={detailsPath} className="min-w-0" title={title}>
            <p className="min-w-0 truncate text-base font-semibold leading-tight">
              {title}
            </p>
          </Link>
          <div className="mt-auto pt-4">
            <Button
              className="h-11 w-full bg-foreground text-background hover:bg-foreground/90 font-medium"
              asChild
            >
              <Link to={detailsPath}>Ver Detalhes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const line = [getCatalogVersionName(m), getCatalogSourceName(m), m.category]
    .filter(Boolean)
    .join(" | ");
  const extraTags = getCatalogPublicTags(m, 2);

  return (
    <Card className="group flex flex-col overflow-hidden border border-border bg-card shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-premium">
      <div className="relative aspect-[3/4] w-full bg-muted overflow-hidden">
        <Link to={detailsPath} aria-label={`Abrir detalhes de ${title}`}>
          <img
            src={imageUrl}
            alt={characterName}
            className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </Link>
        <div
          className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          aria-hidden
        />

        <button
          type="button"
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-popover/95 text-foreground shadow-elevated backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleLike();
          }}
          aria-pressed={isLiked}
          aria-label={
            isLiked ? "Remover dos favoritos" : "Adicionar aos favoritos"
          }
        >
          <Heart className={isLiked ? "h-5 w-5 fill-current" : "h-5 w-5"} />
        </button>
      </div>

      <CardContent className="flex flex-col flex-1 p-6">
        <div className="min-w-0 space-y-2">
          <Link to={detailsPath} className="min-w-0" title={title}>
            <p className="min-w-0 truncate text-lg font-semibold leading-tight">
              {title}
            </p>
          </Link>
          <p
            className="min-w-0 truncate text-sm text-muted-foreground"
            title={line || "—"}
          >
            {line || "—"}
          </p>
        </div>

        {extraTags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {extraTags.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="text-xs border-border"
              >
                {t}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-auto pt-6">
          <Button
            className="h-11 w-full bg-foreground text-background hover:bg-foreground/90 font-medium"
            asChild
          >
            <Link to={detailsPath}>Ver Detalhes</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
