# 🎯 Entendimento REAL do Sistema de Preços

## 📝 O Que Você Explicou

### Regra de Negócio:

**Quando o cliente assina:**
1. Ele ESCOLHE uma coleção (ou mais, dependendo do plano)
2. A coleção ESCOLHIDA tem um preço (ex: R$ 200)
3. As coleções NÃO ESCOLHIDAS têm outro preço (ex: R$ 300)
4. Catálogo tem preços divididos por modelo:
   - Modelo 1: R$ 300
   - Modelo 2: R$ 400

### Exemplo Prático:

**Plano Trimestral:**
- Cliente pode escolher 1 coleção
- Coleção escolhida: R$ 200
- Outras coleções: R$ 300

**Resultado:**
```
Cliente assina e escolhe "Vingadores"
├── Vingadores (escolhida): R$ 200
├── X-Men (não escolhida): R$ 300
├── Liga da Justiça (não escolhida): R$ 300
└── Catálogo
    ├── Modelo 1: R$ 300
    └── Modelo 2: R$ 400
```

---

## 🔍 Como Está Implementado HOJE

### Estrutura Atual do Banco

#### 1. Tabela `subscription_plans`
```sql
subscription_plans
├── plan_type ('trimestral', 'semestral', 'anual')
├── price_full (R$ 1000.00)
├── price_pix (R$ 900.00)
├── collections_count (quantas coleções pode escolher)
│   ├── Trimestral: 2 coleções
│   ├── Semestral: 3 coleções
│   └── Anual: -1 (todas)
└── deliveries_total (3, 7, 12)
```

**Dados Atuais:**
```sql
Trimestral: R$ 1000 (PIX: R$ 900) - 2 coleções - 3 entregas
Semestral:  R$ 2000 (PIX: R$ 1800) - 3 coleções - 7 entregas
Anual:      R$ 3600 (PIX: R$ 3240) - Todas coleções - 12 entregas
```

#### 2. Tabela `subscriptions`
```sql
subscriptions
├── user_id
├── collection_id (DEPRECATED - coleção principal escolhida)
├── plan_type
└── status
```

#### 3. Tabela `subscription_collections` (N:N)
```sql
subscription_collections
├── subscription_id
├── collection_id (coleções escolhidas pelo usuário)
└── added_at
```

**Exemplo:**
```
Assinatura #123 (Trimestral - 2 coleções)
├── subscription_collections
│   ├── Vingadores (escolhida)
│   └── X-Men (escolhida)
```

#### 4. Tabela `pricing_tiers` (Níveis de Preço)
```sql
pricing_tiers
├── name ("Nível 1", "Nível Premium")
├── price_full (R$ 700.00)
├── deposit_amount (R$ 100.00)
├── pix_discount_percentage (5%)
└── price_pix (R$ 665.00)
```

#### 5. Tabela `collection_tier_assignments`
```sql
collection_tier_assignments
├── collection_id
└── tier_id
```

---

## ❌ O Problema: Sistema NÃO Implementa a Regra de Negócio

### O Que Está Faltando:

#### 1. Preço Diferenciado por Status de Escolha
**Hoje:**
- Todas as coleções têm o mesmo preço (via `pricing_tiers`)
- Não há diferença entre "escolhida" e "não escolhida"

**Deveria ser:**
```
Coleção Vingadores
├── Se ESCOLHIDA na assinatura: R$ 200
└── Se NÃO ESCOLHIDA: R$ 300
```

#### 2. Preço por Tipo de Modelo no Catálogo
**Hoje:**
- Não existe categorização de modelos (Modelo 1, Modelo 2)
- Não há preços diferenciados por tipo de modelo

**Deveria ser:**
```
Catálogo
├── Modelo Tipo 1: R$ 300
└── Modelo Tipo 2: R$ 400
```

#### 3. Contexto de Preço
**Hoje:**
- Preço é fixo por coleção (via tier)
- Não depende do contexto (assinante ou não)

**Deveria ser:**
```
Preço = f(coleção, status_escolha, tipo_modelo, plano_usuario)
```

---

## 💡 Exemplos Reais do Que Deveria Acontecer

### Exemplo 1: Cliente com Plano Trimestral

**Situação:**
- João assina plano Trimestral
- Escolhe 1 coleção: "Vingadores"

**Preços que João vê:**

```
COLEÇÕES DISPONÍVEIS:

✅ Vingadores (ESCOLHIDA)
   └── Personagens: R$ 200 cada

❌ X-Men (NÃO ESCOLHIDA)
   └── Personagens: R$ 300 cada

❌ Liga da Justiça (NÃO ESCOLHIDA)
   └── Personagens: R$ 300 cada

📦 CATÁLOGO ABERTO:
   ├── Modelo Tipo 1: R$ 300
   └── Modelo Tipo 2: R$ 400
```

### Exemplo 2: Cliente com Plano Semestral

**Situação:**
- Maria assina plano Semestral
- Escolhe 3 coleções: "Vingadores", "X-Men", "Guardiões"

**Preços que Maria vê:**

```
COLEÇÕES DISPONÍVEIS:

✅ Vingadores (ESCOLHIDA)
   └── Personagens: R$ 200 cada

✅ X-Men (ESCOLHIDA)
   └── Personagens: R$ 200 cada

✅ Guardiões da Galáxia (ESCOLHIDA)
   └── Personagens: R$ 200 cada

❌ Liga da Justiça (NÃO ESCOLHIDA)
   └── Personagens: R$ 300 cada

❌ Homem-Aranha (NÃO ESCOLHIDA)
   └── Personagens: R$ 300 cada

📦 CATÁLOGO ABERTO:
   ├── Modelo Tipo 1: R$ 300
   └── Modelo Tipo 2: R$ 400
```

### Exemplo 3: Cliente SEM Assinatura

**Situação:**
- Pedro não tem assinatura ativa
- Quer comprar avulso

**Preços que Pedro vê:**

```
COLEÇÕES DISPONÍVEIS:

❌ Vingadores (SEM ASSINATURA)
   └── Personagens: R$ 300 cada

❌ X-Men (SEM ASSINATURA)
   └── Personagens: R$ 300 cada

❌ Liga da Justiça (SEM ASSINATURA)
   └── Personagens: R$ 300 cada

📦 CATÁLOGO ABERTO:
   ├── Modelo Tipo 1: R$ 300
   └── Modelo Tipo 2: R$ 400
```

---

## 🏗️ Estrutura de Dados Necessária

### Opção 1: Preços Contextuais (Recomendado)

```sql
-- Tabela de preços por contexto
CREATE TABLE collection_pricing_context (
  id UUID PRIMARY KEY,
  collection_id UUID REFERENCES collections(id),
  
  -- Contexto
  pricing_context TEXT CHECK (pricing_context IN (
    'subscribed_chosen',      -- Coleção escolhida na assinatura
    'subscribed_not_chosen',  -- Coleção não escolhida (mas tem assinatura)
    'no_subscription',        -- Sem assinatura (compra avulsa)
    'catalog_model_1',        -- Catálogo - Modelo Tipo 1
    'catalog_model_2'         -- Catálogo - Modelo Tipo 2
  )),
  
  -- Preço
  price DECIMAL(10,2) NOT NULL,
  
  -- Metadados
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemplo de dados
INSERT INTO collection_pricing_context VALUES
  -- Vingadores
  (gen_random_uuid(), 'vingadores-id', 'subscribed_chosen', 200.00, 'Preço para assinantes que escolheram esta coleção', true),
  (gen_random_uuid(), 'vingadores-id', 'subscribed_not_chosen', 300.00, 'Preço para assinantes que NÃO escolheram esta coleção', true),
  (gen_random_uuid(), 'vingadores-id', 'no_subscription', 300.00, 'Preço para não assinantes', true),
  
  -- X-Men
  (gen_random_uuid(), 'xmen-id', 'subscribed_chosen', 200.00, 'Preço para assinantes que escolheram esta coleção', true),
  (gen_random_uuid(), 'xmen-id', 'subscribed_not_chosen', 300.00, 'Preço para assinantes que NÃO escolheram esta coleção', true),
  (gen_random_uuid(), 'xmen-id', 'no_subscription', 300.00, 'Preço para não assinantes', true);

-- Tabela de tipos de modelo para catálogo
CREATE TABLE catalog_model_types (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  display_order INTEGER DEFAULT 0
);

INSERT INTO catalog_model_types VALUES
  (gen_random_uuid(), 'Modelo Tipo 1', 'Modelos padrão do catálogo', 300.00, 1),
  (gen_random_uuid(), 'Modelo Tipo 2', 'Modelos premium do catálogo', 400.00, 2);

-- Adicionar tipo de modelo aos personagens
ALTER TABLE collection_characters
ADD COLUMN model_type_id UUID REFERENCES catalog_model_types(id);
```

### Opção 2: Sistema de Tipos de Coleção (Mais Simples)

```sql
-- Adicionar tipo à coleção
ALTER TABLE collections
ADD COLUMN collection_type TEXT CHECK (collection_type IN (
  'subscription',  -- Coleção de assinatura
  'catalog_1',     -- Catálogo Modelo 1
  'catalog_2'      -- Catálogo Modelo 2
));

-- Tabela de preços por tipo e contexto
CREATE TABLE collection_type_pricing (
  collection_type TEXT,
  user_context TEXT CHECK (user_context IN (
    'subscribed_chosen',
    'subscribed_not_chosen',
    'no_subscription'
  )),
  price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (collection_type, user_context)
);

INSERT INTO collection_type_pricing VALUES
  -- Coleções de assinatura
  ('subscription', 'subscribed_chosen', 200.00),
  ('subscription', 'subscribed_not_chosen', 300.00),
  ('subscription', 'no_subscription', 300.00),
  
  -- Catálogo Modelo 1
  ('catalog_1', 'subscribed_chosen', 300.00),
  ('catalog_1', 'subscribed_not_chosen', 300.00),
  ('catalog_1', 'no_subscription', 300.00),
  
  -- Catálogo Modelo 2
  ('catalog_2', 'subscribed_chosen', 400.00),
  ('catalog_2', 'subscribed_not_chosen', 400.00),
  ('catalog_2', 'no_subscription', 400.00);
```

---

## 🔄 Lógica de Cálculo de Preço

### Função para Calcular Preço

```sql
CREATE OR REPLACE FUNCTION get_collection_price(
  p_collection_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(10,2) AS $
DECLARE
  v_price DECIMAL(10,2);
  v_is_subscribed BOOLEAN;
  v_is_chosen BOOLEAN;
  v_collection_type TEXT;
BEGIN
  -- 1. Verificar se usuário tem assinatura ativa
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
  ) INTO v_is_subscribed;
  
  -- 2. Verificar se coleção foi escolhida
  IF v_is_subscribed THEN
    SELECT EXISTS (
      SELECT 1 FROM subscription_collections sc
      JOIN subscriptions s ON s.id = sc.subscription_id
      WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND sc.collection_id = p_collection_id
    ) INTO v_is_chosen;
  ELSE
    v_is_chosen := false;
  END IF;
  
  -- 3. Buscar tipo da coleção
  SELECT collection_type INTO v_collection_type
  FROM collections
  WHERE id = p_collection_id;
  
  -- 4. Determinar contexto e buscar preço
  IF v_is_subscribed AND v_is_chosen THEN
    -- Assinante que escolheu esta coleção
    SELECT price INTO v_price
    FROM collection_type_pricing
    WHERE collection_type = v_collection_type
    AND user_context = 'subscribed_chosen';
    
  ELSIF v_is_subscribed AND NOT v_is_chosen THEN
    -- Assinante que NÃO escolheu esta coleção
    SELECT price INTO v_price
    FROM collection_type_pricing
    WHERE collection_type = v_collection_type
    AND user_context = 'subscribed_not_chosen';
    
  ELSE
    -- Sem assinatura
    SELECT price INTO v_price
    FROM collection_type_pricing
    WHERE collection_type = v_collection_type
    AND user_context = 'no_subscription';
  END IF;
  
  RETURN v_price;
END;
$ LANGUAGE plpgsql;
```

### Uso no Frontend

```typescript
// Buscar preço para um usuário específico
const { data: price } = await supabase
  .rpc('get_collection_price', {
    p_collection_id: 'vingadores-id',
    p_user_id: currentUser.id
  });

console.log(`Preço: R$ ${price}`);
// Se usuário escolheu Vingadores: R$ 200
// Se usuário NÃO escolheu Vingadores: R$ 300
// Se usuário não tem assinatura: R$ 300
```

---

## 📊 Comparação: Atual vs Necessário

| Aspecto | Sistema Atual | Sistema Necessário |
|---------|---------------|-------------------|
| Preço por coleção | ✅ Sim (via pricing_tiers) | ✅ Sim |
| Preço contextual | ❌ Não | ✅ Sim (escolhida vs não escolhida) |
| Tipos de modelo | ❌ Não existe | ✅ Sim (Modelo 1, Modelo 2) |
| Preço por tipo | ❌ Não | ✅ Sim (R$ 300, R$ 400) |
| Preço para assinante | ❌ Não diferencia | ✅ Sim (R$ 200 vs R$ 300) |
| Preço para não assinante | ❌ Não diferencia | ✅ Sim (R$ 300) |

---

## 🎯 Resumo do Entendimento

### O Que Você Quer:

1. **Coleções Escolhidas na Assinatura:** R$ 200
2. **Coleções NÃO Escolhidas (mas tem assinatura):** R$ 300
3. **Sem Assinatura:** R$ 300
4. **Catálogo Modelo 1:** R$ 300
5. **Catálogo Modelo 2:** R$ 400

### O Que Está Implementado Hoje:

1. ✅ Sistema de assinaturas com escolha de coleções
2. ✅ Tabela `subscription_collections` (N:N)
3. ✅ Sistema de preços via `pricing_tiers`
4. ❌ Preços NÃO mudam baseado em contexto
5. ❌ Não existe diferença entre "escolhida" e "não escolhida"
6. ❌ Não existe categorização de modelos (Tipo 1, Tipo 2)

### O Que Precisa Ser Implementado:

1. ✅ Adicionar `collection_type` (subscription, catalog_1, catalog_2)
2. ✅ Criar tabela `collection_type_pricing` (preços por contexto)
3. ✅ Criar função `get_collection_price()` (cálculo contextual)
4. ✅ Atualizar frontend para usar preços contextuais
5. ✅ Adicionar `model_type_id` aos personagens do catálogo

---

## 🚀 Próximo Passo

Quer que eu crie uma spec completa para implementar esse sistema de preços contextuais?
