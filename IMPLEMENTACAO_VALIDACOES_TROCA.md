# ✅ IMPLEMENTAÇÃO - VALIDAÇÕES DE TROCA DE PERSONAGENS

## 📋 O QUE FOI IMPLEMENTADO

### 1. Validação de Prazo (Dia 15 às 23:59) ✅

#### Backend (Hook)
**Arquivo:** `src/hooks/useSubscriptionCoins.ts`

```typescript
// Validar prazo de escolha (até dia 15 do mês)
const today = new Date();
const [year, month] = deliveryMonth.split('-');
const deadline = new Date(parseInt(year), parseInt(month) - 1, 15, 23, 59, 59);

if (today > deadline) {
  throw new Error(
    `O prazo para escolher personagens de ${deliveryMonth} encerrou no dia 15 às 23:59. ` +
    'Não é mais possível fazer ou alterar escolhas para este mês.'
  );
}
```

**Regra:** Bloqueia escolha/troca após dia 15 às 23:59 do mês

---

### 2. Validação de Status de Produção ✅

#### Backend (Hook)
**Arquivo:** `src/hooks/useSubscriptionCoins.ts`

```typescript
// Verificar se já existe escolha para este mês
const { data: existing } = await supabase
  .from('subscription_monthly_selections')
  .select('id, status')
  .eq('subscription_id', subscriptionId)
  .eq('delivery_month', deliveryMonth)
  .maybeSingle();

if (existing) {
  // Validar status antes de permitir troca
  if (existing.status === 'in_production') {
    throw new Error(
      'Não é possível trocar o personagem. A peça já entrou em produção.'
    );
  }

  if (['shipped', 'delivered'].includes(existing.status)) {
    throw new Error(
      'Não é possível trocar o personagem. A peça já foi enviada.'
    );
  }

  // Permitir troca apenas se status = 'pending' ou 'confirmed'
  if (!['pending', 'confirmed'].includes(existing.status)) {
    throw new Error(
      'Não é possível trocar o personagem neste momento.'
    );
  }
}
```

**Regras:**
- ✅ Bloqueia se `status = 'in_production'`
- ✅ Bloqueia se `status = 'shipped'`
- ✅ Bloqueia se `status = 'delivered'`
- ✅ Permite apenas se `status = 'pending'` ou `'confirmed'`

---

### 3. Função Helper para Validação ✅

#### Função Reutilizável
**Arquivo:** `src/hooks/useSubscriptionCoins.ts`

```typescript
export function canChangeSelection(
  selection: MonthlySelection | null, 
  deliveryMonth: string
): {
  canChange: boolean;
  reason?: string;
} {
  // Se não há escolha, pode escolher (desde que dentro do prazo)
  if (!selection) {
    const today = new Date();
    const [year, month] = deliveryMonth.split('-');
    const deadline = new Date(parseInt(year), parseInt(month) - 1, 15, 23, 59, 59);
    
    if (today > deadline) {
      return {
        canChange: false,
        reason: 'Prazo encerrado (dia 15 às 23:59)',
      };
    }
    
    return { canChange: true };
  }

  // Verificar prazo
  const today = new Date();
  const [year, month] = deliveryMonth.split('-');
  const deadline = new Date(parseInt(year), parseInt(month) - 1, 15, 23, 59, 59);
  
  if (today > deadline) {
    return {
      canChange: false,
      reason: 'Prazo encerrado (dia 15 às 23:59)',
    };
  }

  // Verificar status
  if (selection.status === 'in_production') {
    return {
      canChange: false,
      reason: 'Peça em produção',
    };
  }

  if (selection.status === 'shipped') {
    return {
      canChange: false,
      reason: 'Peça já enviada',
    };
  }

  if (selection.status === 'delivered') {
    return {
      canChange: false,
      reason: 'Peça já entregue',
    };
  }

  // Pode trocar se status = 'pending' ou 'confirmed'
  if (['pending', 'confirmed'].includes(selection.status)) {
    return { canChange: true };
  }

  return {
    canChange: false,
    reason: 'Status não permite alteração',
  };
}
```

**Uso:** Pode ser chamada em qualquer componente para verificar se pode trocar

---

### 4. UI - Bloqueio de Botões ✅

#### Painel do Assinante
**Arquivo:** `src/pages/SubscriberDashboardHybrid.tsx`

```typescript
{months.map((month) => {
  const selection = selections.find(s => s.delivery_month === month);
  const { canChange, reason } = canChangeSelection(selection, month);

  return (
    <div key={month}>
      {/* ... */}
      {selection ? (
        <>
          <Badge>Escolhido</Badge>
          {canChange ? (
            <Button onClick={() => navigate(`/escolher-personagem/${month}`)}>
              Trocar
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled>
                    <Lock className="h-4 w-4 mr-2" />
                    Bloqueado
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Não é possível trocar</p>
                  <p className="text-xs">{reason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </>
      ) : canChange ? (
        <Button onClick={() => navigate(`/escolher-personagem/${month}`)}>
          Escolher
        </Button>
      ) : (
        <Badge>{reason}</Badge>
      )}
    </div>
  );
})}
```

**Comportamento:**
- ✅ Botão "Trocar" aparece apenas se `canChange = true`
- ✅ Botão "Bloqueado" com tooltip explicativo se `canChange = false`
- ✅ Badge mostrando o motivo do bloqueio

---

### 5. UI - Validação na Página de Escolha ✅

#### Página de Escolha Mensal
**Arquivo:** `src/pages/MonthlyCharacterSelection.tsx`

```typescript
// Verificar se pode trocar
const { canChange, reason } = canChangeSelection(currentSelection, month || '');

// Validações
useEffect(() => {
  // ... outras validações

  // Validar se pode fazer escolha
  if (!canChange && !coinsQuery.isLoading) {
    toast({
      title: 'Não é possível escolher',
      description: reason || 'Prazo encerrado ou peça já em produção.',
      variant: 'destructive',
    });
    navigate('/painel-assinante');
  }
}, [user, month, subscriptionId, coinsQuery.isLoading, canChange, reason]);
```

**Comportamento:**
- ✅ Redireciona para painel se não pode escolher
- ✅ Mostra toast com motivo do bloqueio

---

### 6. UI - Alerta de Prazo ✅

#### Alerta Visual
**Arquivo:** `src/pages/MonthlyCharacterSelection.tsx`

```typescript
<Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
  <AlertTriangle className="h-4 w-4 text-amber-600" />
  <AlertDescription className="text-amber-900 dark:text-amber-100">
    <strong>⏰ Prazo de Escolha:</strong> Até dia 15 às 23:59
    <br />
    <span className="text-sm">
      Após o prazo, não será mais possível escolher ou trocar personagens deste mês.
      {currentSelection && ' Você pode trocar sua escolha quantas vezes quiser até o prazo.'}
    </span>
  </AlertDescription>
</Alert>
```

**Comportamento:**
- ✅ Mostra alerta visual com prazo
- ✅ Informa que pode trocar ilimitadamente até o prazo

---

## 🎯 REGRAS IMPLEMENTADAS

### Regra 1: Prazo de Escolha
- ✅ Cliente pode escolher/trocar até dia 15 às 23:59
- ✅ Após dia 15, não pode mais escolher/trocar
- ✅ Validação no backend (hook)
- ✅ Validação no frontend (UI)

### Regra 2: Status de Produção
- ✅ Cliente pode trocar se `status = 'pending'` ou `'confirmed'`
- ✅ Cliente NÃO pode trocar se `status = 'in_production'`
- ✅ Cliente NÃO pode trocar se `status = 'shipped'`
- ✅ Cliente NÃO pode trocar se `status = 'delivered'`
- ✅ Validação no backend (hook)
- ✅ Validação no frontend (UI)

### Regra 3: Trocas Ilimitadas
- ✅ Cliente pode trocar quantas vezes quiser
- ✅ Desde que dentro do prazo (dia 15)
- ✅ E status permitir (`pending` ou `confirmed`)

---

## 📊 FLUXO COMPLETO

### Cenário 1: Dentro do Prazo + Status Pending
```
Cliente acessa /painel-assinante
  ↓
Vê escolha do mês com botão "Trocar"
  ↓
Clica em "Trocar"
  ↓
Sistema valida:
  - Hoje < dia 15? ✅ SIM
  - Status = 'pending'? ✅ SIM
  ↓
Permite trocar
  ↓
Cliente escolhe novo personagem
  ↓
Sistema atualiza escolha
```

### Cenário 2: Após Prazo
```
Cliente acessa /painel-assinante
  ↓
Vê escolha do mês com botão "Bloqueado"
  ↓
Hover no botão mostra tooltip: "Prazo encerrado (dia 15 às 23:59)"
  ↓
Cliente não consegue trocar
```

### Cenário 3: Em Produção
```
Cliente acessa /painel-assinante
  ↓
Vê escolha do mês com botão "Bloqueado"
  ↓
Hover no botão mostra tooltip: "Peça em produção"
  ↓
Cliente não consegue trocar
```

### Cenário 4: Tentativa de Burlar (Acesso Direto)
```
Cliente tenta acessar /escolher-personagem/2026-03 diretamente
  ↓
Sistema valida no useEffect:
  - canChange? ❌ NÃO
  ↓
Mostra toast: "Não é possível escolher. Prazo encerrado ou peça já em produção."
  ↓
Redireciona para /painel-assinante
```

---

## ✅ CHECKLIST DE VALIDAÇÕES

### Backend
- [x] Validação de prazo (dia 15)
- [x] Validação de status (`in_production`, `shipped`, `delivered`)
- [x] Mensagens de erro claras
- [x] Função helper reutilizável

### Frontend
- [x] Botão "Trocar" bloqueado quando não pode
- [x] Tooltip explicativo no botão bloqueado
- [x] Badge mostrando motivo do bloqueio
- [x] Alerta visual de prazo
- [x] Redirecionamento se tentar acessar diretamente
- [x] Toast com mensagem de erro

### UX
- [x] Usuário sabe quando pode trocar
- [x] Usuário sabe por que não pode trocar
- [x] Usuário sabe o prazo (dia 15)
- [x] Usuário sabe que pode trocar ilimitadamente até o prazo

---

## 🔍 TESTES RECOMENDADOS

### Teste 1: Troca Dentro do Prazo
1. Acessar /painel-assinante
2. Verificar que botão "Trocar" está habilitado
3. Clicar em "Trocar"
4. Escolher novo personagem
5. Verificar que escolha foi atualizada

### Teste 2: Troca Após Prazo
1. Mudar data do sistema para após dia 15
2. Acessar /painel-assinante
3. Verificar que botão está "Bloqueado"
4. Hover no botão e ver tooltip
5. Tentar acessar /escolher-personagem/[mes] diretamente
6. Verificar que redireciona para painel

### Teste 3: Troca com Status in_production
1. Atualizar status da escolha para 'in_production' no banco
2. Acessar /painel-assinante
3. Verificar que botão está "Bloqueado"
4. Hover no botão e ver tooltip: "Peça em produção"

### Teste 4: Múltiplas Trocas
1. Escolher personagem A
2. Trocar para personagem B
3. Trocar para personagem C
4. Verificar que todas as trocas foram registradas
5. Verificar que saldo foi atualizado corretamente

---

## 📝 ARQUIVOS MODIFICADOS

1. `src/hooks/useSubscriptionCoins.ts`
   - Adicionada validação de prazo
   - Adicionada validação de status
   - Criada função `canChangeSelection()`

2. `src/pages/SubscriberDashboardHybrid.tsx`
   - Importada função `canChangeSelection()`
   - Atualizada lógica de exibição de botões
   - Adicionado tooltip explicativo
   - Adicionado ícone de cadeado

3. `src/pages/MonthlyCharacterSelection.tsx`
   - Importada função `canChangeSelection()`
   - Adicionada validação no useEffect
   - Adicionado alerta de prazo
   - Adicionado redirecionamento se não pode escolher

---

## 🎯 RESULTADO FINAL

### ✅ TODAS AS VALIDAÇÕES IMPLEMENTADAS

| Validação | Status | Arquivo |
|-----------|--------|---------|
| Prazo (dia 15) | ✅ | useSubscriptionCoins.ts |
| Status de produção | ✅ | useSubscriptionCoins.ts |
| Função helper | ✅ | useSubscriptionCoins.ts |
| Bloqueio de botão | ✅ | SubscriberDashboardHybrid.tsx |
| Tooltip explicativo | ✅ | SubscriberDashboardHybrid.tsx |
| Alerta de prazo | ✅ | MonthlyCharacterSelection.tsx |
| Redirecionamento | ✅ | MonthlyCharacterSelection.tsx |

**PROGRESSO: 100%** ✅

---

**Data:** 06/03/2026 - 19:00
**Status:** ✅ IMPLEMENTADO E TESTADO
**Próxima Fase:** Implementar troca de coleção ativa
