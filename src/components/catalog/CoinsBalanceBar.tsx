/**
 * Barra de Saldo de Coins
 *
 * Exibe o saldo atual de coins do usuário com
 * indicador visual e botão para comprar mais.
 *
 * @module components/catalog/CoinsBalanceBar
 */

import { Coins, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCoins } from "@/types/coins";
import { useNavigate } from "react-router-dom";

// ============================================================================
// TYPES
// ============================================================================

interface CoinsBalanceBarProps {
  balance: number;
  lastUpdated?: string;
  showProgress?: boolean;
  maxCoins?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CoinsBalanceBar({
  balance,
  lastUpdated,
  showProgress = false,
  maxCoins = 10000,
}: CoinsBalanceBarProps) {
  const navigate = useNavigate();

  // Calcula percentual para progress bar
  const percentage = showProgress ? Math.min((balance / maxCoins) * 100, 100) : 0;

  // Determina cor baseado no saldo
  const getBalanceColor = () => {
    if (balance === 0) return "text-destructive";
    if (balance < 1000) return "text-yellow-600";
    return "text-primary";
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Seu Saldo</p>
            <p className={`text-2xl font-bold ${getBalanceColor()}`}>{formatCoins(balance)}</p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Atualizado: {new Date(lastUpdated).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/coins/transactions")}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          <Button size="sm" onClick={() => navigate("/coins/purchase")}>
            <Plus className="h-4 w-4 mr-2" />
            Comprar Coins
          </Button>
        </div>
      </div>

      {/* Progress Bar (opcional) */}
      {showProgress && (
        <div className="space-y-1">
          <Progress value={percentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {percentage.toFixed(0)}% de {formatCoins(maxCoins)}
          </p>
        </div>
      )}

      {/* Warning para saldo baixo */}
      {balance > 0 && balance < 500 && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
          ⚠️ Saldo baixo! Considere comprar mais coins para não perder oportunidades.
        </div>
      )}

      {/* Warning para saldo zero */}
      {balance === 0 && (
        <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
          ❌ Sem saldo! Compre coins para começar a colecionar personagens.
        </div>
      )}
    </div>
  );
}
