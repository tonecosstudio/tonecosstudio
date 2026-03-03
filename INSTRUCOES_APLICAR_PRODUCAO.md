# Instruções para Aplicar Sistema de Produção

## Problema Identificado

O dashboard de produção não mostra dados porque:
1. As migrations de produção não foram aplicadas no banco remoto
2. A tabela `production_queue` está vazia (não foi populada com pedidos já aprovados)

## Solução em 3 Passos

### Passo 1: Verificar Estado Atual

Abra o **SQL Editor** no Supabase Dashboard e execute:

```sql
-- Cole o conteúdo do arquivo: apply_production_migrations.sql
```

Este script vai mostrar:
- ✓ Quais objetos já existem
- ✗ Quais objetos estão faltando
- Quantos pedidos aprovados existem
- Se a production_queue está vazia

### Passo 2: Aplicar Migrations (se necessário)

Se o Passo 1 mostrar que objetos estão faltando, você tem 2 opções:

#### Opção A: Via CLI (Recomendado)

```bash
# No terminal do projeto
npx supabase db push --include-all
```

Quando perguntar se quer aplicar as migrations, digite `y` e pressione Enter.

**Nota:** Se der erro de "duplicate key", as migrations já foram aplicadas parcialmente. Pule para o Passo 3.

#### Opção B: Via SQL Editor (Manual)

Execute os arquivos SQL na ordem no SQL Editor do Supabase:

1. `supabase/migrations/20260428000000_create_production_queue.sql`
2. `supabase/migrations/20260428000001_create_character_choices.sql`
3. `supabase/migrations/20260428000002_create_production_stages.sql`
4. `supabase/migrations/20260428000003_create_production_views.sql`
5. `supabase/migrations/20260428000004_create_production_functions.sql`

### Passo 3: Popular Fila de Produção

Abra o **SQL Editor** no Supabase Dashboard e execute:

```sql
-- Cole o conteúdo do arquivo: populate_production_queue_manually.sql
```

Este script vai:
- Buscar todos os pedidos aprovados (subscription_deliveries com status='confirmed' e standalone_purchases com status='balance_paid')
- Inserir na production_queue
- Criar character_choices quando necessário
- Mostrar um resumo do que foi feito

### Passo 4: Verificar Dashboard

Após executar o Passo 3:

1. Volte para o dashboard de produção no site: `/admin/producao`
2. Recarregue a página (F5)
3. Você deve ver:
   - Métricas no topo (contadores por estágio)
   - Alertas urgentes (se houver)
   - Itens no Kanban/Lista/Calendário

## Arquivos Criados

- `apply_production_migrations.sql` - Verifica estado atual
- `populate_production_queue_manually.sql` - Popula fila com pedidos existentes
- `test_production_objects.sql` - Testa se objetos funcionam
- `seed_production_test_data.sql` - Informações sobre dados de teste

## Troubleshooting

### "production_queue table does not exist"
Execute o Passo 2 para aplicar as migrations.

### "Nenhum registro novo foi inserido"
Verifique se você realmente tem pedidos aprovados:
- subscription_deliveries com status='confirmed'
- standalone_purchases com status='balance_paid'

### Dashboard ainda vazio após Passo 3
1. Abra o Console do navegador (F12)
2. Vá para a aba Network
3. Recarregue a página
4. Procure por erros nas requisições
5. Compartilhe os erros encontrados

### Erro "duplicate key" ao aplicar migrations
Algumas migrations já foram aplicadas. Execute apenas o Passo 3 para popular a fila.

## Próximos Passos

Após aplicar com sucesso:
- Novos pedidos aprovados serão automaticamente adicionados à fila (via triggers)
- O dashboard será atualizado em tempo real
- Você pode continuar com a task 3.1.4 (Deadline management)
