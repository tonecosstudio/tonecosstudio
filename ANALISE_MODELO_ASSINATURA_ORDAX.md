# Análise: Modelo de Assinatura Ordax

## 🎯 Pergunta do Usuário

> "A assinatura é do sistema Ordax, não de uma coleção específica. O cliente escolhe uma coleção apenas para definir sua prioridade de seleção. Isso é verdadeiro?"

## ✅ RESPOSTA: **PARCIALMENTE VERDADEIRO** (Modelo Híbrido)

## 📊 Análise Profunda do Código

### 1. Estrutura do Banco de Dados

#### Tabela `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID,  -- ⚠️ NULLABLE (campo legado)
  plan_id UUID,        -- ✅ Referência ao plano
  plan_type TEXT,      -- trimestral, semestral, anual
  status TEXT,
  ...
)
```

**Observação Crítica**:
- `collection_id` é **NULLABLE** (tornado nullable em 2026-02-28)
- Comentário no código: `"DEPRECATED: Campo legado mantido para compatibilidade"`
- `plan_id` é o campo atual que define o plano

#### Tabela `subscription_collections` (N:N)
```sql
CREATE TABLE subscription_collections (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL,
  collection_id UUID NOT NULL,
  added_at TIMESTAMPTZ,
  UNIQUE(subscription_id, collection_id)
)
```

**Comentário no código**:
> "Stores multiple collections per subscription. Trimestral=2, Semestral=3, Anual=all"

### 2. Sistema de Preços Contextuais

#### Função `get_collection_price()`
```sql
-- Verifica se coleção está em subscription_collections
SELECT EXISTS(
  SELECT 1 
  FROM subscription_collections sc
  JOIN subscriptions s ON s.id = sc.subscription_id
  WHERE s.user_id = p_user_id
  AND s.status = 'active'
  AND sc.collection_id = p_collection_id
) INTO v_is_chosen;

IF v_is_chosen THEN
  -- Aplica desconto (coleção escolhida)
  -- Preço: 200 coins
ELSE
  -- Aplica acréscimo (coleção não escolhida)
  -- Preço: 240 coins
END IF;
```

**Lógica Implementada**:
- ✅ Assinatura é do sistema Ordax (não de coleção específica)
- ✅ Cliente pode escolher múltiplas coleções
- ✅ Coleções escolhidas têm preço menor (200 coins)
- ✅ Coleções não escolhidas têm preço maior (240 coins)

### 3. Documentação Encontrada

#### `docs/features/subscription-system.md`
```markdown
## Planos Disponíveis
- Plano Trimestral: 3 personagens
- Plano Semestral: 6 personagens + 1 exclusiva

## Escolha de coleções
- Cliente escolhe coleções prioritárias
- Trocas ilimitadas antes da produção
```

#### Migration `20260228000003_fix_subscriptions_schema.sql`
```sql
COMMENT ON COLUMN subscriptions.collection_id IS 
  'DEPRECATED: Campo legado mantido para compatibilidade. 
   Use subscription_collections para relacionamento N:N 
   entre assinaturas e coleções.';
```

## 🔍 Conclusão da Análise

### ✅ O QUE ESTÁ CORRETO

1. **Assinatura é do Sistema Ordax**
   - ✅ Sim, a assinatura é vinculada a um `plan_id` (plano Ordax)
   - ✅ Não é vinculada a uma coleção específica
   - ✅ Campo `collection_id` é legado e nullable

2. **Cliente Escolhe Coleções para Prioridade**
   - ✅ Sim, através da tabela `subscription_collections`
   - ✅ Pode escolher múltiplas coleções
   - ✅ Coleções escolhidas têm preço preferencial (200 coins)
   - ✅ Coleções não escolhidas têm preço maior (240 coins)

3. **Sistema de Preços Contextuais**
   - ✅ Implementado corretamente
   - ✅ Diferencia coleção escolhida vs não escolhida
   - ✅ Usa `subscription_collections` para determinar escolha

### ⚠️ PONTOS DE ATENÇÃO

1. **Campo Legado `collection_id`**
   - ⚠️ Ainda existe na tabela `subscriptions`
   - ⚠️ Marcado como DEPRECATED
   - ⚠️ Pode causar confusão

2. **Documentação Incompleta**
   - ⚠️ Não há documentação clara sobre "assinatura Ordax vs coleção"
   - ⚠️ Usuários podem não entender que escolhem múltiplas coleções

3. **Nomenclatura Confusa**
   - ⚠️ "Coleção Ativa" pode ser interpretado como "coleção da assinatura"
   - ⚠️ Deveria ser "Coleção Escolhida" ou "Coleção Prioritária"

## 📋 Modelo Atual vs Modelo Ideal

### Modelo Atual (Implementado)
```
Assinatura Ordax
├── Plano (Trimestral/Semestral/Anual)
├── Coleções Escolhidas (N) → Preço: 200 coins
└── Outras Coleções → Preço: 240 coins
```

### Modelo Ideal (Sugerido)
```
Assinatura Ordax
├── Plano (Trimestral/Semestral/Anual)
├── Coleções Prioritárias (N) → Preço: 200 coins
│   └── Definidas pelo cliente
└── Coleções Secundárias → Preço: 240 coins
    └── Todas as outras disponíveis
```

## 🎯 Resposta Final

**SIM, está implementado corretamente!**

A assinatura é do sistema Ordax, não de uma coleção específica. O cliente escolhe coleções para definir sua prioridade de seleção, e isso afeta o preço:

- **Coleções Escolhidas** (prioritárias): 200 coins
- **Coleções Não Escolhidas** (secundárias): 240 coins

### Evidências no Código

1. **Tabela `subscriptions`**:
   - `plan_id` define o plano Ordax
   - `collection_id` é legado e nullable

2. **Tabela `subscription_collections`**:
   - Relacionamento N:N (múltiplas coleções por assinatura)
   - Comentário: "Trimestral=2, Semestral=3, Anual=all"

3. **Função `get_collection_price()`**:
   - Verifica se coleção está em `subscription_collections`
   - Aplica preço diferenciado baseado na escolha

4. **Sistema de Preços**:
   - Coleção Ativa (escolhida): 200 coins
   - Coleção Secundária (não escolhida): 240 coins

## 💡 Recomendações

### 1. Melhorar Nomenclatura
```
ATUAL                    → SUGERIDO
"Coleção Ativa"          → "Coleção Prioritária"
"Coleção Secundária"     → "Coleção Secundária" (OK)
"Coleção escolhida"      → "Coleção Prioritária"
```

### 2. Adicionar Documentação
Criar seção explicando:
- Assinatura é do sistema Ordax
- Cliente escolhe coleções prioritárias
- Preços diferenciados por prioridade

### 3. Remover Campo Legado
```sql
-- Após migração completa, remover:
ALTER TABLE subscriptions DROP COLUMN collection_id;
```

### 4. Atualizar Interface Admin
Adicionar em `/admin/coins`:
- Seção explicando modelo de assinatura
- Diferença entre coleção prioritária e secundária
- Como cliente escolhe coleções

## 📊 Status de Implementação

| Aspecto | Status | Observação |
|---------|--------|------------|
| Assinatura Ordax (não de coleção) | ✅ Implementado | `plan_id` define plano |
| Múltiplas coleções por assinatura | ✅ Implementado | `subscription_collections` |
| Preços diferenciados por escolha | ✅ Implementado | `get_collection_price()` |
| Documentação clara | ⚠️ Incompleta | Falta explicar modelo |
| Nomenclatura consistente | ⚠️ Confusa | "Ativa" vs "Escolhida" |
| Remoção de campos legados | ❌ Pendente | `collection_id` ainda existe |

---

**Data**: 2026-03-06  
**Autor**: Kiro AI Assistant  
**Status**: ✅ ANÁLISE CONCLUÍDA
