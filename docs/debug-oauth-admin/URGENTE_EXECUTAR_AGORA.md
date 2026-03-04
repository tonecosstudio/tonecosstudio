# 🚨 URGENTE - Execute Agora!

## Situação

Dados foram perdidos:
- ❌ 1 usuário desapareceu
- ❌ 1 pedido desapareceu

## Ação Imediata

### Passo 1: Verificar Backup do Supabase

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/database/backups
2. Verifique se há backups automáticos
3. **Se houver backup de HOJE ou ONTEM**: PARE TUDO e restaure!

### Passo 2: Executar Script de Investigação

Abra o SQL Editor do Supabase e execute:

```sql
-- Verificar TODOS os usuários
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at;

-- Verificar profiles
SELECT 
  p.id,
  p.email,
  p.created_at,
  u.email as auth_email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at;

-- Verificar subscriptions
SELECT 
  s.id,
  s.user_id,
  s.status,
  s.created_at,
  u.email
FROM subscriptions s
LEFT JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at;

-- Verificar standalone_purchases
SELECT 
  sp.id,
  sp.user_id,
  sp.status,
  sp.created_at,
  u.email
FROM standalone_purchases sp
LEFT JOIN auth.users u ON u.id = sp.user_id
ORDER BY sp.created_at;

-- Verificar quotes
SELECT 
  q.id,
  q.user_id,
  q.status,
  q.created_at,
  u.email
FROM quotes q
LEFT JOIN auth.users u ON u.id = q.user_id
ORDER BY q.created_at;
```

### Passo 3: Compartilhar Resultados

Copie os resultados e me envie para análise.

## O Que Pode Ter Acontecido

### Hipótese 1: Migration Deletou Coleções
A migration `20260301160000_delete_all_collections.sql` deletou todas as coleções. Se havia CASCADE DELETE, pode ter deletado dados relacionados.

### Hipótese 2: Usuário Foi Deletado Acidentalmente
Se o usuário foi deletado de `auth.users`, TODOS os dados relacionados foram deletados por CASCADE DELETE.

### Hipótese 3: Soft Delete
O usuário pode estar marcado como deletado (coluna `deleted_at`) mas ainda existir no banco.

## Recuperação

### Se Houver Backup
1. Restaure o backup
2. Re-aplique apenas as migrations seguras
3. Pule a migration `20260301160000_delete_all_collections.sql`

### Se NÃO Houver Backup
1. Usuário precisa criar conta novamente
2. Pedido precisa ser recriado manualmente
3. Implementar auditoria para prevenir futuras perdas

## Prevenção Imediata

Execute este SQL para impedir futuras perdas:

```sql
-- Mudar CASCADE para RESTRICT em tabelas críticas
-- Isso impedirá deleção acidental de usuários se houver dados

ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey,
ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

ALTER TABLE standalone_purchases
DROP CONSTRAINT IF EXISTS standalone_purchases_user_id_fkey,
ADD CONSTRAINT standalone_purchases_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

ALTER TABLE quotes
DROP CONSTRAINT IF EXISTS quotes_user_id_fkey,
ADD CONSTRAINT quotes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;
```

## Documentação Criada

- `INVESTIGAR_PERDA_DADOS.sql` - Script completo de investigação
- `VERIFICAR_CASCADE_DELETE.sql` - Verificar CASCADE DELETE
- `RECUPERAR_DADOS_PERDIDOS.md` - Plano completo de recuperação

---

**AÇÃO URGENTE**: Verifique o backup do Supabase AGORA!
