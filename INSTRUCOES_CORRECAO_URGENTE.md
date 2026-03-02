# 🚨 INSTRUÇÕES PARA CORREÇÃO URGENTE

## Problema Identificado

Os erros 400 nas queries do Supabase ocorrem porque:

1. A tabela `standalone_purchases` tem nomes de campos diferentes do que o código espera
2. Faltam alguns campos necessários na tabela
3. Os tipos do Supabase não estão atualizados

## Solução em 3 Passos

### PASSO 1: Executar SQL no Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
2. Cole o conteúdo do arquivo `FIX_STANDALONE_PURCHASES.sql` (está na raiz do projeto)
3. Clique em "Run" (ou pressione Ctrl+Enter)
4. Verifique se todos os campos mostram "✅ OK" no resultado

### PASSO 2: Regenerar os Tipos do Supabase

Execute no terminal:

```bash
npx supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts
```

### PASSO 3: Testar a Página

1. Recarregue a página `/admin/pedidos` no navegador
2. Os erros 400 devem desaparecer
3. A página deve carregar os pedidos corretamente

## Se Ainda Houver Erros

Se após executar os 3 passos ainda houver erros, me avise com:
1. A mensagem de erro completa do console
2. O resultado da query de verificação do PASSO 1

## Arquivos Criados

- `FIX_STANDALONE_PURCHASES.sql` - SQL para executar no Supabase Dashboard
- `PROBLEMA_QUERIES_SUPABASE.md` - Documentação detalhada do problema
- `supabase/migrations/20260427000000_add_missing_fields_to_standalone_purchases.sql` - Migration completa

## Nota Importante

O SQL foi criado de forma segura e pode ser executado múltiplas vezes sem causar erros. Ele verifica se cada campo já existe antes de tentar criar ou renomear.
