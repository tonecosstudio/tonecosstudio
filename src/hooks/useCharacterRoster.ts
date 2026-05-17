/**
 * useCharacterRoster - Hook para gerenciar estado do roster
 * Integração futura com API e persistência
 */

import { useState, useCallback, useEffect } from 'react';
import type { Character, MonthlyCollection } from '@/types/character-roster.types';

interface UseCharacterRosterOptions {
  collectionId?: string;
  autoSelectUnlocked?: boolean;
}

export function useCharacterRoster(options: UseCharacterRosterOptions = {}) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch characters from API
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/collections/${options.collectionId}/characters`);
        // const data = await response.json();
        // setCharacters(data);
        
        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, [options.collectionId]);

  // Auto-select first unlocked character
  useEffect(() => {
    if (options.autoSelectUnlocked && characters.length > 0 && !selectedCharacterId) {
      const firstUnlocked = characters.find(c => !c.isLocked);
      if (firstUnlocked) {
        setSelectedCharacterId(firstUnlocked.id);
      }
    }
  }, [characters, selectedCharacterId, options.autoSelectUnlocked]);

  const selectCharacter = useCallback((characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    if (character && !character.isLocked) {
      setSelectedCharacterId(characterId);
    }
  }, [characters]);

  const getSelectedCharacter = useCallback(() => {
    return characters.find(c => c.id === selectedCharacterId) || null;
  }, [characters, selectedCharacterId]);

  const getUnlockedCharacters = useCallback(() => {
    return characters.filter(c => !c.isLocked);
  }, [characters]);

  const getLockedCharacters = useCallback(() => {
    return characters.filter(c => c.isLocked);
  }, [characters]);

  return {
    characters,
    selectedCharacterId,
    selectedCharacter: getSelectedCharacter(),
    isLoading,
    error,
    selectCharacter,
    getUnlockedCharacters,
    getLockedCharacters
  };
}
