# 🚀 EXECUTAR TESTE AGORA - GUIA RÁPIDO

**Data**: 2026-03-07 20:10  
**Tempo**: 5 minutos

---

## ✅ O QUE JÁ FOI FEITO

1. ✅ Migration `20260307200000_fix_manual_payment_trigger.sql` aplicada
2. ✅ Trigger `auto_populate_production_queue()` corrigido
3. ✅ Scripts de teste criados

---

## 🎯 O QUE FAZER AGORA

### PASSO 1: Abrir Supabase Studio

Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor

### PASSO 2: Abrir SQL Editor

Clique em "SQL Editor" no menu lateral esquerdo.

### PASSO 3: Executar Script de Verificação

Cole e execute este SQL:

```sql
-- Verificar se temos dados necessários
SELECT 
  'USUARIOS' as tipo,
  COUNT(*) as total
FROM profiles
UNION ALL
SELECT 
  'METODOS_PAGAMENTO' as tipo,
  COUNT(*) as total
FROM admin_payment_methods
UNION ALL
SELECT 
  'SUBSCRIPTIONS_COM_COLLECTION' as tipo,
  COUNT(*) as total
FROM subscriptions
WHERE active_collection_id IS NOT NULL;
```

**Resultado esperado**:
- USUARIOS: > 0
- METODOS_PAGAMENTO: > 0
- SUBSCRIPTIONS_COM_COLLECTION: > 0

Se `SUBSCRIPTIONS_COM_COLLECTION = 0`, execute primeiro:

```sql
-- Criar subscription de teste com collection
UPDATE subscriptions
SET active_collection_id = (SELECT id FROM collections LIMIT 1)
WHERE id = (SELECT id FROM subscriptions LIMIT 1);
```

### PASSO 4: Executar Teste do Trigger

Cole e execute este SQL completo:

```sql
-- 🧪 TESTE DO TRIGGER
-- Verificar estado inicial
SELECT 
  'ANTES' as momento,
  COUNT(*) as itens_na_fila
FROM production_queue;

-- Criar e aprovar pagamento de teste
DO $$
DECLARE
  v_user_id UUID;
  v_payment_method_id UUID;
  v_subscription_id UUID;
  v_payment_id UUID;
BEGIN
  -- Pegar IDs necessários
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_payment_method_id FROM admin_payment_methods LIMIT 1;
  SELECT id INTO v_subscription_id FROM subscriptions WHERE active_collection_id IS NOT NULL LIMIT 1;
  
  -- Criar pagamento de teste
  INSERT INTO manual_payments (
    reference_number,
    user_id,
    payment_method_id,
    subscription_id,
    amount,
    currency,
    payment_type,
    status
  ) VALUES (
    'TEST-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'),
    v_user_id,
    v_payment_method_id,
    v_subscription_id,
    150.00,
    'BRL',
    'one_time',
    'pending'
  ) RETURNING id INTO v_payment_id;
  
  RAISE NOTICE 'Pagamento criado: %', v_payment_id;
  
  -- Aprovar o pagamento (TRIGGER!)
  UPDATE manual_payments
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = v_user_id
  WHERE id = v_payment_id;
  
  RAISE NOTICE 'Pagamento aprovado!';
END $$;

-- Verificar estado final
SELECT 
  'DEPOIS' as momento,
  COUNT(*) as itens_na_fila
FROM production_queue;

-- Mostrar último item criado
SELECT 
  'ITEM_CRIADO' as tipo,
  order_id,
  order_type,
  customer_name,
  collection_name,
  production_status,
  created_at
FROM production_queue
ORDER BY created_at DESC
LIMIT 1;
```

---

## ✅ RESULTADO ESPERADO

Você deve ver 4 resultados:

### 1. ANTES
```
momento: ANTES
itens_na_fila: 1 (ou mais)
```

### 2. Notices (na aba "Messages")
```
NOTICE: Pagamento criado: <uuid>
NOTICE: Pagamento aprovado!
```

### 3. DEPOIS
```
momento: DEPOIS
itens_na_fila: 2 (aumentou em 1!)
```

### 4. ITEM_CRIADO
```
tipo: ITEM_CRIADO
order_id: <uuid>
order_type: manual_payment
customer_name: <nome>
collection_name: <coleção>
production_status: awaiting_choice ou ready_for_production
created_at: <agora>
```

---

## ✅ SUCESSO!

Se você viu:
- ✅ `itens_na_fila` aumentou em 1
- ✅ `order_type = 'manual_payment'`
- ✅ `collection_name` está preenchido
- ✅ Nenhum erro SQL

**O trigger está funcionando perfeitamente!** 🎉

---

## ❌ SE DER ERRO

### Erro: "Nenhuma subscription com collection ativa"

Execute antes do teste:

```sql
UPDATE subscriptions
SET active_collection_id = (SELECT id FROM collections LIMIT 1)
WHERE id = (SELECT id FROM subscriptions LIMIT 1);
```

### Erro: "record 'new' has no field 'collection_id'"

A migration não foi aplicada. Execute:

```powershell
npx supabase db push --include-all
```

### Outro erro

Copie a mensagem de erro completa e me informe.

---

## 📝 APÓS O TESTE

Se o teste passou:

1. ✅ Marque como concluído em `FASE_5_TESTES_END_TO_END.md`
2. ✅ Teste o ProductionHub para ver o item
3. ✅ Continue com os testes 2-4 do plano

---

**Criado por**: Kiro AI  
**Data**: 2026-03-07 20:10  
**Tempo estimado**: 5 minutos

