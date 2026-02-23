# Resumo das Correções - Erro 400

## 🔍 Problema Identificado

Ao acessar a página inicial, ocorria erro 400:
```
HEAD https://pabxpvqwtvbjaunjejud.supabase.co/rest/v1/images_queue?select=id&ai_suggested_name=is.null 400 (Bad Request)
```

## 🎯 Causa Raiz

A migration `20260201000001_add_ai_fields_to_queue.sql` que adiciona as colunas de AI à tabela `images_queue` não havia sido aplicada no banco de dados local.

O código tentava fazer query na coluna `ai_suggested_name` que não existia:
```tsx
.from("images_queue")
.select("id", { count: "exact", head: true })
.is("ai_suggested_name", null)
```

## ✅ Solução Aplicada

### 1. Reset do Banco de Dados
```bash
supabase db reset
```

Isso recriou o banco e aplicou todas as migrations na ordem correta:
- ✅ `20260130070000_enable_pg_trgm.sql`
- ✅ `20260130070552_348d261f-99e7-4165-81fd-fb1ce0039426.sql`
- ✅ `20260130075135_92a72e78-eb06-4cd6-9bbb-6e7658fac6d3.sql`
- ✅ `20260130075421_6e4d4c00-f46c-4483-9e4f-be0d26493593.sql`
- ✅ `20260130075938_69229f07-a6cd-4ac8-b4c1-5cbfb52494de.sql`
- ✅ `20260130235223_create_quotes_system.sql`
- ✅ `20260131023039_create_profiles_and_likes.sql`
- ✅ `20260201000000_add_ai_vision.sql`
- ✅ `20260201000001_add_ai_fields_to_queue.sql` ← **Esta era a faltante**

### 2. Colunas Adicionadas

A tabela `images_queue` agora possui:
- `ai_suggested_name` (text) - Nome sugerido pela IA
- `ai_confidence` (numeric) - Confiança da sugestão (0.0 a 1.0)
- `ai_model_used` (text) - Modelo de IA usado
- `image_hash` (text) - Hash SHA-256 para deduplicação

### 3. Índices Criados

```sql
-- Índice para encontrar imagens sem sugestão de IA
create index images_queue_ai_suggested_name_idx
on public.images_queue (ai_suggested_name)
where ai_suggested_name is null;

-- Índice para busca por hash
create index images_queue_image_hash_idx
on public.images_queue (image_hash)
where image_hash is not null;
```

## 🧪 Verificação

```bash
supabase db diff --schema public
# Output: "No schema changes found" ✅
```

Isso confirma que o banco local está sincronizado com as migrations.

## 📝 Outras Correções Aplicadas

1. **React Router v7 Warnings** - Adicionadas future flags
2. **Erro 429 (Rate Limit)** - Melhorado tratamento e configuração
3. **Supabase Config** - Ajustada para desenvolvimento local

## 🚀 Próximos Passos

1. Recarregue a página no navegador (Ctrl+R ou F5)
2. O erro 400 não deve mais aparecer
3. A página deve carregar normalmente
4. Se precisar criar usuário admin, use a função bootstrap-admin

## ⚠️ Importante

Sempre que adicionar novas migrations:
```bash
# Aplicar migrations
supabase db reset

# Ou apenas as novas
supabase migration up
```

Para verificar status:
```bash
supabase status
supabase db diff --schema public
```
