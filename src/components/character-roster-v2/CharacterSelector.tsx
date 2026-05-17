/**
 * CharacterSelector - Seletor de personagens (roster)
 * Grid vertical/horizontal com personagens desbloqueados e locked
 */

import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import type { Character } from '@/types/character-roster.types';
import { cn } from '@/lib/utils';

interface CharacterSelectorProps {
  characters: Character[];
  selectedCharacterId: string;
  onSelectCharacter: (characterId: string) => void;
  orientation?: 'vertical' | 'horizontal';
}

export function CharacterSelector({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  orientation = 'vertical'
}: CharacterSelectorProps) {
  const getRarityGlow = (rarity: Character['rarity']) => {
    const glows = {
      common: '#9CA3AF',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#F59E0B',
      mythic: '#EC4899'
    };
    return glows[rarity];
  };

  return (
    <div
      className={cn(
        'flex gap-4 p-6',
        orientation === 'vertical' ? 'flex-col overflow-y-auto max-h-screen' : 'flex-row overflow-x-auto'
      )}
    >
      {characters.map((character, index) => {
        const isSelected = character.id === selectedCharacterId;
        const isLocked = character.isLocked;
        const glowColor = getRarityGlow(character.rarity);

        return (
          <motion.button
            key={character.id}
            initial={{ opacity: 0, x: orientation === 'vertical' ? 50 : 0, y: orientation === 'horizontal' ? 50 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            onClick={() => !isLocked && onSelectCharacter(character.id)}
            disabled={isLocked}
            className={cn(
              'relative group transition-all duration-300',
              orientation === 'vertical' ? 'w-32 h-32' : 'w-32 h-32',
              isSelected && 'scale-110',
              isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
            whileHover={!isLocked ? { scale: 1.1 } : {}}
            whileTap={!isLocked ? { scale: 0.95 } : {}}
          >
            {/* Container do personagem */}
            <div
              className={cn(
                'relative w-full h-full rounded-lg overflow-hidden border-2 transition-all duration-300',
                isSelected 
                  ? 'border-white shadow-2xl' 
                  : 'border-gray-700 hover:border-gray-500',
                isLocked && 'opacity-40'
              )}
              style={{
                boxShadow: isSelected 
                  ? `0 0 30px ${glowColor}, 0 0 60px ${glowColor}40` 
                  : 'none',
                backgroundColor: isLocked ? '#1a1a1a' : character.backgroundColor + '20'
              }}
            >
              {/* Imagem ou silhueta */}
              {isLocked ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                  <img
                    src={character.silhouetteUrl || character.thumbnailUrl}
                    alt="Locked character"
                    className="w-full h-full object-cover opacity-20 blur-sm"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Lock className="w-8 h-8 text-gray-500" />
                    <span className="text-xs text-gray-500 font-bold tracking-wider">
                      {character.codename || '???'}
                    </span>
                  </div>
                </div>
              ) : (
                <motion.img
                  src={character.thumbnailUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Overlay de seleção */}
              {isSelected && !isLocked && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 border-4 border-white pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 20px ${glowColor}`
                  }}
                />
              )}

              {/* Indicador de raridade */}
              {!isLocked && (
                <div
                  className="absolute top-1 right-1 w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: glowColor,
                    boxShadow: `0 0 10px ${glowColor}`
                  }}
                />
              )}

              {/* Efeito de hover */}
              {!isLocked && !isSelected && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                />
              )}

              {/* Partículas de raridade alta */}
              {!isLocked && (character.rarity === 'legendary' || character.rarity === 'mythic') && (
                <motion.div
                  className="absolute top-2 left-2"
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: glowColor }} />
                </motion.div>
              )}
            </div>

            {/* Nome do personagem */}
            {!isLocked && (
              <motion.div
                className="absolute -bottom-6 left-0 right-0 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: isSelected ? 1 : 0.6 }}
              >
                <span className="text-xs font-bold text-white tracking-wider drop-shadow-lg">
                  {character.name}
                </span>
              </motion.div>
            )}

            {/* Data de release para locked */}
            {isLocked && character.releaseDate && (
              <motion.div
                className="absolute -bottom-8 left-0 right-0 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
              >
                <span className="text-[10px] text-gray-500 tracking-wider">
                  {new Date(character.releaseDate).toLocaleDateString('pt-BR', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
