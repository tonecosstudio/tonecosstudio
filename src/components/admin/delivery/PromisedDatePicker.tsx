/**
 * PromisedDatePicker - Campo para registrar prazos prometidos
 * Requirement 26: Campo "Promessa Feita"
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X, AlertTriangle } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { conversationService } from "@/lib/services/conversationService";
import { log } from "@/lib/logger";

interface PromisedDatePickerProps {
  conversationId: string;
  promisedDate?: string;
  onUpdate?: (date: string | null) => void;
}

export function PromisedDatePicker({
  conversationId,
  promisedDate,
  onUpdate,
}: PromisedDatePickerProps) {
  const [date, setDate] = useState<Date | undefined>(
    promisedDate ? new Date(promisedDate) : undefined
  );
  const [isOpen, setIsOpen] = useState(false);

  const isOverdue = date && isPast(date);
  const daysUntil = date ? differenceInDays(date, new Date()) : null;

  const handleDateSelect = async (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    try {
      await conversationService.updatePromisedDate(conversationId, selectedDate.toISOString());
      setDate(selectedDate);
      setIsOpen(false);
      onUpdate?.(selectedDate.toISOString());
      toast.success("Data prometida atualizada");
    } catch (error) {
      log.error("Erro ao atualizar data prometida", { error, conversationId });
      toast.error("Erro ao atualizar data prometida");
    }
  };

  const handleClear = async () => {
    try {
      await conversationService.updatePromisedDate(conversationId, null);
      setDate(undefined);
      setIsOpen(false);
      onUpdate?.(null);
      toast.success("Data prometida removida");
    } catch (error) {
      log.error("Erro ao remover data prometida", { error, conversationId });
      toast.error("Erro ao remover data prometida");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isOverdue ? "destructive" : date ? "default" : "outline"}
            size="sm"
            className={cn("gap-2", !date && "text-muted-foreground")}
          >
            {isOverdue && <AlertTriangle className="h-4 w-4" />}
            <CalendarIcon className="h-4 w-4" />
            {date ? (
              <span>
                {format(date, "dd/MM/yyyy", { locale: ptBR })}
                {daysUntil !== null && (
                  <span className="ml-1 text-xs">
                    (
                    {daysUntil === 0
                      ? "hoje"
                      : daysUntil > 0
                        ? `${daysUntil}d`
                        : `${Math.abs(daysUntil)}d atraso`}
                    )
                  </span>
                )}
              </span>
            ) : (
              "Promessa"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            locale={ptBR}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </PopoverContent>
      </Popover>

      {date && (
        <Button variant="ghost" size="sm" onClick={handleClear} title="Remover data prometida">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
