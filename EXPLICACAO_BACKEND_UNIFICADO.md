# Explicação: Backend Unificado com Frontend Adaptado

## 🎯 Conceito Principal

**Backend:** Tudo funciona com coins internamente (banco de dados, cálculos, lógica)

**Frontend:** Mostra para o usuário o que faz mais sentido (coins OU reais, dependendo do contexto)

---

## 📱 EXEMPLO PRÁTICO 1: Assinante

### O que o CLIENTE vê na tela:

```
┌─────────────────────────────────────┐
│  💰 Seu Saldo: 5.000 coins          │
├─────────────────────────────────────┤
│                                     │
│  🎨 Coleção Naruto                  │
│  Preço: 4.000 coins                 │
│  [Comprar com Coins]                │
│                                     │
│  🎨 Personagem Sasuke               │
│  Preço: 1.200 coins                 │
│  [Comprar com Coins]                │
│                                     │
└─────────────────────────────────────┘
```

### O que acontece no BACKEND:

```javascript
// 1. Cliente clica "Comprar com Coins"
// 2. Backend executa:

await supabase.rpc('purchase_character_with_coins', {
  p_user_id: userId,
  p_character_id: characterId,
  p_coins_amount: 1200
});

// 3. Tabelas afetadas:
// - user_coins: balance = 5000 - 1200 = 3800
// - coin_transactions: INSERT (type: 'spend', amount: -1200)
// - user_characters: INSERT (acquisition_type: 'coin_purchase', price_paid: 1200)
```

**✅ Cliente vê coins, usa coins, entende coins**

---

## 📱 EXEMPLO PRÁTICO 2: Standalone (Conversão Transparente)

### O que o CLIENTE vê na tela:

```
┌─────────────────────────────────────┐
│  🎨 Coleção Naruto                  │
│                                     │
│  Preço Total: R$ 150,00             │
│                                     │
│  ├─ Entrada: R$ 100,00              │
│  └─ Saldo: R$ 50,00                 │
│                                     │
│  [Pagar Entrada R$ 100]             │
│                                     │
└─────────────────────────────────────┘
```

**❌ Cliente NÃO vê coins em lugar nenhum**

### O que acontece no BACKEND (invisível para cliente):

```javascript
// 1. Cliente clica "Pagar Entrada R$ 100"
// 2. Frontend envia para backend:

const response = await fetch('/api/standalone-purchase', {
  method: 'POST',
  body: JSON.stringify({
    collectionId: 'naruto-123',
    amountPaid: 100.00  // ← Em REAIS
  })
});

// 3. Backend CONVERTE automaticamente:

const COIN_RATE = 100; // R$ 1 = 100 coins
const coinsReceived = amountPaid * COIN_RATE; // 100 * 100 = 10.000 coins

// 4. Backend cria "conta temporária de coins" para essa compra:
await supabase.from('standalone_purchase_coins').insert({
  purchase_id: purchaseId,
  coins_balance: 10000,
  coins_used: 0
});

// 5. Backend calcula preço da coleção em coins:
const collectionPriceInCoins = await supabase.rpc('get_collection_price', {
  p_collection_id: collectionId,
  p_user_id: userId
}); // Retorna: 15000 coins

// 6. Backend verifica se precisa pagar saldo:
const coinsNeeded = collectionPriceInCoins - coinsReceived; // 15000 - 10000 = 5000
const balanceInReais = coinsNeeded / COIN_RATE; // 5000 / 100 = R$ 50

// 7. Backend retorna para frontend:
return {
  status: 'awaiting_balance',
  balanceDue: 50.00,  // ← Em REAIS (frontend mostra isso)
  // Coins não são enviados para frontend
};
```

### Quando cliente paga o saldo:

```
┌─────────────────────────────────────┐
│  🎨 Coleção Naruto                  │
│                                     │
│  ✅ Entrada paga: R$ 100,00         │
│  ⏳ Saldo restante: R$ 50,00        │
│                                     │
│  [Pagar Saldo R$ 50]                │
│                                     │
└─────────────────────────────────────┘
```

```javascript
// 1. Cliente clica "Pagar Saldo R$ 50"
// 2. Backend converte:

const additionalCoins = 50 * 100; // 5000 coins

// 3. Backend atualiza conta de coins:
await supabase.from('standalone_purchase_coins').update({
  coins_balance: 10000 + 5000, // = 15000 coins
}).eq('purchase_id', purchaseId);

// 4. Backend "compra" a coleção com coins:
await supabase.rpc('purchase_collection_with_coins', {
  p_user_id: userId,
  p_collection_id: collectionId,
  p_coins_amount: 15000
});

// 5. Backend marca compra como completa:
await supabase.from('standalone_purchases').update({
  status: 'completed'
}).eq('id', purchaseId);
```

**✅ Cliente pagou R$ 150, recebeu coleção. Nunca viu coins.**

---

## 🔄 COMPARAÇÃO LADO A LADO

### Cenário: Comprar Coleção de 15.000 coins (R$ 150)

#### ASSINANTE (vê coins):

```
┌─────────────────────────────────────┐
│ Cliente vê:                         │
│ "Você tem 20.000 coins"             │
│ "Coleção: 15.000 coins"             │
│ [Comprar]                           │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Backend faz:                        │
│ - Debita 15.000 coins               │
│ - Adiciona coleção                  │
│ - Saldo: 5.000 coins                │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Cliente vê:                         │
│ "Compra realizada!"                 │
│ "Saldo: 5.000 coins"                │
└─────────────────────────────────────┘
```

#### STANDALONE (vê reais):

```
┌─────────────────────────────────────┐
│ Cliente vê:                         │
│ "Coleção: R$ 150"                   │
│ "Entrada: R$ 100"                   │
│ [Pagar]                             │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Backend faz (INVISÍVEL):            │
│ - Converte R$ 100 → 10.000 coins    │
│ - Cria conta temporária             │
│ - Calcula falta: 5.000 coins        │
│ - Converte → R$ 50                  │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Cliente vê:                         │
│ "Entrada paga!"                     │
│ "Saldo: R$ 50"                      │
│ [Pagar Saldo]                       │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Backend faz (INVISÍVEL):            │
│ - Converte R$ 50 → 5.000 coins      │
│ - Total: 15.000 coins               │
│ - Compra coleção com coins          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Cliente vê:                         │
│ "Compra completa!"                  │
│ "Coleção adquirida!"                │
└─────────────────────────────────────┘
```

---

## 💾 ESTRUTURA DO BANCO DE DADOS

### Tabelas Unificadas (tudo em coins):

```sql
-- Saldo de coins do usuário (assinantes)
CREATE TABLE user_coins (
  user_id UUID,
  balance INTEGER,  -- Em COINS
  ...
);

-- Transações de coins (assinantes)
CREATE TABLE coin_transactions (
  user_id UUID,
  amount INTEGER,  -- Em COINS (positivo ou negativo)
  type TEXT,  -- 'purchase', 'spend', 'refund'
  ...
);

-- Conta temporária para standalone (conversão transparente)
CREATE TABLE standalone_purchase_coins (
  purchase_id UUID,
  coins_balance INTEGER,  -- Coins acumulados (R$ convertido)
  coins_used INTEGER,     -- Coins já gastos
  ...
);

-- Personagens adquiridos (UNIFICADO)
CREATE TABLE user_characters (
  user_id UUID,
  character_id UUID,
  acquisition_type TEXT,  -- 'coin_purchase', 'subscription', 'standalone'
  price_paid INTEGER,     -- SEMPRE em COINS
  ...
);

-- Preços (UNIFICADO)
CREATE TABLE collection_base_pricing (
  collection_type_id UUID,
  base_price_coins INTEGER,  -- SEMPRE em COINS
  ...
);
```

### Funções SQL (tudo em coins):

```sql
-- Calcula preço em COINS (usado por todos)
CREATE FUNCTION get_collection_price(
  p_collection_id UUID,
  p_user_id UUID
) RETURNS INTEGER;  -- Retorna COINS

-- Compra com coins (usado por todos)
CREATE FUNCTION purchase_collection_with_coins(
  p_user_id UUID,
  p_collection_id UUID,
  p_coins_amount INTEGER
) RETURNS VOID;
```

---

## 🎨 CÓDIGO FRONTEND (Adaptado)

### Componente para ASSINANTE:

```typescript
// src/pages/CollectionCatalogForSubscribers.tsx

export function CollectionCatalogForSubscribers() {
  // Busca saldo em COINS
  const { data: coinsBalance } = useUserCoins(userId);
  
  // Busca preço em COINS
  const { data: price } = useCollectionPrice(collectionId, userId);
  
  return (
    <div>
      <h2>Seu Saldo: {coinsBalance} coins</h2>
      
      <div>
        <h3>Coleção Naruto</h3>
        <p>Preço: {price} coins</p>  {/* Mostra COINS */}
        <button onClick={() => purchaseWithCoins(collectionId, price)}>
          Comprar com Coins
        </button>
      </div>
    </div>
  );
}
```

### Componente para STANDALONE:

```typescript
// src/pages/StandalonePurchase.tsx

export function StandalonePurchase() {
  const [collectionPrice, setCollectionPrice] = useState(0);
  
  useEffect(() => {
    // Backend retorna preço em REAIS (já convertido)
    fetch(`/api/collection-price-brl/${collectionId}`)
      .then(res => res.json())
      .then(data => setCollectionPrice(data.price_brl));
  }, [collectionId]);
  
  return (
    <div>
      <h3>Coleção Naruto</h3>
      <p>Preço Total: R$ {collectionPrice.toFixed(2)}</p>  {/* Mostra REAIS */}
      <p>Entrada: R$ 100,00</p>
      <p>Saldo: R$ {(collectionPrice - 100).toFixed(2)}</p>
      
      <button onClick={() => payDeposit(100)}>
        Pagar Entrada R$ 100
      </button>
    </div>
  );
}
```

### API Backend (Conversão):

```typescript
// src/pages/api/collection-price-brl.ts

export async function GET(request: Request) {
  const { collectionId, userId } = await request.json();
  
  // 1. Busca preço em COINS (backend unificado)
  const { data: priceInCoins } = await supabase.rpc('get_collection_price', {
    p_collection_id: collectionId,
    p_user_id: userId
  });
  
  // 2. Converte para REAIS (para frontend standalone)
  const COIN_RATE = 100; // R$ 1 = 100 coins
  const priceInBRL = priceInCoins / COIN_RATE;
  
  // 3. Retorna em REAIS
  return Response.json({
    price_coins: priceInCoins,  // Backend usa isso
    price_brl: priceInBRL       // Frontend mostra isso
  });
}
```

---

## ✅ VANTAGENS DESTA ABORDAGEM

### 1. Backend Unificado
```
✅ Uma única tabela de preços (em coins)
✅ Uma única função de cálculo (em coins)
✅ Uma única lógica de compra (em coins)
✅ Menos código para manter
✅ Menos bugs
```

### 2. Frontend Adaptado
```
✅ Assinante vê coins (faz sentido para ele)
✅ Standalone vê reais (faz sentido para ele)
✅ Cada um vê o que entende melhor
✅ Menos confusão
```

### 3. Flexibilidade
```
✅ Admin configura tudo em coins (unificado)
✅ Sistema converte automaticamente
✅ Fácil mudar taxa de conversão
✅ Fácil adicionar novos tipos de compra
```

---

## ❌ O QUE NÃO É

### NÃO é ter dois sistemas separados:
```
❌ Backend de coins para assinantes
❌ Backend de reais para standalone
❌ Duas tabelas de preços
❌ Duas funções de cálculo
```

### NÃO é mostrar coins para todo mundo:
```
❌ Standalone vê: "Coleção: 15.000 coins"
❌ Cliente confuso: "Quanto é isso em dinheiro?"
```

### NÃO é esconder coins de todo mundo:
```
❌ Assinante vê: "Coleção: R$ 150"
❌ Perde gamificação e acumulação
```

---

## 🎯 RESUMO FINAL

### Backend (Desenvolvedor vê):
```
Tudo em COINS
├── Tabela: collection_base_pricing (coins)
├── Função: get_collection_price() → retorna coins
├── Função: purchase_with_coins(coins)
└── Admin configura: preços em coins
```

### Frontend (Cliente vê):

**Assinante:**
```
"Você tem 5.000 coins"
"Coleção: 4.000 coins"
[Comprar com Coins]
```

**Standalone:**
```
"Coleção: R$ 150"
"Entrada: R$ 100"
[Pagar R$ 100]
```

### Conversão (Automática):
```
Frontend Standalone → API → Converte R$ para coins → Backend processa em coins → API → Converte coins para R$ → Frontend mostra R$
```

---

## 💡 ANALOGIA SIMPLES

É como um banco internacional:

**Backend (Banco):** Tudo em dólares (USD)
- Todas contas em USD
- Todos cálculos em USD
- Sistema unificado

**Frontend (Caixa):**
- Cliente brasileiro: vê e paga em REAIS
- Cliente americano: vê e paga em DÓLARES
- Conversão automática e transparente

**Cliente brasileiro nunca vê dólares, mas banco trabalha em dólares internamente.**

---

## ❓ FICOU CLARO?

Se ainda não entendeu, me diga qual parte está confusa:
- [ ] Backend unificado em coins?
- [ ] Frontend mostrando reais?
- [ ] Conversão automática?
- [ ] Fluxo completo?
- [ ] Código de exemplo?
