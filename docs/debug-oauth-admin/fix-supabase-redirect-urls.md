# Configurar URLs de Redirecionamento do Supabase para Produção

## Problema
O Google OAuth está redirecionando para `localhost:3000` mesmo quando você faz login no site de produção (ordax.com.br).

## Solução

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud
2. Vá em **Authentication** → **URL Configuration**
3. Configure:
   - **Site URL**: `https://ordax.com.br`
   - **Redirect URLs**: Adicione as seguintes URLs (uma por linha):
     ```
     https://ordax.com.br/**
     https://ordax.com.br/auth/callback
     http://localhost:3000/**
     http://localhost:3000/auth/callback
     ```

### Opção 2: Via Supabase CLI

Execute os seguintes comandos:

```bash
# Link ao projeto (se ainda não estiver linkado)
supabase link --project-ref pabxpvqwtvbjaunjejud

# Atualizar configurações de autenticação
# Nota: Isso requer acesso ao painel ou API do Supabase
```

### Opção 3: Configurar no Google Cloud Console

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Encontre as credenciais OAuth 2.0 do seu projeto
3. Em "Authorized redirect URIs", adicione:
   ```
   https://pabxpvqwtvbjaunjejud.supabase.co/auth/v1/callback
   ```

## Verificação

Após configurar, teste:
1. Acesse https://ordax.com.br
2. Clique em "Login com Google"
3. Após autenticar, você deve ser redirecionado para https://ordax.com.br (não localhost)

## URLs Importantes

- **Projeto Supabase**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud
- **Site de Produção**: https://ordax.com.br
- **Supabase Auth URL**: https://pabxpvqwtvbjaunjejud.supabase.co/auth/v1/callback
