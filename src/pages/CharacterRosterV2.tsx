/**
 * CharacterRosterV2 - Página principal da experiência de seleção
 * Inspirada em jogos de luta AAA com experiência cinematográfica
 */

import { HeroSection } from '@/components/character-roster-v2/HeroSection';
import SEOHead from '@/components/SEOHead';
import type { Character } from '@/types/character-roster.types';

// Mock data - substituir por dados reais da API
const mockCharacters: Character[] = [
  {
    id: '1',
    name: 'SHADOW KNIGHT',
    title: 'O Guardião das Trevas',
    description: 'Um guerreiro lendário que domina as sombras e protege o reino das forças obscuras.',
    lore: 'Nascido nas profundezas do abismo, o Shadow Knight jurou proteger aqueles que não podem se defender. Sua espada corta através da escuridão, trazendo luz onde há apenas desespero.',
    releaseDate: new Date('2026-05-01'),
    isLocked: false,
    rarity: 'legendary',
    imageUrl: '/characters/placeholder-purple.svg',
    thumbnailUrl: '/characters/placeholder-purple.svg',
    themeColor: '#8B5CF6',
    accentColor: '#A78BFA',
    backgroundColor: '#1E1B4B',
    particleColor: '#C4B5FD',
    stats: {
      power: 95,
      speed: 75,
      technique: 88,
      defense: 82
    }
  },
  {
    id: '2',
    name: 'CRIMSON BLADE',
    title: 'A Dançarina Carmesim',
    description: 'Mestre da espada dupla, ela dança entre seus inimigos com graça mortal.',
    lore: 'Treinada desde criança nas artes marciais ancestrais, Crimson Blade é conhecida por sua velocidade incomparável e técnica impecável.',
    releaseDate: new Date('2026-05-01'),
    isLocked: false,
    rarity: 'epic',
    imageUrl: '/characters/placeholder-red.svg',
    thumbnailUrl: '/characters/placeholder-red.svg',
    themeColor: '#DC2626',
    accentColor: '#F87171',
    backgroundColor: '#7F1D1D',
    particleColor: '#FCA5A5',
    stats: {
      power: 78,
      speed: 98,
      technique: 92,
      defense: 65
    }
  },
  {
    id: '3',
    name: 'IRON TITAN',
    title: 'O Colosso Inabalável',
    description: 'Uma fortaleza viva, capaz de resistir aos ataques mais devastadores.',
    lore: 'Forjado nas fornalhas vulcânicas, Iron Titan é a personificação da resistência e força bruta.',
    releaseDate: new Date('2026-05-01'),
    isLocked: false,
    rarity: 'rare',
    imageUrl: '/characters/placeholder-gray.svg',
    thumbnailUrl: '/characters/placeholder-gray.svg',
    themeColor: '#78716C',
    accentColor: '#A8A29E',
    backgroundColor: '#292524',
    particleColor: '#D6D3D1',
    stats: {
      power: 92,
      speed: 45,
      technique: 60,
      defense: 99
    }
  },
  {
    id: '4',
    name: '???',
    codename: 'PROJETO PHOENIX',
    title: 'Classificado',
    description: 'Informações restritas. Aguarde o lançamento.',
    lore: 'Rumores falam de uma criatura renascida das cinzas, com poderes além da compreensão mortal...',
    releaseDate: new Date('2026-06-01'),
    isLocked: true,
    rarity: 'mythic',
    imageUrl: '/characters/placeholder-gold.svg',
    thumbnailUrl: '/characters/placeholder-gold.svg',
    silhouetteUrl: '/characters/placeholder-gold.svg',
    themeColor: '#F59E0B',
    accentColor: '#FCD34D',
    backgroundColor: '#78350F',
    particleColor: '#FDE68A',
  },
  {
    id: '5',
    name: '???',
    codename: 'OPERAÇÃO VOID',
    title: 'Ultra Secreto',
    description: 'Acesso negado.',
    lore: 'Apenas sussurros no vazio... algo está vindo.',
    releaseDate: new Date('2026-07-01'),
    isLocked: true,
    rarity: 'mythic',
    imageUrl: '/characters/placeholder-blue.svg',
    thumbnailUrl: '/characters/placeholder-blue.svg',
    silhouetteUrl: '/characters/placeholder-blue.svg',
    themeColor: '#6366F1',
    accentColor: '#818CF8',
    backgroundColor: '#312E81',
    particleColor: '#C7D2FE',
  }
];

export default function CharacterRosterV2() {
  return (
    <>
      <SEOHead
        title="Coleção Premium - Character Roster"
        description="Explore nossa coleção exclusiva de personagens premium. Uma experiência cinematográfica inspirada nos melhores jogos de luta."
      />
      
      <HeroSection characters={mockCharacters} />
    </>
  );
}
