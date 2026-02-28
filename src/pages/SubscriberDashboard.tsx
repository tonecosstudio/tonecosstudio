import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Package,
  Clock,
  Eye,
  Truck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Gift,
  ExternalLink,
  Pause,
  XCircle,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { nowInBahia } from "@/lib/timezone";
import { CutoffCountdown, useIsBeforeCutoff } from "@/components/CutoffCountdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SubscriberDashboard() {
  const { user } = useAuth();
  const isBeforeCutoff = useIsBeforeCutoff();

  // Fetch active subscriptions
  const subscriptionsQuery = useQuery({
    queryKey: ["my-subscriptions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          collections (
            id,
            name,
            slug,
            description
          )
        `)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all deliveries for active subscriptions
  const deliveriesQuery = useQuery({
    queryKey: ["my-deliveries", user?.id],
    enabled: Boolean(user?.id) && (subscriptionsQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const subscriptionIds = subscriptionsQuery.data?.map((s: any) => s.id) || [];
      if (subscriptionIds.length === 0) return [];

      const { data, error } = await supabase
        .from("subscription_deliveries")
        .select(`
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
        `)
        .in("subscription_id", subscriptionIds)
        .order("expected_delivery_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const subscriptions = subscriptionsQuery.data || [];
  const deliveries = deliveriesQuery.data || [];
  
  // Get the primary active subscription (first one)
  const activeSubscription = subscriptions[0];

  // Separate deliveries into past and upcoming
  const today = nowInBahia();
  const pastDeliveries = deliveries.filter((d: any) => 
    d.status === "delivered" || 
    (d.actual_delivery_date && new Date(d.actual_delivery_date) < today)
  );
  const upcomingDeliveries = deliveries.filter((d: any) => 
    d.status !== "delivered" && 
    (!d.actual_delivery_date || new Date(d.actual_delivery_date) >= today)
  );

  // Get next delivery
  const nextDelivery = upcomingDeliveries[0];

  return (
    <>
      <SEOHead
        title="Meu Painel"
        description="Gerencie sua assinatura e acompanhe suas entregas"
        keywords={["assinatura", "painel", "entregas"]}
        noindex={true}
      />

      <div className="container py-8 sm:py-12 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Meu Painel</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe sua assinatura e gerencie suas entregas
          </p>
        </header>

        {!activeSubscription ? (
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
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Active Subscription & Next Delivery */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Subscription Section */}
              <ActiveSubscriptionCard subscription={activeSubscription} />

              {/* Next Delivery Section */}
              {nextDelivery && (
                <NextDeliveryCard 
                  delivery={nextDelivery}
                  isBeforeCutoff={isBeforeCutoff}
                />
              )}

              {/* Past Deliveries Section */}
              <PastDeliveriesSection deliveries={pastDeliveries} />

              {/* Upcoming Deliveries Section */}
              <UpcomingDeliveriesSection deliveries={upcomingDeliveries.slice(1)} />
            </div>

            {/* Right Column - Quick Actions */}
            <div className="lg:col-span-1">
              <QuickActionsCard 
                subscription={activeSubscription}
                isBeforeCutoff={isBeforeCutoff}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Active Subscription Card Component
function ActiveSubscriptionCard({ subscription }: any) {
  const getPlanInfo = (plan: string) => {
    switch (plan) {
      case "trimestral":
        return { label: "Trimestral", deliveries: 3 };
      case "semestral":
        return { label: "Semestral", deliveries: 6 };
      case "anual":
        return { label: "Anual", deliveries: 12 };
      default:
        return { label: plan, deliveries: 1 };
    }
  };

  const planInfo = getPlanInfo(subscription.plan_type);
  const progressPercentage = Math.round(
    (subscription.deliveries_completed / subscription.deliveries_total) * 100
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Assinatura Ativa</CardTitle>
          <Badge className="bg-green-500">Ativa</Badge>
        </div>
        <CardDescription>
          Plano {planInfo.label} • {subscription.deliveries_completed}/{subscription.deliveries_total} entregas concluídas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Collection Info */}
        <div>
          <h3 className="font-semibold text-lg mb-1">{subscription.collections?.name}</h3>
          <p className="text-sm text-muted-foreground">{subscription.collections?.description}</p>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Subscription Details */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <span className="text-sm text-muted-foreground block mb-1">Total Pago</span>
            <span className="font-semibold text-green-600 text-lg">
              R$ {(subscription.total_paid || 0).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block mb-1">Início</span>
            <span className="font-medium">
              {format(new Date(subscription.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>

        {/* Pause Count */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pausas disponíveis</span>
            <span className="font-medium text-sm">
              {2 - (subscription.pause_count || 0)} de 2
            </span>
          </div>
        </div>

        {/* Bonus Piece Eligibility for Semestral */}
        {subscription.plan_type === "semestral" && (
          <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <Gift className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-sm text-purple-900">
              <strong>Peça Bônus Exclusiva!</strong> Você receberá uma peça bônus especial na sua 6ª entrega.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Next Delivery Card Component
function NextDeliveryCard({ delivery, isBeforeCutoff }: any) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "scheduled":
      case "pending_choice":
        return { icon: Clock, label: "Agendada", color: "text-blue-500", bg: "bg-blue-100" };
      case "confirmed":
        return { icon: CheckCircle2, label: "Confirmada", color: "text-green-500", bg: "bg-green-100" };
      case "in_production":
        return { icon: Package, label: "Em Produção", color: "text-orange-500", bg: "bg-orange-100" };
      case "shipped":
        return { icon: Truck, label: "Enviada", color: "text-purple-500", bg: "bg-purple-100" };
      default:
        return { icon: AlertCircle, label: status, color: "text-gray-500", bg: "bg-gray-100" };
    }
  };

  const statusInfo = getStatusInfo(delivery.status);
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Próxima Entrega</CardTitle>
          <Badge variant="outline" className={statusInfo.color}>
            {statusInfo.label}
          </Badge>
        </div>
        <CardDescription>Entrega #{delivery.delivery_number}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Collection Info */}
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${statusInfo.bg} flex items-center justify-center`}>
            <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              {delivery.collections?.name || delivery.collection_characters?.name || "Personagem não revelado"}
            </h3>
            {delivery.collection_characters?.description && (
              <p className="text-sm text-muted-foreground">
                {delivery.collection_characters.description}
              </p>
            )}
          </div>
        </div>

        {/* Auto-maintained indicator */}
        {delivery.auto_maintained && (
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Esta coleção foi mantida automaticamente da sua escolha anterior. 
              Você pode alterá-la até o dia 15 do mês.
            </AlertDescription>
          </Alert>
        )}

        {/* Cutoff Countdown */}
        {isBeforeCutoff && (
          <div className="pt-4 border-t">
            <CutoffCountdown variant="alert" />
          </div>
        )}

        {/* Delivery Dates */}
        <div className="space-y-2 pt-4 border-t">
          {delivery.expected_delivery_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Previsão de entrega:{" "}
                <span className="font-medium text-foreground">
                  {format(new Date(delivery.expected_delivery_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </span>
            </div>
          )}
          {delivery.tracking_code && (
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm">{delivery.tracking_code}</span>
              <a
                href={`https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${delivery.tracking_code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Rastrear
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Past Deliveries Section Component
function PastDeliveriesSection({ deliveries }: any) {
  if (deliveries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entregas Anteriores</CardTitle>
        <CardDescription>{deliveries.length} entrega(s) concluída(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deliveries.map((delivery: any) => (
            <DeliveryListItem key={delivery.id} delivery={delivery} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Upcoming Deliveries Section Component
function UpcomingDeliveriesSection({ deliveries }: any) {
  if (deliveries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximas Entregas</CardTitle>
        <CardDescription>{deliveries.length} entrega(s) programada(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deliveries.map((delivery: any) => (
            <DeliveryListItem key={delivery.id} delivery={delivery} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Delivery List Item Component
function DeliveryListItem({ delivery }: any) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "scheduled":
      case "pending_choice":
        return { icon: Clock, label: "Agendada", color: "text-gray-500" };
      case "confirmed":
        return { icon: CheckCircle2, label: "Confirmada", color: "text-green-500" };
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
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <StatusIcon className={`h-5 w-5 ${statusInfo.color} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {delivery.collections?.name || delivery.collection_characters?.name || "Personagem não revelado"}
          </span>
          {delivery.auto_maintained && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Auto
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Coleção mantida automaticamente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {delivery.bonus_pieces && delivery.delivery_number === 6 && (
            <Badge className="bg-purple-600 text-white text-xs">
              <Gift className="h-3 w-3 mr-1" />
              Bônus
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Entrega #{delivery.delivery_number}</span>
          <span>•</span>
          <span className={statusInfo.color}>{statusInfo.label}</span>
          {delivery.expected_delivery_date && (
            <>
              <span>•</span>
              <span>{format(new Date(delivery.expected_delivery_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            </>
          )}
        </div>
      </div>
      {delivery.tracking_code && (
        <a
          href={`https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${delivery.tracking_code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-1 text-xs flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          Rastrear
        </a>
      )}
    </div>
  );
}

// Quick Actions Card Component
function QuickActionsCard({ subscription, isBeforeCutoff }: any) {
  const canPause = isBeforeCutoff && (subscription.pause_count || 0) < 2;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
        <CardDescription>Gerencie sua assinatura</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Change Collection */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={!isBeforeCutoff}
                asChild={isBeforeCutoff}
              >
                <Link to="/minhas-assinaturas">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Trocar Coleção
                </Link>
              </Button>
            </TooltipTrigger>
            {!isBeforeCutoff && (
              <TooltipContent>
                <p>Não é possível trocar após o prazo limite (dia 15)</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Pause Subscription */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={!canPause}
                asChild={canPause}
              >
                <Link to="/minhas-assinaturas">
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar Próxima Entrega
                </Link>
              </Button>
            </TooltipTrigger>
            {!canPause && (
              <TooltipContent>
                <p>
                  {!isBeforeCutoff
                    ? "Não é possível pausar após o prazo limite (dia 15)"
                    : "Limite de pausas atingido (2/2)"}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* View All Subscriptions */}
        <Button
          variant="outline"
          className="w-full justify-start"
          asChild
        >
          <Link to="/minhas-assinaturas">
            <Package className="h-4 w-4 mr-2" />
            Ver Todas as Assinaturas
          </Link>
        </Button>

        {/* Payment History */}
        <Button
          variant="outline"
          className="w-full justify-start"
          asChild
        >
          <Link to="/meus-pagamentos">
            <Calendar className="h-4 w-4 mr-2" />
            Histórico de Pagamentos
          </Link>
        </Button>

        {/* Divider */}
        <div className="border-t pt-3 mt-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            asChild
          >
            <Link to="/minhas-assinaturas">
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar Assinatura
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
