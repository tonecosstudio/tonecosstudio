# Diagnóstico: Página de Pedidos Não Mostra Assinaturas

## 🔍 Problema

A página `/admin/pedidos` não está mostrando assinaturas, mesmo após correção dos filtros.

## 🧪 Diagnóstico Necessário

Execute os scripts de diagnóstico para identificar a causa:

### 1. Verificar se há dados
```sql
-- Ver: scripts/diagnostics/teste-simples-orders.sql
```

Deve retornar:
- `TABELA_EXISTE`: total > 0
- `TEM_DADOS`: pelo menos 1 registro
- `JOIN_FUNCIONA`: pelo menos 1 registro

### 2. Verificar estrutura completa
```sql
-- Ver: scripts/diagnostics/debug-orders-page.sql
```

Deve mostrar:
- Total de assinaturas
- Total de entregas
- Profiles existentes
- Collections existentes
- Entregas completas com todos os dados

## 🎯 Causas Possíveis

### Causa 1: Não há entregas criadas
**Sintoma**: `subscription_deliveries` está vazia

**Motivo**: Entregas são criadas automaticamente quando:
1. Assinatura é aprovada (função `activate_subscription_from_payment`)
2. Cron job mensal executa (dia 1 de cada mês)

**Solução**: Criar entregas manualmente para assinaturas existentes
```sql
-- Para cada assinatura ativa
SELECT create_subscription_deliveries(id) 
FROM subscriptions 
WHERE status = 'active';
```

### Causa 2: Entregas com status 'scheduled'
**Sintoma**: Entregas existem mas não aparecem

**Motivo**: Página pode estar filtrando apenas entregas ativas

**Solução**: Verificar se filtro de status está correto

### Causa 3: Dados relacionados faltando
**Sintoma**: Entregas existem mas profiles/collections estão NULL

**Motivo**: 
- `subscriptions.user_id` não tem profile correspondente
- `subscriptions.collection_id` não tem collection correspondente

**Solução**: Verificar integridade referencial

### Causa 4: RLS bloqueando acesso
**Sintoma**: Query retorna vazio mas dados existem

**Motivo**: Row Level Security pode estar bloqueando

**Solução**: Verificar policies de `subscription_deliveries`

## 📝 Checklist de Diagnóstico

Execute na ordem:

- [ ] 1. Verificar se tabela `subscription_deliveries` existe
- [ ] 2. Verificar se há registros em `subscription_deliveries`
- [ ] 3. Verificar se há registros em `subscriptions` com status 'active'
- [ ] 4. Verificar se entregas têm `subscription_id` válido
- [ ] 5. Verificar se subscriptions têm `user_id` com profile
- [ ] 6. Verificar se subscriptions têm `collection_id` com collection
- [ ] 7. Verificar status das entregas (scheduled vs pending vs shipped)
- [ ] 8. Verificar se query do frontend funciona manualmente
- [ ] 9. Verificar console do navegador para erros
- [ ] 10. Verificar network tab para ver resposta da API

## 🔧 Soluções Rápidas

### Se não há entregas criadas:
```sql
-- Criar entregas para todas as assinaturas ativas
DO $$
DECLARE
  v_sub RECORD;
  v_count INTEGER;
BEGIN
  FOR v_sub IN 
    SELECT id FROM subscriptions WHERE status = 'active'
  LOOP
    v_count := create_subscription_deliveries(v_sub.id);
    RAISE NOTICE 'Criadas % entregas para assinatura %', v_count, v_sub.id;
  END LOOP;
END $$;
```

### Se entregas estão 'scheduled':
```sql
-- Ativar primeira entrega de cada assinatura
UPDATE subscription_deliveries
SET status = 'pending'
WHERE delivery_number = 1
AND status = 'scheduled';
```

### Se faltam profiles:
```sql
-- Verificar subscriptions sem profile
SELECT s.id, s.user_id
FROM subscriptions s
LEFT JOIN profiles p ON p.id = s.user_id
WHERE p.id IS NULL;
```

### Se faltam collections:
```sql
-- Verificar subscriptions sem collection
SELECT s.id, s.collection_id
FROM subscriptions s
LEFT JOIN collections c ON c.id = s.collection_id
WHERE s.collection_id IS NOT NULL
AND c.id IS NULL;
```

## 🎯 Próximos Passos

1. Execute `scripts/diagnostics/teste-simples-orders.sql`
2. Execute `scripts/diagnostics/debug-orders-page.sql`
3. Identifique qual causa se aplica
4. Aplique a solução correspondente
5. Recarregue a página `/admin/pedidos`
6. Verifique se assinaturas aparecem

## 📊 Informações Adicionais

### Estrutura Esperada

```
subscriptions (tabela principal)
  ↓ (1:N)
subscription_deliveries (entregas)
  ↓ (N:1)
profiles (dados do cliente)
  ↓ (N:1)
collections (dados da coleção)
```

### Query que o Frontend Usa

```sql
SELECT 
  sd.id,
  sd.status,
  sd.delivery_number,
  sd.tracking_code,
  sd.expected_delivery_date,
  sd.actual_delivery_date,
  sd.reveal_date,
  sd.created_at,
  sd.updated_at,
  sd.subscription_id,
  sd.character_id,
  s.id,
  s.user_id,
  s.collection_id,
  s.plan_type,
  s.deliveries_completed,
  s.deliveries_total,
  s.status
FROM subscription_deliveries sd
INNER JOIN subscriptions s ON s.id = sd.subscription_id
```

Depois busca profiles e collections separadamente.

---

**Status**: 🔍 Aguardando diagnóstico
