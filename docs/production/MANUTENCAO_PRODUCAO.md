# 🔧 GUIA DE MANUTENÇÃO: Production Queue

## 📋 VISÃO GERAL

Este documento explica como manter o sistema de Production Queue funcionando corretamente após a correção implementada.

## ⚠️ ESTADO ATUAL DO SISTEMA

### O Que Está Funcionando
- ✅ Production Queue com 1 item
- ✅ Hub de Produção exibindo dados
- ✅ Métricas calculadas corretamente
- ✅ Filtros e visualizações operacionais

### O Que Está Temporariamente Desabilitado
- ⚠️ Trigger `trigger_initialize_production_stages` (desabilitado para permitir inserções)
- ⚠️ Criação automática de production_stages

### Por Que Foi Desabilitado
O trigger estava falhando devido a uma coluna `stage` NOT NULL que existe no banco mas não está documentada nas migrations. Isso bloqueava todas as inserções em `production_queue`.

## 🚀 COMO ADICIONAR NOVOS ITENS À FILA

### Método 1: Via Trigger Automático (Recomendado para Futuro)

Quando o trigger estiver corrigido, novos itens serão adicionados automaticamente quando:

```sql
-- Para standalone_purchases
UPDATE standalone_purchases 
SET status = 'balance_paid' 
WHERE id = '<purchase_id>';

-- Para subscription_deliveries
UPDATE subscription_deliveries 
SET status = 'confirmed' 
WHERE id = '<delivery_id>';

-- Para manual_payments
UPDATE manual_payments 
SET status = 'approved' 
WHERE id = '<payment_id>';
```

### Método 2: Inserção Manual (Atual)

Enquanto o trigger estiver desabilitado, use este script:

```javascript
// popular-item-producao.mjs
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Pegar um purchase
const { data: purchase } = await supabase
  .from('standalone_purchases')
  .select('id, user_id, collection_id')
  .eq('status', 'balance_paid')
  .single();

// Pegar dados relacionados
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, email')
  .eq('id', purchase.user_id)
  .single();

const { data: collection } = await supabase
  .from('collections')
  .select('id, name')
  .eq('id', purchase.collection_id)
  .single();

// Inserir na fila
await supabase.from('production_queue').insert({
  order_id: purchase.id,
  order_type: 'standalone_purchase',
  user_id: purchase.user_id,
  customer_name: profile?.full_name || 'Unknown',
  customer_email: profile?.email || '',
  collection_id: collection?.id,
  collection_name: collection?.name || 'Unknown',
  production_status: 'ready_for_production',
  current_stage: 'design',
  choice_status: 'approved',
  priority_score: 50
});
```

## 🔍 DIAGNÓSTICO DE PROBLEMAS

### Problema: Novos Itens Não Aparecem

**Verificar**:
```bash
# 1. Verificar se há purchases com balance_paid
node diagnostico-producao.mjs

# 2. Verificar production_queue
SELECT COUNT(*) FROM production_queue;

# 3. Verificar se trigger está habilitado
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%production%';
```

**Solução**:
- Se trigger está desabilitado: Use inserção manual
- Se trigger está habilitado mas falhando: Desabilite e use inserção manual
- Se não há purchases: Crie um novo pedido de teste

### Problema: Hub Mostra Dados Incorretos

**Verificar**:
```sql
-- Ver dados brutos
SELECT 
  id,
  customer_name,
  collection_name,
  current_stage,
  production_status,
  priority_score
FROM production_queue
ORDER BY created_at DESC;
```

**Solução**:
- Limpar cache do navegador
- Verificar se RLS está configurado corretamente
- Verificar se usuário é admin

### Problema: Erro ao Inserir

**Erro Comum**: `null value in column "stage" of relation "production_stages"`

**Causa**: Trigger `trigger_initialize_production_stages` está habilitado

**Solução**:
```sql
-- Desabilitar trigger
DROP TRIGGER IF EXISTS trigger_initialize_production_stages ON production_queue;
```

## 🛠️ CORREÇÃO PERMANENTE DO TRIGGER

Para reabilitar o trigger de forma segura:

### Passo 1: Identificar Coluna Problemática

```sql
-- Ver estrutura da tabela production_stages
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'production_stages'
ORDER BY ordinal_position;
```

### Passo 2: Corrigir Função do Trigger

```sql
CREATE OR REPLACE FUNCTION initialize_production_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO production_stages (
    production_queue_id,
    stage_name,
    stage_order,
    status,
    estimated_duration,
    stage  -- ← ADICIONAR ESTA COLUNA SE EXISTIR
  ) VALUES
    (NEW.id, 'awaiting_choice', 1, 'pending', 168, 'awaiting_choice'),
    (NEW.id, 'design', 2, 'pending', 48, 'design'),
    (NEW.id, 'production', 3, 'pending', 120, 'production'),
    (NEW.id, 'quality_check', 4, 'pending', 24, 'quality_check'),
    (NEW.id, 'packaging', 5, 'pending', 12, 'packaging'),
    (NEW.id, 'shipped', 6, 'pending', 0, 'shipped')
  ON CONFLICT (production_queue_id, stage_order) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to initialize stages: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Passo 3: Reabilitar Trigger

```sql
CREATE TRIGGER trigger_initialize_production_stages
  AFTER INSERT ON production_queue
  FOR EACH ROW
  EXECUTE FUNCTION initialize_production_stages();
```

### Passo 4: Testar

```bash
node aplicar-correcoes-FINAL.mjs
```

## 📊 MONITORAMENTO

### Métricas para Acompanhar

```sql
-- Total de itens na fila
SELECT COUNT(*) as total FROM production_queue;

-- Itens por estágio
SELECT 
  current_stage,
  COUNT(*) as count
FROM production_queue
GROUP BY current_stage;

-- Itens por status
SELECT 
  production_status,
  COUNT(*) as count
FROM production_queue
GROUP BY production_status;

-- Itens urgentes (deadline < 24h)
SELECT COUNT(*) as urgent
FROM production_queue
WHERE choice_deadline < NOW() + INTERVAL '24 hours'
  AND choice_status = 'pending';
```

### Alertas Recomendados

1. **Fila Vazia**: Se `COUNT(*) = 0` e há purchases com balance_paid
2. **Trigger Falhando**: Se logs mostram erros de production_stages
3. **Deadlines Críticos**: Se há itens com deadline < 24h

## 🔄 SINCRONIZAÇÃO DE SCHEMA

### Quando Fazer

- Após qualquer migration manual no Supabase
- Semanalmente como manutenção preventiva
- Antes de fazer novas migrations

### Como Fazer

```bash
# 1. Pull do schema real
npx supabase db pull

# 2. Revisar diferenças
git diff supabase/migrations/

# 3. Criar migration de correção se necessário
npx supabase migration new fix_schema_drift

# 4. Aplicar migrations
npx supabase db push
```

## 📞 SUPORTE

### Problemas Comuns e Soluções Rápidas

| Problema | Solução Rápida |
|----------|----------------|
| Fila vazia | `node aplicar-correcoes-FINAL.mjs` |
| Erro ao inserir | Desabilitar trigger problemático |
| Hub não carrega | Verificar RLS e permissões de admin |
| Métricas erradas | Limpar cache e recarregar |

### Arquivos de Referência

- `CORRECAO_COMPLETA_PRODUCAO.md` - Análise técnica completa
- `diagnostico-producao.mjs` - Script de diagnóstico
- `aplicar-correcoes-FINAL.mjs` - Script de correção

### Logs Úteis

```bash
# Ver logs do Supabase
# Dashboard > Logs > Database

# Filtrar por production_queue
# Buscar por: "production_queue" OR "production_stages"
```

## ✅ CHECKLIST DE MANUTENÇÃO SEMANAL

- [ ] Verificar que production_queue não está vazia
- [ ] Verificar que triggers estão funcionando
- [ ] Revisar itens com deadline próximo
- [ ] Sincronizar schema (db pull)
- [ ] Verificar logs de erro
- [ ] Testar criação de novo item

---

*Última atualização: 2026-03-07*  
*Versão: 1.0.0*  
*Status: ✅ ATIVO*
