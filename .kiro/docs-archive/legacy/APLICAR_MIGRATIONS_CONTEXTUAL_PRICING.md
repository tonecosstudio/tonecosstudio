# 🚀 Aplicar Migrations do Sistema de Preços Contextuais

## ✅ Migrations Criadas

Foram criadas 6 migrations SQL para o sistema de preços contextuais:

1. `20260511000000_create_collection_types.sql` - Tabela de tipos de coleção dinâmicos
2. `20260511000001_create_collection_base_pricing.sql` - Tabela de preços base
3. `20260511000002_create_pricing_context_multipliers.sql` - Tabela de multiplicadores e descontos
4. `20260511000003_create_pricing_history.sql` - Tabela de histórico de mudanças
5. `20260511000004_alter_collections_add_type.sql` - Adiciona collection_type_id em collections
6. `20260511000005_alter_characters_add_price_multiplier.sql` - Adiciona price_multiplier em characters

## 📋 Método 1: Aplicar via Supabase Dashboard (Recomendado)

### Passo 1: Abrir SQL Editor

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto: **pabxpvqwtvbjaunjejud**
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Copiar e Colar o SQL

1. Abra o arquivo `apply-contextual-pricing-only.sql` (na raiz do projeto)
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 3: Verificar Sucesso

Você deve ver a mensagem:
```
Contextual Pricing System migrations applied successfully!
```

### Passo 4: Verificar Tabelas Criadas

Execute este SQL para verificar:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'collection_types',
  'collection_base_pricing',
  'pricing_context_multipliers',
  'pricing_history'
);

-- Verificar dados iniciais em collection_types
SELECT * FROM collection_types ORDER BY sort_order;

-- Verificar dados iniciais em collection_base_pricing
SELECT 
  ct.name,
  ct.display_name,
  cbp.base_price_coins
FROM collection_base_pricing cbp
JOIN collection_types ct ON ct.id = cbp.collection_type_id
ORDER BY ct.sort_order;

-- Verificar dados iniciais em pricing_context_multipliers
SELECT 
  user_context,
  multiplier,
  chosen_collection_discount_percentage,
  description
FROM pricing_context_multipliers
ORDER BY user_context;

-- Verificar que collections agora tem collection_type_id
SELECT 
  c.name,
  ct.display_name as collection_type
FROM collections c
JOIN collection_types ct ON ct.id = c.collection_type_id
LIMIT 5;

-- Verificar que characters agora tem price_multiplier
SELECT 
  name,
  price_multiplier
FROM characters
WHERE price_multiplier IS NOT NULL
LIMIT 5;
```

## 📋 Método 2: Aplicar via Supabase CLI

Se preferir usar o CLI:

```bash
# 1. Garantir que está linkado ao projeto
supabase link --project-ref pabxpvqwtvbjaunjejud

# 2. Aplicar apenas as novas migrations
supabase db push --include-all
```

**Nota**: Este método pode tentar aplicar migrations antigas que já foram aplicadas. Se houver erros, use o Método 1.

## ✅ Resultado Esperado

Após aplicar as migrations, você terá:

### Tabelas Criadas:
- ✅ `collection_types` - 3 tipos iniciais (subscription, standard_catalog, premium_catalog)
- ✅ `collection_base_pricing` - 3 preços base (1000, 1400, 1800 coins)
- ✅ `pricing_context_multipliers` - 3 contextos (chosen, not_chosen, no_subscription)
- ✅ `pricing_history` - Vazia (será populada quando houver mudanças)

### Colunas Adicionadas:
- ✅ `collections.collection_type_id` - Todas as coleções existentes recebem tipo 'subscription'
- ✅ `characters.price_multiplier` - NULL por padrão (usa 1.0 no cálculo)

### RLS Policies:
- ✅ Todos podem ver tipos, preços e multiplicadores ativos
- ✅ Apenas admins podem modificar
- ✅ Apenas admins podem ver histórico

## 🔍 Troubleshooting

### Erro: "relation already exists"
- **Causa**: Tabela já foi criada
- **Solução**: Ignore o erro ou use `CREATE TABLE IF NOT EXISTS`

### Erro: "column already exists"
- **Causa**: Coluna já foi adicionada
- **Solução**: Ignore o erro ou verifique se a coluna existe antes

### Erro: "policy already exists"
- **Causa**: Policy já foi criada
- **Solução**: Ignore o erro ou use blocos DO $$ com verificação

## 📝 Próximos Passos

Após aplicar as migrations com sucesso:

1. ✅ Verificar que todas as tabelas foram criadas
2. ✅ Verificar que dados iniciais foram populados
3. ✅ Verificar que colunas foram adicionadas em collections e characters
4. ➡️ Prosseguir para **Task 3: Funções de Banco de Dados**

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro no SQL Editor
2. Verifique se o usuário tem permissões de admin
3. Verifique se a tabela `user_roles` existe e está populada
4. Execute as queries de verificação acima

---

**Status**: ✅ Migrations criadas e prontas para aplicar
**Próximo**: Task 3 - Criar funções de banco de dados
