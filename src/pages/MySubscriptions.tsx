import { useState, useEffect } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Package,
  Clock,
  Eye,
  EyeOff,
  Truck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  XCircle,
  ExternalLink,
  Gift,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toBahiaTime, nowInBahia } from "@/lib/timezone";
import { CutoffCountdown, useIsBeforeCutoff } from "@/components/CutoffCountdown";
import { CollectionDetailModal } from "@/components/CollectionDetailModal";
import { CollectionChangeConfirmation } from "@/components/CollectionChangeConfirmation";

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
          ),
          collections (
            id,
            name
          ),
          bonus_pieces (
            id,
            description,
            image_url,
            status
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Minhas Assinaturas</h1>
          <p className="text-xs text-muted-foreground">
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
  const [isPausing, setIsPausing] = useState(false);
  const isBeforeCutoff = useIsBeforeCutoff();

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
    // Use Bahia timezone for accurate cutoff calculation
    const productionStart = toBahiaTime(new Date(subscription.next_production_start));
    const today = nowInBahia();
    const daysUntilProduction = differenceInDays(productionStart, today);

    return daysUntilProduction > 0; // Pode trocar se ainda não iniciou produção
  };

  const getDaysUntilCutoff = () => {
    if (!subscription.next_production_start) return 0;
    // Use Bahia timezone for accurate cutoff calculation
    const productionStart = toBahiaTime(new Date(subscription.next_production_start));
    const today = nowInBahia();
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

              {/* Cutoff Countdown */}
              <CutoffCountdown variant="alert" />
            </div>
          )}

          {/* Pause Info */}
          {subscription.status === "active" && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pausas disponíveis</span>
                <span className="font-medium">
                  {2 - (subscription.pause_count || 0)} de 2
                </span>
              </div>
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
                  disabled={!isBeforeCutoff}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Trocar Coleção
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPausing(true)}
                        disabled={!isBeforeCutoff || (subscription.pause_count || 0) >= 2}
                        className="flex-1"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Pausar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {!isBeforeCutoff
                        ? "Não é possível pausar após o prazo limite (dia 15)"
                        : (subscription.pause_count || 0) >= 2
                        ? "Limite de pausas atingido (2/2)"
                        : "Pausar próxima entrega"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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

      {/* Dialog: Pausar Assinatura */}
      {isPausing && (
        <PauseSubscriptionDialog
          subscription={subscription}
          isOpen={isPausing}
          onOpenChange={setIsPausing}
          onSuccess={() => {
            onSuccess();
            setIsPausing(false);
          }}
        />
      )}
    </>
  );
}

// Componente: Card de Entrega
function DeliveryCard({ delivery, isLast }: any) {
  // Query collection change history for this delivery
  const changeHistoryQuery = useQuery({
    queryKey: ["collection-change-history", delivery.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_choice_history")
        .select(
          `
          *,
          previous_collection:collections!collection_choice_history_previous_collection_id_fkey(id, name),
          new_collection:collections!collection_choice_history_new_collection_id_fkey(id, name)
        `
        )
        .eq("delivery_id", delivery.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const changeHistory = changeHistoryQuery.data || [];

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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">
              Entrega #{delivery.delivery_number}
            </span>
            <Badge variant="outline" className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            {delivery.auto_maintained && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Auto-mantida
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Esta coleção foi mantida automaticamente da sua escolha anterior. Você pode
                      alterá-la até o dia 15 do mês.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <h4 className="font-semibold mb-2">
            {delivery.collections?.name || delivery.collection_characters?.name || "Personagem não revelado"}
          </h4>

          {/* Bonus Piece Badge - Only for 6th delivery */}
          {delivery.bonus_pieces && delivery.delivery_number === 6 && (
            <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                {delivery.bonus_pieces.image_url && (
                  <img 
                    src={delivery.bonus_pieces.image_url} 
                    alt="Peça Bônus"
                    className="w-12 h-12 object-cover rounded-lg border-2 border-purple-300 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Gift className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span className="font-semibold text-sm text-purple-900">Peça Bônus Exclusiva</span>
                    <Badge className="bg-purple-600 text-white text-xs">
                      Semestral
                    </Badge>
                  </div>
                  <p className="text-xs text-purple-700">
                    {delivery.bonus_pieces.description || 'Peça exclusiva incluída com esta entrega'}
                  </p>
                </div>
              </div>
            </div>
          )}

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
                <span className="font-mono text-sm">Rastreio: {delivery.tracking_code}</span>
                <a
                  href={`https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${delivery.tracking_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Rastrear
                </a>
              </div>
            )}
          </div>

          {/* Collection Change History */}
          {changeHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <RefreshCw className="h-3 w-3" />
                Histórico de Trocas
              </h5>
              <div className="space-y-2">
                {changeHistory.map((change: any) => {
                  const changeDate = toBahiaTime(new Date(change.created_at));
                  const reasonLabel = {
                    manual: "Troca manual",
                    automatic_maintenance: "Manutenção automática",
                    admin_override: "Alteração administrativa",
                  }[change.change_reason] || change.change_reason;

                  const changedBy = change.changed_by_admin ? "Admin" : "Você";

                  return (
                    <div
                      key={change.id}
                      className="text-xs p-2 rounded bg-muted/50 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{reasonLabel}</span>
                        <span className="text-muted-foreground">
                          {format(changeDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {change.previous_collection ? (
                          <>
                            De: <span className="font-medium">{change.previous_collection.name}</span>
                            {" → "}
                            Para: <span className="font-medium">{change.new_collection.name}</span>
                          </>
                        ) : (
                          <>
                            Selecionado: <span className="font-medium">{change.new_collection.name}</span>
                          </>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        Alterado por: <span className="font-medium">{changedBy}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCollection, setDetailCollection] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const isBeforeCutoff = useIsBeforeCutoff();

  // Calculate time remaining for urgency check
  const [timeRemaining, setTimeRemaining] = useState<any>(null);
  
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59);
      const diff = cutoff.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      setTimeRemaining({ days, hours, total: diff });
    };
    
    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const isCloseToCutoff = timeRemaining && (timeRemaining.days === 0 || timeRemaining.days < 3);
  const timeUntilCutoffText = timeRemaining 
    ? timeRemaining.days > 0 
      ? `${timeRemaining.days}d ${timeRemaining.hours}h`
      : `${timeRemaining.hours}h`
    : '';

  const changeMutation = useMutation({
    mutationFn: async () => {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ collection_id: selectedCollection })
        .eq("id", subscription.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({
        title: "✨ Coleção alterada com sucesso!",
        description: "Sua próxima entrega será da nova coleção escolhida.",
        className: "bg-green-50 border-green-200",
      });
      onSuccess();
      onOpenChange(false);
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

  const handleViewDetails = (collection: any) => {
    setDetailCollection(collection);
    setShowDetailModal(true);
  };

  const handleSelectFromModal = (collectionId: string) => {
    setSelectedCollection(collectionId);
  };

  const handleConfirmChange = () => {
    if (selectedCollection === subscription.collection_id) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleFinalConfirm = () => {
    setShowConfirmation(false);
    changeMutation.mutate();
  };

  // Check if cutoff has passed
  if (!isBeforeCutoff) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alterações Bloqueadas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Cutoff Enforcement UI - Task 29.5 */}
            <div className="relative">
              <div className="absolute inset-0 bg-muted/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                <div className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Produção Iniciada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    O prazo para alterações encerrou no dia 15 às 23:59.
                    <br />
                    Não é mais possível trocar de coleção neste mês.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    As alterações serão permitidas novamente no próximo mês (dia 1).
                  </p>
                </div>
              </div>
              
              {/* Grayed out content */}
              <div className="opacity-30 pointer-events-none">
                <div className="grid grid-cols-2 gap-4">
                  {availableCollections.slice(0, 2).map((col: any) => (
                    <div key={col.id} className="p-4 rounded-lg border">
                      <div className="aspect-video bg-muted rounded mb-2" />
                      <h4 className="font-semibold">{col.name}</h4>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <CutoffCountdown variant="alert" />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Trocar Coleção</DialogTitle>
            <DialogDescription>
              Escolha uma nova coleção para sua próxima entrega
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Info sobre trocas ilimitadas */}
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertDescription>
                Você pode trocar <strong>ILIMITADAMENTE</strong> entre suas coleções até o início da produção. 
                O que importa é qual coleção estará selecionada quando a produção iniciar.
              </AlertDescription>
            </Alert>

            {/* Cutoff Countdown */}
            <CutoffCountdown variant="alert" />

            {/* Enhanced Collection Grid - Task 29.1 */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Coleções Disponíveis
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableCollections.map((collection: any) => {
                  const isSelected = selectedCollection === collection.id;
                  const isCurrent = subscription.collection_id === collection.id;
                  
                  return (
                    <div
                      key={collection.id}
                      className={`group relative rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-primary shadow-lg scale-[1.02]'
                          : 'border-border hover:border-primary/50 hover:shadow-md'
                      }`}
                      onClick={() => setSelectedCollection(collection.id)}
                    >
                      {/* Larger Image with Hover Effect */}
                      <div className="relative aspect-video overflow-hidden bg-muted">
                        <img
                          src={collection.image_url || '/placeholder-collection.jpg'}
                          alt={collection.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        
                        {/* Current badge */}
                        {isCurrent && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-blue-500 text-white">
                              Atual
                            </Badge>
                          </div>
                        )}
                        
                        {/* Selected badge */}
                        {isSelected && !isCurrent && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-green-500 text-white">
                              ✓ Selecionada
                            </Badge>
                          </div>
                        )}

                        {/* Revelation status */}
                        <div className="absolute top-2 right-2">
                          {collection.revealed ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <Eye className="w-3 h-3 mr-1" />
                              Revelado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Mistério
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Collection Info */}
                      <div className="p-4">
                        <h4 className="font-semibold text-lg mb-2">{collection.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {collection.description}
                        </p>

                        {/* Rotation Schedule */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {collection.rotation_type === 'fixed'
                              ? 'Disponível todos os meses'
                              : collection.rotation_type === 'odd_months'
                              ? 'Jan, Mar, Mai, Jul, Set, Nov'
                              : 'Fev, Abr, Jun, Ago, Out, Dez'}
                          </span>
                        </div>

                        {/* View Details Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(collection);
                          }}
                        >
                          Ver Detalhes
                        </Button>
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 border-4 border-primary rounded-lg pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile-friendly note */}
            <p className="text-xs text-muted-foreground text-center">
              Toque em uma coleção para selecioná-la ou em "Ver Detalhes" para mais informações
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmChange}
              disabled={selectedCollection === subscription.collection_id || changeMutation.isPending}
            >
              {changeMutation.isPending ? "Trocando..." : "Confirmar Troca"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Collection Detail Modal - Task 29.2 */}
      <CollectionDetailModal
        collection={detailCollection}
        isOpen={showDetailModal}
        onOpenChange={setShowDetailModal}
        onSelect={handleSelectFromModal}
        isSelected={selectedCollection === detailCollection?.id}
        isDisabled={false}
      />

      {/* Confirmation Dialog - Task 29.3 */}
      <CollectionChangeConfirmation
        isOpen={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={handleFinalConfirm}
        previousCollection={currentCollection}
        newCollection={newCollection}
        isCloseToCutoff={isCloseToCutoff}
        timeUntilCutoff={timeUntilCutoffText}
      />
    </>
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

// Dialog: Pausar Assinatura
function PauseSubscriptionDialog({ subscription, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pause-subscription", {
        body: {
          subscriptionId: subscription.id,
        },
      });

      // Requirement 23.7: Handle cutoff validation errors
      if (error) {
        // Parse the error response to get the error code and message
        const errorData = typeof error === 'object' && error !== null ? error : {};
        const errorCode = (errorData as any).error || 'UNKNOWN_ERROR';
        const errorMessage = (errorData as any).message || error.message || "Erro ao pausar assinatura";
        
        // Create a structured error object
        const structuredError = new Error(errorMessage);
        (structuredError as any).code = errorCode;
        throw structuredError;
      }
      
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Assinatura pausada",
        description: `Sua próxima entrega foi pausada. Pausas restantes: ${data.subscription.pauses_remaining}/2`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      // Requirement 23.7: Display specific error message for cutoff rejection
      let errorTitle = "Erro ao pausar";
      let errorMessage = error.message || "Erro ao pausar assinatura";
      
      // Check the error code for specific handling
      const errorCode = error.code || '';
      
      if (errorCode === 'CUTOFF_PASSED' || errorMessage.includes("prazo limite")) {
        errorTitle = "Prazo limite ultrapassado";
        errorMessage = "Não é possível pausar após o dia 15 às 23:59:59. A produção já foi iniciada. Tente novamente no próximo mês.";
      } else if (errorCode === 'PAUSE_LIMIT_EXCEEDED' || errorMessage.includes("Máximo de 2 pausas")) {
        errorTitle = "Limite de pausas atingido";
        errorMessage = "Você já utilizou o máximo de 2 pausas permitidas para esta assinatura.";
      } else if (errorCode === 'NO_UPCOMING_DELIVERY') {
        errorTitle = "Nenhuma entrega futura";
        errorMessage = "Não há entregas futuras para pausar.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const pauseCount = subscription.pause_count || 0;
  const pausesRemaining = 2 - pauseCount;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pausar Próxima Entrega</DialogTitle>
          <DialogDescription>
            Você está prestes a pausar sua próxima entrega. Entenda as consequências:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pause Count Info */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Pausas disponíveis</span>
              <span className="text-lg font-bold">{pausesRemaining} de 2</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Você pode pausar sua assinatura até 2 vezes durante todo o período.
            </p>
          </div>

          {/* Consequences */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>O que acontece ao pausar:</strong>
              <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                <li>Sua próxima entrega será cancelada</li>
                <li>Todas as entregas seguintes serão adiadas em 1 mês</li>
                <li>Você não receberá uma peça no próximo mês</li>
                <li>A capacidade reservada será liberada</li>
                <li>Esta ação não pode ser desfeita</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Warning if last pause */}
          {pausesRemaining === 1 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Esta será sua última pausa disponível. Após confirmar,
                você não poderá pausar esta assinatura novamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Cutoff reminder */}
          <div className="text-sm text-muted-foreground">
            <CutoffCountdown variant="inline" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => pauseMutation.mutate()}
            disabled={pauseMutation.isPending}
            variant="default"
          >
            {pauseMutation.isPending ? "Pausando..." : "Confirmar Pausa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
