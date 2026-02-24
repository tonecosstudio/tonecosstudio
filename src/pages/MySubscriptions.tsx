import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Package,
  Clock,
  Eye,
  Truck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MySubscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);

  // Buscar minhas assinaturas
  const subscriptionsQuery = useQuery({
    queryKey: ["my-subscriptions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          `
          *,
          collections (
            id,
            name,
            slug,
            description
          )
        `
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar coleções da assinatura (múltiplas)
  const subscriptionCollectionsQuery = useQuery({
    queryKey: ["subscription-collections", selectedSubscription],
    enabled: Boolean(selectedSubscription),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_collections")
        .select(
          `
          collection_id,
          collections (
            id,
            name,
            slug,
            description
          )
        `
        )
        .eq("subscription_id", selectedSubscription);

      if (error) throw error;
      return data?.map((sc) => sc.collections).filter(Boolean) || [];
    },
  });

  // Buscar entregas da assinatura selecionada
  const deliveriesQuery = useQuery({
    queryKey: ["my-deliveries", selectedSubscription],
    enabled: Boolean(selectedSubscription),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_deliveries")
        .select(
          `
          *,
          collection_characters (
            name,
            release_order,
            description
          )
        `
        )
        .eq("subscription_id", selectedSubscription)
        .order("delivery_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar coleções disponíveis para troca (apenas as da assinatura)
  const availableCollectionsQuery = useQuery({
    queryKey: ["available-collections-for-subscription", selectedSubscription],
    enabled: Boolean(selectedSubscription),
    queryFn: async () => {
      // Buscar coleções da assinatura
      const { data, error } = await supabase
        .from("subscription_collections")
        .select(
          `
          collections (
            id,
            name,
            slug,
            description,
            is_active
          )
        `
        )
        .eq("subscription_id", selectedSubscription);

      if (error) throw error;
      return data?.map((sc) => sc.collections).filter((c) => c && c.is_active) || [];
    },
  });

  const subscriptions = subscriptionsQuery.data || [];
  const deliveries = deliveriesQuery.data || [];
  const availableCollections = availableCollectionsQuery.data || [];
  const subscriptionCollections = subscriptionCollectionsQuery.data || [];

  return (
    <>
      <SEOHead
        title="Minhas Assinaturas"
        description="Gerencie suas assinaturas de coleções"
        keywords={["assinaturas", "coleções", "entregas"]}
        noindex={true}
      />

      <div className="container py-8 sm:py-12 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Minhas Assinaturas</h1>
          <p className="text-muted-foreground">
            Gerencie suas assinaturas de coleções e acompanhe suas entregas
          </p>
        </header>

        {subscriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma assinatura ativa</h3>
              <p className="text-muted-foreground text-center mb-6">
                Assine uma coleção e receba personagens exclusivos todo mês
              </p>
              <Button asChild>
                <Link to="/colecoes">Explorar Coleções</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Lista de Assinaturas */}
            <div className="space-y-6">
              {subscriptions.map((subscription: any) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  isSelected={selectedSubscription === subscription.id}
                  onSelect={() => setSelectedSubscription(subscription.id)}
                  availableCollections={
                    selectedSubscription === subscription.id ? availableCollections : []
                  }
                  subscriptionCollections={
                    selectedSubscription === subscription.id ? subscriptionCollections : []
                  }
                  onSuccess={() => qc.invalidateQueries({ queryKey: ["my-subscriptions"] })}
                />
              ))}
            </div>

            {/* Entregas */}
            <Card className="lg:sticky lg:top-4 h-fit">
              <CardHeader>
                <CardTitle>Timeline de Entregas</CardTitle>
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
                  <div className="space-y-4">
                    {deliveries.map((delivery: any, index: number) => (
                      <DeliveryCard
                        key={delivery.id}
                        delivery={delivery}
                        isLast={index === deliveries.length - 1}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

// Componente: Card de Assinatura
function SubscriptionCard({
  subscription,
  isSelected,
  onSelect,
  availableCollections,
  subscriptionCollections,
  onSuccess,
}: any) {
  const { toast } = useToast();
  const [isChangingCollection, setIsChangingCollection] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const getPlanInfo = (plan: string) => {
    switch (plan) {
      case "trimestral":
        return { label: "Trimestral", collections: 2 };
      case "semestral":
        return { label: "Semestral", collections: 3 };
      case "anual":
        return { label: "Anual", collections: "Todas" };
      default:
        return { label: plan, collections: 1 };
    }
  };

  const planInfo = getPlanInfo(subscription.plan_type);

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

  // Calcular se pode trocar de coleção
  const canChangeCollection = () => {
    if (subscription.status !== "active") return false;
    if (!subscription.next_production_start) return false;

    // Data de corte: até o dia antes de iniciar a produção
    const productionStart = new Date(subscription.next_production_start);
    const today = new Date();
    const daysUntilProduction = differenceInDays(productionStart, today);

    return daysUntilProduction > 0; // Pode trocar se ainda não iniciou produção
  };

  const getDaysUntilCutoff = () => {
    if (!subscription.next_production_start) return 0;
    const productionStart = new Date(subscription.next_production_start);
    const today = new Date();
    const daysUntilProduction = differenceInDays(productionStart, today);
    return Math.max(0, daysUntilProduction);
  };

  const canChange = canChangeCollection();
  const daysUntilCutoff = getDaysUntilCutoff();

  return (
    <>
      <Card
        className={`cursor-pointer transition-all ${
          isSelected ? "border-primary shadow-lg" : "hover:shadow-md"
        }`}
        onClick={onSelect}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold">
                  {subscription.collections?.name || "Coleção"}
                </h3>
                {getStatusBadge(subscription.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Plano {planInfo.label} • {subscription.deliveries_completed}/
                {subscription.total_deliveries} entregas
                {subscriptionCollections.length > 0 && (
                  <span className="block mt-1">
                    {subscriptionCollections.length}{" "}
                    {subscriptionCollections.length === 1 ? "coleção" : "coleções"} disponíveis
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progresso */}
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {Math.round(
                  (subscription.deliveries_completed / subscription.total_deliveries) * 100
                )}
                %
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${(subscription.deliveries_completed / subscription.total_deliveries) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block mb-1">Total Pago</span>
              <span className="font-semibold text-green-600">
                R$ {(subscription.total_paid || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Início</span>
              <span className="font-medium">
                {format(new Date(subscription.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Próxima entrega */}
          {subscription.status === "active" && (
            <div className="pt-4 border-t space-y-3">
              {subscription.next_delivery_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Próxima entrega:{" "}
                    {format(new Date(subscription.next_delivery_date), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}

              {subscription.next_production_start && (
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Início da produção:{" "}
                    {format(new Date(subscription.next_production_start), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}

              {/* Alerta de troca */}
              {canChange ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Você pode trocar de coleção por mais{" "}
                    <strong>
                      {daysUntilCutoff} {daysUntilCutoff === 1 ? "dia" : "dias"}
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      Trocas ilimitadas entre suas {subscriptionCollections.length}{" "}
                      {subscriptionCollections.length === 1 ? "coleção" : "coleções"}.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>Troca bloqueada. Personagem em produção.</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            {subscription.status === "active" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingCollection(true)}
                  disabled={!canChange}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Trocar Coleção
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCancelling(true)}
                  className="text-destructive hover:text-destructive"
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Trocar Coleção */}
      {isChangingCollection && availableCollections.length > 0 && (
        <ChangeCollectionDialog
          subscription={subscription}
          availableCollections={availableCollections}
          isOpen={isChangingCollection}
          onOpenChange={setIsChangingCollection}
          onSuccess={() => {
            onSuccess();
            setIsChangingCollection(false);
          }}
        />
      )}

      {/* Dialog: Cancelar Assinatura */}
      {isCancelling && (
        <CancelSubscriptionDialog
          subscription={subscription}
          isOpen={isCancelling}
          onOpenChange={setIsCancelling}
          onSuccess={() => {
            onSuccess();
            setIsCancelling(false);
          }}
        />
      )}
    </>
  );
}

// Componente: Card de Entrega
function DeliveryCard({ delivery, isLast }: any) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "scheduled":
        return { icon: Clock, label: "Agendada", color: "text-gray-500", bg: "bg-gray-100" };
      case "revealed":
        return { icon: Eye, label: "Revelada", color: "text-blue-500", bg: "bg-blue-100" };
      case "in_production":
        return {
          icon: Package,
          label: "Em Produção",
          color: "text-orange-500",
          bg: "bg-orange-100",
        };
      case "shipped":
        return { icon: Truck, label: "Enviada", color: "text-purple-500", bg: "bg-purple-100" };
      case "delivered":
        return {
          icon: CheckCircle2,
          label: "Entregue",
          color: "text-green-500",
          bg: "bg-green-100",
        };
      default:
        return { icon: AlertCircle, label: status, color: "text-gray-500", bg: "bg-gray-100" };
    }
  };

  const statusInfo = getStatusInfo(delivery.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="relative">
      {/* Linha conectora */}
      {!isLast && <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />}

      <div className="flex gap-4">
        {/* Ícone */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full ${statusInfo.bg} flex items-center justify-center relative z-10`}
        >
          <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 pb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">
              Entrega #{delivery.delivery_number}
            </span>
            <Badge variant="outline" className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          </div>

          <h4 className="font-semibold mb-2">
            {delivery.collection_characters?.name || "Personagem não revelado"}
          </h4>

          {delivery.collection_characters?.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {delivery.collection_characters.description}
            </p>
          )}

          {/* Datas */}
          <div className="space-y-1 text-sm text-muted-foreground">
            {delivery.reveal_date && (
              <div className="flex items-center gap-2">
                <Eye className="h-3 w-3" />
                <span>
                  Revelado em{" "}
                  {format(new Date(delivery.reveal_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
            {delivery.expected_delivery_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>
                  Previsão:{" "}
                  {format(new Date(delivery.expected_delivery_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
            {delivery.tracking_code && (
              <div className="flex items-center gap-2">
                <Truck className="h-3 w-3" />
                <span className="font-mono">Rastreio: {delivery.tracking_code}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dialog: Trocar Coleção
function ChangeCollectionDialog({
  subscription,
  availableCollections,
  isOpen,
  onOpenChange,
  onSuccess,
}: any) {
  const { toast } = useToast();
  const [selectedCollection, setSelectedCollection] = useState(subscription.collection_id);

  const changeMutation = useMutation({
    mutationFn: async () => {
      // TODO: Descomentar após aplicar migration e regenerar tipos
      // Registrar troca no histórico
      // const { error: historyError } = await supabase
      //   .from("subscription_collection_changes")
      //   .insert({
      //     subscription_id: subscription.id,
      //     old_collection_id: subscription.collection_id,
      //     new_collection_id: selectedCollection,
      //     changed_at: new Date().toISOString(),
      //   });
      // if (historyError) throw historyError;

      // Atualizar assinatura
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ collection_id: selectedCollection })
        .eq("id", subscription.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({
        title: "Coleção alterada!",
        description: "Sua próxima entrega será da nova coleção escolhida.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao trocar coleção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const currentCollection = availableCollections.find(
    (c: any) => c.id === subscription.collection_id
  );
  const newCollection = availableCollections.find((c: any) => c.id === selectedCollection);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trocar Coleção</DialogTitle>
          <DialogDescription>Escolha uma nova coleção para sua próxima entrega</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info sobre trocas ilimitadas */}
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertDescription>
              Você pode trocar ILIMITADAMENTE entre suas coleções até o início da produção. O que
              importa é qual coleção estará selecionada quando a produção iniciar.
            </AlertDescription>
          </Alert>

          {/* Coleção Atual */}
          <div>
            <label className="text-sm font-medium mb-2 block">Coleção Atual</label>
            <div className="p-4 rounded-lg border bg-muted/50">
              <h4 className="font-semibold mb-1">{currentCollection?.name}</h4>
              <p className="text-sm text-muted-foreground">{currentCollection?.description}</p>
            </div>
          </div>

          {/* Nova Coleção */}
          <div>
            <label className="text-sm font-medium mb-2 block">Nova Coleção</label>
            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCollections.map((collection: any) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {newCollection && newCollection.id !== subscription.collection_id && (
              <div className="mt-3 p-4 rounded-lg border">
                <h4 className="font-semibold mb-1">{newCollection.name}</h4>
                <p className="text-sm text-muted-foreground">{newCollection.description}</p>
              </div>
            )}
          </div>

          {/* Aviso */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A troca será aplicada na próxima entrega. Você pode trocar quantas vezes quiser até o
              início da produção.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => changeMutation.mutate()}
            disabled={selectedCollection === subscription.collection_id || changeMutation.isPending}
          >
            {changeMutation.isPending ? "Trocando..." : "Confirmar Troca"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Cancelar Assinatura
function CancelSubscriptionDialog({ subscription, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: {
          subscriptionId: subscription.id,
          reason: reason || "Não informado",
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Assinatura cancelada",
        description: "Você não receberá mais entregas desta assinatura.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar Assinatura</DialogTitle>
          <DialogDescription>Tem certeza que deseja cancelar esta assinatura?</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta ação não pode ser desfeita. Você perderá as entregas futuras.
            </AlertDescription>
          </Alert>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Motivo do cancelamento (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Conte-nos o motivo..."
              className="w-full min-h-[100px] p-3 rounded-lg border bg-background"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
