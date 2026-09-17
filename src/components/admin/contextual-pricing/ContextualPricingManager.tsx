/**
 * Componente principal para gerenciar a precificacao por tipo de colecao.
 *
 * Os antigos multiplicadores por contexto de assinante e o preview derivado
 * foram aposentados: a tabela pricing_context_multipliers hoje pertence ao
 * dominio de tamanho/complexidade/acabamento/urgencia e nao deve ser editada
 * por esta tela de colecoes.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, DollarSign } from "lucide-react";
import { BasePricingTable } from "./BasePricingTable";

export function ContextualPricingManager() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Precos por Tipo de Colecao
        </CardTitle>
        <CardDescription>
          Configure os precos base das colecoes usando a fonte comercial vigente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            O editor legado de contexto de assinante foi removido porque seu contrato nao existe
            mais no schema atual. Multiplicadores de tamanho, complexidade, acabamento e urgencia
            pertencem a outro dominio e nao sao alterados por esta tela.
          </AlertDescription>
        </Alert>

        <BasePricingTable />
      </CardContent>
    </Card>
  );
}
