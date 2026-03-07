# 🔧 COMO APLICAR AS CORREÇÕES DE PRAZOS

## Método 1: SQL Editor do Supabase (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

2. Copie e cole o conteúdo do arquivo `FIX_PRAZOS_OFICIAIS.sql`

3. Clique em "Run" para executar

4. Verifique os resultados das queries de validação no final

---

## Método 2: psql (Linha de Comando)

```bash
# Conectar ao banco remoto
psql "postgresql://postgres.pabxpvqwtvbjaunjejud:sua-senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Executar o arquivo
\i FIX_PRAZOS_OFICIAIS.sql
```

---

## ✅ Validação Após Aplicar

Execute estas queries para confirmar que tudo foi aplicado:

```sql
-- 1. Verificar que shipping_days foi removido
SELECT COUNT(*) as deve_ser_zero 
FROM system_settings 
WHERE key = 'shipping_days';

-- 2. Verificar novos valores
SELECT key, value, description
FROM system_settings
WHERE key IN (
  'production_days_min',
  'production_days_max',
  'shipping_business_days',
  'sales_duration_days',
  'delivery_interval_days',
  'character_choice_days',
  'balance_payment_days'
)
ORDER BY key;

-- 3. Verificar estágios de produção (deve somar 30 dias)
SELECT 
  SUM(estimated_hours) as total_horas,
  ROUND(SUM(estimated_hours) / 24.0, 1) as total_dias
FROM production_stages;

-- 4. Testar função de cálculo de datas
SELECT * FROM calculate_delivery_dates('2026-03-01');
```

---

## 📊 Resultados Esperados

### Query 1 (Duplicata removida):
```
deve_ser_zero
-------------
0
```

### Query 2 (Novos valores):
```
key                      | value | description
-------------------------+-------+------------------------------------------
balance_payment_days     | 5     | Prazo para pagamento de saldo em dias
character_choice_days    | 7     | Prazo para escolha de personagem em dias
delivery_interval_days   | 90    | Intervalo entre entregas em dias (3 meses)
production_days_max      | 30    | Prazo máximo de produção em dias
production_days_min      | 30    | Prazo de produção em dias (mês completo)
sales_duration_days      | 30    | Duração do período de vendas em dias
shipping_business_days   | 15    | Prazo de envio (dia 15 ao último dia do mês)
```

### Query 3 (Estágios):
```
total_horas | total_dias
------------+-----------
720         | 30.0
```

### Query 4 (Cálculo de datas):
```
sales_start  | sales_end  | production_start | production_end | shipping_start | shipping_end
-------------+------------+------------------+----------------+----------------+-------------
2026-03-01   | 2026-03-31 | 2026-04-01       | 2026-04-30     | 2026-05-15     | 2026-05-31
```

---

## 🚨 Em Caso de Erro

Se algo der errado, você pode reverter com:

```sql
-- Restaurar valores antigos
UPDATE system_settings SET value = '15' WHERE key = 'production_days_min';
UPDATE system_settings SET value = '20' WHERE key = 'production_days_max';
UPDATE system_settings SET value = '5' WHERE key = 'shipping_business_days';

-- Remover novas configurações
DELETE FROM system_settings WHERE key IN (
  'delivery_interval_days',
  'character_choice_days',
  'balance_payment_days'
);

-- Restaurar estágios antigos (soma = 15.5 dias)
-- Nota: A coluna correta é estimated_duration
UPDATE production_stages SET estimated_duration = 168 WHERE stage_name = 'awaiting_choice';
UPDATE production_stages SET estimated_duration = 48 WHERE stage_name = 'design';
UPDATE production_stages SET estimated_duration = 120 WHERE stage_name = 'production';
UPDATE production_stages SET estimated_duration = 24 WHERE stage_name = 'quality_check';
UPDATE production_stages SET estimated_duration = 12 WHERE stage_name = 'packaging';
```

---

## 📝 Próximos Passos Após Aplicar

1. ✅ Validar que todas as queries retornam os valores esperados
2. ⏳ Atualizar interface admin
3. ⏳ Atualizar emails de notificação
4. ⏳ Atualizar FAQ do site
5. ⏳ Comunicar mudanças aos clientes ativos

---

**Última Atualização:** 07/03/2026 - 19:15
