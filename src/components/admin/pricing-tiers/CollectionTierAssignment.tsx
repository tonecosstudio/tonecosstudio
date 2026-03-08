import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { useCollectionTierAssignment } from "@/hooks/useCollectionTierAssignment";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { AlertCircle, Check, X } from "lucide-react";

interface CollectionTierAssignmentProps {
  collectionId: string;
  isCustomPricing?: boolean;
}

/**
 * Componente para atribuir nível de preço a uma coleção
 * Requisitos: 2.1, 2.4, 2.5, 2.7, 6.4
 */
export function CollectionTierAssignment({
  collectionId,
  isCustomPricing = false,
}: CollectionTierAssignmentProps) {
  const { data: activeTiers, isLoading: loadingTiers } = usePricingTiers({ activeOnly: true });
  const {
    data: currentAssignment,
    isLoading: loadingAssignment,
  } = useCollectionTierAssignment(collectionId);
  const { assignTier, unassignTier } = useCollectionTierAssignment(collectionId);

  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  // Sincronizar seleção com atribuição atual
  useEffect(() => {
    if (currentAssignment?.tier_id) {
      setSelectedTierId(currentAssignment.tier_id);
    } else {
      setSelectedTierId("");
    }
  }, [currentAssignment]);

  // Detectar mudanças
  useEffect(() => {
    const currentValue = currentAssignment?.tier_id || "";
    const changed = selectedTierId !== currentValue;
    setHasChanges(changed);
  }, [selectedTierId, currentAssignment]);

  const handleSave = async () => {
    try {
      if (selectedTierId) {
        await assignTier.mutateAsync({ tierId: selectedTierId });
        toast.success("Nível atribuído com sucesso");
      } else {
        await unassignTier.mutateAsync();
        toast.success("Nível removido com sucesso");
      }
      setHasChanges(false);
    } catch (error) {
      toast.error("Erro ao atualizar atribuição");
    }
  };

  const handleCancel = () => {
    setSelectedTierId(currentAssignment?.tier_id || "");
    setHasChanges(false);
  };

  const selectedTier = activeTiers?.find((t) => t.id === selectedTierId);

  if (loadingTiers || loadingAssignment) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nível de Preço</CardTitle>
        <CardDescription>
          Atribua um nível de preço reutilizável para esta coleção
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCustomPricing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta coleção usa preço customizado. Atribuir um nível removerá o
              preço customizado.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Selecionar Nível</label>
          <Select
            value={selectedTierId || "none"}
            onValueChange={(value) => setSelectedTierId(value === "none" ? "" : value)}
            disabled={isCustomPricing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum (usar padrão)</SelectItem>
              {activeTiers?.map((tier) => (
                <SelectItem key={tier.id} value={tier.id}>
                  {tier.name}
                  {tier.is_default && " (Padrão)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTier && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {selectedTier.name}
                </CardTitle>
                {selectedTier.is_default && (
                  <Badge variant="secondary">Padrão</Badge>
                )}
              </div>
              {selectedTier.description && (
                <CardDescription className="text-sm">
                  {selectedTier.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Preço Cheio</div>
                  <div className="font-medium">
                    {formatCurrency(selectedTier.price_full)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Preço PIX</div>
                  <div className="font-medium">
                    {formatCurrency(selectedTier.price_pix)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Entrada</div>
                  <div className="font-medium">
                    {formatCurrency(selectedTier.deposit_amount)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasChanges && (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={assignTier.isPending || unassignTier.isPending}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              Salvar
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={assignTier.isPending || unassignTier.isPending}
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
