# Análise Completa: Sistema de Compra de Coleções e Personagens

## 🎯 Resumo Executivo

O sistema possui **DOIS SISTEMAS DE COMPRA PARALELOS** que funcionam de forma independente:

1. **Sistema de Coins** (Novo) - Para personagens individuais
2. **Sistema de Dinheiro** (Original) - Para coleções completas

---

## 💰 Sistema 1: Compra com COINS (Personagens Individuais)

### ✅ Status: COMPLETO E FUNCIONAL

### Como Funciona:

#### 1. Usuário Compra Coins
- Acessa página de compra de coins
- Escolhe pacote (Starter, Basic, Premium, Mega)
- Paga via PIX/cartão (integração pendente)
- Coins são creditados na conta

#### 2. Usuário Compra Personagem Individual
- Acessa catálogo de personagens
- Vê preço em COINS (calculado dinamicamente)
- Clica "Comprar com Coins"
- Sistema debita coins e adiciona personagem

### Preço Contextual de Personagens (em COINS):

O preço é calculado pela função SQL `get_character_price()`:

```
Preço Final = Preço da Coleção × Multiplicador do Personagem
```

**Exemplo:**
- Coleção escolhida: 800 coins (base 1000 - 20% desconto)
- Personagem normal (multiplicador 1.0): 800 × 1.0 = **800 coins**
- Personagem premium (multiplicador 1.5): 800 × 1.5 = **1200 coins**
- Personagem raro (multiplicador 2.0): 800 × 2.0 = **1600 coins**

### Preço da Coleção (Base para Cálculo):

Depende do contexto do usuário:

| Contexto | Tipo Coleção | Preço Base | Regra | Preço Final |
|----------|--------------|------------|-------|-------------|
| Assinante + Escolhida | Subscription | 1000 coins | -20% desconto | **800 coins** |
| Assinante + Não Escolhida | Subscription | 1000 coins | +20% (1.2x) | **1200 coins** |
| Não Assinante | Subscription | 1000 coins | +20% (1.2x) | **1200 coins** |
| Assinante + Escolhida | Standard | 1400 coins | -20% desconto | **1120 coins** |
| Assinante + Não Escolhida | Standard | 1400 coins | +20% (1.2x) | **1680 coins** |
| Não Assinante | Standard | 1400 coins | +20% (1.2x) | **1680 coins** |
| Assinante + Escolhida | Premium | 1800 coins | -20% desconto | **1440 coins** |
| Assinante + Não Escolhida | Premium | 1800 coins | +20% (1.2x) | **2160 coins** |
| Não Assinante | Premium | 1800 coins | +20% (1.2x) | **2160 coins** |

### Tabelas Envolvidas:
- `user_coins` - Saldo de coins do usuário
- `coin_transactions` - Histórico de transações
- `coin_packages` - Pacotes disponíveis para compra
- `user_characters` - Personagens adquiridos
- `collection_base_pricing` - Preço base por tipo de coleção
- `pricing_context_multipliers` - Multiplicadores por contexto
- `characters.price_multiplier` - Multiplicador individual do personagem

### Funções SQL:
- `get_character_price(character_id, user_id)` - Calcula preço contextual
- `get_collection_price(collection_id, user_id)` - Calcula preço da coleção
- `purchase_character_with_coins(user_id, character_id, coins_amount)` - Compra atômica

### Hooks Frontend:
- `useCharacterPrice(characterId, userId)` - Busca preço do personagem
- `useCharacterPrices(characterIds[], userId)` - Busca preços em lote
- `usePurchaseCharacter()` - Executa compra
- `useUserCoins()` - Busca saldo
- `useCoinTransactions()` - Busca histórico

### Página:
- `/character-catalog` - Catálogo de personagens (usa sistema de créditos antigo)
- **NOTA:** Página ainda usa API antiga (`subscription-credit-api`), não migrada para coins

---

## 💵 Sistema 2: Compra com DINHEIRO (Coleções Completas)

### ✅ Status: COMPLETO E FUNCIONAL

### Como Funciona:

#### 1. Compra Standalone (Avulsa)
Usuário compra uma coleção completa pagando em dinheiro.

**Fluxo:**
1. Usuário acessa página de compra standalone
2. Escolhe coleção e ciclo
3. Paga depósito de R$ 100,00 (fixo)
4. Upload de comprovante
5. Status: `deposit_paid`
6. Paga saldo restante (preço_total - R$ 100)
7. Status: `balance_paid`
8. Produção inicia
9. Status: `production_complete`
10. Entrega realizada

**Valores:**
- Depósito: R$ 100,00 (fixo)
- Saldo: `collection.price_full - 100`
- Total: `collection.price_full`

**Tabelas:**
- `standalone_purchases` - Compras avulsas
- `collections` - Coleções disponíveis (campo `price_full`)
- `cycles` - Ciclos de produção

**Serviço:**
- `src/services/standalone-purchase-service.ts`
  - `createWithDeposit()` - Cria compra com depósito
  - `processBalancePayment()` - Processa pagamento do saldo
  - `approvePaymentVoucher()` - Aprova comprovante
  - `rejectPaymentVoucher()` - Rejeita comprovante

**Páginas:**
- `/standalone-purchase` - Criar compra standalone
- `/pay-standalone-balance/:id` - Pagar saldo restante

#### 2. Assinatura (Subscription)
Usuário assina plano mensal e escolhe coleções.

**Fluxo:**
1. Usuário escolhe plano (bimestral, trimestral, semestral, anual)
2. Paga mensalidade
3. Recebe peças + coins (conforme plano)
4. Escolhe coleções do mês
5. Produção automática

**Valores:**
- Definidos em `subscription_credit_plans`
- Exemplo Semestral:
  - Preço: R$ 300,00
  - Peças base: 6
  - Peças bônus: 1 (ou coins extras)
  - Total peças: 7
  - Coins totais: 700 (6×100 + 1×100)

**Tabelas:**
- `subscriptions` - Assinaturas ativas
- `subscription_credit_plans` - Planos disponíveis
- `subscription_collections` - Coleções escolhidas pelo assinante
- `deliveries` - Entregas programadas

**Páginas:**
- `/plans` - Escolher plano
- `/subscribe-collection` - Escolher coleções do mês

---

## 🔄 Comparação: Coins vs Dinheiro

| Aspecto | Sistema de COINS | Sistema de DINHEIRO |
|---------|------------------|---------------------|
| **O que compra** | Personagens individuais | Coleções completas |
| **Unidade** | Coins (moeda virtual) | Reais (R$) |
| **Preço** | Contextual (varia por usuário) | Fixo (price_full) |
| **Tabela** | `user_characters` | `standalone_purchases` ou `subscriptions` |
| **Função SQL** | `purchase_character_with_coins()` | `createWithDeposit()` |
| **Histórico** | `coin_transactions` | `standalone_purchases.status` |
| **Reembolso** | Sim (coins voltam) | Não implementado |
| **Desconto** | Sim (assinante + escolhida) | Não |
| **Multiplicador** | Sim (por personagem) | Não |
| **Status** | ✅ Completo | ✅ Completo |

---

## 🎨 Onde Cada Sistema é Usado

### Páginas que Usam COINS:
- ❌ **NENHUMA AINDA** (sistema pronto mas não integrado no frontend)
- Hooks criados mas não usados em páginas
- Catálogo de personagens usa sistema antigo de créditos

### Páginas que Usam DINHEIRO:
- ✅ `/standalone-purchase` - Compra avulsa de coleção
- ✅ `/pay-standalone-balance/:id` - Pagar saldo de compra
- ✅ `/plans` - Escolher plano de assinatura
- ✅ `/subscribe-collection` - Escolher coleções (assinantes)
- ✅ `/admin/standalone-purchases` - Gerenciar compras avulsas

---

## 🚨 PROBLEMA IDENTIFICADO: Catálogo de Personagens

### Situação Atual:
A página `/character-catalog` usa o **sistema antigo de créditos** (Prisma API), NÃO o novo sistema de coins.

**Código problemático:**
```typescript
// src/pages/CharacterCatalog.tsx
import { subscriptionCreditAPI } from '@/services/subscription-credit-api';

// Usa API antiga (Prisma)
const response = await subscriptionCreditAPI.getCharacters(page, 24, planType);

// Compra usa créditos antigos, não coins
await subscriptionCreditAPI.createIndividualOrder(character.id, true);
```

### O Que Precisa Ser Feito:

#### Opção 1: Migrar Catálogo para Coins (Recomendado)
1. Remover dependência de `subscription-credit-api`
2. Usar hooks de coins:
   - `useCharacterPrice()` para preços
   - `usePurchaseCharacter()` para compra
   - `useUserCoins()` para saldo
3. Atualizar UI para mostrar preços em coins
4. Adicionar botão "Comprar com Coins"

#### Opção 2: Manter Dois Sistemas (Não Recomendado)
- Catálogo usa créditos (sistema antigo)
- Personagens individuais usam coins (sistema novo)
- **Problema:** Confusão para usuário, duplicação de lógica

---

## 📊 Dados Atuais

### Pacotes de Coins:
| Pacote | Coins | Bônus | Total | Preço |
|--------|-------|-------|-------|-------|
| Starter | 500 | 0 | 500 | R$ 25,00 |
| Basic | 1000 | 200 | 1200 | R$ 45,00 |
| Premium | 2000 | 500 | 2500 | R$ 85,00 |
| Mega | 5000 | 500 | 5500 | R$ 200,00 |

### Preços Base (Coins):
| Tipo | Preço Base |
|------|------------|
| Subscription | 1000 coins |
| Standard Catalog | 1400 coins |
| Premium Catalog | 1800 coins |

### Multiplicadores:
| Contexto | Multiplicador | Desconto |
|----------|---------------|----------|
| Assinante + Escolhida | - | 20% |
| Assinante + Não Escolhida | 1.2x | - |
| Não Assinante | 1.2x | - |

---

## ✅ O Que Está Completo

### Sistema de Coins:
- ✅ Backend completo (tabelas + funções)
- ✅ Hooks frontend (sem mocks)
- ✅ Cálculo de preço contextual
- ✅ Compra atômica de personagens
- ✅ Histórico de transações
- ✅ Admin pode configurar preços
- ❌ **NÃO integrado no catálogo de personagens**

### Sistema de Dinheiro:
- ✅ Compra standalone completa
- ✅ Sistema de assinatura completo
- ✅ Pagamento em 2 etapas (depósito + saldo)
- ✅ Upload de comprovante
- ✅ Aprovação/rejeição de pagamento
- ✅ Integração com produção
- ✅ Páginas funcionais

---

## 🎯 Recomendações

### Curto Prazo (Urgente):
1. **Decidir:** Migrar catálogo para coins OU manter créditos antigos?
2. Se migrar: Atualizar `/character-catalog` para usar hooks de coins
3. Se manter: Documentar claramente a diferença entre créditos e coins

### Médio Prazo:
1. Integrar gateway de pagamento real (PIX/cartão) para compra de coins
2. Criar página dedicada para compra de personagens com coins
3. Adicionar filtro "Comprar com Coins" no catálogo

### Longo Prazo:
1. Unificar sistemas (apenas coins)
2. Migrar compras standalone para coins
3. Converter créditos antigos em coins

---

## 📝 Arquivos Importantes

### Sistema de Coins:
- `src/hooks/useCharacterPrice.ts` - Cálculo de preço
- `src/hooks/usePurchaseCharacter.ts` - Compra
- `src/hooks/useUserCoins.ts` - Saldo
- `supabase/migrations/20260512000000_create_coin_system.sql`
- `supabase/migrations/20260511000006_create_get_collection_price_function.sql`
- `supabase/migrations/20260511000013_create_get_character_price_function.sql`

### Sistema de Dinheiro:
- `src/services/standalone-purchase-service.ts` - Compras avulsas
- `src/pages/StandalonePurchase.tsx` - Página de compra
- `src/pages/PayStandaloneBalance.tsx` - Pagamento de saldo
- `src/pages/SubscribeCollection.new.tsx` - Escolha de coleções

### Catálogo (Sistema Antigo):
- `src/pages/CharacterCatalog.tsx` - **USA CRÉDITOS ANTIGOS**
- `src/services/subscription-credit-api.ts` - API Prisma antiga
- `subscription-api/` - Backend Prisma (separado do Supabase)

---

## 🚀 Conclusão

**Sistema de Coins:** ✅ Backend 100% completo, frontend pronto mas NÃO integrado

**Sistema de Dinheiro:** ✅ 100% funcional e em uso

**Problema:** Catálogo de personagens ainda usa sistema antigo de créditos (Prisma), não o novo sistema de coins (Supabase).

**Decisão necessária:** Migrar catálogo para coins ou manter dois sistemas paralelos?
