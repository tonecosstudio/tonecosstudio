# Configuração de Variáveis de Ambiente na Vercel

## Problema

O site em produção na Vercel está apresentando o erro:

```
Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL
```

Isso acontece porque as variáveis de ambiente não estão configuradas no painel da Vercel.

## Solução

### 1. Acessar o Painel da Vercel

1. Acesse https://vercel.com
2. Faça login na sua conta
3. Selecione o projeto "ordax"
4. Clique em "Settings" (Configurações)
5. No menu lateral, clique em "Environment Variables"

### 2. Adicionar as Variáveis de Ambiente

Adicione as seguintes variáveis de ambiente:

#### Variáveis Obrigatórias do Supabase

```
VITE_SUPABASE_URL=https://pabxpvqwtvbjaunjejud.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4
```

### 3. Configurar para Todos os Ambientes

Para cada variável:

1. Clique em "Add New"
2. Cole o nome da variável (ex: `VITE_SUPABASE_URL`)
3. Cole o valor da variável
4. Selecione os ambientes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Clique em "Save"

### 4. Fazer Redeploy

Após adicionar todas as variáveis:

1. Vá para a aba "Deployments"
2. Encontre o último deployment
3. Clique nos três pontos (⋯) ao lado do deployment
4. Selecione "Redeploy"
5. Confirme o redeploy

### 5. Verificar

Após o redeploy completar (geralmente 1-2 minutos):

1. Acesse o site em produção
2. Verifique se o erro desapareceu
3. Teste o login e outras funcionalidades

## Variáveis Adicionais Recomendadas

Além das variáveis do Supabase, você pode querer adicionar outras variáveis do arquivo `.env`:

```
VITE_SUBSCRIPTION_API_URL=http://localhost:3001
VITE_DEFAULT_PRICE_FULL=500
VITE_DEFAULT_PRICE_PIX=475
VITE_PIX_DISCOUNT_PERCENTAGE=5
```

## Troubleshooting

### Se o erro persistir após o redeploy:

1. **Verifique se as variáveis foram salvas corretamente**
   - Vá em Settings > Environment Variables
   - Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` estão listadas

2. **Limpe o cache da Vercel**
   - No deployment, clique em "⋯" > "Redeploy" > Marque "Clear cache" > Confirme

3. **Verifique os logs do build**
   - Vá em Deployments > Clique no deployment > Veja os logs
   - Procure por mensagens de erro relacionadas às variáveis de ambiente

4. **Verifique o console do navegador**
   - Abra o site em produção
   - Abra o DevTools (F12)
   - Vá na aba Console
   - Procure por mensagens de erro detalhadas

## Comandos CLI da Vercel (Alternativa)

Se preferir usar a CLI da Vercel:

```bash
# Instalar CLI (se ainda não tiver)
npm i -g vercel

# Login
vercel login

# Adicionar variáveis
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production

# Fazer redeploy
vercel --prod
```

## Notas Importantes

⚠️ **NUNCA** commite variáveis de ambiente sensíveis no Git
⚠️ As variáveis com prefixo `VITE_` são expostas no bundle do cliente
⚠️ Para variáveis secretas do servidor, use variáveis sem o prefixo `VITE_`
