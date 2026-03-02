import type { Character, PlanType } from '@/types/subscription-credit-system';
import { CharacterCard } from './CharacterCard';

interface CharacterGridProps {
  characters: Character[];
  isSubscriber: boolean;
  planType?: PlanType;
  availableCredits: number;
  onPurchase: (character: Character, useCredits: boolean) => void;
}

export function CharacterGrid({
  characters,
  isSubscriber,
  planType,
  availableCredits,
  onPurchase,
}: CharacterGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          isSubscriber={isSubscriber}
          planType={planType}
          availableCredits={availableCredits}
          onPurchase={onPurchase}
        />
      ))}
    </div>
  );
}
