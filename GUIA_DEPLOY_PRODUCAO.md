# Guia de Deploy para Produção - Sistema de Preços Contextuais

**Data**: 2026-03-05
**Sistema**: Sistema de Preços Contextuais
**Status**: ✅ Pronto para Deploy

---

## 📋 Pré-requisitos

Antes de fazer o deploy, verifique:

- [ ] Todas as migrations aplicadas no banco de desenvolvimento
- [ ] Código testado localmente
- [ ] Tipos TypeScript sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Acesso ao Supabase Production
- [ ] Acesso ao Vercel (ou plataforma de deploy)

---

## 🗄️ Parte 1: Deploy do Banco de Dados (Supabase)

### Passo 1.1: Verificar Migrations Locais

```bash
# Listar migrations aplicadas localmente
npx supabase migration list
```

Você deve ver estas 12 migrations do sistema de preços contextuais:
- `20260511000000_create_collection_types.sql`
- `20260511000001_create_collection_base_pricing.sql`
- `20260511000002_create_pricing_context_multipliers.sql`
- `20260511000003_create_pricing_history.sql`
- `20260511000004_alter_collections_add_type.sql`
- `20260511000006_create_get_collection_price_function.sql`
- `20260511000007_fix_get_collection_price_function.sql`
- `20260511000008_create_validate_collection_limit_function.sql`
- `20260511000009_create_update_base_price_with_history_function.sql`
- `20260511000010_create_update_multiplier_with_history_function.sql`
- `20260511000011_create_update_chosen_discount_with_history_function.sql`
- `20260511000012_create_contextual_pricing_rls_policies.sql`

### Passo 1.2: Conectar ao Projeto de Produção

```bash
# Se ainda não estiver conectado ao projeto de produção
npx supabase link --project-ref SEU_PROJECT_REF_PRODUCAO
```

### Passo 1.3: Aplicar Migrations em Produção

**IMPORTANTE**: Faça backup do banco antes!

```bash
# Aplicar todas as migrations pendentes
npx supabase db push
```

### Passo 1.4: Verificar Aplicação

```bash
# Verificar status das migrations
npx supabase migration list

# Verificar tabelas criadas
npx supabase db diff
```

### Passo 1.5: Popular Dados Iniciais (se necessário)

Se as tabelas estiverem vazias, você precisa popular os dados iniciais:

```sql
-- Execute no SQL Editor do Supabase Production

-- 1. Verificar se collection_types tem dados
SELECT * FROM collection_types;

-- 2. Se vazio, popular (já deve estar nas migrations, mas verificar)
-- Os dados iniciais já estão na migration 20260511000000

-- 3. Verificar collection_base_pricing
SELECT * FROM collection_base_pricing;

-- 4. Verificar pricing_context_multipliers
SELECT * FROM pricing_context_multipliers;
```

---

## 🚀 Parte 2: Deploy do Frontend (Vercel)

### Passo 2.1: Verificar Build Local

```bash
# Testar build localmente
npm run build

# Verificar se não há erros de TypeScript
npm run type-check
```

### Passo 2.2: Commit e Push

```bash
# Adicionar arquivos
git add .

# Commit com mensagem descritiva
git commit -m "feat: Sistema de Preços Contextuais completo

- 4 tabelas de banco de dados
- 5 funções SQL otimizadas
- 10 RLS policies
- 4 hooks React com cache
- 4 componentes admin
- Integração completa no frontend
- Tipos TypeScript completos
- Limpeza de código legado"

# Push para o repositório
git push origin main
```

### Passo 2.3: Deploy Automático no Vercel

O Vercel deve fazer deploy automaticamente após o push. Acompanhe em:
- https://vercel.com/seu-projeto/deployments

### Passo 2.4: Verificar Variáveis de Ambiente

No painel do Vercel, verifique se estas variáveis estão configuradas:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

---

## ✅ Parte 3: Validação Pós-Deploy

### Passo 3.1: Verificar Banco de Dados

Acesse o Supabase Dashboard e verifique:

1. **Tabelas criadas**:
   - [ ] `collection_types` (3 registros)
   - [ ] `collection_base_pricing` (3 registros)
   - [ ] `pricing_context_multipliers` (3 registros)
   - [ ] `contextual_pricing_history` (vazia inicialmente)

2. **Funções criadas**:
   - [ ] `get_collection_price()`
   - [ ] `validate_collection_limit()`
   - [ ] `update_base_price_with_history()`
   - [ ] `update_multiplier_with_history()`
   - [ ] `update_chosen_discount_with_history()`

3. **RLS Policies ativas**:
   - [ ] 10 policies criadas e ativas

### Passo 3.2: Testar Interface Admin

1. Acesse: `https://seu-dominio.com/admin/plans`
2. Clique na aba "Preços Contextuais"
3. Verifique:
   - [ ] Aba "Preços Base" carrega
   - [ ] Aba "Multiplicadores" carrega
   - [ ] Aba "Preview" mostra cálculos
   - [ ] Consegue editar preços
   - [ ] Consegue salvar alterações

### Passo 3.3: Testar Frontend Usuário

1. Acesse o catálogo de personagens
2. Verifique:
   - [ ] Preços aparecem em COINS (🪙)
   - [ ] Badges contextuais aparecem
   - [ ] Tooltips funcionam
   - [ ] Visual hierarchy está correta
   - [ ] Loading states funcionam

### Passo 3.4: Testar Cálculos de Preço

Execute alguns testes manuais:

```sql
-- No SQL Editor do Supabase Production

-- Teste 1: Preço para não assinante
SELECT get_collection_price(
  'id-de-uma-colecao'::uuid,
  NULL::uuid
);
-- Deve retornar: 1200 (base 1000 × 1.2)

-- Teste 2: Preço para assinante com coleção escolhida
SELECT get_collection_price(
  'id-de-colecao-escolhida'::uuid,
  'id-do-usuario'::uuid
);
-- Deve retornar: 800 (base 1000 - 20%)

-- Teste 3: Validar limite de coleções
SELECT validate_collection_limit('id-do-usuario'::uuid);
-- Deve retornar JSON com informações de limite
```

---

## 🔍 Parte 4: Monitoramento

### Métricas para Acompanhar

1. **Performance**:
   - Cache hit rate (esperado > 80%)
   - Tempo de resposta (esperado < 100ms)
   - Queries por segundo

2. **Erros**:
   - Erros de cálculo de preço
   - Erros de validação de limite
   - Erros de RLS

3. **Uso**:
   - Quantas vezes preços são calculados
   - Quantas vezes admins editam preços
   - Quantas mudanças no histórico

### Logs para Monitorar

No Supabase Dashboard > Logs:
- Queries lentas
- Erros de RLS
- Chamadas de função

No Vercel Dashboard > Logs:
- Erros de frontend
- Performance issues
- Build errors

---

## 🐛 Troubleshooting

### Problema: Migrations não aplicam

**Solução**:
```bash
# Verificar status
npx supabase migration list

# Reparar se necessário
npx supabase migration repair --status reverted TIMESTAMP

# Tentar novamente
npx supabase db push
```

### Problema: Preços não aparecem

**Verificar**:
1. Dados iniciais foram populados?
2. RLS policies estão ativas?
3. Funções foram criadas corretamente?

**Solução**:
```sql
-- Verificar dados
SELECT * FROM collection_types;
SELECT * FROM collection_base_pricing;
SELECT * FROM pricing_context_multipliers;

-- Verificar funções
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%collection%';
```

### Problema: Erro de permissão

**Verificar**:
1. RLS policies estão corretas?
2. Usuário tem role correto?

**Solução**:
```sql
-- Verificar policies
SELECT * FROM pg_policies 
WHERE tablename IN (
  'collection_base_pricing',
  'pricing_context_multipliers',
  'contextual_pricing_history'
);
```

### Problema: Cache não funciona

**Verificar**:
1. CACHE_CONFIG está correto nos hooks?
2. Invalidação está funcionando?

**Solução**:
- Verificar `src/types/contextual-pricing.ts`
- Verificar hooks em `src/hooks/`
- Limpar cache do navegador

---

## 📊 Checklist Final de Deploy

### Banco de Dados
- [ ] Migrations aplicadas em produção
- [ ] Tabelas criadas e populadas
- [ ] Funções SQL criadas
- [ ] RLS Policies ativas
- [ ] Dados iniciais verificados

### Frontend
- [ ] Build sem erros
- [ ] Tipos TypeScript válidos
- [ ] Deploy no Vercel concluído
- [ ] Variáveis de ambiente configuradas

### Testes
- [ ] Interface admin funciona
- [ ] Cálculos de preço corretos
- [ ] Badges e tooltips aparecem
- [ ] Validação de limites funciona
- [ ] Cache funcionando

### Documentação
- [ ] Guia de uso para admins
- [ ] Documentação técnica atualizada
- [ ] Changelog atualizado

### Monitoramento
- [ ] Logs configurados
- [ ] Métricas sendo coletadas
- [ ] Alertas configurados (opcional)

---

## 🎉 Deploy Concluído!

Quando todos os itens acima estiverem ✅, o sistema está em produção!

### Próximos Passos

1. **Monitorar por 24-48h**:
   - Verificar logs de erro
   - Acompanhar performance
   - Coletar feedback de usuários

2. **Ajustes se necessário**:
   - Otimizar queries lentas
   - Ajustar cache strategy
   - Corrigir bugs encontrados

3. **Documentar aprendizados**:
   - O que funcionou bem
   - O que pode melhorar
   - Lições para próximos deploys

---

## 📞 Suporte

**Documentação de Referência**:
- `RESUMO_FINAL_CONTEXTUAL_PRICING.md` - Visão geral completa
- `ENTREGA_SISTEMA_PRECOS_CONTEXTUAIS.md` - Guia de uso
- `PROGRESSO_CONTEXTUAL_PRICING.md` - Histórico de desenvolvimento

**Comandos Úteis**:
```bash
# Verificar migrations
npx supabase migration list

# Aplicar migrations
npx supabase db push

# Gerar tipos
npx supabase gen types typescript --linked

# Build local
npm run build

# Deploy manual (se necessário)
vercel --prod
```

---

**Status**: ✅ Guia Completo
**Tempo Estimado**: 30-60 minutos
**Complexidade**: Média
**Risco**: Baixo (sistema testado)

**Boa sorte com o deploy! 🚀**

