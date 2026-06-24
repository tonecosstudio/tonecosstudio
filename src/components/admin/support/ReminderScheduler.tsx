/**
 * ReminderScheduler - modal para agendar lembretes em conversas.
 */

import { useEffect, useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { createReminder, type ConversationReminder } from "@/lib/reminder-service";
import { useToast } from "@/components/ui/use-toast";
import { log } from "@/lib/logger";

interface ReminderSchedulerProps {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReminderCreated?: (reminder: ConversationReminder) => void;
}

const REMINDER_TYPE_LABELS: Record<ConversationReminder["reminder_type"], string> = {
  quote_followup: "Follow-up de orcamento",
  payment_pending: "Pagamento pendente",
  promised_date: "Prazo prometido",
};

const REMINDER_TYPE_DESCRIPTIONS: Record<ConversationReminder["reminder_type"], string> = {
  quote_followup: "Lembrar o cliente sobre orcamento sem resposta",
  payment_pending: "Lembrar o cliente sobre pagamento aguardando confirmacao",
  promised_date: "Lembrar sobre prazo prometido ao cliente",
};

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
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open && !isSubmitting) {
      setReminderType("quote_followup");
      setScheduledDate(undefined);
      setScheduledTime("09:00");
    }
  }, [open, isSubmitting]);

  const handleSubmit = async () => {
    if (!scheduledDate) {
      toast({
        title: "Data obrigatoria",
        description: "Selecione uma data para o lembrete.",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    if (scheduledDateTime <= new Date()) {
      toast({
        title: "Data invalida",
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
        description: `Lembrete agendado para ${format(scheduledDateTime, "dd/MM/yyyy 'as' HH:mm", {
          locale: ptBR,
        })}.`,
      });

      setReminderType("quote_followup");
      setScheduledDate(undefined);
      setScheduledTime("09:00");
      onReminderCreated?.(reminder);
      onOpenChange(false);
    } catch (error) {
      log.error("Erro ao criar lembrete", { error, conversationId, reminderType });
      toast({
        title: "Erro ao agendar lembrete",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agendar lembrete</DialogTitle>
          <DialogDescription>Configure um lembrete automatico para esta conversa.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reminder-type">Tipo de lembrete</Label>
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
                {Object.entries(REMINDER_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {REMINDER_TYPE_DESCRIPTIONS[value as ConversationReminder["reminder_type"]]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Data do lembrete</Label>
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

          <div className="grid gap-2">
            <Label htmlFor="reminder-time">Hora do lembrete</Label>
            <input
              id="reminder-time"
              type="time"
              value={scheduledTime}
              onChange={(event) => setScheduledTime(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Agendando..." : "Agendar lembrete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
