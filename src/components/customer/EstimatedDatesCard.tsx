import type { ReactNode } from "react";
import { format, formatDistanceToNow, isFuture, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  Truck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface EstimatedDatesCardProps {
  estimatedCompletionDate: string | null;
  estimatedShippingDate: string | null;
  estimatedDeliveryDate: string | null;
  isOnTrack: boolean;
  delayReason?: string | null;
  productionStatus?: string;
  className?: string;
}

interface DateDisplayProps {
  label: string;
  date: string;
  icon: ReactNode;
  isPast?: boolean;
}

function DateDisplay({ label, date, icon, isPast: isDatePast }: DateDisplayProps) {
  const dateObject = new Date(date);
  const isValidDate = !Number.isNaN(dateObject.getTime());

  if (!isValidDate) {
    return (
      <div className="flex items-center justify-between rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] p-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(0,0%,48%)]">
            {label}
          </p>
          <p className="mt-1 text-sm text-[hsl(0,0%,58%)]">Data inválida</p>
        </div>
        <div className="ml-4 text-[hsl(0,0%,48%)]">{icon}</div>
      </div>
    );
  }

  const completed = isPast(dateObject);
  const upcoming = isFuture(dateObject);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-sm border p-4 transition-colors",
        isDatePast
          ? "border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)] opacity-90"
          : "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)]"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(0,0%,48%)]">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold text-white">
          {format(dateObject, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        {upcoming ? (
          <p className="mt-1 text-xs text-[hsl(0,0%,58%)]">
            {formatDistanceToNow(dateObject, { addSuffix: true, locale: ptBR })}
          </p>
        ) : null}
        {completed ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </p>
        ) : null}
      </div>
      <div className="ml-4 flex h-11 w-11 items-center justify-center rounded-sm border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,10%)] text-[hsl(var(--gold-accent))]">
        {icon}
      </div>
    </div>
  );
}

export function EstimatedDatesCard({
  estimatedCompletionDate,
  estimatedShippingDate,
  estimatedDeliveryDate,
  isOnTrack,
  delayReason,
  productionStatus,
  className,
}: EstimatedDatesCardProps) {
  const completionPast = estimatedCompletionDate ? isPast(new Date(estimatedCompletionDate)) : false;
  const shippingPast = estimatedShippingDate ? isPast(new Date(estimatedShippingDate)) : false;
  const deliveryPast = estimatedDeliveryDate ? isPast(new Date(estimatedDeliveryDate)) : false;
  const isBlocked = productionStatus === "on_hold";

  return (
    <Card
      className={cn(
        "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none",
        className
      )}
    >
      <CardHeader className="border-b border-[hsl(0,0%,12%)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
              Datas Estimadas
            </CardTitle>
            <CardDescription className="mt-2 text-[hsl(0,0%,58%)]">
              Previsão de conclusão da produção, envio e entrega.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border px-3 py-1 text-sm",
              isOnTrack
                ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-200"
                : "border-red-500/25 bg-red-500/12 text-red-200"
            )}
          >
            {isOnTrack ? (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                No Prazo
              </>
            ) : (
              <>
                <AlertCircle className="mr-1 h-4 w-4" />
                Atrasado
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {estimatedCompletionDate ? (
          <DateDisplay
            label="Conclusão da produção"
            date={estimatedCompletionDate}
            icon={<Package className="h-5 w-5" />}
            isPast={completionPast}
          />
        ) : null}

        {estimatedShippingDate ? (
          <DateDisplay
            label="Data de envio"
            date={estimatedShippingDate}
            icon={<Truck className="h-5 w-5" />}
            isPast={shippingPast}
          />
        ) : null}

        {estimatedDeliveryDate ? (
          <DateDisplay
            label="Data de entrega"
            date={estimatedDeliveryDate}
            icon={<CheckCircle2 className="h-5 w-5" />}
            isPast={deliveryPast}
          />
        ) : null}

        {!estimatedCompletionDate && !estimatedShippingDate && !estimatedDeliveryDate ? (
          <div className="py-8 text-center text-[hsl(0,0%,58%)]">
            <Clock className="mx-auto mb-3 h-12 w-12 text-[hsl(0,0%,32%)]" />
            <p className="text-sm">As datas estimadas serão calculadas em breve.</p>
          </div>
        ) : null}

        {isBlocked ? (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Produção pausada</AlertTitle>
            <AlertDescription>
              {delayReason ||
                "Seu pedido está temporariamente pausado. Entraremos em contato em breve com mais informações."}
            </AlertDescription>
          </Alert>
        ) : !isOnTrack && delayReason ? (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Produção atrasada</AlertTitle>
            <AlertDescription>{delayReason}</AlertDescription>
          </Alert>
        ) : null}

        {isOnTrack && !isBlocked && estimatedDeliveryDate ? (
          <div className="rounded-sm border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="flex items-center gap-2 text-sm text-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Tudo está correndo conforme o planejado.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default EstimatedDatesCard;
