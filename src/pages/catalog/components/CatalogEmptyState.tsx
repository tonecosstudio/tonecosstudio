import { Button } from "@/components/ui/button";

export function CatalogEmptyState(props: { needle: string; onClearSearch: () => void }) {
  const { needle, onClearSearch } = props;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-10 w-10 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold mb-2">Nenhum item encontrado</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {needle
          ? `Não encontramos resultados para \"${needle}\". Tente outro termo de busca.`
          : "Quando você processar imagens no admin, elas aparecerão aqui."}
      </p>
      {needle && (
        <Button onClick={onClearSearch} variant="outline">
          Limpar busca
        </Button>
      )}
    </div>
  );
}
