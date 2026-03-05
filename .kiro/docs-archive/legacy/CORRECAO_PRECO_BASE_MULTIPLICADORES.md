# ✅ Correção: Sistema de Preço Base + Multiplicadores

## 🚨 Problema Identificado

### ❌ Sistema Atual (Rígido):

```sql
-- Preços fixos por contexto
('subscription', 'subscribed_chosen', 1000)
('subscription', 'subscribed_not_chosen', 1200)
('standard_catalog', 'subscribed_chosen', 1400)
('premium_catalog', 'subscribed_chosen', 1800)
```

**Problemas**:
- ❌ Difícil ajustar todos os preços de um tipo
- ❌ Sem flexibilidade para promoções globais
- ❌ Manutenção complexa (9 registros para atualizar)
- ❌ Inconsistência: se mudar base, precisa mudar todos os contextos

---

## ✅ Solução: Preço Base + Multiplicadores

### Conceito:

```
Preço Final = base_price_coins × context_multiplier
```

### Estrutura:

**1. Tabela de Preços Base (por tipo de coleção)**
```sql
collection_base_pricing
├── collection_type (PK)
├── base_price_coins
└── updated_at
```

**2. Tabela de Multiplicadores (por contexto)**
```sql
pricing_context_multipliers
├── user_context (PK)
├── multiplier (DECIMAL)
└── description
```

---

## 📊 Exemplo Prático

### Configuração:

**Preços Base:**
```
subscription:      1000 coins (base)
standard_catalog:  1400 coins (base)
premium_catalog:   1800 coins (base)
```

**Multiplicadores de Contexto:**
```
subscribed_chosen:     1.0  (100% - sem desconto)
subscribed_not_chosen: 1.2  (120% - acréscimo de 20%)
no_subscription:       1.2  (120% - acréscimo de 20%)
```

### Cálculo:

```
Subscription + Escolhida:
  1000 × 1.0 = 1000 coins ✅

Subscription + Não Escolhida:
  1000 × 1.2 = 1200 coins ✅

Standard Catalog (qualquer contexto):
  1400 × 1.0 = 1400 coins ✅

Premium Catalog (qualquer contexto):
  1800 × 1.0 = 1800 coins ✅
```

---

## 🎯 Benefícios

### 1. Ajuste Global Fácil

**Cenário**: Aumentar 10% em todos os preços de subscription

**Antes (Rígido)**:
```sql
-- Precisa atualizar 3 registros
UPDATE collection_type_pricing 
SET price_coins = 1100 
WHERE collection_type = 'subscription' AND user_context = 'subscribed_chosen';

UPDATE collection_type_pricing 
SET price_coins = 1320 
WHERE collection_type = 'subscription' AND user_context = 'subscribed_not_chosen';

UPDATE collection_type_pricing 
SET price_coins = 1320 
WHERE collection_type = 'subscription' AND user_context = 'no_subscription';
```

**Depois (Flexível)**:
```sql
-- Atualiza apenas 1 registro!
UPDATE collection_base_pricing 
SET base_price_coins = 1100 
WHERE collection_type = 'subscription';
```

### 2. Promoções Temporárias

**Cenário**: Black Friday - 20% de desconto para assinantes

**Antes**: Impossível sem alterar todos os preços manualmente

**Depois**:
```sql
-- Apenas ajusta o multiplicador!
UPDATE pricing_context_multipliers 
SET multiplier = 0.8 
WHERE user_context = 'subscribed_chosen';
```

### 3. Consistência Garantida

**Antes**: Risco de inconsistência
```
subscription + chosen: 1000
subscription + not_chosen: 1250  ← Erro! Deveria ser 1200
```

**Depois**: Sempre consistente
```
base: 1000
chosen: 1000 × 1.0 = 1000 ✅
not_chosen: 1000 × 1.2 = 1200 ✅ (sempre correto)
```

---

## 🗄️ Estrutura de Banco Atualizada

### 1. Tabela de Preços Base

```sql
CREATE TABLE collection_base_pricing (
  collection_type TEXT PRIMARY KEY CHECK (collection_type IN (
    'subscription',
    'standard_catalog',
    'premium_catalog'
  )),
  base_price_coins INTEGER NOT NULL CHECK (base_price_coins > 0),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE collection_base_pricing IS 
  'Preço base por tipo de coleção (antes de aplicar multiplicadores de contexto)';

COMMENT ON COLUMN collection_base_pricing.base_price_coins IS 
  'Preço base em COINS - será multiplicado pelo context_multiplier';
```

**Dados Iniciais:**
```sql
INSERT INTO collection_base_pricing (collection_type, base_price_coins, description) VALUES
  ('subscription', 1000, 'Preço base para coleções de assinatura'),
  ('standard_catalog', 1400, 'Preço base para catálogo padrão'),
  ('premium_catalog', 1800, 'Preço base para catálogo premium');
```

### 2. Tabela de Multiplicadores

```sql
CREATE TABLE pricing_context_multipliers (
  user_context TEXT PRIMARY KEY CHECK (user_context IN (
    'subscribed_chosen',
    'subscribed_not_chosen',
    'no_subscription'
  )),
  multiplier DECIMAL(4,2) NOT NULL CHECK (multiplier > 0),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pricing_context_multipliers IS 
  'Multiplicadores aplicados ao preço base baseado no contexto do usuário';

COMMENT ON COLUMN pricing_context_multipliers.multiplier IS 
  'Multiplicador aplicado ao base_price_coins (1.0 = 100%, 1.2 = 120%, 0.8 = 80%)';
```

**Dados Iniciais:**
```sql
INSERT INTO pricing_context_multipliers (user_context, multiplier, description) VALUES
  ('subscribed_chosen', 1.0, 'Preço cheio para coleção escolhida (sem acréscimo)'),
  ('subscribed_not_chosen', 1.2, 'Acréscimo de 20% para coleção não escolhida'),
  ('no_subscription', 1.2, 'Acréscimo de 20% para não assinantes');
```

### 3. Tabela de Histórico Atualizada

```sql
CREATE TABLE pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL CHECK (change_type IN ('base_price', 'multiplier')),
  collection_type TEXT,  -- NULL se for mudança de multiplier
  user_context TEXT,     -- NULL se for mudança de base_price
  old_value DECIMAL(10,2),
  new_value DECIMAL(10,2),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

COMMENT ON COLUMN pricing_history.change_type IS 
  'Tipo de mudança: base_price (preço base) ou multiplier (multiplicador de contexto)';
```

---

## 🔧 Função de Cálculo Atualizada

```sql
CREATE OR REPLACE FUNCTION get_collection_price(
  p_collection_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_collection_type TEXT;
  v_user_context TEXT;
  v_base_price_coins INTEGER;
  v_multiplier DECIMAL(4,2);
  v_final_price_coins INTEGER;
BEGIN
  -- 1. Buscar tipo da coleção
  SELECT collection_type INTO v_collection_type
  FROM collections
  WHERE id = p_collection_id;
  
  IF v_collection_type IS NULL THEN
    RAISE EXCEPTION 'Collection not found: %', p_collection_id;
  END IF;
  
  -- 2. Buscar preço base
  SELECT base_price_coins INTO v_base_price_coins
  FROM collection_base_pricing
  WHERE collection_type = v_collection_type
  AND is_active = true;
  
  IF v_base_price_coins IS NULL THEN
    RAISE EXCEPTION 'Base price not configured for type %', v_collection_type;
  END IF;
  
  -- 3. Determinar contexto do usuário
  IF p_user_id IS NULL THEN
    v_user_context := 'no_subscription';
  ELSE
    IF EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = p_user_id AND status = 'active'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM subscription_collections sc
        JOIN subscriptions s ON s.id = sc.subscription_id
        WHERE s.user_id = p_user_id
        AND s.status = 'active'
        AND sc.collection_id = p_collection_id
      ) THEN
        v_user_context := 'subscribed_chosen';
      ELSE
        v_user_context := 'subscribed_not_chosen';
      END IF;
    ELSE
      v_user_context := 'no_subscription';
    END IF;
  END IF;
  
  -- 4. Buscar multiplicador
  SELECT multiplier INTO v_multiplier
  FROM pricing_context_multipliers
  WHERE user_context = v_user_context
  AND is_active = true;
  
  IF v_multiplier IS NULL THEN
    RAISE EXCEPTION 'Multiplier not configured for context %', v_user_context;
  END IF;
  
  -- 5. Calcular preço final
  v_final_price_coins := ROUND(v_base_price_coins * v_multiplier);
  
  RETURN v_final_price_coins;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_collection_price IS 
  'Calcula preço final: base_price_coins × context_multiplier';
```

---

## 🎨 Interface Admin Atualizada

### Aba 1: Preços Base

```
┌─────────────────────────────────────────┐
│ Preços Base por Tipo de Coleção        │
├─────────────────────────────────────────┤
│ Tipo              │ Preço Base          │
├───────────────────┼─────────────────────┤
│ Assinatura        │ [1000] 🪙  [Salvar]│
│ Catálogo Padrão   │ [1400] 🪙  [Salvar]│
│ Catálogo Premium  │ [1800] 🪙  [Salvar]│
└─────────────────────────────────────────┘

💡 Dica: Alterar o preço base afeta todos os contextos
```

### Aba 2: Multiplicadores de Contexto

```
┌─────────────────────────────────────────┐
│ Multiplicadores por Contexto            │
├─────────────────────────────────────────┤
│ Contexto          │ Multiplicador       │
├───────────────────┼─────────────────────┤
│ Escolhida         │ [1.0]  (100%)       │
│ Não Escolhida     │ [1.2]  (120%)       │
│ Sem Assinatura    │ [1.2]  (120%)       │
└─────────────────────────────────────────┘

💡 Dica: 1.0 = preço cheio, 0.8 = 20% desconto, 1.2 = 20% acréscimo
```

### Aba 3: Preview de Preços

```
┌─────────────────────────────────────────────────────┐
│ Preview: Preços Finais Calculados                   │
├─────────────────────────────────────────────────────┤
│ Tipo         │ Escolhida │ Não Escolh │ Sem Assina │
├──────────────┼───────────┼────────────┼────────────┤
│ Assinatura   │ 1000 🪙   │ 1200 🪙    │ 1200 🪙    │
│              │ (1000×1.0)│ (1000×1.2) │ (1000×1.2) │
├──────────────┼───────────┼────────────┼────────────┤
│ Cat. Padrão  │ 1400 🪙   │ 1400 🪙    │ 1400 🪙    │
│              │ (1400×1.0)│ (1400×1.0) │ (1400×1.0) │
├──────────────┼───────────┼────────────┼────────────┤
│ Cat. Premium │ 1800 🪙   │ 1800 🪙    │ 1800 🪙    │
│              │ (1800×1.0)│ (1800×1.0) │ (1800×1.0) │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Casos de Uso Avançados

### Caso 1: Promoção de Fim de Ano

**Objetivo**: 15% de desconto para todos os assinantes

```sql
-- Ajustar multiplicador
UPDATE pricing_context_multipliers 
SET multiplier = 0.85 
WHERE user_context IN ('subscribed_chosen', 'subscribed_not_chosen');

-- Resultado automático:
-- subscription + chosen: 1000 × 0.85 = 850 coins
-- subscription + not_chosen: 1000 × 0.85 = 850 coins
```

### Caso 2: Aumento Geral de Preços

**Objetivo**: Aumentar 10% em todos os preços

```sql
-- Opção 1: Ajustar preços base
UPDATE collection_base_pricing 
SET base_price_coins = ROUND(base_price_coins * 1.1);

-- Opção 2: Ajustar multiplicadores
UPDATE pricing_context_multipliers 
SET multiplier = multiplier * 1.1;
```

### Caso 3: Catálogo Premium em Promoção

**Objetivo**: 25% de desconto no catálogo premium

```sql
-- Ajustar apenas o preço base do premium
UPDATE collection_base_pricing 
SET base_price_coins = 1350  -- era 1800, agora 1350 (25% off)
WHERE collection_type = 'premium_catalog';
```

---

## 🔄 Migração do Sistema Atual

### Passo 1: Criar Novas Tabelas

```sql
CREATE TABLE collection_base_pricing (...);
CREATE TABLE pricing_context_multipliers (...);
```

### Passo 2: Popular com Dados Atuais

```sql
-- Extrair preços base (usar o menor preço de cada tipo)
INSERT INTO collection_base_pricing 
SELECT 
  collection_type,
  MIN(price_coins) as base_price_coins,
  'Migrado do sistema antigo'
FROM collection_type_pricing
GROUP BY collection_type;

-- Calcular multiplicadores
INSERT INTO pricing_context_multipliers
SELECT 
  user_context,
  ROUND(price_coins::DECIMAL / base_price_coins, 2) as multiplier,
  'Calculado a partir dos preços antigos'
FROM collection_type_pricing ctp
JOIN collection_base_pricing cbp ON cbp.collection_type = ctp.collection_type;
```

### Passo 3: Validar Consistência

```sql
-- Verificar se os preços calculados batem com os antigos
SELECT 
  ctp.collection_type,
  ctp.user_context,
  ctp.price_coins as old_price,
  ROUND(cbp.base_price_coins * pcm.multiplier) as new_price,
  ctp.price_coins - ROUND(cbp.base_price_coins * pcm.multiplier) as diff
FROM collection_type_pricing ctp
JOIN collection_base_pricing cbp ON cbp.collection_type = ctp.collection_type
JOIN pricing_context_multipliers pcm ON pcm.user_context = ctp.user_context;
```

### Passo 4: Deprecar Tabela Antiga

```sql
-- Renomear tabela antiga (manter por segurança)
ALTER TABLE collection_type_pricing 
RENAME TO collection_type_pricing_deprecated;
```

---

## 📊 Comparação Final

### Antes (Rígido):

```
❌ 9 registros para manter (3 tipos × 3 contextos)
❌ Ajuste global = 9 UPDATEs
❌ Risco de inconsistência
❌ Sem flexibilidade para promoções
```

### Depois (Flexível):

```
✅ 3 preços base + 3 multiplicadores = 6 registros
✅ Ajuste global = 1 UPDATE
✅ Consistência garantida por cálculo
✅ Promoções fáceis (ajustar multiplicador)
✅ Manutenção simplificada
```

---

## 🎉 Conclusão

O sistema de **Preço Base + Multiplicadores** oferece:

1. **Flexibilidade**: Ajustes globais fáceis
2. **Consistência**: Cálculo automático garante coerência
3. **Manutenibilidade**: Menos registros para gerenciar
4. **Escalabilidade**: Fácil adicionar novos contextos
5. **Promoções**: Simples implementar descontos temporários

**Status**: ✅ Pronto para implementação

**Próximo Passo**: Atualizar spec com novo modelo!
