# Database Migration Instructions

## Character Choices Denormalization Migration

### Overview
This migration adds denormalized fields to the `character_choices` table to fix PGRST200 query errors.

### Migration File
`supabase/migrations/20260506000000_add_denormalized_fields_to_character_choices.sql`

### What It Does
1. Adds three columns: `customer_name`, `customer_email`, `collection_name`
2. Populates existing records with data from `profiles` and `collections` tables
3. Updates the `auto_populate_production_queue()` trigger to populate these fields automatically
4. Validates the migration completed successfully

### How to Apply

#### ✅ MÉTODO RECOMENDADO: Supabase Dashboard SQL Editor

1. **Abra o SQL Editor:**
   - Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
   - Faça login se necessário

2. **Copie o SQL simplificado:**
   - Abra o arquivo: `apply-character-choices-denormalization.sql` (na raiz do projeto)
   - Copie TODO o conteúdo (Ctrl+A, Ctrl+C)

3. **Execute:**
   - Cole no SQL Editor do Supabase (Ctrl+V)
   - Clique em "Run" (ou pressione Ctrl+Enter)
   - Aguarde a execução (deve levar alguns segundos)

4. **Verifique a mensagem de sucesso:**
   - Deve aparecer: "✅ Migração aplicada com sucesso!"
   - Se aparecer erro de "already exists", está tudo bem - significa que já foi aplicado

#### Alternativa: Usando PostgreSQL Client (se tiver a senha)

```bash
# Instale o pg client se necessário
npm install pg

# Execute com a senha do banco
DATABASE_PASSWORD=sua_senha node apply-sql-direct.mjs
```

Para obter a senha:
1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/database
2. Copie a "Database Password" ou resete se necessário

### Verification

After applying the migration, verify it worked:

```sql
-- Check columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'character_choices' 
  AND column_name IN ('customer_name', 'customer_email', 'collection_name');

-- Check data was populated
SELECT 
  id, 
  customer_name, 
  customer_email, 
  collection_name 
FROM character_choices 
LIMIT 5;
```

### Code Changes Already Applied

The following files have been updated to use the denormalized fields:

1. **src/services/admin/choice-service.ts**
   - `fetchPendingChoices()` - Updated to use denormalized fields
   - `getChoiceHistory()` - Updated to use denormalized fields

### Testing After Migration

1. Test the character choice management interface:
   - Navigate to the admin character choice manager page
   - Verify the table loads without PGRST200 errors
   - Check that customer names and collection names display correctly

2. Test the choice history:
   - Open an order detail page
   - View the choice history
   - Verify all historical choices display correctly

### Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove the columns
ALTER TABLE character_choices
DROP COLUMN IF EXISTS customer_name,
DROP COLUMN IF EXISTS customer_email,
DROP COLUMN IF EXISTS collection_name;

-- Restore the original trigger function
-- (You would need to restore from backup or re-run the original migration)
```

### Related Documentation

- **Problem Analysis**: `docs/character-choices-denormalization-fix.md`
- **Similar Fix**: `docs/production-queue-query-fix.md`
- **Spec**: `.kiro/specs/production-management-system/`

### Status

- ✅ Migration file created
- ✅ Service layer code updated
- ⏳ **Migration needs to be applied to database** ← YOU ARE HERE
- ⏳ Testing needed after migration

### Support

If you encounter any issues:
1. Check the Supabase logs for detailed error messages
2. Verify your service role key has sufficient permissions
3. Review the migration file for any syntax errors
4. Contact the development team for assistance
