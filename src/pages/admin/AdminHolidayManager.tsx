// @ts-nocheck
/**
 * AdminHolidayManager - Gerenciamento de Feriados
 * 
 * Gerencia feriados e dias não úteis para cálculo de prazos de entrega.
 */

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function AdminHolidayManager() {
  return (
    <AdminLayout>
      <SEOHead 
        title="Gerenciar Feriados - Admin" 
        description="Gerencie feriados e dias não úteis para cálculo de prazos"
      />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Feriados</h1>
          <p className="text-muted-foreground mt-2">
            Configure feriados e dias não úteis para cálculo automático de prazos de entrega
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendário de Feriados
            </CardTitle>
            <CardDescription>
              Adicione e gerencie feriados nacionais, estaduais e municipais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Funcionalidade de gerenciamento de feriados em desenvolvimento</p>
              <p className="text-sm mt-2">
                Esta página permitirá configurar feriados que afetam os prazos de entrega
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
