import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden border border-border bg-card">
      {/* Imagem Skeleton */}
      <div className="relative aspect-[3/4] w-full bg-muted">
        <Skeleton className="h-full w-full" />
        {/* Botão de favoritar */}
        <div className="absolute right-4 top-4">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Conteúdo Skeleton */}
      <CardContent className="flex flex-col flex-1 p-6">
        <div className="space-y-3">
          {/* Título */}
          <Skeleton className="h-5 w-3/4" />
          {/* Subtítulo */}
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Tags */}
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>

        {/* Botão */}
        <div className="mt-auto pt-6">
          <Skeleton className="h-11 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
