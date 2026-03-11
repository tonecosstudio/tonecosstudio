# Reset e Reconstrução do Banco de Dados Supabase

## ⚠️ ATENÇÃO: Este processo vai APAGAR TODOS OS DADOS!

Faça backup antes de continuar se houver dados importantes.

## Passo 1: Reset do Banco de Dados

No Supabase Dashboard, vá em **Database** > **SQL Editor** e execute:

```sql
-- CUIDADO: Isso vai apagar TUDO!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

## Passo 2: Rodar Todas as Migrations

Você tem duas opções:

### Opção A: Usar o CLI do Supabase (Recomendado)

```bash
# No terminal, na raiz do projeto
supabase db reset --linked
```

Este comando vai:
1. Resetar o banco
2. Rodar todas as migrations em ordem
3. Aplicar as seeds (se houver)

### Opção B: Push das Migrations

```bash
# No terminal, na raiz do projeto
supabase db push --linked
```

## Passo 3: Verificar se Tudo Funcionou

Execute este SQL para verificar as tabelas criadas:

```sql
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Passo 4: Verificar Colunas Importantes

```sql
-- Verificar standalone_purchases
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'standalone_purchases'
ORDER BY ordinal_position;

-- Verificar subscription_deliveries
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscription_deliveries'
ORDER BY ordinal_position;

-- Verificar manual_payments
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'manual_payments'
ORDER BY ordinal_position;

-- Verificar subscriptions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;
```

## Passo 5: Testar a Aplicação

Depois de rodar as migrations, teste:
1. Login com Google OAuth
2. Navegue pelas páginas admin
3. Verifique se não há mais erros 400 no console

## Notas Importantes

- As migrations já contêm toda a estrutura correta do banco
- Não precisa adicionar colunas manualmente depois
- Se alguma migration falhar, verifique os logs e corrija antes de continuar
- O Supabase vai rodar as migrations na ordem dos timestamps nos nomes dos arquivos
