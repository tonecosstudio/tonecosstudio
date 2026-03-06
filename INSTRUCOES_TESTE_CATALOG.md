# 🧪 Instruções de Teste - Catálogo de Personagens

## 🎯 OBJETIVO

Testar o novo catálogo profissional em `/catalog` para validar todas funcionalidades do sistema híbrido.

---

## 🚀 PREPARAÇÃO

### 1. Iniciar Servidor

```bash
npm run dev
# ou
bun dev
```

### 2. Acessar Catálogo

```
http://localhost:5173/catalog
```

---

## ✅ CENÁRIOS DE TESTE

### CENÁRIO 1: Usuário Não Autenticado

**Passos:**

1. Acesse `/catalog` sem estar logado
2. Observe o comportamento

**Resultado Esperado:**

- ✅ Redireciona para `/login`
- ✅ Após login, volta para `/catalog`

---

### CENÁRIO 2: Assinante com Saldo

**Pré-requisitos:**

- Usuário logado
- Assinatura ativa
- Saldo de coins > 0

**Passos:**

1. Acesse `/catalog`
2. Observe a barra de saldo no topo
3. Observe os cards de personagens
4. Clique em um personagem com preço menor que seu saldo
5. Clique em "Comprar"
6. Observe o feedback

**Resultado Esperado:**

- ✅ Mostra barra de saldo com valor correto
- ✅ Mostra botão "Comprar mais coins"
- ✅ Mostra botão "Ver histórico"
- ✅ Cards mostram preços em coins
- ✅ Botão "Comprar" habilitado para personagens com saldo suficiente
- ✅ Compra é processada
- ✅ Toast de sucesso aparece
- ✅ Saldo é atualizado automaticamente
- ✅ Personagem é adicionado à coleção

**Validações:**

- [ ] Saldo exibido está correto
- [ ] Preços dos personagens estão corretos
- [ ] Compra debita o valor correto
- [ ] Saldo atualiza em tempo real
- [ ] Toast mostra mensagem clara

---

### CENÁRIO 3: Assinante com Saldo Insuficiente

**Pré-requisitos:**

- Usuário logado
- Assinatura ativa
- Saldo de coins < preço do personagem

**Passos:**

1. Acesse `/catalog`
2. Observe cards de personagens caros
3. Tente clicar em "Comprar" (botão desabilitado)
4. Observe o warning abaixo do botão

**Resultado Esperado:**

- ✅ Botão "Comprar" desabilitado
- ✅ Texto do botão: "Saldo insuficiente"
- ✅ Warning: "Você precisa de mais X coins"
- ✅ Barra de saldo mostra warning se saldo < 500

**Validações:**

- [ ] Botão está desabilitado
- [ ] Warning mostra valor correto faltante
- [ ] Barra de saldo mostra alerta se < 500

---

### CENÁRIO 4: Assinante com Saldo Zero

**Pré-requisitos:**

- Usuário logado
- Assinatura ativa
- Saldo de coins = 0

**Passos:**

1. Acesse `/catalog`
2. Observe a barra de saldo
3. Observe os cards de personagens

**Resultado Esperado:**

- ✅ Barra de saldo mostra "0 coins"
- ✅ Alerta vermelho: "Seu saldo está zerado"
- ✅ Botão "Comprar coins" destacado
- ✅ Todos botões "Comprar" desabilitados
- ✅ Todos cards mostram "Saldo insuficiente"

**Validações:**

- [ ] Alerta de saldo zero aparece
- [ ] Botão "Comprar coins" está visível
- [ ] Nenhum personagem pode ser comprado

---

### CENÁRIO 5: Não Assinante

**Pré-requisitos:**

- Usuário logado
- Sem assinatura ativa

**Passos:**

1. Acesse `/catalog`
2. Observe o alerta no topo
3. Observe os cards de personagens
4. Clique em "Ver planos disponíveis"

**Resultado Esperado:**

- ✅ Alerta: "Você precisa ser assinante para comprar personagens"
- ✅ Botão "Ver planos disponíveis" visível
- ✅ Não mostra barra de saldo
- ✅ Cards mostram botão "Assinar" (com ícone de cadeado)
- ✅ Clique em "Ver planos" redireciona para `/plans`

**Validações:**

- [ ] Alerta aparece corretamente
- [ ] Barra de saldo não aparece
- [ ] Botões mostram "Assinar"
- [ ] Redirecionamento funciona

---

### CENÁRIO 6: Filtros - Apenas com Saldo

**Pré-requisitos:**

- Usuário logado
- Assinatura ativa
- Saldo de coins > 0 mas < alguns personagens

**Passos:**

1. Acesse `/catalog`
2. Clique no botão "Filtros"
3. Ative "Apenas com saldo suficiente"
4. Observe os personagens exibidos
5. Desative o filtro
6. Observe novamente

**Resultado Esperado:**

- ✅ Dropdown de filtros abre
- ✅ Checkbox "Apenas com saldo suficiente" visível
- ✅ Ao ativar: mostra apenas personagens com preço ≤ saldo
- ✅ Contador de filtros ativos: "1 filtro ativo"
- ✅ Ao desativar: mostra todos personagens
- ✅ Contador volta para "Filtros"

**Validações:**

- [ ] Filtro funciona corretamente
- [ ] Contador atualiza
- [ ] Personagens filtrados estão corretos

---

### CENÁRIO 7: Filtros - Com Multiplicador

**Pré-requisitos:**

- Usuário logado
- Catálogo com personagens com e sem multiplicador

**Passos:**

1. Acesse `/catalog`
2. Clique no botão "Filtros"
3. Ative "Com multiplicador de preço"
4. Observe os personagens exibidos
5. Observe os badges nos cards

**Resultado Esperado:**

- ✅ Mostra apenas personagens com multiplicador > 1.0
- ✅ Cards mostram badge amarelo com ícone de trending up
- ✅ Badge mostra valor do multiplicador (ex: "1.5x")
- ✅ Contador: "1 filtro ativo"

**Validações:**

- [ ] Apenas personagens com multiplicador aparecem
- [ ] Badges estão visíveis
- [ ] Valores dos multiplicadores estão corretos

---

### CENÁRIO 8: Filtros Combinados

**Pré-requisitos:**

- Usuário logado
- Assinatura ativa
- Saldo de coins > 0

**Passos:**

1. Acesse `/catalog`
2. Ative "Apenas com saldo suficiente"
3. Ative "Com multiplicador de preço"
4. Observe os personagens exibidos
5. Observe o contador de filtros

**Resultado Esperado:**

- ✅ Mostra apenas personagens que atendem AMBOS critérios:
  - Preço ≤ saldo
  - Multiplicador > 1.0
- ✅ Contador: "2 filtros ativos"
- ✅ Se nenhum personagem atender: mensagem "Nenhum personagem encontrado"
- ✅ Botão "Limpar Filtros" aparece

**Validações:**

- [ ] Filtros combinados funcionam
- [ ] Contador correto
- [ ] Mensagem de "nenhum encontrado" aparece se necessário
- [ ] Botão "Limpar filtros" funciona

---

### CENÁRIO 9: Preços Contextuais

**Pré-requisitos:**

- Usuário logado
- Assinatura ativa
- Personagens de diferentes coleções

**Passos:**

1. Acesse `/catalog`
2. Observe os preços de personagens de coleções diferentes
3. Compare com preços base das coleções
4. Observe personagens com multiplicador

**Resultado Esperado:**

- ✅ Preços variam por coleção
- ✅ Personagens com multiplicador têm preço maior
- ✅ Preço = preço_base_coleção × multiplicador
- ✅ Preços são calculados automaticamente

**Validações:**

- [ ] Preços estão corretos
- [ ] Multiplicadores aplicados corretamente
- [ ] Cálculo: base × multiplicador = preço final

---

### CENÁRIO 10: Paginação

**Pré-requisitos:**

- Catálogo com mais de 24 personagens

**Passos:**

1. Acesse `/catalog`
2. Scroll até o final da página
3. Observe o botão "Carregar Mais"
4. Clique no botão
5. Observe novos personagens carregando

**Resultado Esperado:**

- ✅ Mostra 24 personagens inicialmente
- ✅ Botão "Carregar Mais" aparece se houver mais
- ✅ Clique carrega próximos 24
- ✅ Novos personagens aparecem abaixo
- ✅ Botão desaparece se não houver mais

**Validações:**

- [ ] Paginação funciona
- [ ] Botão aparece/desaparece corretamente
- [ ] Novos personagens carregam

---

### CENÁRIO 11: Performance e Cache

**Pré-requisitos:**

- Usuário logado
- Assinatura ativa

**Passos:**

1. Acesse `/catalog` (primeira vez)
2. Observe tempo de carregamento
3. Navegue para outra página
4. Volte para `/catalog`
5. Observe tempo de carregamento

**Resultado Esperado:**

- ✅ Primeira carga: < 2 segundos
- ✅ Segunda carga: instantânea (cache)
- ✅ Imagens carregam progressivamente (lazy loading)
- ✅ Scroll suave
- ✅ Sem travamentos

**Validações:**

- [ ] Carregamento rápido
- [ ] Cache funciona
- [ ] Lazy loading funciona
- [ ] Performance boa

---

### CENÁRIO 12: Responsividade

**Dispositivos para testar:**

- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

**Passos:**

1. Acesse `/catalog` em cada dispositivo
2. Observe layout
3. Teste todas funcionalidades

**Resultado Esperado:**

**Desktop:**

- ✅ Grid: 4 colunas
- ✅ Barra de saldo: largura completa
- ✅ Filtros: dropdown à direita

**Tablet:**

- ✅ Grid: 2-3 colunas
- ✅ Barra de saldo: largura completa
- ✅ Filtros: dropdown à direita

**Mobile:**

- ✅ Grid: 1 coluna
- ✅ Barra de saldo: compacta
- ✅ Filtros: dropdown centralizado
- ✅ Botões: tamanho adequado para toque

**Validações:**

- [ ] Layout adapta corretamente
- [ ] Todos elementos visíveis
- [ ] Funcionalidades funcionam
- [ ] Texto legível

---

## 🐛 BUGS CONHECIDOS

### Nenhum bug conhecido no momento

Se encontrar bugs, documente:

1. Cenário de teste
2. Passos para reproduzir
3. Resultado esperado
4. Resultado obtido
5. Screenshots se possível

---

## 📊 CHECKLIST FINAL

### Funcionalidades Básicas

- [ ] Rota `/catalog` carrega
- [ ] Requer autenticação
- [ ] Mostra personagens
- [ ] Imagens carregam

### Sistema Híbrido

- [ ] Assinantes veem saldo
- [ ] Assinantes podem comprar
- [ ] Não assinantes veem alerta
- [ ] Não assinantes não podem comprar

### Preços Contextuais

- [ ] Preços calculados corretamente
- [ ] Multiplicadores aplicados
- [ ] Cache funciona

### Filtros

- [ ] Filtro de saldo funciona
- [ ] Filtro de multiplicador funciona
- [ ] Filtros combinados funcionam
- [ ] Contador correto

### Compras

- [ ] Validação de saldo
- [ ] Débito correto
- [ ] Atualização de saldo
- [ ] Toast de sucesso
- [ ] Personagem adicionado

### Performance

- [ ] Carregamento rápido
- [ ] Cache funciona
- [ ] Lazy loading
- [ ] Sem travamentos

### Responsividade

- [ ] Desktop OK
- [ ] Tablet OK
- [ ] Mobile OK

---

## 🎯 CRITÉRIOS DE ACEITAÇÃO

### Mínimo para Aprovar

- ✅ Todos cenários 1-5 passam (funcionalidades básicas)
- ✅ Filtros funcionam (cenários 6-8)
- ✅ Preços contextuais corretos (cenário 9)
- ✅ Performance aceitável (cenário 11)

### Ideal

- ✅ Todos 12 cenários passam
- ✅ Responsividade perfeita
- ✅ Nenhum bug encontrado

---

## 📝 RELATÓRIO DE TESTE

Após testar, preencha:

### Cenários Testados

- [ ] Cenário 1: Não autenticado
- [ ] Cenário 2: Assinante com saldo
- [ ] Cenário 3: Assinante sem saldo
- [ ] Cenário 4: Assinante saldo zero
- [ ] Cenário 5: Não assinante
- [ ] Cenário 6: Filtro saldo
- [ ] Cenário 7: Filtro multiplicador
- [ ] Cenário 8: Filtros combinados
- [ ] Cenário 9: Preços contextuais
- [ ] Cenário 10: Paginação
- [ ] Cenário 11: Performance
- [ ] Cenário 12: Responsividade

### Bugs Encontrados

```
Nenhum / Liste aqui
```

### Melhorias Sugeridas

```
Liste aqui
```

### Status Final

```
[ ] Aprovado - Pronto para produção
[ ] Aprovado com ressalvas - Pequenos ajustes necessários
[ ] Reprovado - Bugs críticos encontrados
```

---

## 🚀 PRÓXIMOS PASSOS APÓS TESTES

### Se Aprovado

1. Atualizar navegação para apontar para `/catalog`
2. Remover código antigo
3. Deploy em staging
4. Testes de aceitação do usuário

### Se Reprovado

1. Documentar bugs
2. Priorizar correções
3. Corrigir bugs
4. Testar novamente

---

**Boa sorte nos testes! 🎉**
