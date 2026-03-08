# 🧪 TESTE MANUAL DO TRIGGER

**Data**: 2026-03-07  
**Status**: ⏳ AGUARDANDO EXECUÇÃO

---

## 📋 CONTEXTO

A migration `20260307200000_fix_manual_payment_trigger.sql` foi aplicada com sucesso.

Agora precisamos testar se o trigger `auto_populate_production_queue()` funciona corretamente ao aprovar um `manual_payment`.

---

## 🎯 OBJETIVO DO TESTE

Verificar se ao aprovar um pagamento manual:
1. ✅ O trigger é executado sem erros
2. ✅ Um item é criado na `production_queue`
3. ✅ O `collection_id` é buscado corretamente da subscription ou quote
4. ✅ Os dados são populados corretamente

---

## 🚀 COMO EXECUTAR

### Opção 1: Via Supabase Studio (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
2. Abra o SQL Editor
3. Execute o script: `scripts/diagnostics/verificar-dados-teste.sql`
4. Verifique se há dados suficientes (subscriptions com collection)
5. Execute o script: `scripts/diagnostics/teste-trigger-resultado.sql`
6. Analise os resultados

### Opção 2: Via CLI

```powershell
# Verificar dados disponíveis
npx supabase db execute < scripts/diagnostics/verificar-dados-teste.sql

# Executar teste
npx supabase db execute < scripts/diagnostics/teste-trigger-resultado.sql
```

---

## 📊 RESULTADOS ESPERADOS

### 1. Estado Inicial
```
fase: ESTADO_INICIAL
itens_na_fila: 1 (ou mais)
```

### 2. Notices do DO Block
```
NOTICE: Pagamento criado: <uuid>
NOTICE: Pagamento aprovado!
```

### 3. Estado Final
```
fase: ESTADO_FINAL
itens_na_fila: 2 (ou mais - deve aumentar em 1)
```

### 4. Último Item Criado
```
tipo: ULTIMO_ITEM
order_id: <uuid do pagamento>
order_type: manual_payment
customer_name: <nome do cliente>
collection_name: <nome da coleção>
production_status: awaiting_choice ou ready_for_production
created_at: <timestamp recente>
```

---

## ❌ POSSÍVEIS ERROS

### Erro: "Nenhuma subscription com collection ativa encontrada"

**Causa**: Não há subscriptions com `active_collection_id` preenchido.

**Solução**: Criar uma subscription de teste ou usar uma quote:

```sql
-- Opção A: Atualizar subscription existente
UPDATE subscriptions
SET active_collection_id = (SELECT id FROM collections LIMIT 1)
WHERE id = (SELECT id FROM subscriptions LIMIT 1);

-- Opção B: Criar quote de teste
INSERT INTO quotes (
  user_id,
  collection_id,
  status,
  total_amount
) VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT id FROM collections LIMIT 1),
  'approved',
  150.00
);
```

### Erro: "record 'new' has no field 'collection_id'"

**Causa**: Migration não foi aplicada corretamente.

**Solução**: Reaplicar a migration:

```powershell
npx supabase db push --include-all
```

---

## ✅ VALIDAÇÃO DE SUCESSO

O teste é considerado bem-sucedido se:

1. ✅ Nenhum erro SQL é retornado
2. ✅ `itens_na_fila` aumenta em 1
3. ✅ Último item tem `order_type = 'manual_payment'`
4. ✅ `collection_name` está preenchido (não NULL)
5. ✅ `production_status` é válido

---

## 📝 PRÓXIMOS PASSOS APÓS SUCESSO

1. ✅ Documentar resultado em `FASE_5_TESTES_END_TO_END.md`
2. ⏳ Testar ProductionHub para ver se exibe o item
3. ⏳ Executar testes 2-4 do plano de testes
4. ⏳ Fazer commit das correções

---

## 🔧 SCRIPTS DISPONÍVEIS

### Verificação de Dados
- `scripts/diagnostics/verificar-dados-teste.sql` - Verifica se há dados suficientes

### Teste do Trigger
- `scripts/diagnostics/teste-trigger-resultado.sql` - Teste completo com resultados
- `scripts/diagnostics/teste-trigger-simples.sql` - Teste com notices detalhados

### Verificação do Sistema
- `scripts/diagnostics/verificar-sistema-producao.sql` - Visão geral do sistema
- `scripts/diagnostics/verificacao-unica-linha.sql` - Verificação rápida

---

**Criado por**: Kiro AI  
**Data**: 2026-03-07  
**Status**: ⏳ AGUARDANDO EXECUÇÃO MANUAL

