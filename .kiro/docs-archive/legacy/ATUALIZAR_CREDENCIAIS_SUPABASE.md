# 🔧 Atualizar Credenciais do Supabase

## ✅ Status Atual

- **Projeto Linkado**: `pabxpvqwtvbjaunjejud` (ordax-tonecos)
- **Migrations**: Já aplicadas no banco remoto
- **Problema**: vite.config.ts está usando credenciais antigas

## 🎯 Ação Necessária

Você precisa atualizar o `vite.config.ts` com as credenciais corretas do projeto `pabxpvqwtvbjaunjejud`.

### Passo 1: Obter Credenciais

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api
2. Copie:
   - **Project URL**: `https://pabxpvqwtvbjaunjejud.supabase.co`
   - **anon/public key**: A chave que começa com `eyJhbGc...`

### Passo 2: Atualizar vite.config.ts

Abra o arquivo `vite.config.ts` e atualize as linhas 9-10:

```typescript
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://pabxpvqwtvbjaunjejud.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('SUA_CHAVE_ANON_AQUI'),
  },
  // ... resto do arquivo
```

### Passo 3: Verificar Migrations

Execute para confirmar que as migrations estão aplicadas:

```bash
supabase db pull
```

### Passo 4: Testar Aplicação

```bash
npm run dev
```

## 🔍 Verificação

Após atualizar, verifique no console do navegador:
- ✅ Não deve haver erros 404 para `collections` e `cycles`
- ✅ A aplicação deve conectar ao Supabase corretamente

## 📊 Resumo das Mudanças

| Item | Antes | Depois |
|------|-------|--------|
| Project ID | lprsvnwshfxhpnwrxfpy | pabxpvqwtvbjaunjejud |
| URL | https://lprsvnwshfxhpnwrxfpy.supabase.co | https://pabxpvqwtvbjaunjejud.supabase.co |
| Anon Key | (antiga) | (nova - obter do dashboard) |

## ⚠️ Importante

As migrations já foram aplicadas no projeto `pabxpvqwtvbjaunjejud`. Você só precisa atualizar as credenciais no código para que a aplicação conecte ao projeto correto.
