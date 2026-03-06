/**
 * Componente de alerta de saldo
 * Mostra avisos quando cliente escolhe personagem de outra coleção
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, TrendingDown, ShoppingCart, ArrowLeft } from "lucide-react";
import type { SelectionImpact } from "@/hooks/useSubscriptionCoins";

interface BalanceAlertProps {
  impact: SelectionImpact;
  characterName: string;
  collectionName: string;
  activeCollectionName: string;
  onCancel: () => void;
  onConfirm: () => void;
  onBuyCoins?: () => void;
}

export function BalanceAlert({
  impact,
  characterName,
  collectionName,
  activeCollectionName,
  onCancel,
  onConfirm,
  onBuyCoins,
}: BalanceAlertProps) {
  const {
    current_balance,
    character_price,
    new_balance,
    months_remaining,
    will_be_insufficient,
    coins_needed,
    is_active_collection,
  } = impact;

  const priceDifference = character_price - 200;

  // Se é da coleção ativa, não precisa de alerta
  if (is_active_collection) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Alerta de diferença de preço */}
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 dark:text-amber-100">
          <div className="space-y-3">
            <div>
              <strong>Atenção: Personagem de outra coleção</strong>
              <p className="text-sm mt-1">
                Você está escolhendo um personagem que não é da sua coleção ativa.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Personagem:</span>
                <span className="font-semibold">
                  {characterName} ({collectionName})
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Coleção Ativa:</span>
                <Badge variant="secondary">{activeCollectionName}</Badge>
              </div>

              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Preço coleção ativa:</span>
                  <span className="font-medium">200 coins</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Preço deste personagem:</span>
                  <span className="font-bold text-amber-600">{character_price} coins</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t">
                  <span className="text-muted-foreground">Diferença:</span>
                  <Badge variant="destructive">+{priceDifference} coins</Badge>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Impacto no seu saldo:</strong>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Saldo atual:</span>
                      <span className="font-medium">{current_balance} coins</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custo deste personagem:</span>
                      <span className="font-medium">-{character_price} coins</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-blue-200 dark:border-blue-800">
                      <span>Saldo após escolha:</span>
                      <span
                        className={`font-bold ${new_balance < 200 ? "text-red-600" : "text-green-600"}`}
                      >
                        {new_balance} coins
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Alerta de saldo insuficiente futuro */}
      {will_be_insufficient && months_remaining > 0 && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900 dark:text-red-100">
            <div className="space-y-3">
              <div>
                <strong>Aviso: Saldo pode ser insuficiente</strong>
                <p className="text-sm mt-1">
                  Com {new_balance} coins restantes, você pode não ter saldo suficiente para os
                  próximos {months_remaining} {months_remaining === 1 ? "mês" : "meses"}.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg p-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Meses restantes:</span>
                    <span className="font-semibold">{months_remaining}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Preço mínimo/mês:</span>
                    <span className="font-semibold">200 coins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Necessário:</span>
                    <span className="font-semibold">{200 * months_remaining} coins</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Você terá:</span>
                    <span className="font-bold text-red-600">{new_balance} coins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Faltarão:</span>
                    <Badge variant="destructive">{coins_needed} coins</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-900">
                <div className="text-sm text-amber-900 dark:text-amber-100">
                  <strong>💡 Você precisará:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>
                      Comprar {coins_needed} coins extras (R$ {(coins_needed * 0.5).toFixed(2)})
                    </li>
                    <li>OU escolher personagens mais baratos nos próximos meses</li>
                    <li>OU refazer suas escolhas anteriores</li>
                  </ul>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Botões de ação */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {will_be_insufficient && onBuyCoins && (
          <Button variant="secondary" onClick={onBuyCoins} className="flex-1">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Comprar {coins_needed} Coins (R$ {(coins_needed * 0.5).toFixed(2)})
          </Button>
        )}

        <Button
          onClick={onConfirm}
          className="flex-1"
          variant={will_be_insufficient ? "destructive" : "default"}
        >
          {will_be_insufficient ? "Continuar Mesmo Assim" : "Confirmar Escolha"}
        </Button>
      </div>

      {/* Recomendação */}
      {!is_active_collection && (
        <Alert>
          <TrendingDown className="h-4 w-4" />
          <AlertDescription>
            <strong>💡 Recomendação:</strong> Escolha personagens da sua coleção ativa (
            {activeCollectionName}) para economizar coins e garantir saldo suficiente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
