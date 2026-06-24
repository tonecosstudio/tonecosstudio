import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, CheckCircle2, MessageSquare, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { log } from "@/lib/logger";
import { cn } from "@/lib/utils";

export interface DeliveryConfirmationProps {
  orderId: string;
  orderNumber: string;
  isDelivered?: boolean;
  deliveryDate?: string | null;
  onConfirmDelivery?: (deliveryDate: Date, feedback?: string) => Promise<void>;
  className?: string;
}

const cardClassName =
  "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none";

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

  const handleConfirmDelivery = async () => {
    if (!selectedDate) {
      return;
    }

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

  if (showConfirmation) {
    return (
      <Card className={cn(cardClassName, className)} data-order-id={orderId}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-200">
            <CheckCircle2 className="h-5 w-5" />
            Entrega confirmada
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Obrigado por confirmar o recebimento do seu pedido.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <AlertDescription>
              Seu pedido #{orderNumber} foi marcado como entregue.
            </AlertDescription>
          </Alert>

          {selectedDate && (
            <div className="flex items-center gap-3 rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.03] p-3">
              <CalendarIcon className="h-8 w-8 text-[hsl(42,100%,55%)]" />
              <div className="flex-1">
                <p className="text-sm text-zinc-400">Data de entrega</p>
                <p className="font-semibold text-white">
                  {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}

          {feedback && (
            <div className="rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.03] p-3">
              <p className="mb-2 text-sm text-zinc-400">Seu feedback</p>
              <p className="text-sm text-zinc-200">{feedback}</p>
            </div>
          )}

          <p className="text-center text-xs text-zinc-500">
            Esperamos que voce tenha gostado do seu pedido.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(cardClassName, className)} data-order-id={orderId}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Package className="h-5 w-5 text-[hsl(42,100%,55%)]" />
          Confirmar entrega
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Recebeu seu pedido? Confirme a entrega abaixo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="delivery-date" className="text-zinc-200">
            Data de entrega
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="delivery-date"
                variant="outline"
                className={cn(
                  "w-full justify-start border-[hsl(0,0%,16%)] bg-[hsl(0,0%,8%)] text-left font-normal text-white hover:bg-[hsl(0,0%,10%)]",
                  !selectedDate && "text-zinc-500"
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
            <PopoverContent
              className="w-auto border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] p-0 text-white"
              align="start"
            >
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
          <p className="text-xs text-zinc-500">Selecione o dia em que voce recebeu o pedido.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback" className="flex items-center gap-2 text-zinc-200">
            <MessageSquare className="h-4 w-4" />
            Feedback opcional
          </Label>
          <Textarea
            id="feedback"
            placeholder="Conte sobre sua experiencia com o pedido..."
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            rows={4}
            maxLength={500}
            className="resize-none border-[hsl(0,0%,16%)] bg-[hsl(0,0%,8%)] text-white placeholder:text-zinc-500"
          />
          <p className="text-xs text-zinc-500">{feedback.length}/500 caracteres</p>
        </div>

        <Button
          onClick={handleConfirmDelivery}
          disabled={!selectedDate || isSubmitting}
          className="w-full bg-[hsl(42,100%,50%)] text-black hover:bg-[hsl(42,100%,58%)]"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {isSubmitting ? "Confirmando..." : "Marcar como entregue"}
        </Button>

        <p className="text-center text-xs text-zinc-500">
          Ao confirmar, voce indica que recebeu seu pedido #{orderNumber} em boas condicoes.
        </p>
      </CardContent>
    </Card>
  );
};

export default DeliveryConfirmation;
