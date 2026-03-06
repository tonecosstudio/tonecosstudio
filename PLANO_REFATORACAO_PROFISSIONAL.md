# Plano de Refatoração Profissional: Sistema Híbrido Coins

## 🎯 Objetivo

Implementar sistema híbrido (Standalone R$ + Assinantes Coins) de forma profissional:
- ✅ Remover gambiarras e paliativos
- ✅ Eliminar código duplicado
- ✅ Código limpo e manutenível
- ✅ Sem @ts-nocheck ou TODOs
- ✅ Tipagem completa

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. API Antiga (Prisma) vs Nova (Supabase)

**Problema:** Dois sistemas paralelos fazendo a mesma coisa

**Arquivos afetados:**
- `src/services/subscription-credit-api.ts` (API antiga Prisma - 608 linhas)
- `src/hooks/useUserCoins.ts` (API nova Supabase)
- `src/hooks/usePurchaseCharacter.ts` (API nova Supabase)

**Solução:** Remover API antiga, usar apenas hooks do Supabase

---

### 2. Catálogo de Personagens com Gambiarras

**Arquivo:** `src/pages/CharacterCatalog.tsx`

**Gambiarras identificadas:**
```typescript
// @ts-nocheck  ← GAMBIARRA #1: Desabilita type checking
import { subscriptionCreditAPI } from '@/services/subscription-credit-api';  ← GAMBIARRA #2: API antiga
// TODO: Implement cash purchase flow  ← GAMBIARRA #3: TODO em produção
```

**Solução:** Reescrever usando hooks de coins

---

### 3. Componentes Duplicados

**Problema:** Componentes fazem a mesma coisa de formas diferentes

**Duplicados:**
- `CreditBalanceBar` (mostra créditos antigos)
- `useUserCoins` (mostra coins novos)
→ Ambos mostram "saldo", mas de sistemas diferentes

**Solução:** Unificar em um único componente `CoinsBalanceBar`

---

### 4. Tipos Duplicados

**Problema:** Tipos definidos em múltiplos lugares

**Arquivos:**
- `src/types/subscription-credit-system.ts` (tipos antigos)
- `src/types/contextual-pricing.ts` (tipos novos)
- Tipos inline em vários arquivos

**Solução:** Consolidar em `src/types/coins.ts`

---

## 📋 PLANO DE EXECUÇÃO

### FASE 1: Preparação (Sem Breaking Changes)

#### 1.1. Criar Tipos Unificados
- [ ] `src/types/coins.ts` - Tipos centralizados
- [ ] `src/types/subscription.ts` - Tipos de assinatura
- [ ] Deprecar tipos antigos (manter por compatibilidade)

#### 1.2. Criar Hooks Unificados
- [ ] `src/hooks/coins/useCoinsBalance.ts` - Saldo unificado
- [ ] `src/hooks/coins/useCoinsTransactions.ts` - Histórico
- [ ] `src/hooks/coins/usePurchaseWithCoins.ts` - Compra genérica
- [ ] `src/hooks/subscription/useSubscriptionCoins.ts` - Coins de assinatura

#### 1.3. Criar Serviços Limpos
- [ ] `src/services/coins/coins-service.ts` - Lógica de coins
- [ ] `src/services/subscription/subscription-service.ts` - Lógica de assinatura
- [ ] Remover lógica de componentes

---

### FASE 2: Migração do Catálogo (Breaking Changes Controlados)

#### 2.1. Novo Catálogo de Personagens
- [ ] `src/pages/catalog/CharacterCatalog.tsx` (novo, limpo)
- [ ] `src/components/catalog/CharacterCard.tsx`
- [ ] `src/components/catalog/CharacterFilters.tsx`
- [ ] `src/components/catalog/CoinsBalanceBar.tsx`

#### 2.2. Remover Catálogo Antigo
- [ ] Deprecar `src/pages/CharacterCatalog.tsx`
- [ ] Redirecionar rotas
- [ ] Remover após testes

---

### FASE 3: Integração de Assinaturas com Coins

#### 3.1. Adicionar Coins ao Pagar Assinatura
- [ ] `src/services/subscription/payment-processor.ts`
- [ ] Hook: `useProcessSubscriptionPayment()`
- [ ] Trigger automático ao confirmar pagamento

#### 3.2. Página de Escolha de Coleções
- [ ] `src/pages/subscription/CollectionChoice.tsx`
- [ ] Usa coins para "comprar" coleção escolhida
- [ ] Integra com deliveries

#### 3.3. Dashboard de Coins
- [ ] `src/pages/subscription/MyCoins.tsx`
- [ ] Mostra saldo, histórico, próxima recarga

---

### FASE 4: Limpeza Final

#### 4.1. Remover Código Antigo
- [ ] Deletar `src/services/subscription-credit-api.ts`
- [ ] Deletar `src/services/subscription-credit-admin-api.ts`
- [ ] Deletar tipos antigos
- [ ] Deletar componentes não usados

#### 4.2. Atualizar Dependências
- [ ] Remover dependências não usadas
- [ ] Atualizar imports
- [ ] Verificar bundle size

#### 4.3. Documentação
- [ ] README atualizado
- [ ] Comentários em código
- [ ] Guia de migração

---

## 🏗️ ESTRUTURA FINAL (Limpa)

```
src/
├── types/
│   ├── coins.ts                    # Tipos de coins (unificado)
│   ├── subscription.ts             # Tipos de assinatura
│   └── standalone.ts               # Tipos de compra avulsa
│
├── hooks/
│   ├── coins/
│   │   ├── useCoinsBalance.ts      # Saldo de coins
│   │   ├── useCoinsTransactions.ts # Histórico
│   │   ├── usePurchaseWithCoins.ts # Compra genérica
│   │   └── useCoinsPackages.ts     # Pacotes (já existe)
│   │
│   ├── subscription/
│   │   ├── useSubscription.ts      # Dados da assinatura
│   │   ├── useSubscriptionCoins.ts # Coins da assinatura
│   │   └── useProcessPayment.ts    # Processar pagamento
│   │
│   └── pricing/
│       ├── useCollectionPrice.ts   # Preço de coleção
│       ├── useCharacterPrice.ts    # Preço de personagem (já existe)
│       └── useContextualPrice.ts   # Preço contextual
│
├── services/
│   ├── coins/
│   │   └── coins-service.ts        # Lógica de coins
│   │
│   ├── subscription/
│   │   ├── subscription-service.ts # Lógica de assinatura
│   │   └── payment-processor.ts    # Processar pagamentos
│   │
│   └── standalone/
│       └── standalone-service.ts   # Compras avulsas (já existe)
│
├── pages/
│   ├── catalog/
│   │   └── CharacterCatalog.tsx    # Catálogo (novo, limpo)
│   │
│   ├── subscription/
│   │   ├── MyCoins.tsx             # Dashboard de coins
│   │   ├── CollectionChoice.tsx    # Escolher coleções
│   │   └── SubscriptionPanel.tsx   # Painel de assinatura
│   │
│   └── standalone/
│       ├── StandalonePurchase.tsx  # Compra avulsa (mantém)
│       └── PayBalance.tsx          # Pagar saldo (mantém)
│
└── components/
    ├── catalog/
    │   ├── CharacterCard.tsx       # Card de personagem
    │   ├── CharacterFilters.tsx    # Filtros
    │   └── CoinsBalanceBar.tsx     # Barra de saldo
    │
    ├── subscription/
    │   ├── CoinsHistory.tsx        # Histórico de coins
    │   ├── CoinsRecharge.tsx       # Próxima recarga
    │   └── PlanBenefits.tsx        # Benefícios do plano
    │
    └── shared/
        ├── PriceDisplay.tsx        # Exibe preço (R$ ou coins)
        └── LoadingState.tsx        # Estados de loading
```

---

## 🎯 PRINCÍPIOS DE CÓDIGO LIMPO

### 1. Single Responsibility
```typescript
// ❌ RUIM: Componente faz tudo
function CharacterCatalog() {
  // Busca dados
  // Filtra dados
  // Renderiza UI
  // Lógica de compra
  // Validações
}

// ✅ BOM: Cada parte tem sua responsabilidade
function CharacterCatalog() {
  const characters = useCharacters();
  const filters = useCharacterFilters();
  const purchase = usePurchaseCharacter();
  
  return <CharacterGrid characters={characters} onPurchase={purchase} />;
}
```

### 2. DRY (Don't Repeat Yourself)
```typescript
// ❌ RUIM: Código duplicado
const price1 = await supabase.rpc('get_character_price', { ... });
const price2 = await supabase.rpc('get_character_price', { ... });

// ✅ BOM: Hook reutilizável
const { data: price } = useCharacterPrice(characterId, userId);
```

### 3. Tipagem Forte
```typescript
// ❌ RUIM: any ou @ts-nocheck
// @ts-nocheck
function purchase(data: any) { ... }

// ✅ BOM: Tipos explícitos
function purchase(data: PurchaseParams): Promise<PurchaseResult> { ... }
```

### 4. Separação de Concerns
```typescript
// ❌ RUIM: Lógica no componente
function Component() {
  const [data, setData] = useState();
  
  useEffect(() => {
    fetch('/api/data').then(res => res.json()).then(setData);
  }, []);
}

// ✅ BOM: Lógica no hook
function Component() {
  const { data } = useData();
}
```

### 5. Nomenclatura Clara
```typescript
// ❌ RUIM: Nomes genéricos
const data = getData();
const result = process(data);

// ✅ BOM: Nomes descritivos
const userCoinsBalance = getUserCoinsBalance();
const purchaseResult = purchaseCharacterWithCoins(userCoinsBalance);
```

---

## 📝 CHECKLIST DE QUALIDADE

Antes de considerar completo, verificar:

### Código
- [ ] Sem @ts-nocheck
- [ ] Sem @ts-ignore
- [ ] Sem any (exceto casos justificados)
- [ ] Sem TODOs em produção
- [ ] Sem console.log (usar logger)
- [ ] Sem código comentado
- [ ] Sem imports não usados

### Arquitetura
- [ ] Separação clara de responsabilidades
- [ ] Hooks reutilizáveis
- [ ] Serviços desacoplados
- [ ] Componentes pequenos (<200 linhas)
- [ ] Funções pequenas (<50 linhas)

### Performance
- [ ] React Query para cache
- [ ] Lazy loading onde apropriado
- [ ] Memoização quando necessário
- [ ] Bundle size otimizado

### Testes
- [ ] Hooks testados
- [ ] Serviços testados
- [ ] Componentes críticos testados
- [ ] Fluxos E2E testados

### Documentação
- [ ] JSDoc em funções públicas
- [ ] README atualizado
- [ ] Tipos documentados
- [ ] Exemplos de uso

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

### Semana 1: Fundação
1. Criar tipos unificados
2. Criar hooks base
3. Criar serviços limpos
4. Testes unitários

### Semana 2: Migração
5. Novo catálogo de personagens
6. Integração com coins
7. Testes de integração
8. Deploy em staging

### Semana 3: Assinaturas
9. Adicionar coins ao pagar
10. Página de escolha de coleções
11. Dashboard de coins
12. Testes E2E

### Semana 4: Limpeza
13. Remover código antigo
14. Atualizar documentação
15. Code review
16. Deploy em produção

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Breaking Changes
**Mitigação:** 
- Manter APIs antigas temporariamente
- Feature flags para rollback
- Deploy gradual (canary)

### Risco 2: Perda de Dados
**Mitigação:**
- Backup antes de migração
- Migração de dados testada
- Rollback plan documentado

### Risco 3: Bugs em Produção
**Mitigação:**
- Testes automatizados
- QA manual completo
- Monitoramento ativo
- Hotfix plan pronto

---

## 📊 MÉTRICAS DE SUCESSO

### Código
- Redução de 40% em linhas de código
- 0 @ts-nocheck
- 0 TODOs em produção
- 90%+ cobertura de testes

### Performance
- Tempo de carregamento <2s
- Bundle size reduzido em 20%
- 0 memory leaks

### Negócio
- 0 bugs críticos em produção
- Tempo de onboarding de devs reduzido
- Facilidade de adicionar features

---

## 🎯 PRÓXIMO PASSO

Começar pela **Fase 1.1: Criar Tipos Unificados**

Isso estabelece a fundação sem quebrar nada existente.
