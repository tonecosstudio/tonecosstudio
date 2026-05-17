/**
 * ThemeTransition - Transição suave de tema entre personagens
 * Gerencia mudanças de cor, partículas e ambiente
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CharacterRosterTheme } from '@/types/character-roster.types';

interface ThemeTransitionProps {
  theme: CharacterRosterTheme;
  isTransitioning: boolean;
}

export function ThemeTransition({ theme, isTransitioning }: ThemeTransitionProps) {
  useEffect(() => {
    // Update CSS variables for global theme
    document.documentElement.style.setProperty('--roster-primary', theme.primary);
    document.documentElement.style.setProperty('--roster-secondary', theme.secondary);
    document.documentElement.style.setProperty('--roster-accent', theme.accent);
    document.documentElement.style.setProperty('--roster-glow', theme.glow);
  }, [theme]);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <>
          {/* Color wash overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${theme.primary}60 0%, transparent 70%)`
            }}
          />

          {/* Flash effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{ backgroundColor: theme.accent }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
