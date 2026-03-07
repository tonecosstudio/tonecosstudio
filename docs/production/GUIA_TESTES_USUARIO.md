# 📖 GUIA DE TESTES - PARA O USUÁRIO

**Data**: 2026-03-07  
**Tempo Estimado**: 30-45 minutos

---

## 🎯 OBJETIVO

Você vai testar o sistema de produção para garantir que tudo está funcionando corretamente.

---

## 📋 PREPARAÇÃO

### 1. Abrir Supabase Dashboard
1. Acesse https://supabase.com/dashboard
2. Faça login
3. Selecione seu projeto
4. Vá para "SQL Editor"

### 2. Executar Script de Verificação
1. Copie o conteúdo de `scripts/diagnostics/verificar-sistema-producao.sql`
2. Cole no SQL Editor
3. Clique em "Run"
4. Anote os resultados

**O que você deve ver**:
- ✅ Triggers ativos (pelo menos 2)
- ✅ Função auto_populate_production_queue existe
- ✅ Schema da production_queue correto
- ✅ Alguns itens na fila (pode ser 0 se não houver pedidos)

---

## 🧪 TESTE 1: APROVAR PAGAMENTO MANUAL

### Objetivo
Testar que aprovar um pagamento cria automaticamente um item na fila de produção.

### Passos

#### 1. Verificar Pagamentos Pendentes
```sql
SELECT 
  id,
  user_id,
  amount,
  status,
  created_at
FROM manual_payments
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;
```

**Se não houver pagamentos pendentes**, crie um:
```sql
-- Primeiro, pegue um user_id válido
SELECT id FROM profiles LIMIT 1;

-- Depois, crie um pagamento de teste
INSERT INTO manual_payments (
  user_id,
  amount,
  status,
  payment_method,
  created_at
) VALUES (
  'COLE_O_USER_ID_AQUI',  -- UUID do usuário
  100.00,
  'pending',
  'pix',
  NOW()
) RETURNING id;
```

#### 2. Anotar Dados ANTES da Aprovação
```sql
-- Contar itens na fila ANTES
SELECT COUNT(*) as itens_antes FROM production_queue;
```

Anote o número: **_____**

#### 3. Aprovar o Pagamento
```sql
-- Substitua PAYMENT_ID pelo ID do pagamento
UPDATE manual_payments
SET status = 'approved'
WHERE id = 'PAYMENT_ID'
RETURNING *;
```

#### 4. Verificar Que Item Foi Criado
```sql
-- Contar itens na fila DEPOIS
SELECT COUNT(*) as itens_depois FROM production_queue;

-- Ver o item criado
SELECT 
  id,
  user_id,
  priority,
  status,
  source_type,
  source_id,
  created_at
FROM production_queue
ORDER BY created_at DESC
LIMIT 1;
```

### ✅ Critérios de Sucesso
- [ ] Número de itens aumentou em 1
- [ ] Item criado tem `source_type = 'manual_payment'`
- [ ] `user_id` é um INTEGER (não UUID)
- [ ] `priority` é um INTEGER
- [ ] `source_id` corresponde ao ID do pagamento

### 📝 Resultado do Teste 1
**Status**: ⏳ Pendente  
**Itens antes**: _____  
**Itens depois**: _____  
**Item criado**: ✅ Sim / ❌ Não  
**Observações**: _____

---

## 🧪 TESTE 2: CONFIRMAR ENTREGA DE ASSINATURA

### Objetivo
Testar que confirmar uma entrega cria automaticamente um item na fila de produção.

### Passos

#### 1. Verificar Entregas Não Confirmadas
```sql
SELECT 
  id,
  user_id,
  status,
  delivery_date,
  created_at
FROM subscription_deliveries
WHERE status != 'confirmed'
ORDER BY created_at DESC
LIMIT 5;
```

**Se não houver entregas**, você pode pular este teste ou criar uma de teste.

#### 2. Anotar Dados ANTES da Confirmação
```sql
SELECT COUNT(*) as itens_antes FROM production_queue;
```

Anote o número: **_____**

#### 3. Confirmar a Entrega
```sql
-- Substitua DELIVERY_ID pelo ID da entrega
UPDATE subscription_deliveries
SET status = 'confirmed'
WHERE id = 'DELIVERY_ID'
RETURNING *;
```

#### 4. Verificar Que Item Foi Criado
```sql
-- Contar itens na fila DEPOIS
SELECT COUNT(*) as itens_depois FROM production_queue;

-- Ver o item criado
SELECT 
  id,
  user_id,
  priority,
  status,
  source_type,
  source_id,
  created_at
FROM production_queue
ORDER BY created_at DESC
LIMIT 1;
```

### ✅ Critérios de Sucesso
- [ ] Número de itens aumentou em 1
- [ ] Item criado tem `source_type = 'subscription_delivery'`
- [ ] `user_id` é um INTEGER
- [ ] `priority` é um INTEGER
- [ ] `source_id` corresponde ao ID da entrega

### 📝 Resultado do Teste 2
**Status**: ⏳ Pendente  
**Itens antes**: _____  
**Itens depois**: _____  
**Item criado**: ✅ Sim / ❌ Não  
**Observações**: _____

---

## 🧪 TESTE 3: VERIFICAR PRODUCTION HUB

### Objetivo
Testar que o Hub de Produção exibe os itens corretamente.

### Passos

#### 1. Acessar o Hub
1. Abra o navegador
2. Acesse `http://localhost:5173/admin/production-hub` (ou sua URL)
3. Faça login como admin

#### 2. Verificar Listagem
- [ ] Hub carrega sem erros
- [ ] Itens são exibidos
- [ ] Métricas aparecem no topo

#### 3. Verificar Métricas
- [ ] Total de itens está correto
- [ ] Itens urgentes (se houver)
- [ ] Itens por status

#### 4. Testar Filtros
- [ ] Filtrar por status funciona
- [ ] Busca funciona
- [ ] Ordenação funciona

#### 5. Verificar Detalhes
- [ ] Clicar em um item abre detalhes
- [ ] Informações do usuário aparecem
- [ ] Dados do pedido estão corretos

### ✅ Critérios de Sucesso
- [ ] Hub carrega sem erros
- [ ] Itens exibidos corretamente
- [ ] Métricas corretas
- [ ] Filtros funcionando
- [ ] Detalhes completos

### 📝 Resultado do Teste 3
**Status**: ⏳ Pendente  
**Hub carregou**: ✅ Sim / ❌ Não  
**Itens exibidos**: _____  
**Erros no console**: ✅ Sim / ❌ Não  
**Observações**: _____

---

## 🧪 TESTE 4: VERIFICAR QUERIES DAS PÁGINAS

### Objetivo
Garantir que todas as páginas usam o schema correto.

### Passos

#### 1. Abrir DevTools
1. Pressione F12 no navegador
2. Vá para a aba "Network"
3. Filtre por "Fetch/XHR"

#### 2. Testar PaymentVerification
1. Acesse `/admin/payment-verification`
2. Observe as requisições no Network
3. Verifique que não há erros 404 ou 500
4. Confirme que queries usam `user_id`

#### 3. Testar AdminUsers
1. Acesse `/admin/users`
2. Observe as requisições
3. Verifique que não há erros
4. Confirme que queries usam `user_id`

#### 4. Testar OrdersPage
1. Acesse `/admin/orders`
2. Observe as requisições
3. Verifique que não há erros
4. Confirme que dados carregam

### ✅ Critérios de Sucesso
- [ ] PaymentVerification sem erros
- [ ] AdminUsers sem erros
- [ ] OrdersPage sem erros
- [ ] Queries usam `user_id`
- [ ] Dados carregam corretamente

### 📝 Resultado do Teste 4
**Status**: ⏳ Pendente  
**PaymentVerification**: ✅ OK / ❌ Erro  
**AdminUsers**: ✅ OK / ❌ Erro  
**OrdersPage**: ✅ OK / ❌ Erro  
**Observações**: _____

---

## 📊 RESUMO DOS TESTES

### Resultados
- **Teste 1 (Manual Payment)**: ⏳ Pendente
- **Teste 2 (Subscription Delivery)**: ⏳ Pendente
- **Teste 3 (Production Hub)**: ⏳ Pendente
- **Teste 4 (Queries)**: ⏳ Pendente

### Status Geral
**Testes Passados**: 0/4  
**Testes Falhados**: 0/4  
**Problemas Encontrados**: 0

---

## 🚨 SE ENCONTRAR PROBLEMAS

### Problema: Trigger não executou
**Solução**: Verificar se trigger está ativo
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%production_queue%';
```

### Problema: Item não aparece no Hub
**Solução**: Verificar se item foi criado
```sql
SELECT * FROM production_queue ORDER BY created_at DESC LIMIT 5;
```

### Problema: Erro 404 ou 500
**Solução**: Verificar console do navegador e logs do servidor

---

## ✅ CONCLUSÃO

Após executar todos os testes, preencha:

**Data dos Testes**: _____  
**Todos os testes passaram**: ✅ Sim / ❌ Não  
**Sistema está funcionando**: ✅ Sim / ❌ Não  
**Observações finais**: _____

---

**Próximo passo**: Reportar resultados para análise final
