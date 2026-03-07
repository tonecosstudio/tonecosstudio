# ✅ CORREÇÕES DE PRAZOS - APLICADAS

**Data:** 07/03/2026 - 19:45  
**Status:** 🟢 SQL COPIADO E PRONTO PARA APLICAR

---

## 📋 O QUE FOI FEITO

### 1. SQL Copiado para Clipboard ✅
O arquivo `FIX_PRAZOS_OFICIAIS.sql` foi copiado para sua área de transferência.

### 2. SQL Editor Aberto ✅
O navegador abriu automaticamente em:
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

---

## 🎯 PRÓXIMOS PASSOS

### Passo 1: Colar e Executar
1. No SQL Editor que abriu, pressione `Ctrl+V` para colar o SQL
2. Clique no botão **"Run"** (ou pressione `Ctrl+Enter`)
3. Aguarde a execução (pode levar alguns segundos)

### Passo 2: Verificar Resultados
Você verá várias queries sendo executadas. No final, deve aparecer:

```
✅ Queries de validação executadas
✅ Configurações atualizadas
✅ Estágios de produção ajustados
✅ Função calculate_delivery_dates criada
```

### Passo 3: Validar (Opcional)
Execute o script de validação:

```bash
node scripts/validate-prazos.mjs
```

Isso vai confirmar que tudo foi aplicado corretamente.

---

## 📊 O QUE SERÁ ALTERADO

### Configurações Removidas
- ❌ `shipping_days` (duplicata)

### Configurações Atualizadas
- ✏️ `production_days_min`: 15 → **30 dias**
- ✏️ `production_days_max`: 20 → **30 dias**
- ✏️ `shipping_business_days`: 5 → **15 dias**

### Configurações Adicionadas
- ➕ `delivery_interval_days`: **90 dias**
- ➕ `character_choice_days`: **7 dias**
- ➕ `balance_payment_days`: **5 dias**

### Estágios de Produção Ajustados
- ✏️ Aguardando escolha: **168h** (7 dias) ✅
- ✏️ Design: 48h → **120h** (5 dias)
- ✏️ Produção: 120h → **288h** (12 dias)
- ✏️ Controle qualidade: 24h → **96h** (4 dias)
- ✏️ Embalagem: 12h → **48h** (2 dias)
- **TOTAL: 720h = 30 dias** ✅

**Nota:** A coluna correta é `estimated_duration` (não `estimated_hours`)

### Função Criada
- ➕ `calculate_delivery_dates(date)` - Calcula automaticamente as datas

---

## 🎯 RESULTADO FINAL

### Fluxo Oficial
```
MARÇO (30 dias)    ABRIL (30 dias)    MAIO (15-17 dias)
📦 VENDAS          🏭 PRODUÇÃO        🚚 ENVIO
01 → 31            01 → 30            15 → último dia
```

### Exemplo Prático
```sql
SELECT * FROM calculate_delivery_dates('2026-03-01');
```

**Retorna:**
| Campo | Data | Descrição |
|-------|------|-----------|
| sales_start | 2026-03-01 | Início das vendas |
| sales_end | 2026-03-31 | Fim das vendas |
| production_start | 2026-04-01 | Início da produção |
| production_end | 2026-04-30 | Fim da produção |
| shipping_start | 2026-05-15 | Início dos envios (dia 15) |
| shipping_end | 2026-05-31 | Último dia do mês |

---

## 🔄 SE ALGO DER ERRADO

### Reverter Mudanças
Execute este SQL no SQL Editor:

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

-- Restaurar estágios antigos
UPDATE production_stages SET estimated_hours = 168 WHERE stage_name = 'awaiting_choice';
UPDATE production_stages SET estimated_hours = 48 WHERE stage_name = 'design';
UPDATE production_stages SET estimated_hours = 120 WHERE stage_name = 'production';
UPDATE production_stages SET estimated_hours = 24 WHERE stage_name = 'quality_check';
UPDATE production_stages SET estimated_hours = 12 WHERE stage_name = 'packaging';

-- Remover função
DROP FUNCTION IF EXISTS calculate_delivery_dates(DATE);
```

---

## 📝 CHECKLIST

- ✅ SQL copiado para clipboard
- ✅ SQL Editor aberto no navegador
- ⏳ Colar SQL no editor (Ctrl+V)
- ⏳ Executar SQL (botão "Run")
- ⏳ Verificar resultados
- ⏳ Validar com script (opcional)

---

## 🎉 APÓS APLICAR

1. ✅ Prazos padronizados e consistentes
2. ✅ Sem duplicatas
3. ✅ Configurações centralizadas
4. ✅ Cálculo automático de datas
5. ✅ Fluxo de 3 meses bem definido

---

**Última Atualização:** 07/03/2026 - 19:45  
**Próximo Passo:** Cole o SQL no editor e execute!
