# Solução para Erro de Supabase na Vercel

## Problema

```
Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL
```

## Causa

As variáveis de ambiente estão configuradas na Vercel, mas podem ter:

1. Aspas extras nas variáveis
2. Cache antigo do build
3. Formatação incorreta

## Solução Rápida (Via Interface da Vercel)

### Opção 1: Redeploy Manual (RECOMENDADO)

1. Acesse https://vercel.com/jogo-brasils-projects/ordax
2. Vá na aba "Deployments"
3. Encontre o último deployment (mais recente)
4. Clique nos três pontos (⋯) ao lado
5. Selecione "Redeploy"
6. **IMPORTANTE**: Marque a opção "Clear cache and redeploy"
7. Clique em "Redeploy"
8. Aguarde 1-2 minutos

### Opção 2: Verificar e Corrigir Variáveis

1. Acesse https://vercel.com/jogo-brasils-projects/ordax/settings/environment-variables
2. Verifique se as variáveis estão assim (SEM aspas):

```
VITE_SUPABASE_URL
Valor: https://pabxpvqwtvbjaunjejud.supabase.co
(sem aspas, sem espaços extras)

VITE_SUPABASE_PUBLISHABLE_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4
(sem aspas, sem espaços extras)
```

3. Se tiverem aspas, REMOVA as variáveis e adicione novamente SEM aspas
4. Após corrigir, faça um Redeploy (Opção 1)

### Opção 3: Push Manual (se tiver acesso ao Git)

Se você conseguir fazer push para o repositório:

```bash
git push origin main
```

Isso vai triggerar um novo deployment automaticamente.

## Como Verificar se Funcionou

1. Aguarde o deployment completar (1-2 minutos)
2. Acesse o site em produção
3. Abra o DevTools (F12)
4. Vá na aba Console
5. Verifique se o erro desapareceu
6. Tente fazer login ou usar funcionalidades do Supabase

## Se o Erro Persistir

### Verificar Logs do Build

1. Na Vercel, vá em Deployments
2. Clique no deployment mais recente
3. Vá na aba "Build Logs"
4. Procure por mensagens relacionadas a variáveis de ambiente
5. Verifique se as variáveis estão sendo carregadas corretamente

### Verificar Logs de Runtime

1. Na Vercel, vá em Deployments
2. Clique no deployment mais recente
3. Vá na aba "Functions"
4. Procure por erros relacionados ao Supabase

### Última Opção: Recriar Variáveis

1. Delete todas as variáveis do Supabase na Vercel
2. Adicione novamente, uma por uma, copiando diretamente do arquivo .env.local
3. Certifique-se de NÃO incluir aspas
4. Faça um Redeploy com Clear Cache

## Comandos Úteis (se tiver CLI da Vercel)

```bash
# Ver variáveis atuais
vercel env ls

# Remover uma variável (se necessário)
vercel env rm VITE_SUPABASE_URL production

# Adicionar variável (será solicitado o valor)
vercel env add VITE_SUPABASE_URL production

# Fazer redeploy
vercel --prod --force
```

## Notas Importantes

⚠️ As variáveis com prefixo `VITE_` são expostas no bundle do cliente
⚠️ Sempre remova aspas ao configurar variáveis na Vercel
⚠️ Após qualquer mudança em variáveis, é necessário fazer Redeploy
⚠️ O "Clear cache" é importante para garantir que o build use os novos valores

## Contato

Se o problema persistir após todas essas tentativas, pode ser necessário:

1. Verificar se há algum problema com a conta do Supabase
2. Verificar se o projeto do Supabase está ativo
3. Verificar se as credenciais não expiraram
