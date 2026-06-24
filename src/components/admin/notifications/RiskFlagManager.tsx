/**
 * RiskFlagManager - Gerenciar flags de risco em conversas
 * Requirement 24: Flags de Risco e Prioridade
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { conversationService } from "@/services/support/conversation-service";
import type { RiskFlag } from "@/types/support";
import { getRiskFlagLabel } from "@/types/support";
import { log } from "@/lib/logger";

interface RiskFlagManagerProps {
  conversationId: string;
  riskFlags: RiskFlag[];
  onUpdate?: (flags: RiskFlag[]) => void;
}

const AVAILABLE_FLAGS: RiskFlag[] = ["cliente_conflito", "atraso_critico", "pagamento_problema"];

export function RiskFlagManager({ conversationId, riskFlags, onUpdate }: RiskFlagManagerProps) {
  const [flags, setFlags] = useState<RiskFlag[]>(riskFlags);
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setFlags(riskFlags);
  }, [riskFlags]);

  const toggleFlag = async (flag: RiskFlag) => {
    if (isUpdating) return;

    const newFlags = flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag];

    try {
      setIsUpdating(true);
      await conversationService.updateRiskFlags(conversationId, newFlags);
      setFlags(newFlags);
      onUpdate?.(newFlags);
      toast.success(flags.includes(flag) ? "Flag de risco removida" : "Flag de risco adicionada");
    } catch (error) {
      log.error("Erro ao atualizar flags de risco", { error, conversationId, flag });
      toast.error("Erro ao atualizar flags de risco");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={flags.length > 0 ? "destructive" : "outline"}
            size="sm"
            className="gap-2"
            disabled={isUpdating}
          >
            <AlertTriangle className="h-4 w-4" />
            Flags de Risco
            {flags.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {flags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {AVAILABLE_FLAGS.map((flag) => (
            <DropdownMenuCheckboxItem
              key={flag}
              checked={flags.includes(flag)}
              disabled={isUpdating}
              onCheckedChange={() => toggleFlag(flag)}
            >
              {getRiskFlagLabel(flag)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map((flag) => (
            <Badge key={flag} variant="destructive" className="text-xs">
              {getRiskFlagLabel(flag)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
