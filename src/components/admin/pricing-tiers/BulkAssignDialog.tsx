import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { useCollectionTierAssignment } from "@/hooks/useCollectionTierAssignment";
import { useCollectionsForBulkAssign } from "@/hooks/admin/useCollectionsForBulkAssign";
import { AlertCircle, CheckCircle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog para atribuição em massa de níveis a coleções
 * Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
export function BulkAssignDialog({ open, onOpenChange }: BulkAssignDialogProps) {
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByTier, setFilterByTier] = useState<string>("all");
  const [filterByPriceMin, setFilterByPriceMin] = useState<string>("");
  const [filterByPriceMax, setFilterByPriceMax] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  } | null>(null);

  const { data: activeTiers, isLoading: loadingTiers } = usePricingTiers({ activeOnly: true });
  const { bulkAssign } = useCollectionTierAssignment();

  // Buscar coleções
  const { data: collections, isLoading: loadingCollections } = useCollectionsForBulkAssign(open);

  // Filtrar coleções
  const filteredCollections = useMemo(() => {
    if (!collections) return [];

    return collections.filter((col) => {
      // Filtro de busca por nome
      if (searchQuery && !col.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filtro por nível atual
      if (filterByTier !== "all") {
        if (filterByTier === "none" && col.tier_id) return false;
        if (filterByTier !== "none" && col.tier_id !== filterByTier) return false;
      }

      // Filtro por faixa de preço
      if (filterByPriceMin && col.price_full < parseFloat(filterByPriceMin)) {
        return false;
      }
      if (filterByPriceMax && col.price_full > parseFloat(filterByPriceMax)) {
        return false;
      }

      return true;
    });
  }, [collections, searchQuery, filterByTier, filterByPriceMin, filterByPriceMax]);

  const handleToggleCollection = (collectionId: string) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleToggleAll = () => {
    if (selectedCollectionIds.length === filteredCollections.length) {
      setSelectedCollectionIds([]);
    } else {
      setSelectedCollectionIds(filteredCollections.map((col) => col.id));
    }
  };

  const handleExecute = async () => {
    if (!selectedTierId || selectedCollectionIds.length === 0) {
      toast.error("Selecione um nível e pelo menos uma coleção");
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const result = await bulkAssign.mutateAsync({
        collection_ids: selectedCollectionIds,
        tier_id: selectedTierId,
      });

      setExecutionResult({
        success: result.success.length,
        failed: result.failed.length,
        errors: result.failed,
      });

      if (result.failed.length === 0) {
        toast.success(`${result.success.length} coleções atribuídas com sucesso`);
      } else {
        toast.warning(
          `${result.success.length} sucesso, ${result.failed.length} falhas`
        );
      }
    } catch (_error) {
      toast.error("Erro ao executar atribuição em massa");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setSelectedCollectionIds([]);
    setSelectedTierId("");
    setSearchQuery("");
    setFilterByTier("all");
    setFilterByPriceMin("");
    setFilterByPriceMax("");
    setExecutionResult(null);
    onOpenChange(false);
  };

  const selectedTier = activeTiers?.find((t) => t.id === selectedTierId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Atribuição em Massa</DialogTitle>
          <DialogDescription>
            Atribua um nível de preço a múltiplas coleções de uma vez
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buscar por Nome</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome da coleção..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por Nível Atual</Label>
              <Select value={filterByTier} onValueChange={setFilterByTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Sem nível</SelectItem>
                  {activeTiers?.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preço Mínimo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={filterByPriceMin}
                onChange={(e) => setFilterByPriceMin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Preço Máximo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="999999.99"
                value={filterByPriceMax}
                onChange={(e) => setFilterByPriceMax(e.target.value)}
              />
            </div>
          </div>

          {/* Seleção de Nível de Destino */}
          <div className="space-y-2">
            <Label>Nível de Destino</Label>
            <Select value={selectedTierId} onValueChange={setSelectedTierId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                {activeTiers?.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.name}
                    {tier.is_default && " (Padrão)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {selectedCollectionIds.length > 0 && selectedTier && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedCollectionIds.length} coleção(ões) serão atribuídas ao nível "
                {selectedTier.name}"
              </AlertDescription>
            </Alert>
          )}

          {/* Lista de Coleções */}
          <div className="flex-1 overflow-hidden flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Coleções ({filteredCollections.length} encontradas)
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAll}
                disabled={filteredCollections.length === 0}
              >
                {selectedCollectionIds.length === filteredCollections.length
                  ? "Desmarcar Todas"
                  : "Selecionar Todas"}
              </Button>
            </div>

            {loadingCollections || loadingTiers ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-4 space-y-2">
                  {filteredCollections.map((collection) => (
                    <div
                      key={collection.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleCollection(collection.id)}
                    >
                      <Checkbox
                        checked={selectedCollectionIds.includes(collection.id)}
                        onCheckedChange={() => handleToggleCollection(collection.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{collection.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {collection.slug} • R$ {collection.price_full.toFixed(2)}
                        </div>
                      </div>
                      {collection.tier_name && (
                        <Badge variant="secondary">{collection.tier_name}</Badge>
                      )}
                    </div>
                  ))}

                  {filteredCollections.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma coleção encontrada com os filtros aplicados
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Resultado da Execução */}
          {executionResult && (
            <div className="space-y-2">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {executionResult.success} coleção(ões) atribuídas com sucesso
                </AlertDescription>
              </Alert>

              {executionResult.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">
                      {executionResult.failed} falha(s):
                    </div>
                    <ScrollArea className="h-20">
                      <ul className="text-sm space-y-1">
                        {executionResult.errors.map((err, index) => (
                          <li key={index}>
                            {err.id}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Progresso */}
          {isExecuting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Executando atribuição...</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {executionResult ? "Fechar" : "Cancelar"}
          </Button>
          {!executionResult && (
            <Button
              onClick={handleExecute}
              disabled={
                isExecuting ||
                selectedCollectionIds.length === 0 ||
                !selectedTierId
              }
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                `Atribuir a ${selectedCollectionIds.length} Coleção(ões)`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
