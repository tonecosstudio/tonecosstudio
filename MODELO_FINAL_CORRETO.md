# Modelo Final Correto - Sistema de Assinatura Ordax

## 🎯 CONCEITO CENTRAL

Cliente escolhe **COLEÇÃO ATIVA** e recebe automaticamente o personagem do mês dessa coleção.
Se quiser trocar para outra coleção, paga a diferença de preço em coins.

---

## 📖 EXEMPLO PRÁTICO COMPLETO

### Cenário: João assina Trimestral (600 coins)

#### PASSO 1: Escolha da Coleção Ativa
```
João acessa: /assinar

Escolhe: NARUTO como coleção ativa

Sistema registra:
✅ Coleção Ativa: Naruto
✅ Preço base: 200 coins/mês
✅ Saldo: 600 coins
✅ Duração: 3 meses
```

#### PASSO 2: Sistema Agenda Automaticamente
```
Sistema cria entregas AUTOMÁTICAS:

MARÇO 2026:
┌─────────────────────────────────────┐
│ 📅 Entrega #1                       │
│ 🥷 Naruto Uzumaki                   │
│ 📦 Coleção: Naruto (Ativa)          │
│ 💰 Custo: 200 coins                 │
│ 🤖 Agendado automaticamente         │
│ ✏️ [Trocar Personagem]              │
└─────────────────────────────────────┘

ABRIL 2026:
┌─────────────────────────────────────┐
│ 📅 Entrega #2                       │
│ 🦊 Sasuke Uchiha                    │
│ 📦 Coleção: Naruto (Ativa)          │
│ 💰 Custo: 200 coins                 │
│ 🤖 Agendado automaticamente         │
│ ✏️ [Trocar Personagem]              │
└─────────────────────────────────────┘

MAIO 2026:
┌─────────────────────────────────────┐
│ 📅 Entrega #3                       │
│ 👁️ Kakashi Hatake                   │
│ 📦 Coleção: Naruto (Ativa)          │
│ 💰 Custo: 200 coins                 │
│ 🤖 Agendado automaticamente         │
│ ✏️ [Trocar Personagem]              │
└─────────────────────────────────────┘

Total: 600 coins ✅
Saldo restante: 0 coins
```

**IMPORTANTE:**
- João NÃO precisa escolher nada
- Sistema já agendou tudo automaticamente
- João recebe Naruto, Sasuke e Kakashi (da coleção ativa)
- Custo: 200 coins cada (preço da coleção ativa)

#### PASSO 3: João Quer Trocar (Opcional)
```
Dia 10 de Março:

João decide que quer GOKU ao invés de Naruto em Março

João acessa: /painel-assinante
Clica em "Trocar Personagem" (Março)

Sistema mostra:
┌─────────────────────────────────────┐
│ ⚠️ TROCAR PERSONAGEM DE MARÇO       │
│                                     │
│ Atual (Automático):                 │
│ 🥷 Naruto (Coleção Naruto - Ativa)  │
│ 💰 200 coins                        │
│                                     │
│ Opções disponíveis em Março:        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🐉 Goku                         │ │
│ │ Coleção: Dragon Ball (Secundária)│ │
│ │ 💰 240 coins                    │ │
│ │ 📊 Diferença: +40 coins         │ │
│ │ [Escolher]                      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🦸 Homem-Aranha                 │ │
│ │ Coleção: Marvel (Catálogo Geral)│ │
│ │ 💰 300 coins                    │ │
│ │ 📊 Diferença: +100 coins        │ │
│ │ [Escolher]                      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🦊 Sasuke                       │ │
│ │ Coleção: Naruto (Ativa)         │ │
│ │ ⚠️ Não disponível em Março      │ │
│ │ (Disponível em Abril)           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancelar] [Confirmar Troca]        │
└─────────────────────────────────────┘

João escolhe: Goku (240 coins)

Sistema calcula:
- Custo original: 200 coins (Naruto)
- Novo custo: 240 coins (Goku)
- Diferença: +40 coins

Novo saldo:
- Total: 600 coins
- Março: 240 coins (Goku)
- Abril: 200 coins (Sasuke)
- Maio: 200 coins (Kakashi)
- Total gasto: 640 coins
- Saldo: -40 coins ❌

Sistema alerta:
┌─────────────────────────────────────┐
│ ⚠️ SALDO INSUFICIENTE               │
│                                     │
│ Você precisa de 40 coins extras     │
│                                     │
│ Opções:                             │
│ 1. Comprar 40 coins (R$ 20)        │
│ 2. Manter Naruto (200 coins)       │
│ 3. Trocar outro mês                │
│                                     │
│ [Comprar Coins] [Cancelar]          │
└─────────────────────────────────────┘

João compra 40 coins extras (R$ 20)

✅ Troca confirmada!
Novo cronograma:
- Março: Goku (240 coins)
- Abril: Sasuke (200 coins)
- Maio: Kakashi (200 coins)
Total: 640 coins
Saldo: 0 coins
```

---

## 🔄 FLUXO COMPLETO

### 1. Assinatura Inicial
```
Cliente assina → Escolhe coleção ativa → Sistema agenda automaticamente
```

### 2. Entregas Automáticas
```
Sistema agenda personagens da coleção ativa:
- Mês 1: Personagem 1 da coleção ativa (200 coins)
- Mês 2: Personagem 2 da coleção ativa (200 coins)
- Mês 3: Personagem 3 da coleção ativa (200 coins)

Cliente NÃO precisa fazer nada!
```

### 3. Troca Opcional (Até Dia 15)
```
Cliente pode trocar personagem de qualquer mês:
- Trocar para personagem de outra coleção
- Paga diferença de preço em coins
- Precisa ter saldo suficiente
```

### 4. Escolha Automática (Após Dia 15)
```
Se cliente não trocou nada:
→ Recebe personagens da coleção ativa (já agendados)

Se cliente trocou:
→ Recebe personagens trocados
```

---

## 💰 TABELA DE PREÇOS

### Coleção Ativa (Escolhida na Assinatura)
```
Preço: 200 coins/personagem
Exemplo: Naruto escolhido como ativa
- Naruto: 200 coins ✅
- Sasuke: 200 coins ✅
- Kakashi: 200 coins ✅
```

### Outras Coleções (Troca)

#### Coleção Secundária
```
Preço: 240 coins/personagem
Diferença: +40 coins
Exemplo: Dragon Ball
- Goku: 240 coins (+40)
- Vegeta: 240 coins (+40)
```

#### Catálogo Geral
```
Preço: 300 coins/personagem
Diferença: +100 coins
Exemplo: Marvel
- Homem-Aranha: 300 coins (+100)
- Homem de Ferro: 300 coins (+100)
```

#### Premium
```
Preço: 450 coins/personagem
Diferença: +250 coins
Exemplo: One Piece
- Luffy: 450 coins (+250)
- Zoro: 450 coins (+250)
```

---

## 📊 EXEMPLOS DE CENÁRIOS

### Cenário 1: Cliente Não Troca Nada
```
João assina Trimestral (600 coins) + Naruto (ativa)

Sistema agenda automaticamente:
- Março: Naruto (200 coins)
- Abril: Sasuke (200 coins)
- Maio: Kakashi (200 coins)

João não faz nada até dia 15

Resultado:
✅ João recebe Naruto, Sasuke e Kakashi
✅ Custo total: 600 coins
✅ Saldo: 0 coins
```

### Cenário 2: Cliente Troca 1 Mês
```
João assina Trimestral (600 coins) + Naruto (ativa)

Sistema agenda automaticamente:
- Março: Naruto (200 coins)
- Abril: Sasuke (200 coins)
- Maio: Kakashi (200 coins)

João troca Abril para Goku (Dragon Ball):
- Março: Naruto (200 coins)
- Abril: Goku (240 coins) ← Trocado
- Maio: Kakashi (200 coins)

Resultado:
✅ João recebe Naruto, Goku e Kakashi
⚠️ Custo total: 640 coins
❌ Saldo: -40 coins
→ João precisa comprar 40 coins extras (R$ 20)
```

### Cenário 3: Cliente Troca Todos os Meses
```
João assina Trimestral (600 coins) + Naruto (ativa)

Sistema agenda automaticamente:
- Março: Naruto (200 coins)
- Abril: Sasuke (200 coins)
- Maio: Kakashi (200 coins)

João troca todos:
- Março: Goku (Dragon Ball, 240 coins)
- Abril: Homem-Aranha (Marvel, 300 coins)
- Maio: Luffy (One Piece Premium, 450 coins)

Resultado:
❌ Custo total: 990 coins
❌ Saldo: -390 coins
→ João precisa comprar 390 coins extras (R$ 195)
→ OU escolher personagens mais baratos
```

### Cenário 4: Cliente Muda Coleção Ativa
```
João assina Trimestral (600 coins) + Naruto (ativa)

Sistema agenda automaticamente:
- Março: Naruto (200 coins)
- Abril: Sasuke (200 coins)
- Maio: Kakashi (200 coins)

Dia 5 de Março:
João muda coleção ativa para Dragon Ball

Sistema recalcula automaticamente:
- Março: Naruto (240 coins) ← Agora é secundária
- Abril: Vegeta (200 coins) ← Agora é ativa
- Maio: Piccolo (200 coins) ← Agora é ativa

Resultado:
⚠️ Custo total: 640 coins
❌ Saldo: -40 coins
→ João precisa comprar 40 coins extras
→ OU manter Naruto como ativa
```

---

## 🗓️ CRONOGRAMA DE LANÇAMENTOS

### Como Admin Define

```
ADMIN acessa: /admin/monthly-releases

Define personagens de cada coleção por mês:

COLEÇÃO NARUTO:
┌─────────────────────────────────────┐
│ Março 2026: Naruto Uzumaki          │
│ Abril 2026: Sasuke Uchiha           │
│ Maio 2026: Kakashi Hatake           │
│ Junho 2026: Itachi Uchiha           │
│ Julho 2026: Jiraiya                 │
└─────────────────────────────────────┘

COLEÇÃO DRAGON BALL:
┌─────────────────────────────────────┐
│ Março 2026: Goku                    │
│ Abril 2026: Vegeta                  │
│ Maio 2026: Piccolo                  │
│ Junho 2026: Gohan                   │
│ Julho 2026: Trunks                  │
└─────────────────────────────────────┘

COLEÇÃO MARVEL:
┌─────────────────────────────────────┐
│ Março 2026: Homem-Aranha            │
│ Abril 2026: Homem de Ferro          │
│ Maio 2026: Capitão América          │
│ Junho 2026: Thor                    │
│ Julho 2026: Hulk                    │
└─────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### Banco de Dados

```sql
-- 1. Tabela de lançamentos mensais
CREATE TABLE collection_monthly_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id),
  character_id UUID REFERENCES collection_characters(id),
  release_month TEXT NOT NULL,  -- '2026-03'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Atualizar tabela subscriptions
ALTER TABLE subscriptions 
ADD COLUMN active_collection_id UUID REFERENCES collections(id),
ADD COLUMN coins_balance INTEGER DEFAULT 0;

-- 3. Tabela de entregas (já existe, atualizar)
ALTER TABLE subscription_deliveries
ADD COLUMN original_character_id UUID REFERENCES collection_characters(id),
ADD COLUMN swapped_character_id UUID REFERENCES collection_characters(id),
ADD COLUMN coins_spent INTEGER DEFAULT 200,
ADD COLUMN is_swapped BOOLEAN DEFAULT false;

-- 4. Função para agendar entregas automaticamente
CREATE OR REPLACE FUNCTION schedule_subscription_deliveries(
  p_subscription_id UUID,
  p_active_collection_id UUID,
  p_start_month TEXT,
  p_duration_months INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_month TEXT;
  v_character_id UUID;
  v_delivery_number INTEGER := 1;
BEGIN
  -- Para cada mês da assinatura
  FOR i IN 0..(p_duration_months - 1) LOOP
    -- Calcular mês
    v_month := TO_CHAR(
      TO_DATE(p_start_month, 'YYYY-MM') + (i || ' months')::INTERVAL,
      'YYYY-MM'
    );
    
    -- Buscar personagem do mês da coleção ativa
    SELECT character_id INTO v_character_id
    FROM collection_monthly_releases
    WHERE collection_id = p_active_collection_id
      AND release_month = v_month
      AND is_active = true
    LIMIT 1;
    
    -- Criar entrega
    INSERT INTO subscription_deliveries (
      subscription_id,
      delivery_number,
      original_character_id,
      collection_id,
      delivery_month,
      coins_spent,
      status,
      is_swapped
    ) VALUES (
      p_subscription_id,
      v_delivery_number,
      v_character_id,
      p_active_collection_id,
      v_month,
      200,  -- Preço da coleção ativa
      'scheduled',
      false
    );
    
    v_delivery_number := v_delivery_number + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Lógica de Troca

```typescript
// Função para trocar personagem
async function swapCharacter(
  deliveryId: string,
  newCharacterId: string,
  activeCollectionId: string
) {
  // 1. Buscar entrega atual
  const delivery = await db.subscription_deliveries
    .findById(deliveryId);
  
  // 2. Buscar novo personagem
  const newCharacter = await db.collection_characters
    .findById(newCharacterId);
  
  // 3. Calcular preço contextual
  const newPrice = await db.rpc('get_collection_price', {
    character_id: newCharacterId,
    active_collection_id: activeCollectionId
  });
  
  // 4. Calcular diferença
  const originalPrice = delivery.coins_spent; // 200 (ativa)
  const priceDifference = newPrice - originalPrice;
  
  // 5. Verificar saldo
  const subscription = await db.subscriptions
    .findById(delivery.subscription_id);
  
  if (subscription.coins_balance < priceDifference) {
    throw new Error(`Saldo insuficiente. Faltam ${priceDifference - subscription.coins_balance} coins`);
  }
  
  // 6. Atualizar entrega
  await db.subscription_deliveries.update(deliveryId, {
    swapped_character_id: newCharacterId,
    collection_id: newCharacter.collection_id,
    coins_spent: newPrice,
    is_swapped: true
  });
  
  // 7. Atualizar saldo
  await db.subscriptions.update(subscription.id, {
    coins_balance: subscription.coins_balance - priceDifference
  });
  
  return {
    success: true,
    priceDifference,
    newBalance: subscription.coins_balance - priceDifference
  };
}
```

---

## ✅ RESUMO FINAL

### Como Funciona

1. **Cliente assina** → Escolhe coleção ativa
2. **Sistema agenda automaticamente** → Personagens da coleção ativa (200 coins cada)
3. **Cliente pode trocar** (opcional) → Paga diferença de preço
4. **Sistema produz** → 1 personagem por mês
5. **Cliente recebe** → Personagens escolhidos (ou automáticos)

### Preços

- **Coleção Ativa**: 200 coins (escolhida na assinatura)
- **Coleção Secundária**: 240 coins (+40 coins)
- **Catálogo Geral**: 300 coins (+100 coins)
- **Premium**: 450 coins (+250 coins)

### Vantagens

- ✅ Cliente não precisa escolher nada (automático)
- ✅ Cliente pode trocar se quiser (flexibilidade)
- ✅ Preços justos (paga menos pela coleção ativa)
- ✅ Cronograma previsível (1 personagem/mês)
- ✅ Upsell natural (quer personagem caro, compra coins)

---

Está correto agora?
