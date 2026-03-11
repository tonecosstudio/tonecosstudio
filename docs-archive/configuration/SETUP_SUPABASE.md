# Configuração do Supabase

## 1. Login no Supabase CLI

Primeiro, faça login no Supabase:

```bash
supabase login
```

Isso abrirá o navegador para você fazer login.

## 2. Linkar com o Projeto Remoto

Depois de fazer login, linke o projeto local com o remoto:

```bash
supabase link --project-ref pdytjhtjlxvbbeuxgnms
```

Quando solicitado, use a senha do banco de dados do seu projeto Supabase.

## 3. Configurar Google OAuth

### 3.1. Obter credenciais do Google

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá em "APIs & Services" > "Credentials"
4. Clique em "Create Credentials" > "OAuth 2.0 Client ID"
5. Configure o tipo como "Web application"
6. Adicione as URLs autorizadas:
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://pdytjhtjlxvbbeuxgnms.supabase.co`
   - **Authorized redirect URIs:**
     - `http://localhost:3000/auth/callback`
     - `https://pdytjhtjlxvbbeuxgnms.supabase.co/auth/v1/callback`

7. Copie o Client ID e Client Secret

### 3.2. Configurar no Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/pdytjhtjlxvbbeuxgnms/auth/providers
2. Encontre "Google" na lista de providers
3. Habilite o Google
4. Cole o Client ID e Client Secret
5. Salve as alterações

### 3.3. Adicionar variáveis de ambiente (opcional para local)

Se quiser testar localmente, adicione ao `.env.local`:

```env
GOOGLE_CLIENT_ID="seu-client-id-aqui"
GOOGLE_CLIENT_SECRET="seu-client-secret-aqui"
```

## 4. Verificar Status do Link

Para verificar se está tudo conectado:

```bash
supabase status
```

## 5. Aplicar Migrations no Remoto

Quando criar novas migrations, aplique no remoto com:

```bash
supabase db push
```

## 6. Gerar Types do TypeScript

Após aplicar migrations, gere os types:

```bash
supabase gen types typescript --linked > src/types/supabase.ts
```

## 7. Comandos Úteis

```bash
# Ver migrations pendentes
supabase db diff

# Criar nova migration
supabase migration new nome_da_migration

# Resetar banco local (cuidado!)
supabase db reset

# Ver logs do projeto remoto
supabase functions logs

# Deslinkar projeto
supabase unlink
```

## Configuração Atual

- **Project ID:** pdytjhtjlxvbbeuxgnms
- **URL:** https://pdytjhtjlxvbbeuxgnms.supabase.co
- **Auth Provider:** Google OAuth habilitado no config.toml
