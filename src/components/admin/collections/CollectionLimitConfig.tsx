import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Info, Infinity as InfinityIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateCollectionLimitConfig } from "@/hooks/admin/useCollectionLimitConfig";

interface CollectionLimitConfigProps {
  planId: string;
  planType: string;
  currentLimit: number;
  onUpdate?: (newLimit: number) => void;
}

export function CollectionLimitConfig({ planId, planType, currentLimit, onUpdate }: CollectionLimitConfigProps) {
  const [limit, setLimit] = useState<string>(currentLimit.toString());
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const updateMutation = useUpdateCollectionLimitConfig();

  useEffect(() => {
    setLimit(currentLimit.toString());
    setHasChanges(false);
  }, [currentLimit]);

  const handleSetUnlimited = () => {
    setLimit("-1");
    setHasChanges(true);
  };

  const handleSave = async () => {
    const numValue = parseInt(limit);
    if (isNaN(numValue) || numValue < -1 || numValue === 0) {
      toast({
        title: "Limite invalido",
        description: "O limite deve ser -1 (ilimitado) ou um numero positivo",
        variant: "destructive",
      });
      return;
    }

    await updateMutation.mutateAsync(
      { planId, newLimit: numValue },
      {
        onSuccess: (data) => {
          toast({
            title: "Limite atualizado",
            description: `Limite de colecoes do plano ${planType} atualizado com sucesso`,
          });
          setHasChanges(false);
          onUpdate?.(data.collections_count);
        },
        onError: (error: Error) => {
          toast({
            title: "Erro ao atualizar limite",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const isUnlimited = parseInt(limit) === -1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Limite de Colecoes</CardTitle>
        <CardDescription>Configure quantas colecoes os usuarios deste plano podem escolher</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            -1 = Ilimitado (todas as colecoes) | Numero positivo = Limite especifico de colecoes
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="limit">Quantidade de Colecoes</Label>
          <div className="flex items-center gap-2">
            <Input
              id="limit"
              type="number"
              min="-1"
              step="1"
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value);
                setHasChanges(true);
              }}
              className="w-32"
            />
            <Button variant="outline" size="sm" onClick={handleSetUnlimited}>
              <InfinityIcon className="h-4 w-4 mr-2" />
              Ilimitado
            </Button>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="text-sm font-medium">Preview</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plano:</span>
            <Badge variant="outline">{planType}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Limite atual:</span>
            <Badge variant="secondary">{currentLimit === -1 ? "Ilimitado" : `${currentLimit} colecoes`}</Badge>
          </div>
          {hasChanges && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Novo limite:</span>
              <Badge variant="default">{isUnlimited ? "Ilimitado" : `${limit} colecoes`}</Badge>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending} className="w-full">
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Limite
        </Button>
      </CardContent>
    </Card>
  );
}
