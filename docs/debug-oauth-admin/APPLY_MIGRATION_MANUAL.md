# Aplicar Migração Manualmente

## Problema
O Supabase CLI está detectando conflitos com migrações antigas que já foram aplicadas manualmente.

## Solução: Aplicar via SQL Editor

### Passo 1: Acessar o SQL Editor
1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
2. Faça login se necessário

### Passo 2: Copiar e Executar o SQL

Copie o conteúdo completo do arquivo abaixo e cole no SQL Editor:

**Arquivo:** `supabase/migrations/20260506000000_add_denormalized_fields_to_character_choices.sql`

### Passo 3: Executar

1. Cole todo o conteúdo do arquivo no editor SQL
2. Clique no botão "Run" (ou pressione Ctrl+Enter)
3. Aguarde a execução completar
4. Verifique se aparece a mensagem de sucesso

### Passo 4: Verificar

Execute este SQL para verificar que funcionou:

```sql
-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'character_choices' 
  AND column_name IN ('customer_name', 'customer_email', 'collection_name');

-- Deve retornar 3 linhas:
-- customer_name | text
-- customer_email | text
-- collection_name | text
```

### Passo 5: Testar os Dados

```sql
-- Verificar se os dados foram populados
SELECT 
  id, 
  customer_name, 
  customer_email, 
  collection_name 
FROM character_choices 
LIMIT 5;

-- Deve mostrar os nomes e emails preenchidos
```

## Alternativa: Registrar a Migração Manualmente

Se você já aplicou a migração via SQL Editor, registre-a no histórico:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260506000000',
  'add_denormalized_fields_to_character_choices',
  ARRAY['ALTER TABLE character_choices ADD COLUMN customer_name TEXT, ADD COLUMN customer_email TEXT, ADD COLUMN collection_name TEXT']
)
ON CONFLICT (version) DO NOTHING;
```

## Após Aplicar

1. ✅ A migração estará aplicada
2. ✅ O código já está atualizado para usar os campos desnormalizados
3. ✅ Teste a interface de gerenciamento de escolhas de personagens
4. ✅ Verifique que não há mais erros PGRST200

## Próximos Passos

Depois de aplicar esta migração, podemos:
1. Testar as funções `fetchPendingChoices()` e `getChoiceHistory()`
2. Verificar que a interface de admin carrega sem erros
3. Continuar com as tarefas restantes do spec de Production Management System
