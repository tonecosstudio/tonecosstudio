/**
 * Botão de compra avulsa.
 *
 * A disponibilidade operacional vem do backend. Este componente não fabrica
 * preço, entrada, saldo, capacidade ou prazo comercial.
 */

import { useEffect, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  formatTimeUntilCutoff,
  isBeforeCutoff,
} from "@/lib/cutoff-middleware";
import { useStandalonePurchaseAvailability } from "@/hooks/useStandalonePurchaseAvailability";

interface StandalonePurchaseButtonProps {
  cycleId: string;
  collectionId: string;
  collectionName: string;
  onPurchase: () => void;
  disabled?: boolean;
}

export function StandalonePurchaseButton({
  cycleId,
  collectionId: _collectionId,
  collectionName,
  onPurchase,
  disabled = false,
}: StandalonePurchaseButtonProps) {
  const [timeUntilCutoff, setTimeUntilCutoff] = useState("");
  const [beforeCutoff, setBeforeCutoff] = useState(true);
  const { canPurchase, reason, isLoading } =
    useStandalonePurchaseAvailability(cycleId);

  useEffect(() => {
    const updateCountdown = () => setTimeUntilCutoff(formatTimeUntilCutoff());
    updateCountdown();
    const interval = setInterval(updateCountdown, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    const checkCutoff = async () => {
      try {
        const result = await isBeforeCutoff();
        if (active) setBeforeCutoff(result);
      } catch {
        // UI must fail closed when cutoff authority is unavailable.
        if (active) setBeforeCutoff(false);
      }
    };

    void checkCutoff();
    const interval = setInterval(() => void checkCutoff(), 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return <Button disabled>Verificando disponibilidade...</Button>;
  }

  return (
    <div className="space-y-4">
      {beforeCutoff && canPurchase && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Tempo restante neste ciclo: {timeUntilCutoff}
          </AlertDescription>
        </Alert>
      )}

      {!canPurchase && reason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Compra indisponível</strong>
            <br />
            {reason}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={onPurchase}
        disabled={disabled || !canPurchase || !beforeCutoff}
        className="w-full"
        size="lg"
      >
        {!canPurchase
          ? "Compra indisponível"
          : !beforeCutoff
            ? "Prazo encerrado"
            : `Comprar ${collectionName}`}
      </Button>

      {canPurchase && beforeCutoff && (
        <p className="text-center text-sm text-muted-foreground">
          Valores de entrada e saldo serão apresentados a partir da configuração oficial da compra.
        </p>
      )}
    </div>
  );
}
