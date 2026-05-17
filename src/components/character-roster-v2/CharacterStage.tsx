/**
 * CharacterStage - Palco principal do personagem
 * Área de destaque com animações cinematográficas
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { Character } from '@/types/character-roster.types';

interface CharacterStageProps {
  character: Character;
  onCharacterLoad?: () => void;
}

export function CharacterStage({ character, onCharacterLoad }: CharacterStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  // Animação de partículas com GSAP
  useEffect(() => {
    if (!particlesRef.current) return;

    const particles = particlesRef.current.children;
    
    gsap.to(particles, {
      y: 'random(-100, 100)',
      x: 'random(-50, 50)',
      opacity: 'random(0.2, 0.8)',
      scale: 'random(0.5, 1.5)',
      duration: 'random(3, 6)',
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: {
        amount: 2,
        from: 'random'
      }
    });
  }, [character.id]);

  // Animação idle do personagem
  useEffect(() => {
    if (!characterRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    
    tl.to(characterRef.current, {
      y: -20,
      duration: 2,
      ease: 'sine.inOut'
    });

    return () => {
      tl.kill();
    };
  }, [character.id]);

  // Iluminação dinâmica
  useEffect(() => {
    if (!stageRef.current) return;

    gsap.to(stageRef.current, {
      '--glow-intensity': 'random(0.6, 1)',
      duration: 'random(2, 4)',
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, [character.id]);

  return (
    <div 
      ref={stageRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${character.backgroundColor}40 0%, ${character.backgroundColor}10 50%, transparent 100%)`,
        '--glow-intensity': 0.8
      } as React.CSSProperties}
    >
      {/* Background temático */}
      <motion.div
        key={`bg-${character.id}`}
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: 0.3, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute inset-0 bg-gradient-to-br"
        style={{
          backgroundImage: `linear-gradient(135deg, ${character.themeColor}20 0%, ${character.accentColor}10 100%)`
        }}
      />

      {/* Partículas ambientes */}
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: character.particleColor,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: `0 0 10px ${character.particleColor}`
            }}
          />
        ))}
      </div>

      {/* Glow dinâmico */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${character.themeColor}40 0%, transparent 70%)`,
          filter: 'blur(60px)',
          opacity: 'var(--glow-intensity)'
        } as React.CSSProperties}
      />

      {/* Personagem principal */}
      <AnimatePresence mode="wait">
        <motion.div
          key={character.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ 
            duration: 0.6, 
            ease: [0.43, 0.13, 0.23, 0.96]
          }}
          className="relative z-10 flex items-center justify-center h-full max-w-2xl mx-auto"
        >
          <div className="relative w-full" ref={characterRef}>
            {/* Círculo decorativo de fundo */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                rotate: [0, 360]
              }}
              transition={{
                duration: 60,
                repeat: Infinity,
                ease: 'linear'
              }}
            >
              <div 
                className="w-[120%] h-[120%] rounded-full opacity-20"
                style={{
                  border: `2px solid ${character.accentColor}`,
                  boxShadow: `0 0 60px ${character.accentColor}40`
                }}
              />
            </motion.div>

            {/* Imagem do personagem */}
            <motion.img
              src={character.imageUrl}
              alt={character.name}
              className="relative z-10 w-full h-auto object-contain drop-shadow-2xl"
              style={{
                filter: `drop-shadow(0 0 40px ${character.themeColor}80)`,
                maxHeight: '70vh'
              }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              onLoad={onCharacterLoad}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Overlay de brilho */}
      <motion.div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        animate={{
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          background: `radial-gradient(circle at 50% 40%, ${character.accentColor}40 0%, transparent 60%)`
        }}
      />
    </div>
  );
}
