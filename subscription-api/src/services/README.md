# Services Documentation

## Overview

Este diretório contém os serviços core do sistema de assinaturas com créditos.

## Serviços Disponíveis

### 1. Credit Service (`credit.service.ts`)

O serviço core que gerencia créditos dos usuários. Ele garante:

- **Invariante**: `available_credits = total_credits - used_credits`
- **Transações atômicas** para evitar condições de corrida
- **Validação de saldo** antes de débitos
- **Lock pessimista** em operações concorrentes

## Funções Disponíveis

### `allocateCredits(userId, subscriptionId, amount)`

Aloca créditos para um usuário vinculado a uma assinatura.

**Comportamento:**
- Cria ou atualiza o registro de créditos do usuário
- **Soma** os novos créditos ao saldo existente (não reseta)
- Usa transação atômica para garantir consistência
- Mantém invariante de saldo

**Parâmetros:**
- `userId: number` - ID do usuário
- `subscriptionId: number` - ID da assinatura
- `amount: number` - Quantidade de créditos a alocar (deve ser > 0)

**Retorna:**
```typescript
{
  userId: number;
  subscriptionId: number;
  totalCredits: number;
  availableCredits: number;
  creditsAllocated: number;
}
```

**Exemplo:**
```typescript
// Ativar plano trimestral (600 créditos)
const result = await allocateCredits(userId, subscriptionId, 600);
console.log(`Alocados ${result.creditsAllocated} créditos`);
console.log(`Saldo disponível: ${result.availableCredits}`);

// Renovar plano (soma ao saldo existente)
const renewal = await allocateCredits(userId, subscriptionId, 600);
console.log(`Novo saldo: ${renewal.availableCredits}`); // 1200 se tinha 600
```

**Erros:**
- Lança `Error` se `amount <= 0`

---

### `debitCredits(userId, amount)`

Debita créditos de um usuário com validação de saldo.

**Comportamento:**
- Valida que o usuário tem saldo suficiente
- Usa **lock pessimista (FOR UPDATE)** para evitar race conditions
- Atualiza `used_credits` e `available_credits` atomicamente
- Mantém invariante de saldo

**Parâmetros:**
- `userId: number` - ID do usuário
- `amount: number` - Quantidade de créditos a debitar (deve ser > 0)

**Retorna:**
```typescript
{
  userId: number;
  previousAvailable: number;
  debited: number;
  newAvailable: number;
}
```

**Exemplo:**
```typescript
// Compra individual de personagem (200 créditos)
try {
  const result = await debitCredits(userId, 200);
  console.log(`Debitados ${result.debited} créditos`);
  console.log(`Saldo anterior: ${result.previousAvailable}`);
  console.log(`Novo saldo: ${result.newAvailable}`);
} catch (error) {
  console.error('Saldo insuficiente:', error.message);
}
```

**Erros:**
- Lança `Error` se `amount <= 0`
- Lança `Error` se usuário não tem créditos
- Lança `Error` se saldo insuficiente

---

### `getUserCredits(userId)`

Obtém o saldo de créditos de um usuário.

**Parâmetros:**
- `userId: number` - ID do usuário

**Retorna:**
```typescript
{
  userId: number;
  subscriptionId: number;
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  expiredCredits: number;
} | null
```

**Exemplo:**
```typescript
const credits = await getUserCredits(userId);

if (credits) {
  console.log(`Total: ${credits.totalCredits}`);
  console.log(`Usados: ${credits.usedCredits}`);
  console.log(`Disponíveis: ${credits.availableCredits}`);
  console.log(`Expirados: ${credits.expiredCredits}`);
} else {
  console.log('Usuário não tem créditos');
}
```

**Erros:**
- Retorna `null` se usuário não encontrado

---

### `expireCredits(userId)`

Expira todos os créditos disponíveis de um usuário.

**Comportamento:**
- Move todos os créditos disponíveis para `expired_credits`
- Zera `available_credits`
- Usado quando assinatura é cancelada ou expira

**Parâmetros:**
- `userId: number` - ID do usuário

**Retorna:**
```typescript
{
  userId: number;
  creditsExpired: number;
  newAvailableCredits: number;
}
```

**Exemplo:**
```typescript
// Cancelamento com extorno
const result = await expireCredits(userId);
console.log(`Expirados ${result.creditsExpired} créditos`);
console.log(`Novo saldo disponível: ${result.newAvailableCredits}`); // 0
```

**Erros:**
- Lança `Error` se usuário não tem créditos

---

## Fluxos de Uso

### Fluxo 1: Ativação de Assinatura

```typescript
// 1. Processar pagamento
const payment = await processPayment(planPrice, paymentMethodId);

// 2. Criar assinatura
const subscription = await createSubscription(userId, planType);

// 3. Calcular créditos (600 para trimestral, 1400 para semestral)
const credits = planType === 'trimestral' ? 600 : 1400;

// 4. Alocar créditos
const result = await allocateCredits(userId, subscription.id, credits);

// 5. Criar pedido automático
await createAutomaticOrder(userId, subscription.id);
```

### Fluxo 2: Compra Individual

```typescript
// 1. Validar saldo
const credits = await getUserCredits(userId);
if (!credits || credits.availableCredits < characterPrice) {
  throw new Error('Saldo insuficiente');
}

// 2. Debitar créditos (com lock automático)
const debit = await debitCredits(userId, characterPrice);

// 3. Criar pedido
const order = await createOrder(userId, characterId);

// 4. Registrar transação
await recordTransaction(userId, 'debit_immediate', -characterPrice, {
  characterId,
  orderId: order.id
});
```

### Fluxo 3: Renovação de Assinatura

```typescript
// 1. Processar pagamento
await processPayment(planPrice, paymentMethodId);

// 2. Calcular novos créditos
const newCredits = planType === 'trimestral' ? 600 : 1400;

// 3. SOMAR créditos ao saldo existente
const result = await allocateCredits(userId, subscription.id, newCredits);

// 4. Criar novo pedido automático
await createAutomaticOrder(userId, subscription.id);
```

### Fluxo 4: Cancelamento com Extorno

```typescript
// 1. Calcular reembolso proporcional
const refund = calculateProportionalRefund(subscription);

// 2. Processar reembolso
await processRefund(refund);

// 3. Expirar todos os créditos
const result = await expireCredits(userId);

// 4. Atualizar status da assinatura
await updateSubscription(subscription.id, { status: 'cancelled' });

// 5. Registrar transação de expiração
await recordTransaction(userId, 'expiration', -result.creditsExpired);
```

### Fluxo 5: Fechamento de Ciclo

```typescript
// 1. Buscar pedidos automáticos do ciclo
const orders = await getAutomaticOrders(cycleId);

// 2. Para cada pedido
for (const order of orders) {
  // 2.1. Calcular total de créditos
  const total = calculateOrderTotal(order);
  
  // 2.2. Validar e debitar créditos
  try {
    await debitCredits(order.userId, total);
    
    // 2.3. Marcar pedido como confirmado
    await updateOrder(order.id, { 
      status: 'confirmed',
      creditsDebited: true 
    });
    
    // 2.4. Registrar transação
    await recordTransaction(order.userId, 'debit_cycle_close', -total, {
      orderId: order.id,
      cycleId
    });
  } catch (error) {
    // 2.5. Saldo insuficiente - manter pendente
    await updateOrder(order.id, { status: 'pending' });
    await notifyUser(order.userId, 'insufficient_credits');
  }
}
```

## Garantias de Concorrência

### Lock Pessimista

A função `debitCredits` usa lock pessimista (`FOR UPDATE`) para garantir que operações concorrentes não causem inconsistências:

```sql
SELECT * FROM user_credits 
WHERE user_id = ?
FOR UPDATE
```

Isso garante que:
- Apenas uma transação pode modificar os créditos de um usuário por vez
- Outras transações aguardam até que a primeira seja concluída
- Não há condições de corrida (race conditions)

### Transações Atômicas

Todas as operações usam transações do Prisma:

```typescript
await prisma.$transaction(async (tx) => {
  // Operações atômicas aqui
  // Se qualquer operação falhar, todas são revertidas
});
```

## Testes

Execute os testes unitários:

```bash
npm test -- credit.service.test.ts
```

**Pré-requisito:** PostgreSQL deve estar rodando. Configure o banco de dados:

```bash
# Inicializar banco de dados
./scripts/init-db.sh

# Ou manualmente
npx prisma migrate dev
npx prisma db seed
```

## Invariante de Saldo

O sistema garante que **sempre**:

```
available_credits = total_credits - used_credits
```

Esta invariante é mantida por:
1. Constraint no banco de dados
2. Lógica nas funções de alocação e débito
3. Transações atômicas
4. Testes automatizados

## Próximos Passos

Após implementar os serviços de créditos e transações:

1. ✅ Serviço de créditos implementado
2. ✅ Serviço de transações implementado
3. ⏭️ Escrever testes de propriedade (Task 3.4)
4. ⏭️ Implementar serviços de assinaturas (Task 4.x)

---

## 2. Transaction Service (`transaction.service.ts`)

O serviço responsável por registrar e consultar o histórico de transações de crédito. Cada operação de crédito (alocação, débito, expiração) deve gerar um registro de transação para auditoria e rastreabilidade.

### Tipos de Transação

- **allocation**: Alocação inicial de créditos (ativação/renovação)
- **debit_immediate**: Débito imediato (compra individual)
- **debit_cycle_close**: Débito no fechamento de ciclo (pedido automático)
- **expiration**: Expiração de créditos (cancelamento)
- **adjustment**: Ajuste manual (admin)

### Funções Disponíveis

#### `recordTransaction(userId, type, amount, metadata)`

Registra uma transação de crédito no histórico.

**Comportamento:**
- Cria um registro imutável de auditoria
- Vincula automaticamente à assinatura ativa do usuário
- Suporta metadados opcionais (characterId, orderId, productionCycleId, description)

**Parâmetros:**
- `userId: number` - ID do usuário
- `type: TransactionType` - Tipo de transação
- `amount: number` - Quantidade de créditos (positivo para alocação, negativo para débito/expiração)
- `metadata?: TransactionMetadata` - Metadados opcionais

**Retorna:**
```typescript
{
  id: number;
  userId: number;
  subscriptionId: number;
  transactionType: TransactionType;
  creditsAmount: number;
  characterId: number | null;
  orderId: number | null;
  productionCycleId: number | null;
  description: string | null;
  createdAt: Date;
}
```

**Exemplo:**
```typescript
// Registrar alocação de créditos
await recordTransaction(userId, 'allocation', 600, {
  description: 'Alocação inicial - Plano Trimestral'
});

// Registrar débito imediato
await recordTransaction(userId, 'debit_immediate', -100, {
  characterId: 1,
  orderId: 123,
  description: 'Compra individual de personagem'
});

// Registrar débito no fechamento de ciclo
await recordTransaction(userId, 'debit_cycle_close', -150, {
  characterId: 2,
  orderId: 124,
  productionCycleId: 1,
  description: 'Débito automático - Ciclo Janeiro 2024'
});

// Registrar expiração
await recordTransaction(userId, 'expiration', -600, {
  description: 'Cancelamento com extorno'
});
```

**Erros:**
- Lança `Error` se usuário não tem assinatura ativa

---

#### `getTransactionHistory(userId, options)`

Obtém o histórico de transações de um usuário com paginação.

**Comportamento:**
- Retorna transações ordenadas da mais recente para a mais antiga
- Suporta paginação básica
- Limite máximo de 100 registros por página

**Parâmetros:**
- `userId: number` - ID do usuário
- `options?: PaginationOptions` - Opções de paginação
  - `page?: number` - Página atual (padrão: 1)
  - `limit?: number` - Registros por página (padrão: 20, máximo: 100)

**Retorna:**
```typescript
{
  transactions: RecordTransactionResult[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

**Exemplo:**
```typescript
// Buscar primeira página (20 registros)
const page1 = await getTransactionHistory(userId);
console.log(`Total de transações: ${page1.pagination.total}`);
console.log(`Transações nesta página: ${page1.transactions.length}`);

// Buscar página específica com limite customizado
const page2 = await getTransactionHistory(userId, {
  page: 2,
  limit: 50
});

// Iterar por todas as páginas
let currentPage = 1;
let hasMore = true;

while (hasMore) {
  const result = await getTransactionHistory(userId, {
    page: currentPage,
    limit: 20
  });
  
  // Processar transações
  result.transactions.forEach(tx => {
    console.log(`${tx.transactionType}: ${tx.creditsAmount} créditos`);
  });
  
  hasMore = result.pagination.hasNext;
  currentPage++;
}
```

### Integração com Credit Service

O Transaction Service deve ser usado em conjunto com o Credit Service para manter auditoria completa:

```typescript
// Exemplo: Compra individual com registro de transação
async function purchaseCharacter(userId: number, characterId: number, price: number) {
  // 1. Debitar créditos
  const debit = await debitCredits(userId, price);
  
  // 2. Criar pedido
  const order = await createOrder(userId, characterId);
  
  // 3. Registrar transação para auditoria
  await recordTransaction(userId, 'debit_immediate', -price, {
    characterId,
    orderId: order.id,
    description: `Compra individual - ${characterName}`
  });
  
  return order;
}

// Exemplo: Alocação de créditos com registro
async function allocateCreditsWithTransaction(
  userId: number,
  subscriptionId: number,
  amount: number,
  description: string
) {
  // 1. Alocar créditos
  const result = await allocateCredits(userId, subscriptionId, amount);
  
  // 2. Registrar transação
  await recordTransaction(userId, 'allocation', amount, {
    description
  });
  
  return result;
}

// Exemplo: Expiração de créditos com registro
async function expireCreditsWithTransaction(userId: number, reason: string) {
  // 1. Expirar créditos
  const result = await expireCredits(userId);
  
  // 2. Registrar transação
  await recordTransaction(userId, 'expiration', -result.creditsExpired, {
    description: reason
  });
  
  return result;
}
```

### Testes

Execute os testes unitários:

```bash
npm test -- transaction.service.test.ts
```

**Pré-requisito:** PostgreSQL deve estar rodando. Configure o banco de dados:

```bash
# Inicializar banco de dados
./scripts/init-db.sh

# Ou manualmente
npx prisma migrate dev
npx prisma db seed
```

---

## 3. Subscription Plan Service (`subscription-plan.service.ts`)

O serviço responsável por gerenciar planos de assinatura. Fornece funções para consultar planos disponíveis e calcular créditos totais por plano (base + bônus).

### Planos Suportados

- **Trimestral**: 600 créditos (base: 600, bônus: 0)
- **Semestral**: 1400 créditos (base: 1200, bônus: 200)

### Funções Disponíveis

#### `getSubscriptionPlans()`

Retorna lista de planos de assinatura disponíveis.

**Comportamento:**
- Retorna apenas planos ativos (isActive = true)
- Planos ordenados por duração (trimestral primeiro)
- Inclui informações completas de preço, duração e créditos

**Retorna:**
```typescript
SubscriptionPlan[] // Array de planos
```

**Exemplo:**
```typescript
const plans = await getSubscriptionPlans();

plans.forEach(plan => {
  console.log(`${plan.name}:`);
  console.log(`  Duração: ${plan.durationMonths} meses`);
  console.log(`  Preço: R$ ${plan.price}`);
  console.log(`  Créditos base: ${plan.baseCredits}`);
  console.log(`  Créditos bônus: ${plan.bonusCredits}`);
  console.log(`  Total: ${plan.baseCredits + plan.bonusCredits} créditos`);
});

// Output:
// Plano Trimestral:
//   Duração: 3 meses
//   Preço: R$ 99.90
//   Créditos base: 600
//   Créditos bônus: 0
//   Total: 600 créditos
// Plano Semestral:
//   Duração: 6 meses
//   Preço: R$ 189.90
//   Créditos base: 1200
//   Créditos bônus: 200
//   Total: 1400 créditos
```

---

#### `calculateCreditsForPlan(planType)`

Calcula créditos totais para um tipo de plano.

**Comportamento:**
- Busca o plano no banco de dados
- Retorna créditos base + créditos bônus
- Valida que o plano existe e está ativo

**Parâmetros:**
- `planType: PlanType` - Tipo de plano ('trimestral' ou 'semestral')

**Retorna:**
```typescript
{
  planType: PlanType;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
}
```

**Exemplo:**
```typescript
// Calcular créditos para plano trimestral
const trimestral = await calculateCreditsForPlan('trimestral');
console.log(`Plano ${trimestral.planType}:`);
console.log(`  Base: ${trimestral.baseCredits}`);
console.log(`  Bônus: ${trimestral.bonusCredits}`);
console.log(`  Total: ${trimestral.totalCredits}`);
// Output:
// Plano trimestral:
//   Base: 600
//   Bônus: 0
//   Total: 600

// Calcular créditos para plano semestral
const semestral = await calculateCreditsForPlan('semestral');
console.log(`Plano ${semestral.planType}:`);
console.log(`  Base: ${semestral.baseCredits}`);
console.log(`  Bônus: ${semestral.bonusCredits}`);
console.log(`  Total: ${semestral.totalCredits}`);
// Output:
// Plano semestral:
//   Base: 1200
//   Bônus: 200
//   Total: 1400
```

**Erros:**
- Lança `Error` se plano não for encontrado
- Lança `Error` se plano não estiver ativo

### Integração com Subscription Service

O Subscription Plan Service deve ser usado ao ativar ou renovar assinaturas:

```typescript
// Exemplo: Ativação de assinatura
async function activateSubscription(
  userId: number,
  planType: PlanType,
  paymentMethodId: string
) {
  // 1. Buscar informações do plano
  const plans = await getSubscriptionPlans();
  const plan = plans.find(p => p.planType === planType);
  
  if (!plan) {
    throw new Error(`Plan ${planType} not found`);
  }
  
  // 2. Processar pagamento
  await processPayment(plan.price, paymentMethodId);
  
  // 3. Criar assinatura
  const subscription = await createSubscription(userId, planType);
  
  // 4. Calcular e alocar créditos
  const credits = await calculateCreditsForPlan(planType);
  await allocateCredits(userId, subscription.id, credits.totalCredits);
  
  // 5. Registrar transação
  await recordTransaction(userId, 'allocation', credits.totalCredits, {
    description: `Ativação - ${plan.name}`
  });
  
  return subscription;
}

// Exemplo: Renovação de assinatura
async function renewSubscription(subscriptionId: number) {
  // 1. Buscar assinatura
  const subscription = await getSubscription(subscriptionId);
  
  // 2. Calcular créditos do plano
  const credits = await calculateCreditsForPlan(subscription.planType);
  
  // 3. Processar pagamento
  const plans = await getSubscriptionPlans();
  const plan = plans.find(p => p.planType === subscription.planType);
  await processPayment(plan.price, subscription.paymentMethodId);
  
  // 4. Alocar créditos (soma ao saldo existente)
  await allocateCredits(subscription.userId, subscriptionId, credits.totalCredits);
  
  // 5. Registrar transação
  await recordTransaction(subscription.userId, 'allocation', credits.totalCredits, {
    description: `Renovação - ${plan.name}`
  });
  
  // 6. Atualizar datas da assinatura
  await updateSubscriptionDates(subscriptionId);
  
  return subscription;
}

// Exemplo: Exibir planos para usuário
async function displayPlansForUser() {
  const plans = await getSubscriptionPlans();
  
  return plans.map(plan => {
    const credits = plan.baseCredits + plan.bonusCredits;
    const pricePerCredit = plan.price / credits;
    
    return {
      name: plan.name,
      price: plan.price,
      duration: `${plan.durationMonths} meses`,
      credits: credits,
      pricePerCredit: pricePerCredit.toFixed(2),
      bonus: plan.bonusCredits > 0 ? `+${plan.bonusCredits} créditos bônus` : null
    };
  });
}
```

### Validações

O serviço garante que:
- Apenas planos ativos são retornados
- Cálculos de créditos são sempre corretos (base + bônus)
- Planos inexistentes ou inativos geram erros apropriados

### Testes

Execute os testes unitários:

```bash
npm test -- subscription-plan.service.test.ts
```

**Pré-requisito:** PostgreSQL deve estar rodando. Configure o banco de dados:

```bash
# Inicializar banco de dados
./scripts/init-db.sh

# Ou manualmente
npx prisma migrate dev
npx prisma db seed
```

---

## 4. Character Service (`character.service.ts`)

O serviço responsável por gerenciar personagens do catálogo. Fornece funções para listar personagens com filtragem por exclusividade baseada no tipo de plano, validar acesso a personagens exclusivos e obter a coleção padrão.

### Regras de Negócio

- **Plano Trimestral**: acesso apenas a personagens não exclusivos (isExclusiveSemestral = false)
- **Plano Semestral**: acesso a todos os personagens (incluindo exclusivos)
- Apenas personagens ativos (isActive = true) são retornados
- Coleção padrão é usada para criar pedidos automáticos na ativação de assinatura

### Funções Disponíveis

#### `getCharacters(filters, planType)`

Obtém lista de personagens com filtragem por exclusividade baseada no plano.

**Comportamento:**
- Filtra personagens por tipo de plano (trimestral vê apenas não exclusivos)
- Sempre filtra por isActive = true
- Suporta paginação básica (padrão: 20 por página, máximo: 100)
- Ordena por data de criação (mais recentes primeiro)

**Parâmetros:**
- `filters?: CharacterFilters` - Filtros opcionais
  - `isActive?: boolean` - Filtrar por status ativo (padrão: true)
  - `isStandardCollection?: boolean` - Filtrar por coleção padrão
  - `page?: number` - Página atual (padrão: 1)
  - `limit?: number` - Registros por página (padrão: 20, máximo: 100)
- `planType?: PlanType` - Tipo de plano do usuário ('trimestral' ou 'semestral')

**Retorna:**
```typescript
{
  characters: CharacterResult[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

**Exemplo:**
```typescript
// Listar personagens para usuário com plano trimestral
const trimestralChars = await getCharacters({}, 'trimestral');
console.log(`Personagens disponíveis: ${trimestralChars.characters.length}`);
// Retorna apenas personagens não exclusivos

// Listar personagens para usuário com plano semestral
const semestralChars = await getCharacters({}, 'semestral');
console.log(`Personagens disponíveis: ${semestralChars.characters.length}`);
// Retorna todos os personagens (incluindo exclusivos)

// Listar personagens sem filtro de plano (catálogo público)
const publicChars = await getCharacters({});
// Retorna todos os personagens ativos

// Listar apenas personagens da coleção padrão
const standardChars = await getCharacters({ isStandardCollection: true });
console.log(`Coleção padrão: ${standardChars.characters.length} personagens`);

// Paginação
const page1 = await getCharacters({ page: 1, limit: 10 }, 'semestral');
console.log(`Página 1: ${page1.characters.length} personagens`);
console.log(`Total: ${page1.pagination.total}`);
console.log(`Tem próxima página: ${page1.pagination.hasNext}`);

const page2 = await getCharacters({ page: 2, limit: 10 }, 'semestral');
console.log(`Página 2: ${page2.characters.length} personagens`);
```

---

#### `getCharacterById(id, planType)`

Obtém um personagem específico por ID com validação de acesso.

**Comportamento:**
- Valida que personagem existe e está ativo
- Se personagem é exclusivo, valida que usuário tem plano semestral
- Retorna null se personagem não encontrado, inativo ou sem acesso

**Parâmetros:**
- `id: number` - ID do personagem
- `planType?: PlanType` - Tipo de plano do usuário (opcional)

**Retorna:**
```typescript
CharacterResult | null
```

**Exemplo:**
```typescript
// Buscar personagem sem validação de plano (catálogo público)
const character = await getCharacterById(1);
if (character) {
  console.log(`${character.name}: R$ ${character.priceCash}`);
}

// Buscar personagem com validação de plano trimestral
const charForTrimestral = await getCharacterById(1, 'trimestral');
if (!charForTrimestral) {
  console.log('Personagem não disponível para plano trimestral');
  // Pode ser exclusivo ou inativo
}

// Buscar personagem com validação de plano semestral
const charForSemestral = await getCharacterById(1, 'semestral');
if (charForSemestral) {
  console.log(`${charForSemestral.name}: ${charForSemestral.priceCredits} créditos`);
  if (charForSemestral.isExclusiveSemestral) {
    console.log('⭐ Personagem exclusivo!');
  }
}

// Validar acesso antes de compra
async function validateCharacterAccess(
  characterId: number,
  planType: PlanType
): Promise<boolean> {
  const character = await getCharacterById(characterId, planType);
  return character !== null;
}
```

**Retorna null quando:**
- Personagem não existe
- Personagem está inativo (isActive = false)
- Personagem é exclusivo e usuário tem plano trimestral

---

#### `getStandardCollection()`

Obtém a coleção padrão de personagens.

**Comportamento:**
- Retorna todos os personagens com isStandardCollection = true
- Filtra apenas personagens ativos
- Ordena por nome (ordem alfabética)
- Usado para criar pedidos automáticos na ativação de assinatura

**Retorna:**
```typescript
CharacterResult[] // Array de personagens
```

**Exemplo:**
```typescript
// Buscar coleção padrão
const collection = await getStandardCollection();
console.log(`Coleção padrão: ${collection.length} personagens`);

collection.forEach(char => {
  console.log(`- ${char.name}: ${char.priceCredits} créditos`);
  if (char.isExclusiveSemestral) {
    console.log('  ⭐ Exclusivo semestral');
  }
});

// Calcular total de créditos da coleção
const totalCredits = collection.reduce(
  (sum, char) => sum + char.priceCredits,
  0
);
console.log(`Total: ${totalCredits} créditos`);

// Criar pedido automático com coleção padrão
async function createAutomaticOrderWithStandardCollection(
  userId: number,
  subscriptionId: number,
  cycleId: number
) {
  // 1. Buscar coleção padrão
  const collection = await getStandardCollection();
  
  if (collection.length === 0) {
    throw new Error('No standard collection defined');
  }
  
  // 2. Calcular total de créditos
  const totalCredits = collection.reduce(
    (sum, char) => sum + char.priceCredits,
    0
  );
  
  // 3. Criar pedido
  const order = await createOrder({
    userId,
    subscriptionId,
    productionCycleId: cycleId,
    orderType: 'automatic',
    totalCredits,
    creditsDebited: false // Débito ocorre no fechamento do ciclo
  });
  
  // 4. Criar itens do pedido
  for (const character of collection) {
    await createOrderItem({
      orderId: order.id,
      characterId: character.id,
      creditsCost: character.priceCredits
    });
  }
  
  return order;
}
```

### Integração com Outros Serviços

#### Exibir Catálogo para Usuário

```typescript
async function displayCatalogForUser(userId: number) {
  // 1. Buscar assinatura do usuário
  const subscription = await getActiveSubscription(userId);
  
  // 2. Buscar créditos disponíveis
  const credits = await getUserCredits(userId);
  
  // 3. Buscar personagens filtrados por plano
  const result = await getCharacters({}, subscription?.planType);
  
  // 4. Enriquecer com informações de compra
  return result.characters.map(char => ({
    ...char,
    canAfford: credits ? credits.availableCredits >= char.priceCredits : false,
    needsComplement: credits 
      ? credits.availableCredits < char.priceCredits && credits.availableCredits > 0
      : false,
    complementAmount: credits && credits.availableCredits < char.priceCredits
      ? char.priceCash * ((char.priceCredits - credits.availableCredits) / char.priceCredits)
      : 0
  }));
}
```

#### Validar Compra Individual

```typescript
async function validateIndividualPurchase(
  userId: number,
  characterId: number
): Promise<{ valid: boolean; reason?: string }> {
  // 1. Buscar assinatura ativa
  const subscription = await getActiveSubscription(userId);
  if (!subscription) {
    return { valid: false, reason: 'No active subscription' };
  }
  
  // 2. Validar acesso ao personagem
  const character = await getCharacterById(characterId, subscription.planType);
  if (!character) {
    return { valid: false, reason: 'Character not available for your plan' };
  }
  
  // 3. Validar saldo de créditos
  const credits = await getUserCredits(userId);
  if (!credits || credits.availableCredits < character.priceCredits) {
    return { valid: false, reason: 'Insufficient credits' };
  }
  
  return { valid: true };
}
```

#### Criar Pedido Automático na Ativação

```typescript
async function activateSubscriptionWithAutomaticOrder(
  userId: number,
  planType: PlanType,
  paymentMethodId: string
) {
  // 1. Processar pagamento e criar assinatura
  const subscription = await activateSubscription(userId, planType, paymentMethodId);
  
  // 2. Buscar ciclo aberto
  const cycle = await getCurrentOpenCycle();
  if (!cycle) {
    throw new Error('No open production cycle');
  }
  
  // 3. Buscar coleção padrão
  const collection = await getStandardCollection();
  
  // 4. Calcular total de créditos
  const totalCredits = collection.reduce(
    (sum, char) => sum + char.priceCredits,
    0
  );
  
  // 5. Criar pedido automático
  const order = await createOrder({
    userId,
    subscriptionId: subscription.id,
    productionCycleId: cycle.id,
    orderType: 'automatic',
    status: 'pending',
    isPriority: planType === 'semestral',
    isLocked: false,
    totalCredits,
    creditsDebited: false
  });
  
  // 6. Criar itens do pedido
  for (const character of collection) {
    await createOrderItem({
      orderId: order.id,
      characterId: character.id,
      creditsCost: character.priceCredits
    });
  }
  
  return { subscription, order };
}
```

### Validações

O serviço garante que:
- Plano trimestral nunca vê personagens exclusivos
- Plano semestral vê todos os personagens
- Apenas personagens ativos são retornados
- Paginação respeita limites (máximo 100 por página)
- Coleção padrão contém apenas personagens ativos

### Testes

Execute os testes unitários:

```bash
npm test -- character.service.test.ts
```

**Pré-requisito:** PostgreSQL deve estar rodando. Configure o banco de dados:

```bash
# Inicializar banco de dados
./scripts/init-db.sh

# Ou manualmente
npx prisma migrate dev
npx prisma db seed
```

### Casos de Teste Cobertos

- ✅ Filtragem por plano trimestral (apenas não exclusivos)
- ✅ Filtragem por plano semestral (todos os personagens)
- ✅ Retorno apenas de personagens ativos
- ✅ Paginação básica (múltiplas páginas)
- ✅ Filtro por coleção padrão
- ✅ Busca por ID com validação de acesso
- ✅ Retorno null para personagem inativo
- ✅ Retorno null para personagem exclusivo com plano trimestral
- ✅ Retorno de personagem exclusivo com plano semestral
- ✅ Coleção padrão apenas com personagens ativos
- ✅ Inclusão de personagens exclusivos na coleção padrão

---
