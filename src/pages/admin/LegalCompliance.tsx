// @ts-nocheck
﻿import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, XCircle, Scale } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function LegalCompliance() {
  return (
    <AppShell>
      <SEOHead
        title="Conformidade Legal CDC - Admin"
        description="Diretrizes legais sobre precificação e CDC"
      />
      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Conformidade Legal - CDC</h1>
          <p className="text-muted-foreground text-lg">
            Diretrizes sobre precificação de produtos sob encomenda
          </p>
        </div>
        <Alert className="mb-8 border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100 font-bold">
            É LEGAL mostrar preços estimados
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            Produtos sob encomenda podem exibir valores de referência.
          </AlertDescription>
        </Alert>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              <CardTitle>Base Legal - Lei 8.078/90 (CDC)</CardTitle>
            </div>
            <CardDescription>Código de Defesa do Consumidor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Artigo 31</h3>
              <p className="text-sm">
                Informações devem ser corretas, claras, precisas e ostensivas.
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-2">Artigo 6º, III</h3>
              <p className="text-sm">Direito à informação adequada e clara sobre produtos.</p>
            </div>
          </CardContent>
        </Card>
        <Alert>
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Recomendações</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>Use qualificadores: "a partir de", "estimado"</p>
            <p>Mantenha estimativas realistas</p>
            <p>Confirme valor exato antes da cobrança</p>
          </AlertDescription>
        </Alert>
      </AdminLayout>
    </AppShell>
  );
}
