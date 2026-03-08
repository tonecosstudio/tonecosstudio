# Fix: Filtros da Página de Pedidos

## 🐛 Problema Relatado

A página `/admin/pedidos` não estava mostrando assinaturas.

## 🔍 Causa Raiz

O hook `useOrderFilters` tinha dois problemas no parse de URL params:

### 1. Tipos Faltando
O parse só aceitava 2 tipos:
```tsx
// ANTES - Incompleto
if (type === 'subscription_delivery' || type === 'standalone_purchase') {
  filters.type = type;
}
```

Mas o sistema suporta 5 tipos:
- `'all'`
- `'subscription_delivery'`
- `'standalone_purchase'`
- `'manual_payment'` ❌ Não era parseado
- `'quote'` ❌ Não era parseado

### 2. Sem Compatibilidade com URLs Antigas
Os redirects antigos usam valores diferentes:
```tsx
// Redirects em App.tsx
/admin/assinaturas → /admin/pedidos?type=subscription  ❌ Não reconhecido
/admin/compras-avulsas → /admin/pedidos?type=standalone  ❌ Não reconhecido
```

Mas o parse esperava:
- `subscription_delivery` (não `subscription`)
- `standalone_purchase` (não `standalone`)

## ✅ Solução Aplicada

### 1. Parse Completo de Tipos
```tsx
// DEPOIS - Completo
const type = searchParams.get(URL_PARAMS.TYPE);
if (type === 'subscription_delivery' || 
    type === 'standalone_purchase' || 
    type === 'manual_payment' || 
    type === 'quote') {
  filters.type = type;
} else if (type === 'subscription') {
  // Compatibilidade com URLs antigas
  filters.type = 'subscription_delivery';
} else if (type === 'standalone') {
  // Compatibilidade com URLs antigas
  filters.type = 'standalone_purchase';
}
```

### 2. Validação Atualizada
```tsx
// ANTES
if (!['all', 'subscription_delivery', 'standalone_purchase'].includes(filters.type)) {
  errors.push('Tipo de pedido inválido');
}

// DEPOIS
if (!['all', 'subscription_delivery', 'standalone_purchase', 'manual_payment', 'quote'].includes(filters.type)) {
  errors.push('Tipo de pedido inválido');
}
```

## 📊 Fluxo Corrigido

### Cenário 1: Acesso Direto
```
Usuário acessa: /admin/pedidos
↓
Parse URL: type = null
↓
Usa padrão: type = 'all'
↓
✅ Mostra todos os pedidos (assinaturas + compras + pagamentos + orçamentos)
```

### Cenário 2: Redirect Antigo
```
Usuário acessa: /admin/assinaturas
↓
Redirect: /admin/pedidos?type=subscription
↓
Parse URL: type = 'subscription'
↓
Compatibilidade: type = 'subscription_delivery'
↓
✅ Mostra apenas assinaturas
```

### Cenário 3: URL Moderna
```
Usuário acessa: /admin/pedidos?type=subscription_delivery
↓
Parse URL: type = 'subscription_delivery'
↓
✅ Mostra apenas assinaturas
```

### Cenário 4: Pagamentos Manuais
```
Usuário filtra: Tipo = Pagamento Manual
↓
URL atualiza: /admin/pedidos?type=manual_payment
↓
Parse URL: type = 'manual_payment'
↓
✅ Mostra apenas pagamentos manuais
```

## 🎯 Tipos Suportados

| Valor URL | Tipo Interno | Descrição |
|-----------|--------------|-----------|
| `all` | `all` | Todos os pedidos |
| `subscription_delivery` | `subscription_delivery` | Entregas de assinatura |
| `subscription` | `subscription_delivery` | Compatibilidade |
| `standalone_purchase` | `standalone_purchase` | Compras avulsas |
| `standalone` | `standalone_purchase` | Compatibilidade |
| `manual_payment` | `manual_payment` | Pagamentos manuais |
| `quote` | `quote` | Orçamentos |

## 🧪 Como Testar

### 1. Teste de Acesso Direto
```
1. Acesse: http://localhost:8080/admin/pedidos
2. Verifique: Deve mostrar TODOS os pedidos
3. Verifique: Filtro "Tipo" deve estar em "Todos"
```

### 2. Teste de Redirect Antigo
```
1. Acesse: http://localhost:8080/admin/assinaturas
2. Verifique: Redireciona para /admin/pedidos?type=subscription
3. Verifique: Mostra apenas assinaturas
4. Verifique: Filtro "Tipo" deve estar em "Assinatura"
```

### 3. Teste de Filtro Manual
```
1. Acesse: http://localhost:8080/admin/pedidos
2. Selecione filtro: Tipo = "Pagamento Manual"
3. Verifique: URL muda para ?type=manual_payment
4. Verifique: Mostra apenas pagamentos manuais
```

### 4. Teste de Dados
Execute o script de diagnóstico:
```sql
-- Ver scripts/diagnostics/verificar-assinaturas.sql
```

Deve mostrar:
- Total de assinaturas
- Total de entregas
- Total de compras avulsas
- Total de pagamentos manuais

## 📝 Arquivos Modificados

- `src/hooks/admin/useOrderFilters.ts` - Parse e validação corrigidos
- `scripts/diagnostics/verificar-assinaturas.sql` - Script de diagnóstico criado

## ✅ Resultado

- ✅ Página `/admin/pedidos` mostra todos os tipos de pedidos
- ✅ Redirects antigos funcionam corretamente
- ✅ Filtros de tipo funcionam para todos os 5 tipos
- ✅ URLs antigas são convertidas automaticamente
- ✅ Compatibilidade mantida

## 🎯 Commit

```
15347e1 - fix: add compatibility for old URL params in orders page
```

---

**Status**: ✅ Problema corrigido e testado
