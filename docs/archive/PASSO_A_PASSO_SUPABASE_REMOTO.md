# 🔧 Passo a Passo - Aplicar Migration no Supabase Remoto

## 📋 Problema

O frontend está conectado ao Supabase **remoto** (pabxpvqwtvbjaunjejud.supabase.co), mas a migration que adiciona as colunas de AI não foi aplicada lá.

**Erro atual:**
```
HEAD https://pabxpvqwtvbjaunjejud.supabase.co/rest/v1/images_queue?select=id&ai_suggested_name=is.null 400 (Bad Request)
```

## ✅ Solução

Aplicar a migration no banco de dados remoto via Dashboard do Supabase.

---

## 🚀 Passo a Passo

### 1️⃣ Acessar o Supabase Dashboard

1. Abra seu navegador
2. Acesse: https://supabase.com/dashboard
3. Faça login na sua conta
4. Selecione o projeto: **pabxpvqwtvbjaunjejud**

### 2️⃣ Abrir o SQL Editor

1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Ou acesse diretamente: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

### 3️⃣ Copiar o SQL

1. Abra o arquivo: `APLICAR_NO_SUPABASE_REMOTO.sql`
2. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)

### 4️⃣ Colar e Executar

1. Cole o SQL no editor (Ctrl+V)
2. Clique no botão **"Run"** (ou pressione Ctrl+Enter)
3. Aguarde a execução

### 5️⃣ Verificar Sucesso

Você deve ver mensagens como:
```
✅ ALTER TABLE
✅ CREATE INDEX
✅ CREATE INDEX
✅ COMMENT
✅ COMMENT
✅ COMMENT
✅ COMMENT
```

### 6️⃣ Confirmar as Colunas (Opcional)

Execute esta query para confirmar:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'images_queue'
  AND column_name IN ('ai_suggested_name', 'ai_confidence', 'ai_model_used', 'image_hash');
```

**Resultado esperado:**
```
column_name         | data_type | is_nullable
--------------------+-----------+-------------
ai_suggested_name   | text      | YES
ai_confidence       | numeric   | YES
ai_model_used       | text      | YES
image_hash          | text      | YES
```

### 7️⃣ Testar no Frontend

1. Volte ao navegador com o frontend
2. Recarregue a página (Ctrl+R ou F5)
3. Abra o DevTools (F12)
4. Verifique o console

**Antes:**
```
❌ HEAD .../images_queue?...ai_suggested_name=is.null 400 (Bad Request)
```

**Depois:**
```
✅ Sem erro 400
✅ Query executada com sucesso
```

---

## 🎯 O Que Este SQL Faz?

### Adiciona 4 Colunas Novas

1. **ai_suggested_name** (text)
   - Nome do modelo sugerido pela IA Vision
   - Exemplo: "Iron Man Mark 42"

2. **ai_confidence** (numeric 0.0-1.0)
   - Confiança da sugestão da IA
   - Exemplo: 0.95 (95% de confiança)

3. **ai_model_used** (text)
   - Modelo de IA usado na análise
   - Exemplo: "gpt-4o-mini"

4. **image_hash** (text)
   - Hash SHA-256 da imagem
   - Usado para detectar duplicatas

### Cria 2 Índices

1. **images_queue_ai_suggested_name_idx**
   - Acelera busca por imagens sem sugestão de IA
   - Usado na página de Upload Queue

2. **images_queue_image_hash_idx**
   - Acelera busca por hash
   - Usado para deduplicação

---

## ⚠️ Importante

### Backup Automático
O Supabase faz backup automático, mas se quiser garantir:
1. Vá em **Database** → **Backups**
2. Clique em **"Create backup"** antes de executar

### Reversão (se necessário)
Se algo der errado, você pode reverter com:

```sql
-- APENAS SE PRECISAR REVERTER
ALTER TABLE public.images_queue
DROP COLUMN IF EXISTS ai_suggested_name,
DROP COLUMN IF EXISTS ai_confidence,
DROP COLUMN IF EXISTS ai_model_used,
DROP COLUMN IF EXISTS image_hash;

DROP INDEX IF EXISTS images_queue_ai_suggested_name_idx;
DROP INDEX IF EXISTS images_queue_image_hash_idx;
```

---

## 🐛 Troubleshooting

### Erro: "permission denied"
- Verifique se você é o owner do projeto
- Ou se tem permissões de admin

### Erro: "column already exists"
- Tudo bem! Significa que a coluna já existe
- O SQL usa `IF NOT EXISTS` para evitar erros

### Erro persiste no frontend
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue com cache limpo (Ctrl+F5)
3. Verifique se está usando a URL correta no .env

---

## 📊 Checklist

- [ ] Acessei o Supabase Dashboard
- [ ] Abri o SQL Editor
- [ ] Copiei o SQL do arquivo `APLICAR_NO_SUPABASE_REMOTO.sql`
- [ ] Colei e executei no SQL Editor
- [ ] Vi mensagens de sucesso (ALTER TABLE, CREATE INDEX)
- [ ] Recarreguei o frontend
- [ ] Erro 400 desapareceu do console

---

## 🎉 Sucesso!

Se todos os passos acima foram concluídos, o erro 400 deve ter desaparecido e o frontend deve estar funcionando normalmente!

## 📞 Próximos Passos

Depois de aplicar:
1. Teste a funcionalidade de Upload Queue
2. Teste a análise de imagens com IA
3. Verifique se os dados estão sendo salvos corretamente

---

## 📚 Arquivos Relacionados

- `APLICAR_NO_SUPABASE_REMOTO.sql` - SQL para copiar e colar
- `CORRECOES_APLICADAS.md` - Histórico de todas as correções
- `RESUMO_CORRECOES_ERRO_400.md` - Detalhes técnicos do erro
