# Instruções para Aplicar Migration de Pricing Hierarchy

## Problema Identificado

A visualização hierárquica de preços (Níveis → Planos → Coleções) foi implementada no frontend, mas o banco de dados ainda não tem as colunas necessárias na tabela `subscription_plans`.

## Migration a Aplicar

Arquivo: `supabase/migrations/20260301150001_add_tier_hierarchy_to_plans.sql`

Esta migration adiciona as seguintes colunas à tabela `subscription_plans`:
- `tier_id` (UUID) - Referência ao nível de preço
- `plan_mode` (TEXT) - Modalidade: 'standalone', 'trimestral', 'semestral', 'anual'
- `price_multiplier` (NUMERIC) - Multiplicador de preço

## Como Aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie e cole o conteúdo do arquivo `supabase/migrations/20260301150001_add_tier_hierarchy_to_plans.sql`
5. Clique em **Run** para executar

### Opção 2: Via CLI do Supabase

```bash
supabase db push
```

## Após Aplicar a Migration

1. **Regenerar os tipos TypeScript do Supabase**:
   ```bash
   npx supabase gen types typescript --project-id <seu-project-id> > src/integrations/supabase/types.ts
   ```

2. **Verificar se as colunas foram criadas**:
   Execute no SQL Editor:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'subscription_plans' 
   AND column_name IN ('tier_id', 'plan_mode', 'price_multiplier');
   ```

3. **Testar a visualização hierárquica**:
   - Acesse `/admin/catalogo?tab=pricing`
   - Verifique se a hierarquia carrega sem erros 400

## Próximos Passos

Após aplicar a migration, o código TypeScript será atualizado para usar os campos corretos:
- `tier_id` (não `pricing_tier_id`)
- `plan_mode` (não `mode_id`)

## Arquivos Afetados

- `src/components/admin/pricing-tiers/PricingHierarchyView.tsx`
- `src/integrations/supabase/types.ts` (será regenerado)
