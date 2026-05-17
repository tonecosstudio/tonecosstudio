/**
 * Types for Character Roster V2 - AAA Fighting Game Inspired
 */

export interface Character {
  id: string;
  name: string;
  codename?: string; // Para personagens futuros
  title: string;
  description: string;
  lore: string;
  releaseDate: Date;
  isLocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  
  // Visual assets
  imageUrl: string;
  thumbnailUrl: string;
  silhouetteUrl?: string;
  
  // Theme
  themeColor: string;
  accentColor: string;
  backgroundColor: string;
  particleColor: string;
  
  // Stats/Info
  stats?: {
    power: number;
    speed: number;
    technique: number;
    defense: number;
  };
  
  // Audio (futuro)
  ambientSound?: string;
  selectSound?: string;
}

export interface MonthlyCollection {
  id: string;
  month: string;
  year: number;
  theme: string;
  characters: Character[];
  featuredCharacterId: string;
}

export interface CharacterRosterTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  glow: string;
  particle: string;
}
