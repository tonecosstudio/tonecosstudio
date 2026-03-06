# Sistema de Preços Contextuais - Design Técnico

## 📐 Arquitetura Geral

### Visão de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                     CAMADA DE APRESENTAÇÃO                   │
├─────────────────────────────────────────────────────────────┤
│  AdminPlansConfiguration  │  CollectionCatalog  │  UserDash │
│  (Config preços)          │  (Exibe preços)     │  (Escolhe)│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     CAMADA DE LÓGICA                         │
├─────────────────────────────────────────────────────────────┤
│  usePricingContext()  │  useCollectionPrice()  │  Validações│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     CAMADA DE DADOS                          │
├─────────────────────────────────────────────────────────────┤
│  get_collection_price()  │  RPC Functions  │  Supabase API │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     BANCO DE DADOS                           │
├─────────────────────────────────────────────────────────────┤
│  collections  │  collection_type_pricing  │  subscriptions  │
└─────────────────────────────────────────────────────────────┘
```

### Princípios de Design

1. **Single Source of Truth**: Preços definidos uma vez, calculados dinamicamente
2. **Separation of Concerns**: Lógica de preço isolada em funções específicas
3. **Performance First**: Cache e índices para cálculos rápidos
4. **Type Safety**: TypeScript em todo o código
5. **Clean Code**: Sem gambiarras, código profissional

## 🗄️ Modelo de Dados

### Diagrama ER

```
collection_types (nova - tipos dinâmicos)
├── id (PK)
├── name (UNIQUE)
├── display_name
├── description
├── is_active
└── sort_order

collections                    collection_base_pricing
├── id (PK)                   ├── collection_type_id (PK, FK)
├── name                      ├── base_price_coins
├── collection_type_id ───┐   └── updated_at
└── ...                   │
                          └──────→ collection_types.id
                       
pricing_context_multipliers
├── user_context (PK)
├── multiplier
└── updated_at

Cálculo: final_price = base_price_coins × multiplier
                       
subscription_collections       subscriptions
├── subscription_id (FK) ──→  ├── id (PK)
├── collection_id (FK) ────→  ├── user_id (FK)
└── added_at                  ├── plan_id (FK)
                              └── status

subscription_plans
├── id (PK)
├── plan_type
├── collections_count
└── ...
```


### Tabelas Novas

#### 1. `collection_types` (Nova - Tipos Dinâmicos)
**Descrição**: Tipos de coleção configuráveis dinamicamente (permite expansão futura sem código)

```sql
CREATE TABLE collection_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,  -- Identificador técnico (ex: 'subscription', 'rare_catalog')
  display_name TEXT NOT NULL,  -- Nome para exibição (ex: 'Assinatura', 'Catálogo Raro')
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,  -- Ordem de exibição
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collection_types_active ON collection_types(is_active);
CREATE INDEX idx_collection_types_sort ON collection_types(sort_order);

COMMENT ON TABLE collection_types IS 
  'Tipos de coleção configuráveis dinamicamente - permite criar novos tipos sem alterar código';

COMMENT ON COLUMN collection_types.name IS 
  'Identificador técnico único (snake_case, usado no código)';

COMMENT ON COLUMN collection_types.display_name IS 
  'Nome amigável para exibição na interface admin e usuário';

COMMENT ON COLUMN collection_types.sort_order IS 
  'Ordem de exibição (menor = primeiro)';
```

**Dados Iniciais**:
```sql
INSERT INTO collection_types (name, display_name, description, sort_order) VALUES
  ('subscription', 'Assinatura', 'Coleções incluídas em planos de assinatura', 1),
  ('standard_catalog', 'Catálogo Padrão', 'Coleções do catálogo com preço intermediário', 2),
  ('premium_catalog', 'Catálogo Premium', 'Coleções premium com preço mais alto', 3);
```

**Benefícios**:
- ✅ Admin pode criar novos tipos pela interface (ex: 'rare_catalog', 'seasonal_catalog')
- ✅ Tipos podem ser ativados/desativados dinamicamente
- ✅ Ordem de exibição configurável
- ✅ Escalável para qualquer cenário futuro sem código

#### 2. `collection_base_pricing`
**Descrição**: Armazena preço base por tipo de coleção (antes de aplicar multiplicadores)

```sql
CREATE TABLE collection_base_pricing (
  collection_type_id UUID PRIMARY KEY REFERENCES collection_types(id) ON DELETE CASCADE,
  base_price_coins INTEGER NOT NULL CHECK (base_price_coins > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_base_pricing_active ON collection_base_pricing(is_active);

COMMENT ON TABLE collection_base_pricing IS 
  'Preço base por tipo de coleção (referencia collection_types dinamicamente)';

COMMENT ON COLUMN collection_base_pricing.collection_type_id IS 
  'Referência ao tipo de coleção (UUID) - permite tipos dinâmicos';

COMMENT ON COLUMN collection_base_pricing.base_price_coins IS 
  'Preço base em COINS - será multiplicado pelo context_multiplier para obter preço final';
```

**Índices**:
- PK automático em collection_type_id
- Índice em is_active para queries de preços ativos

**Dados Iniciais (em COINS)**:
```sql
INSERT INTO collection_base_pricing (collection_type_id, base_price_coins)
SELECT id, 
  CASE name
    WHEN 'subscription' THEN 1000
    WHEN 'standard_catalog' THEN 1400
    WHEN 'premium_catalog' THEN 1800
  END
FROM collection_types;
```

#### 2. `pricing_context_multipliers`
**Descrição**: Multiplicadores aplicados ao preço base baseado no contexto do usuário

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
  'Multiplicador aplicado ao base_price_coins (1.0 = 100%, 1.2 = 120%, 0.8 = 80% desconto)';
```

**Índices**:
- PK automático em user_context
- Índice em is_active para queries de multiplicadores ativos

**Dados Iniciais**:
```sql
INSERT INTO pricing_context_multipliers (user_context, multiplier, description) VALUES
  ('subscribed_chosen', 1.0, 'Preço cheio para coleção escolhida (sem acréscimo)'),
  ('subscribed_not_chosen', 1.2, 'Acréscimo de 20% para coleção não escolhida'),
  ('no_subscription', 1.2, 'Acréscimo de 20% para não assinantes');
```

**Fórmula de Cálculo**:
```
Preço Final = base_price_coins × multiplier
```

**Exemplos**:
```
subscription + chosen:     1000 × 1.0 = 1000 coins
subscription + not_chosen: 1000 × 1.2 = 1200 coins
standard_catalog:          1400 × 1.0 = 1400 coins
premium_catalog:           1800 × 1.0 = 1800 coins
```

#### 3. `pricing_history`
**Descrição**: Auditoria de mudanças de preço base e multiplicadores

```sql
CREATE TABLE pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL CHECK (change_type IN ('base_price', 'multiplier')),
  collection_type_id UUID REFERENCES collection_types(id),  -- NULL se for mudança de multiplier
  user_context TEXT,     -- NULL se for mudança de base_price
  old_value DECIMAL(10,2),
  new_value DECIMAL(10,2) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

COMMENT ON TABLE pricing_history IS 
  'Histórico de mudanças em preços base e multiplicadores de contexto';

COMMENT ON COLUMN pricing_history.change_type IS 
  'Tipo de mudança: base_price (preço base) ou multiplier (multiplicador de contexto)';

COMMENT ON COLUMN pricing_history.collection_type_id IS 
  'Referência ao tipo de coleção (UUID) - NULL se mudança de multiplier';

COMMENT ON COLUMN pricing_history.old_value IS 
  'Valor anterior (coins para base_price, decimal para multiplier)';

COMMENT ON COLUMN pricing_history.new_value IS 
  'Novo valor (coins para base_price, decimal para multiplier)';
```

**Índices**:
- Índice em change_type para filtrar por tipo de mudança
- Índice em (collection_type_id, change_type) para histórico de preços base
- Índice em (user_context, change_type) para histórico de multiplicadores
- Índice em changed_at DESC para ordenação
- Índice em changed_by para auditoria por admin

### Tabelas Modificadas

#### 1. `collections`
**Alteração**: Adicionar campo `collection_type_id` (UUID FK para collection_types)

```sql
-- Adicionar coluna com FK
ALTER TABLE collections
ADD COLUMN collection_type_id UUID REFERENCES collection_types(id);

-- Migrar dados existentes (atribuir tipo 'subscription' por padrão)
UPDATE collections c
SET collection_type_id = ct.id
FROM collection_types ct
WHERE ct.name = 'subscription';

-- Tornar obrigatório
ALTER TABLE collections ALTER COLUMN collection_type_id SET NOT NULL;

-- Criar índice
CREATE INDEX idx_collections_type_id ON collections(collection_type_id);
```

**Migração de Dados**:
- Coleções existentes recebem tipo `subscription` por padrão
- Admin pode alterar manualmente se necessário
- Tipos são referenciados por UUID (flexível para expansão)

#### 2. `subscription_plans`
**Alteração**: Campo `collections_count` já existe, apenas garantir uso correto

```sql
-- Já existe, apenas documentar uso:
-- collections_count: 
--   -1 = ilimitado (todas as coleções)
--   N > 0 = limite de N coleções
```

## 🔧 Funções de Banco de Dados

### 1. `get_collection_price()`
**Descrição**: Calcula preço contextual para uma coleção usando preço base × multiplicador

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
  
  -- 5. Calcular preço final: base × multiplicador
  v_final_price_coins := ROUND(v_base_price_coins * v_multiplier);
  
  RETURN v_final_price_coins;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_collection_price IS 
  'Calcula preço da coleção em COINS usando: base_price_coins × context_multiplier';
```

### 2. `get_character_price()`
**Descrição**: Calcula preço de um personagem específico em COINS

```sql
CREATE OR REPLACE FUNCTION get_character_price(
  p_character_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_collection_id UUID;
  v_character_price_coins INTEGER;
BEGIN
  -- 1. Buscar coleção do personagem
  SELECT collection_id INTO v_collection_id
  FROM characters
  WHERE id = p_character_id;
  
  IF v_collection_id IS NULL THEN
    RAISE EXCEPTION 'Character not found: %', p_character_id;
  END IF;
  
  -- 2. Calcular preço usando a função de coleção
  v_character_price_coins := get_collection_price(v_collection_id, p_user_id);
  
  RETURN v_character_price_coins;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_character_price IS 
  'Calcula preço de um personagem em COINS baseado no preço contextual da coleção';
```

**Hierarquia de Preços**:
```
1. Tipo de Coleção → Preço Base (ex: subscription = 1000 coins)
2. Contexto do Usuário → Multiplicador (ex: chosen = 1.0)
3. Cálculo: base × multiplicador = preço da coleção
4. Personagem herda o preço da coleção
```

**Exemplo**:
```sql
-- Preço da coleção
SELECT get_collection_price('collection-uuid', 'user-uuid');
-- Retorna: 1000 coins (subscription × chosen)

-- Preço do personagem (mesmo valor)
SELECT get_character_price('character-uuid', 'user-uuid');
-- Retorna: 1000 coins (herda da coleção)
```

**Performance**:
- STABLE: Permite cache dentro da mesma transação
- Índices em collections(id), subscriptions(user_id, status)
- Índice em subscription_collections(subscription_id, collection_id)
- Índice em collection_base_pricing(collection_type, is_active)
- Índice em pricing_context_multipliers(user_context, is_active)
- Índice em characters(id, collection_id)

### 2. `validate_collection_limit()`
**Descrição**: Valida se usuário pode escolher mais coleções

```sql
CREATE OR REPLACE FUNCTION validate_collection_limit(
  p_user_id UUID,
  p_new_collection_id UUID DEFAULT NULL
)
RETURNS TABLE (
  can_add BOOLEAN,
  current_count INTEGER,
  max_count INTEGER,
  message TEXT
) AS $
DECLARE
  v_plan_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Buscar limite do plano
  SELECT sp.collections_count INTO v_plan_limit
  FROM subscriptions s
  JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE s.user_id = p_user_id
  AND s.status = 'active'
  LIMIT 1;
  
  IF v_plan_limit IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'No active subscription found';
    RETURN;
  END IF;
  
  -- Contar coleções atuais
  SELECT COUNT(*) INTO v_current_count
  FROM subscription_collections sc
  JOIN subscriptions s ON s.id = sc.subscription_id
  WHERE s.user_id = p_user_id
  AND s.status = 'active';
  
  -- Verificar limite
  IF v_plan_limit = -1 THEN
    -- Ilimitado
    RETURN QUERY SELECT true, v_current_count, -1, 'Unlimited collections';
  ELSIF v_current_count < v_plan_limit THEN
    -- Pode adicionar
    RETURN QUERY SELECT true, v_current_count, v_plan_limit, 
      format('Can add %s more collection(s)', v_plan_limit - v_current_count);
  ELSE
    -- Limite atingido
    RETURN QUERY SELECT false, v_current_count, v_plan_limit,
      format('Limit reached: %s of %s collections', v_current_count, v_plan_limit);
  END IF;
END;
$ LANGUAGE plpgsql STABLE;
```

### 3. `validate_collection_limit()`
**Descrição**: Atualiza preço base e registra histórico

```sql
CREATE OR REPLACE FUNCTION update_base_price_with_history(
  p_collection_type TEXT,
  p_new_base_price_coins INTEGER,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_old_base_price_coins INTEGER;
BEGIN
  -- Buscar preço base atual
  SELECT base_price_coins INTO v_old_base_price_coins
  FROM collection_base_pricing
  WHERE collection_type = p_collection_type;
  
  -- Atualizar preço base
  UPDATE collection_base_pricing
  SET base_price_coins = p_new_base_price_coins,
      updated_at = NOW()
  WHERE collection_type = p_collection_type;
  
  -- Registrar histórico
  INSERT INTO pricing_history (
    change_type,
    collection_type,
    user_context,
    old_value,
    new_value,
    changed_by,
    reason
  ) VALUES (
    'base_price',
    p_collection_type,
    NULL,  -- NULL para mudanças de base_price
    v_old_base_price_coins,
    p_new_base_price_coins,
    p_admin_id,
    p_reason
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_base_price_with_history IS 
  'Atualiza preço base de um tipo de coleção e registra no histórico';
```

### 4. `update_base_price_with_history()`
**Descrição**: Atualiza multiplicador de contexto e registra histórico

```sql
CREATE OR REPLACE FUNCTION update_multiplier_with_history(
  p_user_context TEXT,
  p_new_multiplier DECIMAL(4,2),
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_old_multiplier DECIMAL(4,2);
BEGIN
  -- Buscar multiplicador atual
  SELECT multiplier INTO v_old_multiplier
  FROM pricing_context_multipliers
  WHERE user_context = p_user_context;
  
  -- Atualizar multiplicador
  UPDATE pricing_context_multipliers
  SET multiplier = p_new_multiplier,
      updated_at = NOW()
  WHERE user_context = p_user_context;
  
  -- Registrar histórico
  INSERT INTO pricing_history (
    change_type,
    collection_type,
    user_context,
    old_value,
    new_value,
    changed_by,
    reason
  ) VALUES (
    'multiplier',
    NULL,  -- NULL para mudanças de multiplier
    p_user_context,
    v_old_multiplier,
    p_new_multiplier,
    p_admin_id,
    p_reason
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_multiplier_with_history IS 
  'Atualiza multiplicador de contexto e registra no histórico';
```

### 6. `purchase_character()` (Nova - Integração com Sistema de Coins)
**Descrição**: Integra cálculo de preço contextual com débito de coins para comprar personagem

```sql
CREATE OR REPLACE FUNCTION purchase_character(
  p_user_id UUID,
  p_character_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance INTEGER
) AS $$
DECLARE
  v_price INTEGER;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 1. Calcular preço contextual
  v_price := get_character_price(p_character_id, p_user_id);
  
  -- 2. Verificar saldo
  SELECT balance INTO v_balance
  FROM user_coins
  WHERE user_id = p_user_id;
  
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 'Usuário não possui saldo de coins', 0;
    RETURN;
  END IF;
  
  IF v_balance < v_price THEN
    RETURN QUERY SELECT false, 
      format('Saldo insuficiente. Necessário: %s coins, Disponível: %s coins', v_price, v_balance),
      v_balance;
    RETURN;
  END IF;
  
  -- 3. Verificar se já possui o personagem
  IF EXISTS (
    SELECT 1 FROM user_characters
    WHERE user_id = p_user_id AND character_id = p_character_id
  ) THEN
    RETURN QUERY SELECT false, 'Você já possui este personagem', v_balance;
    RETURN;
  END IF;
  
  -- 4. Debitar coins (atômico)
  UPDATE user_coins
  SET balance = balance - v_price,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- 5. Registrar transação
  INSERT INTO coin_transactions (user_id, amount, type, reference_id, description)
  VALUES (
    p_user_id,
    -v_price,
    'character_purchase',
    p_character_id,
    format('Compra de personagem - %s coins', v_price)
  );
  
  -- 6. Adicionar personagem ao usuário
  INSERT INTO user_characters (user_id, character_id, acquired_at)
  VALUES (p_user_id, p_character_id, NOW());
  
  -- 7. Retornar sucesso
  RETURN QUERY SELECT true, 
    format('Personagem adquirido com sucesso! Novo saldo: %s coins', v_new_balance),
    v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION purchase_character IS 
  'Integra sistema de preços contextuais com sistema de coins para comprar personagem atomicamente';
```

**Características**:
- ✅ **Atômico**: Toda a operação é uma transação (tudo ou nada)
- ✅ **Validações**: Saldo, personagem já possui, personagem existe
- ✅ **Integração**: Usa `get_character_price()` para calcular preço contextual
- ✅ **Histórico**: Registra transação em `coin_transactions`
- ✅ **Feedback**: Retorna mensagem clara de sucesso ou erro

**Exemplo de Uso**:
```sql
-- Comprar personagem
SELECT * FROM purchase_character('user-uuid', 'character-uuid');

-- Resultado (sucesso):
-- success | message                                      | new_balance
-- true    | Personagem adquirido com sucesso! Novo...   | 4000

-- Resultado (saldo insuficiente):
-- success | message                                      | new_balance
-- false   | Saldo insuficiente. Necessário: 1000...     | 500
```

### 7. `update_multiplier_with_history()`

### Estrutura de Componentes

```
src/
├── pages/
│   └── admin/
│       └── AdminPlansConfiguration.tsx (atualizado)
├── components/
│   └── admin/
│       ├── ContextualPricingManager.tsx (novo)
│       ├── BasePricingTable.tsx (novo)
│       ├── MultipliersTable.tsx (novo)
│       ├── PricingPreviewTable.tsx (novo)
│       ├── CollectionLimitConfig.tsx (novo)
│       └── PricingHistoryModal.tsx (novo)
├── hooks/
│   ├── useBasePricing.ts (novo)
│   ├── useContextMultipliers.ts (novo)
│   ├── useCollectionPrice.ts (novo)
│   ├── useCharacterPrice.ts (novo)
│   └── useCollectionLimit.ts (novo)
└── services/
    └── pricing-service.ts (novo)
```


### 1. ContextualPricingManager (Novo)
**Localização**: `src/components/admin/ContextualPricingManager.tsx`

**Responsabilidade**: Gerenciar configuração de preços base e multiplicadores

**Props**:
```typescript
interface ContextualPricingManagerProps {
  onPriceUpdate?: () => void;
}
```

**Estado**:
```typescript
const [basePrices, setBasePrices] = useState<BasePricing[]>([]);
const [multipliers, setMultipliers] = useState<ContextMultiplier[]>([]);
const [activeTab, setActiveTab] = useState<'base' | 'multipliers' | 'preview'>('base');
const [showHistory, setShowHistory] = useState(false);
```

**Estrutura**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Preços Contextuais</CardTitle>
    <CardDescription>Configure preços base e multiplicadores</CardDescription>
  </CardHeader>
  <CardContent>
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="base">Preços Base</TabsTrigger>
        <TabsTrigger value="multipliers">Multiplicadores</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      
      <TabsContent value="base">
        <BasePricingTable 
          prices={basePrices}
          onUpdate={handleUpdateBasePrice}
        />
      </TabsContent>
      
      <TabsContent value="multipliers">
        <MultipliersTable 
          multipliers={multipliers}
          onUpdate={handleUpdateMultiplier}
        />
      </TabsContent>
      
      <TabsContent value="preview">
        <PricingPreviewTable 
          basePrices={basePrices}
          multipliers={multipliers}
        />
      </TabsContent>
    </Tabs>
    
    <Button onClick={() => setShowHistory(true)}>
      Ver Histórico
    </Button>
  </CardContent>
</Card>
```

### 2. BasePricingTable (Novo)
**Localização**: `src/components/admin/BasePricingTable.tsx`

**Responsabilidade**: Tabela editável de preços base

**Estrutura**:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Tipo de Coleção</TableHead>
      <TableHead>Preço Base (COINS)</TableHead>
      <TableHead>Ações</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Assinatura</TableCell>
      <TableCell>
        <Input 
          type="number" 
          value={1000} 
          step="1"
          suffix="🪙"
        />
      </TableCell>
      <TableCell>
        <Button onClick={handleSave}>Salvar</Button>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Catálogo Padrão</TableCell>
      <TableCell>
        <Input type="number" value={1400} step="1" suffix="🪙" />
      </TableCell>
      <TableCell>
        <Button onClick={handleSave}>Salvar</Button>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Catálogo Premium</TableCell>
      <TableCell>
        <Input type="number" value={1800} step="1" suffix="🪙" />
      </TableCell>
      <TableCell>
        <Button onClick={handleSave}>Salvar</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
<Alert>
  <AlertDescription>
    💡 Alterar o preço base afeta todos os contextos automaticamente
  </AlertDescription>
</Alert>
```

### 3. MultipliersTable (Novo)
**Localização**: `src/components/admin/MultipliersTable.tsx`

**Responsabilidade**: Tabela editável de multiplicadores

**Estrutura**:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Contexto do Usuário</TableHead>
      <TableHead>Multiplicador</TableHead>
      <TableHead>Percentual</TableHead>
      <TableHead>Ações</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Coleção Escolhida</TableCell>
      <TableCell>
        <Input 
          type="number" 
          value={1.0} 
          step="0.1"
          min="0.1"
        />
      </TableCell>
      <TableCell>100%</TableCell>
      <TableCell>
        <Button onClick={handleSave}>Salvar</Button>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Coleção Não Escolhida</TableCell>
      <TableCell>
        <Input type="number" value={1.2} step="0.1" />
      </TableCell>
      <TableCell>120% (+20%)</TableCell>
      <TableCell>
        <Button onClick={handleSave}>Salvar</Button>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Sem Assinatura</TableCell>
      <TableCell>
        <Input type="number" value={1.2} step="0.1" />
      </TableCell>
      <TableCell>120% (+20%)</TableCell>
      <TableCell>
        <Button onClick={handleSave}>Salvar</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
<Alert>
  <AlertDescription>
    💡 1.0 = preço cheio | 0.8 = 20% desconto | 1.2 = 20% acréscimo
  </AlertDescription>
</Alert>
```

### 4. PricingPreviewTable (Novo)
**Localização**: `src/components/admin/PricingPreviewTable.tsx`

**Responsabilidade**: Preview de preços finais calculados

**Estrutura**:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Tipo</TableHead>
      <TableHead>Escolhida</TableHead>
      <TableHead>Não Escolhida</TableHead>
      <TableHead>Sem Assinatura</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Assinatura</TableCell>
      <TableCell>
        1000 🪙<br/>
        <span className="text-xs text-muted">(1000 × 1.0)</span>
      </TableCell>
      <TableCell>
        1200 🪙<br/>
        <span className="text-xs text-muted">(1000 × 1.2)</span>
      </TableCell>
      <TableCell>
        1200 🪙<br/>
        <span className="text-xs text-muted">(1000 × 1.2)</span>
      </TableCell>
    </TableRow>
    {/* Mais linhas para catálogos */}
  </TableBody>
</Table>
```

### 3. CollectionLimitConfig (Novo)
**Localização**: `src/components/admin/CollectionLimitConfig.tsx`

**Responsabilidade**: Configurar limite de coleções por plano

**Props**:
```typescript
interface CollectionLimitConfigProps {
  planId: string;
  planType: string;
  currentLimit: number;
  onUpdate: (newLimit: number) => void;
}
```

**Estrutura**:
```tsx
<div className="space-y-2">
  <Label>Quantidade de Coleções</Label>
  <div className="flex gap-2">
    <Input
      type="number"
      value={limit}
      onChange={(e) => setLimit(parseInt(e.target.value))}
      min={-1}
    />
    <Button onClick={handleSave}>Salvar</Button>
  </div>
  <p className="text-sm text-muted-foreground">
    -1 = Ilimitado | Número positivo = Limite específico
  </p>
</div>
```

## 🔌 Hooks Personalizados

### 1. useBasePricing
**Localização**: `src/hooks/useBasePricing.ts`

**Descrição**: Hook para gerenciar preços base

```typescript
export function useBasePricing() {
  const queryClient = useQueryClient();
  
  // Buscar todos os preços base
  const { data: basePrices, isLoading } = useQuery({
    queryKey: ['base-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_base_pricing')
        .select('*')
        .eq('is_active', true)
        .order('collection_type', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
  
  // Atualizar preço base
  const updateBasePrice = useMutation({
    mutationFn: async ({
      collectionType,
      newBasePrice,
      reason
    }: UpdateBasePriceParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('update_base_price_with_history', {
        p_collection_type: collectionType,
        p_new_base_price_coins: newBasePrice,
        p_admin_id: user?.id,
        p_reason: reason
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['collection-price'] });
      toast.success('Preço base atualizado! Todos os contextos foram recalculados.');
    },
  });
  
  return {
    basePrices,
    isLoading,
    updateBasePrice: updateBasePrice.mutate,
    isUpdating: updateBasePrice.isPending,
  };
}
```

### 2. useContextMultipliers
**Localização**: `src/hooks/useContextMultipliers.ts`

**Descrição**: Hook para gerenciar multiplicadores de contexto

```typescript
export function useContextMultipliers() {
  const queryClient = useQueryClient();
  
  // Buscar todos os multiplicadores
  const { data: multipliers, isLoading } = useQuery({
    queryKey: ['context-multipliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_context_multipliers')
        .select('*')
        .eq('is_active', true)
        .order('user_context', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
  
  // Atualizar multiplicador
  const updateMultiplier = useMutation({
    mutationFn: async ({
      userContext,
      newMultiplier,
      reason
    }: UpdateMultiplierParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('update_multiplier_with_history', {
        p_user_context: userContext,
        p_new_multiplier: newMultiplier,
        p_admin_id: user?.id,
        p_reason: reason
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-multipliers'] });
      queryClient.invalidateQueries({ queryKey: ['collection-price'] });
      toast.success('Multiplicador atualizado! Preços recalculados.');
    },
  });
  
  return {
    multipliers,
    isLoading,
    updateMultiplier: updateMultiplier.mutate,
    isUpdating: updateMultiplier.isPending,
  };
}
```

### 3. useCollectionPrice
**Localização**: `src/hooks/useCollectionPrice.ts`

**Descrição**: Hook para calcular preço de uma coleção (usa base_price × multiplier)

```typescript
export function useCollectionPrice(collectionId: string) {
  const { data: { user } } = useUser();
  
  return useQuery({
    queryKey: ['collection-price', collectionId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_collection_price', {
        p_collection_id: collectionId,
        p_user_id: user?.id || null
      });
      
      if (error) throw error;
      return data as number;  // Retorna preço final calculado em COINS
    },
    enabled: !!collectionId,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}
```

### 4. useCharacterPrice
**Localização**: `src/hooks/useCharacterPrice.ts`

**Descrição**: Hook para calcular preço de um personagem em COINS

```typescript
export function useCharacterPrice(characterId: string) {
  const { data: { user } } = useUser();
  
  return useQuery({
    queryKey: ['character-price', characterId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_character_price', {
        p_character_id: characterId,
        p_user_id: user?.id || null
      });
      
      if (error) throw error;
      return data as number;  // Retorna preço em COINS
    },
    enabled: !!characterId,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

COMMENT ON FUNCTION useCharacterPrice IS 
  'Hook para obter preço de um personagem em COINS baseado no contexto do usuário';
```

**Uso no Frontend**:
```typescript
// No catálogo de personagens
function CharacterCard({ characterId }) {
  const { data: priceCoins, isLoading } = useCharacterPrice(characterId);
  
  return (
    <Card>
      <CardContent>
        <p>Preço: {priceCoins} 🪙</p>
      </CardContent>
    </Card>
  );
}
```

### 5. useCollectionLimit
**Localização**: `src/hooks/useCollectionLimit.ts`

**Descrição**: Hook para validar limite de coleções

```typescript
export function useCollectionLimit() {
  const { data: { user } } = useUser();
  
  const { data: limitInfo } = useQuery({
    queryKey: ['collection-limit', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('validate_collection_limit', {
        p_user_id: user?.id
      });
      
      if (error) throw error;
      return data[0]; // Retorna primeira linha
    },
    enabled: !!user,
  });
  
  const canAddCollection = limitInfo?.can_add ?? false;
  const currentCount = limitInfo?.current_count ?? 0;
  const maxCount = limitInfo?.max_count ?? 0;
  const message = limitInfo?.message ?? '';
  
  return {
    canAddCollection,
    currentCount,
    maxCount,
    message,
    isUnlimited: maxCount === -1,
  };
}
```

### 6. useUserCoins (Novo - Sistema de Coins)
**Localização**: `src/hooks/useUserCoins.ts`

**Descrição**: Hook para buscar saldo de coins do usuário

```typescript
export function useUserCoins(userId: string) {
  return useQuery({
    queryKey: ['user-coins', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data.balance as number;  // Retorna saldo em coins
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // Cache por 30 segundos
  });
}
```

### 7. usePurchaseCharacter (Novo - Sistema de Coins)
**Localização**: `src/hooks/usePurchaseCharacter.ts`

**Descrição**: Hook para comprar personagem com coins

```typescript
export function usePurchaseCharacter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ characterId, userId }: PurchaseCharacterParams) => {
      const { data, error } = await supabase.rpc('purchase_character', {
        p_user_id: userId,
        p_character_id: characterId
      });
      
      if (error) throw error;
      return data[0];  // { success, message, new_balance }
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidar caches relevantes
        queryClient.invalidateQueries({ queryKey: ['user-coins'] });
        queryClient.invalidateQueries({ queryKey: ['user-characters'] });
        queryClient.invalidateQueries({ queryKey: ['coin-transactions'] });
        
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error('Erro ao comprar personagem');
      console.error('Purchase error:', error);
    },
  });
}
```

### 8. useCoinTransactions (Novo - Sistema de Coins)
**Localização**: `src/hooks/useCoinTransactions.ts`

**Descrição**: Hook para buscar histórico de transações de coins

```typescript
export function useCoinTransactions(userId: string, limit: number = 50) {
  return useQuery({
    queryKey: ['coin-transactions', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

## 🔐 Segurança (RLS Policies)

### collection_base_pricing

```sql
-- Todos podem ver preços base ativos
CREATE POLICY "Anyone can view active base pricing"
  ON collection_base_pricing FOR SELECT
  USING (is_active = true);

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage base pricing"
  ON collection_base_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
```

### pricing_context_multipliers

```sql
-- Todos podem ver multiplicadores ativos
CREATE POLICY "Anyone can view active multipliers"
  ON pricing_context_multipliers FOR SELECT
  USING (is_active = true);

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage multipliers"
  ON pricing_context_multipliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
```

### pricing_history

```sql
-- Apenas admins podem ver histórico
CREATE POLICY "Admins can view pricing history"
  ON pricing_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Ninguém pode modificar histórico (apenas INSERT via função)
-- Sem policy de UPDATE/DELETE = bloqueado por padrão
```

## 📊 Fluxos de Dados

### Fluxo 1: Usuário Visualiza Preço

```
1. Usuário acessa catálogo
   ↓
2. Frontend chama useCollectionPrice(collectionId)
   ↓
3. Hook executa RPC get_collection_price(collectionId, userId)
   ↓
4. Função SQL:
   - Busca tipo da coleção
   - Verifica assinatura do usuário
   - Verifica se coleção foi escolhida
   - Determina contexto
   - Busca preço em collection_type_pricing
   ↓
5. Retorna preço calculado
   ↓
6. Frontend exibe preço com formatação
```

### Fluxo 2: Admin Atualiza Preço

```
1. Admin acessa /admin/planos → aba "Preços Contextuais"
   ↓
2. Frontend carrega preços via useContextualPricing()
   ↓
3. Admin edita célula da tabela
   ↓
4. Admin clica "Salvar"
   ↓
5. Frontend valida valor (> 0)
   ↓
6. Frontend chama updatePrice.mutate()
   ↓
7. Hook executa RPC update_pricing_with_history()
   ↓
8. Função SQL:
   - Busca preço atual
   - Atualiza collection_type_pricing
   - Insere registro em pricing_history
   ↓
9. Frontend invalida cache
   ↓
10. Frontend exibe toast de sucesso
```

### Fluxo 3: Usuário Escolhe Coleção

```
1. Usuário acessa painel de assinatura
   ↓
2. Frontend carrega limite via useCollectionLimit()
   ↓
3. Exibe contador "X de Y coleções"
   ↓
4. Usuário clica "Escolher" em uma coleção
   ↓
5. Frontend valida se pode adicionar (canAddCollection)
   ↓
6. Se SIM:
   - Chama API para adicionar em subscription_collections
   - Invalida cache de preços
   - Exibe toast de sucesso
   ↓
7. Se NÃO:
   - Exibe erro com mensagem do limite
   - Sugere remover coleção existente
```

## 🧪 Estratégia de Testes

### Testes Unitários

#### Função get_character_price()
```sql
-- Teste 1: Personagem de coleção escolhida
-- collection base: 1000, multiplier: 1.0 = 1000 coins
SELECT get_character_price('character-uuid', 'user-uuid') = 1000;

-- Teste 2: Personagem de coleção não escolhida
-- collection base: 1000, multiplier: 1.2 = 1200 coins
SELECT get_character_price('other-character-uuid', 'user-uuid') = 1200;

-- Teste 3: Personagem sem usuário logado
-- collection base: 1000, multiplier: 1.2 = 1200 coins
SELECT get_character_price('character-uuid', NULL) = 1200;

-- Teste 4: Personagem de catálogo padrão
-- collection base: 1400, multiplier: 1.0 = 1400 coins
SELECT get_character_price('standard-character-uuid', 'user-uuid') = 1400;

-- Teste 5: Personagem de catálogo premium
-- collection base: 1800, multiplier: 1.0 = 1800 coins
SELECT get_character_price('premium-character-uuid', 'user-uuid') = 1800;

-- Teste 6: Personagem não encontrado
SELECT get_character_price('invalid-uuid', 'user-uuid');
-- Deve lançar exceção: 'Character not found'
```

#### Função get_collection_price()
```sql
-- Teste 1: Assinante com coleção escolhida
-- base: 1000, multiplier: 1.0 = 1000 coins
SELECT get_collection_price('collection-id', 'user-id') = 1000;

-- Teste 2: Assinante sem coleção escolhida
-- base: 1000, multiplier: 1.2 = 1200 coins
SELECT get_collection_price('other-collection-id', 'user-id') = 1200;

-- Teste 3: Não assinante
-- base: 1000, multiplier: 1.2 = 1200 coins
SELECT get_collection_price('collection-id', NULL) = 1200;

-- Teste 4: Catálogo padrão
-- base: 1400, multiplier: 1.0 = 1400 coins
SELECT get_collection_price('standard-catalog-id', 'user-id') = 1400;

-- Teste 5: Catálogo premium
-- base: 1800, multiplier: 1.0 = 1800 coins
SELECT get_collection_price('premium-catalog-id', 'user-id') = 1800;

-- Teste 6: Promoção - multiplicador 0.8 (20% desconto)
UPDATE pricing_context_multipliers SET multiplier = 0.8 WHERE user_context = 'subscribed_chosen';
-- base: 1000, multiplier: 0.8 = 800 coins
SELECT get_collection_price('collection-id', 'user-id') = 800;
```

#### Hook useCollectionPrice
```typescript
describe('useCollectionPrice', () => {
  it('should return correct price for subscribed user with chosen collection', async () => {
    const { result } = renderHook(() => useCollectionPrice('collection-id'));
    await waitFor(() => expect(result.current.data).toBe(1000)); // coins
  });
  
  it('should return correct price for subscribed user without chosen collection', async () => {
    const { result } = renderHook(() => useCollectionPrice('other-collection-id'));
    await waitFor(() => expect(result.current.data).toBe(1200)); // coins
  });
  
  it('should return correct price for non-subscribed user', async () => {
    mockUser(null); // Simular usuário não logado
    const { result } = renderHook(() => useCollectionPrice('collection-id'));
    await waitFor(() => expect(result.current.data).toBe(1200)); // coins
  });
});
```

### Testes de Integração

```typescript
describe('Contextual Pricing Integration', () => {
  it('should update base price and recalculate all contexts', async () => {
    // 1. Admin atualiza preço base
    await updateBasePrice({
      collectionType: 'subscription',
      newBasePrice: 1100  // era 1000
    });
    
    // 2. Preços são recalculados automaticamente
    const priceChosen = await getCollectionPrice('collection-id', 'user-id');
    expect(priceChosen).toBe(1100);  // 1100 × 1.0
    
    const priceNotChosen = await getCollectionPrice('other-collection-id', 'user-id');
    expect(priceNotChosen).toBe(1320);  // 1100 × 1.2
    
    // 3. Histórico foi registrado
    const history = await getPricingHistory();
    expect(history[0].change_type).toBe('base_price');
    expect(history[0].old_value).toBe(1000);
    expect(history[0].new_value).toBe(1100);
  });
  
  it('should update multiplier and recalculate prices', async () => {
    // 1. Admin cria promoção (20% desconto)
    await updateMultiplier({
      userContext: 'subscribed_chosen',
      newMultiplier: 0.8  // era 1.0
    });
    
    // 2. Preços são recalculados
    const price = await getCollectionPrice('collection-id', 'user-id');
    expect(price).toBe(800);  // 1000 × 0.8
    
    // 3. Histórico foi registrado
    const history = await getPricingHistory();
    expect(history[0].change_type).toBe('multiplier');
    expect(history[0].old_value).toBe(1.0);
    expect(history[0].new_value).toBe(0.8);
  });
});
```

## 📈 Performance e Otimizações

### Índices de Banco

```sql
-- Índices críticos para performance
CREATE INDEX idx_collections_type ON collections(collection_type);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscription_collections_lookup 
  ON subscription_collections(subscription_id, collection_id);
CREATE INDEX idx_base_pricing_lookup 
  ON collection_base_pricing(collection_type) 
  WHERE is_active = true;
CREATE INDEX idx_multipliers_lookup 
  ON pricing_context_multipliers(user_context) 
  WHERE is_active = true;
CREATE INDEX idx_pricing_history_type 
  ON pricing_history(change_type, changed_at DESC);
```

### Cache Strategy

```typescript
// Cache de preços por 5 minutos
staleTime: 5 * 60 * 1000

// Invalidar cache quando:
// - Admin atualiza preço
// - Usuário escolhe/remove coleção
// - Usuário ativa/cancela assinatura
```

### Query Optimization

```sql
-- Usar STABLE em funções de leitura
CREATE FUNCTION get_collection_price(...) 
RETURNS DECIMAL STABLE;

-- Evitar N+1 queries
-- Buscar múltiplos preços de uma vez:
SELECT 
  c.id,
  get_collection_price(c.id, 'user-id') as price
FROM collections c
WHERE c.is_active = true;
```

## 🔄 Migração e Rollback

### Plano de Migração

```sql
-- Fase 1: Adicionar estruturas novas (sem quebrar)
CREATE TABLE collection_base_pricing (...);
CREATE TABLE pricing_context_multipliers (...);
ALTER TABLE collections ADD COLUMN collection_type TEXT DEFAULT 'subscription';

-- Fase 2: Popular dados
INSERT INTO collection_base_pricing VALUES (...);
INSERT INTO pricing_context_multipliers VALUES (...);
UPDATE collections SET collection_type = 'subscription' WHERE collection_type IS NULL;

-- Fase 3: Criar funções
CREATE FUNCTION get_collection_price(...);
CREATE FUNCTION validate_collection_limit(...);
CREATE FUNCTION update_base_price_with_history(...);
CREATE FUNCTION update_multiplier_with_history(...);

-- Fase 4: Adicionar constraints
ALTER TABLE collections ALTER COLUMN collection_type SET NOT NULL;

-- Fase 5: Criar índices de performance
CREATE INDEX idx_base_pricing_lookup ON collection_base_pricing(...);
CREATE INDEX idx_multipliers_lookup ON pricing_context_multipliers(...);
```

### Plano de Rollback

```sql
-- Reverter em ordem inversa
DROP INDEX IF EXISTS idx_multipliers_lookup;
DROP INDEX IF EXISTS idx_base_pricing_lookup;
ALTER TABLE collections ALTER COLUMN collection_type DROP NOT NULL;
DROP FUNCTION IF EXISTS update_multiplier_with_history;
DROP FUNCTION IF EXISTS update_base_price_with_history;
DROP FUNCTION IF EXISTS validate_collection_limit;
DROP FUNCTION IF EXISTS get_collection_price;
DROP TABLE IF EXISTS pricing_history;
DROP TABLE IF EXISTS pricing_context_multipliers;
DROP TABLE IF EXISTS collection_base_pricing;
ALTER TABLE collections DROP COLUMN IF EXISTS collection_type;
```

## 📝 Checklist de Implementação

### Backend
- [ ] Criar migration para collection_base_pricing
- [ ] Criar migration para pricing_context_multipliers
- [ ] Criar migration para pricing_history
- [ ] Adicionar collection_type a collections
- [ ] Criar função get_collection_price()
- [ ] Criar função validate_collection_limit()
- [ ] Criar função update_base_price_with_history()
- [ ] Criar função update_multiplier_with_history()
- [ ] Adicionar RLS policies
- [ ] Adicionar índices de performance
- [ ] Popular dados iniciais

### Frontend
- [ ] Criar ContextualPricingManager component
- [ ] Criar BasePricingTable component
- [ ] Criar MultipliersTable component
- [ ] Criar PricingPreviewTable component
- [ ] Criar CollectionLimitConfig component
- [ ] Criar useBasePricing hook
- [ ] Criar useContextMultipliers hook
- [ ] Criar useCollectionPrice hook
- [ ] Criar useCollectionLimit hook
- [ ] Atualizar AdminPlansConfiguration page
- [ ] Atualizar catálogo para usar novos preços
- [ ] Adicionar validação de limite ao escolher coleção

### Testes
- [ ] Testes unitários de funções SQL
- [ ] Testes de cálculo com diferentes multiplicadores
- [ ] Testes unitários de hooks
- [ ] Testes de integração de fluxos
- [ ] Testes de performance
- [ ] Testes de RLS policies

### Documentação
- [ ] Atualizar README
- [ ] Documentar funções SQL
- [ ] Documentar componentes
- [ ] Criar guia de uso para admin
- [ ] Atualizar CHANGELOG
- [ ] Documentar fórmula de cálculo

### Limpeza
- [ ] Remover código legado
- [ ] Remover imports não utilizados
- [ ] Remover componentes obsoletos
- [ ] Atualizar tipos TypeScript
