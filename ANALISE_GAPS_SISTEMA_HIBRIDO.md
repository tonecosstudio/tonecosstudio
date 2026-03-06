# ❌ ANÁLISE DE GAPS - SISTEMA HÍBRIDO

## 📋 PONTOS SOLICITADOS vs IMPLEMENTADO

### 7. TROCA DE PERSONAGENS

#### ✅ O que está implementado:
1. **Troca de escolha mensal** - Parcialmente
   - Cliente pode atualizar escolha existente
   - Função `useSelectCharacter()` verifica se já existe escolha e atualiza
   - Sem validação de status de produção

#### ❌ O que está FALTANDO:
1. **Validação de status de produção**
   - ❌ Não verifica se `status = 'in_production'`
   - ❌ Não bloqueia troca após início da produção
   - ❌ Não valida se peça já entrou em produção

2. **Regra de negócio**
   - ❌ Falta: "Pode trocar enquanto status != 'in_production'"
   - ❌ Falta: "Após iniciar produção, troca não é mais possível"

#### 📍 Onde implementar:
```typescript
// src/hooks/useSubscriptionCoins.ts - useSelectCharacter()

// ADICIONAR VALIDAÇÃO:
export function useSelectCharacter() {
  return useMutation({
    mutationFn: async ({...}) => {
      // Verificar se já existe escolha
      const { data: existing } = await supabase
        .from('subscription_monthly_selections')
        .select('id, status')
        .eq('subscription_id', subscriptionId)
        .eq('delivery_month', deliveryMonth)
        .maybeSingle();

      // ❌ FALTA: Validar status antes de permitir troca
      if (existing && existing.status === 'in_production') {
        throw new Error('Não é possível trocar. A peça já entrou em produção.');
      }

      if (existing && ['shipped', 'delivered'].includes(existing.status)) {
        throw new Error('Não é possível trocar. A peça já foi enviada.');
      }

      // Continuar com atualização...
    }
  });
}
```

---

### 8. COINS NÃO UTILIZADOS

#### ✅ O que está implementado:
1. **Saldo de coins**
   - ✅ Coins ficam em `subscriptions.coins_balance`
   - ✅ Saldo inicial em `subscriptions.coins_initial`
   - ✅ Atualização automática via trigger

2. **Uso de coins**
   - ✅ Escolher personagens mensais
   - ✅ Preços contextuais (200-450 coins)

#### ❌ O que está FALTANDO:
1. **Trocar coleção ativa**
   - ❌ Botão existe mas não funciona
   - ❌ Não implementado em `SubscriberDashboardHybrid.tsx`
   - ❌ Falta modal de troca de coleção

2. **Escolher catálogo premium**
   - ❌ Não implementado
   - ❌ Não há diferenciação de catálogo premium
   - ❌ Preço de 450 coins existe mas não há catálogo específico

3. **Expiração de coins**
   - ✅ Coins não expiram (correto)
   - ✅ Ficam no saldo enquanto assinatura ativa
   - ❌ Falta: O que acontece quando assinatura cancela?

#### 📍 Onde implementar:

##### 1. Troca de Coleção Ativa
```typescript
// src/pages/SubscriberDashboardHybrid.tsx

// ADICIONAR FUNÇÃO:
const changeActiveCollection = useMutation({
  mutationFn: async (newCollectionId: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ active_collection_id: newCollectionId })
      .eq('id', subscriptionId);
    
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['subscription-coins']);
    toast({ title: 'Coleção ativa atualizada!' });
  }
});

// ADICIONAR MODAL:
<Dialog>
  <DialogTrigger asChild>
    <Button onClick={() => setShowChangeCollectionModal(true)}>
      Trocar Coleção Ativa
    </Button>
  </DialogTrigger>
  <DialogContent>
    {/* Lista de coleções disponíveis */}
    {/* Botão de confirmação */}
  </DialogContent>
</Dialog>
```

##### 2. Catálogo Premium
```typescript
// Criar nova página: src/pages/PremiumCatalog.tsx

// Listar personagens premium (character_type = 'premium')
// Preço fixo: 450 coins
// Permitir compra avulsa com coins
```

##### 3. Política de Expiração
```sql
-- Adicionar à migration:

COMMENT ON COLUMN subscriptions.coins_balance IS 
  'Saldo atual de coins do assinante.
   Coins não expiram enquanto assinatura estiver ativa.
   Ao cancelar assinatura, coins são perdidos.';
```

---

## 🔍 SSOT (Single Source of Truth)

### ✅ O que está correto:
1. **Saldo de coins**
   - ✅ SSOT: `subscriptions.coins_balance`
   - ✅ Atualizado via trigger automaticamente
   - ✅ Não há duplicação

2. **Coleção ativa**
   - ✅ SSOT: `subscriptions.active_collection_id`
   - ✅ Única fonte de verdade

3. **Escolhas mensais**
   - ✅ SSOT: `subscription_monthly_selections`
   - ✅ UNIQUE constraint (subscription_id, delivery_month)
   - ✅ Não há duplicação

### ❌ Possíveis problemas:
1. **Tabela legada `subscription_collections`**
   - ⚠️ Ainda existe no banco
   - ⚠️ Pode causar confusão
   - ⚠️ Deveria ser deprecada

2. **Campo legado `subscriptions.collection_id`**
   - ⚠️ Ainda existe no banco
   - ⚠️ Conflita com `active_collection_id`
   - ⚠️ Deveria ser deprecado

---

## 📊 RESUMO DE GAPS

| Funcionalidade | Status | Prioridade | Esforço |
|----------------|--------|------------|---------|
| Validação de status antes de trocar | ❌ Faltando | ALTA | 2h |
| Bloquear troca após produção | ❌ Faltando | ALTA | 1h |
| Trocar coleção ativa (UI) | ❌ Faltando | MÉDIA | 3h |
| Catálogo premium | ❌ Faltando | BAIXA | 4h |
| Política de expiração de coins | ❌ Faltando | BAIXA | 1h |
| Deprecar tabelas legadas | ❌ Faltando | BAIXA | 2h |

**TOTAL DE GAPS: 6**
**ESFORÇO ESTIMADO: 13 horas**

---

## 🎯 PLANO DE AÇÃO

### FASE 2A - Correções Críticas (Prioridade ALTA)
**Tempo estimado: 3 horas**

1. **Validação de status antes de trocar** (2h)
   - Adicionar validação em `useSelectCharacter()`
   - Verificar `status` antes de permitir UPDATE
   - Mostrar mensagem de erro apropriada

2. **Bloquear troca após produção** (1h)
   - Adicionar validação no frontend
   - Desabilitar botão "Trocar" se status != 'pending'
   - Mostrar tooltip explicativo

### FASE 2B - Funcionalidades Pendentes (Prioridade MÉDIA)
**Tempo estimado: 7 horas**

3. **Trocar coleção ativa** (3h)
   - Criar modal de troca
   - Implementar mutation
   - Atualizar UI após troca

4. **Catálogo premium** (4h)
   - Criar página de catálogo premium
   - Listar personagens premium
   - Permitir compra com coins

### FASE 2C - Limpeza e Documentação (Prioridade BAIXA)
**Tempo estimado: 3 horas**

5. **Política de expiração** (1h)
   - Documentar regra de expiração
   - Adicionar comentários no banco

6. **Deprecar tabelas legadas** (2h)
   - Adicionar comentários DEPRECATED
   - Criar migration de limpeza
   - Atualizar documentação

---

## 📝 CÓDIGO PARA IMPLEMENTAR

### 1. Validação de Status (CRÍTICO)

```typescript
// src/hooks/useSubscriptionCoins.ts

export function useSelectCharacter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      characterId,
      collectionId,
      deliveryMonth,
      coinsSpent,
    }: {
      subscriptionId: string;
      characterId: string;
      collectionId: string;
      deliveryMonth: string;
      coinsSpent: number;
    }) => {
      // Verificar se já existe escolha para este mês
      const { data: existing } = await supabase
        .from('subscription_monthly_selections')
        .select('id, status')
        .eq('subscription_id', subscriptionId)
        .eq('delivery_month', deliveryMonth)
        .maybeSingle();

      // ✅ ADICIONAR: Validar status antes de permitir troca
      if (existing) {
        // Bloquear se já está em produção
        if (existing.status === 'in_production') {
          throw new Error(
            'Não é possível trocar o personagem. A peça já entrou em produção.'
          );
        }

        // Bloquear se já foi enviada
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

        // Atualizar escolha existente
        const { error } = await supabase
          .from('subscription_monthly_selections')
          .update({
            character_id: characterId,
            collection_id: collectionId,
            coins_spent: coinsSpent,
            is_auto_selected: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar nova escolha
        const { error } = await supabase
          .from('subscription_monthly_selections')
          .insert({
            subscription_id: subscriptionId,
            character_id: characterId,
            collection_id: collectionId,
            delivery_month: deliveryMonth,
            coins_spent: coinsSpent,
            is_auto_selected: false,
            status: 'pending',
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-coins', variables.subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-selections', variables.subscriptionId] });
      
      toast({
        title: 'Personagem selecionado!',
        description: 'Sua escolha foi salva com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao selecionar personagem',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

### 2. Bloquear Botão de Troca (CRÍTICO)

```typescript
// src/pages/SubscriberDashboardHybrid.tsx

// Adicionar verificação de status
const canChangeSelection = (selection: MonthlySelection) => {
  return ['pending', 'confirmed'].includes(selection.status);
};

// No JSX:
{selection ? (
  <>
    <Badge variant="secondary" className="bg-green-500 text-white">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Escolhido
    </Badge>
    {canChangeSelection(selection) ? (
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate(`/escolher-personagem/${month}`)}
      >
        Trocar
      </Button>
    ) : (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" disabled>
              <Lock className="h-4 w-4 mr-2" />
              Bloqueado
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Não é possível trocar.</p>
            <p className="text-xs">
              {selection.status === 'in_production' && 'Peça em produção'}
              {selection.status === 'shipped' && 'Peça já enviada'}
              {selection.status === 'delivered' && 'Peça já entregue'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </>
) : (
  // Botão de escolher...
)}
```

---

## ✅ CONCLUSÃO

### Status Atual:
- ✅ 70% implementado (Fase 1)
- ❌ 30% faltando (Fase 2)

### Gaps Críticos:
1. ❌ Validação de status antes de trocar personagem
2. ❌ Bloquear troca após início da produção

### Gaps Não-Críticos:
3. ❌ Trocar coleção ativa (UI)
4. ❌ Catálogo premium
5. ❌ Política de expiração documentada
6. ❌ Deprecar tabelas legadas

### Próxima Ação:
**Implementar validações de status (Fase 2A - 3 horas)**

---

**Data:** 06/03/2026 - 18:30
**Status:** ❌ GAPS IDENTIFICADOS
**Prioridade:** ALTA (Validações de status)
**Esforço Total:** 13 horas
