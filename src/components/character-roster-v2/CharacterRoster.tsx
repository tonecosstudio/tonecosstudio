/**
 * CharacterRoster - Grid de personagens estilo jogos AAA
 * Cards numerados com personagens desbloqueados e locked
 */

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import type { Character } from '@/types/character-roster.types';
import { cn } from '@/lib/utils';

interface CharacterRosterProps {
  characters: Character[];
  selectedCharacterId: string;
  onSelectCharacter: (characterId: string) => void;
}

export function CharacterRoster({
  characters,
  selectedCharacterId,
  onSelectCharacter
}: CharacterRosterProps) {
  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block"
        >
          <h2 className="text-sm tracking-[0.3em] text-amber-500/60 uppercase mb-2">
            Coleção Ordax
          </h2>
          <h3 className="text-2xl font-bold text-amber-500/80 tracking-wider">
            DESCUBRA TODOS OS GUARDIÕES
          </h3>
        </motion.div>
      </div>

      {/* Grid de personagens */}
      <div className="grid grid-cols-3 gap-4">
        {characters.map((character, index) => {
          const isSelected = character.id === selectedCharacterId;
          const isLocked = character.isLocked;
          const cardNumber = String(index + 1).padStart(2, '0');

          return (
            <motion.button
              key={character.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => !isLocked && onSelectCharacter(character.id)}
              disabled={isLocked}
              className={cn(
                'relative aspect-[3/4] rounded-lg overflow-hidden transition-all duration-300',
                'border-2',
                isSelected 
                  ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)]' 
                  : isLocked
                  ? 'border-gray-800'
                  : 'border-gray-700 hover:border-amber-600/50',
                isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
              )}
              whileHover={!isLocked ? { scale: 1.05 } : {}}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
            >
              {/* Número do card */}
              <div className="absolute top-2 left-2 z-20">
                <span className={cn(
                  'text-xs font-bold tracking-wider',
                  isSelected ? 'text-red-500' : 'text-gray-600'
                )}>
                  {cardNumber}
                </span>
              </div>

              {/* Background gradient */}
              <div 
                className="absolute inset-0"
                style={{
                  background: isLocked 
                    ? 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)'
                    : `linear-gradient(135deg, ${character.backgroundColor}80 0%, ${character.backgroundColor}20 100%)`
                }}
              />

              {/* Imagem do personagem */}
              <div className="relative w-full h-full flex items-center justify-center p-4">
                {isLocked ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Lock className="w-8 h-8 text-gray-700" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-700 mb-1">???</div>
                      <div className="text-[10px] text-gray-700 uppercase tracking-wider">
                        Em Breve
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={character.thumbnailUrl}
                      alt={character.name}
                      className="w-full h-full object-contain"
                    />
                    
                    {/* Nome do personagem */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                      <div className="text-center">
                        <div className="text-xs font-bold text-amber-500 tracking-wider">
                          {character.name}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                          {character.rarity}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Border glow quando selecionado */}
              {isSelected && !isLocked && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(220,38,38,0.3)',
                      '0 0 40px rgba(220,38,38,0.5)',
                      '0 0 20px rgba(220,38,38,0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              {/* Overlay de hover */}
              {!isLocked && !isSelected && (
                <div className="absolute inset-0 bg-gradient-to-t from-amber-600/0 to-amber-600/0 hover:from-amber-600/20 hover:to-transparent transition-all duration-300" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Footer info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 flex items-center justify-between text-xs text-gray-600"
      >
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wider">Desbloqueados</span>
          <span className="text-amber-600 font-bold">
            {characters.filter(c => !c.isLocked).length} / {characters.length}
          </span>
        </div>
        
        <button className="px-4 py-2 border border-amber-600/30 rounded text-amber-600/80 hover:bg-amber-600/10 transition-colors uppercase tracking-wider">
          Ver Toda Coleção
        </button>
      </motion.div>
    </div>
  );
}
