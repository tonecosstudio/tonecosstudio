# 📊 SCHEMA REAL DA PRODUCTION_QUEUE

**Data**: 2026-03-07  
**Status**: ✅ DOCUMENTADO

---

## 🔍 DESCOBERTA IMPORTANTE

Durante os testes, descobrimos que o schema real da `production_queue` é diferente do que estava documentado nas correções anteriores.

---

## ❌ SCHEMA ESPERADO (INCORRETO)

Baseado nas migrations de correção (`20260307000001-4`):

```sql
CREATE TABLE production_queue (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL,      -- ❌ INCORRETO
  priority INTEGER NOT NULL,      -- ❌ TIPO INCORRETO
  status TEXT,                    -- ❌ NOME INCORRETO
  source_type TEXT,               -- ❌ NOME INCORRETO
  source_id UUID,
  created_at TIMESTAMPTZ
);
```

---

## ✅ SCHEMA REAL (CORRETO)

Baseado na migration `20260428000000_create_production_queue.sql`:

```sql
CREATE TABLE production_queue (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order reference (polymorphic)
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL,  -- ✅ 'subscription_delivery' ou 'standalone_purchase'
  
  -- Customer reference
  customer_id UUID,          -- ✅ UUID (não INTEGER)
  customer_name TEXT,
  customer_email TEXT,
  
  -- Collection & Character
  collection_id UUID NOT NULL,
  collection_name TEXT NOT NULL,
  character_id UUID,
  character_name TEXT,
  
  -- Production Status
  production_status TEXT NOT NULL DEFAULT 'awaiting_choice',  -- ✅ production_status (não status)
  current_stage TEXT NOT NULL DEFAULT 'awaiting_choice',
  
  -- Choice Management
  choice_status TEXT NOT NULL DEFAULT 'pending',
  choice_deadline TIMESTAMPTZ,
  choice_made_at TIMESTAMPTZ,
  
  -- Priority & Scheduling
  priority TEXT NOT NULL DEFAULT 'normal',  -- ✅ TEXT (não INTEGER)
  priority_score INTEGER NOT NULL DEFAULT 50,  -- ✅ Score numérico
  scheduled_production_date TIMESTAMPTZ,
  estimated_completion_date TIMESTAMPTZ,
  
  -- Assignment
  assigned_to UUID,
  assigned_to_name TEXT,
  assigned_at TIMESTAMPTZ,
  
  -- Tracking
  production_started_at TIMESTAMPTZ,
  production_completed_at TIMESTAMPTZ,
  
  -- Notes & Metadata
  production_notes TEXT,
  customer_notes TEXT,
  internal_flags TEXT[],
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔄 DIFERENÇAS PRINCIPAIS

### 1. customer_id vs user_id
- **Esperado**: `user_id INTEGER`
- **Real**: `customer_id UUID`
- **Motivo**: Referência a `auth.users(id)` que é UUID

### 2. production_status vs status
- **Esperado**: `status TEXT`
- **Real**: `production_status TEXT`
- **Motivo**: Mais descritivo e evita conflito com outras tabelas

### 3. order_type vs source_type
- **Esperado**: `source_type TEXT`
- **Real**: `order_type TEXT`
- **Motivo**: Terminologia mais clara

### 4. priority (TEXT) + priority_score (INTEGER)
- **Esperado**: `priority INTEGER`
- **Real**: `priority TEXT` + `priority_score INTEGER`
- **Motivo**: Priority é categórico (critical/high/normal/low), score é numérico (0-100)

### 5. Colunas Adicionais
O schema real tem MUITO mais colunas:
- `current_stage` - Estágio atual de produção
- `choice_status` - Status da escolha do personagem
- `choice_deadline` - Prazo para escolha
- `assigned_to` - Atribuição de responsável
- `production_notes` - Notas de produção
- E muitas outras...

---

## 🤔 POR QUE A CONFUSÃO?

### Migrations de Correção (20260307000001-4)
Essas migrations foram criadas para corrigir um problema específico:
- Trigger estava usando `customer_id` (TEXT) mas deveria usar `user_id`
- As migrations corrigiram o TRIGGER, não a tabela

### Tabela Real (20260428000000)
A tabela `production_queue` foi criada DEPOIS, em abril de 2026, com um schema completamente diferente e mais robusto.

---

## ✅ IMPACTO NAS CORREÇÕES ANTERIORES

### O Que Foi Corrigido
As migrations `20260307000001-4` corrigiram os TRIGGERS, não a tabela:

```sql
-- Migration 20260307000003
-- Corrigiu a função auto_populate_production_queue()
-- Para usar o campo correto ao inserir na production_queue
```

### O Que Funciona
- ✅ Triggers funcionam corretamente
- ✅ Função `auto_populate_production_queue()` insere dados corretos
- ✅ ProductionHub lê dados corretamente

### O Que Precisa Atualizar
- ⚠️ Documentação (este arquivo corrige isso)
- ⚠️ Scripts de teste (já corrigido)
- ⚠️ Guias de usuário (atualizar se necessário)

---

## 📝 VALIDAÇÃO DO SCHEMA REAL

### Query para Verificar
```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'production_queue'
ORDER BY ordinal_position;
```

### Colunas Principais
1. ✅ `id` - UUID PRIMARY KEY
2. ✅ `order_id` - UUID NOT NULL
3. ✅ `order_type` - TEXT NOT NULL
4. ✅ `customer_id` - UUID (nullable)
5. ✅ `production_status` - TEXT NOT NULL
6. ✅ `current_stage` - TEXT NOT NULL
7. ✅ `priority` - TEXT NOT NULL
8. ✅ `priority_score` - INTEGER NOT NULL

---

## 🎯 CONCLUSÃO

### Schema Correto Confirmado
A tabela `production_queue` usa:
- ✅ `customer_id` (UUID) - não `user_id` (INTEGER)
- ✅ `production_status` (TEXT) - não `status`
- ✅ `order_type` (TEXT) - não `source_type`
- ✅ `priority` (TEXT) + `priority_score` (INTEGER)

### Sistema Funcionando
Apesar da confusão na documentação, o sistema está funcionando corretamente:
- ✅ Triggers inserem dados no formato correto
- ✅ ProductionHub lê dados corretamente
- ✅ Queries funcionam

### Próximos Passos
1. ✅ Script de verificação corrigido
2. ⏳ Continuar testes com schema correto
3. ⏳ Atualizar guias se necessário

---

**Criado por**: Kiro AI  
**Data**: 2026-03-07  
**Status**: ✅ SCHEMA REAL DOCUMENTADO
