import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface ScheduleMessageDialogProps {
  groupId: string;
  message: string;
  onScheduled?: () => void;
}

export function ScheduleMessageDialog({
  groupId,
  message,
  onScheduled,
}: ScheduleMessageDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("12:00");

  const scheduleMutation = useMutation({
    mutationFn: async (scheduledFor: Date) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("scheduled_messages").insert({
        group_id: groupId,
        message,
        scheduled_for: scheduledFor.toISOString(),
        created_by: user.id,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
      setOpen(false);
      setDate(undefined);
      setTime("12:00");
      toast.success("Mensagem agendada com sucesso");
      onScheduled?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao agendar mensagem");
    },
  });

  const handleSchedule = () => {
    if (!date) {
      toast.error("Selecione uma data");
      return;
    }

    if (!message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    // Combinar data e hora
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes, 0, 0);

    // Validar se é no futuro
    if (scheduledDate <= new Date()) {
      toast.error("A data deve ser no futuro");
      return;
    }

    scheduleMutation.mutate(scheduledDate);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!message.trim()}>
          <Clock className="h-4 w-4 mr-2" />
          Agendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agendar Mensagem</DialogTitle>
          <DialogDescription>
            Escolha a data e hora para enviar esta mensagem automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview da mensagem */}
          <div>
            <Label>Mensagem</Label>
            <div className="mt-1 p-3 bg-muted rounded-lg text-sm max-h-32 overflow-y-auto">
              {message}
            </div>
          </div>

          {/* Seletor de data */}
          <div>
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Seletor de hora */}
          <div>
            <Label htmlFor="time">Hora</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Preview do agendamento */}
          {date && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                📅 Mensagem será enviada em:
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {format(
                  new Date(date.setHours(...time.split(":").map(Number))),
                  "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                  { locale: ptBR }
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={scheduleMutation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSchedule} disabled={scheduleMutation.isPending}>
            {scheduleMutation.isPending ? "Agendando..." : "Agendar Mensagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
