import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, Package, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

export interface Cycle {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  open_start: string;
  open_end: string;
  production_start: string;
  production_end: string;
  shipping_date: string;
  status: "open" | "production" | "shipping" | "completed";
  capacity_current: number;
  capacity_max: number;
}

interface CycleInfoProps {
  cycle: Cycle | null;
  showCountdown?: boolean;
  isLoading?: boolean;
}

const TIMEZONE = "America/Bahia";

export function CycleInfo({ cycle, showCountdown = true, isLoading = false }: CycleInfoProps) {
  const [timeUntilClose, setTimeUntilClose] = useState<number>(0);

  useEffect(() => {
    if (!cycle || !showCountdown || cycle.status !== "open") return;

    const updateCountdown = () => {
      const now = new Date();
      const closeTime = toZonedTime(new Date(cycle.open_end), TIMEZONE);
      const diff = closeTime.getTime() - now.getTime();
      setTimeUntilClose(Math.max(0, diff));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [cycle, showCountdown]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informações do Ciclo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-6 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cycle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informações do Ciclo</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum ciclo ativo no momento. Aguarde a abertura do próximo ciclo.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const openEnd = toZonedTime(new Date(cycle.open_end), TIMEZONE);
  const shippingDate = toZonedTime(new Date(cycle.shipping_date), TIMEZONE);

  const formatCountdown = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const getStatusBadge = (status: Cycle["status"]) => {
    const variants = {
      open: { label: "Aberto", className: "bg-green-500" },
      production: { label: "Em Produção", className: "bg-yellow-500" },
      shipping: { label: "Enviando", className: "bg-blue-500" },
      completed: { label: "Concluído", className: "bg-gray-500" },
    };

    const variant = variants[status];
    return (
      <Badge className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  const capacityPercentage = (cycle.capacity_current / cycle.capacity_max) * 100;
  const isNearCapacity = capacityPercentage >= 80;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ciclo {cycle.cycle_number} - {format(openEnd, "MMMM/yyyy", { locale: ptBR })}</CardTitle>
          {getStatusBadge(cycle.status)}
        </div>
        <CardDescription>
          Informações sobre o ciclo de produção atual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status e Countdown */}
        {cycle.status === "open" && showCountdown && timeUntilClose > 0 && (
          <Alert className={isNearCapacity ? "border-amber-500 bg-amber-50" : ""}>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">
                Tempo restante para alterações: {formatCountdown(timeUntilClose)}
              </div>
              <div className="text-xs text-muted-foreground">
                Ciclo fecha em {format(openEnd, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {cycle.status === "production" && (
          <Alert className="border-yellow-500 bg-yellow-50">
            <Package className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              Ciclo em produção. Alterações não são mais permitidas.
            </AlertDescription>
          </Alert>
        )}

        {/* Capacidade */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capacidade do Ciclo</span>
            <span className="font-medium">
              {cycle.capacity_current} / {cycle.capacity_max}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                isNearCapacity ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            />
          </div>
          {isNearCapacity && (
            <p className="text-xs text-amber-600">
              Atenção: Ciclo próximo da capacidade máxima
            </p>
          )}
        </div>

        {/* Data de Envio */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Envio Previsto</p>
            <p className="text-lg font-bold text-primary">
              {format(shippingDate, "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">
              Envio até o 5º dia útil após o fechamento do ciclo
            </p>
          </div>
        </div>

        {/* Datas do Ciclo */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Período de Pedidos:</span>
            <span className="font-medium">
              {format(toZonedTime(new Date(cycle.open_start), TIMEZONE), "dd/MM", { locale: ptBR })} -{" "}
              {format(openEnd, "dd/MM", { locale: ptBR })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Período de Produção:</span>
            <span className="font-medium">
              {format(toZonedTime(new Date(cycle.production_start), TIMEZONE), "dd/MM", { locale: ptBR })} -{" "}
              {format(toZonedTime(new Date(cycle.production_end), TIMEZONE), "dd/MM", { locale: ptBR })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
