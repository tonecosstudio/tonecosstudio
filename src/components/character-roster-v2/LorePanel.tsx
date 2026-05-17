/**
 * LorePanel - Painel de informações e lore do personagem
 * Exibe stats, descrição e história
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Zap, Target } from 'lucide-react';
import type { Character } from '@/types/character-roster.types';

interface LorePanelProps {
  character: Character;
}

export function LorePanel({ character }: LorePanelProps) {
  const statIcons = {
    power: Swords,
    defense: Shield,
    speed: Zap,
    technique: Target
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={character.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative p-8 space-y-6"
      >
        {/* Header */}
        <div className="space-y-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-px bg-gradient-to-r from-transparent via-white to-transparent"
          />
          
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold text-white tracking-wider"
            style={{
              textShadow: `0 0 20px ${character.themeColor}, 0 0 40px ${character.themeColor}80`
            }}
          >
            {character.name}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-gray-400 tracking-wide"
            style={{ color: character.accentColor }}
          >
            {character.title}
          </motion.p>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="h-px bg-gradient-to-r from-transparent via-white to-transparent"
          />
        </div>

        {/* Stats */}
        {character.stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-2 gap-4"
          >
            {Object.entries(character.stats).map(([stat, value], index) => {
              const Icon = statIcons[stat as keyof typeof statIcons];
              return (
                <motion.div
                  key={stat}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: character.accentColor }} />
                    <span className="text-sm text-gray-400 uppercase tracking-wider">
                      {stat}
                    </span>
                  </div>
                  
                  <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 1, delay: 0.8 + index * 0.1, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${character.themeColor}, ${character.accentColor})`,
                        boxShadow: `0 0 10px ${character.themeColor}`
                      }}
                    />
                  </div>
                  
                  <span className="text-xs text-gray-500">{value}/100</span>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="space-y-3"
        >
          <h3 className="text-sm text-gray-500 uppercase tracking-widest">Descrição</h3>
          <p className="text-gray-300 leading-relaxed">
            {character.description}
          </p>
        </motion.div>

        {/* Lore */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="space-y-3"
        >
          <h3 className="text-sm text-gray-500 uppercase tracking-widest">História</h3>
          <p className="text-gray-400 leading-relaxed text-sm">
            {character.lore}
          </p>
        </motion.div>

        {/* Rarity badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
          style={{
            borderColor: character.accentColor,
            backgroundColor: character.accentColor + '20',
            boxShadow: `0 0 20px ${character.accentColor}40`
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: character.accentColor }}
          />
          <span className="text-xs uppercase tracking-widest font-bold" style={{ color: character.accentColor }}>
            {character.rarity}
          </span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
