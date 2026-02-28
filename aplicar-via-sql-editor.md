# Como Aplicar a Migration Manualmente

Como a aplicação automática está com problemas de autenticação, siga estes passos para aplicar manualmente:

## Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

2. Cole o SQL abaixo e clique em "RUN":

```sql
-- PART 1: Adicionar campo plan_id
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

-- PART 2: Tornar collection_id nullable
ALTER TABLE subscriptions
  ALTER COLUMN collection_id DROP NOT NULL;

-- PART 3: Adicionar status pending_payment
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('active', 'paused', 'cancelled', 'completed', 'pending_payment'));

-- PART 4: Migrar dados existentes
UPDATE subscriptions s
SET plan_id = (
  SELECT sp.id 
  FROM subscription_plans sp 
  WHERE sp.plan_type = s.plan_type 
  AND sp.is_active = true
  LIMIT 1
)
WHERE plan_id IS NULL 
AND plan_type IS NOT NULL;

-- PART 5: Verificação
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
AND column_name IN ('plan_id', 'collection_id')
ORDER BY column_name;
```

3. Verifique se a saída mostra:
   - `plan_id` | `uuid` | `YES`
   - `collection_id` | `uuid` | `YES`

## Opção 2: Via psql (se tiver acesso)

```bash
psql "postgresql://postgres.pabxpvqwtvbjaunjejud:[SUA_SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20260228000000_fix_subscriptions_schema.sql
```

## Verificação Pós-Aplicação

Após aplicar, teste criando uma assinatura. O erro 400 deve estar resolvido.

## Link Direto

https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
