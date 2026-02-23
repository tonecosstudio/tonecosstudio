# 🚀 Aplicar Migration de Quotes

## ⚠️ IMPORTANTE

A migration para criar as tabelas de quotes foi criada mas precisa ser aplicada no banco de dados.

## Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse o SQL Editor do Supabase:
   ```
   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
   ```

2. Cole o conteúdo do arquivo:
   ```
   supabase/migrations/20260130235223_create_quotes_system.sql
   ```

3. Clique em **Run** para executar

4. Verifique se as tabelas foram criadas:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('quotes', 'quote_items');
   ```

## Opção 2: Via CLI (requer Docker Desktop rodando)

```bash
# Inicie o Docker Desktop primeiro

# Depois execute:
supabase db push
```

## Verificar se funcionou

Após aplicar a migration, teste acessando:

1. **Página de Orçamento**: http://localhost:5173/orcamento
2. **Carrinho**: http://localhost:5173/orcamento/carrinho
3. **Admin - Orçamentos**: http://localhost:5173/admin/orcamentos

## O que a migration cria

### Tabela `quotes`
- Armazena os pedidos de orçamento
- Campos: id, user_id, status, deadline, notes, timestamps

### Tabela `quote_items`
- Armazena os itens de cada orçamento
- Campos: id, quote_id, model_id, quantity, scale

### Políticas RLS
- Usuários podem ver/criar/editar seus próprios orçamentos
- Admins podem ver e editar todos os orçamentos

### Índices
- Otimizações para queries por user_id, status, created_at

## Próximos passos após aplicar

1. ✅ Testar criação de orçamento
2. ✅ Testar visualização no admin
3. ✅ Testar mudança de status
4. ✅ Deploy da migration para produção

## Troubleshooting

### Erro: "relation quotes does not exist"
- A migration ainda não foi aplicada
- Siga a Opção 1 acima

### Erro: "permission denied"
- Verifique se está usando o service_role_key nas Edge Functions
- Verifique as políticas RLS

### Erro ao fazer push
- Certifique-se que o Docker Desktop está rodando
- Execute: `supabase start` antes de `supabase db push`
