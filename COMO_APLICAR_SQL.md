# 🔧 COMO APLICAR O FIX DO TRIGGER DE COINS

## 📌 SITUAÇÃO ATUAL

O trigger que calcula o saldo de coins está contando escolhas "pending", quando deveria contar apenas escolhas confirmadas. Isso fez com que o João Trimestral ficasse com 0 coins em vez de 400.

## ✅ SOLUÇÃO MAIS SIMPLES (RECOMENDADA)

### Aplicar via Supabase SQL Editor (2 minutos)

1. **Abra o SQL Editor:**
   
   👉 [CLIQUE AQUI](https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new)

2. **Cole o SQL do arquivo `FIX_TRIGGER_COINS.sql`**

3. **Clique em "Run"**

4. **Aguarde "Success. No rows returned"**

5. **Recarregue a página do admin**

---

## 🔄 ALTERNATIVAS (se a opção acima não funcionar)

### Opção 2: Via psql (se você tiver instalado)

```bash
# Obtenha a connection string em:
# https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/database

# Execute:
psql "sua-connection-string-aqui" -f FIX_TRIGGER_COINS.sql
```

### Opção 3: Via Supabase CLI

```bash
# Se você tiver o Supabase CLI configurado:
supabase db push
```

---

## 📄 SQL A SER APLICADO

O arquivo `FIX_TRIGGER_COINS.sql` contém:

```sql
CREATE OR REPLACE FUNCTION update_subscription_coins_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spent INTEGER;
BEGIN
  -- Calcular total gasto APENAS de escolhas confirmadas ou em produção
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
```

---

## 🎯 RESULTADO ESPERADO

Após aplicar o SQL:

### João Trimestral
- ✅ Coins Iniciais: 600
- ✅ Saldo Atual: 400 (600 - 200)
- ✅ 3 escolhas mensais visíveis:
  - Março 2026: Monkey D. Luffy (confirmed) - 200 coins
  - Abril 2026: Roronoa Zoro (pending) - 0 coins
  - Maio 2026: Nami (pending) - 0 coins

---

## 🔍 VERIFICAÇÃO

Para verificar se funcionou, execute no SQL Editor:

```sql
SELECT 
  s.coins_initial,
  s.coins_balance,
  COUNT(sms.id) as total_escolhas,
  COALESCE(SUM(CASE WHEN sms.status IN ('confirmed', 'in_production', 'shipped', 'delivered') THEN sms.coins_spent ELSE 0 END), 0) as coins_gastos
FROM subscriptions s
LEFT JOIN subscription_monthly_selections sms ON sms.subscription_id = s.id
WHERE s.user_id = (SELECT id FROM profiles WHERE email = 'trimestral@ordax.com.br')
GROUP BY s.id;
```

**Esperado:**
- coins_initial: 600
- coins_balance: 400
- total_escolhas: 3
- coins_gastos: 200

---

## 📞 PRECISA DE AJUDA?

Se encontrar problemas:

1. Verifique se está logado no projeto correto
2. Verifique se tem permissões de admin
3. Certifique-se de copiar o SQL completo (incluindo os `$$`)
4. Tente recarregar a página do Supabase e tentar novamente

---

## 📚 ARQUIVOS RELACIONADOS

- `FIX_TRIGGER_COINS.sql` - SQL a ser aplicado
- `APLICAR_SQL_MANUAL.md` - Instruções detalhadas
- `scripts/apply-sql-psql.ps1` - Script PowerShell (requer psql)
- `scripts/apply-sql-psql.sh` - Script Bash (requer psql)
- `scripts/show-sql-instructions.mjs` - Mostra instruções no terminal

---

**Última atualização:** 07/03/2026
