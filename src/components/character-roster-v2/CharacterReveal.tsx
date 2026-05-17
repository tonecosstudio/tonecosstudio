/**
 * CharacterReveal - Animação de reveal cinematográfico
 * Transição dramática entre personagens
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Character } from '@/types/character-roster.types';

interface CharacterRevealProps {
  character: Character;
  onRevealComplete?: () => void;
}

export function CharacterReveal({ character, onRevealComplete }: CharacterRevealProps) {
  const [isRevealing, setIsRevealing] = useState(true);

  useEffect(() => {
    setIsRevealing(true);
    const timer = setTimeout(() => {
      setIsRevealing(false);
      onRevealComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [character.id, onRevealComplete]);

  if (!isRevealing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      {/* Flash de luz */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 2, 3] }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle, ${character.themeColor}80 0%, transparent 70%)`
        }}
      />

      {/* Ondas de energia */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1.5, delay: i * 0.2, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border-4"
          style={{
            borderColor: character.accentColor,
            boxShadow: `0 0 40px ${character.accentColor}`
          }}
        />
      ))}

      {/* Nome do personagem */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.5, y: -50 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative z-10 text-center"
      >
        <motion.h1
          className="text-8xl font-bold tracking-wider"
          style={{
            color: character.themeColor,
            textShadow: `0 0 40px ${character.themeColor}, 0 0 80px ${character.accentColor}`
          }}
          animate={{
            textShadow: [
              `0 0 40px ${character.themeColor}, 0 0 80px ${character.accentColor}`,
              `0 0 60px ${character.themeColor}, 0 0 120px ${character.accentColor}`,
              `0 0 40px ${character.themeColor}, 0 0 80px ${character.accentColor}`
            ]
          }}
          transition={{ duration: 1, repeat: 1 }}
        >
          {character.name}
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl mt-4 tracking-widest"
          style={{ color: character.accentColor }}
        >
          {character.title}
        </motion.p>
      </motion.div>

      {/* Partículas explosivas */}
      <div className="absolute inset-0">
        {Array.from({ length: 30 }).map((_, i) => {
          const angle = (i / 30) * Math.PI * 2;
          const distance = 200 + Math.random() * 300;
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance;

          return (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ 
                x, 
                y, 
                opacity: 0, 
                scale: 0 
              }}
              transition={{ 
                duration: 1.5, 
                delay: 0.2 + Math.random() * 0.3,
                ease: 'easeOut' 
              }}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
              style={{
                backgroundColor: character.particleColor,
                boxShadow: `0 0 10px ${character.particleColor}`
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
