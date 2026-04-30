import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type PeriodPreset = "today" | "week" | "month" | "year" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

interface PeriodFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  persistKey?: string; // Chave para persistir preferência
}

export function PeriodFilter({
  value,
  onChange,
  className,
  persistKey = "admin-period-filter",
}: PeriodFilterProps) {
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [isOpen, setIsOpen] = useState(false);

  // Carregar preferência salva ao montar
  useEffect(() => {
    if (persistKey) {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        try {
          const { preset: savedPreset, from, to } = JSON.parse(saved);
          setPreset(savedPreset);
          if (savedPreset === "custom" && from && to) {
            onChange({
              from: new Date(from),
              to: new Date(to),
            });
          } else {
            handlePresetChange(savedPreset, false);
          }
        } catch (e) {
          console.error("Erro ao carregar preferência de período:", e);
        }
      }
    }
  }, [persistKey]);

  const handlePresetChange = (newPreset: PeriodPreset, persist = true) => {
    setPreset(newPreset);
    const today = new Date();
    let from: Date;
    const to: Date = today;

    switch (newPreset) {
      case "today":
        from = today;
        break;
      case "week":
        from = new Date(today);
        from.setDate(today.getDate() - 7);
        break;
      case "month":
        from = new Date(today);
        from.setMonth(today.getMonth() - 1);
        break;
      case "year":
        from = new Date(today);
        from.setFullYear(today.getFullYear() - 1);
        break;
      default:
        return;
    }

    onChange({ from, to });

    // Persistir preferência
    if (persist && persistKey) {
      localStorage.setItem(
        persistKey,
        JSON.stringify({
          preset: newPreset,
          from: from.toISOString(),
          to: to.toISOString(),
        })
      );
    }
  };

  const handleCustomApply = () => {
    setPreset("custom");
    setIsOpen(false);

    // Persistir período customizado
    if (persistKey) {
      localStorage.setItem(
        persistKey,
        JSON.stringify({
          preset: "custom",
          from: value.from.toISOString(),
          to: value.to.toISOString(),
        })
      );
    }
  };

  const presets = [
    { value: "today" as const, label: "Hoje" },
    { value: "week" as const, label: "7 dias" },
    { value: "month" as const, label: "30 dias" },
    { value: "year" as const, label: "1 ano" },
    { value: "custom" as const, label: "Customizado" },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1">
        {presets.map((p) => (
          <Button
            key={p.value}
            variant={preset === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (p.value === "custom") {
                setIsOpen(true);
              } else {
                handlePresetChange(p.value);
              }
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {format(value.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
            {format(value.to, "dd/MM/yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Data Inicial</p>
              <Calendar
                mode="single"
                selected={value.from}
                onSelect={(date) => date && onChange({ ...value, from: date })}
                locale={ptBR}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Data Final</p>
              <Calendar
                mode="single"
                selected={value.to}
                onSelect={(date) => date && onChange({ ...value, to: date })}
                locale={ptBR}
              />
            </div>
            <Button className="w-full" onClick={handleCustomApply}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
