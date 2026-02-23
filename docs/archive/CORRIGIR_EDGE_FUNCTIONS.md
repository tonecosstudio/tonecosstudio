# 🔧 Corrigir Edge Functions - Erro 500

## ❌ Problema Identificado

```
POST https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/classify-image-vision 500 (Internal Server Error)
```

### Causa Raiz

As Edge Functions estavam tentando buscar imagens do bucket errado:
- ❌ Buscando de: `models` (bucket errado)
- ✅ Deveria buscar de: `product-images` (bucket correto)

Além disso, estavam usando campo errado:
- ❌ Campo: `image_path` (não existe)
- ✅ Campo correto: `storage_path` (existe na tabela)

## ✅ Correções Aplicadas

### Funções Corrigidas:
1. ✅ `classify-image-vision/index.ts`
2. ✅ `process-queue-batch/index.ts`

### Mudanças:
```typescript
// ANTES (errado)
.select("id,image_path,image_hash")
.from("models")
.createSignedUrl(queueItem.image_path, 3600)

// DEPOIS (correto)
.select("id,storage_bucket,storage_path,image_hash")
const bucket = queueItem.storage_bucket || "product-images";
.from(bucket)
.createSignedUrl(queueItem.storage_path, 3600)
```

---

## 🚀 Como Aplicar (Deploy das Funções)

### Opção 1: Deploy de Todas as Funções (Recomendado)

```bash
supabase functions deploy
```

Isso fará deploy de todas as Edge Functions para o projeto remoto.

### Opção 2: Deploy Individual

```bash
# Deploy apenas as funções corrigidas
supabase functions deploy classify-image-vision
supabase functions deploy process-queue-batch
```

---

## 📋 Passo a Passo Completo

### 1️⃣ Verificar Login no Supabase CLI

```bash
supabase login
```

Se não estiver logado, você será redirecionado para o navegador para fazer login.

### 2️⃣ Linkar o Projeto

```bash
supabase link --project-ref pabxpvqwtvbjaunjejud
```

### 3️⃣ Fazer Deploy

```bash
# Deploy de todas as funções
supabase functions deploy

# OU deploy individual
supabase functions deploy classify-image-vision
supabase functions deploy process-queue-batch
```

### 4️⃣ Verificar Deploy

Você verá algo como:
```
✅ Deploying function classify-image-vision...
✅ Function classify-image-vision deployed successfully
✅ Deploying function process-queue-batch...
✅ Function process-queue-batch deployed successfully
```

### 5️⃣ Testar no Frontend

1. Recarregue a página (Ctrl+R)
2. Tente usar a funcionalidade de análise de imagem
3. Verifique o console - o erro 500 deve ter sumido

---

## 🔍 Verificar Se Funcionou

### No Console do Navegador

**ANTES:**
```
❌ POST .../classify-image-vision 500 (Internal Server Error)
```

**DEPOIS:**
```
✅ POST .../classify-image-vision 200 (OK)
```

### No Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions
2. Verifique se as funções aparecem como "Deployed"
3. Clique em "Logs" para ver se há erros

---

## 🐛 Troubleshooting

### Erro: "Not logged in"
```bash
supabase login
```

### Erro: "Project not linked"
```bash
supabase link --project-ref pabxpvqwtvbjaunjejud
```

### Erro: "Permission denied"
- Verifique se você tem acesso ao projeto no Supabase
- Verifique se é o owner ou tem permissões de admin

### Erro persiste após deploy
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue com Ctrl+F5
3. Verifique os logs da função no Dashboard

---

## 📊 Checklist

- [ ] Logado no Supabase CLI (`supabase login`)
- [ ] Projeto linkado (`supabase link`)
- [ ] Deploy realizado (`supabase functions deploy`)
- [ ] Mensagens de sucesso no terminal
- [ ] Frontend recarregado (Ctrl+R)
- [ ] Erro 500 desapareceu do console
- [ ] Funcionalidade de análise de imagem funcionando

---

## 🎯 Resumo das Correções

| Arquivo | Problema | Solução |
|---------|----------|---------|
| `classify-image-vision/index.ts` | Bucket errado + campo errado | Usa `storage_bucket` e `storage_path` |
| `process-queue-batch/index.ts` | Bucket errado + campo errado | Usa `storage_bucket` e `storage_path` |

---

## 📚 Comandos Úteis

```bash
# Ver status das funções
supabase functions list

# Ver logs de uma função
supabase functions logs classify-image-vision

# Testar função localmente (antes de deploy)
supabase functions serve classify-image-vision
```

---

## ⚠️ Importante

### Variáveis de Ambiente

As Edge Functions precisam das seguintes variáveis configuradas no Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/functions
2. Verifique se existe: `OPENAI_API_KEY`
3. Se não existir, adicione sua chave da OpenAI

### Custo

As funções de AI Vision usam a API da OpenAI e têm custo por requisição. Monitore o uso no dashboard da OpenAI.

---

## 🎉 Próximos Passos

Após aplicar as correções:
1. ✅ Aplicar SQL no banco remoto (já feito?)
2. ✅ Deploy das Edge Functions (este guia)
3. ✅ Testar funcionalidade completa
4. ✅ Configurar variáveis de ambiente (se necessário)
