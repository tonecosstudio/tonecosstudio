# 🚨 PERDA DE DADOS - Plano de Recuperação

## ⚠️ Situação Crítica

**Dados perdidos**:
- ❌ 1 usuário (havia 2, agora só tem admin)
- ❌ 1 pedido

## 🔍 Investigação Inicial

### Possíveis Causas

1. **Migration `20260301160000_delete_all_collections.sql`**
   - Deletou TODAS as coleções
   - Pode ter causado CASCADE DELETE em dados relacionados

2. **CASCADE DELETE em auth.users**
   - Se alguma tabela tem `ON DELETE CASCADE` para `auth.users`
   - Deletar um usuário deleta TODOS os dados relacionados

3. **Trigger removido acidentalmente**
   - Removemos triggers de `auth.users`
   - Pode ter afetado algum processo de sincronização

## 📋 Ações Imediatas

### 1. Executar Scripts de Investigação

Execute no SQL Editor do Supabase:

```sql
-- Script 1: Investigar perda de dados
-- Arquivo: INVESTIGAR_PERDA_DADOS.sql
```

```sql
-- Script 2: Verificar CASCADE DELETE
-- Arquivo: VERIFICAR_CASCADE_DELETE.sql
```

### 2. Verificar Backup do Supabase

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/database/backups
2. Verifique se há backups automáticos
3. Se houver, considere restaurar para antes da perda

### 3. Verificar Logs de Auditoria

Se a tabela `audit_logs` existir, verifique:

```sql
SELECT 
  action,
  table_name,
  record_id,
  user_id,
  created_at,
  changes
FROM audit_logs
WHERE table_name IN ('users', 'subscriptions', 'standalone_purchases', 'quotes')
ORDER BY created_at DESC
LIMIT 100;
```

## 🔧 Possíveis Soluções

### Opção 1: Restaurar do Backup (Recomendado)

Se houver backup do Supabase:
1. Identificar o backup antes da perda
2. Restaurar o banco completo
3. Re-aplicar apenas as migrations necessárias (exceto a que deletou dados)

### Opção 2: Recuperação Manual

Se não houver backup:
1. Pedir ao usuário para criar conta novamente
2. Recriar o pedido manualmente (se souber os detalhes)
3. Implementar sistema de auditoria para prevenir futuras perdas

### Opção 3: Verificar Soft Delete

Algumas tabelas podem ter soft delete (coluna `deleted_at`):

```sql
-- Verificar se há dados "deletados" que podem ser recuperados
SELECT * FROM auth.users WHERE deleted_at IS NOT NULL;
SELECT * FROM subscriptions WHERE deleted_at IS NOT NULL;
SELECT * FROM standalone_purchases WHERE deleted_at IS NOT NULL;
```

## 🛡️ Prevenção Futura

### 1. Implementar Auditoria

Criar tabela de auditoria para rastrear todas as mudanças:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  table_name TEXT NOT NULL,
  record_id UUID,
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Usar Soft Delete

Ao invés de deletar, marcar como deletado:

```sql
ALTER TABLE auth.users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN deleted_at TIMESTAMPTZ;
```

### 3. Backups Regulares

- Configurar backups automáticos diários no Supabase
- Exportar dados críticos regularmente
- Testar processo de restauração

### 4. Revisar CASCADE DELETE

Mudar `ON DELETE CASCADE` para `ON DELETE RESTRICT` em tabelas críticas:

```sql
-- Exemplo: Impedir deleção de usuário se houver pedidos
ALTER TABLE subscriptions
DROP CONSTRAINT subscriptions_user_id_fkey,
ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT; -- Impede deleção
```

### 5. Migrations Seguras

- Nunca usar `DELETE FROM` em migrations de produção
- Sempre fazer backup antes de migrations destrutivas
- Testar migrations em ambiente de desenvolvimento primeiro

## 📞 Próximos Passos

1. **URGENTE**: Execute `INVESTIGAR_PERDA_DADOS.sql` para entender o que aconteceu
2. **URGENTE**: Verifique se há backup disponível no Supabase
3. Decida entre restaurar backup ou recuperação manual
4. Implemente sistema de auditoria
5. Revise todas as migrations para remover operações destrutivas

## ⚠️ Migrations Perigosas Identificadas

- `20260301160000_delete_all_collections.sql` - **DELETA TODAS AS COLEÇÕES**
- Qualquer migration com `DELETE FROM`, `TRUNCATE`, `DROP TABLE`

## 🆘 Contato de Emergência

Se precisar de ajuda urgente:
1. Suporte do Supabase: https://supabase.com/support
2. Discord do Supabase: https://discord.supabase.com
3. Documentação de Backup: https://supabase.com/docs/guides/platform/backups

---

**IMPORTANTE**: Não execute mais nenhuma migration até entender o que causou a perda de dados!
