/**
 * AudioManager - Gerenciador de áudio ambiente
 * Preparado para integração futura com sons temáticos
 */

import { useEffect, useRef } from 'react';

interface AudioManagerProps {
  ambientSound?: string;
  selectSound?: string;
  volume?: number;
  enabled?: boolean;
}

export function AudioManager({
  ambientSound,
  selectSound,
  volume = 0.3,
  enabled = true
}: AudioManagerProps) {
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const selectAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled || !ambientSound) return;

    // Create ambient audio element
    const audio = new Audio(ambientSound);
    audio.loop = true;
    audio.volume = volume;
    ambientAudioRef.current = audio;

    // Fade in
    audio.play().catch(console.error);

    return () => {
      // Fade out and cleanup
      if (ambientAudioRef.current) {
        const fadeOut = setInterval(() => {
          if (ambientAudioRef.current && ambientAudioRef.current.volume > 0.01) {
            ambientAudioRef.current.volume -= 0.01;
          } else {
            clearInterval(fadeOut);
            ambientAudioRef.current?.pause();
          }
        }, 50);
      }
    };
  }, [ambientSound, volume, enabled]);

  const playSelectSound = () => {
    if (!enabled || !selectSound) return;

    if (!selectAudioRef.current) {
      selectAudioRef.current = new Audio(selectSound);
      selectAudioRef.current.volume = volume;
    }

    selectAudioRef.current.currentTime = 0;
    selectAudioRef.current.play().catch(console.error);
  };

  // Expose play function via ref or context if needed
  return null;
}
