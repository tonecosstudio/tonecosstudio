/**
 * Componente principal para gerenciar preços contextuais
 * 
 * Permite configurar:
 * - Preços base por tipo de coleção
 * - Multiplicadores de contexto
 * - Desconto para coleções escolhidas
 * - Preview de preços calculados
 * 
 * Spec: contextual-pricing-system
 * Task: 6.2
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, DollarSign, Percent, Eye, History } from "lucide-react";
import { BasePricingTable } from "./BasePricingTable";
import { MultipliersTable } from "./MultipliersTable";
import { PricingPreviewTable } from "./PricingPreviewTable";
import { PricingHistoryModal } from "./PricingHistoryModal";

export function ContextualPricingManager() {
  const [activeTab, setActiveTab] = useState("base-prices");
  const [showHistory, setShowHistory] = useState(false);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Preços Contextuais
            </CardTitle>
            <CardDescription>
              Configure preços base, multiplicadores e descontos para diferentes contextos de usuário
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History className="h-4 w-4 mr-2" />
            Ver Histórico
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Os preços contextuais ajustam automaticamente o valor das coleções baseado no status de assinatura
            e se o usuário escolheu aquela coleção. Mudanças são registradas no histórico para auditoria.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="base-prices" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Preços Base
            </TabsTrigger>
            <TabsTrigger value="multipliers" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Multiplicadores
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base-prices" className="mt-6">
            <BasePricingTable />
          </TabsContent>

          <TabsContent value="multipliers" className="mt-6">
            <MultipliersTable />
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <PricingPreviewTable />
          </TabsContent>
        </Tabs>
      </CardContent>

      <PricingHistoryModal open={showHistory} onOpenChange={setShowHistory} />
    </Card>
  );
}
