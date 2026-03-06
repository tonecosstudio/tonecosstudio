# ✅ Correção 5: Tipos de Coleção Flexíveis

## 🚨 Problema Identificado

### ❌ Sistema Atual (Rígido):

```sql
-- Tipos fixos no código (hardcoded)
collection_type TEXT CHECK (collection_type IN (
  'subscription',
  'standard_catalog', 
  'premium_catalog'
))
```

**Limitações**:
- ❌ Tipos fixos no código (hardcoded)
- ❌ Adicionar novo tipo = alterar migration + código
- ❌ Sem flexibilidade para expansão futura
- ❌ Dificulta testes A/B de novos modelos
- ❌ Admin não pode criar novos tipos pela interface

**Cenário Futuro**:
```
Se amanhã surgir:
- Catálogo Raro
- Catálogo Exclusivo
- Edição Limitada
- Tier Experimental

O sistema quebra! Precisa alterar código.
```

---

## ✅ Solução: Tabela `collection_types` (Dinâmica)

### Conceito:

Em vez de tipos fixos no código, criar uma tabela de tipos configuráveis dinamicamente.

### Nova Estrutura:

```sql
-- 1. Tabela de tipos de coleção (flexível)
CREATE TABLE collection_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,        -- Identificador técnico (ex: 'subscription')
  display_name TEXT NOT NULL,       -- Nome para exibição (ex: 'Assinatura')
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,     -- Ordem de exibição
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de preços base (agora referencia collection_types)
CREATE TABLE collection_base_pricing (
  collection_type_id UUID PRIMARY KEY REFERENCES collection_types(id) ON DELETE CASCADE,
  base_price_coins INTEGER NOT NULL CHECK (base_price_coins > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela collections (agora referencia collection_types por UUID)
ALTER TABLE collections
ADD COLUMN collection_type_id UUID REFERENCES collection_types(id);
```

### Dados Iniciais:

```sql
-- Popular tipos padrão
INSERT INTO collection_types (name, display_name, description, sort_order) VALUES
  ('subscription', 'Assinatura', 'Coleções incluídas em planos de assinatura', 1),
  ('standard_catalog', 'Catálogo Padrão', 'Coleções do catálogo com preço intermediário', 2),
  ('premium_catalog', 'Catálogo Premium', 'Coleções premium com preço mais alto', 3);

-- Popular preços base (referenciando por UUID)
INSERT INTO collection_base_pricing (collection_type_id, base_price_coins)
SELECT id, 
  CASE name
    WHEN 'subscription' THEN 1000
    WHEN 'standard_catalog' THEN 1400
    WHEN 'premium_catalog' THEN 1800
  END
FROM collection_types;
```

---

## 🎯 Benefícios

### 1. Expansão Fácil (Sem Código)

**Antes (Rígido)**:
```sql
-- Adicionar "catálogo raro" = alterar migration + código
ALTER TABLE collections DROP CONSTRAINT check_collection_type;
ALTER TABLE collections ADD CONSTRAINT check_collection_type 
  CHECK (collection_type IN ('subscription', 'standard_catalog', 'premium_catalog', 'rare_catalog'));

-- Atualizar código TypeScript
type CollectionType = 'subscription' | 'standard_catalog' | 'premium_catalog' | 'rare_catalog';
```

**Depois (Flexível)**:
```sql
-- Apenas INSERT! Sem alterar código.
INSERT INTO collection_types (name, display_name, description, sort_order) 
VALUES ('rare_catalog', 'Catálogo Raro', 'Edição limitada com preço especial', 4);

INSERT INTO collection_base_pricing (collection_type_id, base_price_coins)
SELECT id, 2500 FROM collection_types WHERE name = 'rare_catalog';
```

### 2. Testes A/B de Novos Modelos

```sql
-- Criar tipo experimental (inativo)
INSERT INTO collection_types (name, display_name, description, is_active) 
VALUES ('experimental_tier', 'Tier Experimental', 'Teste de novo modelo de precificação', false);

-- Testar internamente
UPDATE collection_types SET is_active = true WHERE name = 'experimental_tier';

-- Se funcionar, manter. Se não, desativar.
UPDATE collection_types SET is_active = false WHERE name = 'experimental_tier';
```

### 3. Gerenciamento via Interface Admin

```tsx
// Admin pode criar novos tipos pela interface!
function CollectionTypesManager() {
  const { data: types } = useCollectionTypes();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Coleção</CardTitle>
        <CardDescription>Gerencie tipos de coleção dinamicamente</CardDescription>
        <Button onClick={handleCreateType}>+ Novo Tipo</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preço Base</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map(type => (
              <TableRow key={type.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{type.display_name}</p>
                    <p className="text-sm text-muted">{type.name}</p>
                  </div>
                </TableCell>
                <TableCell>{type.base_price_coins} 🪙</TableCell>
                <TableCell>
                  <Badge variant={type.is_active ? 'success' : 'secondary'}>
                    {type.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button onClick={() => handleEdit(type)}>Editar</Button>
                  <Button onClick={() => handleToggle(type)}>
                    {type.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

### 4. Ordenação Customizável

```sql
-- Admin pode definir ordem de exibição
UPDATE collection_types SET sort_order = 1 WHERE name = 'subscription';
UPDATE collection_types SET sort_order = 2 WHERE name = 'rare_catalog';
UPDATE collection_types SET sort_order = 3 WHERE name = 'standard_catalog';
UPDATE collection_types SET sort_order = 4 WHERE name = 'premium_catalog';

-- Query sempre ordenada
SELECT * FROM collection_types WHERE is_active = true ORDER BY sort_order;
```

---

## 📊 Comparação Final

### Antes (Rígido):
```
❌ 3 tipos fixos no código
❌ Adicionar tipo = migration + código
❌ Sem interface admin para tipos
❌ Difícil testar novos modelos
❌ Sem controle de ativação/desativação
❌ Sem ordenação customizável
```

### Depois (Flexível):
```
✅ Tipos dinâmicos no banco
✅ Adicionar tipo = INSERT (sem código)
✅ Admin pode gerenciar tipos pela interface
✅ Fácil criar tipos experimentais
✅ Ativar/desativar tipos dinamicamente
✅ Ordenação customizável
✅ Escalável para qualquer cenário futuro
```

---

## 🔧 Funções Atualizadas

### 1. `get_collection_price()` (Atualizada)

```sql
CREATE OR REPLACE FUNCTION get_collection_price(
  p_collection_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_collection_type_id UUID;
  v_user_context TEXT;
  v_base_price_coins INTEGER;
  v_multiplier DECIMAL(4,2);
  v_final_price_coins INTEGER;
BEGIN
  -- 1. Buscar tipo da coleção (agora é UUID)
  SELECT collection_type_id INTO v_collection_type_id
  FROM collections
  WHERE id = p_collection_id;
  
  IF v_collection_type_id IS NULL THEN
    RAISE EXCEPTION 'Collection not found: %', p_collection_id;
  END IF;
  
  -- 2. Buscar preço base (referencia por UUID)
  SELECT base_price_coins INTO v_base_price_coins
  FROM collection_base_pricing
  WHERE collection_type_id = v_collection_type_id
  AND is_active = true;
  
  IF v_base_price_coins IS NULL THEN
    RAISE EXCEPTION 'Base price not configured for type %', v_collection_type_id;
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
```

### 2. `update_base_price_with_history()` (Atualizada)

```sql
CREATE OR REPLACE FUNCTION update_base_price_with_history(
  p_collection_type_id UUID,  -- Agora recebe UUID em vez de TEXT
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
  WHERE collection_type_id = p_collection_type_id;
  
  -- Atualizar preço base
  UPDATE collection_base_pricing
  SET base_price_coins = p_new_base_price_coins,
      updated_at = NOW()
  WHERE collection_type_id = p_collection_type_id;
  
  -- Registrar histórico
  INSERT INTO pricing_history (
    change_type,
    collection_type_id,
    user_context,
    old_value,
    new_value,
    changed_by,
    reason
  ) VALUES (
    'base_price',
    p_collection_type_id,
    NULL,
    v_old_base_price_coins,
    p_new_base_price_coins,
    p_admin_id,
    p_reason
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 Exemplos Práticos

### Exemplo 1: Adicionar "Catálogo Raro"

```sql
-- 1. Criar tipo
INSERT INTO collection_types (name, display_name, description, sort_order) 
VALUES ('rare_catalog', 'Catálogo Raro', 'Edição limitada com preço especial', 4);

-- 2. Definir preço base
INSERT INTO collection_base_pricing (collection_type_id, base_price_coins)
SELECT id, 2500 FROM collection_types WHERE name = 'rare_catalog';

-- 3. Atribuir coleções a esse tipo
UPDATE collections 
SET collection_type_id = (SELECT id FROM collection_types WHERE name = 'rare_catalog')
WHERE name IN ('Edição Limitada Marvel', 'Coleção Exclusiva DC');

-- Pronto! Sem alterar código.
```

### Exemplo 2: Teste A/B de Novo Tier

```sql
-- 1. Criar tipo experimental (inativo)
INSERT INTO collection_types (name, display_name, description, is_active) 
VALUES ('vip_tier', 'VIP Tier', 'Tier experimental para clientes VIP', false);

-- 2. Definir preço base
INSERT INTO collection_base_pricing (collection_type_id, base_price_coins)
SELECT id, 3000 FROM collection_types WHERE name = 'vip_tier';

-- 3. Ativar para teste interno
UPDATE collection_types SET is_active = true WHERE name = 'vip_tier';

-- 4. Se funcionar, manter. Se não, desativar.
UPDATE collection_types SET is_active = false WHERE name = 'vip_tier';
```

### Exemplo 3: Reordenar Tipos

```sql
-- Admin quer mostrar "Catálogo Raro" em destaque
UPDATE collection_types SET sort_order = 1 WHERE name = 'rare_catalog';
UPDATE collection_types SET sort_order = 2 WHERE name = 'subscription';
UPDATE collection_types SET sort_order = 3 WHERE name = 'premium_catalog';
UPDATE collection_types SET sort_order = 4 WHERE name = 'standard_catalog';
```

---

## 🗂️ Migração de Dados

### Passo 1: Criar Tabela `collection_types`

```sql
CREATE TABLE collection_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collection_types_active ON collection_types(is_active);
CREATE INDEX idx_collection_types_sort ON collection_types(sort_order);
```

### Passo 2: Popular Tipos Padrão

```sql
INSERT INTO collection_types (name, display_name, description, sort_order) VALUES
  ('subscription', 'Assinatura', 'Coleções incluídas em planos de assinatura', 1),
  ('standard_catalog', 'Catálogo Padrão', 'Coleções do catálogo com preço intermediário', 2),
  ('premium_catalog', 'Catálogo Premium', 'Coleções premium com preço mais alto', 3);
```

### Passo 3: Atualizar `collection_base_pricing`

```sql
-- Adicionar coluna collection_type_id
ALTER TABLE collection_base_pricing
ADD COLUMN collection_type_id UUID REFERENCES collection_types(id);

-- Popular collection_type_id baseado no collection_type antigo
UPDATE collection_base_pricing cbp
SET collection_type_id = ct.id
FROM collection_types ct
WHERE cbp.collection_type = ct.name;

-- Remover coluna antiga
ALTER TABLE collection_base_pricing DROP COLUMN collection_type;

-- Tornar obrigatório
ALTER TABLE collection_base_pricing ALTER COLUMN collection_type_id SET NOT NULL;

-- Adicionar PK
ALTER TABLE collection_base_pricing ADD PRIMARY KEY (collection_type_id);
```

### Passo 4: Atualizar `collections`

```sql
-- Adicionar coluna collection_type_id
ALTER TABLE collections
ADD COLUMN collection_type_id UUID REFERENCES collection_types(id);

-- Popular collection_type_id baseado no collection_type antigo
UPDATE collections c
SET collection_type_id = ct.id
FROM collection_types ct
WHERE c.collection_type = ct.name;

-- Remover coluna antiga
ALTER TABLE collections DROP COLUMN collection_type;

-- Tornar obrigatório
ALTER TABLE collections ALTER COLUMN collection_type_id SET NOT NULL;

-- Criar índice
CREATE INDEX idx_collections_type_id ON collections(collection_type_id);
```

### Passo 5: Atualizar `pricing_history`

```sql
-- Adicionar coluna collection_type_id
ALTER TABLE pricing_history
ADD COLUMN collection_type_id UUID REFERENCES collection_types(id);

-- Popular collection_type_id baseado no collection_type antigo
UPDATE pricing_history ph
SET collection_type_id = ct.id
FROM collection_types ct
WHERE ph.collection_type = ct.name;

-- Remover coluna antiga
ALTER TABLE pricing_history DROP COLUMN collection_type;
```

---

## 🎉 Conclusão

A **Correção 5: Tipos de Coleção Flexíveis** transforma o sistema de tipos fixos em um sistema dinâmico e escalável:

### Antes:
```
❌ Tipos hardcoded no código
❌ Adicionar tipo = migration + código
❌ Sem gerenciamento admin
```

### Depois:
```
✅ Tipos dinâmicos no banco
✅ Adicionar tipo = INSERT
✅ Admin pode gerenciar pela interface
✅ Escalável para qualquer cenário futuro
```

**Status**: ✅ Pronto para implementação

**Próximo Passo**: Atualizar spec com novo modelo!
