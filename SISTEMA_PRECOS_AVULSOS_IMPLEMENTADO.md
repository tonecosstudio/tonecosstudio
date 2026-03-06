# Sistema de Preços Avulsos (em R$) - IMPLEMENTADO

## 📋 Resumo

Sistema completo de preços em REAIS (R$) para compras avulsas de personagens, aplicado via CLI.

## ✨ O Que Foi Implementado

### 1. Tabela no Banco de Dados
**Tabela**: `character_standalone_pricing`

**Campos**:
- `character_type`: 'standard' ou 'premium'
- `price_full`: Preço cheio em R$ (ex: 500.00)
- `price_pix`: Preço com desconto PIX (ex: 475.00)
- `pix_discount_percentage`: Percentual de desconto PIX (padrão: 5%)
- `description`: Descrição do tipo
- `is_active`: Ativo/Inativo

**Valores Padrão**:
- Personagem Padrão: R$ 500 (PIX: R$ 475)
- Personagem Premium: R$ 900 (PIX: R$ 855)

### 2. Funções SQL

**`get_character_standalone_price(character_id, payment_method)`**:
- Retorna preço em R$ para um personagem
- Determina automaticamente se é standard ou premium
- Parâmetros: 'full' (cheio) ou 'pix' (com desconto)

**`calculate_character_pix_price()`**:
- Trigger que calcula price_pix automaticamente
- Baseado em price_full e pix_discount_percentage

### 3. Interface Admin
**Localização**: `/admin/coins` → Aba "Preços Avulsos"

**Funcionalidades**:
- ✅ Editar preço padrão (R$)
- ✅ Editar preço premium (R$)
- ✅ Editar desconto PIX (%)
- ✅ Previsão em tempo real (cheio e PIX)
- ✅ Validações (hierarquia, valores mínimos)
- ✅ Toast notifications

## 📊 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│ BANCO DE DADOS                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ character_standalone_pricing                            │ │
│ │ - standard: R$ 500 (PIX: R$ 475)                        │ │
│ │ - premium:  R$ 900 (PIX: R$ 855)                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ADMIN INTERFACE                                             │
│ /admin/coins → Aba "Preços Avulsos"                        │
│ - EditStandalonePricingForm                                 │
│ - Edição de preços em R$                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Uso)                                              │
│ - Cards de personagens no catálogo                          │
│ - Página de detalhes do personagem                          │
│ - Compras avulsas (não assinantes)                          │
│ - Cálculo de cancelamento                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Onde os Preços São Usados

1. **Cards de Personagens no Catálogo**
   - Mostrar "R$ 500" para personagens padrão
   - Mostrar "R$ 900" para personagens premium
   - Mostrar "R$ 475 no PIX" (com desconto)

2. **Compras Avulsas**
   - Clientes não assinantes pagam em R$
   - Preço baseado no tipo do personagem

3. **Cálculo de Cancelamento**
   - Ao cancelar assinatura, calcular valor devido
   - Baseado nos personagens já recebidos

4. **Página de Detalhes**
   - Exibir preço avulso do personagem
   - Comparar com preço em coins (assinantes)

## 📁 Arquivos Criados/Modificados

### Backend
1. **`supabase/migrations/20260306160228_add_character_standalone_pricing.sql`**
   - Tabela `character_standalone_pricing`
   - Função `get_character_standalone_price()`
   - Função `calculate_character_pix_price()`
   - RLS policies
   - Valores padrão

### Frontend
2. **`src/components/admin/EditStandalonePricingForm.tsx`** (NOVO)
   - Formulário de edição
   - Validações
   - Previsão em tempo real
   - Toast notifications

3. **`src/pages/admin/AdminCoinsSystem.tsx`** (MODIFICADO)
   - Nova aba "Preços Avulsos"
   - Import do componente
   - TabsList: 6 → 7 colunas

## 🚀 Como Usar

### Admin - Editar Preços
1. Acessar `/admin/coins`
2. Clicar na aba "Preços Avulsos"
3. Editar valores:
   - Preço Padrão (R$)
   - Preço Premium (R$)
   - Desconto PIX (%)
4. Clicar em "Salvar Preços Avulsos"
5. Aguardar confirmação

### Frontend - Exibir Preços
```typescript
// Buscar preço de um personagem
const { data } = await supabase
  .rpc('get_character_standalone_price', {
    p_character_id: characterId,
    p_payment_method: 'full' // ou 'pix'
  });

// Resultado: 500.00 (standard) ou 900.00 (premium)
```

## 🔍 Lógica de Determinação de Tipo

**Como o sistema determina se um personagem é standard ou premium?**

Baseado no campo `price_multiplier` da tabela `collection_characters`:
- `price_multiplier >= 1.5` → Premium
- `price_multiplier < 1.5` ou `NULL` → Standard

**Exemplo**:
```sql
-- Personagem com price_multiplier = 2.0
SELECT get_character_standalone_price(character_id, 'full');
-- Retorna: 900.00 (premium)

-- Personagem com price_multiplier = 1.0
SELECT get_character_standalone_price(character_id, 'full');
-- Retorna: 500.00 (standard)
```

## ✅ Status Final

**SISTEMA IMPLEMENTADO COM SUCESSO**

- ✅ Tabela criada no banco
- ✅ Funções SQL implementadas
- ✅ Interface admin criada
- ✅ Aba adicionada em /admin/coins
- ✅ Validações implementadas
- ✅ RLS policies aplicadas
- ✅ Migration aplicada via CLI
- ✅ Valores padrão configurados

---

**Data**: 2026-03-06  
**Autor**: Kiro AI Assistant  
**Status**: ✅ CONCLUÍDO  
**Aplicado via**: CLI (supabase db push)
