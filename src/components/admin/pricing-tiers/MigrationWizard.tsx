import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMigrationWizard } from "@/hooks/useMigration";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CheckCircle, Loader2, ArrowRight, Database } from "lucide-react";

interface MigrationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Wizard para migração de preços para sistema de níveis
 * Requisitos: 5.1, 5.2, 5.4, 5.7
 */
export function MigrationWizard({ open, onOpenChange }: MigrationWizardProps) {
  const {
    currentStep,
    suggestions,
    result,
    isAnalyzing,
    isExecuting,
    analyze,
    execute,
    reset,
  } = useMigrationWizard();

  const handleAnalyze = async () => {
    await analyze();
  };

  const handleExecute = async () => {
    await execute();
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const totalCollections = suggestions.reduce(
    (sum, plan) => sum + plan.collection_count,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migrar para Sistema de Níveis
          </DialogTitle>
          <DialogDescription>
            Analise e migre suas coleções para o novo sistema de níveis de preço
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Preview */}
        {currentStep === "idle" && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ferramenta irá analisar os preços atuais das suas coleções e
                sugerir níveis de preço baseados em grupos de preços idênticos.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-semibold">Como funciona:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Analisamos todas as coleções e agrupamos por preços idênticos</li>
                <li>Sugerimos criar um nível para cada grupo de preços</li>
                <li>Você revisa o plano de migração</li>
                <li>Executamos a migração criando níveis e atribuindo coleções</li>
              </ol>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Analisar Coleções
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Confirm */}
        {(currentStep === "analyzing" || currentStep === "confirming") && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Encontramos {suggestions.length} grupo(s) de preços diferentes.
                Serão criados {suggestions.length} níveis para {totalCollections}{" "}
                coleção(ões).
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {suggestions.map((plan, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {plan.suggested_tier_name}
                      </CardTitle>
                      <Badge variant="secondary">
                        {plan.collection_count} coleção(ões)
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Preço Cheio</div>
                        <div className="font-medium">
                          {formatCurrency(plan.price_full)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Preço PIX</div>
                        <div className="font-medium">
                          {formatCurrency(plan.price_pix)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Entrada</div>
                        <div className="font-medium">
                          {formatCurrency(plan.deposit_amount)}
                        </div>
                      </div>
                    </div>

                    {plan.collection_ids && plan.collection_ids.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {plan.collection_ids.length <= 5 ? (
                          <span>
                            IDs: {plan.collection_ids.slice(0, 5).join(", ")}
                          </span>
                        ) : (
                          <span>
                            IDs: {plan.collection_ids.slice(0, 5).join(", ")}
                            <Badge variant="outline" className="ml-2">
                              +{plan.collection_ids.length - 5} mais
                            </Badge>
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Voltar
              </Button>
              <Button
                onClick={handleExecute}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Executar Migração
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Result */}
        {(currentStep === "executing" || currentStep === "completed") && result && (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Migração concluída com sucesso!
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Níveis Criados</CardDescription>
                  <CardTitle className="text-3xl">
                    {result.tiersCreated}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Coleções Atribuídas</CardDescription>
                  <CardTitle className="text-3xl">
                    {result.collectionsAssigned}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {result.errors && result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    Alguns erros ocorreram:
                  </div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Próximos Passos:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Revise os níveis criados na lista principal</li>
                <li>Ajuste nomes e descrições dos níveis se necessário</li>
                <li>Configure um nível como padrão para novas coleções</li>
                <li>Verifique as atribuições nas páginas de coleções</li>
              </ul>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
