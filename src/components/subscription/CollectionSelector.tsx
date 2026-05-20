import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Info, Coins, Loader2, TrendingDown } from "lucide-react";
import { useCollectionPrice } from "@/hooks/useCollectionPrice";
import { useAuth } from "@/lib/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  available_for_plans?: string[];
  is_semestral_exclusive?: boolean;
}

interface CollectionSelectorProps {
  planId: string;
  planType: "trimestral" | "semestral";
  selectedCollectionId?: string;
  onCollectionSelect: (collectionId: string) => void;
  disabled?: boolean;
  collections: Collection[];
  isLoading?: boolean;
}

export function CollectionSelector({
  planId,
  planType,
  selectedCollectionId,
  onCollectionSelect,
  disabled = false,
  collections,
  isLoading = false,
}: CollectionSelectorProps) {
  const { user } = useAuth();
  
  // Filtrar coleções disponíveis para o plano
  const availableCollections = collections.filter((col) => {
    // Se for exclusiva de semestral, só mostrar para plano semestral
    if (col.is_semestral_exclusive && planType !== "semestral") {
      return false;
    }
    // Se tiver lista de planos disponíveis, verificar
    if (col.available_for_plans && col.available_for_plans.length > 0) {
      return col.available_for_plans.includes(planType);
    }
    return true;
  });

  // Component to display collection price
  function CollectionPrice({ collectionId }: { collectionId: string }) {
    const { data: price, isLoading: priceLoading } = useCollectionPrice({
      collectionId,
      userId: user?.id,
    });
    
    if (priceLoading) {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Calculando...</span>
        </div>
      );
    }
    
    if (!price) return null;
    
    // Check if this is a discounted price (you could compare with base price if available)
    const hasDiscount = false; // This would need base price comparison
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 text-xs font-medium cursor-help ${
              hasDiscount ? 'text-green-600' : 'text-primary'
            }`}>
              <Coins className="h-3 w-3" />
              <span>{price} coins por personagem</span>
              {hasDiscount && <TrendingDown className="h-3 w-3" />}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Preço Contextual</p>
            <p className="text-xs">
              Este preço é calculado baseado no seu plano de assinatura e nas coleções que você escolheu.
              Cada personagem desta coleção custará {price} coins.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escolha sua Coleção</CardTitle>
          <CardDescription>Carregando coleções disponíveis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!planId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escolha sua Coleção</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Selecione um plano primeiro para ver as coleções disponíveis
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (availableCollections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escolha sua Coleção</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma coleção disponível para este plano
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escolha sua Coleção</CardTitle>
        <CardDescription>
          Selecione o universo temático que deseja receber
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Você poderá trocar de personagem <strong>ILIMITADAMENTE</strong> até o início da produção do ciclo.
            Os preços mostrados são calculados baseado no seu contexto de assinatura.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {availableCollections.map((collection) => {
            const isSelected = selectedCollectionId === collection.id;

            return (
              <div
                key={collection.id}
                onClick={() => !disabled && onCollectionSelect(collection.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-muted/50 hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1">{collection.name}</h4>
                    {collection.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    <div className="mt-2 space-y-1">
                      <CollectionPrice collectionId={collection.id} />
                      {collection.is_semestral_exclusive && (
                        <p className="text-xs text-amber-600 font-medium">
                          Exclusivo do Plano Semestral
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
