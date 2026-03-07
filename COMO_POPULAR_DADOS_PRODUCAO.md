# Como Popular Dados de Produção

## 🎯 Problema

O Hub de Produção está mostrando "0" em todas as métricas porque a tabela `production_queue` está vazia.

## 📊 Como Funciona

A tabela `production_queue` **NÃO é populada manualmente**. Ela é preenchida automaticamente por **triggers** quando:

1. ✅ Um `subscription_delivery` é criado/atualizado
2. ✅ Um `standalone_purchase` é criado/atualizado
3. ✅ Um `manual_payment` é criado/atualizado

### Trigger Automático

```sql
CREATE TRIGGER trigger_auto_populate_production_queue
  AFTER INSERT OR UPDATE OF status
  ON subscription_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_production_queue();
```

## 🔧 Solução: Popular Dados de Teste

### Opção 1: Via SQL (Recomendado para Teste)

1. Abra o **Supabase SQL Editor**
2. Execute o script `seed-production-queue.sql`
3. Isso criará 10 deliveries de teste
4. Os triggers irão popular automaticamente a `production_queue`

```bash
# Arquivo: seed-production-queue.sql
# Execute no Supabase SQL Editor
```

### Opção 2: Via Interface do Sistema

1. Crie uma **assinatura** para um usuário
2. Crie um **delivery** para essa assinatura
3. O sistema automaticamente criará um registro em `production_queue`

### Opção 3: Via API/Código

```typescript
// Criar um delivery (exemplo)
const { data, error } = await supabase
  .from('subscription_deliveries')
  .insert({
    subscription_id: 'uuid-da-assinatura',
    user_id: 'uuid-do-usuario',
    collection_id: 'uuid-da-colecao',
    delivery_month: 3,
    delivery_year: 2026,
    status: 'pending',
    scheduled_date: '2026-03-15'
  });

// Trigger irá criar automaticamente em production_queue
```

## 🔍 Verificar Dados

### 1. Verificar se a tabela existe

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'production_queue'
);
```

### 2. Contar registros

```sql
SELECT COUNT(*) FROM production_queue;
```

### 3. Ver registros

```sql
SELECT 
  id,
  order_type,
  customer_name,
  collection_name,
  current_stage,
  production_status,
  priority
FROM production_queue
LIMIT 10;
```

### 4. Verificar triggers

```sql
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%production_queue%';
```

## 📋 Estrutura da Production Queue

### Campos Principais

```typescript
interface ProductionQueueItem {
  id: string;
  order_id: string;
  order_type: 'subscription_delivery' | 'standalone_purchase' | 'manual_payment';
  customer_id: string;
  customer_name: string;
  customer_email: string;
  collection_id: string;
  collection_name: string;
  character_id: string | null;
  character_name: string | null;
  production_status: 'awaiting_choice' | 'ready_for_production' | 'in_production' | 'completed' | 'on_hold' | 'cancelled';
  current_stage: 'awaiting_choice' | 'design' | 'production' | 'quality_check' | 'packaging' | 'shipped';
  choice_status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'locked';
  priority: 'critical' | 'high' | 'normal' | 'low';
  priority_score: number;
  scheduled_production_date: string | null;
  estimated_completion_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}
```

## 🚨 Troubleshooting

### Problema: Triggers não estão funcionando

**Verificar se triggers existem:**
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%production%';
```

**Recriar triggers (se necessário):**
```sql
-- Execute as migrations novamente
-- supabase/migrations/20260428000005_add_manual_payment_support.sql
```

### Problema: Dados não aparecem no Hub

**1. Verificar se há dados:**
```sql
SELECT COUNT(*) FROM production_queue;
```

**2. Verificar se a query está correta:**
```sql
-- A query do frontend
SELECT * FROM production_queue
ORDER BY priority_score DESC, created_at DESC
LIMIT 100;
```

**3. Verificar permissões RLS:**
```sql
-- Ver políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'production_queue';
```

### Problema: Métricas em 0 mas há dados

**Verificar se o serviço está buscando corretamente:**
```typescript
// src/services/admin/production-service.ts
export async function fetchProductionMetrics() {
  const { data, error } = await supabase
    .from('production_queue')
    .select('*');
  
  console.log('Dados:', data);
  console.log('Erro:', error);
}
```

## 🎨 Dados de Teste Ideais

Para testar todas as funcionalidades do Hub, crie:

- ✅ **10 itens** em diferentes estágios
- ✅ **3 itens** com prazo < 24h (críticos)
- ✅ **5 itens** aguardando escolha
- ✅ **2 itens** bloqueados
- ✅ **Diferentes prioridades** (critical, high, normal, low)
- ✅ **Diferentes coleções**
- ✅ **Alguns atribuídos** a membros da equipe
- ✅ **Alguns sem atribuição**

## 📝 Script Completo de Teste

```sql
-- 1. Limpar dados antigos (CUIDADO: só em ambiente de teste!)
-- DELETE FROM production_queue;

-- 2. Popular com dados de teste
-- Execute: seed-production-queue.sql

-- 3. Verificar resultado
SELECT 
  current_stage,
  COUNT(*) as total,
  COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical,
  COUNT(CASE WHEN priority = 'high' THEN 1 END) as high,
  COUNT(CASE WHEN choice_status = 'pending' THEN 1 END) as pending_choices
FROM production_queue
GROUP BY current_stage;

-- 4. Ver distribuição de prioridades
SELECT 
  priority,
  COUNT(*) as total
FROM production_queue
GROUP BY priority
ORDER BY 
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END;
```

## ✅ Checklist

Antes de testar o Hub de Produção:

- [ ] Tabela `production_queue` existe
- [ ] Triggers estão criados e ativos
- [ ] Há pelo menos 10 registros em `production_queue`
- [ ] Registros têm diferentes `current_stage`
- [ ] Registros têm diferentes `priority`
- [ ] Alguns registros têm `character_id` NULL (aguardando escolha)
- [ ] Alguns registros têm prazos próximos
- [ ] RLS está configurado corretamente

## 🚀 Próximos Passos

Após popular os dados:

1. Recarregue o Hub de Produção
2. Verifique se as métricas aparecem
3. Teste os filtros
4. Teste as visualizações (Kanban, Lista, Calendário)
5. Teste as ações em massa
6. Teste o painel de detalhes

---

**Nota**: Em produção, os dados serão populados automaticamente conforme os clientes fazem pedidos e escolhem personagens. Este processo de seed é apenas para desenvolvimento e testes.
