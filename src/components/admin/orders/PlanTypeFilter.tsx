/**
 * Filtro de Tipo de Plano
 * 
 * Permite filtrar assinaturas por tipo de plano (trimestral, semestral, anual)
 * Aparece apenas quando o filtro de tipo está em "subscription_delivery"
 */

import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

interface PlanTypeFilterProps {
  value: 'trimestral' | 'semestral' | 'anual' | null;
  onChange: (planType: 'trimestral' | 'semestral' | 'anual' | null) => void;
}

const PLAN_TYPES = [
  { value: 'trimestral', label: 'Trimestral', description: '3 entregas' },
  { value: 'semestral', label: 'Semestral', description: '6 entregas' },
  { value: 'anual', label: 'Anual', description: '12 entregas' },
] as const;

export function PlanTypeFilter({ value, onChange }: PlanTypeFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Tipo de Plano
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={value === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(null)}
          className="h-9"
        >
          Todos
        </Button>
        {PLAN_TYPES.map((plan) => (
          <Button
            key={plan.value}
            variant={value === plan.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(plan.value)}
            className="h-9"
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">{plan.label}</span>
              <span className="text-xs text-muted-foreground">{plan.description}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
