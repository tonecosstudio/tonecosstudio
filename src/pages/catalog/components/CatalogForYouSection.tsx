import type { ModelRow } from "../catalogTypes";
import { supabase } from "@/integrations/supabase/client";
import { ModelCard } from "./ModelCard";

export function CatalogForYouSection(props: {
  models: ModelRow[];
  getIsLiked: (id: string) => boolean;
  onToggleLike: (model: ModelRow, isLiked: boolean) => void;
  onQuote: (modelId: string) => void;
}) {
  const { models, getIsLiked, onToggleLike, onQuote } = props;

  return (
    <section className="container py-12 border-b border-border">
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Para você</h2>
        <p className="mt-2 text-sm text-muted-foreground">Seleção personalizada baseada nas suas preferências</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {models.map((m) => {
          const imageUrl = supabase.storage.from(m.image_bucket).getPublicUrl(m.image_path).data.publicUrl;
          const isLiked = getIsLiked(m.id);
          return (
            <ModelCard
              key={m.id}
              model={m}
              imageUrl={imageUrl}
              variant="forYou"
              isLiked={isLiked}
              onToggleLike={() => onToggleLike(m, isLiked)}
              onQuote={() => onQuote(m.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
