import type { ModelRow } from "../catalogTypes";
import { ModelCard } from "./ModelCard";
import { ProductCardSkeleton } from "@/components/ProductCardSkeleton";
import { CatalogEmptyState } from "./CatalogEmptyState";

export function CatalogGridSection(props: {
  isLoading: boolean;
  rows: ModelRow[];
  needle: string;
  getIsLiked: (id: string) => boolean;
  onToggleLike: (model: ModelRow, isLiked: boolean) => void;
  onClearSearch: () => void;
}) {
  const { isLoading, rows, needle, getIsLiked, onToggleLike, onClearSearch } = props;

  if (isLoading) {
    return (
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <CatalogEmptyState needle={needle} onClearSearch={onClearSearch} />;
  }

  return (
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {rows.map((m) => {
        const isLiked = getIsLiked(m.id);
        return (
          <ModelCard
            key={m.id}
            model={m}
            imageUrl={m.imageUrl ?? ""}
            variant="catalog"
            isLiked={isLiked}
            onToggleLike={() => onToggleLike(m, isLiked)}
          />
        );
      })}
    </div>
  );
}
