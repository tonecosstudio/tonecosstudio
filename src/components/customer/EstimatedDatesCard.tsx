/**
 * EstimatedDatesCard Component
 * 
 * Displays estimated production completion, shipping, and delivery dates
 * with status indicators (on track or delayed) and explanations for delays.
 * 
 * Requirements: 2.4.2 Estimated Dates
 * Task: 5.1.3 Create EstimatedDatesCard component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Package, Truck, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

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
  icon: React.ReactNode;
  isPast?: boolean;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * DateDisplay - Displays a single date with icon and relative time
 */
const DateDisplay: React.FC<DateDisplayProps> = ({ label, date, icon, isPast: isDatePast }) => {
  const dateObj = new Date(date);
  
  // Check if date is valid
  const isValidDate = !isNaN(dateObj.getTime());
  
  if (!isValidDate) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border transition-colors bg-muted/50">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-sm text-muted-foreground">Data inválida</p>
        </div>
        <div className="ml-4">
          {icon}
        </div>
      </div>
    );
  }
  
  const isInPast = isPast(dateObj);
  const isInFuture = isFuture(dateObj);

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border transition-colors",
      isDatePast && "bg-muted/50 opacity-75"
    )}>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="font-semibold">
          {format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        {isInFuture && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR })}
          </p>
        )}
        {isInPast && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </p>
        )}
      </div>
      <div className="ml-4">
        {icon}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EstimatedDatesCard: React.FC<EstimatedDatesCardProps> = ({
  estimatedCompletionDate,
  estimatedShippingDate,
  estimatedDeliveryDate,
  isOnTrack,
  delayReason,
  productionStatus,
  className,
}) => {
  // Determine if dates are in the past (completed)
  const completionPast = estimatedCompletionDate ? isPast(new Date(estimatedCompletionDate)) : false;
  const shippingPast = estimatedShippingDate ? isPast(new Date(estimatedShippingDate)) : false;
  const deliveryPast = estimatedDeliveryDate ? isPast(new Date(estimatedDeliveryDate)) : false;

  // Check if production is blocked/on hold
  const isBlocked = productionStatus === "on_hold";

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Datas Estimadas
            </CardTitle>
            <CardDescription>
              Previsão de conclusão e entrega
            </CardDescription>
          </div>
          <Badge
            variant={isOnTrack ? "default" : "destructive"}
            className="text-sm px-3 py-1"
          >
            {isOnTrack ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                No Prazo
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-1" />
                Atrasado
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Production Completion Date */}
        {estimatedCompletionDate && (
          <DateDisplay
            label="Conclusão da Produção"
            date={estimatedCompletionDate}
            icon={<Package className="h-8 w-8 text-muted-foreground" />}
            isPast={completionPast}
          />
        )}

        {/* Shipping Date */}
        {estimatedShippingDate && (
          <DateDisplay
            label="Data de Envio"
            date={estimatedShippingDate}
            icon={<Truck className="h-8 w-8 text-muted-foreground" />}
            isPast={shippingPast}
          />
        )}

        {/* Delivery Date */}
        {estimatedDeliveryDate && (
          <DateDisplay
            label="Data de Entrega"
            date={estimatedDeliveryDate}
            icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
            isPast={deliveryPast}
          />
        )}

        {/* No dates available */}
        {!estimatedCompletionDate && !estimatedShippingDate && !estimatedDeliveryDate && (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              As datas estimadas serão calculadas em breve.
            </p>
          </div>
        )}

        {/* Blocked/On Hold Alert (takes priority over delay alert) */}
        {isBlocked ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Produção Pausada</AlertTitle>
            <AlertDescription>
              {delayReason || "Seu pedido está temporariamente pausado. Entraremos em contato em breve com mais informações."}
            </AlertDescription>
          </Alert>
        ) : (
          /* Delay Alert (only shown if not blocked) */
          !isOnTrack && delayReason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Produção Atrasada</AlertTitle>
              <AlertDescription>
                {delayReason}
              </AlertDescription>
            </Alert>
          )
        )}

        {/* On Track Message */}
        {isOnTrack && !isBlocked && estimatedDeliveryDate && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Tudo está correndo conforme o planejado!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EstimatedDatesCard;
