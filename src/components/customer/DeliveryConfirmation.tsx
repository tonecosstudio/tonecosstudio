/**
 * DeliveryConfirmation Component
 * 
 * Allows customers to confirm delivery of their order with optional feedback.
 * Shows "Mark as Delivered" button, delivery date picker, and feedback form.
 * 
 * Requirements: 2.4.4 Order Tracking (AC5: Show delivery confirmation when received)
 * Task: 5.3.2 Create DeliveryConfirmation component
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, Package, Calendar as CalendarIcon, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { log } from "@/lib/logger";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface DeliveryConfirmationProps {
  orderId: string;
  orderNumber: string;
  isDelivered?: boolean;
  deliveryDate?: string | null;
  onConfirmDelivery?: (deliveryDate: Date, feedback?: string) => Promise<void>;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export const DeliveryConfirmation: React.FC<DeliveryConfirmationProps> = ({
  orderId,
  orderNumber,
  isDelivered = false,
  deliveryDate,
  onConfirmDelivery,
  className,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    deliveryDate ? new Date(deliveryDate) : new Date()
  );
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(isDelivered);

  // Handle delivery confirmation
  const handleConfirmDelivery = async () => {
    if (!selectedDate) return;

    setIsSubmitting(true);
    try {
      if (onConfirmDelivery) {
        await onConfirmDelivery(selectedDate, feedback || undefined);
      }
      setShowConfirmation(true);
    } catch (error) {
      log.error("Error confirming delivery", { error, orderId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already delivered, show confirmation message
  if (showConfirmation) {
    return (
      <Card className={className} data-order-id={orderId}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Entrega Confirmada
          </CardTitle>
          <CardDescription>
            Obrigado por confirmar o recebimento do seu pedido
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Seu pedido #{orderNumber} foi marcado como entregue.
            </AlertDescription>
          </Alert>

          {selectedDate && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Data de Entrega</p>
                <p className="font-semibold">
                  {format(selectedDate, "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          )}

          {feedback && (
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground mb-2">Seu Feedback</p>
              <p className="text-sm">{feedback}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Esperamos que você tenha gostado do seu pedido!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show delivery confirmation form
  return (
    <Card className={className} data-order-id={orderId}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Confirmar Entrega
        </CardTitle>
        <CardDescription>
          Recebeu seu pedido? Confirme a entrega abaixo
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Delivery Date Picker */}
        <div className="space-y-2">
          <Label htmlFor="delivery-date">Data de Entrega</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="delivery-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione a data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Selecione o dia em que você recebeu o pedido
          </p>
        </div>

        {/* Optional Feedback Form */}
        <div className="space-y-2">
          <Label htmlFor="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback (Opcional)
          </Label>
          <Textarea
            id="feedback"
            placeholder="Conte-nos sobre sua experiência com o pedido..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            maxLength={500}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {feedback.length}/500 caracteres
          </p>
        </div>

        {/* Confirmation Button */}
        <Button
          onClick={handleConfirmDelivery}
          disabled={!selectedDate || isSubmitting}
          className="w-full"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {isSubmitting ? "Confirmando..." : "Marcar como Entregue"}
        </Button>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground text-center">
          Ao confirmar, você está indicando que recebeu seu pedido #{orderNumber} em boas condições.
        </p>
      </CardContent>
    </Card>
  );
};

export default DeliveryConfirmation;
