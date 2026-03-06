# Sistema de Preços Contextuais - Requisitos

## 📋 Visão Geral

Implementar um sistema de preços contextuais que permite diferentes preços para coleções baseado no contexto do usuário (assinante com coleção escolhida, assinante sem coleção escolhida, não assinante) e tipo de modelo (catálogo tipo 1, catálogo tipo 2).

## 🎯 Objetivos

### Objetivo Principal
Criar um sistema de precificação dinâmica que ajusta automaticamente os preços das coleções e personagens baseado no relacionamento do usuário com a coleção (escolhida na assinatura ou não) e tipo de modelo.

### Objetivos Específicos
1. Implementar preços diferenciados para coleções escolhidas vs não escolhidas
2. Adicionar categorização de modelos do catálogo (Tipo 1, Tipo 2)
3. Criar função de cálculo automático de preço baseado em contexto
4. Atualizar interface admin para configuração de preços contextuais
5. Adicionar configuração de quantidade de coleções por plano
6. Remover código legado e obsoleto relacionado a preços

## 👥 Stakeholders

- **Admin**: Configura preços por contexto e tipos de modelo
- **Assinantes**: Veem preços diferenciados baseado em suas escolhas
- **Não Assinantes**: Veem preços padrão para compra avulsa
- **Sistema**: Calcula preços automaticamente baseado em regras

## 📊 Regras de Negócio

### RN001: Preços Contextuais por Status de Assinatura

**Descrição**: O preço de uma coleção varia baseado no status de assinatura do usuário e se ele escolheu aquela coleção.

**Contextos de Preço**:
1. **Assinante - Coleção Escolhida**: Preço com desconto configurável (ex: 20% off = 800 coins)
2. **Assinante - Coleção Não Escolhida**: Preço com acréscimo (ex: 1200 coins)
3. **Não Assinante**: Preço padrão (ex: 1200 coins)

**Cálculo de Desconto para Coleções Escolhidas**:
- Preço base: 1000 coins
- Desconto configurável: 20% (definido pelo admin)
- Preço final: 1000 - (1000 × 0.20) = 800 coins

**Exemplo**:
```
Usuário: João (Plano Trimestral)
Coleções Escolhidas: Vingadores
Configuração: Desconto de 20% para coleções escolhidas

Preços da coleção que João vê:
- Vingadores (escolhida): 1000 - (1000 × 0.20) = 800 coins/personagem base
- X-Men (não escolhida): 1000 × 1.2 = 1200 coins/personagem base
- Liga da Justiça (não escolhida): 1000 × 1.2 = 1200 coins/personagem base

Preços finais de personagens (com multiplicador):
Vingadores (escolhida - 800 coins base):
- Homem-Aranha (normal, 1.0): 800 × 1.0 = 800 coins
- Capitão América (normal, 1.0): 800 × 1.0 = 800 coins
- Hulk (grande, 1.5): 800 × 1.5 = 1200 coins
- Thanos (raro, 2.0): 800 × 2.0 = 1600 coins

X-Men (não escolhida - 1200 coins base):
- Wolverine (normal, 1.0): 1200 × 1.0 = 1200 coins
- Ciclope (normal, 1.0): 1200 × 1.0 = 1200 coins
- Fênix (premium, 1.5): 1200 × 1.5 = 1800 coins
```

### RN002: Tipos de Coleção

**Descrição**: Coleções são categorizadas em tipos que determinam seu comportamento de precificação.

**Tipos**:
1. **subscription**: Coleções de assinatura (preços contextuais aplicam)
2. **standard_catalog**: Catálogo Padrão (preço fixo intermediário)
3. **premium_catalog**: Catálogo Premium (preço fixo mais alto)

**Regras**:
- Coleções tipo `subscription` têm preços contextuais
- Coleções tipo `standard_catalog` e `premium_catalog` têm preços fixos independente de assinatura

### RN003: Quantidade de Coleções por Plano

**Descrição**: Cada plano de assinatura define quantas coleções o usuário pode escolher.

**Configuração**:
- **Trimestral**: 1 coleção
- **Semestral**: 3 coleções
- **Anual**: Todas as coleções (-1 = ilimitado)

**Validações**:
- Usuário não pode escolher mais coleções que o limite do plano
- Sistema deve validar no momento da escolha
- Admin pode configurar limite por plano

### RN004: Cálculo Automático de Preço

**Descrição**: Sistema calcula automaticamente o preço correto baseado em múltiplos fatores, incluindo multiplicador individual do personagem.

**Fatores Considerados**:
1. Tipo da coleção (subscription, catalog_1, catalog_2)
2. Status de assinatura do usuário (ativo ou não)
3. Coleção foi escolhida pelo usuário (sim ou não)
4. Multiplicador individual do personagem (opcional, padrão 1.0)

**Algoritmo em Duas Etapas**:

**Etapa 1: Calcular Preço da Coleção**
```
SE tipo_coleção = 'standard_catalog' ENTÃO
  preço_coleção = preço_standard_catalog
  
SE tipo_coleção = 'premium_catalog' ENTÃO
  preço_coleção = preço_premium_catalog
  
SE tipo_coleção = 'subscription' ENTÃO
  SE usuário_tem_assinatura_ativa ENTÃO
    SE coleção_foi_escolhida ENTÃO
      // Aplica desconto percentual configurável
      desconto = preço_base × (chosen_collection_discount_percentage / 100)
      preço_coleção = preço_base - desconto
    SENÃO
      preço_coleção = preço_base × multiplicador_not_chosen
    FIM SE
  SENÃO
    preço_coleção = preço_base × multiplicador_no_subscription
  FIM SE
FIM SE
```

**Etapa 2: Aplicar Multiplicador do Personagem**
```
multiplicador_personagem = personagem.price_multiplier OU 1.0
preço_final = preço_coleção × multiplicador_personagem
retornar preço_final
```

**Exemplo Completo**:
```
Coleção: Vingadores (escolhida)
Preço base: 1000 coins
Desconto: 20%
Preço da coleção: 1000 - (1000 × 0.20) = 800 coins

Personagem: Homem-Aranha (normal)
Multiplicador: 1.0
Preço final: 800 × 1.0 = 800 coins

Personagem: Hulk (grande/complexo)
Multiplicador: 1.5
Preço final: 800 × 1.5 = 1200 coins
```

### RN005: Preços Padrão por Contexto

**Descrição**: Sistema deve ter preços padrão configuráveis para cada contexto, incluindo desconto percentual para coleções escolhidas.

**Preços Padrão Sugeridos**:

**Preços Base (em COINS)**:
```
subscription:      1000 coins (base)
standard_catalog:  1400 coins (base)
premium_catalog:   1800 coins (base)
```

**Desconto para Coleções Escolhidas**:
```
chosen_collection_discount_percentage: 20% (configurável)
```

**Multiplicadores de Contexto**:
```
subscribed_chosen:     Aplica desconto configurável (ex: 20% off)
subscribed_not_chosen: 1.2  (120% - acréscimo de 20%)
no_subscription:       1.2  (120% - acréscimo de 20%)
```

**Preços Finais Calculados**:

**Para coleções escolhidas (subscription + chosen)**:
```
Preço base: 1000 coins
Desconto configurado: 20%
Cálculo: 1000 - (1000 × 0.20) = 1000 - 200 = 800 coins
```

**Para coleções não escolhidas (subscription + not_chosen)**:
```
Preço base: 1000 coins
Multiplicador: 1.2
Cálculo: 1000 × 1.2 = 1200 coins
```

**Para catálogos (standard/premium)**:
```
standard_catalog: 1400 × 1.0 = 1400 coins
premium_catalog:  1800 × 1.0 = 1800 coins
```

**Configuração**:
- Admin pode alterar preços base (afeta todos os contextos)
- Admin pode alterar multiplicadores (afeta todos os tipos)
- Admin pode alterar percentual de desconto para coleções escolhidas (ex: 15%, 20%, 25%)
- Desconto é aplicado como redução percentual do preço base (não como multiplicador)
- Histórico de mudanças deve ser mantido
- Cálculo automático garante consistência

**Exemplo Completo**:
```
Configuração:
- Preço base subscription: 1000 coins
- Desconto coleções escolhidas: 20%
- Multiplicador não escolhidas: 1.2

Resultados (preço da coleção):
- Vingadores (escolhida):     1000 - (1000 × 0.20) = 800 coins base
- X-Men (não escolhida):      1000 × 1.2 = 1200 coins base
- Catálogo Standard:          1400 coins base

Preços finais de personagens (coleção × multiplicador):
Vingadores (800 coins base):
- Homem-Aranha (1.0): 800 × 1.0 = 800 coins
- Hulk (1.5): 800 × 1.5 = 1200 coins
- Thanos (2.0): 800 × 2.0 = 1600 coins

X-Men (1200 coins base):
- Wolverine (1.0): 1200 × 1.0 = 1200 coins
- Fênix (1.5): 1200 × 1.5 = 1800 coins
```

### RN006: Integração com Sistema de Coins

**Descrição**: Compra de personagem sempre debita coins do saldo do usuário

**Fluxo de Compra**:
1. Sistema calcula preço contextual usando `get_character_price()`
2. Sistema valida saldo do usuário (balance >= preço)
3. Sistema debita coins do saldo (UPDATE user_coins)
4. Sistema registra transação no histórico (INSERT coin_transactions)
5. Sistema adiciona personagem ao usuário (INSERT user_characters)

**Validações**:
- ❌ Saldo insuficiente → Erro "Saldo insuficiente. Necessário: X coins, Disponível: Y coins"
- ❌ Personagem já possui → Erro "Você já possui este personagem"
- ❌ Personagem não existe → Erro "Personagem não encontrado"
- ✅ Tudo OK → Débito + Adiciona personagem + Retorna novo saldo

**Atomicidade**:
- Toda a operação deve ser atômica (transação SQL)
- Se qualquer passo falhar, rollback completo
- Garantir que coins não sejam debitados sem adicionar personagem

**Tabelas Envolvidas**:
- `user_coins`: Saldo de coins do usuário
- `coin_transactions`: Histórico de transações
- `user_characters`: Personagens do usuário
- `characters`: Dados do personagem
- `collections`: Dados da coleção (para calcular preço)

**Exemplo**:
```
Usuário: João
Saldo atual: 5000 coins
Personagem: Hulk (Coleção Vingadores - escolhida)
Preço base da coleção: 1000 coins
Desconto configurado: 20%
Preço da coleção: 1000 - (1000 × 0.20) = 800 coins
Multiplicador do personagem: 1.5 (grande/complexo)
Preço final: 800 × 1.5 = 1200 coins

Fluxo:
1. Validar: 5000 >= 1200 ✅
2. Debitar: 5000 - 1200 = 3800 coins
3. Registrar: coin_transactions (-1200, 'character_purchase', 'Hulk')
4. Adicionar: user_characters (João, Hulk)
5. Confirmar: "Hulk adquirido! Novo saldo: 3800 coins"
```

### RN007: Comportamento de Saldo Insuficiente

**Descrição**: Quando o usuário não possui coins suficientes para comprar um personagem, o sistema deve bloquear a compra e oferecer opção de adquirir mais coins.

**Comportamento na Interface**:
- **Quando balance < preço**:
  - Botão "Comprar" é substituído por botão "Comprar Coins"
  - Mensagem clara: "Saldo insuficiente. Necessário: X coins, Disponível: Y coins"
  - Indicador visual (cor vermelha ou ícone de alerta) no saldo
  - Botão "Comprar Coins" redireciona para página de compra de coins

- **Quando balance >= preço**:
  - Botão "Comprar" habilitado normalmente
  - Indicador visual (cor verde) no saldo
  - Exibição do saldo restante após compra (preview)

**Validações**:
- Validação de saldo deve ocorrer antes de qualquer tentativa de débito
- Validação deve ser feita tanto no frontend (UX) quanto no backend (segurança)
- Mensagem de erro deve ser específica e incluir valores exatos

**Integração com UC007**:
- Esta regra complementa o fluxo alternativo 5a do UC007
- Frontend deve prevenir tentativa de compra (botão bloqueado)
- Backend deve validar novamente como camada de segurança

**Exemplo**:
```
Usuário: Maria
Saldo atual: 800 coins
Personagem: Capitão América (Coleção Vingadores - escolhida)
Preço base: 1000 coins
Desconto configurado: 20%
Preço contextual: 1000 - (1000 × 0.20) = 800 coins

Interface exibe:
✅ Saldo suficiente
   Necessário: 800 coins
   Disponível: 800 coins
   Saldo após compra: 0 coins

[Botão: Comprar por 800 coins]

---

Se Maria tivesse apenas 600 coins:

❌ Saldo insuficiente
   Necessário: 800 coins
   Disponível: 600 coins
   Faltam: 200 coins

[Botão: Comprar Coins] ← Redireciona para /coins/purchase
```

### RN008: Multiplicador de Preço por Personagem

**Descrição**: Cada personagem pode ter um multiplicador de preço individual que ajusta o preço final baseado em suas características (tamanho, complexidade, raridade).

**Campo de Dados**:
- Campo: `price_multiplier` (DECIMAL)
- Tipo: Opcional
- Valor padrão: 1.0 (personagem normal)
- Validação: Deve ser > 0

**Valores Comuns**:
- **Normal**: 1.0 (sem alteração de preço)
- **Complexo**: 1.2 (20% mais caro - personagens com detalhes elaborados)
- **Premium**: 1.5 (50% mais caro - personagens especiais)
- **Raro**: 2.0 (100% mais caro - personagens raros ou exclusivos)
- **Grande**: 1.3 (30% mais caro - personagens de tamanho maior)

**Fórmula de Cálculo**:
```
Preço Final = Preço da Coleção × Multiplicador do Personagem
```

**Ordem de Aplicação**:
1. Primeiro: Calcular preço contextual da coleção (RN004)
2. Segundo: Aplicar multiplicador do personagem (RN008)

**Exemplo Completo**:
```
Coleção: Vingadores (escolhida)
Preço base: 1000 coins
Desconto configurado: 20%
Preço da coleção: 1000 - (1000 × 0.20) = 800 coins

Personagem: Homem-Aranha (normal)
Multiplicador: 1.0
Preço final: 800 × 1.0 = 800 coins

Personagem: Hulk (grande/complexo)
Multiplicador: 1.5
Preço final: 800 × 1.5 = 1200 coins

Personagem: Thanos (raro)
Multiplicador: 2.0
Preço final: 800 × 2.0 = 1600 coins
```

**Exemplo com Coleção Não Escolhida**:
```
Coleção: X-Men (não escolhida)
Preço base: 1000 coins
Multiplicador contexto: 1.2
Preço da coleção: 1000 × 1.2 = 1200 coins

Personagem: Wolverine (normal)
Multiplicador: 1.0
Preço final: 1200 × 1.0 = 1200 coins

Personagem: Fênix (premium)
Multiplicador: 1.5
Preço final: 1200 × 1.5 = 1800 coins
```

**Características**:
- Multiplicador é OPCIONAL (padrão 1.0 se não definido)
- Aplicado APÓS cálculo de preço contextual da coleção
- Permite precificação granular por personagem
- Admin configura por personagem individualmente
- Independente do contexto do usuário (sempre aplicado)

**Casos de Uso**:
- Personagens grandes (Hulk, Groot): 1.3-1.5
- Personagens complexos (Homem de Ferro com armadura): 1.2-1.4
- Personagens raros (edições limitadas): 1.5-2.0
- Personagens premium (exclusivos): 1.5-2.5
- Personagens normais: 1.0 (maioria)

### RN009: Explicação Visual de Preços Contextuais (UX)

**Descrição**: Sistema deve fornecer indicadores visuais claros que explicam por que os preços diferem entre coleções, evitando confusão do usuário sobre a precificação contextual.

### RN010: Cache Strategy for Price Calculations

**Descrição**: Sistema deve implementar estratégia de cache para otimizar cálculos de preço e reduzir carga no banco de dados.

**Objetivo**: Evitar cálculos repetitivos de preço que podem gerar queries excessivas e degradar performance.

**Estratégia de Cache**:

**1. Cache de Cálculos de Preço**:
- Duração: 5 minutos (300 segundos)
- Escopo: Por usuário e por coleção/personagem
- Chave de cache: `price:user:{user_id}:collection:{collection_id}` ou `price:user:{user_id}:character:{character_id}`

**2. Invalidação de Cache**:

**Invalidar quando**:
- Preço base de coleção é alterado (collection_base_pricing)
- Multiplicador de contexto é alterado (pricing_context_multipliers)
- Percentual de desconto é alterado (chosen_collection_discount_percentage)
- Multiplicador de personagem é alterado (character.price_multiplier)
- Usuário escolhe uma coleção (user_subscription_collections)
- Usuário remove uma coleção (user_subscription_collections)
- Status de assinatura do usuário muda (subscriptions)

**Como invalidar**:
- Invalidação em cascata: mudança em preço base invalida todos os caches de preço
- Invalidação seletiva: mudança em escolha de coleção invalida apenas caches daquele usuário
- Invalidação por padrão: usar wildcards para invalidar múltiplos caches relacionados

**3. Cache no Frontend (React Query)**:

**Configuração React Query**:
```typescript
// useCollectionPrice hook
const { data: price } = useQuery({
  queryKey: ['collection-price', collectionId, userId],
  queryFn: () => getCollectionPrice(collectionId, userId),
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 10 * 60 * 1000, // 10 minutos
});

// useCharacterPrice hook
const { data: price } = useQuery({
  queryKey: ['character-price', characterId, userId],
  queryFn: () => getCharacterPrice(characterId, userId),
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 10 * 60 * 1000, // 10 minutos
});
```

**Invalidação React Query**:
```typescript
// Ao atualizar preço base
queryClient.invalidateQueries({ queryKey: ['collection-price'] });
queryClient.invalidateQueries({ queryKey: ['character-price'] });

// Ao escolher/remover coleção
queryClient.invalidateQueries({ 
  queryKey: ['collection-price', collectionId, userId] 
});
queryClient.invalidateQueries({ 
  predicate: (query) => 
    query.queryKey[0] === 'character-price' && 
    query.queryKey[2] === userId 
});

// Ao atualizar multiplicador de personagem
queryClient.invalidateQueries({ 
  queryKey: ['character-price', characterId] 
});
```

**4. Cache no Banco de Dados (Opcional)**:

**Opção 1: Materialized Views**:
- Criar view materializada com preços pré-calculados
- Refresh automático via trigger quando dados mudam
- Útil para catálogos (standard_catalog, premium_catalog) que não mudam por usuário

**Opção 2: Function Caching**:
```sql
-- Marcar funções como STABLE para permitir cache dentro de query
CREATE OR REPLACE FUNCTION get_collection_price(...)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE  -- Permite PostgreSQL cachear resultado dentro da mesma transação
AS $$
...
$$;
```

**Opção 3: Redis Cache (Futuro)**:
- Cache distribuído para ambientes com múltiplos servidores
- TTL de 5 minutos
- Invalidação via pub/sub

**5. Métricas de Performance**:

**Monitorar**:
- Taxa de hit do cache (target: > 80%)
- Tempo médio de cálculo com cache (target: < 10ms)
- Tempo médio de cálculo sem cache (target: < 100ms)
- Número de invalidações por minuto
- Queries de preço por segundo

**Alertas**:
- Taxa de hit < 70% → Investigar padrão de uso
- Tempo de cálculo > 150ms → Otimizar queries
- Invalidações > 100/min → Possível problema de configuração

**6. Regras de Implementação**:

**Frontend**:
- SEMPRE usar hooks com cache (useCollectionPrice, useCharacterPrice)
- NUNCA fazer chamadas diretas sem cache
- Invalidar cache após mutations que afetam preços
- Usar optimistic updates quando possível

**Backend**:
- Funções SQL marcadas como STABLE
- Índices otimizados para queries de preço
- Considerar cache de resultados para catálogos fixos

**Exemplo de Fluxo Completo**:
```
1. Usuário acessa catálogo
   → Frontend busca preços via useCollectionPrice
   → React Query verifica cache (miss)
   → Chama get_collection_price() no banco
   → PostgreSQL executa função (STABLE permite cache interno)
   → Resultado armazenado no React Query cache (5 min)

2. Usuário navega para outro personagem da mesma coleção
   → Frontend busca preço via useCharacterPrice
   → React Query verifica cache (hit)
   → Retorna resultado imediatamente (< 1ms)

3. Admin atualiza preço base
   → Mutation invalida todos os caches de preço
   → Próxima query recalcula preços

4. Usuário escolhe coleção
   → Mutation invalida caches daquele usuário
   → Preços recalculados na próxima visualização
```

**Benefícios**:
- Redução de 80%+ em queries de preço
- Tempo de resposta < 10ms para cache hits
- Melhor experiência do usuário (carregamento instantâneo)
- Menor carga no banco de dados
- Escalabilidade melhorada

**Trade-offs**:
- Complexidade adicional de invalidação
- Possível inconsistência temporária (máximo 5 minutos)
- Memória adicional para cache (aceitável)

### RN011: Priority Order for Pricing Rules

**Descrição**: Sistema deve seguir ordem de prioridade clara quando múltiplas regras de precificação se aplicam.

**Objetivo**: Eliminar ambiguidade e garantir cálculo consistente quando há potencial conflito entre regras.

**Ordem de Prioridade (do maior para o menor)**:

**1. PRIORIDADE MÁXIMA: Tipo de Coleção (collection_type)**
- `subscription`: Preços contextuais aplicam (varia por usuário)
- `standard_catalog`: Preço fixo intermediário (1400 coins)
- `premium_catalog`: Preço fixo premium (1800 coins)

**Regra**: Se coleção é `standard_catalog` ou `premium_catalog`, usa preço fixo INDEPENDENTE de assinatura ou escolha.

**2. PRIORIDADE MÉDIA: Status de Assinatura**
- Usuário tem assinatura ativa: Aplica regras de assinante
- Usuário não tem assinatura: Aplica preço padrão (multiplicador no_subscription)

**Regra**: Apenas para coleções tipo `subscription`. Se não é assinante, não importa se "escolheu" coleção (não pode escolher sem assinatura).

**3. PRIORIDADE BAIXA: Coleção Escolhida**
- Coleção foi escolhida pelo assinante: Aplica desconto configurável
- Coleção não foi escolhida: Aplica multiplicador not_chosen

**Regra**: Apenas para assinantes com coleções tipo `subscription`. Esta é a última verificação.

**Árvore de Decisão**:

```
┌─────────────────────────────────────────────────────────┐
│ INÍCIO: Calcular Preço da Coleção                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────┐
         │ 1. Verificar Tipo de Coleção       │
         │    (PRIORIDADE MÁXIMA)             │
         └────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐              ┌──────────────────────┐
│ standard_catalog│              │ premium_catalog      │
│ ou premium?     │              │                      │
└─────────────────┘              └──────────────────────┘
         │                                  │
         │ SIM                              │ SIM
         ▼                                  ▼
┌─────────────────┐              ┌──────────────────────┐
│ Retorna preço   │              │ Retorna preço        │
│ fixo do catálogo│              │ fixo premium         │
│ FIM             │              │ FIM                  │
└─────────────────┘              └──────────────────────┘
         │
         │ NÃO (é subscription)
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Verificar Status de Assinatura                       │
│    (PRIORIDADE MÉDIA)                                   │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐              ┌──────────────────────┐
│ Tem assinatura  │              │ Não tem assinatura   │
│ ativa?          │              │                      │
└─────────────────┘              └──────────────────────┘
         │                                  │
         │ SIM                              │ NÃO
         ▼                                  ▼
┌─────────────────────────────────┐ ┌──────────────────────┐
│ 3. Verificar Coleção Escolhida  │ │ Aplica multiplicador │
│    (PRIORIDADE BAIXA)           │ │ no_subscription      │
└─────────────────────────────────┘ │ FIM                  │
         │                           └──────────────────────┘
         │
         ▼
┌────────────────┴────────────────┐
│                                  │
▼                                  ▼
┌─────────────────┐      ┌──────────────────────┐
│ Coleção foi     │      │ Coleção não foi      │
│ escolhida?      │      │ escolhida            │
└─────────────────┘      └──────────────────────┘
         │                          │
         │ SIM                      │ NÃO
         ▼                          ▼
┌─────────────────┐      ┌──────────────────────┐
│ Aplica desconto │      │ Aplica multiplicador │
│ configurável    │      │ not_chosen           │
│ (ex: 20%)       │      │                      │
│ FIM             │      │ FIM                  │
└─────────────────┘      └──────────────────────┘
```

**Exemplos de Resolução de Conflitos**:

**Exemplo 1: Catálogo Premium + Assinante + "Escolhida"**
```
Entrada:
- Tipo: premium_catalog
- Usuário: Assinante ativo
- Coleção: "Escolhida" pelo usuário

Resolução:
1. Tipo = premium_catalog → PRIORIDADE MÁXIMA
2. Retorna preço fixo premium (1800 coins)
3. Ignora assinatura e escolha (não aplicável para catálogos)

Resultado: 1800 coins (preço fixo)
```

**Exemplo 2: Subscription + Não Assinante + "Escolhida"**
```
Entrada:
- Tipo: subscription
- Usuário: Não tem assinatura
- Coleção: Marcada como "escolhida" (erro de dados)

Resolução:
1. Tipo = subscription → Continua para próxima verificação
2. Status = Não assinante → PRIORIDADE MÉDIA
3. Aplica multiplicador no_subscription (1.2)
4. Ignora "escolhida" (não pode escolher sem assinatura)

Resultado: 1000 × 1.2 = 1200 coins
```

**Exemplo 3: Subscription + Assinante + Escolhida**
```
Entrada:
- Tipo: subscription
- Usuário: Assinante ativo
- Coleção: Escolhida

Resolução:
1. Tipo = subscription → Continua
2. Status = Assinante → Continua
3. Escolhida = Sim → PRIORIDADE BAIXA
4. Aplica desconto configurável (20%)

Resultado: 1000 - (1000 × 0.20) = 800 coins
```

**Exemplo 4: Subscription + Assinante + Não Escolhida**
```
Entrada:
- Tipo: subscription
- Usuário: Assinante ativo
- Coleção: Não escolhida

Resolução:
1. Tipo = subscription → Continua
2. Status = Assinante → Continua
3. Escolhida = Não → PRIORIDADE BAIXA
4. Aplica multiplicador not_chosen (1.2)

Resultado: 1000 × 1.2 = 1200 coins
```

**Implementação na Função SQL**:

```sql
CREATE OR REPLACE FUNCTION get_collection_price(
  p_collection_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_collection_type TEXT;
  v_base_price INTEGER;
  v_has_subscription BOOLEAN;
  v_is_chosen BOOLEAN;
  v_discount_percentage INTEGER;
  v_multiplier DECIMAL(4,2);
  v_final_price INTEGER;
BEGIN
  -- Buscar tipo e preço base da coleção
  SELECT ct.name, cbp.base_price_coins
  INTO v_collection_type, v_base_price
  FROM collections c
  JOIN collection_types ct ON c.collection_type_id = ct.id
  JOIN collection_base_pricing cbp ON ct.id = cbp.collection_type_id
  WHERE c.id = p_collection_id;

  -- PRIORIDADE 1: Tipo de Coleção
  IF v_collection_type IN ('standard_catalog', 'premium_catalog') THEN
    -- Catálogos têm preço fixo, ignora assinatura e escolha
    RETURN v_base_price;
  END IF;

  -- PRIORIDADE 2: Status de Assinatura
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = p_user_id 
    AND status = 'active'
  ) INTO v_has_subscription;

  IF NOT v_has_subscription THEN
    -- Não assinante: aplica multiplicador no_subscription
    SELECT multiplier INTO v_multiplier
    FROM pricing_context_multipliers
    WHERE context = 'no_subscription';
    
    RETURN (v_base_price * v_multiplier)::INTEGER;
  END IF;

  -- PRIORIDADE 3: Coleção Escolhida (apenas para assinantes)
  SELECT EXISTS(
    SELECT 1 FROM user_subscription_collections
    WHERE user_id = p_user_id 
    AND collection_id = p_collection_id
  ) INTO v_is_chosen;

  IF v_is_chosen THEN
    -- Coleção escolhida: aplica desconto configurável
    SELECT chosen_collection_discount_percentage INTO v_discount_percentage
    FROM pricing_context_multipliers
    WHERE context = 'subscribed_chosen';
    
    v_final_price := v_base_price - (v_base_price * v_discount_percentage / 100);
    RETURN v_final_price;
  ELSE
    -- Coleção não escolhida: aplica multiplicador
    SELECT multiplier INTO v_multiplier
    FROM pricing_context_multipliers
    WHERE context = 'subscribed_not_chosen';
    
    RETURN (v_base_price * v_multiplier)::INTEGER;
  END IF;
END;
$$;
```

**Validações**:
- Sistema NUNCA aplica desconto de coleção escolhida para catálogos
- Sistema NUNCA considera "escolha" para não assinantes
- Sistema SEMPRE verifica tipo de coleção primeiro
- Sistema SEMPRE segue ordem de prioridade

**Testes de Prioridade**:
- Teste: Catálogo premium ignorado assinatura → Passa se retorna preço fixo
- Teste: Não assinante ignora escolha → Passa se retorna preço padrão
- Teste: Assinante com escolha aplica desconto → Passa se retorna preço com desconto
- Teste: Assinante sem escolha aplica multiplicador → Passa se retorna preço com acréscimo

**Benefícios**:
- Eliminação de ambiguidade no cálculo
- Comportamento previsível e consistente
- Facilita debugging e manutenção
- Reduz erros de implementação
- Documentação clara para desenvolvedores

**Objetivo**: Garantir que usuários entendam imediatamente:
- Quais coleções eles escolheram na assinatura
- Por que algumas coleções têm preços diferentes
- Quanto estão economizando em coleções escolhidas
- Como podem obter descontos (para não assinantes)

**Elementos Visuais Obrigatórios**:

**1. Badges de Status da Coleção**:

**Para Coleções Escolhidas (Assinantes)**:
- Badge: "Sua Coleção" ou "Coleção Escolhida"
- Cor: Verde/Primary (ex: bg-green-500, bg-primary-500)
- Posicionamento: Canto superior direito do card da coleção
- Estilo: Destaque visual claro, pode incluir ícone de check (✓)

**Para Coleções Não Escolhidas (Assinantes)**:
- Badge: "Disponível" (opcional, pode não ter badge)
- Cor: Neutra/Cinza (ex: bg-gray-400)
- Posicionamento: Canto superior direito do card da coleção
- Estilo: Discreto, não competir com coleções escolhidas

**Para Não Assinantes**:
- Badge: "Preço Avulso" ou sem badge
- Cor: Neutra (ex: bg-gray-500)
- Posicionamento: Canto superior direito do card da coleção
- Call-to-action: Botão "Assinar para Economizar" visível

**2. Exibição de Preços e Descontos**:

**Para Coleções Escolhidas**:
- Preço com desconto: Destaque visual (fonte maior, cor verde)
- Preço original: Opcional, mostrar riscado com percentual de desconto
- Exemplo: ~~1000 coins~~ **800 coins** (-20%)
- Badge de economia: "Economize 200 coins" ou "20% OFF"

**Para Coleções Não Escolhidas**:
- Preço regular: Fonte normal, cor padrão
- Sem indicação de desconto
- Mensagem sutil: "Escolha esta coleção para economizar"

**Para Não Assinantes**:
- Preço padrão: Fonte normal
- Call-to-action: "Assine e economize até 20%"
- Link para página de assinatura

**3. Sistema de Tooltips Explicativos**:

**Tooltip para Coleções Escolhidas**:
```
Título: "Sua Coleção - Preço com Desconto"
Conteúdo: "Você escolheu esta coleção na sua assinatura e recebe 20% de desconto em todos os personagens."
Exemplo: "Preço base: 1000 coins → Seu preço: 800 coins"
```

**Tooltip para Coleções Não Escolhidas (Assinante)**:
```
Título: "Coleção Disponível"
Conteúdo: "Escolha esta coleção na sua assinatura para receber 20% de desconto."
Ação: Link "Gerenciar Coleções" → redireciona para página de gerenciamento
```

**Tooltip para Não Assinantes**:
```
Título: "Preço Avulso"
Conteúdo: "Assine um plano para ter acesso a preços com desconto de até 20%."
Ação: Link "Ver Planos" → redireciona para página de assinatura
```

**4. Hierarquia Visual**:

**Coleções Escolhidas**:
- Destaque máximo: Border colorido (ex: border-green-500, border-2)
- Sombra mais pronunciada (shadow-lg)
- Animação sutil ao hover (scale-105)
- Posicionamento: Podem aparecer primeiro na lista

**Coleções Não Escolhidas**:
- Destaque médio: Border neutra (border-gray-300)
- Sombra padrão (shadow-md)
- Sem animação especial

**5. Comparação de Preços (Opcional mas Recomendado)**:

**View de Comparação**:
- Mostrar lado a lado: "Preço com assinatura" vs "Preço sem assinatura"
- Destacar economia total: "Economize até X coins por mês"
- Gráfico visual de economia (barra de progresso)

**6. Consistência de Design**:

**Paleta de Cores**:
- Verde (#10B981 ou similar): Coleções escolhidas, descontos, economia
- Cinza (#6B7280 ou similar): Coleções não escolhidas, neutro
- Vermelho (#EF4444 ou similar): Alertas, saldo insuficiente
- Azul (#3B82F6 ou similar): Call-to-action, links

**Tipografia**:
- Preço com desconto: font-bold, text-lg ou text-xl
- Preço original riscado: line-through, text-sm, text-gray-500
- Badge: text-xs ou text-sm, font-semibold, uppercase

**Espaçamento**:
- Badge: Padding interno (px-2 py-1), margem do canto (top-2 right-2)
- Tooltip: Aparece ao hover, posicionamento inteligente (não sair da tela)

**7. Feedback Visual Interativo**:

**Ao Escolher Coleção**:
- Animação de transição do badge (fade in)
- Animação do preço mudando (número animado)
- Mensagem de confirmação: "Coleção escolhida! Você agora tem 20% de desconto"
- Atualização imediata de todos os preços na tela

**Ao Remover Coleção**:
- Animação de transição do badge (fade out)
- Animação do preço voltando ao normal
- Mensagem de confirmação: "Coleção removida. Preços atualizados"

**8. Informações Contextuais Adicionais**:

**Card da Coleção Deve Mostrar**:
- Nome da coleção
- Badge de status (escolhida/disponível/avulso)
- Preço por personagem (com destaque se com desconto)
- Quantidade de personagens na coleção
- Preview de 3-4 personagens
- Botão de ação contextual:
  - Escolhida: "Ver Personagens" ou "Remover Coleção"
  - Não escolhida: "Escolher Coleção" ou "Ver Personagens"
  - Não assinante: "Ver Personagens" ou "Assinar Agora"

**9. Mensagens de Ajuda Contextuais**:

**Para Assinantes com Limite de Coleções**:
```
"Você escolheu 1 de 1 coleção permitida no seu plano Trimestral."
"Quer escolher mais coleções? Faça upgrade para o plano Semestral (3 coleções)."
```

**Para Assinantes sem Limite**:
```
"Você tem acesso ilimitado! Escolha quantas coleções quiser com desconto."
```

**10. Acessibilidade**:

**Requisitos de Acessibilidade**:
- Badges devem ter aria-label descritivo
- Tooltips devem ser acessíveis via teclado (focus)
- Contraste de cores deve seguir WCAG AA (mínimo 4.5:1)
- Ícones devem ter texto alternativo
- Animações devem respeitar prefers-reduced-motion

**Exemplo de Aria-Label**:
```html
<span aria-label="Coleção escolhida na sua assinatura com 20% de desconto">
  Sua Coleção
</span>
```

**Validações de UX**:
- Usuário deve entender em < 3 segundos por que preços diferem
- Badge "Sua Coleção" deve ser imediatamente reconhecível
- Tooltip deve aparecer em < 500ms ao hover
- Cores devem ser consistentes em toda a aplicação
- Mensagens devem ser claras e sem jargão técnico

**Exemplo Visual Completo**:

```
┌─────────────────────────────────────┐
│ [✓ Sua Coleção]          [Badge]    │
│                                      │
│        VINGADORES                    │
│                                      │
│  [img] [img] [img] [img]            │
│                                      │
│  ~~1000 coins~~ 800 coins           │
│  💰 Economize 200 coins (20% OFF)   │
│                                      │
│  24 personagens disponíveis          │
│                                      │
│  [Ver Personagens]                   │
└─────────────────────────────────────┘
     ↓ (hover no badge)
┌─────────────────────────────────────┐
│ Sua Coleção - Preço com Desconto    │
│                                      │
│ Você escolheu esta coleção na sua    │
│ assinatura e recebe 20% de desconto  │
│ em todos os personagens.             │
│                                      │
│ Preço base: 1000 coins               │
│ Seu preço: 800 coins                 │
└─────────────────────────────────────┘
```

**Prioridade**: CRÍTICA - Sem explicação visual clara, usuários ficam confusos sobre por que preços diferem, resultando em:
- Perda de confiança no sistema
- Aumento de tickets de suporte
- Redução de conversão
- Percepção de preços "errados" ou "bugs"

## 📋 Casos de Uso

### UC001: Visualizar Preço de Coleção (Usuário)

**Ator**: Usuário (assinante ou não)

**Pré-condições**:
- Usuário está navegando no catálogo de coleções

**Fluxo Principal**:
1. Usuário acessa página de coleções
2. Sistema identifica usuário (autenticado ou anônimo)
3. Sistema verifica status de assinatura
4. Sistema verifica coleções escolhidas (se assinante)
5. Sistema calcula preço contextual para cada coleção
6. Sistema exibe preços calculados com indicadores visuais:
   - Badge "Sua Coleção" (verde) para coleções escolhidas
   - Preço com desconto destacado (fonte maior, cor verde)
   - Preço original riscado com percentual de economia
   - Badge de economia "Economize X coins" ou "Y% OFF"
7. Usuário passa mouse sobre badge ou preço
8. Sistema exibe tooltip explicativo com breakdown do cálculo
9. Usuário visualiza claramente quais coleções têm desconto e por quê

**Fluxo Alternativo 6a: Usuário Não Assinante**:
6a1. Sistema exibe badge "Preço Avulso" ou sem badge
6a2. Sistema exibe call-to-action "Assine para Economizar"
6a3. Sistema exibe tooltip explicando benefícios da assinatura
6a4. Retorna ao passo 7

**Fluxo Alternativo 6b: Coleção Não Escolhida (Assinante)**:
6b1. Sistema exibe badge "Disponível" (cinza) ou sem badge
6b2. Sistema exibe preço regular sem destaque
6b3. Sistema exibe mensagem sutil "Escolha esta coleção para economizar"
6b4. Sistema exibe tooltip com link "Gerenciar Coleções"
6b5. Retorna ao passo 7

**Pós-condições**:
- Usuário vê preços corretos baseado em seu contexto
- Usuário entende visualmente por que preços diferem
- Usuário sabe como obter descontos (se aplicável)

**Regras de Negócio**: RN001, RN002, RN004, RN009

---

### UC002: Configurar Preços Contextuais (Admin)

**Ator**: Administrador

**Pré-condições**:
- Admin está autenticado
- Admin tem permissão de administrador

**Fluxo Principal**:
1. Admin acessa `/admin/planos`
2. Admin navega para aba "Preços Contextuais"
3. Admin visualiza tabela de preços por tipo e contexto
4. Admin visualiza campo "Desconto Coleções Escolhidas (%)"
5. Admin edita preço base, multiplicador ou percentual de desconto desejado
6. Sistema valida valores (preço > 0, desconto entre 0-100%)
7. Sistema salva novos valores
8. Sistema registra histórico de mudança
9. Sistema exibe confirmação com preview dos novos preços

**Fluxo Alternativo 6a: Valor Inválido**:
6a1. Sistema exibe erro apropriado:
     - "Preço deve ser maior que zero"
     - "Desconto deve estar entre 0% e 100%"
6a2. Retorna ao passo 5

**Pós-condições**:
- Preços e/ou desconto atualizados no sistema
- Histórico registrado
- Novos cálculos usam novos valores

**Regras de Negócio**: RN005

---

### UC003: Configurar Tipo de Coleção (Admin)

**Ator**: Administrador

**Pré-condições**:
- Admin está autenticado
- Coleção existe no sistema

**Fluxo Principal**:
1. Admin acessa página de edição de coleção
2. Admin visualiza campo "Tipo de Coleção"
3. Admin seleciona tipo (subscription, standard_catalog, premium_catalog)
4. Admin salva alterações
5. Sistema valida tipo selecionado
6. Sistema atualiza tipo da coleção
7. Sistema recalcula preços para usuários
8. Sistema exibe confirmação

**Pós-condições**:
- Tipo de coleção atualizado
- Preços recalculados automaticamente

**Regras de Negócio**: RN002

---

### UC004: Configurar Quantidade de Coleções por Plano (Admin)

**Ator**: Administrador

**Pré-condições**:
- Admin está autenticado
- Plano de assinatura existe

**Fluxo Principal**:
1. Admin acessa `/admin/planos`
2. Admin visualiza card do plano (Trimestral, Semestral, Anual)
3. Admin edita campo "Quantidade de Coleções"
4. Admin insere número (1, 2, 3, etc) ou -1 para ilimitado
5. Sistema valida valor (>= -1)
6. Sistema salva configuração
7. Sistema exibe confirmação

**Fluxo Alternativo 5a: Valor Inválido**:
5a1. Sistema exibe erro "Quantidade deve ser -1 (ilimitado) ou número positivo"
5a2. Retorna ao passo 4

**Pós-condições**:
- Limite de coleções atualizado
- Validação aplicada em novas assinaturas

**Regras de Negócio**: RN003

---

### UC005: Escolher Coleções na Assinatura (Usuário)

**Ator**: Usuário assinante

**Pré-condições**:
- Usuário tem assinatura ativa
- Usuário não atingiu limite de coleções do plano

**Fluxo Principal**:
1. Usuário acessa página de gerenciamento de assinatura
2. Sistema exibe coleções disponíveis
3. Sistema exibe coleções já escolhidas
4. Sistema exibe limite (ex: "1 de 2 coleções escolhidas")
5. Usuário seleciona nova coleção
6. Sistema valida limite não foi excedido
7. Sistema adiciona coleção às escolhidas
8. Sistema recalcula preços
9. Sistema exibe confirmação

**Fluxo Alternativo 6a: Limite Excedido**:
6a1. Sistema exibe erro "Você já escolheu o máximo de coleções permitidas"
6a2. Sistema sugere remover coleção existente
6a3. Retorna ao passo 5

**Pós-condições**:
- Coleção adicionada às escolhidas
- Preços recalculados
- Limite atualizado

**Regras de Negócio**: RN001, RN003

---

### UC006: Calcular Preço para Compra (Sistema)

**Ator**: Sistema

**Pré-condições**:
- Usuário está visualizando ou comprando personagem

**Fluxo Principal**:
1. Sistema recebe requisição de preço (character_id, user_id)
2. Sistema busca dados do personagem e coleção
3. Sistema busca tipo da coleção
4. Sistema verifica status de assinatura do usuário
5. Sistema verifica se coleção foi escolhida (se assinante)
6. Sistema determina contexto de preço
7. Sistema calcula preço da coleção para (tipo_coleção, contexto)
8. Sistema busca multiplicador do personagem (price_multiplier, padrão 1.0)
9. Sistema aplica multiplicador: preço_final = preço_coleção × multiplicador_personagem
10. Sistema retorna preço final calculado

**Exemplo de Cálculo**:
```
Personagem: Hulk (ID: 123)
Coleção: Vingadores (escolhida)
Multiplicador do personagem: 1.5

Passo 7: Preço da coleção = 800 coins (com desconto de 20%)
Passo 9: Preço final = 800 × 1.5 = 1200 coins
```

**Pós-condições**:
- Preço correto retornado incluindo multiplicador do personagem

**Regras de Negócio**: RN001, RN002, RN004, RN008

---

### UC007: Comprar Personagem com Coins (Usuário)

**Ator**: Usuário autenticado

**Pré-condições**:
- Usuário está autenticado
- Usuário tem saldo de coins
- Personagem existe e está disponível

**Fluxo Principal**:
1. Usuário acessa catálogo de personagens
2. Sistema exibe preço contextual de cada personagem (incluindo multiplicador)
3. Sistema exibe saldo atual do usuário
4. Usuário clica "Comprar" em um personagem
5. Sistema valida saldo (balance >= preço)
6. Sistema exibe confirmação "Comprar [Nome] por X coins?"
7. Usuário confirma
8. Sistema debita coins do saldo
9. Sistema registra transação no histórico
10. Sistema adiciona personagem ao usuário
11. Sistema exibe confirmação "Personagem adquirido! Novo saldo: Y coins"

**Exemplo de Compra**:
```
Usuário: João
Saldo: 2000 coins
Personagem: Hulk (Coleção Vingadores - escolhida)
Preço da coleção: 800 coins (com desconto)
Multiplicador do personagem: 1.5
Preço final: 800 × 1.5 = 1200 coins

Confirmação: "Comprar Hulk por 1200 coins?"
Após compra: "Hulk adquirido! Novo saldo: 800 coins"
```

**Fluxo Alternativo 5a: Saldo Insuficiente**:
5a1. Sistema exibe erro "Saldo insuficiente. Necessário: X coins, Disponível: Y coins"
5a2. Sistema exibe botão "Comprar mais coins"
5a3. Usuário clica e é redirecionado para página de compra de coins
5a4. Retorna ao passo 1

**Fluxo Alternativo 5b: Personagem Já Possui**:
5b1. Sistema exibe erro "Você já possui este personagem"
5b2. Retorna ao passo 1

**Pós-condições**:
- Coins debitados do saldo
- Transação registrada no histórico
- Personagem adicionado ao usuário
- Saldo atualizado na interface

**Regras de Negócio**: RN001, RN002, RN004, RN006, RN008

---

## 🔧 Requisitos Funcionais

### RF001: Gerenciar Tipos de Coleção
**Prioridade**: Alta  
**Descrição**: Sistema deve permitir categorizar coleções em tipos (subscription, standard_catalog, premium_catalog)  
**Critérios de Aceitação**:
- Admin pode definir tipo ao criar coleção
- Admin pode alterar tipo de coleção existente
- Tipo é obrigatório para todas as coleções
- Tipos válidos: subscription, standard_catalog, premium_catalog

### RF002: Configurar Preços Base e Desconto
**Prioridade**: Alta  
**Descrição**: Sistema deve permitir configurar preço base por tipo de coleção e percentual de desconto para coleções escolhidas  
**Critérios de Aceitação**:
- Admin vê tabela de preços base (um por tipo)
- Admin pode editar qualquer preço base
- Admin pode configurar percentual de desconto para coleções escolhidas (ex: 15%, 20%, 25%)
- Preços base devem ser > 0
- Percentual de desconto deve estar entre 0% e 100%
- Alterações são salvas imediatamente
- Histórico de mudanças é registrado
- Mudança de preço base ou desconto recalcula todos os contextos automaticamente
- Interface mostra preview do preço final após aplicar desconto

### RF003: Configurar Multiplicadores de Contexto
**Prioridade**: Alta  
**Descrição**: Sistema deve permitir configurar multiplicadores por contexto de usuário  
**Critérios de Aceitação**:
- Admin vê tabela de multiplicadores (um por contexto)
- Admin pode editar qualquer multiplicador
- Multiplicadores devem ser > 0
- Alterações são salvas imediatamente
- Histórico de mudanças é registrado
- Mudança de multiplicador recalcula todos os preços automaticamente

### RF004: Calcular Preço Contextual
**Prioridade**: Alta  
**Descrição**: Sistema deve calcular automaticamente o preço correto usando desconto percentual para escolhidas, multiplicador para não escolhidas, e multiplicador individual do personagem, com cache para otimizar performance  
**Critérios de Aceitação**:
- Função `get_collection_price(collection_id, user_id)` retorna preço da coleção
- Função `get_character_price(character_id, user_id)` retorna preço final do personagem
- Para coleções escolhidas: usa fórmula `base_price - (base_price × discount_percentage / 100)`
- Para coleções não escolhidas: usa fórmula `base_price × context_multiplier`
- Para preço do personagem: usa fórmula `get_collection_price() × character.price_multiplier`
- Se character.price_multiplier for NULL ou não definido, usa 1.0 como padrão
- Cálculo considera tipo de coleção (PRIORIDADE MÁXIMA - RN011)
- Cálculo considera status de assinatura (PRIORIDADE MÉDIA - RN011)
- Cálculo considera se coleção foi escolhida (PRIORIDADE BAIXA - RN011)
- Cálculo aplica multiplicador do personagem como última etapa
- Cálculo segue ordem de prioridade definida em RN011
- Cache: Resultados cacheados por 5 minutos (RN010)
- Cache: Invalidado quando preços base, multiplicadores ou descontos mudam (RN010)
- Cache: Invalidado quando usuário escolhe/remove coleções (RN010)
- Cache: React Query com staleTime de 5 minutos (RN010)
- Performance: < 100ms por cálculo sem cache, < 10ms com cache
- Performance: Taxa de hit do cache > 80% (RN010)
- Resultado sempre consistente (não há risco de inconsistência)

### RF004: Configurar Limite de Coleções por Plano
**Prioridade**: Alta  
**Descrição**: Sistema deve permitir configurar quantas coleções cada plano pode escolher  
**Critérios de Aceitação**:
- Admin pode definir número de coleções por plano
- Valor -1 significa ilimitado
- Valor deve ser >= -1
- Validação aplicada ao escolher coleções

### RF005: Validar Limite de Coleções
**Prioridade**: Alta  
**Descrição**: Sistema deve validar que usuário não excede limite de coleções do plano  
**Critérios de Aceitação**:
- Ao escolher coleção, sistema verifica limite
- Erro claro se limite excedido
- Contador visual mostra "X de Y coleções"
- Botão desabilitado se limite atingido

### RF006: Exibir Preços Contextuais no Frontend
**Prioridade**: Alta  
**Descrição**: Interface deve exibir preços corretos baseado em contexto do usuário e multiplicador do personagem, com indicadores visuais claros que explicam as diferenças de preço  
**Critérios de Aceitação**:
- Catálogo mostra preços contextuais finais (incluindo multiplicador)
- Badge "Sua Coleção" (verde/primary) visível em coleções escolhidas
- Badge "Disponível" (cinza/neutro) ou sem badge em coleções não escolhidas
- Badge "Preço Avulso" ou sem badge para não assinantes
- Preço com desconto destacado visualmente (fonte maior, cor verde)
- Preço original mostrado riscado com percentual de desconto (ex: ~~1000~~ 800 coins -20%)
- Badge de economia "Economize X coins" ou "Y% OFF" visível
- Tooltip explicativo aparece ao hover sobre badge ou preço
- Tooltip mostra breakdown do cálculo: "Preço base: 1000 coins → Seu preço: 800 coins"
- Tooltip para não escolhidas: "Escolha esta coleção para receber 20% de desconto"
- Tooltip para não assinantes: "Assine para ter acesso a preços com desconto"
- Color coding consistente: verde para escolhidas, cinza para outras
- Hierarquia visual: coleções escolhidas mais proeminentes (border, shadow, animação)
- Badge visual indica multiplicador do personagem quando diferente de 1.0 (ex: "Premium", "Raro", "Grande")
- Tooltip de personagem mostra breakdown: "Preço da coleção: 800 coins × Multiplicador: 1.5 = 1200 coins"
- Preços atualizam ao escolher/remover coleção com animação
- Loading state durante cálculo
- Indicador visual para personagens com multiplicador (ícone de estrela, coroa, etc)
- Call-to-action claro para não assinantes: "Assinar para Economizar"
- Link "Gerenciar Coleções" em tooltips de coleções não escolhidas
- Mensagem de limite de coleções: "Você escolheu X de Y coleções"
- Acessibilidade: aria-labels, contraste WCAG AA, navegação por teclado

### RF007: Interface Admin de Preços Contextuais
**Prioridade**: Alta  
**Descrição**: Página `/admin/planos` deve ter seção para gerenciar preços base, multiplicadores e desconto de coleções escolhidas  
**Critérios de Aceitação**:
- Nova aba "Preços Contextuais"
- Sub-aba "Preços Base" com tabela editável
- Sub-aba "Multiplicadores" com tabela editável
- Campo configurável "Desconto Coleções Escolhidas (%)" com validação 0-100
- Sub-aba "Preview" mostrando preços finais calculados com exemplos
- Confirmação visual ao salvar
- Mensagem explicando que mudanças afetam todos os contextos/tipos
- Preview mostra exemplo: "Base: 1000 coins, Desconto: 20% → Preço final: 800 coins"

### RF008: Histórico de Mudanças de Preço
**Prioridade**: Média  
**Descrição**: Sistema deve registrar histórico de todas as mudanças de preço base, multiplicadores e desconto de coleções escolhidas  
**Critérios de Aceitação**:
- Tabela `pricing_history` registra mudanças
- Campos: change_type (base_price, multiplier, chosen_discount), collection_type, user_context, old_value, new_value, data, admin_id
- Admin pode visualizar histórico
- Histórico não pode ser editado
- Filtro por tipo de mudança (base_price, multiplier, chosen_discount)
- Exibição clara de mudanças de desconto percentual

### RF009: Migração de Dados Existentes
**Prioridade**: Alta  
**Descrição**: Sistema deve migrar coleções e personagens existentes para novo modelo  
**Critérios de Aceitação**:
- Migration adiciona campo `collection_type` em collections
- Migration adiciona campo `price_multiplier` (DECIMAL, nullable, default 1.0) em characters
- Coleções existentes recebem tipo padrão `subscription`
- Personagens existentes recebem multiplicador padrão 1.0 (ou NULL que será tratado como 1.0)
- Preços atuais são preservados
- Nenhuma coleção fica sem tipo
- Nenhum personagem tem multiplicador inválido (< 0)

### RF010: Remover Código Legado
**Prioridade**: Média  
**Descrição**: Remover código obsoleto relacionado a sistema de preços antigo  
**Critérios de Aceitação**:
- Identificar arquivos legados
- Remover imports não utilizados
- Remover componentes obsoletos
- Atualizar documentação

### RF011: Integrar com Sistema de Coins
**Prioridade**: Alta  
**Descrição**: Sistema deve integrar cálculo de preços com débito de coins  
**Critérios de Aceitação**:
- Função `purchase_character()` integra ambos os sistemas
- Validação de saldo antes da compra
- Débito atômico (tudo ou nada)
- Registro de transação no histórico
- Exibição de saldo na interface
- Mensagem clara em caso de saldo insuficiente
- Link para comprar mais coins quando necessário

### RF012: Exibir Saldo de Coins
**Prioridade**: Alta  
**Descrição**: Interface deve exibir saldo de coins do usuário  
**Critérios de Aceitação**:
- Saldo visível no header/navbar
- Saldo atualizado em tempo real após compras
- Indicador visual quando saldo insuficiente
- Link rápido para comprar mais coins

### RF013: Histórico de Transações
**Prioridade**: Média  
**Descrição**: Usuário deve poder ver histórico de transações de coins  
**Critérios de Aceitação**:
- Página de histórico de transações
- Filtro por tipo (compra, débito, reembolso)
- Exibição de data, valor, descrição
- Paginação para históricos longos

### RF014: Configurar Multiplicador de Personagem
**Prioridade**: Alta  
**Descrição**: Admin deve poder configurar multiplicador de preço individual para cada personagem  
**Critérios de Aceitação**:
- Campo `price_multiplier` na interface de edição de personagem
- Campo é opcional (padrão: 1.0)
- Validação: multiplicador deve ser > 0
- Presets sugeridos visíveis: Normal (1.0), Complexo (1.2), Premium (1.5), Raro (2.0)
- Admin pode inserir valor customizado
- Preview do preço final ao configurar multiplicador
- Exemplo visual: "Preço base da coleção: 800 coins × Multiplicador: 1.5 = Preço final: 1200 coins"
- Tooltip explicativo: "Multiplicador ajusta o preço baseado em características do personagem (tamanho, complexidade, raridade)"
- Alteração salva imediatamente
- Histórico de mudanças registrado
- Interface mostra badge visual em personagens com multiplicador diferente de 1.0

### RF015: Sistema de Feedback Visual para Contexto de Preços
**Prioridade**: Alta  
**Descrição**: Sistema deve fornecer feedback visual completo que explica contexto de preços e diferenças entre coleções  
**Critérios de Aceitação**:

**Sistema de Badges**:
- Badge "Sua Coleção" ou "Coleção Escolhida" (verde/primary) em coleções escolhidas
- Badge "Disponível" (cinza) opcional em coleções não escolhidas
- Badge "Preço Avulso" opcional para não assinantes
- Badge posicionado no canto superior direito do card
- Badge com ícone de check (✓) para coleções escolhidas
- Badge responsivo e acessível (aria-label descritivo)

**Sistema de Tooltips**:
- Tooltip aparece ao hover em < 500ms
- Tooltip para coleções escolhidas: "Você escolheu esta coleção na sua assinatura e recebe X% de desconto"
- Tooltip para não escolhidas: "Escolha esta coleção na sua assinatura para receber desconto" + link "Gerenciar Coleções"
- Tooltip para não assinantes: "Assine para ter acesso a preços com desconto" + link "Ver Planos"
- Tooltip mostra breakdown de cálculo com valores específicos
- Tooltip acessível via teclado (focus)
- Tooltip com posicionamento inteligente (não sair da tela)

**Exibição de Preços e Economia**:
- Preço com desconto: Destaque visual (font-bold, text-lg, cor verde)
- Preço original: Riscado (line-through) com percentual (ex: ~~1000 coins~~ 800 coins -20%)
- Badge de economia: "Economize X coins" ou "Y% OFF" visível
- Comparação lado a lado opcional: "Com assinatura" vs "Sem assinatura"
- Gráfico visual de economia (barra de progresso) opcional

**Hierarquia Visual**:
- Coleções escolhidas: Border colorido (border-green-500, border-2), shadow-lg, animação hover (scale-105)
- Coleções não escolhidas: Border neutra (border-gray-300), shadow-md, sem animação especial
- Coleções escolhidas podem aparecer primeiro na lista (ordenação)

**Color Coding Consistente**:
- Verde (#10B981): Coleções escolhidas, descontos, economia
- Cinza (#6B7280): Coleções não escolhidas, neutro
- Vermelho (#EF4444): Alertas, saldo insuficiente
- Azul (#3B82F6): Call-to-action, links
- Contraste mínimo WCAG AA (4.5:1)

**Feedback Interativo**:
- Animação ao escolher coleção: Badge fade in, preço animado, mensagem de confirmação
- Animação ao remover coleção: Badge fade out, preço volta ao normal, mensagem de confirmação
- Atualização imediata de todos os preços na tela
- Loading state durante recálculo

**Informações Contextuais**:
- Card mostra: nome, badge, preço, quantidade de personagens, preview de personagens
- Botão contextual: "Ver Personagens", "Escolher Coleção", "Remover Coleção", "Assinar Agora"
- Mensagem de limite: "Você escolheu X de Y coleções permitidas"
- Sugestão de upgrade: "Quer mais coleções? Faça upgrade para plano Semestral"

**Call-to-Action**:
- Não assinantes: Botão "Assinar para Economizar" visível e destacado
- Assinantes: Link "Gerenciar Coleções" em tooltips
- Link "Ver Planos" para comparação de planos

**Acessibilidade**:
- Todos os badges com aria-label descritivo
- Tooltips navegáveis por teclado
- Animações respeitam prefers-reduced-motion
- Ícones com texto alternativo
- Foco visível em elementos interativos

**Validação de UX**:
- Usuário entende diferença de preços em < 3 segundos
- Badge "Sua Coleção" imediatamente reconhecível
- Mensagens claras sem jargão técnico
- Design consistente em toda aplicação

## 🎨 Mockups e Wireframes

### Layout de Card de Coleção Escolhida

```
┌─────────────────────────────────────────────────────┐
│ [✓ Sua Coleção]                          [Badge]    │
│                                                      │
│                  VINGADORES                          │
│                                                      │
│     [img]    [img]    [img]    [img]                │
│  Homem-Aranha  Hulk  Cap.América  Thor              │
│                                                      │
│  ~~1000 coins~~  800 coins/personagem               │
│  💰 Economize 200 coins por personagem (20% OFF)    │
│                                                      │
│  24 personagens disponíveis                          │
│                                                      │
│  [Ver Personagens]  [Remover Coleção]               │
└─────────────────────────────────────────────────────┘

Características Visuais:
- Border: Verde (border-green-500, border-2)
- Shadow: Pronunciada (shadow-lg)
- Badge: Verde com ícone de check
- Preço: Destaque em verde, fonte maior
- Hover: Animação scale-105
```

**Tooltip ao Hover no Badge**:
```
┌─────────────────────────────────────────────────────┐
│ Sua Coleção - Preço com Desconto                    │
│                                                      │
│ Você escolheu esta coleção na sua assinatura         │
│ e recebe 20% de desconto em todos os personagens.   │
│                                                      │
│ Cálculo do preço:                                    │
│ • Preço base: 1000 coins                            │
│ • Desconto: 20% (200 coins)                         │
│ • Seu preço: 800 coins                              │
│                                                      │
│ Personagens com multiplicador terão preço ajustado. │
└─────────────────────────────────────────────────────┘
```

---

### Layout de Card de Coleção Não Escolhida (Assinante)

```
┌─────────────────────────────────────────────────────┐
│ [Disponível]                             [Badge]    │
│                                                      │
│                     X-MEN                            │
│                                                      │
│     [img]    [img]    [img]    [img]                │
│  Wolverine  Ciclope   Fênix   Tempestade           │
│                                                      │
│  1200 coins/personagem                               │
│  💡 Escolha esta coleção para economizar 20%        │
│                                                      │
│  18 personagens disponíveis                          │
│                                                      │
│  [Ver Personagens]  [Escolher Coleção]              │
└─────────────────────────────────────────────────────┘

Características Visuais:
- Border: Cinza neutra (border-gray-300)
- Shadow: Padrão (shadow-md)
- Badge: Cinza (opcional)
- Preço: Fonte normal, cor padrão
- Hover: Sem animação especial
```

**Tooltip ao Hover no Badge ou Preço**:
```
┌─────────────────────────────────────────────────────┐
│ Coleção Disponível                                   │
│                                                      │
│ Escolha esta coleção na sua assinatura para          │
│ receber 20% de desconto em todos os personagens.    │
│                                                      │
│ Preço atual: 1200 coins                             │
│ Com desconto: 800 coins                             │
│ Economia: 400 coins por personagem                  │
│                                                      │
│ [Gerenciar Coleções →]                              │
└─────────────────────────────────────────────────────┘
```

---

### Layout de Card de Coleção (Não Assinante)

```
┌─────────────────────────────────────────────────────┐
│ [Preço Avulso]                           [Badge]    │
│                                                      │
│                LIGA DA JUSTIÇA                       │
│                                                      │
│     [img]    [img]    [img]    [img]                │
│   Batman   Superman  Mulher-M.  Flash               │
│                                                      │
│  1200 coins/personagem                               │
│  ⭐ Assine e economize até 20%                      │
│                                                      │
│  20 personagens disponíveis                          │
│                                                      │
│  [Ver Personagens]  [Assinar Agora]                 │
└─────────────────────────────────────────────────────┘

Características Visuais:
- Border: Cinza (border-gray-400)
- Shadow: Padrão (shadow-md)
- Badge: Cinza ou sem badge
- Call-to-action: Botão "Assinar Agora" destacado em azul
- Mensagem promocional visível
```

**Tooltip ao Hover no Badge ou Preço**:
```
┌─────────────────────────────────────────────────────┐
│ Preço Avulso                                         │
│                                                      │
│ Assine um plano para ter acesso a preços com         │
│ desconto de até 20% em coleções escolhidas.         │
│                                                      │
│ Preço atual: 1200 coins                             │
│ Com assinatura: a partir de 800 coins              │
│ Economia: até 400 coins por personagem              │
│                                                      │
│ [Ver Planos →]                                       │
└─────────────────────────────────────────────────────┘
```

---

### Layout de Card de Personagem com Multiplicador

```
┌───────────────────────────────────┐
│ [⭐ Premium]           [Badge]    │
│                                    │
│         [Imagem do Hulk]          │
│                                    │
│            HULK                    │
│         Vingadores                 │
│                                    │
│  Preço: 1200 coins                │
│  (800 × 1.5 multiplicador)        │
│                                    │
│  [Comprar]                         │
└───────────────────────────────────┘

Características Visuais:
- Badge de multiplicador: Dourado/Amarelo para premium
- Ícone de estrela, coroa ou similar
- Tooltip explica o multiplicador
```

**Tooltip ao Hover no Badge ou Preço**:
```
┌─────────────────────────────────────────────────────┐
│ Personagem Premium                                   │
│                                                      │
│ Este personagem tem um multiplicador de preço       │
│ devido ao seu tamanho e complexidade.               │
│                                                      │
│ Cálculo do preço:                                    │
│ • Preço da coleção: 800 coins                       │
│ • Multiplicador: 1.5 (Grande/Complexo)              │
│ • Preço final: 1200 coins                           │
│                                                      │
│ Coleção escolhida: Sim (com 20% desconto)           │
└─────────────────────────────────────────────────────┘
```

---

### View de Comparação de Preços (Opcional)

```
┌─────────────────────────────────────────────────────┐
│              COMPARAÇÃO DE PREÇOS                    │
│                                                      │
│  Coleção: Vingadores                                │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ Sem Assinatura   │  │ Com Assinatura   │        │
│  │                  │  │ (Escolhida)      │        │
│  │  1200 coins      │  │  800 coins ✓     │        │
│  │  por personagem  │  │  por personagem  │        │
│  └──────────────────┘  └──────────────────┘        │
│                                                      │
│  💰 Economia: 400 coins por personagem (33%)        │
│                                                      │
│  Para 10 personagens:                               │
│  • Sem assinatura: 12.000 coins                     │
│  • Com assinatura: 8.000 coins                      │
│  • Você economiza: 4.000 coins                      │
│                                                      │
│  [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]  │
│  Economia de 33%                                     │
│                                                      │
│  [Assinar Agora]                                     │
└─────────────────────────────────────────────────────┘
```

---

### Mensagem de Limite de Coleções

```
┌─────────────────────────────────────────────────────┐
│ 📊 Suas Coleções                                     │
│                                                      │
│ Você escolheu 1 de 1 coleção permitida              │
│ no seu plano Trimestral.                            │
│                                                      │
│ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]  │
│ 1/1 coleções                                         │
│                                                      │
│ 💡 Quer escolher mais coleções?                     │
│    Faça upgrade para o plano Semestral (3 coleções) │
│    ou Anual (ilimitado).                            │
│                                                      │
│ [Ver Planos]                                         │
└─────────────────────────────────────────────────────┘
```

---

### Animação de Escolha de Coleção

**Estado Inicial (Não Escolhida)**:
```
┌─────────────────────────────────────┐
│ [Disponível]                        │
│          X-MEN                      │
│  1200 coins/personagem              │
│  [Escolher Coleção]                 │
└─────────────────────────────────────┘
```

**Durante Transição (Loading)**:
```
┌─────────────────────────────────────┐
│ [⏳ Atualizando...]                 │
│          X-MEN                      │
│  [Spinner animado]                  │
│  Recalculando preços...             │
└─────────────────────────────────────┘
```

**Estado Final (Escolhida)**:
```
┌─────────────────────────────────────┐
│ [✓ Sua Coleção] ← Fade in animado  │
│          X-MEN                      │
│  ~~1200~~ 800 coins ← Número animado│
│  💰 Economize 400 coins (33% OFF)   │
│  [Remover Coleção]                  │
└─────────────────────────────────────┘

✅ Coleção escolhida! Você agora tem 20% de desconto
```

---

### Paleta de Cores e Estilos

**Cores Principais**:
```css
/* Coleções Escolhidas */
--chosen-badge: #10B981 (green-500)
--chosen-border: #10B981 (green-500)
--chosen-text: #059669 (green-600)
--chosen-bg: #D1FAE5 (green-100)

/* Coleções Não Escolhidas */
--available-badge: #6B7280 (gray-500)
--available-border: #D1D5DB (gray-300)
--available-text: #4B5563 (gray-600)

/* Não Assinantes */
--non-subscriber-badge: #6B7280 (gray-500)
--cta-button: #3B82F6 (blue-500)
--cta-hover: #2563EB (blue-600)

/* Alertas e Economia */
--savings-badge: #10B981 (green-500)
--alert: #EF4444 (red-500)
--warning: #F59E0B (amber-500)

/* Multiplicadores */
--premium-badge: #F59E0B (amber-500)
--rare-badge: #8B5CF6 (purple-500)
--legendary-badge: #EC4899 (pink-500)
```

**Tipografia**:
```css
/* Badges */
.badge {
  font-size: 0.75rem; /* text-xs */
  font-weight: 600; /* font-semibold */
  text-transform: uppercase;
  padding: 0.25rem 0.5rem; /* px-2 py-1 */
  border-radius: 0.25rem; /* rounded */
}

/* Preços */
.price-discounted {
  font-size: 1.25rem; /* text-xl */
  font-weight: 700; /* font-bold */
  color: #059669; /* green-600 */
}

.price-original {
  font-size: 0.875rem; /* text-sm */
  text-decoration: line-through;
  color: #6B7280; /* gray-500 */
}

/* Economia */
.savings-badge {
  font-size: 0.875rem; /* text-sm */
  font-weight: 600; /* font-semibold */
  color: #059669; /* green-600 */
}
```

**Animações**:
```css
/* Hover em coleções escolhidas */
.collection-card-chosen:hover {
  transform: scale(1.05);
  transition: transform 0.2s ease-in-out;
}

/* Fade in de badge */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.badge-appear {
  animation: fadeIn 0.3s ease-in;
}

/* Animação de preço */
@keyframes priceChange {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); color: #10B981; }
  100% { transform: scale(1); }
}

.price-animate {
  animation: priceChange 0.5s ease-in-out;
}
```

## 🚫 Requisitos Não Funcionais

### RNF001: Performance
**Descrição**: Cálculo de preço deve ser rápido e otimizado com cache  
**Métrica**: 
- < 100ms por cálculo de preço sem cache
- < 10ms por cálculo de preço com cache hit
- Taxa de hit do cache > 80%
- Queries de preço por segundo suportadas: > 1000
**Justificativa**: Usuário não deve perceber delay ao navegar, cache reduz carga no banco

### RNF002: Escalabilidade
**Descrição**: Sistema deve suportar crescimento  
**Métrica**: Suportar 10.000 usuários simultâneos calculando preços  
**Justificativa**: Preparar para crescimento do negócio

### RNF003: Manutenibilidade
**Descrição**: Código deve ser limpo e profissional  
**Métrica**: 
- Funções < 50 linhas
- Componentes < 300 linhas
- Cobertura de testes > 80%
**Justificativa**: Facilitar manutenção futura

### RNF004: Usabilidade (Admin)
**Descrição**: Interface admin deve ser intuitiva  
**Métrica**: Admin consegue configurar preços em < 2 minutos  
**Justificativa**: Reduzir tempo de configuração

### RNF005: Consistência de Dados
**Descrição**: Preços devem ser consistentes em todo o sistema  
**Métrica**: 100% de consistência entre cálculos  
**Justificativa**: Evitar confusão e problemas financeiros

### RNF006: Auditoria
**Descrição**: Todas as mudanças de preço devem ser auditáveis  
**Métrica**: 100% das mudanças registradas com timestamp e autor  
**Justificativa**: Compliance e rastreabilidade

## 📊 Critérios de Aceitação Globais

### Funcionalidade
- [ ] Todos os casos de uso implementados e testados
- [ ] Todas as regras de negócio validadas
- [ ] Cálculo de preço retorna valores corretos em todos os contextos
- [ ] Interface admin permite configuração completa

### Qualidade de Código
- [ ] Código segue padrões do projeto
- [ ] Sem código duplicado
- [ ] Sem código legado ou obsoleto
- [ ] Comentários em funções complexas
- [ ] TypeScript sem erros

### Testes
- [ ] Testes unitários para função de cálculo
- [ ] Testes de integração para fluxos completos
- [ ] Testes de validação de regras de negócio
- [ ] Cobertura > 80%

### Documentação
- [ ] README atualizado
- [ ] Comentários em código complexo
- [ ] Guia de uso para admin
- [ ] Changelog atualizado

### Performance
- [ ] Cálculo de preço < 100ms
- [ ] Página admin carrega < 2s
- [ ] Sem queries N+1
- [ ] Índices de banco otimizados

### Segurança
- [ ] RLS policies corretas
- [ ] Validação de permissões admin
- [ ] Sanitização de inputs
- [ ] Auditoria de mudanças

## 🔄 Dependências

### Dependências Técnicas
- Supabase (banco de dados)
- React Query (cache e queries)
- TypeScript (tipagem)
- Tailwind CSS (estilização)

### Dependências de Negócio
- Sistema de assinaturas existente
- Sistema de coleções existente
- Sistema de autenticação existente

## 📅 Estimativas

### Complexidade: Alta
**Justificativa**: Envolve mudanças em banco de dados, lógica de negócio complexa, múltiplas interfaces

### Tempo Estimado: 3-5 dias
- Dia 1: Migrations e estrutura de banco
- Dia 2: Função de cálculo e lógica backend
- Dia 3: Interface admin
- Dia 4: Interface usuário e integrações
- Dia 5: Testes e refinamentos

### Riscos
1. **Migração de dados**: Coleções existentes podem ter dados inconsistentes
2. **Performance**: Cálculo contextual pode ser lento se não otimizado
3. **Complexidade**: Muitos contextos podem confundir admin

### Mitigações
1. Script de validação antes de migration
2. Índices de banco e cache de preços
3. Interface intuitiva com tooltips e exemplos

## 📝 Notas Adicionais

### Considerações de Design
- Usar cores diferentes para indicar contextos (verde = escolhida, amarelo = não escolhida)
- Tooltip explicativo em cada contexto
- Preview de preço antes de salvar
- Confirmação para mudanças significativas

### Melhorias Futuras (Fora do Escopo)
- Preços dinâmicos baseado em demanda
- Descontos por volume (comprar múltiplos personagens)
- Preços promocionais temporários
- A/B testing de preços
- Analytics de conversão por preço
- Multiplicadores automáticos baseados em popularidade do personagem
- Multiplicadores temporários para eventos especiais
- Sistema de raridade automático (comum, raro, épico, lendário)
- Preços diferenciados por região geográfica
- Animações mais elaboradas para transições de preço
- Modo de comparação lado a lado de múltiplas coleções
- Calculadora de economia total baseada em histórico de compras
- Notificações push quando coleção escolhida tem novos personagens
- Preview 3D de personagens ao hover
- Sistema de wishlist com alertas de preço

### Referências
- [ENTENDIMENTO_SISTEMA_PRECOS_REAL.md](../../../ENTENDIMENTO_SISTEMA_PRECOS_REAL.md)
- [ANALISE_PROPOSTA_COLLECTION_TIERS.md](../../../ANALISE_PROPOSTA_COLLECTION_TIERS.md)
- [CENTRALIZACAO_PRECOS_UNICA.md](../../../CENTRALIZACAO_PRECOS_UNICA.md)
