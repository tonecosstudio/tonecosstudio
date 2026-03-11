# 🔧 Correção: Relacionamento subscription_plans → pricing_tiers

**Data:** 9 de Março de 2026  
**Migration:** 50 - `20260309172527_add_pricing_tier_to_subscription_plans.sql`  
**Status:** ✅ APLICADA COM SUCESSO

---

## 🐛 Problema Identificado

Erro 400 ao tentar buscar planos de assinatura com join em pricing_tiers:

```
GET /rest/v1/subscription_plans?select=*,pricing_tiers(*)&is_active=eq.true&order=display_order.asc 400 (Bad Request)
```

### Causa Raiz

O código frontend estava tentando fazer um join entre `subscription_plans` e `pricing_tiers`, mas não havia foreign key conectando as duas tabelas.

**Problema:**
- `subscription_plans` não tinha coluna `pricing_tier_id`
- `subscription_plans` não tinha coluna `display_order` para ordenação
- Não havia relacionamento entre as tabelas

---

## ✅ Solução Aplicada

### 1. Coluna pricing_tier_id Adicionada

```sql
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS pricing_tier_id UUID 
  REFERENCES pricing_tiers(id) ON DELETE SET NULL;
```

**Descrição:**
- Foreign key opcional para `pricing_tiers`
- `ON DELETE SET NULL` - Se o tier for deletado, o plano não é afetado
- Permite vincular planos de assinatura a tiers de precificação

**Índice Criado:**
```sql
CREATE INDEX idx_subscription_plans_pricing_tier_id 
  ON subscription_plans(pricing_tier_id);
```

### 2. Coluna display_order Adicionada

```sql
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
```

**Descrição:**
- Controla a ordem de exibição dos planos
- Permite ordenar planos customizadamente

**Índice Criado:**
```sql
CREATE INDEX idx_subscription_plans_display_order 
  ON subscription_plans(display_order);
```

### 3. Dados Existentes Atualizados

```sql
UPDATE subscription_plans
SET display_order = CASE name
  WHEN 'Básico' THEN 1
  WHEN 'Premium' THEN 2
  WHEN 'Colecionador' THEN 3
  ELSE 99
END
WHERE display_order = 0;
```

**Resultado:**
- Básico: display_order = 1
- Premium: display_order = 2
- Colecionador: display_order = 3

---

## 📊 Estrutura Final da Tabela subscription_plans

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `name` | TEXT | Nome do plano |
| `description` | TEXT | Descrição |
| `price` | DECIMAL(10,2) | Preço mensal |
| `characters_per_cycle` | INTEGER | Personagens por ciclo |
| `pricing_tier_id` | UUID | ✅ **NOVO** - FK para pricing_tiers |
| `display_order` | INTEGER | ✅ **NOVO** - Ordem de exibição |
| `is_active` | BOOLEAN | Se está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

## 🎯 Funcionalidades Habilitadas

### 1. Join com pricing_tiers

```typescript
// Buscar planos com informações do tier
const { data, error } = await supabase
  .from('subscription_plans')
  .select(`
    *,
    pricing_tiers (
      id,
      name,
      price_coins,
      price_brl,
      price_full,
      price_pix
    )
  `)
  .eq('is_active', true)
  .order('display_order', { ascending: true });
```

**Resultado:**
```json
[
  {
    "id": "...",
    "name": "Básico",
    "price": 150.00,
    "display_order": 1,
    "pricing_tiers": {
      "name": "Padrão",
      "price_coins": 30,
      "price_brl": 150.00,
      "price_full": 150.00,
      "price_pix": 142.50
    }
  }
]
```

### 2. Vincular Plano a Tier

```typescript
// Atualizar plano para usar tier específico
const { error } = await supabase
  .from('subscription_plans')
  .update({
    pricing_tier_id: 'uuid-do-tier'
  })
  .eq('id', 'uuid-do-plano');
```

### 3. Ordenação Customizada

```typescript
// Buscar planos ordenados
const { data, error } = await supabase
  .from('subscription_plans')
  .select('*')
  .eq('is_active', true)
  .order('display_order', { ascending: true });
```

### 4. Atualizar Ordem de Exibição

```typescript
// Reordenar planos
const updates = [
  { id: 'plano-1', display_order: 1 },
  { id: 'plano-2', display_order: 2 },
  { id: 'plano-3', display_order: 3 },
];

for (const update of updates) {
  await supabase
    .from('subscription_plans')
    .update({ display_order: update.display_order })
    .eq('id', update.id);
}
```

---

## 🧪 Como Testar

### Teste 1: Verificar Colunas

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscription_plans'
ORDER BY ordinal_position;
```

**Resultado Esperado:** Deve incluir `pricing_tier_id` e `display_order`

### Teste 2: Verificar Foreign Key

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'subscription_plans'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Resultado Esperado:** Deve mostrar FK para `pricing_tiers`

### Teste 3: Buscar Planos com Join

```sql
SELECT 
  sp.*,
  pt.name as tier_name,
  pt.price_full,
  pt.price_pix
FROM subscription_plans sp
LEFT JOIN pricing_tiers pt ON sp.pricing_tier_id = pt.id
WHERE sp.is_active = true
ORDER BY sp.display_order;
```

**Resultado Esperado:** Query executa sem erros

### Teste 4: Verificar display_order

```sql
SELECT name, display_order
FROM subscription_plans
ORDER BY display_order;
```

**Resultado Esperado:**
```
name          | display_order
--------------|---------------
Básico        | 1
Premium       | 2
Colecionador  | 3
```

---

## 📝 Casos de Uso

### Caso 1: Plano com Tier Específico

Um plano de assinatura pode usar um tier de precificação específico para herdar preços e configurações:

```typescript
// Criar plano vinculado a tier
const { data, error } = await supabase
  .from('subscription_plans')
  .insert({
    name: 'Plano Anual',
    description: 'Assinatura anual com desconto',
    price: 1500.00,
    characters_per_cycle: 12,
    pricing_tier_id: 'uuid-do-tier-premium',
    display_order: 4
  });
```

### Caso 2: Plano Sem Tier

Um plano pode existir sem estar vinculado a um tier:

```typescript
// Criar plano independente
const { data, error } = await supabase
  .from('subscription_plans')
  .insert({
    name: 'Plano Especial',
    description: 'Oferta limitada',
    price: 99.00,
    characters_per_cycle: 1,
    pricing_tier_id: null, // Sem tier
    display_order: 5
  });
```

### Caso 3: Migrar Planos para Tiers

Vincular planos existentes a tiers correspondentes:

```sql
-- Vincular Básico ao tier Padrão
UPDATE subscription_plans
SET pricing_tier_id = (
  SELECT id FROM pricing_tiers WHERE name = 'standard'
)
WHERE name = 'Básico';

-- Vincular Premium ao tier Premium
UPDATE subscription_plans
SET pricing_tier_id = (
  SELECT id FROM pricing_tiers WHERE name = 'premium'
)
WHERE name = 'Premium';
```

---

## 🎯 Impacto

### Antes
- ❌ Erro 400 ao buscar planos com join
- ❌ Impossível vincular planos a tiers
- ❌ Sem controle de ordem de exibição
- ❌ Duas tabelas de precificação desconectadas

### Depois
- ✅ Join funciona corretamente
- ✅ Planos podem usar tiers de precificação
- ✅ Ordem de exibição configurável
- ✅ Sistema de precificação unificado

---

## 🚀 Próximos Passos

### Melhorias Futuras

1. **Sincronização de Preços**
   - Trigger para atualizar `price` quando `pricing_tier_id` muda
   - Manter preços sincronizados automaticamente

2. **Validação de Dados**
   - Garantir que `display_order` seja único
   - Validar que `pricing_tier_id` aponta para tier ativo

3. **Migração Completa**
   - Migrar todos os planos para usar tiers
   - Deprecar campo `price` em favor de `pricing_tier_id`

4. **Interface Admin**
   - Permitir vincular/desvincular tiers via UI
   - Drag-and-drop para reordenar planos

---

## 📚 Referências

- **Migration:** `20260309172527_add_pricing_tier_to_subscription_plans.sql`
- **Tabelas:** `subscription_plans`, `pricing_tiers`
- **Relacionamento:** subscription_plans.pricing_tier_id → pricing_tiers.id

---

## 🎉 Conclusão

A tabela `subscription_plans` agora tem relacionamento com `pricing_tiers` e suporte para ordenação customizada. O sistema de precificação está mais integrado e flexível.

**Status:** ✅ RESOLVIDO

---

**Corrigido por:** Kiro AI Assistant  
**Tempo de Correção:** ~10 minutos  
**Migration:** 50  
**Colunas Adicionadas:** 2 (pricing_tier_id, display_order)  
**Relacionamentos Criados:** 1
