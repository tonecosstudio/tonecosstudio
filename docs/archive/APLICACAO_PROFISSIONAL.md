# Aplicação Profissional das Correções

## Resumo

Criei 5 migrations que corrigem os problemas na raiz:

1. **20260504000000** - Migra dados legados (collection_id → subscription_collections)
2. **20260504000001** - Corrige trigger de collection
3. **20260504000002** - Cria funções de negócio (ativação automática)
4. **20260504000003** - Adiciona constraints de validação
5. **20260504000004** - Limpa dados duplicados/inválidos

## Ordem de Aplicação

### IMPORTANTE: Aplicar na ordem exata!

```bash
# 1. Migrar dados legados
psql < supabase/migrations/20260504000000_migrate_legacy_subscription_data.sql

# 2. Corrigir trigger
psql < supabase/migrations/20260504000001_fix_collection_trigger.sql

# 3. Criar funções de negócio
psql < supabase/migrations/20260504000002_create_subscription_business_functions.sql

# 4. Adicionar constraints
psql < supabase/migrations/20260504000003_add_subscription_constraints.sql

# 5. Limpar dados (REVISAR ANTES!)
psql < supabase/migrations/20260504000004_cleanup_duplicate_subscriptions.sql
```

## Via Supabase Dashboard (Recomendado)

### Migration 1: Migrar Dados Legados

**Link**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

**SQL**: Copie todo o conteúdo de `supabase/migrations/20260504000000_migrate_legacy_subscription_data.sql`

**O que faz**:
- Migra `subscriptions.collection_id` para `subscription_collections`
- Marca campo `collection_id` como deprecated
- Loga resultados da migração

**Resultado esperado**:
```
NOTICE: ✅ Migration completed:
NOTICE:    - Total subscriptions: X
NOTICE:    - Subscriptions with collection_id: Y
NOTICE:    - Records in subscription_collections: Z
```

---

### Migration 2: Corrigir Trigger

**SQL**: Copie todo o conteúdo de `supabase/migrations/20260504000001_fix_collection_trigger.sql`

**O que faz**:
- Corrige função `create_group_for_new_collection()`
- Adiciona fallback para admin_user_id
- Adiciona tratamento de erro

**Resultado esperado**:
```
Success. No rows returned
```

---

### Migration 3: Funções de Negócio

**SQL**: Copie todo o conteúdo de `supabase/migrations/20260504000002_create_subscription_business_functions.sql`

**O que faz**:
- Cria `create_subscription_deliveries()` - Cria entregas
- Cria `activate_subscription_from_payment()` - Ativa subscription
- Cria `validate_subscription_data()` - Valida dados
- Cria trigger automático de ativação

**Resultado esperado**:
```
Success. No rows returned
```

**IMPORTANTE**: A partir daqui, quando você aprovar um pagamento no admin, a subscription será ativada AUTOMATICAMENTE!

---

### Migration 4: Constraints

**SQL**: Copie todo o conteúdo de `supabase/migrations/20260504000003_add_subscription_constraints.sql`

**O que faz**:
- Adiciona constraint: deliveries_completed ≤ deliveries_total
- Adiciona constraint: deliveries_total deve bater com plan_type
- Adiciona constraint: total_paid ≥ 0
- Adiciona índices de performance

**Resultado esperado**:
```
Success. No rows returned
```

**ATENÇÃO**: Se houver dados inválidos, essa migration vai FALHAR. Nesse caso, execute a Migration 5 primeiro.

---

### Migration 5: Limpeza de Dados

**⚠️ REVISAR ANTES DE APLICAR!**

**SQL**: Copie todo o conteúdo de `supabase/migrations/20260504000004_cleanup_duplicate_subscriptions.sql`

**O que faz**:
- Cancela subscriptions duplicadas (mantém a mais recente)
- Corrige subscriptions ativas com dados faltando
- Loga resultados

**Resultado esperado**:
```
NOTICE: Found X users with duplicate pending_payment subscriptions
NOTICE: ✅ Cleanup completed:
NOTICE:    - Cancelled duplicate subscriptions: Y
NOTICE:    - Fixed active subscriptions: Z
```

**IMPORTANTE**: Esta migration MODIFICA DADOS. Revise antes!

---

## Verificação Pós-Aplicação

### 1. Verificar Funções Criadas

```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%subscription%'
ORDER BY proname;
```

Deve retornar:
- `activate_subscription_from_payment`
- `auto_activate_subscription_on_payment_approval`
- `create_subscription_deliveries`
- `validate_subscription_data`

### 2. Verificar Triggers

```sql
SELECT tgname, tgrelid::regclass, tgfoid::regproc
FROM pg_trigger
WHERE tgname LIKE '%subscription%'
OR tgname LIKE '%collection%';
```

Deve retornar:
- `trigger_auto_activate_subscription` on `manual_payments`
- `trigger_validate_subscription_data` on `subscriptions`
- `trigger_create_group_for_collection` on `collections`

### 3. Verificar Constraints

```sql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'subscriptions'::regclass
AND conname LIKE 'check_%';
```

Deve retornar:
- `check_deliveries_completed_valid`
- `check_deliveries_total_matches_plan`
- `check_total_paid_non_negative`

### 4. Testar Ativação Automática

```sql
-- Simular aprovação de pagamento
UPDATE manual_payments
SET status = 'approved', approved_at = NOW()
WHERE id = 'PAYMENT_ID';

-- Verificar se subscription foi ativada
SELECT id, status, total_paid, deliveries_total
FROM subscriptions
WHERE id = (
  SELECT subscription_id FROM manual_payments WHERE id = 'PAYMENT_ID'
);
```

Deve mostrar:
- `status = 'active'`
- `total_paid` preenchido
- `deliveries_total` correto (3, 6 ou 12)

---

## Rollback (Se Necessário)

Se algo der errado, você pode fazer rollback:

```sql
-- Remover triggers
DROP TRIGGER IF EXISTS trigger_auto_activate_subscription ON manual_payments;
DROP TRIGGER IF EXISTS trigger_validate_subscription_data ON subscriptions;

-- Remover funções
DROP FUNCTION IF EXISTS activate_subscription_from_payment(UUID);
DROP FUNCTION IF EXISTS create_subscription_deliveries(UUID);
DROP FUNCTION IF EXISTS validate_subscription_data();
DROP FUNCTION IF EXISTS auto_activate_subscription_on_payment_approval();

-- Remover constraints
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS check_deliveries_completed_valid;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS check_deliveries_total_matches_plan;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS check_total_paid_non_negative;
```

---

## Próximos Passos Após Aplicação

1. ✅ Testar criação de nova subscription
2. ✅ Testar aprovação de pagamento (deve ativar automaticamente)
3. ✅ Verificar se deliveries são criadas
4. ✅ Verificar se dados aparecem corretamente no frontend
5. ✅ Criar collection de verdade (não teste)
6. ✅ Associar à subscription do usuário

---

## Benefícios

Após aplicar todas as migrations:

1. **Ativação Automática**: Aprovar pagamento → Subscription ativa automaticamente
2. **Dados Consistentes**: Constraints garantem integridade
3. **Sem Duplicatas**: Limpeza remove subscriptions duplicadas
4. **Deliveries Automáticas**: Criadas automaticamente ao ativar
5. **Validação**: Dados inválidos são rejeitados
6. **Auditoria**: Logs mostram o que foi feito

---

## Tempo Estimado

- Aplicação: 15 minutos
- Verificação: 10 minutos
- Testes: 15 minutos

**Total**: ~40 minutos

---

## Suporte

Se houver erro em alguma migration:
1. Copie a mensagem de erro completa
2. Me envie
3. Vou criar um fix específico

Não tente corrigir manualmente sem entender o erro!
