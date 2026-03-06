# Modelo Definitivo - Sistema de Assinatura Ordax

## 🎯 CONCEITO CORRETO

Cliente recebe **SALDO DE COINS** e escolhe **LIVREMENTE** qual personagem quer a cada mês.
Coleção ativa define apenas o **PREÇO PRIORITÁRIO** (200 coins), mas cliente pode escolher qualquer coleção.

---

## 📖 EXEMPLO PRÁTICO DEFINITIVO

### Cenário: João assina Trimestral (600 coins)

#### PASSO 1: Escolha da Coleção Ativa (Prioritária)
```
João acessa: /assinar

Escolhe: NARUTO como coleção ativa

O que isso significa:
✅ Personagens de Naruto custam 200 coins (preço prioritário)
⚠️ Personagens de outras coleções custam 240-450 coins
❌ NÃO significa que João vai receber só Naruto
❌ NÃO agenda nada automaticamente

Sistema registra:
- Coleção Ativa: Naruto
- Saldo inicial: 600 coins
- Duração: 3 meses
```

#### PASSO 2: Escolha do Personagem de Março
```
João acessa: /escolher-personagem-marco

Sistema mostra personagens disponíveis em Março:

┌─────────────────────────────────────┐
│ 🥷 NARUTO (Coleção Ativa)           │
│ Personagem de Março: Naruto Uzumaki│
│ 💰 200 coins ✅ (Preço prioritário) │
│ [Escolher]                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🐉 GOKU (Coleção Secundária)        │
│ Personagem de Março: Goku           │
│ 💰 240 coins (+40 vs ativa)         │
│ [Escolher]                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🦸 HOMEM-ARANHA (Catálogo Geral)    │
│ Personagem de Março: Homem-Aranha   │
│ 💰 300 coins (+100 vs ativa)        │
│ [Escolher]                          │
└─────────────────────────────────────┘

João escolhe: NARUTO (200 coins)

Sistema atualiza:
✅ Março: Naruto (200 coins)
💰 Saldo: 600 - 200 = 400 coins
📅 Faltam escolher: Abril e Maio
```

#### PASSO 3: Escolha do Personagem de Abril
```
João acessa: /escolher-personagem-abril

Sistema mostra personagens disponíveis em Abril:

┌─────────────────────────────────────┐
│ 🦊 SASUKE (Coleção Ativa)           │
│ Personagem de Abril: Sasuke Uchiha │
│ 💰 200 coins ✅ (Preço prioritário) │
│ [Escolher]                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🐉 VEGETA (Coleção Secundária)      │
│ Personagem de Abril: Vegeta         │
│ 💰 240 coins (+40 vs ativa)         │
│ [Escolher]                          │
└─────────────────────────────────────┘

João escolhe: VEGETA (240 coins)

Sistema atualiza:
✅ Março: Naruto (200 coins)
✅ Abril: Vegeta (240 coins)
💰 Saldo: 400 - 240 = 160 coins
📅 Falta escolher: Maio
```

#### PASSO 4: Escolha do Personagem de Maio
```
João acessa: /escolher-personagem-maio

Sistema mostra personagens disponíveis em Maio:

┌─────────────────────────────────────┐
│ 👁️ KAKASHI (Coleção Ativa)          │
│ Personagem de Maio: Kakashi Hatake │
│ 💰 200 coins ✅                     │
│ 💰 Seu saldo: 160 coins             │
│ ⚠️ Saldo insuficiente (faltam 40)   │
│ [Comprar 40 coins] [Escolher]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🐉 PICCOLO (Coleção Secundária)     │
│ Personagem de Maio: Piccolo         │
│ 💰 240 coins                        │
│ 💰 Seu saldo: 160 coins             │
│ ⚠️ Saldo insuficiente (faltam 80)   │
│ [Comprar 80 coins] [Escolher]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🦸 CAPITÃO AMÉRICA (Catálogo Geral) │
│ Personagem de Maio: Capitão América│
│ 💰 300 coins                        │
│ 💰 Seu saldo: 160 coins             │
│ ⚠️ Saldo insuficiente (faltam 140)  │
│ [Comprar 140 coins] [Escolher]      │
└─────────────────────────────────────┘

João tem 160 coins, mas:
- Kakashi (ativa) custa 200 coins → Faltam 40 coins
- Piccolo (secundária) custa 240 coins → Faltam 80 coins
- Capitão América (geral) custa 300 coins → Faltam 140 coins

Opções de João:
1. Comprar 40 coins extras (R$ 20) e escolher Kakashi
2. Comprar 80 coins extras (R$ 40) e escolher Piccolo
3. Refazer escolhas anteriores (voltar e trocar)
4. Não escolher nada (perde o mês)

João decide: Comprar 40 coins extras (R$ 20)

Sistema atualiza:
✅ Março: Naruto (200 coins)
✅ Abril: Vegeta (240 coins)
✅ Maio: Kakashi (200 coins)
💰 Saldo: 160 + 40 - 200 = 0 coins
📅 Todas as escolhas feitas!
```

---

## 💰 FLUXO DE SALDO DETALHADO

### Exemplo 1: Cliente Escolhe Só da Coleção Ativa
```
Saldo inicial: 600 coins

Março: Naruto (ativa, 200 coins)
→ Saldo: 600 - 200 = 400 coins

Abril: Sasuke (ativa, 200 coins)
→ Saldo: 400 - 200 = 200 coins

Maio: Kakashi (ativa, 200 coins)
→ Saldo: 200 - 200 = 0 coins

✅ Total gasto: 600 coins
✅ Saldo final: 0 coins
✅ Sem necessidade de compra extra
```

### Exemplo 2: Cliente Mistura Coleções
```
Saldo inicial: 600 coins

Março: Naruto (ativa, 200 coins)
→ Saldo: 600 - 200 = 400 coins

Abril: Goku (secundária, 240 coins)
→ Saldo: 400 - 240 = 160 coins

Maio: Kakashi (ativa, 200 coins)
→ Saldo necessário: 200 coins
→ Saldo disponível: 160 coins
→ Faltam: 40 coins ❌

Opções:
1. Comprar 40 coins (R$ 20)
2. Trocar Goku por Sasuke (ativa, 200 coins)
   → Novo saldo: 400 - 200 = 200 coins
   → Maio: Kakashi (200 coins)
   → Saldo final: 0 coins ✅
```

### Exemplo 3: Cliente Quer Personagens Caros
```
Saldo inicial: 600 coins

Março: Homem-Aranha (geral, 300 coins)
→ Saldo: 600 - 300 = 300 coins

Abril: Homem de Ferro (geral, 300 coins)
→ Saldo: 300 - 300 = 0 coins

Maio: Capitão América (geral, 300 coins)
→ Saldo necessário: 300 coins
→ Saldo disponível: 0 coins
→ Faltam: 300 coins ❌

Opções:
1. Comprar 300 coins (R$ 150)
2. Trocar escolhas anteriores
3. Escolher personagem mais barato (ativa, 200 coins)
   → Mas ainda falta 200 coins
4. Refazer tudo:
   - Março: Naruto (200)
   - Abril: Sasuke (200)
   - Maio: Kakashi (200)
   - Total: 600 coins ✅
```

---

## 🔄 SISTEMA DE ESCOLHA AUTOMÁTICA

### Se Cliente Não Escolher Até Dia 15

```
Cenário: João não escolheu nada até dia 15

DIA 16 - Sistema executa:

┌─────────────────────────────────────┐
│ 🤖 ESCOLHA AUTOMÁTICA               │
│                                     │
│ Você não escolheu personagens até  │
│ o prazo (15/03).                   │
│                                     │
│ Sistema escolheu automaticamente    │
│ personagens da sua COLEÇÃO ATIVA:   │
│                                     │
│ ✅ Março: Naruto (200 coins)        │
│ ✅ Abril: Sasuke (200 coins)        │
│ ✅ Maio: Kakashi (200 coins)        │
│                                     │
│ Total: 600 coins                   │
│ Saldo: 0 coins                     │
│                                     │
│ Todos da coleção Naruto (ativa)    │
└─────────────────────────────────────┘
```

**IMPORTANTE:**
- Sistema escolhe APENAS da coleção ativa (200 coins cada)
- Garante que o saldo (600 coins) seja suficiente
- Cliente recebe personagens da coleção que escolheu como prioritária

---

## 📊 TABELA DE PREÇOS CONTEXTUAL

### Baseado na Coleção Ativa

```
Cliente escolheu: NARUTO como ativa

┌──────────────────────┬─────────────┬──────────────┐
│ Coleção              │ Tipo        │ Preço        │
├──────────────────────┼─────────────┼──────────────┤
│ Naruto               │ Ativa       │ 200 coins ✅ │
│ Dragon Ball          │ Secundária  │ 240 coins    │
│ Marvel               │ Geral       │ 300 coins    │
│ One Piece            │ Premium     │ 450 coins    │
└──────────────────────┴─────────────┴──────────────┘

Se cliente mudar ativa para Dragon Ball:

┌──────────────────────┬─────────────┬──────────────┐
│ Coleção              │ Tipo        │ Preço        │
├──────────────────────┼─────────────┼──────────────┤
│ Dragon Ball          │ Ativa       │ 200 coins ✅ │
│ Naruto               │ Secundária  │ 240 coins    │
│ Marvel               │ Geral       │ 300 coins    │
│ One Piece            │ Premium     │ 450 coins    │
└──────────────────────┴─────────────┴──────────────┘
```

---

## 🔄 MUDANÇA DE COLEÇÃO ATIVA

### Cenário: João Quer Mudar Coleção Ativa

```
João escolheu inicialmente: Naruto (ativa)

Já escolheu:
- Março: Naruto (200 coins)
- Abril: Vegeta (240 coins)
Saldo: 160 coins

João quer mudar ativa para: Dragon Ball

Sistema recalcula preços:

ANTES (Naruto ativa):
- Março: Naruto (200 coins) ← Ativa
- Abril: Vegeta (240 coins) ← Secundária

DEPOIS (Dragon Ball ativa):
- Março: Naruto (240 coins) ← Agora é secundária
- Abril: Vegeta (200 coins) ← Agora é ativa

Novo cálculo:
- Março: 240 coins (era 200, +40)
- Abril: 200 coins (era 240, -40)
- Total: 440 coins (era 440, sem mudança)
- Saldo: 600 - 440 = 160 coins ✅

Neste caso, não há diferença no total!
Mas se João já tivesse escolhido 2 Narutos:

ANTES (Naruto ativa):
- Março: Naruto (200)
- Abril: Sasuke (200)
- Total: 400 coins

DEPOIS (Dragon Ball ativa):
- Março: Naruto (240)
- Abril: Sasuke (240)
- Total: 480 coins
- Diferença: +80 coins ❌

João precisaria:
1. Comprar 80 coins extras
2. OU manter Naruto como ativa
3. OU trocar escolhas
```

---

## 🎯 DIFERENÇAS FUNDAMENTAIS

### ❌ O QUE NÃO É

```
Sistema NÃO agenda automaticamente
Sistema NÃO força cliente a escolher da coleção ativa
Sistema NÃO limita escolhas
```

### ✅ O QUE É

```
Cliente recebe SALDO DE COINS (600)
Cliente escolhe LIVREMENTE qual personagem quer
Coleção ativa define PREÇO PRIORITÁRIO (200 coins)
Cliente pode escolher de QUALQUER coleção
Cliente paga DIFERENÇA se escolher outra coleção
```

---

## 📝 RESUMO DEFINITIVO

### Como Funciona

1. **Cliente assina** → Recebe 600 coins de saldo
2. **Cliente escolhe coleção ativa** → Define preço prioritário (200 coins)
3. **Cliente escolhe personagens** → Usa coins do saldo
4. **Sistema desconta** → Saldo diminui a cada escolha
5. **Se saldo acabar** → Cliente compra coins extras ou refaz escolhas

### Preços

- **Coleção Ativa**: 200 coins (escolhida como prioritária)
- **Coleção Secundária**: 240 coins (+40 coins)
- **Catálogo Geral**: 300 coins (+100 coins)
- **Premium**: 450 coins (+250 coins)

### Exemplos de Gastos

```
Plano Trimestral: 600 coins

Opção 1: Só ativa
- 3x personagens ativa (200 cada) = 600 coins ✅

Opção 2: Mix
- 2x ativa (200) + 1x secundária (240) = 640 coins
- Faltam 40 coins → Comprar R$ 20

Opção 3: Só geral
- 2x geral (300 cada) = 600 coins ✅
- Sobra para 3º mês: 0 coins → Precisa comprar

Opção 4: Premium
- 1x premium (450) + 1x ativa (200) = 650 coins
- Faltam 50 coins → Comprar R$ 25
- Sobra para 3º mês: -50 coins → Precisa comprar mais
```

### Vantagens

- ✅ Cliente tem controle total (escolhe o que quer)
- ✅ Flexibilidade total (pode misturar coleções)
- ✅ Preços justos (paga menos pela coleção ativa)
- ✅ Transparência (vê saldo em tempo real)
- ✅ Upsell natural (quer personagem caro, compra coins)

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### Banco de Dados

```sql
-- 1. Atualizar subscriptions
ALTER TABLE subscriptions 
ADD COLUMN active_collection_id UUID REFERENCES collections(id),
ADD COLUMN coins_balance INTEGER DEFAULT 0,
ADD COLUMN coins_initial INTEGER DEFAULT 0;

-- 2. Tabela de escolhas mensais
CREATE TABLE subscription_monthly_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  character_id UUID REFERENCES collection_characters(id),
  collection_id UUID REFERENCES collections(id),
  delivery_month TEXT NOT NULL,  -- '2026-03'
  coins_spent INTEGER NOT NULL,
  selected_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending'  -- pending, confirmed, produced, delivered
);

-- 3. Trigger para atualizar saldo
CREATE OR REPLACE FUNCTION update_subscription_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar saldo da assinatura
  UPDATE subscriptions
  SET coins_balance = coins_initial - (
    SELECT COALESCE(SUM(coins_spent), 0)
    FROM subscription_monthly_selections
    WHERE subscription_id = NEW.subscription_id
  )
  WHERE id = NEW.subscription_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance
AFTER INSERT OR UPDATE OR DELETE ON subscription_monthly_selections
FOR EACH ROW EXECUTE FUNCTION update_subscription_balance();
```

### Interface

```typescript
// Página de escolha mensal
function MonthlyCharacterSelection({ month, subscription }) {
  const activeCollectionId = subscription.active_collection_id;
  const currentBalance = subscription.coins_balance;
  
  // Buscar personagens disponíveis no mês
  const characters = await getMonthlyCharacters(month);
  
  // Calcular preço contextual para cada personagem
  const charactersWithPrices = characters.map(char => ({
    ...char,
    price: getContextualPrice(char.id, activeCollectionId),
    canAfford: currentBalance >= getContextualPrice(char.id, activeCollectionId)
  }));
  
  return (
    <div>
      <h2>Escolha seu personagem de {month}</h2>
      <p>Saldo disponível: {currentBalance} coins</p>
      
      {charactersWithPrices.map(char => (
        <CharacterCard
          key={char.id}
          character={char}
          price={char.price}
          canAfford={char.canAfford}
          isActive={char.collection_id === activeCollectionId}
          onSelect={() => selectCharacter(char.id, char.price)}
        />
      ))}
    </div>
  );
}
```

---

Agora está 100% correto?
