# 🔧 APLICAR FIX DO TRIGGER DE COINS

## ⚠️ AÇÃO NECESSÁRIA

O SQL precisa ser aplicado manualmente no Supabase SQL Editor.

## 📋 PASSO A PASSO

### 1. Abra o SQL Editor

Clique no link abaixo para abrir o SQL Editor do Supabase:

👉 **[ABRIR SQL EDITOR](https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new)**

### 2. Cole o SQL

Copie e cole o SQL abaixo no editor:

```sql
-- ============================================================================
-- FIX: Atualizar trigger para contar apenas escolhas confirmadas
-- ============================================================================

-- Recriar função do trigger
CREATE OR REPLACE FUNCTION update_subscription_coins_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spent INTEGER;
BEGIN
  -- Calcular total gasto APENAS de escolhas confirmadas ou em produção
  -- Escolhas "pending" não gastam coins até serem confirmadas
  SELECT COALESCE(SUM(coins_spent), 0)
  INTO v_total_spent
  FROM subscription_monthly_selections
  WHERE subscription_id = COALESCE(NEW.subscription_id, OLD.subscription_id)
  AND status IN ('confirmed', 'in_production', 'shipped', 'delivered');
  
  -- Atualizar saldo
  UPDATE subscriptions
  SET 
    coins_balance = coins_initial - v_total_spent,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.subscription_id, OLD.subscription_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Comentário atualizado
COMMENT ON FUNCTION update_subscription_coins_balance IS 
  'Atualiza saldo de coins automaticamente quando escolhas são confirmadas.
   Apenas escolhas com status confirmed, in_production, shipped ou delivered gastam coins.
   Escolhas pending não afetam o saldo até serem confirmadas.';

-- ============================================================================
-- FIM DO FIX
-- ============================================================================
```

### 3. Execute

Clique no botão **"Run"** (ou pressione `Ctrl+Enter`)

### 4. Aguarde Confirmação

Você deve ver a mensagem: **"Success. No rows returned"**

### 5. Recarregue a Página do Admin

Após aplicar, recarregue a página de detalhes do usuário João Trimestral.

---

## ✅ RESULTADO ESPERADO

Após aplicar o SQL e recarregar a página:

### João Trimestral (trimestral@ordax.com.br)

- **Coins Iniciais:** 600
- **Coins Gastos:** 200 (1 escolha confirmada)
- **Saldo Atual:** 400 coins ✅

### Escolhas Mensais

1. **Março 2026:** Monkey D. Luffy (confirmed) - 200 coins gastos
2. **Abril 2026:** Roronoa Zoro (pending) - 0 coins gastos
3. **Maio 2026:** Nami (pending) - 0 coins gastos

---

## 🎯 O QUE ESTE SQL FAZ

- ✅ Corrige o trigger que calcula o saldo de coins
- ✅ Agora conta APENAS escolhas confirmadas (confirmed, in_production, shipped, delivered)
- ✅ Escolhas "pending" NÃO gastam coins até serem confirmadas
- ✅ Isso corrige o problema do João Trimestral que estava com 0 coins

---

## 🔍 VERIFICAÇÃO

Após aplicar, você pode verificar se funcionou executando este SQL no mesmo editor:

```sql
SELECT 
  s.id,
  s.coins_initial,
  s.coins_balance,
  COUNT(sms.id) as total_escolhas,
  COUNT(CASE WHEN sms.status IN ('confirmed', 'in_production', 'shipped', 'delivered') THEN 1 END) as escolhas_confirmadas,
  COALESCE(SUM(CASE WHEN sms.status IN ('confirmed', 'in_production', 'shipped', 'delivered') THEN sms.coins_spent ELSE 0 END), 0) as coins_gastos
FROM subscriptions s
LEFT JOIN subscription_monthly_selections sms ON sms.subscription_id = s.id
WHERE s.user_id = (SELECT id FROM profiles WHERE email = 'trimestral@ordax.com.br')
GROUP BY s.id;
```

**Resultado esperado:**
- coins_initial: 600
- coins_balance: 400
- total_escolhas: 3
- escolhas_confirmadas: 1
- coins_gastos: 200

---

## 📞 PROBLEMAS?

Se encontrar algum erro ao executar o SQL, verifique:

1. Você está logado no projeto correto (pabxpvqwtvbjaunjejud)
2. Você tem permissões de admin no projeto
3. O SQL foi copiado completamente (incluindo os `$$`)

---

**Data:** 07/03/2026  
**Projeto:** Ordax - Sistema Híbrido de Assinaturas
