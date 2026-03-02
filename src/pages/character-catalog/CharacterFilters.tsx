import { Button } from '@/components/ui/button';
import { Filter, Star, Coins } from 'lucide-react';

interface CharacterFiltersProps {
  showOnlyAvailable: boolean;
  onToggleAvailable: () => void;
  showOnlyExclusive: boolean;
  onToggleExclusive: () => void;
  isSubscriber: boolean;
  isSemestral: boolean;
  hasCredits: boolean;
}

export function CharacterFilters({
  showOnlyAvailable,
  onToggleAvailable,
  showOnlyExclusive,
  onToggleExclusive,
  isSubscriber,
  isSemestral,
  hasCredits,
}: CharacterFiltersProps) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filtros:</span>
      </div>

      {isSubscriber && hasCredits && (
        <Button
          variant={showOnlyAvailable ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleAvailable}
          className="gap-2"
        >
          <Coins className="h-4 w-4" />
          Disponíveis com meus créditos
        </Button>
      )}

      {isSemestral && (
        <Button
          variant={showOnlyExclusive ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleExclusive}
          className="gap-2"
        >
          <Star className="h-4 w-4" />
          Apenas exclusivos
        </Button>
      )}

      {!isSubscriber && (
        <p className="text-sm text-muted-foreground italic">
          Faça login e assine para usar filtros avançados
        </p>
      )}
    </div>
  );
}
