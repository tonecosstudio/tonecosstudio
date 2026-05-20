import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { useGroupMessageScheduling } from "@/hooks/groups/useGroupMessageScheduling";

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
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("12:00");

  const scheduleMutation = useGroupMessageScheduling(() => {
    setOpen(false);
    setDate(undefined);
    setTime("12:00");
    onScheduled?.();
  });

  const getScheduledDate = () => {
    if (!date) {
      return null;
    }

    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes, 0, 0);
    return scheduledDate;
  };

  const handleSchedule = () => {
    if (!date) {
      toast.error("Selecione uma data");
      return;
    }

    if (!message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    const scheduledDate = getScheduledDate();
    if (!scheduledDate) {
      toast.error("Selecione uma data");
      return;
    }

    if (scheduledDate <= new Date()) {
      toast.error("A data deve ser no futuro");
      return;
    }

    scheduleMutation.mutate({ groupId, message, scheduledAt: scheduledDate });
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
          <div>
            <Label>Mensagem</Label>
            <div className="mt-1 p-3 bg-muted rounded-lg text-sm max-h-32 overflow-y-auto">
              {message}
            </div>
          </div>

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
                  disabled={(calendarDate) => calendarDate < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="time">Hora</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="mt-1"
            />
          </div>

          {date && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Mensagem será enviada em:
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {format(
                  getScheduledDate() ?? date,
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
