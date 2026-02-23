import { supabase } from "@/integrations/supabase/client";
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
  onQuote: (modelId: string) => void;
  onClearSearch: () => void;
}) {
  const { isLoading, rows, needle, getIsLiked, onToggleLike, onQuote, onClearSearch } = props;

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
        const imageUrl = supabase.storage.from(m.image_bucket).getPublicUrl(m.image_path).data.publicUrl;
        const isLiked = getIsLiked(m.id);
        return (
          <ModelCard
            key={m.id}
            model={m}
            imageUrl={imageUrl}
            variant="catalog"
            isLiked={isLiked}
            onToggleLike={() => onToggleLike(m, isLiked)}
            onQuote={() => onQuote(m.id)}
          />
        );
      })}
    </div>
  );
}
