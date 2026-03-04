// @ts-nocheck
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Edit2,
  Trash2,
  Ticket,
  DollarSign,
  Users,
  TrendingUp,
  Copy,
  Check,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  max_uses_per_user: number;
  current_uses: number;
  applicable_to: string | null;
  applicable_ids: string[] | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
};

export default function AdminCoupons() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Buscar cupons
  const couponsQuery = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Coupon[];
    },
  });

  // Buscar estatísticas de uso
  const usageStatsQuery = useQuery({
    queryKey: ["admin-coupon-usage-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupon_usage")
        .select("coupon_id, discount_applied, order_value");

      if (error) throw error;

      const stats = new Map<
        string,
        { uses: number; totalDiscount: number; totalRevenue: number }
      >();

      (data || []).forEach((usage: any) => {
        const current = stats.get(usage.coupon_id) || {
          uses: 0,
          totalDiscount: 0,
          totalRevenue: 0,
        };
        stats.set(usage.coupon_id, {
          uses: current.uses + 1,
          totalDiscount: current.totalDiscount + Number(usage.discount_applied),
          totalRevenue: current.totalRevenue + Number(usage.order_value),
        });
      });

      return stats;
    },
  });

  const coupons = couponsQuery.data || [];
  const usageStats = usageStatsQuery.data || new Map();

  // Estatísticas gerais
  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.is_active).length,
    totalUses: Array.from(usageStats.values()).reduce((acc, s) => acc + s.uses, 0),
    totalDiscount: Array.from(usageStats.values()).reduce((acc, s) => acc + s.totalDiscount, 0),
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Código copiado!", description: code });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <SEOHead title="Admin - Cupons" description="Gerenciar cupons de desconto" noindex={true} />

      <AdminLayout>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cupons de Desconto</h1>
            <p className="text-muted-foreground mt-2">Crie e gerencie cupons promocionais</p>
          </div>
          <CreateCouponDialog
            isOpen={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-coupons"] });
              setIsCreateOpen(false);
            }}
          />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Cupons</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cupons Ativos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Desconto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                R$ {stats.totalDiscount.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Cupons */}
        <Card>
          <CardHeader>
            <CardTitle>Cupons Cadastrados</CardTitle>
            <CardDescription>{coupons.length} cupom(ns) no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {coupons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum cupom cadastrado</p>
                <Button variant="link" onClick={() => setIsCreateOpen(true)} className="mt-2">
                  Criar primeiro cupom
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {coupons.map((coupon) => (
                  <CouponCard
                    key={coupon.id}
                    coupon={coupon}
                    usageStats={usageStats.get(coupon.id)}
                    onEdit={() => setEditingCoupon(coupon)}
                    onCopy={() => copyCode(coupon.code)}
                    isCopied={copiedCode === coupon.code}
                    onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-coupons"] })}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        {editingCoupon && (
          <EditCouponDialog
            coupon={editingCoupon}
            isOpen={Boolean(editingCoupon)}
            onOpenChange={(open) => !open && setEditingCoupon(null)}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-coupons"] });
              setEditingCoupon(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
}

// Componente: Card de Cupom
function CouponCard({ coupon, usageStats, onEdit, onCopy, isCopied, onSuccess }: any) {
  const { toast } = useToast();

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;
    },
    onSuccess: () => {
      onSuccess();
      toast({
        title: coupon.is_active ? "Cupom desativado" : "Cupom ativado",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coupons").delete().eq("id", coupon.id);

      if (error) throw error;
    },
    onSuccess: () => {
      onSuccess();
      toast({ title: "Cupom excluído" });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        variant: "destructive",
      });
    },
  });

  const getDiscountText = () => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}% OFF`;
    }
    return `R$ ${coupon.discount_value.toFixed(2)} OFF`;
  };

  const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
  const isMaxedOut = coupon.max_uses && coupon.current_uses >= coupon.max_uses;

  return (
    <div
      className={`p-4 rounded-lg border ${
        !coupon.is_active || isExpired || isMaxedOut ? "opacity-60 bg-muted/20" : "bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Código e Status */}
          <div className="flex items-center gap-2 mb-2">
            <code className="text-lg font-bold bg-primary/10 px-3 py-1 rounded">{coupon.code}</code>
            <Button size="sm" variant="ghost" onClick={onCopy} className="h-7 w-7 p-0">
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {coupon.is_active && !isExpired && !isMaxedOut ? (
              <Badge variant="default" className="text-xs">
                Ativo
              </Badge>
            ) : isExpired ? (
              <Badge variant="destructive" className="text-xs">
                Expirado
              </Badge>
            ) : isMaxedOut ? (
              <Badge variant="secondary" className="text-xs">
                Esgotado
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Inativo
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-bold text-green-600">
              {getDiscountText()}
            </Badge>
          </div>

          {/* Descrição */}
          {coupon.description && (
            <p className="text-sm text-muted-foreground mb-3">{coupon.description}</p>
          )}

          {/* Informações */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Usos:</span>
              <p className="font-medium">
                {usageStats?.uses || 0}
                {coupon.max_uses ? ` / ${coupon.max_uses}` : " / ∞"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Por usuário:</span>
              <p className="font-medium">{coupon.max_uses_per_user}x</p>
            </div>
            <div>
              <span className="text-muted-foreground">Valor mín:</span>
              <p className="font-medium">R$ {coupon.min_order_value.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Validade:</span>
              <p className="font-medium">
                {coupon.valid_until
                  ? format(new Date(coupon.valid_until), "dd/MM/yyyy", { locale: ptBR })
                  : "Sem limite"}
              </p>
            </div>
          </div>

          {/* Estatísticas de uso */}
          {usageStats && usageStats.uses > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Desconto dado:</span>
                  <span className="font-medium text-orange-600 ml-1">
                    R$ {usageStats.totalDiscount.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Receita gerada:</span>
                  <span className="font-medium text-green-600 ml-1">
                    R$ {usageStats.totalRevenue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-1 items-center">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <div className="px-2">
            <Switch
              checked={coupon.is_active}
              onCheckedChange={() => toggleActiveMutation.mutate()}
              disabled={toggleActiveMutation.isPending}
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
                <AlertDialogDescription>
                  O cupom <strong>{coupon.code}</strong> será removido permanentemente. Esta ação
                  não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

// Dialog: Criar Cupom
function CreateCouponDialog({ isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("0");
  const [maxUses, setMaxUses] = useState("");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState("1");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const { error } = await supabase.from("coupons").insert({
        code: code.toUpperCase().trim(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_order_value: parseFloat(minOrderValue),
        max_uses: maxUses ? parseInt(maxUses) : null,
        max_uses_per_user: parseInt(maxUsesPerUser),
        valid_until: validUntil || null,
        is_active: isActive,
        created_by: userData.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      qc.invalidateQueries({ queryKey: ["coupons"] });
      qc.invalidateQueries({ queryKey: ["active-coupons"] });
      toast({ title: "Cupom criado com sucesso!" });
      setCode("");
      setDescription("");
      setDiscountValue("");
      setMinOrderValue("0");
      setMaxUses("");
      setMaxUsesPerUser("1");
      setValidUntil("");
      setIsActive(true);
      onSuccess();
    },
    onError: (error: any) => {
      let errorMessage = error.message;

      // Tratar erro de código duplicado
      if (error.message?.includes("duplicate") || error.code === "23505") {
        errorMessage = `O código "${code}" já existe. Escolha outro código.`;
      }

      toast({
        title: "Erro ao criar cupom",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cupom
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Cupom</DialogTitle>
          <DialogDescription>Configure um cupom de desconto promocional</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Código */}
          <div>
            <Label htmlFor="code">Código do Cupom *</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: PROMO2026"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={generateCode}>
                Gerar
              </Button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a promoção..."
              className="mt-2"
            />
          </div>

          {/* Tipo e Valor do Desconto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount-type">Tipo de Desconto</Label>
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discount-value">
                Valor do Desconto * {discountType === "percentage" ? "(%)" : "(R$)"}
              </Label>
              <Input
                id="discount-value"
                type="number"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "10" : "50.00"}
                className="mt-2"
              />
            </div>
          </div>

          {/* Valor Mínimo */}
          <div>
            <Label htmlFor="min-order">Valor Mínimo do Pedido (R$)</Label>
            <Input
              id="min-order"
              type="number"
              step="0.01"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Limites de Uso */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-uses">Usos Totais</Label>
              <Input
                id="max-uses"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Ilimitado"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Deixe vazio para ilimitado</p>
            </div>

            <div>
              <Label htmlFor="max-uses-user">Usos por Usuário</Label>
              <Input
                id="max-uses-user"
                type="number"
                value={maxUsesPerUser}
                onChange={(e) => setMaxUsesPerUser(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          {/* Validade */}
          <div>
            <Label htmlFor="valid-until">Válido Até</Label>
            <Input
              id="valid-until"
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Deixe vazio para sem data de expiração
            </p>
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label>Cupom Ativo</Label>
              <p className="text-sm text-muted-foreground">Disponível para uso imediatamente</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!code.trim() || !discountValue || createMutation.isPending}
          >
            {createMutation.isPending ? "Criando..." : "Criar Cupom"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Editar Cupom
function EditCouponDialog({ coupon, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [description, setDescription] = useState(coupon.description || "");
  const [discountValue, setDiscountValue] = useState(String(coupon.discount_value));
  const [minOrderValue, setMinOrderValue] = useState(String(coupon.min_order_value));
  const [maxUses, setMaxUses] = useState(coupon.max_uses ? String(coupon.max_uses) : "");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(String(coupon.max_uses_per_user));
  const [validUntil, setValidUntil] = useState(
    coupon.valid_until ? coupon.valid_until.slice(0, 16) : ""
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("coupons")
        .update({
          description: description.trim() || null,
          discount_value: parseFloat(discountValue),
          min_order_value: parseFloat(minOrderValue),
          max_uses: maxUses ? parseInt(maxUses) : null,
          max_uses_per_user: parseInt(maxUsesPerUser),
          valid_until: validUntil || null,
        })
        .eq("id", coupon.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      qc.invalidateQueries({ queryKey: ["coupons"] });
      qc.invalidateQueries({ queryKey: ["active-coupons"] });
      toast({ title: "Cupom atualizado!" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cupom: {coupon.code}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>
              Valor do Desconto {coupon.discount_type === "percentage" ? "(%)" : "(R$)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Valor Mínimo (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Usos Totais</Label>
              <Input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Ilimitado"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Usos por Usuário</Label>
              <Input
                type="number"
                value={maxUsesPerUser}
                onChange={(e) => setMaxUsesPerUser(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label>Válido Até</Label>
            <Input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
