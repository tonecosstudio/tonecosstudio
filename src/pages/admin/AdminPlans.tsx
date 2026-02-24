import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Edit2, DollarSign, Package, RefreshCw, Calendar, Info } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminPlans() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<any>(null);

  // Buscar planos
  const plansQuery = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const plans = plansQuery.data || [];

  return (
    <>
      <SEOHead
        title="Admin - Planos de Assinatura"
        description="Configurar planos, preços e regras"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Planos de Assinatura</h1>
          <p className="text-muted-foreground mt-2">
            Configure preços, número de coleções, limites de troca e regras dos planos
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Alterações nos planos afetam apenas novas assinaturas.
            Assinaturas existentes mantêm as configurações originais.
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {plans.filter((p: any) => p.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plano Mais Barato</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R${" "}
                {Math.min(
                  ...plans.filter((p: any) => p.price_pix > 0).map((p: any) => p.price_pix)
                ).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plano Mais Caro</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R${" "}
                {Math.max(
                  ...plans.filter((p: any) => p.price_full > 0).map((p: any) => p.price_full)
                ).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Planos */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan: any) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => setEditingPlan(plan)}
              onSuccess={() => {
                qc.invalidateQueries({ queryKey: ["admin-plans"] });
                qc.invalidateQueries({ queryKey: ["subscription-plans"] });
              }}
            />
          ))}
        </div>

        {/* Dialog de Edição */}
        {editingPlan && (
          <EditPlanDialog
            plan={editingPlan}
            isOpen={Boolean(editingPlan)}
            onOpenChange={(open) => !open && setEditingPlan(null)}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-plans"] });
              qc.invalidateQueries({ queryKey: ["subscription-plans"] });
              setEditingPlan(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
}

// Componente: Card de Plano
function PlanCard({ plan, onEdit, onSuccess }: any) {
  const { toast } = useToast();

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active: !plan.is_active })
        .eq("id", plan.id);

      if (error) throw error;
    },
    onSuccess: () => {
      onSuccess();
      toast({
        title: plan.is_active ? "Plano desativado" : "Plano ativado",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        variant: "destructive",
      });
    },
  });

  const getCollectionsText = (count: number) => {
    if (count === -1) return "Todas as coleções";
    return `${count} ${count === 1 ? "coleção" : "coleções"}`;
  };

  const getSwitchLimitText = (limit: number | null) => {
    if (limit === null) return "Ilimitadas";
    return `${limit} ${limit === 1 ? "troca" : "trocas"}`;
  };

  const discount = (plan.price_full || 0) - (plan.price_pix || 0);
  const discountPercent = plan.price_full > 0 ? ((discount / plan.price_full) * 100).toFixed(0) : 0;

  return (
    <Card className={!plan.is_active ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              {plan.is_active ? (
                <Badge variant="default" className="text-xs">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Inativo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preços */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Preço:</span>
            <span className="font-semibold">R$ {(plan.price_full || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Preço PIX:</span>
            <div className="text-right">
              <span className="font-semibold text-green-600">
                R$ {(plan.price_pix || 0).toFixed(2)}
              </span>
              {discount > 0 && (
                <span className="text-xs text-muted-foreground ml-2">(-{discountPercent}%)</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Coleções:</span>
            <span className="font-semibold">
              {plan.collections_count === -1 ? "Todas" : plan.collections_count}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Parcelamento:</span>
            <span className="font-semibold">até {plan.max_installments || 10}x com juros</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            variant={plan.is_active ? "ghost" : "default"}
            size="sm"
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
          >
            {plan.is_active ? "Desativar" : "Ativar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Dialog: Editar Plano
function EditPlanDialog({ plan, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description || "");
  const [priceFull, setPriceFull] = useState(String(plan.price_full || 0));
  const [pixDiscountPercent, setPixDiscountPercent] = useState("10");
  const [maxInstallments, setMaxInstallments] = useState(String(plan.max_installments || 10));
  const [isActive, setIsActive] = useState(plan.is_active);

  // Calcular preço PIX automaticamente
  const calculatePixPrice = () => {
    const priceValue = parseFloat(priceFull) || 0;
    const discountPercent = parseFloat(pixDiscountPercent) || 0;
    const pixPrice = priceValue * (1 - discountPercent / 100);
    return pixPrice;
  };

  const pricePix = calculatePixPrice();

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name,
          description,
          price_full: parseFloat(priceFull),
          price_pix: pricePix,
          max_installments: parseInt(maxInstallments),
          is_active: isActive,
        })
        .eq("id", plan.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "Plano atualizado com sucesso!" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plano: {plan.name}</DialogTitle>
          <DialogDescription>Configure preços e número de peças do plano</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informações Básicas</h3>

            <div>
              <Label htmlFor="name">Nome do Plano</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Trimestral"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o plano..."
                className="mt-2"
              />
            </div>
          </div>

          {/* Preços */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-sm">Preços</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price-full">Preço (R$)</Label>
                <Input
                  id="price-full"
                  type="number"
                  step="0.01"
                  value={priceFull}
                  onChange={(e) => setPriceFull(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="pix-discount">Desconto PIX (%)</Label>
                <Input
                  id="pix-discount"
                  type="number"
                  step="1"
                  value={pixDiscountPercent}
                  onChange={(e) => setPixDiscountPercent(e.target.value)}
                  className="mt-2"
                  placeholder="Ex: 10"
                />
              </div>
            </div>

            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                <strong>Preço PIX:</strong> R$ {pricePix.toFixed(2)}({pixDiscountPercent}% de
                desconto)
              </AlertDescription>
            </Alert>
          </div>

          {/* Parcelamento */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-sm">Parcelamento</h3>

            <div>
              <Label htmlFor="installments">Máximo de Parcelas (com juros)</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                max="12"
                value={maxInstallments}
                onChange={(e) => setMaxInstallments(e.target.value)}
                className="mt-2"
                placeholder="Ex: 10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número máximo de parcelas com juros (ex: 10x de R${" "}
                {(parseFloat(priceFull) / parseInt(maxInstallments || "10")).toFixed(2)} + juros)
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-sm">Status</h3>

            <div className="flex items-center space-x-2">
              <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is-active">Plano Ativo</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
