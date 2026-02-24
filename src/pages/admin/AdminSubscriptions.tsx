import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Package, DollarSign, Clock, Eye, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);

  // Buscar assinaturas
  const subscriptionsQuery = useQuery({
    queryKey: ["admin-subscriptions", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("subscriptions")
        .select(`
          *,
          collections (
            name,
            slug
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Buscar emails dos usuários da tabela profiles
      const subscriptionsWithEmails = await Promise.all(
        (data || []).map(async (sub: any) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', sub.user_id)
            .maybeSingle();
          
          return {
            ...sub,
            user_email: profileData?.email || "N/A",
          };
        })
      );

      return subscriptionsWithEmails;
    },
  });

  // Buscar entregas de uma assinatura
  const deliveriesQuery = useQuery({
    queryKey: ["admin-deliveries", selectedSubscription],
    enabled: Boolean(selectedSubscription),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_deliveries")
        .select(`
          *,
          collection_characters (
            name,
            release_order,
            description
          )
        `)
        .eq("subscription_id", selectedSubscription)
        .order("delivery_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Stats
  const stats = {
    total: subscriptionsQuery.data?.length || 0,
    active: subscriptionsQuery.data?.filter((s: any) => s.status === "active").length || 0,
    paused: subscriptionsQuery.data?.filter((s: any) => s.status === "paused").length || 0,
    revenue: subscriptionsQuery.data?.reduce((acc: number, s: any) => acc + (s.total_paid || 0), 0) || 0,
  };

  const subscriptions = subscriptionsQuery.data || [];
  const deliveries = deliveriesQuery.data || [];

  return (
    <>
      <SEOHead
        title="Admin - Assinaturas"
        description="Gerenciar assinaturas de coleções"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Assinaturas</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as assinaturas de coleções e entregas
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Assinaturas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pausadas</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.paused}</div>
              <p className="text-xs text-muted-foreground">Temporariamente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.revenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total recebido</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="paused">Pausadas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                    <SelectItem value="completed">Completas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout em 2 colunas */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Lista de Assinaturas */}
          <Card>
            <CardHeader>
              <CardTitle>Assinaturas</CardTitle>
              <CardDescription>
                {subscriptions.length} assinatura(s) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma assinatura encontrada</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {subscriptions.map((subscription: any) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      isSelected={selectedSubscription === subscription.id}
                      onSelect={() => setSelectedSubscription(subscription.id)}
                      onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-subscriptions"] })}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhes e Entregas */}
          <Card>
            <CardHeader>
              <CardTitle>Entregas</CardTitle>
              <CardDescription>
                {selectedSubscription
                  ? `${deliveries.length} entrega(s) programada(s)`
                  : "Selecione uma assinatura"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedSubscription ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma assinatura para ver as entregas</p>
                </div>
              ) : deliveries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma entrega programada</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {deliveries.map((delivery: any) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-deliveries"] })}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}

// Componente: Card de Assinatura
function SubscriptionCard({ subscription, isSelected, onSelect, onSuccess }: any) {
  const { toast } = useToast();
  const [isManaging, setIsManaging] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Ativa</Badge>;
      case "paused":
        return <Badge variant="secondary">Pausada</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelada</Badge>;
      case "completed":
        return <Badge variant="outline">Completa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case "trimestral":
        return "Trimestral (3 entregas)";
      case "semestral":
        return "Semestral (7 entregas)";
      case "anual":
        return "Anual (12 entregas)";
      default:
        return plan;
    }
  };

  return (
    <>
      <div
        className={`p-4 rounded-lg border cursor-pointer transition-all ${
          isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
        }`}
        onClick={onSelect}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">
                  {subscription.user_email}
                </h4>
                {getStatusBadge(subscription.status)}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscription.collections?.name || "Coleção não encontrada"}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsManaging(true);
              }}
            >
              Gerenciar
            </Button>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Plano:</span>
              <p className="font-medium">{getPlanLabel(subscription.plan_type)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Progresso:</span>
              <p className="font-medium">
                {subscription.deliveries_completed}/{subscription.total_deliveries}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Pago:</span>
              <p className="font-medium text-green-600">
                R$ {(subscription.total_paid || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Início:</span>
              <p className="font-medium">
                {format(new Date(subscription.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Próxima entrega */}
          {subscription.next_delivery_date && subscription.status === "active" && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Próxima entrega: {format(new Date(subscription.next_delivery_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de Gerenciamento */}
      {isManaging && (
        <ManageSubscriptionDialog
          subscription={subscription}
          isOpen={isManaging}
          onOpenChange={setIsManaging}
          onSuccess={() => {
            onSuccess();
            setIsManaging(false);
          }}
        />
      )}
    </>
  );
}

// Componente: Card de Entrega
function DeliveryCard({ delivery, onSuccess }: any) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "scheduled":
        return { icon: Clock, label: "Agendada", color: "text-gray-500" };
      case "revealed":
        return { icon: Eye, label: "Revelada", color: "text-blue-500" };
      case "in_production":
        return { icon: Package, label: "Em Produção", color: "text-orange-500" };
      case "shipped":
        return { icon: Truck, label: "Enviada", color: "text-purple-500" };
      case "delivered":
        return { icon: CheckCircle2, label: "Entregue", color: "text-green-500" };
      default:
        return { icon: AlertCircle, label: status, color: "text-gray-500" };
    }
  };

  const statusInfo = getStatusInfo(delivery.status);
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground">
                #{delivery.delivery_number}
              </span>
              <h4 className="font-medium text-sm">
                {delivery.collection_characters?.name || "Personagem não revelado"}
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
              <span className={statusInfo.color}>{statusInfo.label}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsUpdating(true)}
          >
            Atualizar
          </Button>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {delivery.reveal_date && (
            <div>
              <span>Revelação:</span>
              <p className="font-medium text-foreground">
                {format(new Date(delivery.reveal_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          )}
          {delivery.expected_delivery_date && (
            <div>
              <span>Previsão:</span>
              <p className="font-medium text-foreground">
                {format(new Date(delivery.expected_delivery_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          )}
          {delivery.shipping_date && (
            <div>
              <span>Enviado:</span>
              <p className="font-medium text-foreground">
                {format(new Date(delivery.shipping_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          )}
          {delivery.tracking_code && (
            <div>
              <span>Rastreio:</span>
              <p className="font-medium text-foreground font-mono">
                {delivery.tracking_code}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de Atualização */}
      {isUpdating && (
        <UpdateDeliveryDialog
          delivery={delivery}
          isOpen={isUpdating}
          onOpenChange={setIsUpdating}
          onSuccess={() => {
            onSuccess();
            setIsUpdating(false);
          }}
        />
      )}
    </>
  );
}

// Dialog: Gerenciar Assinatura
function ManageSubscriptionDialog({ subscription, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [status, setStatus] = useState(subscription.status);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status })
        .eq("id", subscription.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Assinatura atualizada!" });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Assinatura</DialogTitle>
          <DialogDescription>
            {subscription.user_email} - {subscription.collections?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="completed">Completa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-lg bg-muted space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plano:</span>
              <span className="font-medium">{subscription.plan_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entregas:</span>
              <span className="font-medium">
                {subscription.deliveries_completed}/{subscription.total_deliveries}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Pago:</span>
              <span className="font-medium text-green-600">
                R$ {(subscription.total_paid || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Atualizar Entrega
function UpdateDeliveryDialog({ delivery, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [status, setStatus] = useState(delivery.status);
  const [trackingCode, setTrackingCode] = useState(delivery.tracking_code || "");
  const [shippingCarrier, setShippingCarrier] = useState(delivery.shipping_carrier || "");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates: any = { status };

      if (status === "shipped" || status === "delivered") {
        updates.tracking_code = trackingCode || null;
        updates.shipping_carrier = shippingCarrier || null;
        if (!delivery.shipping_date) {
          updates.shipping_date = new Date().toISOString();
        }
      }

      if (status === "delivered" && !delivery.delivered_at) {
        updates.delivered_at = new Date().toISOString();
      }

      if (status === "in_production" && !delivery.production_start_date) {
        updates.production_start_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("subscription_deliveries")
        .update(updates)
        .eq("id", delivery.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Entrega atualizada!" });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar Entrega</DialogTitle>
          <DialogDescription>
            Entrega #{delivery.delivery_number} - {delivery.collection_characters?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="revealed">Revelada</SelectItem>
                <SelectItem value="in_production">Em Produção</SelectItem>
                <SelectItem value="shipped">Enviada</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === "shipped" || status === "delivered") && (
            <>
              <div>
                <Label>Código de Rastreio</Label>
                <Input
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="BR123456789"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Transportadora</Label>
                <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="correios">Correios</SelectItem>
                    <SelectItem value="jadlog">Jadlog</SelectItem>
                    <SelectItem value="loggi">Loggi</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
