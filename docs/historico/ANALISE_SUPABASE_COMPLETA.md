# Análise Completa - Supabase Database

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **CRÍTICO: Migrations Duplicadas**

**Problema:**
```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey"
Key (version)=(20260224000000) already exists.
```

**Causa:**
Existem DUAS migrations com o mesmo timestamp:
- `20260224000000_corrigir_politicas_postgrest.sql`
- `20260224000000_optimize_member_groups_view.sql`

**Impacto:** Impossível aplicar migrations, banco em estado inconsistente.

---

### 2. **CRÍTICO: Caos de Políticas RLS**

**Problema:**
Existem **25+ migrations** tentando corrigir o erro 406:
- `20260223091324_fix_406_error.sql`
- `20260223092609_fix_406_agressivo.sql`
- `20260223100000_fix_406_com_anon.sql`
- `20260223100100_desabilitar_rls_nuclear.sql`
- `20260223150000_fix_406_error.sql`
- `20260223160000_fix_rls_chat_messages_definitivo.sql`
- `20260223170000_fix_406_nuclear.sql`
- `20260224100000_fix_rls_policies_professional.sql`
- `20260224120000_fix_rls_without_admin_check.sql`
- `20260224130000_force_fix_rls_406.sql`
- `20260225000000_fix_406_definitivo.sql`

**Causa Raiz:**
As políticas RLS originais usam `has_role(auth.uid(), 'admin'::app_role)` mas:
1. A função `has_role` consulta a tabela `user_roles`
2. A tabela `user_roles` NÃO tem a coluna `role` do tipo `app_role`
3. Isso causa erro 406 (Not Acceptable)

**Evidência:**
```sql
-- Migration original (ERRADA)
CREATE POLICY "Admins can view all groups"
  ON chat_groups FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)  -- ❌ ERRO!
  );

-- Função has_role espera:
SELECT EXISTS (
  SELECT 1
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = _role  -- ❌ Coluna 'role' não existe!
);
```

---

### 3. **CRÍTICO: Estrutura de Roles Inconsistente**

**Problema:**
A tabela `user_roles` não está definida corretamente nas migrations.

**Esperado:**
```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id),
  role app_role NOT NULL
);
```

**Realidade:**
Não há migration criando esta tabela com a estrutura correta.

---

### 4. **CRÍTICO: Políticas RLS Muito Permissivas**

**Arquivo:** `20260225000000_fix_406_definitivo.sql`

**Problema:**
```sql
CREATE POLICY "authenticated_select_all"
  ON chat_group_members
  FOR SELECT
  TO authenticated
  USING (true);  -- ❌ QUALQUER usuário vê TODOS os membros!
```

**Impacto de Segurança:**
- Usuário A pode ver que usuário B está em grupo X
- Vazamento de informações de membership
- Violação de privacidade

---

### 5. **PERFORMANCE: Falta de Índices**

**Problema:**
A função `has_role` é chamada em TODAS as queries RLS, mas não há índice otimizado.

**Faltando:**
```sql
CREATE INDEX idx_user_roles_user_role ON user_roles(user_id, role);
```

---

### 6. **ARQUITETURA: Abordagem Errada para Admin Check**

**Problema Atual:**
```sql
has_role(auth.uid(), 'admin'::app_role)
```

**Problemas:**
1. Requer JOIN com `user_roles` em TODA query
2. Causa overhead de performance
3. Complexidade desnecessária

**Solução Melhor:**
Usar `profiles.role` diretamente:
```sql
EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid()
  AND role = 'admin'
)
```

---

## 🔧 PLANO DE CORREÇÃO

### Fase 1: Limpeza (URGENTE)

1. **Renomear migration duplicada**
   - Renomear `20260224000000_optimize_member_groups_view.sql`
   - Para `20260226000000_optimize_member_groups_view.sql`

2. **Criar migration de limpeza**
   - Remover TODAS as políticas RLS existentes
   - Resetar para estado limpo

### Fase 2: Estrutura Correta

3. **Verificar/Criar tabela user_roles**
   - Ou usar `profiles.role` diretamente

4. **Criar políticas RLS corretas**
   - Usar `profiles.role` ao invés de `has_role()`
   - Políticas seguras e performáticas

### Fase 3: Otimização

5. **Adicionar índices necessários**
6. **Testar performance**
7. **Validar segurança**

---

## 📋 ESTRUTURA CORRETA

### Tabela Profiles (Já Existe)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT DEFAULT 'user',  -- 'admin', 'user'
  email TEXT,
  full_name TEXT,
  ...
);
```

### Políticas RLS Corretas

#### chat_groups
```sql
-- SELECT: Admins veem tudo, membros veem seus grupos
CREATE POLICY "select_groups"
  ON chat_groups FOR SELECT
  USING (
    -- Admin vê tudo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Membro vê seus grupos (não deletados)
    (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = chat_groups.id
        AND user_id = auth.uid()
      )
    )
  );

-- INSERT/UPDATE/DELETE: Apenas admins
CREATE POLICY "admin_manage_groups"
  ON chat_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### chat_group_members
```sql
-- SELECT: Admins veem tudo, usuários veem apenas seus memberships
CREATE POLICY "select_members"
  ON chat_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
  );

-- INSERT/UPDATE/DELETE: Apenas admins
CREATE POLICY "admin_manage_members"
  ON chat_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Usuários podem atualizar seu last_viewed_at
CREATE POLICY "update_own_last_viewed"
  ON chat_group_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Só pode atualizar last_viewed_at
      (NEW.last_viewed_at IS DISTINCT FROM OLD.last_viewed_at)
      AND NEW.group_id = OLD.group_id
      AND NEW.user_id = OLD.user_id
      AND NEW.joined_at = OLD.joined_at
    )
  );
```

#### chat_group_messages
```sql
-- SELECT: Apenas membros do grupo
CREATE POLICY "select_messages"
  ON chat_group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = chat_group_messages.group_id
      AND user_id = auth.uid()
    )
  );

-- INSERT: Apenas admins
CREATE POLICY "admin_insert_messages"
  ON chat_group_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE/DELETE: Apenas admins (suas próprias mensagens)
CREATE POLICY "admin_manage_own_messages"
  ON chat_group_messages FOR ALL
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 🎯 ÍNDICES NECESSÁRIOS

```sql
-- Otimizar verificação de admin
CREATE INDEX idx_profiles_role ON profiles(id, role) WHERE role = 'admin';

-- Otimizar verificação de membership
CREATE INDEX idx_chat_group_members_user_group 
ON chat_group_members(user_id, group_id);

-- Otimizar listagem de mensagens
CREATE INDEX idx_chat_group_messages_group_created 
ON chat_group_messages(group_id, created_at DESC);
```

---

## ⚠️ RISCOS ATUAIS

### Segurança
- ❌ Qualquer usuário pode ver todos os membros de todos os grupos
- ❌ Possível vazamento de informações
- ❌ Políticas muito permissivas

### Performance
- ❌ Queries RLS ineficientes
- ❌ Falta de índices
- ❌ N+1 queries em verificações de role

### Manutenibilidade
- ❌ 25+ migrations tentando corrigir o mesmo problema
- ❌ Código duplicado
- ❌ Difícil de debugar

---

## ✅ PRÓXIMOS PASSOS

1. ✅ Renomear migration duplicada
2. ✅ Criar migration de limpeza total
3. ✅ Criar migration com políticas corretas
4. ✅ Adicionar índices
5. ✅ Testar em ambiente local
6. ✅ Aplicar em produção com backup
7. ✅ Monitorar logs

---

## 📊 IMPACTO ESPERADO

### Antes
- Erro 406 em queries
- Políticas inconsistentes
- Performance ruim
- Segurança comprometida

### Depois
- Queries funcionando
- Políticas consistentes e seguras
- Performance otimizada
- Segurança garantida
