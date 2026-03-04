# Problema: Erro 400 nas Queries do Supabase

## Diagnóstico Completo

Identifiquei a causa raiz dos erros 400 nas queries do Supabase. O problema tem duas partes:

### 1. Tabela `standalone_purchases` não está nos tipos do Supabase

A tabela `standalone_purchases` existe no banco de dados, mas não está no arquivo `src/integrations/supabase/types.ts`. Isso causa erros de TypeScript e impede que o Supabase client reconheça a tabela.

### 2. Incompatibilidade de nomes de campos

O código está tentando acessar campos que têm nomes diferentes no banco de dados:

| Código espera | Banco tem |
|---------------|-----------|
| `price_deposit` | `deposit_amount` |
| `price_balance` | `balance_amount` |
| `price_full` | `total_amount` |
| `deposit_voucher_url` | `payment_voucher_deposit_url` |
| `balance_voucher_url` | `payment_voucher_balance_url` |
| `character_id` | (não existe) |
| `expected_delivery_date` | (não existe) |
| `actual_delivery_date` | (não existe) |

### 3. Problema com joins aninhados

As queries estão tentando fazer joins aninhados que o Supabase PostgREST não suporta da forma como está escrito:

```typescript
// ❌ ERRADO - Supabase não suporta joins aninhados assim
subscriptions!inner (
  profiles!inner (...)
)
```

## Solução

Criei uma migration que corrige todos esses problemas:

### Arquivo: `supabase/migrations/20260427000000_add_missing_fields_to_standalone_purchases.sql`

Esta migration:
1. ✅ Adiciona o campo `character_id` à tabela `standalone_purchases`
2. ✅ Renomeia os campos de preço para corresponder ao código
3. ✅ Renomeia os campos de voucher para corresponder ao código
4. ✅ Adiciona os campos `expected_delivery_date` e `actual_delivery_date`

## Como Aplicar a Correção

### Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Vá para o seu projeto
3. Clique em "SQL Editor" no menu lateral
4. Clique em "New Query"
5. Cole o conteúdo do arquivo `supabase/migrations/20260427000000_add_missing_fields_to_standalone_purchases.sql`
6. Clique em "Run" para executar

### Opção 2: Via CLI (se tiver psql instalado)

```bash
# Windows PowerShell
$env:PGPASSWORD='sua-senha-aqui'
psql -h aws-0-sa-east-1.pooler.supabase.com -p 6543 -U postgres.pabxpvqwtvbjaunjejud -d postgres -f supabase/migrations/20260427000000_add_missing_fields_to_standalone_purchases.sql
```

### Opção 3: Copiar e colar manualmente

Abra o arquivo `supabase/migrations/20260427000000_add_missing_fields_to_standalone_purchases.sql` e execute o SQL diretamente no Supabase Dashboard.

## Após Aplicar a Migration

### 1. Regenerar os tipos do Supabase

```bash
npx supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts
```

Isso vai atualizar o arquivo de tipos para incluir a tabela `standalone_purchases` com os campos corretos.

### 2. Verificar se a página funciona

Após regenerar os tipos, a página `/admin/pedidos` deve funcionar corretamente sem erros 400.

## Queries Corrigidas

Após a migration, as queries no `orders-service.ts` vão funcionar porque:

1. ✅ Os campos `price_deposit`, `price_balance`, `price_full` vão existir
2. ✅ Os campos `deposit_voucher_url`, `balance_voucher_url` vão existir
3. ✅ O campo `character_id` vai existir
4. ✅ Os campos `expected_delivery_date`, `actual_delivery_date` vão existir
5. ✅ O relacionamento com `profiles` já foi corrigido pela migration anterior

## Próximos Passos

1. Execute a migration no Supabase Dashboard
2. Regenere os tipos do Supabase
3. Teste a página `/admin/pedidos`
4. Se ainda houver erros, me avise para investigar

## Nota Importante

A migration foi criada de forma segura usando `IF EXISTS` e `IF NOT EXISTS`, então pode ser executada múltiplas vezes sem causar erros.
