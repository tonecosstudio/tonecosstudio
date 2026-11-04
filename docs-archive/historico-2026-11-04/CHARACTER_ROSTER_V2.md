# Character Roster V2 - Documentação

## 🎮 Visão Geral

Sistema de seleção de personagens inspirado em jogos de luta AAA, transformando a coleção mensal em uma experiência cinematográfica e gamificada.

## 🏗️ Arquitetura

### Componentes Principais

```
character-roster-v2/
├── HeroSection.tsx          # Container principal
├── CharacterStage.tsx       # Palco do personagem
├── CharacterSelector.tsx    # Seletor de personagens
├── CharacterReveal.tsx      # Animação de reveal
├── LorePanel.tsx           # Painel de informações
├── LockedCharacterTeaser.tsx # Teaser de futuros
├── ParticleSystem.tsx      # Sistema de partículas
├── ThemeTransition.tsx     # Transição de tema
├── AudioManager.tsx        # Gerenciador de áudio
└── index.ts               # Barrel exports
```

### Hooks

```
hooks/
└── useCharacterRoster.ts   # Gerenciamento de estado
```

### Types

```
types/
└── character-roster.types.ts # Definições TypeScript
```

## 🎨 Features Implementadas

### ✅ Layout Dual-Panel
- **Lado Esquerdo**: Palco principal do personagem
- **Lado Direito**: Seletor + Painel de informações

### ✅ Animações Cinematográficas
- **Framer Motion**: Transições suaves e reveals
- **GSAP**: Animações idle e partículas
- **Reveal dramático**: Ao trocar personagens
- **Idle animation**: Movimento contínuo do personagem

### ✅ Sistema de Personagens
- **Desbloqueados**: Totalmente visíveis e interativos
- **Locked**: Silhuetas com teaser e data de release
- **Raridades**: Common, Rare, Epic, Legendary, Mythic
- **Stats visuais**: Power, Speed, Technique, Defense

### ✅ Efeitos Visuais
- **Iluminação dinâmica**: Baseada no tema do personagem
- **Partículas ambientes**: 20+ partículas flutuantes
- **Glow effects**: Auras e halos coloridos
- **Parallax**: Profundidade visual
- **Vignette**: Foco cinematográfico

### ✅ Sistema de Temas
- Cores dinâmicas por personagem
- Transições suaves entre temas
- Partículas temáticas
- Background atmosférico

### ✅ Preparado para Futuro
- **AudioManager**: Estrutura para sons ambiente
- **ThemeTransition**: Sistema de transição de tema
- **API Integration**: Hook preparado para backend

## 🎯 Experiência do Usuário

### Personagens Desbloqueados
1. Thumbnail no seletor
2. Hover com glow effect
3. Click para selecionar
4. Reveal cinematográfico
5. Palco principal atualizado
6. Painel de lore atualizado

### Personagens Locked
1. Silhueta misteriosa
2. Codename criptografado
3. Teaser de história
4. Data de lançamento
5. Não clicável
6. Cria antecipação

## 🚀 Como Usar

### Rota
```
/roster-v2
```

### Exemplo de Dados

```typescript
const character: Character = {
  id: '1',
  name: 'SHADOW KNIGHT',
  title: 'O Guardião das Trevas',
  description: 'Um guerreiro lendário...',
  lore: 'Nascido nas profundezas...',
  releaseDate: new Date('2026-05-01'),
  isLocked: false,
  rarity: 'legendary',
  imageUrl: '/characters/shadow-knight-full.png',
  thumbnailUrl: '/characters/shadow-knight-thumb.png',
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
};
```

## 🎨 Customização

### Cores por Raridade
```typescript
const rarityColors = {
  common: '#9CA3AF',    // Cinza
  rare: '#3B82F6',      // Azul
  epic: '#8B5CF6',      // Roxo
  legendary: '#F59E0B', // Dourado
  mythic: '#EC4899'     // Rosa
};
```

### Orientação do Seletor
```tsx
<CharacterSelector
  orientation="vertical"   // ou "horizontal"
  characters={characters}
  selectedCharacterId={id}
  onSelectCharacter={handleSelect}
/>
```

## 🔮 Próximos Passos

### Fase 1: Integração Backend
- [ ] Conectar com API de coleções
- [ ] Persistir seleção do usuário
- [ ] Sistema de unlock progressivo

### Fase 2: Áudio
- [ ] Sons ambiente por personagem
- [ ] SFX de seleção
- [ ] Música de fundo temática
- [ ] Controles de volume

### Fase 3: Interatividade
- [ ] Preview 3D dos personagens
- [ ] Rotação do modelo
- [ ] Zoom in/out
- [ ] Galeria de poses

### Fase 4: Social
- [ ] Compartilhar personagem favorito
- [ ] Ranking de popularidade
- [ ] Comentários e reações
- [ ] Sistema de badges

### Fase 5: Gamificação
- [ ] Conquistas por coleção
- [ ] Desafios mensais
- [ ] Recompensas por engajamento
- [ ] Sistema de níveis

## 📱 Responsividade

### Desktop (lg+)
- Layout dual-panel
- Seletor horizontal
- Palco grande

### Tablet (md)
- Layout empilhado
- Seletor horizontal
- Palco médio

### Mobile (sm)
- Layout vertical
- Seletor compacto
- Palco otimizado

## ⚡ Performance

### Otimizações
- Lazy loading de imagens
- Animações com GPU
- Debounce em transições
- Memoização de componentes
- Virtual scrolling (futuro)

### Métricas Alvo
- FCP: < 1.5s
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

## 🎭 Identidade Visual

### Princípios
- **Dark & Premium**: Fundo escuro, acentos vibrantes
- **Cinematográfico**: Transições suaves, timing preciso
- **Exclusivo**: Sensação de coleção premium
- **Misterioso**: Locked characters criam antecipação

### Inspirações
- Street Fighter 6 (character select)
- Mortal Kombat 11 (roster presentation)
- Valorant (agent select)
- League of Legends (champion select)

## 🛠️ Tecnologias

- **React 18**: Componentes e hooks
- **TypeScript**: Type safety
- **Framer Motion**: Animações declarativas
- **GSAP**: Animações complexas
- **Tailwind CSS**: Styling
- **Vite**: Build tool

## 📝 Notas de Desenvolvimento

### Convenções
- Componentes em PascalCase
- Hooks com prefixo `use`
- Types em arquivo separado
- Barrel exports para organização

### Boas Práticas
- Animações com `will-change`
- Cleanup de timers e listeners
- Memoização quando necessário
- Acessibilidade (ARIA labels)

## 🎬 Conclusão

O Character Roster V2 transforma a experiência de visualização de coleções em um momento premium e memorável, criando antecipação para lançamentos futuros e aumentando o engajamento dos usuários.

**Status**: ✅ Implementação Base Completa
**Próximo**: Integração com Backend
