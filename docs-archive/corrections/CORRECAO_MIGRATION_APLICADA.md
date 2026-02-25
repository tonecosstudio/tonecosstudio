# ✅ Correção da Migration Aplicada

## 🐛 Problema Encontrado

Ao aplicar a migration, você encontrou o erro:

```
ERROR: 42883: operator does not exist: text = app_role
HINT: No operator matches the given name and argument types. You might need to add explicit type casts.
```

## 🔍 Causa

A migration estava comparando a coluna `role` (que é do tipo `app_role` enum) com uma string `'admin'` sem fazer o cast explícito.

**Código problemático**:

```sql
WHERE role = 'admin'  -- ❌ Erro: text = app_role
```

## ✅ Solução Aplicada

Corrigimos 4 ocorrências na migration:

### 1. RLS Policies (3 policies)

**Antes**:

```sql
CREATE POLICY "Admins podem ver alertas"
  ON admin_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'  -- ❌
    )
  );
```

**Depois**:

```sql
CREATE POLICY "Admins podem ver alertas"
  ON admin_alerts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)  -- ✅
  );
```

### 2. Função create_admin_notification

**Antes**:

```sql
WHERE role = 'admin'  -- ❌
```

**Depois**:

```sql
WHERE role = 'admin'::app_role  -- ✅
```

### 3. INSERT de configurações padrão

**Antes**:

```sql
WHERE role = 'admin'  -- ❌
```

**Depois**:

```sql
WHERE role = 'admin'::app_role  -- ✅
```

## 📝 Mudanças Realizadas

1. **RLS Policies**: Substituímos a verificação manual por `public.has_role()` (função existente no banco)
2. **Queries SQL**: Adicionamos cast explícito `'admin'::app_role`

## 🚀 Como Aplicar Agora

A migration foi corrigida. Você pode:

### Opção 1: Aplicar a Migration Corrigida

1. Copie o conteúdo atualizado de: `supabase/migrations/20260228100000_create_admin_notifications_system.sql`
2. Cole no SQL Editor do Supabase
3. Execute

### Opção 2: Se Já Aplicou Parcialmente

Se você já executou parte da migration e ela falhou, execute este SQL para limpar:

```sql
-- Remover o que foi criado parcialmente
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS admin_notification_settings CASCADE;
DROP TABLE IF EXISTS admin_alerts CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;

-- Depois execute a migration corrigida completa
```

## ✅ Verificar Sucesso

Após aplicar a migration corrigida, execute:

```sql
-- Verificar tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'admin_%';

-- Deve retornar:
-- admin_alerts
-- admin_notification_settings
-- admin_notifications
```

## 🧪 Testar

```sql
-- Criar notificação de teste
SELECT create_admin_notification(
  'system_error',
  '✅ Migration Corrigida e Aplicada!',
  'O sistema de notificações está funcionando perfeitamente!',
  'medium',
  'Bell'
);

-- Ver a notificação
SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 1;
```

## 📊 Status

- ✅ Erro identificado
- ✅ Correção aplicada
- ✅ Migration atualizada
- ⏳ Aguardando reaplicação

---

**Próximo Passo**: Execute a migration corrigida no Supabase Dashboard!
