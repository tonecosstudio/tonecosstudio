# Character Assets

Esta pasta contém os assets visuais dos personagens para o Character Roster V2.

## Estrutura de Arquivos

Para cada personagem, você precisa de:

### Personagens Desbloqueados
- `{character-name}-full.png` - Imagem completa do personagem (recomendado: 1024x1024px, PNG com transparência)
- `{character-name}-thumb.png` - Thumbnail para o seletor (recomendado: 256x256px, PNG com transparência)

### Personagens Locked
- `{character-name}-silhouette.png` - Silhueta do personagem (recomendado: 1024x1024px, PNG com transparência, preto sólido)

## Exemplos

```
/characters/
├── shadow-knight-full.png
├── shadow-knight-thumb.png
├── crimson-blade-full.png
├── crimson-blade-thumb.png
├── iron-titan-full.png
├── iron-titan-thumb.png
├── phoenix-silhouette.png
└── void-silhouette.png
```

## Diretrizes de Design

### Imagens Full
- Fundo transparente
- Personagem centralizado
- Pose dinâmica e icônica
- Iluminação dramática
- Alta resolução (1024x1024px ou maior)

### Thumbnails
- Versão reduzida da imagem full
- Foco no rosto/parte superior
- Mantém a pose reconhecível
- Otimizado para web (< 100KB)

### Silhouettes
- Forma completamente preta
- Mantém a silhueta reconhecível
- Mesmas dimensões da imagem full
- Usado para personagens futuros

## Otimização

Recomendações para performance:
- Comprimir PNGs com TinyPNG ou similar
- Usar WebP quando possível
- Lazy loading implementado automaticamente
- Considerar CDN para produção

## Placeholder

Enquanto não houver assets reais, o sistema usa:
- Gradientes coloridos baseados no tema
- Ícones de placeholder
- Silhuetas genéricas
