# 🔧 Correção: Models e Model Likes

**Data:** 9 de Março de 2026  
**Migration:** 49 - `20260309172324_add_models_columns_and_model_likes_table.sql`  
**Status:** ✅ APLICADA COM SUCESSO

---

## 🐛 Problemas Identificados

### Erro 1: Tabela model_likes não existe (404)
```
GET /rest/v1/model_likes?select=model_id&user_id=eq.[ID] 404 (Not Found)
```

### Erro 2: Colunas faltantes em models (400)
```
GET /rest/v1/models?select=id,name,franchise,category,subcategory,tags,image_bucket,image_path,created_at 400 (Bad Request)
```

**Colunas que faltavam:**
- `category` ❌
- `subcategory` ❌
- `tags` ❌

---

## ✅ Solução Aplicada

### 1. Colunas Adicionadas à Tabela models

```sql
ALTER TABLE models
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
```

**Descrição das Colunas:**
- `category` - Categoria principal (ex: Personagem, Veículo, Cenário)
- `subcategory` - Subcategoria (ex: Herói, Vilão, Nave)
- `tags` - Array de tags para busca e filtro

**Índices Criados:**
```sql
CREATE INDEX idx_models_category ON models(category);
CREATE INDEX idx_models_subcategory ON models(subcategory);
CREATE INDEX idx_models_tags ON models USING GIN(tags); -- GIN para arrays
```

### 2. Tabela model_likes Criada

```sql
CREATE TABLE model_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(model_id, user_id) -- Um usuário só pode curtir uma vez
);
```

**Índices Criados:**
```sql
CREATE INDEX idx_model_likes_model_id ON model_likes(model_id);
CREATE INDEX idx_model_likes_user_id ON model_likes(user_id);
CREATE INDEX idx_model_likes_created_at ON model_likes(created_at DESC);
```

### 3. RLS Policies para model_likes

```sql
-- Todos podem ver curtidas
CREATE POLICY "model_likes_select_all"
  ON model_likes FOR SELECT
  USING (true);

-- Usuários autenticados podem curtir
CREATE POLICY "model_likes_insert_own"
  ON model_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem remover suas próprias curtidas
CREATE POLICY "model_likes_delete_own"
  ON model_likes FOR DELETE
  USING (auth.uid() = user_id);
```

### 4. Funções Auxiliares

#### get_model_likes_count
Retorna o número total de curtidas de um modelo:

```sql
CREATE FUNCTION get_model_likes_count(model_uuid UUID)
RETURNS INTEGER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM model_likes
  WHERE model_id = model_uuid;
$$;
```

**Uso:**
```sql
SELECT get_model_likes_count('uuid-do-modelo');
-- Retorna: 42
```

#### user_liked_model
Verifica se um usuário específico curtiu um modelo:

```sql
CREATE FUNCTION user_liked_model(model_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM model_likes
    WHERE model_id = model_uuid
      AND user_id = user_uuid
  );
$$;
```

**Uso:**
```sql
SELECT user_liked_model('uuid-do-modelo', 'uuid-do-usuario');
-- Retorna: true ou false
```

---

## 📊 Estrutura Final da Tabela models

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `name` | TEXT | Nome do modelo |
| `description` | TEXT | Descrição |
| `file_url` | TEXT | URL do arquivo 3D |
| `thumbnail_url` | TEXT | URL da thumbnail |
| `franchise` | TEXT | ✅ Franquia (Marvel, DC, etc) |
| `category` | TEXT | ✅ **NOVO** - Categoria principal |
| `subcategory` | TEXT | ✅ **NOVO** - Subcategoria |
| `tags` | TEXT[] | ✅ **NOVO** - Tags (array) |
| `image_bucket` | TEXT | Bucket de storage |
| `image_path` | TEXT | Caminho da imagem |
| `is_active` | BOOLEAN | Se está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

## 📊 Estrutura da Tabela model_likes

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `model_id` | UUID | ID do modelo (FK) |
| `user_id` | UUID | ID do usuário (FK) |
| `created_at` | TIMESTAMPTZ | Data da curtida |

**Constraint:** UNIQUE(model_id, user_id) - Impede curtidas duplicadas

---

## 🎯 Funcionalidades Habilitadas

### 1. Categorização de Modelos

```typescript
// Criar modelo com categoria
const { data, error } = await supabase
  .from('models')
  .insert({
    name: 'Iron Man Mark 50',
    category: 'Personagem',
    subcategory: 'Herói',
    tags: ['Marvel', 'Vingadores', 'Tony Stark'],
    franchise: 'Marvel'
  });
```

### 2. Busca por Tags

```typescript
// Buscar modelos com tag específica
const { data, error } = await supabase
  .from('models')
  .select('*')
  .contains('tags', ['Marvel']);
```

### 3. Filtro por Categoria

```typescript
// Buscar por categoria
const { data, error } = await supabase
  .from('models')
  .select('*')
  .eq('category', 'Personagem')
  .eq('subcategory', 'Herói');
```

### 4. Sistema de Curtidas

```typescript
// Curtir modelo
const { data, error } = await supabase
  .from('model_likes')
  .insert({
    model_id: 'uuid-do-modelo',
    user_id: userId
  });

// Descurtir modelo
const { error } = await supabase
  .from('model_likes')
  .delete()
  .eq('model_id', 'uuid-do-modelo')
  .eq('user_id', userId);

// Verificar se usuário curtiu
const { data, error } = await supabase
  .from('model_likes')
  .select('model_id')
  .eq('model_id', 'uuid-do-modelo')
  .eq('user_id', userId)
  .single();

const liked = !!data;
```

### 5. Contar Curtidas

```typescript
// Usando função SQL
const { data, error } = await supabase
  .rpc('get_model_likes_count', {
    model_uuid: 'uuid-do-modelo'
  });

console.log(`${data} curtidas`);
```

---

## 🧪 Como Testar

### Teste 1: Verificar Colunas em models

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'models'
ORDER BY ordinal_position;
```

**Resultado Esperado:** Deve incluir `category`, `subcategory`, `tags`

### Teste 2: Verificar Tabela model_likes

```sql
SELECT * FROM model_likes LIMIT 1;
```

**Resultado Esperado:** Tabela existe (mesmo que vazia)

### Teste 3: Criar Modelo com Categorias

```sql
INSERT INTO models (name, category, subcategory, tags, franchise)
VALUES (
  'Teste Modelo',
  'Personagem',
  'Herói',
  ARRAY['Teste', 'Marvel'],
  'Marvel'
)
RETURNING *;
```

**Resultado Esperado:** Modelo criado com sucesso

### Teste 4: Curtir Modelo

```sql
INSERT INTO model_likes (model_id, user_id)
VALUES (
  'uuid-do-modelo',
  'uuid-do-usuario'
)
RETURNING *;
```

**Resultado Esperado:** Curtida criada com sucesso

### Teste 5: Contar Curtidas

```sql
SELECT get_model_likes_count('uuid-do-modelo');
```

**Resultado Esperado:** Número de curtidas

---

## 📝 Exemplos de Uso

### Buscar Modelos com Curtidas

```typescript
const { data: models } = await supabase
  .from('models')
  .select(`
    *,
    likes:model_likes(count)
  `)
  .eq('is_active', true);

// Resultado:
// [
//   {
//     id: '...',
//     name: 'Iron Man',
//     likes: [{ count: 42 }]
//   }
// ]
```

### Buscar Modelos que Usuário Curtiu

```typescript
const { data: likedModels } = await supabase
  .from('model_likes')
  .select(`
    model_id,
    models (*)
  `)
  .eq('user_id', userId);
```

### Buscar por Múltiplas Tags

```typescript
const { data: models } = await supabase
  .from('models')
  .select('*')
  .overlaps('tags', ['Marvel', 'Vingadores']);
```

---

## 🎯 Impacto

### Antes
- ❌ Erro 404 em model_likes
- ❌ Erro 400 em models (colunas faltando)
- ❌ Impossível categorizar modelos
- ❌ Impossível curtir modelos

### Depois
- ✅ Tabela model_likes funcional
- ✅ Todas as colunas disponíveis
- ✅ Sistema de categorização completo
- ✅ Sistema de curtidas funcional
- ✅ Funções auxiliares disponíveis

---

## 🚀 Próximos Passos

### Melhorias Futuras

1. **Estatísticas de Curtidas**
   - View com modelos mais curtidos
   - Ranking de popularidade

2. **Tags Sugeridas**
   - Sistema de auto-complete para tags
   - Tags mais usadas

3. **Categorias Predefinidas**
   - Enum para categorias válidas
   - Validação de subcategorias por categoria

4. **Notificações**
   - Notificar criador quando modelo é curtido
   - Notificar quando modelo atinge X curtidas

---

## 📚 Referências

- **Migration:** `20260309172324_add_models_columns_and_model_likes_table.sql`
- **Tabelas:** `models`, `model_likes`
- **Funções:** `get_model_likes_count`, `user_liked_model`

---

## 🎉 Conclusão

A tabela `models` agora tem todas as colunas necessárias para categorização e busca avançada. O sistema de curtidas está completo e funcional com RLS policies e funções auxiliares.

**Status:** ✅ RESOLVIDO

---

**Corrigido por:** Kiro AI Assistant  
**Tempo de Correção:** ~15 minutos  
**Migration:** 49  
**Tabelas Criadas:** 1 (model_likes)  
**Colunas Adicionadas:** 3 (category, subcategory, tags)  
**Funções Criadas:** 2
