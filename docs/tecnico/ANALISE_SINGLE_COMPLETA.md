# Análise Completa de Usos de .single()

## 🔍 Resumo da Busca

**Total encontrado**: 50+ ocorrências de `.single()`
**Locais**: src/pages, src/lib, src/test

---

## 📊 Categorização

### ✅ Seguros (Não Precisam Correção)

#### 1. Testes (src/test/)
- **Arquivos**: `performance.test.ts`, `e2e-integration.test.ts`
- **Motivo**: Testes controlam os dados, sabem que existe exatamente 1 resultado
- **Ação**: Nenhuma

#### 2. INSERT com .select().single()
- **Padrão**: `.insert({...}).select().single()`
- **Motivo**: INSERT sempre retorna exatamente 1 resultado
- **Exemplos**:
  - `src/pages/Support.tsx` linha 201 ✅
  - `src/pages/SubscribeCollection.tsx` linhas 145, 173 ✅
  - `src/pages/QuoteCart.tsx` linha 112 ✅
  - `src/pages/Quote.tsx` linha 112 ✅
  - `src/pages/ProfileSections.tsx` linha 609 ✅
  - `src/pages/PreorderCheckout.tsx` linha 130 ✅
  - `src/pages/BuyCharacter.tsx` linha 336 ✅
- **Ação**: Nenhuma (padrão correto)

---

### ⚠️ Potencialmente Problemáticos

#### 1. SELECT com .eq().single()
**Problema**: Pode não existir resultado ou existir múltiplos

##### 1.1 ProfileSections.tsx linha 402
```typescript
.eq("user_id", userId)
.eq("status", "active")
.single();

if (error && error.code !== "PGRST116") throw error;
```
**Status**: ✅ JÁ TRATADO
**Motivo**: Código verifica PGRST116 (no rows)
**Ação**: Nenhuma

##### 1.2 SubscribeCollection.tsx linha 129
```typescript
.eq("plan_type", planType)
.eq("is_active", true)
.single();

if (planError || !plan) {
  throw new Error("Plano não encontrado");
}
```
**Status**: ⚠️ PODE CAUSAR 406
**Motivo**: Pode não existir plano ativo
**Ação**: Mudar para `.maybeSingle()`

##### 1.3 PreorderTracking.tsx linha 79
```typescript
.eq("id", quoteId)
.single();

if (error) throw error;
```
**Status**: ⚠️ PODE CAUSAR 406
**Motivo**: Quote pode não existir
**Ação**: Mudar para `.maybeSingle()`

##### 1.4 PreorderCheckout.tsx linhas 55, 70
```typescript
// Linha 55
.eq("id", quoteId)
.single();

// Linha 70
.select("*")
.limit(1)
.single();
```
**Status**: ⚠️ PODE CAUSAR 406
**Motivo**: Dados podem não existir
**Ação**: Mudar para `.maybeSingle()`

##### 1.5 PaymentPage.tsx linhas 59, 88
```typescript
// Linha 59
.eq('id', quoteId)
.single();

// Linha 88
.eq('id', subscriptionId)
.single();
```
**Status**: ⚠️ PODE CAUSAR 406
**Motivo**: IDs podem não existir
**Ação**: Mudar para `.maybeSingle()`

##### 1.6 Dashboard.tsx linha 23
```typescript
.eq("id", user!.id)
.single()
```
**Status**: ⚠️ PODE CAUSAR 406
**Motivo**: Profile pode não existir
**Ação**: Mudar para `.maybeSingle()`

##### 1.7 AdminUserDetails.tsx linha 28
```typescript
.eq("id", userId!)
.single();
```
**Status**: ⚠️ PODE CAUSAR 406
**Motivo**: User pode não existir
**Ação**: Mudar para `.maybeSingle()`

##### 1.8 AdminSubscriptions.tsx linha 53
```typescript
.eq('id', sub.user_id)
.single();
```
**Status**: ⚠️ PODE CAUSAR 406
**Motivo**: Profile pode não existir
**Ação**: Mudar para `.maybeSingle()`

##### 1.9 AdminProductionLimit.tsx linha 50
```typescript
.eq("key", "monthly_production_limit")
.single();
```
**Status**: ⚠️ PODE CAUSAR 406
**Motivo**: Config pode não existir
**Ação**: Mudar para `.maybeSingle()`

##### 1.10 AdminPreorders.tsx linha 69
```typescript
.eq('id', quote.user_id)
.single();
```
**Status**: ⚠️ PODE CAUSAR 406
**Motivo**: Profile pode não existir
**Ação**: Mudar para `.maybeSingle()`

---

## 🎯 Plano de Correção

### Prioridade 1 - Páginas de Usuário (Alto Tráfego)
1. ✅ `src/pages/ProfileSections.tsx` linha 402 - JÁ TRATADO
2. 🔴 `src/pages/SubscribeCollection.tsx` linha 129
3. 🔴 `src/pages/PreorderTracking.tsx` linha 79
4. 🔴 `src/pages/PreorderCheckout.tsx` linhas 55, 70
5. 🔴 `src/pages/PaymentPage.tsx` linhas 59, 88
6. 🔴 `src/pages/Dashboard.tsx` linha 23

### Prioridade 2 - Páginas Admin (Médio Tráfego)
7. 🔴 `src/pages/admin/AdminUserDetails.tsx` linha 28
8. 🔴 `src/pages/admin/AdminSubscriptions.tsx` linha 53
9. 🔴 `src/pages/admin/AdminProductionLimit.tsx` linha 50
10. 🔴 `src/pages/admin/AdminPreorders.tsx` linha 69

---

## 📝 Padrão de Correção

### Antes (Problemático)
```typescript
const { data, error } = await supabase
  .from("table")
  .select("*")
  .eq("id", id)
  .single();

if (error) throw error;
```

### Depois (Correto)
```typescript
const { data, error } = await supabase
  .from("table")
  .select("*")
  .eq("id", id)
  .maybeSingle();

if (error) throw error;

if (!data) {
  throw new Error("Registro não encontrado");
}
```

---

## 🔧 Correções a Aplicar

### Total de Correções Necessárias: 10
- Prioridade 1: 6 arquivos
- Prioridade 2: 4 arquivos

### Tempo Estimado: 1-2 horas

---

## ✅ Benefícios

1. **Elimina erros 406** em todo o sistema
2. **Melhora experiência do usuário** (mensagens de erro claras)
3. **Aumenta estabilidade** do sistema
4. **Previne crashes** inesperados
5. **Facilita debugging** (erros mais específicos)

---

## 📊 Impacto Esperado

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Erros 406 | Possíveis | 0 | ✅ 100% |
| Páginas afetadas | 10 | 0 | ✅ 100% |
| Mensagens de erro | Genéricas | Específicas | ✅ 100% |
| Estabilidade | Média | Alta | ✅ +50% |
