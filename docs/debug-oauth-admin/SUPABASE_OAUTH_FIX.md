# Correção do Erro de OAuth do Google no Supabase

## Problema
O erro `GET https://pabxpvqwtvbjaunjejud.supabase.co/www.ordax.com.br?error=server_error` indica que o Supabase está tentando redirecionar para uma URL malformada após o login com Google.

## Causa Raiz
A configuração de "Redirect URLs" no dashboard do Supabase não está permitindo as URLs corretas, fazendo com que o Supabase tente usar uma URL padrão incorreta.

## Solução - Passo a Passo

### 1. Acesse o Dashboard do Supabase
Abra seu navegador e vá para:
```
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/url-configuration
```

### 2. Configure a Site URL
Na seção "Site URL", defina:
- **Para desenvolvimento local**: `http://localhost:8080`
- **Para produção**: `https://www.ordax.com.br`

### 3. Configure as Redirect URLs
Na seção "Redirect URLs", clique em "Add URL" e adicione CADA UMA destas URLs:

```
http://localhost:8080
http://localhost:8080/
http://localhost:3000
http://localhost:3000/
https://www.ordax.com.br
https://www.ordax.com.br/
https://ordax.com.br
https://ordax.com.br/
```

**IMPORTANTE**: Adicione cada URL separadamente, uma por vez.

### 4. Salve as Configurações
Clique no botão "Save" no final da página.

### 5. Aguarde a Propagação
Aguarde 1-2 minutos para que as configurações sejam propagadas.

### 6. Limpe o Cache do Navegador
- Pressione `Ctrl + Shift + Delete` (Windows) ou `Cmd + Shift + Delete` (Mac)
- Selecione "Cookies e outros dados de sites"
- Clique em "Limpar dados"

### 7. Teste Novamente
- Recarregue a página de login
- Tente fazer login com Google novamente

## Verificação Adicional

### Verifique o Console do Navegador
Abra o console do navegador (F12) e procure por:
```
OAuth redirect URL: http://localhost:8080/
```

Se você ver uma URL diferente, isso indica que o código está funcionando corretamente e o problema está apenas na configuração do Supabase.

### Verifique a Configuração do Google OAuth
No dashboard do Supabase:
1. Vá para `Authentication` → `Providers`
2. Clique em "Google"
3. Verifique se:
   - O Google OAuth está habilitado
   - Client ID e Client Secret estão preenchidos
   - As "Authorized redirect URIs" no Google Cloud Console incluem:
     ```
     https://pabxpvqwtvbjaunjejud.supabase.co/auth/v1/callback
     ```

## Problema Secundário: Database Error

Após corrigir a URL de redirecionamento, você pode encontrar o erro "Database error saving new user". Isso será resolvido pela migração que criamos.

### Aplicar a Migração de Correção
Execute no terminal:
```bash
supabase db push
```

Esta migração (`20260304000000_fix_profile_creation_trigger.sql`) corrige o conflito de triggers que estava impedindo a criação de novos usuários.

## Resumo das Correções Realizadas

1. ✅ Código de login atualizado para usar `window.location.origin`
2. ✅ Migração criada para corrigir triggers conflitantes
3. ✅ Erro de sintaxe SQL corrigido (delimitadores `$` → `$$`)
4. ✅ Migration `20260304000005_fix_profile_trigger_syntax.sql` aplicada com sucesso
5. ⏳ **PENDENTE**: Configuração das Redirect URLs no dashboard do Supabase
6. ⏳ **PENDENTE**: Aplicação de todas as migrations pendentes (`supabase db push --include-all`)
7. ⏳ **PENDENTE**: Teste do login com Google

## Atualização: Correção de Sintaxe SQL

Foi identificado e corrigido um erro crítico de sintaxe nas migrations:
- **Problema**: Delimitadores de função PostgreSQL estavam como `AS $` em vez de `AS $$`
- **Impacto**: O trigger não era criado corretamente, causando falha no OAuth
- **Solução**: Migration `20260304000005_fix_profile_trigger_syntax.sql` criada e aplicada
- **Status**: ✅ Aplicada com sucesso com a mensagem "Profile trigger configured successfully with RLS bypass"

Veja o arquivo `OAUTH_FIX_STATUS.md` para detalhes completos sobre o status atual e próximos passos.

## Suporte

Se o problema persistir após seguir todos os passos:
1. Verifique os logs do Supabase em: `Authentication` → `Logs`
2. Verifique se há erros no console do navegador (F12)
3. Confirme que as URLs foram salvas corretamente no dashboard
