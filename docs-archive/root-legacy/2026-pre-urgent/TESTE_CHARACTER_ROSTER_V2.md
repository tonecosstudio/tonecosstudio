# 🧪 Guia de Teste - Character Roster V2

## ✅ Correções Aplicadas

1. **Import do SEOHead**: Corrigido de named export para default export
2. **Imagens placeholder**: Substituídas por URLs do Unsplash para funcionamento imediato

## 🚀 Como Testar

### 1. Iniciar o Servidor
```bash
npm run dev
```

### 2. Acessar a Página
```
http://localhost:5173/roster-v2
```

## 🎮 O Que Testar

### ✅ Funcionalidades Básicas

#### 1. Visualização Inicial
- [ ] Página carrega sem erros
- [ ] Personagem inicial aparece no palco (Shadow Knight)
- [ ] Seletor mostra 5 personagens
- [ ] Painel de lore exibe informações

#### 2. Seleção de Personagens
- [ ] Click em thumbnail desbloqueado troca personagem
- [ ] Animação de reveal aparece
- [ ] Palco atualiza com novo personagem
- [ ] Painel de lore atualiza
- [ ] Tema muda (cores de fundo e glow)

#### 3. Personagens Locked
- [ ] Thumbnails locked aparecem escurecidos
- [ ] Ícone de cadeado visível
- [ ] Codename exibido (ex: "PROJETO PHOENIX")
- [ ] Data de lançamento mostrada
- [ ] Click não faz nada (disabled)

#### 4. Animações
- [ ] Personagem tem movimento idle (sobe e desce suavemente)
- [ ] Partículas flutuam no fundo
- [ ] Glow pulsa suavemente
- [ ] Transição entre personagens é suave
- [ ] Reveal é cinematográfico

#### 5. Stats Visuais
- [ ] Barras de stats aparecem
- [ ] Animação de preenchimento funciona
- [ ] Valores corretos exibidos
- [ ] Ícones de stats visíveis

#### 6. Responsividade
- [ ] Desktop: layout dual-panel
- [ ] Tablet: layout adaptado
- [ ] Mobile: layout vertical

### ✅ Testes por Personagem

#### Shadow Knight (Legendary - Roxo)
- [ ] Imagem carrega
- [ ] Tema roxo aplicado
- [ ] Stats: Power 95, Speed 75, Technique 88, Defense 82
- [ ] Glow dourado (legendary)

#### Crimson Blade (Epic - Vermelho)
- [ ] Imagem carrega
- [ ] Tema vermelho aplicado
- [ ] Stats: Power 78, Speed 98, Technique 92, Defense 65
- [ ] Glow roxo (epic)

#### Iron Titan (Rare - Cinza)
- [ ] Imagem carrega
- [ ] Tema cinza aplicado
- [ ] Stats: Power 92, Speed 45, Technique 60, Defense 99
- [ ] Glow azul (rare)

#### Projeto Phoenix (Locked - Dourado)
- [ ] Silhueta visível
- [ ] Codename "PROJETO PHOENIX"
- [ ] Data: Junho 2026
- [ ] Não clicável
- [ ] Glow rosa (mythic)

#### Operação Void (Locked - Azul)
- [ ] Silhueta visível
- [ ] Codename "OPERAÇÃO VOID"
- [ ] Data: Julho 2026
- [ ] Não clicável
- [ ] Glow rosa (mythic)

## 🐛 Problemas Conhecidos

### Imagens Placeholder
- Usando Unsplash temporariamente
- Substituir por assets reais quando disponível

### Performance
- Primeira carga pode ser lenta (imagens externas)
- Considerar CDN ou assets locais

## 📊 Checklist de Qualidade

### Visual
- [ ] Cores vibrantes e contrastantes
- [ ] Animações suaves (60fps)
- [ ] Sem flickering ou glitches
- [ ] Tipografia legível
- [ ] Espaçamento adequado

### UX
- [ ] Feedback visual imediato ao hover
- [ ] Transições não muito lentas nem rápidas
- [ ] Estados claros (selected, hover, disabled)
- [ ] Informações fáceis de ler

### Performance
- [ ] Página carrega em < 3s
- [ ] Animações não travam
- [ ] Sem memory leaks
- [ ] CPU usage razoável

### Acessibilidade
- [ ] Contraste adequado
- [ ] Textos legíveis
- [ ] Estados visuais claros
- [ ] Funciona com reduced motion

## 🎯 Cenários de Teste

### Cenário 1: Primeira Visita
1. Usuário acessa `/roster-v2`
2. Vê Shadow Knight no palco
3. Lê informações no painel
4. Explora seletor

### Cenário 2: Exploração
1. Usuário clica em Crimson Blade
2. Vê animação de reveal
3. Personagem muda no palco
4. Tema muda para vermelho
5. Lê nova história

### Cenário 3: Descoberta de Locked
1. Usuário vê personagens locked
2. Tenta clicar (não funciona)
3. Lê codename e data
4. Cria antecipação

### Cenário 4: Comparação
1. Usuário alterna entre personagens
2. Compara stats visuais
3. Decide favorito
4. Aprecia animações

## 🔧 Troubleshooting

### Erro: Módulo não encontrado
```bash
# Reinstalar dependências
npm install
```

### Erro: Imagens não carregam
- Verificar conexão com internet (Unsplash)
- Ou substituir por assets locais

### Erro: Animações travando
- Verificar GPU acceleration
- Reduzir número de partículas
- Desabilitar alguns efeitos

### Erro: Layout quebrado
- Limpar cache do navegador
- Verificar Tailwind CSS
- Inspecionar console

## 📝 Feedback

Ao testar, anote:
- ✅ O que funcionou bem
- ❌ O que não funcionou
- 💡 Sugestões de melhoria
- 🐛 Bugs encontrados

## 🎬 Próximos Passos Após Teste

1. **Se tudo OK**:
   - Adicionar assets reais
   - Integrar com backend
   - Deploy para staging

2. **Se houver problemas**:
   - Documentar bugs
   - Priorizar correções
   - Testar novamente

---

**Última atualização**: 17/05/2026  
**Status**: ✅ Pronto para teste
