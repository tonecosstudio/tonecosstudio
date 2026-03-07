# 🔧 Aplicar Sistema SSOT para Ciclos

## ⚠️ IMPORTANTE
Aplique o SQL `FIX_CYCLES_USE_SSOT.sql` no Supabase SQL Editor.

## 📋 Passos

### 1. Acesse o Supabase SQL Editor
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql

### 2. Copie o SQL
Abra o arquivo `FIX_CYCLES_USE_SSOT.sql` e copie TODO o conteúdo.

### 3. Cole e Execute
- Cole no SQL Editor
- Clique em "Run" (ou Ctrl+Enter)
- Aguarde a execução

### 4. Verifique o Resultado
Você deve ver na aba "Results":
- 10 ciclos criados (março a dezembro 2026)
- Cada ciclo com prazos corretos:
  - Vendas: 30 dias (mês completo)
  - Produção: 30 dias (mês seguinte)
  - Envio: 5º dia útil da 2ª quinzena

## ✅ Resultado Esperado

```
março/2026:
  Vendas: 01/03/2026 - 31/03/2026 (30 dias)
  Produção: 01/04/2026 - 30/04/2026 (30 dias)
  Envio: ~21/05/2026 (total: ~81 dias)

abril/2026:
  Vendas: 01/04/2026 - 30/04/2026 (30 dias)
  Produção: 01/05/2026 - 31/05/2026 (31 dias)
  Envio: ~20/06/2026 (total: ~81 dias)
```

## 🎯 Benefícios do Sistema SSOT

### Antes (Hardcoded)
```sql
-- Prazos fixos no código
open_start = '2026-03-01'
open_end = '2026-03-15'  -- 15 dias fixos
```

### Depois (SSOT)
```sql
-- Prazos calculados de system_settings
SELECT * FROM generate_cycle_dates(3, 2026);
-- Usa production_days e shipping_business_days automaticamente
```

### Alterar Prazos no Futuro
```sql
-- Mudar prazo de produção
UPDATE system_settings 
SET production_days = 45 
WHERE key = 'production_days';

-- ✅ Trigger dispara automaticamente
-- ✅ Todos os ciclos futuros são recalculados
-- ✅ Sem código para alterar!
```

## 🔄 Funções Criadas

### 1. generate_cycle_dates(month, year)
Calcula datas de um ciclo baseado no SSOT.

```sql
-- Exemplo: Calcular datas para março/2026
SELECT * FROM generate_cycle_dates(3, 2026);

-- Retorna:
-- open_start, open_end, production_start, production_end, shipping_date
```

### 2. populate_cycles(start_month, start_year, num_months)
Cria múltiplos ciclos de uma vez.

```sql
-- Criar ciclos para 2027
SELECT populate_cycles(1, 2027, 12);

-- Retorna: número de ciclos criados
```

### 3. Trigger: update_cycles_on_settings_change
Atualiza ciclos automaticamente quando system_settings muda.

```sql
-- Quando você faz:
UPDATE system_settings SET production_days = 45;

-- O trigger automaticamente:
-- 1. Detecta mudança
-- 2. Recalcula todos os ciclos futuros
-- 3. Atualiza a tabela cycles
```

## 🧪 Testar Após Aplicar

### 1. Verificar Ciclos
```sql
SELECT 
  month,
  year,
  open_start::date as vendas_inicio,
  open_end::date as vendas_fim,
  production_start::date as producao_inicio,
  production_end::date as producao_fim,
  shipping_date as envio
FROM cycles
ORDER BY year, month;
```

### 2. Testar Função de Geração
```sql
-- Gerar datas para junho/2026
SELECT * FROM generate_cycle_dates(6, 2026);
```

### 3. Testar Trigger
```sql
-- Alterar prazo
UPDATE system_settings 
SET production_days = 35 
WHERE key = 'production_days';

-- Verificar se ciclos foram atualizados
SELECT month, year, production_end - production_start as dias_producao
FROM cycles
ORDER BY year, month;
```

## 📱 Recarregar Interface

Após aplicar o SQL:
1. Acesse: http://localhost:8080/admin/ciclos
2. Recarregue a página (F5)
3. Verifique os prazos corretos

## ❓ Problemas?

### Erro: "column cycle_number does not exist"
✅ Normal! O SQL remove essa coluna (sistema não é mais quinzenal).

### Erro: "function already exists"
✅ Normal! O SQL recria as funções.

### Nenhum ciclo aparece
Execute manualmente:
```sql
SELECT populate_cycles(3, 2026, 10);
```

## 🎉 Conclusão

Após aplicar, você terá:
- ✅ Ciclos mensais (não mais quinzenais)
- ✅ Prazos calculados do SSOT
- ✅ Atualização automática via trigger
- ✅ Fácil manutenção futura
