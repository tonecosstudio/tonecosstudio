/**
 * LockedCharacterTeaser - Teaser para personagens futuros
 * Cria mistério e antecipação
 */

import { motion } from 'framer-motion';
import { Lock, Calendar, Sparkles } from 'lucide-react';
import type { Character } from '@/types/character-roster.types';

interface LockedCharacterTeaserProps {
  character: Character;
}

export function LockedCharacterTeaser({ character }: LockedCharacterTeaserProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative p-8 rounded-lg border border-gray-800 bg-gradient-to-br from-gray-900 to-black overflow-hidden"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'
        }} />
      </div>

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            `radial-gradient(circle at 50% 50%, ${character.themeColor}40 0%, transparent 70%)`,
            `radial-gradient(circle at 50% 50%, ${character.accentColor}40 0%, transparent 70%)`,
            `radial-gradient(circle at 50% 50%, ${character.themeColor}40 0%, transparent 70%)`
          ]
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <div className="relative z-10 space-y-6">
        {/* Lock icon */}
        <motion.div
          className="flex justify-center"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="relative">
            <Lock className="w-16 h-16 text-gray-600" />
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Lock className="w-16 h-16" style={{ color: character.themeColor }} />
            </motion.div>
          </div>
        </motion.div>

        {/* Codename */}
        <div className="text-center space-y-2">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{
              borderColor: character.themeColor + '40',
              backgroundColor: character.themeColor + '10'
            }}
            animate={{
              boxShadow: [
                `0 0 10px ${character.themeColor}20`,
                `0 0 20px ${character.themeColor}40`,
                `0 0 10px ${character.themeColor}20`
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4" style={{ color: character.accentColor }} />
            <span className="text-sm font-bold tracking-widest" style={{ color: character.accentColor }}>
              {character.codename || 'CLASSIFICADO'}
            </span>
          </motion.div>

          <h3 className="text-2xl font-bold text-gray-500 tracking-wider">
            ???
          </h3>
        </div>

        {/* Silhouette */}
        {character.silhouetteUrl && (
          <motion.div
            className="relative h-64 flex items-center justify-center"
            animate={{
              filter: [
                'brightness(0.3) blur(2px)',
                'brightness(0.5) blur(1px)',
                'brightness(0.3) blur(2px)'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <img
              src={character.silhouetteUrl}
              alt="Locked character silhouette"
              className="max-h-full w-auto object-contain opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
          </motion.div>
        )}

        {/* Teaser text */}
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500 italic">
            {character.lore}
          </p>
        </div>

        {/* Release date */}
        {character.releaseDate && (
          <motion.div
            className="flex items-center justify-center gap-2 text-gray-600"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm tracking-wider">
              Disponível em {new Date(character.releaseDate).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </motion.div>
        )}

        {/* Mystery bars */}
        <div className="space-y-2">
          {[60, 80, 40, 70].map((width, i) => (
            <div key={i} className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${character.themeColor}40, ${character.accentColor}40)`,
                  width: `${width}%`
                }}
                animate={{
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
              />
            </div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          className="text-center pt-4"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-xs text-gray-600 uppercase tracking-widest">
            Retorne em breve para desbloquear
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
