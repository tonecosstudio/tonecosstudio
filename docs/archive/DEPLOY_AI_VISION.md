# Deploy: Sistema de IA Vision

Guia rápido para fazer deploy do sistema de classificação com IA Vision.

---

## 🚀 Deploy Completo (Primeira Vez)

### 1. Aplicar Migrations

```bash
# Resetar banco local (CUIDADO: apaga todos os dados)
supabase db reset

# OU aplicar apenas as novas migrations
supabase migration up
```

### 2. Deploy das Edge Functions

```bash
# Deploy individual
supabase functions deploy classify-image-vision
supabase functions deploy process-queue-batch

# OU deploy de todas as funções
supabase functions deploy
```

### 3. Verificar Deploy

```bash
# Listar funções deployadas
supabase functions list

# Ver logs em tempo real
supabase functions logs classify-image-vision --follow
supabase functions logs process-queue-batch --follow
```

### 4. Testar Localmente

```bash
# Iniciar dev server
npm run dev

# Acessar no navegador
# http://localhost:5173/admin/upload-queue
```

---

## 🔄 Atualizar Apenas o Código (Sem Migrations)

Se você já aplicou as migrations e só quer atualizar o código das Edge Functions:

```bash
# Deploy apenas das funções modificadas
supabase functions deploy classify-image-vision
supabase functions deploy process-queue-batch

# Verificar logs
supabase functions logs classify-image-vision --tail 50
```

---

## 🧪 Testar Edge Functions Localmente

### Testar classify-image-vision

```bash
# Obter token de autenticação
# (copiar do DevTools > Application > Local Storage > sb-*-auth-token)

# Testar função
curl -X POST \
  http://localhost:54321/functions/v1/classify-image-vision \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"queue_id": "ID_DA_IMAGEM_NA_FILA"}'
```

### Testar process-queue-batch

```bash
curl -X POST \
  http://localhost:54321/functions/v1/process-queue-batch \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 5, "model": "gpt-4o-mini"}'
```

---

## 📊 Monitorar em Produção

### Ver Logs

```bash
# Logs em tempo real
supabase functions logs classify-image-vision --follow

# Últimas 100 linhas
supabase functions logs process-queue-batch --tail 100

# Filtrar por erro
supabase functions logs classify-image-vision | grep ERROR
```

### Verificar Banco de Dados

```bash
# Conectar ao banco
supabase db remote connect

# Verificar cache
SELECT COUNT(*) FROM ai_vision_cache;

# Verificar jobs
SELECT * FROM ai_processing_jobs ORDER BY created_at DESC LIMIT 10;

# Verificar imagens pendentes
SELECT COUNT(*) FROM images_queue WHERE ai_suggested_name IS NULL;
```

---

## 🐛 Troubleshooting

### Erro: "OPENAI_API_KEY is not configured"

```bash
# Configurar secret no Supabase
supabase secrets set OPENAI_API_KEY=sk-proj-...

# Verificar secrets
supabase secrets list
```

### Erro: "column 'ai_suggested_name' does not exist"

```bash
# Aplicar migration que adiciona as colunas
supabase migration up

# OU resetar banco
supabase db reset
```

### Erro: "Failed to generate image URL"

```bash
# Verificar se bucket existe
supabase storage list

# Criar bucket se necessário (via Dashboard)
# Nome: product-images
# Public: true
```

### Função não responde / timeout

```bash
# Ver logs para identificar erro
supabase functions logs classify-image-vision --tail 50

# Verificar se OpenAI API está respondendo
# (testar em https://platform.openai.com/playground)

# Aumentar timeout (se necessário)
# Editar supabase/config.toml e adicionar:
# [functions.classify-image-vision]
# timeout = 120
```

---

## 🔐 Segurança

### Verificar Permissões

```bash
# Conectar ao banco
supabase db remote connect

# Verificar RLS policies
\d+ ai_vision_cache
\d+ ai_processing_jobs

# Testar como usuário não-admin
# (deve retornar erro 403)
```

### Rotacionar API Key

```bash
# 1. Gerar nova key na OpenAI
# 2. Atualizar secret
supabase secrets set OPENAI_API_KEY=sk-proj-NOVA_KEY

# 3. Redeploy funções (para recarregar secrets)
supabase functions deploy classify-image-vision
supabase functions deploy process-queue-batch
```

---

## 📈 Otimizações

### Aumentar Paralelismo

Editar `supabase/functions/process-queue-batch/index.ts`:

```typescript
const maxConcurrent = 10; // Aumentar de 5 para 10
```

Redeploy:

```bash
supabase functions deploy process-queue-batch
```

### Ajustar Tamanho do Batch

No frontend (`UploadQueue.tsx`), ajustar:

```typescript
batch_size: Math.min(pendingCount, 100), // Aumentar de 50 para 100
```

### Otimizar Prompt

Editar `supabase/functions/_shared/ai-vision.ts` na função `buildVisionPrompt()`.

Redeploy:

```bash
supabase functions deploy classify-image-vision
supabase functions deploy process-queue-batch
```

---

## 📝 Checklist de Deploy

- [ ] Aplicar migrations (`supabase migration up`)
- [ ] Deploy Edge Functions (`supabase functions deploy`)
- [ ] Verificar secrets (`supabase secrets list`)
- [ ] Testar upload de imagem
- [ ] Testar processamento com IA
- [ ] Verificar logs (`supabase functions logs`)
- [ ] Testar Conveyor com sugestões
- [ ] Verificar custos no OpenAI Dashboard
- [ ] Monitorar por 24h

---

## 🎯 Comandos Úteis

```bash
# Status geral
supabase status

# Reiniciar Supabase local
supabase stop
supabase start

# Ver todas as migrations
supabase migration list

# Criar nova migration
supabase migration new nome_da_migration

# Gerar tipos TypeScript
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Backup do banco
supabase db dump -f backup.sql

# Restaurar backup
supabase db reset
psql -h localhost -p 54322 -U postgres -d postgres -f backup.sql
```

---

**Última atualização:** 31 de Janeiro de 2026
