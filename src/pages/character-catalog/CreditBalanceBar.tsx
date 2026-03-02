import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';
import type { PlanType } from '@/types/subscription-credit-system';

interface CreditBalanceBarProps {
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  planType: PlanType;
}

export function CreditBalanceBar({
  totalCredits,
  usedCredits,
  availableCredits,
  planType,
}: CreditBalanceBarProps) {
  const usedPercentage = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;
  const availablePercentage = totalCredits > 0 ? (availableCredits / totalCredits) * 100 : 0;

  const planLabel = planType === 'semestral' ? 'Plano Semestral' : 'Plano Trimestral';
  const planColor = planType === 'semestral' ? 'bg-purple-500' : 'bg-blue-500';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${planColor}`}>
            <Coins className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Meus Créditos</h3>
            <p className="text-sm text-muted-foreground">{planLabel}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg font-bold px-4 py-2">
          {availableCredits} disponíveis
        </Badge>
      </div>

      {/* Visual progress bar */}
      <div className="space-y-2">
        <div className="h-8 w-full bg-muted rounded-full overflow-hidden relative">
          {/* Used credits (darker) */}
          <div
            className="absolute left-0 top-0 h-full bg-muted-foreground/40 transition-all duration-500"
            style={{ width: `${usedPercentage}%` }}
          />
          {/* Available credits (highlighted) */}
          <div
            className={`absolute left-0 top-0 h-full ${planColor} transition-all duration-500`}
            style={{ width: `${availablePercentage}%`, left: `${usedPercentage}%` }}
          />
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{usedCredits}</span> usados
          </span>
          <span>
            <span className="font-medium text-foreground">{totalCredits}</span> total
          </span>
        </div>
      </div>
    </Card>
  );
}
