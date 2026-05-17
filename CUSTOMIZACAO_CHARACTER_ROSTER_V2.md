# 🎨 Guia de Customização - Character Roster V2

## 🎯 Como Adicionar Seus Próprios Personagens

### 1. Preparar Assets

#### Imagens Necessárias
```
/public/characters/
├── seu-personagem-full.png      (1024x1024px, PNG transparente)
├── seu-personagem-thumb.png     (256x256px, PNG transparente)
└── seu-personagem-silhouette.png (1024x1024px, preto sólido)
```

#### Especificações
- **Full**: Personagem completo, pose dinâmica
- **Thumb**: Versão reduzida, foco no rosto
- **Silhouette**: Forma preta para locked

### 2. Criar Objeto do Personagem

```typescript
const meuPersonagem: Character = {
  id: 'unique-id',
  name: 'NOME DO PERSONAGEM',
  title: 'Título Épico',
  description: 'Descrição curta (1-2 linhas)',
  lore: 'História completa do personagem (3-4 linhas)',
  releaseDate: new Date('2026-06-01'),
  isLocked: false, // true para futuros
  rarity: 'legendary', // common, rare, epic, legendary, mythic
  
  // Assets
  imageUrl: '/characters/seu-personagem-full.png',
  thumbnailUrl: '/characters/seu-personagem-thumb.png',
  silhouetteUrl: '/characters/seu-personagem-silhouette.png', // se locked
  
  // Tema (escolha cores que combinem)
  themeColor: '#8B5CF6',      // Cor principal
  accentColor: '#A78BFA',     // Cor de destaque
  backgroundColor: '#1E1B4B', // Cor de fundo
  particleColor: '#C4B5FD',   // Cor das partículas
  
  // Stats (0-100)
  stats: {
    power: 85,
    speed: 70,
    technique: 90,
    defense: 75
  }
};
```

### 3. Adicionar ao Array

```typescript
// src/pages/CharacterRosterV2.tsx
const mockCharacters: Character[] = [
  // ... personagens existentes
  meuPersonagem, // adicione aqui
];
```

## 🎨 Paletas de Cores Sugeridas

### Fogo/Vermelho
```typescript
themeColor: '#DC2626',
accentColor: '#F87171',
backgroundColor: '#7F1D1D',
particleColor: '#FCA5A5',
```

### Gelo/Azul
```typescript
themeColor: '#3B82F6',
accentColor: '#60A5FA',
backgroundColor: '#1E3A8A',
particleColor: '#93C5FD',
```

### Natureza/Verde
```typescript
themeColor: '#10B981',
accentColor: '#34D399',
backgroundColor: '#064E3B',
particleColor: '#6EE7B7',
```

### Sombra/Roxo
```typescript
themeColor: '#8B5CF6',
accentColor: '#A78BFA',
backgroundColor: '#1E1B4B',
particleColor: '#C4B5FD',
```

### Luz/Dourado
```typescript
themeColor: '#F59E0B',
accentColor: '#FCD34D',
backgroundColor: '#78350F',
particleColor: '#FDE68A',
```

### Elétrico/Ciano
```typescript
themeColor: '#06B6D4',
accentColor: '#22D3EE',
backgroundColor: '#164E63',
particleColor: '#67E8F9',
```

## 🎭 Personagens Locked

### Para Criar Mistério

```typescript
const personagemFuturo: Character = {
  id: 'futuro-1',
  name: '???',
  codename: 'OPERAÇÃO SECRETA', // Nome misterioso
  title: 'Classificado',
  description: 'Informações restritas.',
  lore: 'Rumores falam de...',
  releaseDate: new Date('2026-08-01'), // Data futura
  isLocked: true, // IMPORTANTE
  rarity: 'mythic',
  
  // Use a mesma imagem para todos (silhueta)
  imageUrl: '/characters/mystery-silhouette.png',
  thumbnailUrl: '/characters/mystery-silhouette.png',
  silhouetteUrl: '/characters/mystery-silhouette.png',
  
  // Cores misteriosas
  themeColor: '#6366F1',
  accentColor: '#818CF8',
  backgroundColor: '#312E81',
  particleColor: '#C7D2FE',
};
```

## 🎯 Raridades e Seus Significados

### Common (Comum)
- Glow: Cinza (#9CA3AF)
- Uso: Personagens básicos, iniciais

### Rare (Raro)
- Glow: Azul (#3B82F6)
- Uso: Personagens especiais, eventos

### Epic (Épico)
- Glow: Roxo (#8B5CF6)
- Uso: Personagens premium, coleções

### Legendary (Lendário)
- Glow: Dourado (#F59E0B)
- Uso: Personagens icônicos, exclusivos

### Mythic (Mítico)
- Glow: Rosa (#EC4899)
- Uso: Personagens ultra-raros, futuros

## 🔧 Customizar Animações

### Velocidade do Idle

```typescript
// src/components/character-roster-v2/CharacterStage.tsx
// Linha ~45
tl.to(characterRef.current, {
  y: -20,
  duration: 2, // Altere aqui (menor = mais rápido)
  ease: 'sine.inOut'
});
```

### Número de Partículas

```typescript
// src/components/character-roster-v2/CharacterStage.tsx
// Linha ~75
{Array.from({ length: 20 }).map((_, i) => ( // Altere 20
```

### Duração do Reveal

```typescript
// src/components/character-roster-v2/CharacterReveal.tsx
// Linha ~23
const timer = setTimeout(() => {
  setIsRevealing(false);
  onRevealComplete?.();
}, 2000); // Altere aqui (ms)
```

## 🎨 Customizar Layout

### Orientação do Seletor

```typescript
// src/components/character-roster-v2/HeroSection.tsx
// Linha ~50
<CharacterSelector
  orientation="horizontal" // ou "vertical"
  // ...
/>
```

### Tamanho dos Thumbnails

```typescript
// src/components/character-roster-v2/CharacterSelector.tsx
// Linha ~60
className={cn(
  'relative group transition-all duration-300',
  orientation === 'vertical' ? 'w-32 h-32' : 'w-32 h-32', // Altere aqui
  // ...
)}
```

## 🎵 Adicionar Áudio (Futuro)

### Preparar Sons

```
/public/audio/
├── shadow-knight-ambient.mp3
├── shadow-knight-select.mp3
├── crimson-blade-ambient.mp3
└── crimson-blade-select.mp3
```

### Adicionar ao Personagem

```typescript
const personagem: Character = {
  // ... outros campos
  ambientSound: '/audio/shadow-knight-ambient.mp3',
  selectSound: '/audio/shadow-knight-select.mp3',
};
```

### Ativar AudioManager

```typescript
// src/components/character-roster-v2/HeroSection.tsx
import { AudioManager } from './AudioManager';

// No componente
<AudioManager
  ambientSound={selectedCharacter.ambientSound}
  selectSound={selectedCharacter.selectSound}
  volume={0.3}
  enabled={true}
/>
```

## 📱 Ajustar Responsividade

### Breakpoints

```typescript
// src/components/character-roster-v2/HeroSection.tsx
<div className="grid grid-cols-1 lg:grid-cols-12">
  {/* lg: = 1024px+ */}
  {/* md: = 768px+ */}
  {/* sm: = 640px+ */}
</div>
```

### Mobile First

```typescript
// Padrão: mobile
className="flex-col"

// Desktop: horizontal
className="flex-col lg:flex-row"
```

## 🎯 Integrar com Backend

### Hook Preparado

```typescript
// src/hooks/useCharacterRoster.ts
export function useCharacterRoster(options: UseCharacterRosterOptions = {}) {
  // TODO: Substituir mock por API real
  
  useEffect(() => {
    const fetchCharacters = async () => {
      // Sua chamada de API aqui
      const response = await fetch(`/api/collections/${options.collectionId}/characters`);
      const data = await response.json();
      setCharacters(data);
    };
    
    fetchCharacters();
  }, [options.collectionId]);
  
  // ...
}
```

### Usar na Página

```typescript
// src/pages/CharacterRosterV2.tsx
import { useCharacterRoster } from '@/hooks/useCharacterRoster';

export default function CharacterRosterV2() {
  const { characters, isLoading } = useCharacterRoster({
    collectionId: 'collection-1',
    autoSelectUnlocked: true
  });

  if (isLoading) return <div>Carregando...</div>;

  return <HeroSection characters={characters} />;
}
```

## 🎨 Temas Personalizados

### CSS Variables

```css
/* src/styles/character-roster-v2.css */
:root {
  --roster-primary: #8B5CF6;
  --roster-secondary: #A78BFA;
  --roster-accent: #C4B5FD;
  --roster-background: #1E1B4B;
  --roster-glow: #8B5CF6;
  --roster-particle: #C4B5FD;
}

/* Tema escuro alternativo */
.dark-theme {
  --roster-primary: #1E1B4B;
  --roster-secondary: #312E81;
  --roster-accent: #4C1D95;
  --roster-background: #0F0A1E;
  --roster-glow: #6366F1;
  --roster-particle: #818CF8;
}
```

## 📝 Dicas Finais

### Performance
- Otimize imagens (< 200KB)
- Use WebP quando possível
- Lazy load para muitos personagens

### UX
- Mantenha transições < 500ms
- Feedback visual imediato
- Estados claros (hover, selected, disabled)

### Acessibilidade
- Contraste mínimo 4.5:1
- Suporte a reduced motion
- Keyboard navigation (futuro)

### Manutenção
- Documente personagens novos
- Versionamento de assets
- Backup de configurações

---

**Dúvidas?** Consulte:
- `docs/CHARACTER_ROSTER_V2.md`
- `src/components/character-roster-v2/README.md`
- Código comentado nos componentes
