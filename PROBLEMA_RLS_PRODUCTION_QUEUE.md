# Problema: Production Queue Vazia (RLS)

## 🎯 Situação

Você mencionou que o usuário **João Trimestral** tem um pedido em produção, mas o Hub de Produção mostra **0** em todas as métricas.

## 🔍 Diagnóstico

O problema mais provável é **RLS (Row Level Security)** bloqueando o acesso aos dados.

### O que é RLS?

Row Level Security é uma camada de segurança do PostgreSQL/Supabase que controla quais linhas um usuário pode ver em uma tabela.

### Por que está bloqueando?

A tabela `production_queue` provavelmente tem políticas RLS que:
1. ✅ Permitem que **clientes** vejam apenas seus próprios pedidos
2. ❌ **NÃO permitem** que **admins** vejam todos os pedidos

## 🔧 Solução

### Opção 1: Executar Script de Debug (Recomendado)

Execute o arquivo `debug-production-queue.sql` no Supabase SQL Editor para:
1. Verificar se há dados na tabela
2. Ver as políticas RLS atuais
3. Identificar o problema exato

```sql
-- Execute: debug-production-queue.sql
```

### Opção 2: Adicionar Política RLS para Admins

Se o problema for RLS, execute o script `fix-production-queue-rls.sql`:

```sql
-- Execute: fix-production-queue-rls.sql
-- Este script:
-- 1. Cria função is_admin() usando user_roles
-- 2. Remove políticas antigas
-- 3. Cria políticas corretas para admins e clientes
-- 4. Verifica se funcionou
```

Ou execute manualmente:

```sql
-- 1. Criar função is_admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1
    AND user_roles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar política para SELECT
CREATE POLICY "production_queue_select_policy"
ON production_queue FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR customer_id = auth.uid()
);

-- 3. Criar política para UPDATE
CREATE POLICY "production_queue_update_policy"
ON production_queue FOR UPDATE TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 4. Criar política para INSERT
CREATE POLICY "production_queue_insert_policy"
ON production_queue FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));
```

### Opção 3: Desabilitar RLS Temporariamente (Apenas para Debug)

⚠️ **CUIDADO**: Isso expõe todos os dados. Use apenas em desenvolvimento!

```sql
-- Desabilitar RLS na tabela
ALTER TABLE production_queue DISABLE ROW LEVEL SECURITY;

-- Depois de testar, reabilite:
ALTER TABLE production_queue ENABLE ROW LEVEL SECURITY;
```

## 📊 Verificar Dados do João Trimestral

### 1. Ver se há subscription_deliveries

```sql
SELECT 
  sd.id,
  sd.status,
  sd.scheduled_date,
  u.email,
  p.full_name,
  c.name as collection_name
FROM subscription_deliveries sd
LEFT JOIN auth.users u ON u.id = sd.user_id
LEFT JOIN profiles p ON p.id = sd.user_id
LEFT JOIN collections c ON c.id = sd.collection_id
WHERE u.email ILIKE '%trimestral%'
ORDER BY sd.created_at DESC;
```

### 2. Ver se há registros em production_queue

```sql
-- Como superuser (sem RLS)
SET LOCAL ROLE postgres;
SELECT * FROM production_queue
WHERE customer_email ILIKE '%trimestral%';
RESET ROLE;
```

### 3. Verificar se trigger está funcionando

```sql
-- Ver triggers ativos
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%production%';
```

## 🎨 Estrutura Esperada

### Fluxo Normal

```
1. João Trimestral faz login
2. Sistema cria subscription_delivery
3. Trigger auto_populate_production_queue() é acionado
4. Registro é inserido em production_queue
5. Admin vê no Hub de Produção
```

### Se não está funcionando

```
❌ Problema 1: Trigger não existe ou está desabilitado
❌ Problema 2: RLS bloqueia acesso do admin
❌ Problema 3: subscription_delivery não foi criado
❌ Problema 4: Dados existem mas query está errada
```

## 🔍 Checklist de Debug

Execute cada item e anote o resultado:

- [ ] **Tabela existe?**
  ```sql
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'production_queue'
  );
  ```

- [ ] **Há dados na tabela? (sem RLS)**
  ```sql
  SET LOCAL ROLE postgres;
  SELECT COUNT(*) FROM production_queue;
  RESET ROLE;
  ```

- [ ] **RLS está habilitado?**
  ```sql
  SELECT rowsecurity FROM pg_tables 
  WHERE tablename = 'production_queue';
  ```

- [ ] **Quais políticas RLS existem?**
  ```sql
  SELECT policyname, cmd, roles 
  FROM pg_policies 
  WHERE tablename = 'production_queue';
  ```

- [ ] **Trigger existe e está ativo?**
  ```sql
  SELECT trigger_name, event_object_table 
  FROM information_schema.triggers 
  WHERE trigger_name LIKE '%production_queue%';
  ```

- [ ] **João Trimestral tem deliveries?**
  ```sql
  SELECT COUNT(*) FROM subscription_deliveries sd
  JOIN auth.users u ON u.id = sd.user_id
  WHERE u.email ILIKE '%trimestral%';
  ```

- [ ] **Query do frontend funciona?**
  ```sql
  -- Simular query do fetchProductionQueue
  SELECT * FROM production_queue
  ORDER BY priority_score DESC, created_at DESC
  LIMIT 100;
  ```

## 🚀 Solução Rápida

Se você só quer testar rapidamente:

```sql
-- 1. Desabilitar RLS temporariamente
ALTER TABLE production_queue DISABLE ROW LEVEL SECURITY;

-- 2. Recarregar o Hub de Produção no navegador

-- 3. Se funcionar, o problema é RLS
-- 4. Adicione as políticas corretas (Opção 2 acima)

-- 5. Reabilitar RLS
ALTER TABLE production_queue ENABLE ROW LEVEL SECURITY;
```

## 📝 Logs Úteis

### No Frontend (Console do Navegador)

```javascript
// Adicione no production-service.ts
console.log('Buscando production queue...');
const { data, error } = await supabase
  .from("production_queue")
  .select("*");
console.log('Dados:', data);
console.log('Erro:', error);
console.log('Total:', data?.length);
```

### No Supabase (Logs)

1. Vá para **Supabase Dashboard**
2. Clique em **Logs** > **API**
3. Filtre por `production_queue`
4. Veja se há erros de permissão

## ✅ Resultado Esperado

Após corrigir RLS, você deve ver:

```
✅ Total em Produção: 1 (ou mais)
✅ Alertas Críticos: 0 (ou mais)
✅ Escolhas Pendentes: 1 (se João não escolheu)
✅ Taxa de Conclusão: X%
```

E na visualização:
```
✅ Kanban mostra cards
✅ Lista mostra linhas
✅ Calendário mostra eventos
✅ Análises mostra gráficos
```

## 🎯 Próximo Passo

1. Execute `debug-production-queue.sql`
2. Anote os resultados
3. Se RLS for o problema, adicione as políticas
4. Recarregue o Hub de Produção
5. Deve funcionar! 🎉

---

**Nota**: Se após tudo isso ainda não funcionar, pode ser um problema diferente. Nesse caso, compartilhe os resultados do script de debug.
