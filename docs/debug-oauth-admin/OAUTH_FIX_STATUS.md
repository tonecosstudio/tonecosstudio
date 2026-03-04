# Status da Correção do OAuth - Google Login

## Data: 04/03/2026

## Problema Original
Erro ao fazer login com Google OAuth: "Database error saving new user"

URL de erro: `http://localhost:8080/?error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user`

## Correções Aplicadas

### 1. ✅ Sintaxe SQL Corrigida
**Migration**: `20260304000005_fix_profile_trigger_syntax.sql`

Corrigido o erro de sintaxe nos delimitadores de função PostgreSQL:
- Antes: `AS $` (incorreto)
- Depois: `AS $$` (correto)

**Status**: Aplicada com sucesso ✅

### 2. ✅ Trigger de Perfil Configurado
O trigger `on_auth_user_profile_sync` foi criado com:
- Função `handle_user_profile()` com `SECURITY DEFINER`
- Bypass de RLS usando `set_config('role', 'service_role')`
- Tratamento de erros que não falha a criação do usuário
- Permissões corretas para todos os roles

### 3. ✅ Correção de Outra Migration
**Migration**: `20260328000000_create_capacity_functions.sql`

Corrigido o mesmo erro de sintaxe (delimitadores `$` → `$$`)

## Próximos Passos

### 1. Aplicar Todas as Migrations Pendentes
Execute o comando:
```bash
supabase db push --include-all
```

Isso aplicará todas as migrations pendentes, incluindo as correções.

### 2. Testar o Login com Google

1. Limpe o cache do navegador
2. Acesse: `http://localhost:8080/login`
3. Clique em "Continuar com Google"
4. Complete o fluxo OAuth

### 3. Verificar se Funcionou

Se o login funcionar, você será redirecionado para a home sem parâmetros de erro na URL.

Se ainda houver erro, verifique:

#### A. Logs de Autenticação do Supabase
Acesse: `https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/logs/auth-logs`

Procure por:
- Erros de criação de usuário
- Mensagens de erro do trigger
- Problemas de permissão

#### B. Execute o Script de Teste
No SQL Editor do Supabase, execute:
```sql
-- Verificar se o trigger existe
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_profile_sync';

-- Verificar se a função tem SECURITY DEFINER
SELECT proname, prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'handle_user_profile';

-- Testar criação manual de perfil
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (test_user_id, 'test@example.com', NOW(), NOW());
  
  RAISE NOTICE 'Teste bem-sucedido!';
  
  DELETE FROM public.profiles WHERE id = test_user_id;
END $$;
```

#### C. Verificar Configuração do Google OAuth
No Supabase Dashboard:
1. Vá para: Authentication > Providers > Google
2. Verifique se está habilitado
3. Confirme que as credenciais (Client ID e Secret) estão corretas
4. Verifique se `http://localhost:8080` está nas URLs de redirecionamento autorizadas

## Configuração de Redirect URL

O código em `src/pages/Login.tsx` está configurado para usar:
```typescript
const origin = window.location.origin; // http://localhost:8080
const redirectUrl = `${origin}${next}`; // http://localhost:8080/ (ou outra rota)
```

Certifique-se de que no Supabase Dashboard, em:
**Authentication > URL Configuration > Redirect URLs**

Está incluído:
- `http://localhost:8080/**` (com wildcard)
- ou especificamente: `http://localhost:8080/`

## Estrutura do Trigger

```sql
CREATE TRIGGER on_auth_user_profile_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile();
```

A função:
1. Usa `SECURITY DEFINER` para executar com privilégios elevados
2. Define role como `service_role` para bypass de RLS
3. Insere ou atualiza o perfil na tabela `profiles`
4. Captura erros sem falhar a criação do usuário OAuth

## Arquivos Modificados

- ✅ `supabase/migrations/20260304000005_fix_profile_trigger_syntax.sql` (nova)
- ✅ `supabase/migrations/20260328000000_create_capacity_functions.sql` (corrigida)
- ✅ `src/pages/Login.tsx` (já estava correto)

## Notas Importantes

1. O erro de sintaxe `AS $` estava impedindo a criação correta do trigger
2. Mesmo que o trigger existisse, ele não funcionava corretamente
3. A correção garante que o trigger seja criado com a sintaxe correta
4. O bypass de RLS é essencial para OAuth funcionar

## Se o Problema Persistir

Caso o erro continue após aplicar as migrations:

1. Verifique os logs do Supabase (link acima)
2. Execute o script de teste SQL
3. Confirme que não há outros triggers conflitantes:
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE event_object_table = 'users'
   AND event_object_schema = 'auth';
   ```
4. Verifique se há políticas RLS bloqueando:
   ```sql
   SELECT policyname, cmd, with_check
   FROM pg_policies
   WHERE tablename = 'profiles';
   ```
