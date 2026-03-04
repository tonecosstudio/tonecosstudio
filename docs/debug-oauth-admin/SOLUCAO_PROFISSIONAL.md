# Solução Profissional: Aplicar Migrations de Produção

## Problema Identificado

A tabela `production_queue` não existe no banco de dados remoto porque as migrations não foram aplicadas corretamente. O comando `npx supabase migration repair` apenas marcou as migrations como aplicadas no histórico, mas não executou o SQL.

## Solução Profissional

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Abra o Supabase Dashboard**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud

2. **Vá para SQL Editor** (ícone de banco de dados na barra lateral)

3. **Execute cada migration na ordem**:

   a. **Migration 1**: `20260428000000_create_production_queue.sql`
   - Clique em "New query"
   - Copie TODO o conteúdo do arquivo `supabase/migrations/20260428000000_create_production_queue.sql`
   - Cole no editor
   - Clique em "Run" ou pressione Ctrl+Enter
   - Aguarde a mensagem de sucesso

   b. **Migration 2**: `20260428000001_create_character_choices.sql`
   - Repita o processo acima com este arquivo

   c. **Migration 3**: `20260428000002_create_production_stages.sql`
   - Repita o processo

   d. **Migration 4**: `20260428000003_create_production_views.sql`
   - Repita o processo

   e. **Migration 5**: `20260428000004_create_production_functions.sql`
   - Repita o processo

4. **Verifique se funcionou**:
   ```sql
   -- Execute esta query para verificar
   SELECT tablename 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename LIKE '%production%'
   ORDER BY tablename;
   ```

   Deve retornar:
   - `production_queue`
   - `character_choices`
   - `production_stages`

### Opção 2: Via psql (Linha de Comando)

Se você tem `psql` instalado:

```bash
# Obter a DATABASE_URL do .env
$DATABASE_URL = (Get-Content .env | Select-String "DATABASE_URL" | ForEach-Object { $_ -replace '.*=', '' })

# Aplicar cada migration
psql $DATABASE_URL -f supabase/migrations/20260428000000_create_production_queue.sql
psql $DATABASE_URL -f supabase/migrations/20260428000001_create_character_choices.sql
psql $DATABASE_URL -f supabase/migrations/20260428000002_create_production_stages.sql
psql $DATABASE_URL -f supabase/migrations/20260428000003_create_production_views.sql
psql $DATABASE_URL -f supabase/migrations/20260428000004_create_production_functions.sql
```

### Opção 3: Reset e Reaplica Todas as Migrations

**ATENÇÃO**: Esta opção vai resetar TODAS as migrations. Use apenas se o banco estiver em desenvolvimento.

```bash
# Fazer backup primeiro!
npx supabase db dump -f backup.sql

# Reset do histórico de migrations
npx supabase migration repair --status reverted 20260428000000
npx supabase migration repair --status reverted 20260428000001
npx supabase migration repair --status reverted 20260428000002
npx supabase migration repair --status reverted 20260428000003
npx supabase migration repair --status reverted 20260428000004

# Aplicar novamente
npx supabase db push
```

## Após Aplicar as Migrations

1. **Adicionar o pagamento manual à fila**:
   Execute o script `add_manual_payment_to_queue.sql` no SQL Editor

2. **Verificar no dashboard**:
   - Acesse `/admin/producao`
   - Recarregue a página (F5)
   - O pedido deve aparecer

3. **Criar trigger para pagamentos manuais futuros**:
   Execute este SQL para que pagamentos manuais sejam automaticamente adicionados:

```sql
-- Trigger para pagamentos manuais
CREATE TRIGGER trigger_auto_populate_production_queue_manual
  AFTER INSERT OR UPDATE OF status ON manual_payments
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION auto_populate_production_queue();
```

## Por Que Isso Aconteceu?

O comando `npx supabase migration repair --status applied` apenas atualiza a tabela `supabase_migrations.schema_migrations` para marcar a migration como aplicada, mas **não executa o SQL da migration**.

Isso é útil quando:
- Você aplicou uma migration manualmente e quer atualizar o histórico
- Você está sincronizando um banco existente com o histórico local

Mas não é útil quando:
- A migration nunca foi executada no banco
- Você quer aplicar o SQL pela primeira vez

## Verificação Final

Após aplicar as migrations, execute:

```sql
-- Verificar tabelas
SELECT COUNT(*) as production_queue_exists 
FROM information_schema.tables 
WHERE table_name = 'production_queue';

-- Verificar funções
SELECT COUNT(*) as get_production_metrics_exists
FROM pg_proc 
WHERE proname = 'get_production_metrics';

-- Verificar views
SELECT COUNT(*) as production_queue_with_details_exists
FROM information_schema.views 
WHERE table_name = 'production_queue_with_details';
```

Todos devem retornar `1`.
