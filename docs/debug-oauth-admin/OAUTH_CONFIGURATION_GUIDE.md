# Guia de Configuração OAuth - Google Login

## Problema Atual
Erro: `Database error saving new user`
URL incorreta: `https://pabxpvqwtvbjaunjejud.supabase.co/www.ordax.com.br`

## Causa Raiz
O Supabase está tentando redirecionar para `www.ordax.com.br` em vez de `localhost:8080`.

## Solução: Configurar Redirect URLs no Supabase Dashboard

### Passo 1: Acessar Configurações de Autenticação
1. Abra: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/url-configuration
2. Ou navegue: Dashboard → Authentication → URL Configuration

### Passo 2: Configurar Site URL
Na seção "Site URL", configure:
```
http://localhost:8080
```

### Passo 3: Configurar Redirect URLs
Na seção "Redirect URLs", adicione:
```
http://localhost:8080
http://localhost:8080/**
http://localhost:8080/login
```

**IMPORTANTE**: Remova ou desabilite temporariamente `www.ordax.com.br` das Redirect URLs para desenvolvimento local.

### Passo 4: Salvar Configurações
Clique em "Save" no final da página.

## Passo 5: Executar SQL Fix Diretamente

Como as migrations já foram aplicadas mas o trigger pode ter sido criado com sintaxe incorreta, execute o SQL diretamente:

1. Abra: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
2. Cole o conteúdo do arquivo `fix-oauth-trigger-direct.sql`
3. Clique em "Run"

## Passo 6: Testar OAuth

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Abra uma aba anônima/privada
3. Acesse: http://localhost:8080/login
4. Clique em "Continuar com Google"
5. Faça login com sua conta Google

## Verificação de Sucesso

Se tudo estiver correto, você deve:
1. Ser redirecionado para a página de login do Google
2. Após autorizar, ser redirecionado de volta para `http://localhost:8080`
3. Ver uma mensagem de sucesso
4. Estar logado no sistema

## Se Ainda Houver Erro

### Verificar Logs do Supabase
1. Abra: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/logs/auth-logs
2. Procure por erros recentes
3. Verifique se há mensagens sobre "Database error" ou "RLS"

### Verificar Trigger no Banco
Execute este SQL para verificar se o trigger existe:
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_profile_sync';
```

### Verificar Função
Execute este SQL para verificar se a função existe:
```sql
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'handle_user_profile';
```

## Configuração para Produção (Futuro)

Quando for para produção, adicione também:
```
https://www.ordax.com.br
https://www.ordax.com.br/**
https://ordax.com.br
https://ordax.com.br/**
```

## Troubleshooting Adicional

### Erro: "Email rate limit exceeded"
- Aguarde 1 hora antes de tentar novamente
- Use uma conta Google diferente para testar

### Erro: "Invalid redirect URL"
- Verifique se `http://localhost:8080` está nas Redirect URLs
- Certifique-se de que não há espaços ou caracteres extras

### Erro: "Database error"
- Execute o SQL fix diretamente (Passo 5)
- Verifique os logs do Supabase
- Verifique se a tabela `profiles` existe e tem RLS habilitado

## Arquivos de Referência

- `fix-oauth-trigger-direct.sql` - SQL para corrigir o trigger
- `supabase/migrations/20260304000006_force_fix_profile_trigger.sql` - Migration com o fix
- `src/pages/Login.tsx` - Código do componente de login

## Contato de Suporte

Se o problema persistir após seguir todos os passos:
1. Capture um screenshot do erro no console do navegador
2. Capture um screenshot dos logs do Supabase Auth
3. Verifique se o trigger foi criado corretamente no banco
