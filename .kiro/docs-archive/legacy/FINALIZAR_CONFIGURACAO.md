# ✅ Finalizar Configuração do Supabase

## 🎉 Progresso Atual

✅ Projeto linkado: `pabxpvqwtvbjaunjejud` (ordax-tonecos)
✅ Migrations aplicadas com sucesso
✅ URL atualizada no vite.config.ts
⚠️ Falta: Atualizar a chave anon/public

## 🔑 Obter a Chave Anon Correta

### Passo 1: Acessar o Dashboard

Abra: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api

### Passo 2: Copiar a Chave

Na seção **Project API keys**, copie a chave **anon/public** (a que está visível).

### Passo 3: Atualizar vite.config.ts

Abra o arquivo `vite.config.ts` e substitua a linha 10:

```typescript
// SUBSTITUIR ESTA LINHA:
'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NTI2NTYsImV4cCI6MjA1NDAyODY1Nn0.Yx-Yx8xqJQxqJQxqJQxqJQxqJQxqJQxqJQxqJQxqJQxqJQ'),

// PELA CHAVE QUE VOCÊ COPIOU:
'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('SUA_CHAVE_ANON_AQUI'),
```

## 🚀 Testar a Aplicação

Após atualizar a chave:

```bash
# 1. Parar o servidor se estiver rodando (Ctrl+C)

# 2. Limpar cache
rm -rf node_modules/.vite
rm -rf dist

# 3. Iniciar novamente
npm run dev
```

## ✅ Verificação

Abra o navegador em http://localhost:8080 e verifique:

1. ✅ Não deve haver erros 404 para `collections` e `cycles`
2. ✅ A aplicação deve carregar normalmente
3. ✅ O console não deve mostrar erros de conexão com Supabase

## 📊 Resumo das Mudanças

| Item | Antes | Depois |
|------|-------|--------|
| Project ID | lprsvnwshfxhpnwrxfpy | pabxpvqwtvbjaunjejud |
| URL | https://lprsvnwshfxhpnwrxfpy.supabase.co | https://pabxpvqwtvbjaunjejud.supabase.co |
| Migrations | Não aplicadas | ✅ Aplicadas |
| Anon Key | (antiga) | (precisa atualizar) |

## 🎯 Próximos Passos

Após a aplicação funcionar:

1. Criar dados de teste (coleções, personagens, etc.)
2. Testar fluxo completo de assinatura
3. Configurar Edge Functions se necessário
4. Deploy para produção

## 💡 Dica

Se você quiser usar variáveis de ambiente ao invés de hardcoded:

1. Crie um arquivo `.env.local`:
```env
VITE_SUPABASE_URL=https://pabxpvqwtvbjaunjejud.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_aqui
```

2. Remova o bloco `define` do vite.config.ts

3. A aplicação vai usar as variáveis automaticamente
