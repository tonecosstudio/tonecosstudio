# 🔧 Erro 500 - confirm-model

## ❌ Novo Erro Identificado

```
POST https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/confirm-model 500 (Internal Server Error)
```

## 🔍 Causa Raiz

A função `confirm-model` está tentando acessar a tabela `franchise_rules` que **não existe** no banco de dados remoto.

### O Que a Tabela Faz?

A tabela `franchise_rules` armazena regras automáticas de mapeamento de franquias:
- **Pattern:** Palavra-chave para buscar (ex: "magneto", "x-men")
- **Franchise Canonical:** Franquia canônica a aplicar (ex: "X-Men")
- **Priority:** Ordem de prioridade das regras
- **Enabled:** Se a regra está ativa

### Por Que É Necessária?

Quando você confirma um modelo na esteira (Conveyor), a função:
1. Busca regras existentes em `franchise_rules`
2. Aplica a regra se o nome do modelo bater com algum pattern
3. Salva novas regras quando você sobrescreve manualmente uma franquia

---

## ✅ Solução

O SQL foi **atualizado** para incluir a criação da tabela `franchise_rules`.

### Arquivos Atualizados:
- ✅ `SQL_COPIAR_COLAR.txt` (versão simples)
- ✅ `APLICAR_NO_SUPABASE_REMOTO.sql` (versão completa)

---

## 🚀 Como Aplicar

### 1️⃣ Abrir SQL Editor
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

### 2️⃣ Copiar SQL Atualizado
Abra: **`SQL_COPIAR_COLAR.txt`**

Copie **TUDO** (Ctrl+A, Ctrl+C)

### 3️⃣ Colar e Executar
- Cole no SQL Editor (Ctrl+V)
- Clique em **"Run"** (ou Ctrl+Enter)

### 4️⃣ Verificar Sucesso
Você deve ver:
```
✅ CREATE EXTENSION (ou já existe)
✅ ALTER TABLE
✅ CREATE TABLE
✅ CREATE INDEX (5x)
✅ ALTER TABLE (RLS)
✅ DO (políticas - 2x)
✅ DO (trigger)
✅ COMMENT (7x)
```

---

## 📊 O Que Será Criado

### 1. Extensão pg_trgm
Para busca por similaridade de texto

### 2. Colunas em images_queue
- `ai_suggested_name`
- `ai_confidence`
- `ai_model_used`
- `image_hash`

### 3. Tabela franchise_rules (NOVA!)
```sql
CREATE TABLE public.franchise_rules (
  id uuid PRIMARY KEY,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  enabled boolean DEFAULT true,
  priority int DEFAULT 100,
  pattern text NOT NULL,
  franchise_canonical text NOT NULL,
  note text
);
```

### 4. Índices
- Para `images_queue` (2 índices)
- Para `franchise_rules` (3 índices)

### 5. Políticas RLS
- Apenas admins podem ler/escrever em `franchise_rules`

### 6. Trigger
- Atualiza `updated_at` automaticamente

---

## 🎯 Resultado Esperado

Após aplicar o SQL:

**ANTES:**
```
❌ HEAD .../images_queue?...ai_suggested_name=is.null 400
❌ POST .../classify-image-vision 500
❌ POST .../confirm-model 500
```

**DEPOIS:**
```
✅ Todas as requisições funcionando
✅ Aplicação 100% funcional
```

---

## ⏱️ Tempo Estimado

**1 minuto** para aplicar o SQL completo e resolver todos os erros! ⚡

---

## 📁 Arquivos Importantes

- `SQL_COPIAR_COLAR.txt` ← **Use este!** (atualizado)
- `APLICAR_NO_SUPABASE_REMOTO.sql` (versão com comentários)
- `ERRO_500_CONFIRM_MODEL.md` (este arquivo)

---

## 🆘 Troubleshooting

### Erro: "function has_role does not exist"
A função `has_role` deve existir. Se não existir, verifique se a migration base foi aplicada.

### Erro: "function set_updated_at does not exist"
A função `set_updated_at` deve existir. Se não existir, verifique se a migration base foi aplicada.

### SQL executou mas erro persiste
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue com Ctrl+F5
3. Verifique se a tabela foi criada:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'franchise_rules';
   ```

---

## 🎉 Conclusão

Este é o **último passo** para resolver todos os erros!

Após aplicar o SQL atualizado, todos os 3 erros estarão resolvidos:
- ✅ Erro 400 (colunas)
- ✅ Erro 500 (classify-image-vision)
- ✅ Erro 500 (confirm-model)
