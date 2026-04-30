/**
 * ReminderScheduler - Modal para agendar lembretes em conversas
 *
 * Requirements: 23.5
 * Design: .kiro/specs/advanced-chat-support-system/design.md
 *
 * Permite que admins agendem lembretes para conversas com validação de data futura.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { createReminder, type ConversationReminder } from "@/lib/reminder-service";
import { useToast } from "@/components/ui/use-toast";

interface ReminderSchedulerProps {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReminderCreated?: (reminder: ConversationReminder) => void;
}

export function ReminderScheduler({
  conversationId,
  open,
  onOpenChange,
  onReminderCreated,
}: ReminderSchedulerProps) {
  const { toast } = useToast();
  const [reminderType, setReminderType] =
    useState<ConversationReminder["reminder_type"]>("quote_followup");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validação: data deve estar selecionada
    if (!scheduledDate) {
      toast({
        title: "Data obrigatória",
        description: "Por favor, selecione uma data para o lembrete.",
        variant: "destructive",
      });
      return;
    }

    // Combinar data e hora
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    // Validação: data deve ser futura
    const now = new Date();
    if (scheduledDateTime <= now) {
      toast({
        title: "Data inválida",
        description: "A data do lembrete deve ser no futuro.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reminder = await createReminder(conversationId, reminderType, scheduledDateTime);

      toast({
        title: "Lembrete agendado",
        description: `Lembrete agendado para ${format(scheduledDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`,
      });

      // Resetar formulário
      setReminderType("quote_followup");
      setScheduledDate(undefined);
      setScheduledTime("09:00");
      setCustomMessage("");

      // Notificar componente pai
      if (onReminderCreated) {
        onReminderCreated(reminder);
      }

      // Fechar modal
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar lembrete:", error);
      toast({
        title: "Erro ao agendar lembrete",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReminderTypeLabel = (type: ConversationReminder["reminder_type"]) => {
    const labels = {
      quote_followup: "Follow-up de Orçamento",
      payment_pending: "Pagamento Pendente",
      promised_date: "Data Prometida",
    };
    return labels[type];
  };

  const getReminderTypeDescription = (type: ConversationReminder["reminder_type"]) => {
    const descriptions = {
      quote_followup: "Lembrar cliente sobre orçamento sem resposta",
      payment_pending: "Lembrar cliente sobre pagamento aguardando confirmação",
      promised_date: "Lembrar sobre prazo prometido ao cliente",
    };
    return descriptions[type];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agendar Lembrete</DialogTitle>
          <DialogDescription>
            Configure um lembrete automático para esta conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Tipo de Lembrete */}
          <div className="grid gap-2">
            <Label htmlFor="reminder-type">Tipo de Lembrete</Label>
            <Select
              value={reminderType}
              onValueChange={(value) =>
                setReminderType(value as ConversationReminder["reminder_type"])
              }
            >
              <SelectTrigger id="reminder-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quote_followup">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{getReminderTypeLabel("quote_followup")}</span>
                    <span className="text-xs text-muted-foreground">
                      {getReminderTypeDescription("quote_followup")}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="payment_pending">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{getReminderTypeLabel("payment_pending")}</span>
                    <span className="text-xs text-muted-foreground">
                      {getReminderTypeDescription("payment_pending")}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="promised_date">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{getReminderTypeLabel("promised_date")}</span>
                    <span className="text-xs text-muted-foreground">
                      {getReminderTypeDescription("promised_date")}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data */}
          <div className="grid gap-2">
            <Label>Data do Lembrete</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? (
                    format(scheduledDate, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Hora */}
          <div className="grid gap-2">
            <Label htmlFor="reminder-time">Hora do Lembrete</Label>
            <input
              id="reminder-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Mensagem Opcional */}
          <div className="grid gap-2">
            <Label htmlFor="custom-message">Mensagem Personalizada (Opcional)</Label>
            <Textarea
              id="custom-message"
              placeholder="Adicione uma mensagem personalizada ao lembrete (em desenvolvimento)"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              disabled
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Nota: Mensagens personalizadas serão implementadas em versão futura.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Agendando..." : "Agendar Lembrete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
