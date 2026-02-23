import { Button } from "@/components/ui/button";

export function CatalogPagination(props: {
  page: number;
  hasNext: boolean;
  isFetching: boolean;
  rowsCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { page, hasNext, isFetching, rowsCount, onPrev, onNext } = props;

  if (rowsCount <= 0) return null;

  return (
    <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
      <Button
        variant="outline"
        size="lg"
        className="border-border hover:bg-muted w-full sm:w-auto sm:min-w-[120px]"
        onClick={onPrev}
        disabled={page === 0 || isFetching}
      >
        {isFetching && page > 0 ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Carregando...
          </span>
        ) : (
          "← Anterior"
        )}
      </Button>

      <div className="flex items-center gap-2 text-sm order-first sm:order-none">
        <span className="text-muted-foreground">Página</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background font-semibold">
          {isFetching ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            page + 1
          )}
        </span>
        {hasNext && !isFetching && (
          <>
            <span className="text-muted-foreground hidden sm:inline">de</span>
            <span className="text-muted-foreground hidden sm:inline">muitas</span>
          </>
        )}
      </div>

      <Button
        variant="outline"
        size="lg"
        className="border-border hover:bg-muted w-full sm:w-auto sm:min-w-[120px]"
        onClick={onNext}
        disabled={isFetching || !hasNext}
      >
        {isFetching && hasNext ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Carregando...
          </span>
        ) : (
          "Próxima →"
        )}
      </Button>
    </div>
  );
}
