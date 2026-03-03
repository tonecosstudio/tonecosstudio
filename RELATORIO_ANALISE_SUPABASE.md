# 📊 Relatório de Análise do Supabase

**Data:** 03/03/2026  
**Status:** Análise Completa Realizada

---

## 📈 Resumo Executivo

### Estatísticas Gerais
- **Total de tabelas no Supabase:** 123 tabelas
- **Total de tabelas públicas (public schema):** 89 tabelas
- **Total de migrações no projeto:** 204 arquivos
- **Total de arquivos SQL:** 364 arquivos
- **Tamanho total do banco:** ~2.5 MB (muito pequeno, maioria vazia)

### ⚠️ Problemas Críticos Identificados

1. **68 tabelas completamente vazias** (0 bytes ou 8KB apenas)
2. **Tabela de backup órfã:** `chat_group_messages_backup` (8KB)
3. **Excesso de arquivos SQL:** 110 scripts utilitários (muitos duplicados)
4. **Migrações não consolidadas:** 204 migrações quando poderia ser ~50

---

## 🔍 Análise Detalhada por Categoria

### 1️⃣ TABELAS COM DADOS (Ativas e em Uso)

#### ✅ Tabelas Principais com Conteúdo Real

| Tabela | Tamanho | Status | Observação |
|--------|---------|--------|------------|
| `support_conversations` | 216 KB | ✅ Ativa | Maior tabela pública |
| `collections` | 184 KB | ✅ Ativa | Core do sistema |
| `user_notifications` | 176 KB | ✅ Ativa | Sistema de notificações |
| `manual_payments` | 160 KB | ✅ Ativa | Pagamentos manuais |
| `collection_characters` | 144 KB | ✅ Ativa | Personagens das coleções |
| `subscriptions` | 144 KB | ✅ Ativa | Assinaturas ativas |
| `subscription_plans` | 136 KB | ✅ Ativa | Planos disponíveis |
| `quick_replies` | 120 KB | ✅ Ativa | Respostas rápidas (24KB dados) |
| `chat_group_members` | 120 KB | ✅ Ativa | Membros dos grupos |
| `chat_group_messages` | 112 KB | ✅ Ativa | Mensagens do chat |
| `chat_groups` | 112 KB | ✅ Ativa | Grupos de chat |
| `holidays` | 112 KB | ✅ Ativa | Feriados cadastrados |
| `images_queue` | 104 KB | ✅ Ativa | Fila de processamento |
| `support_messages` | 104 KB | ✅ Ativa | Mensagens de suporte |
| `system_settings` | 80 KB | ✅ Ativa | Configurações (16KB dados) |

**Total: 15 tabelas com dados reais**

---

### 2️⃣ TABELAS VAZIAS MAS NECESSÁRIAS (Estrutura OK)

Estas tabelas estão vazias mas fazem parte do sistema e serão usadas:

#### 📋 Sistema de Produção
- `character_choices` (88 KB índices, 0 dados)
- `production_queue` (80 KB índices, 0 dados)
- `production_stages` (72 KB índices, 0 dados)

#### 📋 Sistema de Pagamentos
- `quotes` (72 KB índices, 0 dados)
- `standalone_purchases` (56 KB índices, 0 dados)
- `payment_info_requests` (80 KB)

#### 📋 Sistema de Assinaturas
- `subscription_deliveries` (64 KB índices, 0 dados)
- `cycles` (48 KB índices, 0 dados)
- `subscription_collections` (72 KB)

#### 📋 Sistema de Notificações
- `admin_notifications` (64 KB índices, 0 dados)
- `email_notifications` (96 KB)

#### 📋 Gamificação e Bônus
- `bonus_pieces` (48 KB índices, 0 dados)
- `pricing_tiers` (48 KB índices, 0 dados)
- `wishlist` (48 KB índices, 0 dados)

**Total: ~40 tabelas vazias mas necessárias**

---

### 3️⃣ TABELAS SUSPEITAS (Possível Lixo)

#### 🗑️ Backups Órfãos
```sql
-- REMOVER IMEDIATAMENTE
DROP TABLE IF EXISTS public.chat_group_messages_backup;
```
**Motivo:** Backup de 8KB sem uso, provavelmente de teste

#### 🗑️ Tabelas de Sistema Não Usadas
- `ai_vision_cache` (56 KB) - Se não usa AI Vision
- `ai_name_cache` (48 KB) - Se não usa AI para nomes
- `ai_processing_jobs` (40 KB) - Se não usa processamento AI

#### 🗑️ Tabelas de Features Não Implementadas
- `preorders` (40 KB) - Se não tem pré-venda
- `preorder_settings` (32 KB)
- `quote_items` (32 KB) - Se não usa sistema de cotação
- `quote_production` (24 KB)
- `quote_production_updates` (16 KB)
- `quote_production_photos` (16 KB)
- `quote_payments` (40 KB)

#### 🗑️ Tabelas de Landing Page
- `community_suggestions` - Se não tem landing page pública
- `founders_program` - Se não tem programa de fundadores
- `order_migrations` - Parece temporária

---

### 4️⃣ TABELAS DE HISTÓRICO/AUDITORIA (Manter)

Estas são importantes para rastreabilidade:

- `order_status_history` (40 KB)
- `payment_audit_log` (80 KB)
- `collection_choice_history` (40 KB)
- `purchase_mode_history` (40 KB)
- `pricing_history` (56 KB)
- `migration_audit` (32 KB)

**Status:** ✅ Manter todas

---

## 📁 Análise de Arquivos SQL do Projeto

### 🗂️ Distribuição de Arquivos

```
📦 Total: 364 arquivos SQL
├── 📁 Migrações Oficiais: 204 arquivos (supabase/migrations/)
├── 📁 Scripts Utilitários: 110 arquivos (scripts/database/)
│   ├── 🔧 Fixes: 25 arquivos (maioria sobre RLS e erro 406)
│   ├── 🌱 Seeds: 13 arquivos
│   └── 🛠️ Utilities: 72 arquivos
├── 📁 Análises: 3 arquivos
└── 📁 Outros: 37 arquivos (raiz e docs/archive)
```

### 🚨 Problemas Identificados

#### 1. Excesso de Arquivos de Fix
```
scripts/database/fixes/
├── fix-406-agressivo.sql
├── fix-406-com-anon.sql
├── fix-406-error-immediate.sql
├── fix-406-permissive.sql
├── fix-406-rapido.sql
├── fix-complete-406-final.sql
├── fix-nuclear-desabilitar-rls.sql
├── fix-policy-now.sql
├── fix-rls-406-final.sql
├── fix_406_chat_groups.sql
├── fix_406_direto.sql
└── solucao-definitiva-406.sql (12+ arquivos tentando resolver o mesmo problema!)
```

**Ação:** Consolidar em 1 arquivo final que funcionou

#### 2. Arquivos Duplicados na Raiz
```
Raiz do projeto:
├── add_manual_payment_to_queue.sql
├── APPLY_ALL_PRODUCTION_MIGRATIONS.sql
├── check_and_fix_rls.sql
├── FIX_NOW.sql
├── FIX_STANDALONE_PURCHASES.sql
├── populate_production_queue_manually.sql
└── temp_fix_relationships.sql
```

**Ação:** Mover para `scripts/archive/` ou deletar

#### 3. Arquivos de Verificação Redundantes
```
scripts/database/utilities/
├── verificar-*.sql (15+ arquivos)
├── VERIFICAR_*.sql (5+ arquivos)
├── diagnostico-*.sql (8+ arquivos)
└── test-*.sql (6+ arquivos)
```

**Ação:** Consolidar em 3-4 scripts principais

---

## 🎯 Plano de Ação Recomendado

### FASE 1: Limpeza Imediata (Sem Risco)

#### 1.1 Remover Backup Órfão
```sql
-- Execute no Supabase Dashboard
DROP TABLE IF EXISTS public.chat_group_messages_backup;
```

#### 1.2 Organizar Arquivos do Projeto
```bash
# Criar pasta de arquivo
mkdir -p scripts/archive/fixes-406
mkdir -p scripts/archive/temp-fixes

# Mover arquivos de fix antigos
mv scripts/database/fixes/fix-406-*.sql scripts/archive/fixes-406/
mv scripts/database/fixes/solucao-*.sql scripts/archive/fixes-406/

# Mover arquivos temporários da raiz
mv add_manual_payment_to_queue.sql scripts/archive/temp-fixes/
mv temp_fix_relationships.sql scripts/archive/temp-fixes/
mv FIX_NOW.sql scripts/archive/temp-fixes/
```

### FASE 2: Análise de Features Não Usadas

Responda estas perguntas:

- [ ] Você usa sistema de AI Vision? → Se NÃO, remover `ai_vision_cache`, `ai_name_cache`, `ai_processing_jobs`
- [ ] Você tem sistema de pré-venda? → Se NÃO, remover `preorders`, `preorder_settings`
- [ ] Você usa sistema de cotação (quotes)? → Se NÃO, remover `quotes`, `quote_*` (6 tabelas)
- [ ] Você tem landing page pública? → Se NÃO, remover `community_suggestions`, `founders_program`
- [ ] Você usa modelo de likes? → Se NÃO, remover `model_likes`

### FASE 3: Consolidação de Migrações

**Problema:** 204 migrações é muito! Dificulta manutenção.

**Solução:** Criar migrações consolidadas:

```
supabase/migrations/
├── 00000000000000_consolidated_base_schema.sql (todas até fev/2026)
├── 20260301000000_premium_club_system.sql (já consolidado)
├── 20260428000000_production_system.sql (já consolidado)
└── [migrações futuras individuais]
```

### FASE 4: Documentação

Criar/atualizar:
- [ ] `docs/DATABASE_SCHEMA.md` - Esquema atual documentado
- [ ] `docs/MIGRATIONS_GUIDE.md` - Como aplicar migrações
- [ ] `docs/CLEANUP_LOG.md` - Log do que foi removido e por quê

---

## 📋 Scripts de Limpeza Prontos

### Script 1: Remover Tabelas de Features Não Usadas

```sql
-- ⚠️ EXECUTE APENAS SE TIVER CERTEZA QUE NÃO USA ESTAS FEATURES

-- Sistema de AI (se não usa)
DROP TABLE IF EXISTS public.ai_vision_cache CASCADE;
DROP TABLE IF EXISTS public.ai_name_cache CASCADE;
DROP TABLE IF EXISTS public.ai_processing_jobs CASCADE;

-- Sistema de Pré-venda (se não usa)
DROP TABLE IF EXISTS public.preorders CASCADE;
DROP TABLE IF EXISTS public.preorder_settings CASCADE;

-- Sistema de Cotação (se não usa)
DROP TABLE IF EXISTS public.quote_production_photos CASCADE;
DROP TABLE IF EXISTS public.quote_production_updates CASCADE;
DROP TABLE IF EXISTS public.quote_production CASCADE;
DROP TABLE IF EXISTS public.quote_items CASCADE;
DROP TABLE IF EXISTS public.quote_payments CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;

-- Landing Page (se não tem)
DROP TABLE IF EXISTS public.community_suggestions CASCADE;
DROP TABLE IF EXISTS public.founders_program CASCADE;
DROP TABLE IF EXISTS public.order_migrations CASCADE;

-- Backup órfão
DROP TABLE IF EXISTS public.chat_group_messages_backup CASCADE;
```

### Script 2: Verificar Tabelas Realmente Vazias

```sql
-- Lista tabelas vazias que podem ser removidas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    (SELECT count(*) FROM information_schema.tables t 
     WHERE t.table_schema = pg_tables.schemaname 
     AND t.table_name = pg_tables.tablename) as row_count
FROM pg_tables
WHERE schemaname = 'public'
    AND pg_total_relation_size(schemaname||'.'||tablename) < 100000 -- Menos de 100KB
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## ✅ Checklist de Execução

### Antes de Começar
- [x] Análise completa realizada
- [ ] Backup do banco criado
- [ ] Backup dos arquivos do projeto (Git commit)
- [ ] Ambiente de teste disponível (se possível)

### Limpeza de Arquivos
- [ ] Criar pasta `scripts/archive/`
- [ ] Mover arquivos de fix antigos
- [ ] Mover arquivos temporários da raiz
- [ ] Consolidar scripts de verificação
- [ ] Atualizar README com nova estrutura

### Limpeza do Banco
- [ ] Identificar features não usadas
- [ ] Remover tabela de backup órfã
- [ ] Remover tabelas de features não usadas
- [ ] Verificar se nada quebrou

### Documentação
- [ ] Criar `DATABASE_SCHEMA.md`
- [ ] Criar `MIGRATIONS_GUIDE.md`
- [ ] Criar `CLEANUP_LOG.md`
- [ ] Atualizar README principal

### Validação Final
- [ ] Aplicação funciona normalmente
- [ ] Testes passam
- [ ] Deploy em staging OK
- [ ] Commit final com limpeza

---

## 💡 Recomendações Futuras

1. **Política de Migrações:**
   - Máximo 1 migração por feature
   - Consolidar a cada 6 meses
   - Nomear claramente: `YYYYMMDD_feature_name.sql`

2. **Política de Scripts:**
   - Manter apenas scripts ativos em `scripts/`
   - Arquivar scripts antigos após 30 dias
   - Documentar scripts complexos

3. **Política de Tabelas:**
   - Revisar tabelas vazias a cada trimestre
   - Remover features não usadas após 60 dias
   - Manter histórico/auditoria sempre

4. **Monitoramento:**
   - Configurar alertas de tamanho do banco
   - Monitorar tabelas que crescem rápido
   - Revisar índices não utilizados

---

## 📊 Resultado Esperado

### Antes da Limpeza
- 123 tabelas (68 vazias)
- 364 arquivos SQL
- Estrutura confusa
- Difícil manutenção

### Depois da Limpeza
- ~100 tabelas (apenas necessárias)
- ~150 arquivos SQL (organizados)
- Estrutura clara
- Fácil manutenção
- Documentação completa

---

**Status:** 🟡 Aguardando aprovação para executar limpeza

**Próximo Passo:** Revisar este relatório e decidir quais tabelas/arquivos remover
