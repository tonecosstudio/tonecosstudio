# Correção: Status de Compra Avulsa

## Problema Resolvido ✅

A compra avulsa `b4ff58da` estava mostrando status `deposit_paid` mesmo após o saldo ter sido pago.

## Causa

O campo `balance_paid_at` foi preenchido diretamente no banco de dados sem atualizar o campo `status`. Isso aconteceu porque:
- Não havia trigger automático para sincronizar status com datas de pagamento
- Não havia constraint impedindo dados inconsistentes

## Solução Aplicada

### 1. Correção Imediata dos Dados ✅
```bash
node scripts/database/fix-standalone-purchase-status.mjs
```

**Resultado**: 1 compra corrigida (status: `deposit_paid` → `balance_paid`)

### 2. Prevenção Futura (Migrations Criadas)

#### Trigger de Sincronização Automática
**Arquivo**: `supabase/migrations/20260308000001_add_standalone_purchase_status_sync_trigger.sql`

O trigger atualiza automaticamente o status quando:
- `deposit_paid_at` é preenchido → status = `deposit_paid`
- `balance_paid_at` é preenchido → status = `balance_paid`
- `shipped_at` é preenchido → status = `shipped`
- `delivered_at` é preenchido → status = `delivered`

#### Constraints de Validação
**Arquivo**: `supabase/migrations/20260308000002_add_standalone_purchase_status_constraints.sql`

Constraints impedem que dados inconsistentes sejam salvos:
- Se `balance_paid_at` está preenchido, status DEVE ser `balance_paid` ou posterior
- Se `deposit_paid_at` está preenchido, status NÃO PODE ser `pending`
- E assim por diante...

## Como Aplicar as Migrations

### Opção 1: Script Automatizado (Recomendado)
```bash
node scripts/database/apply-status-sync-migrations.mjs
```

O script irá:
1. ✅ Verificar se há dados inconsistentes
2. ✅ Aplicar as migrations
3. ✅ Executar testes automáticos
4. ✅ Mostrar relatório

### Opção 2: Supabase Dashboard
1. Acesse: SQL Editor no Supabase Dashboard
2. Execute os arquivos na ordem:
   - `20260308000001_add_standalone_purchase_status_sync_trigger.sql`
   - `20260308000002_add_standalone_purchase_status_constraints.sql`

### Opção 3: Supabase CLI
```bash
supabase db push
```

## Validação

Após aplicar as migrations, teste:

```sql
-- Criar compra de teste
INSERT INTO standalone_purchases (...) VALUES (...);

-- Atualizar balance_paid_at
UPDATE standalone_purchases SET balance_paid_at = NOW() WHERE id = '...';

-- Verificar que status mudou automaticamente para 'balance_paid'
SELECT status FROM standalone_purchases WHERE id = '...';
```

## Arquivos Criados

### Scripts
- ✅ `scripts/database/fix-standalone-purchase-status.mjs` - Correção de dados (EXECUTADO)
- ✅ `scripts/database/apply-status-sync-migrations.mjs` - Aplicar migrations

### Migrations
- ✅ `supabase/migrations/20260308000001_add_standalone_purchase_status_sync_trigger.sql`
- ✅ `supabase/migrations/20260308000002_add_standalone_purchase_status_constraints.sql`

### Documentação
- ✅ `docs/production/ANALISE_BUG_STATUS_COMPRA_AVULSA.md` - Análise completa
- ✅ `docs/production/CORRECAO_STATUS_COMPRA_AVULSA.md` - Este documento

## Status Atual

| Item | Status |
|------|--------|
| Dados corrigidos | ✅ Concluído |
| Trigger criado | ✅ Pronto para aplicar |
| Constraints criados | ✅ Prontos para aplicar |
| Script de aplicação | ✅ Pronto para executar |
| Testes | ✅ Incluídos no script |

## Próximo Passo

Execute o script de aplicação das migrations:
```bash
node scripts/database/apply-status-sync-migrations.mjs
```

Isso garantirá que o problema nunca mais aconteça! 🎉
