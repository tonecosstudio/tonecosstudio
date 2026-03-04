# 📧 Como Adicionar Email de Admin

## Por Que Fazer Isso?

Atualmente, o sistema está configurado para dar acesso admin automaticamente apenas para emails na lista `ADMIN_EMAILS`. Se você quiser que seu email (ou outros emails) recebam admin automaticamente em futuros logins, siga este guia.

## Passo a Passo

### 1. Descobrir Seu Email

Execute este SQL no Supabase para ver seu email:

```sql
SELECT id, email FROM auth.users 
WHERE id = '19554ce7-161b-4f3b-ba17-e165ad56b3c0';
```

Ou veja no console do navegador após fazer login (F12 → Console).

### 2. Editar o Arquivo

Abra: `src/hooks/useAuthProfileSync.ts`

Encontre estas linhas (no topo do arquivo):

```typescript
const ADMIN_EMAILS = [
  'admin@ordax.com.br',
  // Adicione outros emails de admin aqui
];
```

### 3. Adicionar Seu Email

Substitua por:

```typescript
const ADMIN_EMAILS = [
  'admin@ordax.com.br',
  'seu-email-real@gmail.com',  // ← COLOQUE SEU EMAIL AQUI
];
```

**IMPORTANTE**: Use o email EXATO que você usa para fazer login com Google OAuth!

### 4. Salvar e Testar

1. Salve o arquivo
2. O servidor de desenvolvimento deve recarregar automaticamente
3. Faça logout
4. Faça login novamente
5. Você deve ter acesso admin automaticamente

## Exemplo Completo

```typescript
/**
 * Lista de emails que devem ter role de admin automaticamente
 * IMPORTANTE: Adicione aqui os emails dos administradores do sistema
 */
const ADMIN_EMAILS = [
  'admin@ordax.com.br',
  'joao.silva@gmail.com',
  'maria.santos@hotmail.com',
  'pedro.oliveira@outlook.com',
];
```

## Como Funciona

Quando um usuário faz login via OAuth:

1. O hook `useAuthProfileSync` é executado
2. Ele verifica se o email está na lista `ADMIN_EMAILS`
3. Se estiver, cria automaticamente o registro na tabela `user_roles`
4. O usuário recebe acesso admin imediatamente

## Verificar Se Funcionou

Após adicionar o email e fazer login:

```sql
-- Execute no Supabase SQL Editor
SELECT 
  ur.user_id,
  u.email,
  ur.role
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

Você deve ver seu email na lista de admins.

## Remover Admin

Para remover acesso admin de alguém:

1. Remova o email da lista `ADMIN_EMAILS`
2. Execute no Supabase:

```sql
DELETE FROM public.user_roles
WHERE user_id = 'USER_ID_AQUI' AND role = 'admin';
```

## Segurança

⚠️ **IMPORTANTE**: 
- Não adicione emails de usuários comuns nesta lista
- Mantenha esta lista pequena (apenas admins reais)
- Não commite este arquivo com emails pessoais em repositórios públicos
- Considere usar variáveis de ambiente para emails de admin em produção

## Produção

Para produção, considere usar variáveis de ambiente:

```typescript
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim())
  .filter(Boolean);
```

E no `.env`:
```
VITE_ADMIN_EMAILS=admin@ordax.com.br,outro@admin.com
```

---

**Dúvidas?** Consulte `RESUMO_FINAL_ADMIN.md` para mais detalhes.
