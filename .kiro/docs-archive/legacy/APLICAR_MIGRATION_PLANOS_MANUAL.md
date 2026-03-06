# 🔧 Aplicar Migration de Planos Manualmente

## Opção 1: Via Supabase Dashboard (RECOMENDADO)

### Passo 1: Acessar SQL Editor

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
2. Faça login se necessário

### Passo 2: Copiar SQL

Abra o arquivo: `supabase/migrations/20260510000000_extend_subscription_plans.sql`

Copie TODO o conteúdo do arquivo.

### Passo 3: Colar e Executar

1. Cole o SQL no editor
2. Clique em "Run" (ou pressione Ctrl+Enter)
3. Aguarde a execução

### Passo 4: Verificar Sucesso

Se aparecer "Success. No rows returned", está tudo certo!

Se aparecer erros como "already exists", ignore - significa que já foi aplicado.

---

## Opção 2: Via Node.js Script

### Pré-requisitos

Instale o pacote pg:
```powershell
npm install pg
```

### Adicionar Senha ao .env

Adicione ao arquivo `.env`:
```
SUPABASE_DB_PASSWORD=sua_senha_aqui
```

Para encontrar a senha:
1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/database
2. Copie a senha do banco (Database Password)

### Executar Script

```powershell
node aplicar-migration-planos-direto.mjs
```

---

## Opção 3: Via Supabase CLI (se local funcionar)

```powershell
# Parar Supabase
supabase stop

# Limpar volumes
docker volume prune -f

# Iniciar novamente
supabase start

# Aplicar migrations
supabase db push
```

---

## Verificar se Foi Aplicado

Execute no SQL Editor:

```sql
-- Verificar se novos tipos de plano existem
SELECT plan_type FROM subscription_credit_plans;

-- Verificar se novos campos existem
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'subscription_credit_plans'
AND column_name IN ('deposit_amount', 'pieces_per_subscription');

-- Verificar se view existe
SELECT * FROM subscription_credit_plans_with_calculations LIMIT 1;
```

Se retornar dados, a migration foi aplicada com sucesso!

---

## Próximos Passos Após Aplicar

```powershell
# 1. Regenerar tipos TypeScript
npm run generate-types

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Acessar página de configuração
# http://localhost:5173/admin/creditos/planos
```

---

## Troubleshooting

### Erro: "already exists"
**Solução:** Ignore, significa que já foi aplicado parcialmente.

### Erro: "table does not exist"
**Solução:** Execute primeiro `.\aplicar-migration-creditos.ps1`

### Erro: "permission denied"
**Solução:** Verifique se está usando a senha correta do banco.

---

## SQL Completo (para copiar/colar)

```sql
-- =====================================================
-- Migration: Estender Sistema de Planos de Assinatura
-- =====================================================

-- Remover constraint antiga
ALTER TABLE subscription_credit_plans 
DROP CONSTRAINT IF EXISTS subscription_credit_plans_plan_type_check;

-- Adicionar nova constraint com mais tipos
ALTER TABLE subscription_credit_plans 
ADD CONSTRAINT subscription_credit_plans_plan_type_check 
CHECK (plan_type IN ('avulso', 'bimestral', 'trimestral', 'semestral', 'anual'));

-- Adicionar novos campos
ALTER TABLE subscription_credit_plans 
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2) DEFAULT 0 CHECK (deposit_amount >= 0);

ALTER TABLE subscription_credit_plans 
ADD COLUMN IF NOT EXISTS pieces_per_subscription INTEGER DEFAULT 0 CHECK (pieces_per_subscription >= 0);

-- Comentários
COMMENT ON COLUMN subscription_credit_plans.deposit_amount IS 'Valor de entrada mínima (usado em compra avulsa)';
COMMENT ON COLUMN subscription_credit_plans.pieces_per_subscription IS 'Quantidade de peças incluídas no plano';

-- Atualizar constraint em subscriptions
ALTER TABLE subscription_credit_subscriptions 
DROP CONSTRAINT IF EXISTS subscription_credit_subscriptions_plan_type_check;

ALTER TABLE subscription_credit_subscriptions 
ADD CONSTRAINT subscription_credit_subscriptions_plan_type_check 
CHECK (plan_type IN ('avulso', 'bimestral', 'trimestral', 'semestral', 'anual'));

ALTER TABLE subscription_credit_subscriptions 
DROP CONSTRAINT IF EXISTS subscription_credit_subscriptions_pending_plan_change_check;

ALTER TABLE subscription_credit_subscriptions 
ADD CONSTRAINT subscription_credit_subscriptions_pending_plan_change_check 
CHECK (pending_plan_change IN ('avulso', 'bimestral', 'trimestral', 'semestral', 'anual'));

-- Remover constraint UNIQUE de plan_type
ALTER TABLE subscription_credit_plans 
DROP CONSTRAINT IF EXISTS unique_plan_type;

-- Adicionar índice composto
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_credit_plans_type_name 
ON subscription_credit_plans(plan_type, name) 
WHERE is_active = true;

-- Criar view para cálculos automáticos
CREATE OR REPLACE VIEW subscription_credit_plans_with_calculations AS
SELECT 
  p.*,
  (p.base_credits + p.bonus_credits) as total_credits,
  (p.price * p.duration_months) as total_price,
  CASE 
    WHEN (p.base_credits + p.bonus_credits) > 0 
    THEN (p.price * p.duration_months) / (p.base_credits + p.bonus_credits)
    ELSE 0 
  END as coin_unit_cost,
  CASE 
    WHEN p.pieces_per_subscription > 0 AND (p.base_credits + p.bonus_credits) > 0
    THEN (p.base_credits + p.bonus_credits) / p.pieces_per_subscription
    ELSE 0 
  END as coins_per_piece
FROM subscription_credit_plans p;

COMMENT ON VIEW subscription_credit_plans_with_calculations IS 'View com cálculos automáticos de valores dos planos';

GRANT SELECT ON subscription_credit_plans_with_calculations TO authenticated, anon;

-- Inserir planos padrão adicionais
INSERT INTO subscription_credit_plans (
  plan_type, name, duration_months, price, base_credits, bonus_credits, 
  deposit_amount, pieces_per_subscription, is_active
)
VALUES 
  ('avulso', 'Compra Avulsa', 0, 0, 0, 0, 100.00, 1, true),
  ('bimestral', 'Plano Bimestral', 2, 200.00, 80, 10, 0, 2, false),
  ('anual', 'Plano Anual', 12, 350.00, 400, 100, 0, 12, false)
ON CONFLICT DO NOTHING;

-- Atualizar planos existentes
UPDATE subscription_credit_plans 
SET pieces_per_subscription = 3, deposit_amount = 0
WHERE plan_type = 'trimestral' AND pieces_per_subscription = 0;

UPDATE subscription_credit_plans 
SET pieces_per_subscription = 6, deposit_amount = 0
WHERE plan_type = 'semestral' AND pieces_per_subscription = 0;
```

---

**Escolha a opção que preferir e siga os passos!** ✅
