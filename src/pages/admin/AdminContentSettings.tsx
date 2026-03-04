// @ts-nocheck
import { CycleManagement } from "@/components/admin/CycleManagement";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, Calendar, FileText, Save, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { useContentSettings } from "@/hooks/useContentSettings";
import { format } from "date-fns";
import {
  calculateCurrentBatch,
  calculateNextBatch,
  formatBatchDateFull,
  type BatchRules,
} from "@/lib/services/batchCalculator";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "number" | "date";
  description?: string;
  placeholder?: string;
}

export default function AdminContentSettings() {
  const queryClient = useQueryClient();
  const { data: content, isLoading } = useContentSettings();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [useAutoCalculation, setUseAutoCalculation] = useState(true);

  // Query para buscar todas as configurações
  const { data: allSettings } = useQuery({
    queryKey: ["all-system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*").order("key");

      if (error) throw error;
      return data;
    },
  });

  // Mutation para atualizar configurações
  const updateSettings = useMutation({
    mutationFn: async (updates: Array<{ key: string; value: string }>) => {
      const promises = updates.map(({ key, value }) =>
        supabase
          .from("system_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key)
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-settings"] });
      queryClient.invalidateQueries({ queryKey: ["all-system-settings"] });
      toast.success("Configurações atualizadas com sucesso");
      setEditedValues({});
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar configurações", {
        description: error.message,
      });
    },
  });

  const handleSave = (fields: SettingField[]) => {
    const updates = fields
      .filter((field) => editedValues[field.key] !== undefined)
      .map((field) => ({
        key: field.key,
        value: editedValues[field.key],
      }));

    if (updates.length === 0) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }

    updateSettings.mutate(updates);
  };

  const getValue = (key: string, defaultValue: any = "") => {
    if (editedValues[key] !== undefined) return editedValues[key];
    if (!allSettings) return defaultValue;
    const setting = allSettings.find((s) => s.key === key);
    return setting?.value || defaultValue;
  };

  const setValue = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  // Calcular lote automaticamente
  useEffect(() => {
    if (useAutoCalculation && allSettings) {
      const rules: BatchRules = {
        shippingBusinessDays: parseInt(getValue("shipping_business_days", "5")),
      };

      const batch = calculateCurrentBatch(rules);

      // Atualizar valores calculados
      setEditedValues((prev) => ({
        ...prev,
        current_batch_name: batch.name,
        current_batch_sales_start: format(batch.salesStart, "yyyy-MM-dd"),
        current_batch_sales_end: format(batch.salesEnd, "yyyy-MM-dd"),
        current_batch_production_start: format(batch.productionStart, "yyyy-MM-dd"),
        current_batch_production_end: format(batch.productionEnd, "yyyy-MM-dd"),
        current_batch_shipping_month: batch.shippingMonth,
      }));
    }
  }, [useAutoCalculation, allSettings]);

  // Calcular próximo lote
  const calculateNext = () => {
    const rules: BatchRules = {
      shippingBusinessDays: parseInt(getValue("shipping_business_days", "5")),
    };

    const currentBatch = calculateCurrentBatch(rules);
    const nextBatch = calculateNextBatch(rules, currentBatch);

    setEditedValues((prev) => ({
      ...prev,
      current_batch_name: nextBatch.name,
      current_batch_sales_start: format(nextBatch.salesStart, "yyyy-MM-dd"),
      current_batch_sales_end: format(nextBatch.salesEnd, "yyyy-MM-dd"),
      current_batch_production_start: format(nextBatch.productionStart, "yyyy-MM-dd"),
      current_batch_production_end: format(nextBatch.productionEnd, "yyyy-MM-dd"),
      current_batch_shipping_month: nextBatch.shippingMonth,
    }));

    toast.success("Próximo lote calculado automaticamente");
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  // Definição dos campos por categoria
  const batchFields: SettingField[] = [
    {
      key: "current_batch_name",
      label: "Nome do Lote",
      type: "text",
      placeholder: "Ex: Março/Abril",
      description: "Nome do lote/ciclo atual",
    },
    {
      key: "current_batch_sales_start",
      label: "Início das Vendas",
      type: "date",
      description: "Data de início das vendas (YYYY-MM-DD)",
    },
    {
      key: "current_batch_sales_end",
      label: "Fim das Vendas",
      type: "date",
      description: "Data de fim das vendas (YYYY-MM-DD)",
    },
    {
      key: "current_batch_production_start",
      label: "Início da Produção",
      type: "date",
      description: "Data de início da produção (YYYY-MM-DD)",
    },
    {
      key: "current_batch_production_end",
      label: "Fim da Produção",
      type: "date",
      description: "Data de fim da produção (YYYY-MM-DD)",
    },
    {
      key: "current_batch_shipping_month",
      label: "Mês de Envio",
      type: "text",
      placeholder: "Ex: Maio",
      description: "Mês de envio do lote atual",
    },
    {
      key: "current_batch_shipping_deadline",
      label: "Prazo de Envio (dia útil)",
      type: "number",
      placeholder: "Ex: 5",
      description: "Dia útil limite de envio no mês",
    },
  ];

  const deadlineFields: SettingField[] = [
    {
      key: "sales_open_day",
      label: "Dia de Abertura das Vendas",
      type: "number",
      placeholder: "Ex: 15",
      description: "Dia do mês em que as vendas abrem (padrão: 15)",
    },
    {
      key: "production_days_min",
      label: "Prazo Mínimo de Produção (dias)",
      type: "number",
      placeholder: "Ex: 15",
      description: "Prazo mínimo de produção em dias",
    },
    {
      key: "production_days_max",
      label: "Prazo Máximo de Produção (dias)",
      type: "number",
      placeholder: "Ex: 15",
      description: "Prazo máximo de produção em dias (sempre até dia 15 do mês)",
    },
    {
      key: "shipping_days",
      label: "Prazo de Envio (dias úteis)",
      type: "number",
      placeholder: "Ex: 5",
      description: "Prazo de envio em dias úteis",
    },
    {
      key: "sales_duration_days",
      label: "Duração das Vendas (dias)",
      type: "number",
      placeholder: "Ex: 30",
      description: "Duração do período de vendas em dias (não usado no cálculo automático)",
    },
  ];

  const policyFields: SettingField[] = [
    {
      key: "exchange_deadline_days",
      label: "Prazo para Troca (dias)",
      type: "number",
      placeholder: "Ex: 1",
      description: "Dias antes da produção para trocar coleção",
    },
    {
      key: "support_response_hours",
      label: "Prazo de Resposta do Suporte (horas)",
      type: "number",
      placeholder: "Ex: 48",
      description: "Prazo de resposta do suporte em horas úteis",
    },
  ];

  const renderFields = (fields: SettingField[]) => (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Input
            id={field.key}
            type={field.type}
            placeholder={field.placeholder}
            value={getValue(field.key)}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
      ))}
      <Button
        onClick={() => handleSave(fields)}
        disabled={updateSettings.isPending}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        Salvar Alterações
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Configurações de Conteúdo (SSOT)</h1>
          <p className="text-muted-foreground">
            Gerencie todas as informações do sistema em um único lugar
          </p>
        </div>

        {/* Preview do Lote Atual */}
        {content && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Preview do Lote Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Nome:</strong> {content.currentBatchName}
                </p>
                <p>
                  <strong>Vendas:</strong> {format(content.currentBatchSalesStart, "dd/MM/yyyy")}{" "}
                  até {format(content.currentBatchSalesEnd, "dd/MM/yyyy")} (
                  {content.salesDurationDays} dias)
                </p>
                <p>
                  <strong>Produção:</strong>{" "}
                  {format(content.currentBatchProductionStart, "dd/MM/yyyy")} até{" "}
                  {format(content.currentBatchProductionEnd, "dd/MM/yyyy")} (
                  {content.productionDaysMin}-{content.productionDaysMax} dias)
                </p>
                <p>
                  <strong>Envio:</strong> Até {content.currentBatchShippingDeadline}º dia útil de{" "}
                  {content.currentBatchShippingMonth} ({content.shippingDays} dias úteis)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerta Importante */}
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  Atenção: Sistema SSOT (Single Source of Truth)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Todas as alterações aqui refletem automaticamente em TODAS as páginas do site
                  (Collections, Plans, FAQs, etc). Não é necessário editar código para atualizar
                  datas e prazos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Configuração */}
        <Tabs defaultValue="cycles" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cycles">
              <Sparkles className="h-4 w-4 mr-2" />
              Ciclos (v2.0)
            </TabsTrigger>
            <TabsTrigger value="batch">
              <Calendar className="h-4 w-4 mr-2" />
              Lote Atual (Legado)
            </TabsTrigger>
            <TabsTrigger value="deadlines">
              <Settings className="h-4 w-4 mr-2" />
              Prazos
            </TabsTrigger>
            <TabsTrigger value="policies">
              <FileText className="h-4 w-4 mr-2" />
              Políticas
            </TabsTrigger>
          </TabsList>

          {/* Nova Aba: Ciclos (v2.0) */}
          <TabsContent value="cycles">
            <CycleManagement />
          </TabsContent>

          <TabsContent value="batch">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Lote Atual</CardTitle>
                <CardDescription>
                  Atualize as datas e informações do lote/ciclo de produção atual. Estas informações
                  aparecem em banners, FAQs e cronogramas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toggle de Cálculo Automático */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">Cálculo Automático</p>
                          <Button
                            variant={useAutoCalculation ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUseAutoCalculation(!useAutoCalculation)}
                          >
                            {useAutoCalculation ? "Ativado" : "Desativado"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {useAutoCalculation
                            ? "O sistema calcula automaticamente as datas baseado no calendário real. Vendas sempre do dia 15 até o último dia do mês seguinte."
                            : "Modo manual: você define as datas manualmente."}
                        </p>
                        {useAutoCalculation && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={calculateNext}
                            className="mt-3"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Calcular Próximo Lote
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campos do Lote */}
                {renderFields(batchFields)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deadlines">
            <Card>
              <CardHeader>
                <CardTitle>Prazos e Durações</CardTitle>
                <CardDescription>
                  Configure os prazos padrão de produção, envio e duração das vendas.
                </CardDescription>
              </CardHeader>
              <CardContent>{renderFields(deadlineFields)}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <CardTitle>Políticas e Suporte</CardTitle>
                <CardDescription>
                  Configure prazos relacionados a políticas de troca e suporte ao cliente.
                </CardDescription>
              </CardHeader>
              <CardContent>{renderFields(policyFields)}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Guia Rápido */}
        <Card>
          <CardHeader>
            <CardTitle>📚 Guia Rápido de Atualização Mensal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm mb-2">🎯 Modo Automático (Recomendado):</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Acesse a aba "Lote Atual"</li>
                <li>Certifique-se que "Cálculo Automático" está ativado</li>
                <li>Clique em "Calcular Próximo Lote"</li>
                <li>Revise as datas calculadas automaticamente</li>
                <li>Clique em "Salvar Alterações"</li>
                <li>✅ Pronto! Todas as páginas atualizam automaticamente</li>
              </ol>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="font-medium text-sm">Como funciona o cálculo automático:</p>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <p>• Vendas: Sempre do dia 15 até o último dia do mês seguinte</p>
                <p>• Produção: Sempre do dia 1 até dia 15 do mês seguinte</p>
                <p>• Respeita o calendário real (fevereiro 28/29 dias, outros 30/31)</p>
                <p>• Exemplo: Vendas 15/02-31/03, Produção 01/04-15/04</p>
              </div>
            </div>

            <div>
              <p className="font-medium text-sm mb-2">✏️ Modo Manual:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Desative o "Cálculo Automático"</li>
                <li>Preencha manualmente cada campo</li>
                <li>Clique em "Salvar Alterações"</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
