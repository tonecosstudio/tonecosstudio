/**
 * HeroSection - Container principal da experiência
 * Layout inspirado em jogos AAA com personagem grande à esquerda e roster à direita
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterStage } from './CharacterStage';
import { CharacterRoster } from './CharacterRoster';
import { CharacterInfo } from './CharacterInfo';
import { CharacterReveal } from './CharacterReveal';
import type { Character } from '@/types/character-roster.types';

interface HeroSectionProps {
  characters: Character[];
  initialCharacterId?: string;
}

export function HeroSection({ characters, initialCharacterId }: HeroSectionProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    initialCharacterId || characters.find(c => !c.isLocked)?.id || characters[0]?.id
  );
  const [showReveal, setShowReveal] = useState(false);

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  const handleSelectCharacter = useCallback((characterId: string) => {
    if (characterId === selectedCharacterId) return;
    
    setShowReveal(true);
    setSelectedCharacterId(characterId);
  }, [selectedCharacterId]);

  if (!selectedCharacter) return null;

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background atmosférico */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
      
      {/* Glow de fundo baseado no personagem */}
      <motion.div
        key={`glow-${selectedCharacter.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 50%, ${selectedCharacter.themeColor}40 0%, transparent 60%)`
        }}
      />

      {/* Grid principal */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Lado esquerdo - Personagem e informações */}
        <div className="relative flex flex-col justify-between p-8 lg:p-12">
          {/* Personagem grande */}
          <div className="flex-1 flex items-center justify-center">
            <CharacterStage character={selectedCharacter} />
          </div>

          {/* Informações embaixo */}
          <CharacterInfo character={selectedCharacter} />
        </div>

        {/* Lado direito - Roster de personagens */}
        <div className="relative flex items-center justify-center p-8 lg:p-12">
          <CharacterRoster
            characters={characters}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={handleSelectCharacter}
          />
        </div>
      </div>

      {/* Reveal Animation */}
      <AnimatePresence>
        {showReveal && (
          <CharacterReveal
            character={selectedCharacter}
            onRevealComplete={() => setShowReveal(false)}
          />
        )}
      </AnimatePresence>

      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-40" />
      </div>
    </div>
  );
}
