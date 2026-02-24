import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import type { CatalogSort } from "@/pages/catalog/hooks/useCatalogModels";

export function CatalogToolbar(props: {
  q: string;
  onChangeQ: (next: string) => void;
  needle: string;
  page: number;
  count: number;
  franchise: string;
  onChangeFranchise: (next: string) => void;
  category: string;
  onChangeCategory: (next: string) => void;
  tagsCSV: string;
  onChangeTagsCSV: (next: string) => void;
  sort: CatalogSort;
  onChangeSort: (next: CatalogSort) => void;
}) {
  const {
    q,
    onChangeQ,
    needle,
    page,
    count,
    franchise,
    onChangeFranchise,
    category,
    onChangeCategory,
    tagsCSV,
    onChangeTagsCSV,
    sort,
    onChangeSort,
  } = props;

  return (
    <section className="bg-background border-b border-border">
      <div className="container px-4 py-6 sm:px-8 sm:py-8 md:px-12">
        <div className="max-w-3xl mx-auto mb-6 sm:mb-8 space-y-4">
          <Input
            value={q}
            onChange={(e) => onChangeQ(e.target.value)}
            placeholder="Buscar por nome do modelo..."
            className="h-12 sm:h-14 border-border bg-background text-base shadow-sm"
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="catalog-franchise" className="text-xs text-muted-foreground">
                Franquia
              </Label>
              <Input
                id="catalog-franchise"
                value={franchise}
                onChange={(e) => onChangeFranchise(e.target.value)}
                placeholder="Ex: Naruto"
                className="h-11 border-border bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select
                value={category || "all"}
                onValueChange={(v) => onChangeCategory(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-11 border-border bg-background">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="animes">animes</SelectItem>
                  <SelectItem value="filmes">filmes</SelectItem>
                  <SelectItem value="series">series</SelectItem>
                  <SelectItem value="jogos">jogos</SelectItem>
                  <SelectItem value="quadrinhos">quadrinhos</SelectItem>
                  <SelectItem value="outros">outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalog-tags" className="text-xs text-muted-foreground">
                Tags (vírgula)
              </Label>
              <Input
                id="catalog-tags"
                value={tagsCSV}
                onChange={(e) => onChangeTagsCSV(e.target.value)}
                placeholder="Ex: chibi, dark"
                className="h-11 border-border bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ordenar</Label>
              <Select value={sort} onValueChange={(v) => onChangeSort(v as CatalogSort)}>
                <SelectTrigger className="h-11 border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recentes</SelectItem>
                  <SelectItem value="az">A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
            <span className="font-medium text-foreground text-xs sm:text-sm">
              {needle ? `Resultados para \"${needle}\"` : "Todos os modelos"}
            </span>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <span className="text-xs sm:text-sm">Página {page + 1}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {q && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChangeQ("")}
                className="text-muted-foreground hover:text-foreground text-xs sm:text-sm"
              >
                Limpar busca
              </Button>
            )}

            {(franchise || category || tagsCSV) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChangeFranchise("");
                  onChangeCategory("");
                  onChangeTagsCSV("");
                }}
                className="text-muted-foreground hover:text-foreground text-xs sm:text-sm"
              >
                Limpar filtros
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted flex-1 sm:flex-none"
              asChild
            >
              <Link to="/orcamento/carrinho">Carrinho ({count})</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
