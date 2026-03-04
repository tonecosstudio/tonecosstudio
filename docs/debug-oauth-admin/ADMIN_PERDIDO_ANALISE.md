# Análise: Admin Perdeu Autorização

## Problema Identificado

O usuário que fez login via OAuth não tem acesso admin, mesmo sendo o admin do sistema.

## Causa Raiz

O sistema de autorização da Ordax funciona assim:

1. **Tabela `user_roles`**: Armazena as roles dos usuários
   - Estrutura: `(id, user_id, role)`
   - Role pode ser: `admin`, `moderator`, `user`

2. **Função `has_role()`**: Verifica se um usuário tem uma role específica
   ```sql
   SELECT EXISTS (
     SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = _role
   );
   ```

3. **Hook `useIsAdmin()`**: Chama `has_role()` para verificar se o usuário é admin

4. **Componente `RequireAdmin`**: Bloqueia acesso se `useIsAdmin()` retorna `false`

## O Que Aconteceu

A tabela `user_roles` está **VAZIA** ou o usuário específico não tem registro de admin.

Possíveis causas:
1. ✅ **Triggers removidos**: Removemos todos os triggers de `auth.users`, incluindo qualquer trigger que criava roles automaticamente
2. ❓ **Migration que recriou a tabela**: Alguma migration pode ter recriado a tabela com `IF NOT EXISTS` mas sem preservar dados
3. ❓ **Limpeza acidental**: Algum script pode ter truncado a tabela
4. ❓ **Nunca foi criado**: O admin nunca foi adicionado à tabela `user_roles`

## Solução

### Opção 1: Via SQL (Recomendado)

Execute o script `SOLUCAO_ADMIN.sql` no SQL Editor do Supabase.

### Opção 2: Via Interface (Botão "Tornar-me admin inicial")

1. O usuário clica no botão "Tornar-me admin inicial"
2. Isso chama a edge function `bootstrap-admin`
3. A função verifica se `user_roles` está vazia
4. Se estiver vazia, insere o primeiro admin
5. **PROBLEMA**: Se já houver algum registro em `user_roles`, a função retorna erro "Admin already exists"

### Opção 3: Atualizar `useAuthProfileSync` (Prevenção Futura)

Adicionar lógica para criar role de admin automaticamente para emails específicos:

```typescript
// Verificar se é um email de admin
const adminEmails = ['admin@ordax.com.br', 'outro@admin.com'];
if (adminEmails.includes(userEmail)) {
  // Criar role de admin
  await supabase.from('user_roles').insert({
    user_id: userId,
    role: 'admin'
  }).select().maybeSingle();
}
```

## Próximos Passos

1. ✅ Executar `DIAGNOSTICO_ADMIN.sql` para confirmar o estado atual
2. ✅ Executar `SOLUCAO_ADMIN.sql` para restaurar o admin
3. ⏳ Atualizar `useAuthProfileSync.ts` para prevenir o problema no futuro
4. ⏳ Testar o acesso admin após a correção

## Arquivos Criados

- `DIAGNOSTICO_ADMIN.sql` - Script de diagnóstico completo
- `SOLUCAO_ADMIN.sql` - Script de solução (restaura admin)
- `VERIFICAR_E_RESTAURAR_ADMIN.sql` - Script alternativo mais simples
- `ADMIN_PERDIDO_ANALISE.md` - Este documento
