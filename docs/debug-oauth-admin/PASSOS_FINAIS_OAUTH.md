# Passos Finais para Corrigir OAuth

## Problema Identificado
A função `handle_user_profile()` NÃO existe no banco de dados, causando erro 500 ao tentar criar usuários via OAuth.

## Solução (3 passos simples)

### Passo 1: Executar SQL no Supabase
1. Abra: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
2. Copie TODO o conteúdo do arquivo `EXECUTE_THIS_SQL_IN_SUPABASE.sql`
3. Cole no SQL Editor
4. Clique em "Run" (ou Ctrl+Enter)
5. Aguarde as mensagens de sucesso:
   - ✓ Trigger criado com sucesso
   - ✓ Função criada com sucesso
   - ✓ OAuth fix aplicado

### Passo 2: Configurar Redirect URLs
1. Abra: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/url-configuration
2. Em "Site URL", configure: `http://localhost:8080`
3. Em "Redirect URLs", adicione:
   ```
   http://localhost:8080
   http://localhost:8080/**
   ```
4. Clique em "Save"

### Passo 3: Testar OAuth
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Abra uma aba anônima
3. Acesse: http://localhost:8080/login
4. Clique em "Continuar com Google"
5. Faça login com sua conta Google

## Resultado Esperado
- Você será redirecionado para o Google
- Após autorizar, voltará para `http://localhost:8080`
- Estará logado no sistema
- Um perfil será criado automaticamente na tabela `profiles`

## Se Ainda Houver Erro
Execute o script de teste:
```powershell
./test-oauth-trigger.ps1
```

Este script criará um usuário de teste e verificará se o profile é criado automaticamente.

## Arquivos Criados
- `EXECUTE_THIS_SQL_IN_SUPABASE.sql` - SQL para executar no Supabase
- `test-oauth-trigger.ps1` - Script de teste do trigger
- `OAUTH_CONFIGURATION_GUIDE.md` - Guia completo de configuração
- `fix-oauth-trigger-direct.sql` - SQL alternativo

## Status Atual
- ❌ Função `handle_user_profile()` não existe
- ❌ Trigger pode estar quebrado
- ✅ Google OAuth habilitado no Supabase
- ✅ Tabela `profiles` existe
- ✅ Migrations aplicadas com sucesso

## Próximo Passo
**EXECUTE O SQL NO SUPABASE AGORA!**
