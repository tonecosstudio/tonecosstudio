/**
 * CharacterInfo - Informações do personagem (embaixo do palco)
 * Nome, título, descrição e edição
 */

import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import type { Character } from '@/types/character-roster.types';

interface CharacterInfoProps {
  character: Character;
}

export function CharacterInfo({ character }: CharacterInfoProps) {
  return (
    <motion.div
      key={character.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      {/* Tag de personagem do mês */}
      <div className="inline-block">
        <span className="text-[10px] tracking-[0.3em] text-amber-600/60 uppercase">
          Personagem do Mês
        </span>
      </div>

      {/* Nome do personagem */}
      <div className="space-y-2">
        <h1 
          className="text-6xl lg:text-7xl font-bold tracking-wider"
          style={{
            color: character.themeColor,
            textShadow: `0 0 30px ${character.themeColor}80`
          }}
        >
          {character.name}
        </h1>
        <p className="text-sm text-gray-400 tracking-wider">
          {character.title}
        </p>
      </div>

      {/* Descrição */}
      <p className="text-sm text-gray-500 leading-relaxed max-w-md">
        {character.description}
      </p>

      {/* Botão de ver lore */}
      <button className="group flex items-center gap-3 px-6 py-3 border border-amber-600/30 rounded hover:bg-amber-600/10 transition-all duration-300">
        <Eye className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-600 uppercase tracking-wider">
          Ver Lore Completo
        </span>
      </button>

      {/* Edição */}
      <div className="pt-4 border-t border-gray-800/50">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold" style={{ color: character.accentColor }}>
            01
          </span>
          <div className="text-xs text-gray-600">
            <div className="uppercase tracking-wider">Edição</div>
            <div className="text-gray-700">
              {new Date(character.releaseDate).toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
