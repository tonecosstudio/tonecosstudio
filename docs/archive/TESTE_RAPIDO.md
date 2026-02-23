# 🧪 Teste Rápido - Sistema de IA Vision

## ✅ Status do Sistema

### Supabase
- ✅ Rodando em http://127.0.0.1:54321
- ✅ Studio: http://127.0.0.1:54323
- ✅ Edge Functions: http://127.0.0.1:54321/functions/v1

### Edge Functions Deployadas
- ✅ `classify-image-vision` (Version 1) - ACTIVE
- ✅ `process-queue-batch` (Version 1) - ACTIVE

### Database
- ✅ Migrations aplicadas
- ✅ Tabelas criadas: `ai_vision_cache`, `ai_processing_jobs`
- ✅ Campos AI adicionados ao `images_queue`

---

### 1. Iniciar Teste

### 1. Iniciar Dev Server
```bash
npm run dev
```

### 2. Acessar a Aplicação
- **Upload:** http://localhost:5173/admin/upload
- **Conveyor:** http://localhost:5173/admin/esteira
- **Studio:** http://127.0.0.1:54323

---

## 📝 Fluxo de Teste

### Teste 1: Upload e Processamento
1. Acesse http://localhost:5173/admin/upload
2. Faça upload de 3-5 imagens de produtos
3. Clique em "Enviar"
4. Veja o card "Processar com IA Vision"
5. Selecione "GPT-4o mini"
6. Veja a estimativa de custo (ex: "$0.005 USD")
7. Clique em "Processar X Imagens"
8. Aguarde a barra de progresso
9. Veja o toast de sucesso

### Teste 2: Revisar no Conveyor
1. Acesse http://localhost:5173/admin/esteira
2. Veja a primeira imagem processada
3. Verifique o badge "Sugestão IA 85%" (ou similar)
4. Veja o ícone Sparkles ✨
5. Verifique se o nome está pré-preenchido
6. Revise e edite se necessário
7. Pressione ENTER para confirmar

### Teste 3: Reanalisar
1. No Conveyor, clique em "Reanalisar com IA Vision"
2. Aguarde o loading
3. Veja o toast com nova sugestão
4. Verifique se os campos foram atualizados

### Teste 4: Cache
1. Faça upload da mesma imagem novamente
2. Processe com IA
3. Deve ser instantâneo (cache hit)
4. Verifique no Studio: `ai_vision_cache` deve ter 1 registro

---

## 🔍 Verificar Resultados

### No Studio (http://127.0.0.1:54323)

#### Tabela: images_queue
```sql
SELECT 
  id,
  original_filename,
  ai_suggested_name,
  ai_confidence,
  ai_model_used,
  status
FROM images_queue
WHERE ai_suggested_name IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

#### Tabela: ai_vision_cache
```sql
SELECT 
  id,
  image_hash,
  suggested_name,
  confidence,
  model,
  cost_usd,
  created_at
FROM ai_vision_cache
ORDER BY created_at DESC
LIMIT 10;
```

#### Tabela: ai_processing_jobs
```sql
SELECT 
  id,
  status,
  total_images,
  processed_count,
  success_count,
  error_count,
  total_cost_usd,
  created_at,
  completed_at
FROM ai_processing_jobs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Métricas Esperadas

### Performance
- ✅ Processamento: ~12 segundos/imagem
- ✅ Cache hit: < 1 segundo
- ✅ Paralelismo: 5 imagens simultâneas

### Custo
- ✅ GPT-4o mini: ~$0.001/imagem
- ✅ GPT-4o: ~$0.002/imagem

### Qualidade
- ✅ Confiança média: > 70%
- ✅ Taxa de aceitação esperada: > 70%

---

## 🐛 Problemas Comuns

### Erro: "Failed to fetch"
- Verificar se Supabase está rodando: `supabase status`
- Verificar se dev server está rodando: `npm run dev`

### Erro: "OPENAI_API_KEY is not configured"
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### Erro: "Forbidden: admin only"
- Verificar se usuário tem role "admin"
- Usar função `bootstrap-admin` se necessário

### Imagens não aparecem
- Verificar se bucket "product-images" existe
- Verificar permissões de storage

---

## 📝 Logs

### Ver logs das Edge Functions
```bash
# Classify Image Vision
supabase functions logs classify-image-vision --follow

# Process Queue Batch
supabase functions logs process-queue-batch --follow
```

### Filtrar erros
```bash
supabase functions logs classify-image-vision | grep ERROR
```

---

## ✅ Checklist de Teste

- [ ] Upload de imagens funciona
- [ ] Estimativa de custo aparece
- [ ] Processamento com IA funciona
- [ ] Barra de progresso atualiza
- [ ] Sugestões aparecem no Conveyor
- [ ] Badge de confiança aparece
- [ ] Campos são pré-preenchidos
- [ ] Botão "Reanalisar" funciona
- [ ] Confirmação salva corretamente
- [ ] Cache funciona (mesma imagem 2x)
- [ ] Logs não mostram erros

---

## 🎉 Sucesso!

Se todos os testes passaram, o sistema está funcionando perfeitamente!

**Próximos passos:**
1. Testar com mais imagens (50-100)
2. Monitorar custos no OpenAI Dashboard
3. Coletar feedback dos admins
4. Ajustar prompts se necessário
5. Considerar criar página de estatísticas

---

**Data do Teste:** _____________________  
**Testado por:** _____________________  
**Resultado:** ⬜ Passou ⬜ Falhou  
**Observações:** _____________________
