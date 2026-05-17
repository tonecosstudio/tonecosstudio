# Character Roster V2 Components

Sistema de seleção de personagens inspirado em jogos de luta AAA.

## 🎮 Quick Start

```tsx
import { HeroSection } from '@/components/character-roster-v2';
import type { Character } from '@/types/character-roster.types';

const characters: Character[] = [
  // ... seus personagens
];

function MyPage() {
  return <HeroSection characters={characters} />;
}
```

## 📦 Componentes

### HeroSection
Container principal que orquestra toda a experiência.

```tsx
<HeroSection 
  characters={characters}
  initialCharacterId="1" // opcional
/>
```

### CharacterStage
Palco principal do personagem com animações cinematográficas.

```tsx
<CharacterStage 
  character={selectedCharacter}
  onCharacterLoad={() => console.log('loaded')}
/>
```

### CharacterSelector
Seletor de personagens (roster).

```tsx
<CharacterSelector
  characters={characters}
  selectedCharacterId={selectedId}
  onSelectCharacter={handleSelect}
  orientation="horizontal" // ou "vertical"
/>
```

### LorePanel
Painel de informações e stats do personagem.

```tsx
<LorePanel character={selectedCharacter} />
```

### CharacterReveal
Animação de reveal ao trocar personagens.

```tsx
<CharacterReveal 
  character={character}
  onRevealComplete={() => setShowReveal(false)}
/>
```

### LockedCharacterTeaser
Teaser para personagens futuros.

```tsx
<LockedCharacterTeaser character={lockedCharacter} />
```

## 🎨 Customização

### Tema do Personagem

```typescript
const character: Character = {
  // ... outros campos
  themeColor: '#8B5CF6',      // Cor principal
  accentColor: '#A78BFA',     // Cor de destaque
  backgroundColor: '#1E1B4B', // Cor de fundo
  particleColor: '#C4B5FD',   // Cor das partículas
};
```

### Raridades

```typescript
type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
```

Cada raridade tem um glow específico:
- **Common**: Cinza (#9CA3AF)
- **Rare**: Azul (#3B82F6)
- **Epic**: Roxo (#8B5CF6)
- **Legendary**: Dourado (#F59E0B)
- **Mythic**: Rosa (#EC4899)

## 🔧 Hooks

### useCharacterRoster

```tsx
import { useCharacterRoster } from '@/hooks/useCharacterRoster';

function MyComponent() {
  const {
    characters,
    selectedCharacter,
    isLoading,
    selectCharacter,
    getUnlockedCharacters,
    getLockedCharacters
  } = useCharacterRoster({
    collectionId: 'collection-1',
    autoSelectUnlocked: true
  });

  return (
    // ... seu componente
  );
}
```

## 🎯 Tipos

```typescript
interface Character {
  id: string;
  name: string;
  codename?: string;
  title: string;
  description: string;
  lore: string;
  releaseDate: Date;
  isLocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  
  // Assets
  imageUrl: string;
  thumbnailUrl: string;
  silhouetteUrl?: string;
  
  // Tema
  themeColor: string;
  accentColor: string;
  backgroundColor: string;
  particleColor: string;
  
  // Stats (opcional)
  stats?: {
    power: number;
    speed: number;
    technique: number;
    defense: number;
  };
}
```

## 🎬 Animações

### Framer Motion
- Transições de entrada/saída
- Hover effects
- Reveal cinematográfico

### GSAP
- Animação idle do personagem
- Sistema de partículas
- Iluminação dinâmica

## 📱 Responsividade

- **Desktop (lg+)**: Layout dual-panel
- **Tablet (md)**: Layout adaptado
- **Mobile (sm)**: Layout vertical

## ⚡ Performance

- Lazy loading de imagens
- Animações com GPU acceleration
- Cleanup automático de timers
- Memoização de componentes pesados

## 🎨 Estilos Customizados

Arquivo: `src/styles/character-roster-v2.css`

CSS variables disponíveis:
```css
--roster-primary
--roster-secondary
--roster-accent
--roster-background
--roster-glow
--roster-particle
```

## 🔮 Futuro

- [ ] Integração com API
- [ ] Sistema de áudio
- [ ] Preview 3D
- [ ] Compartilhamento social
- [ ] Conquistas e badges

## 📝 Notas

- Personagens locked aparecem como silhuetas
- Transições são automáticas ao trocar personagens
- Sistema preparado para áudio ambiente (futuro)
- Tema muda dinamicamente por personagem
