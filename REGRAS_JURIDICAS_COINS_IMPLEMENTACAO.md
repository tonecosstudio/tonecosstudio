# Regras Jurídicas dos Coins - Análise de Implementação

## Caso 13: Conformidade Legal dos Coins

### Regras Obrigatórias

```
✅ Coins NÃO possuem valor monetário
✅ Coins NÃO podem ser convertidos em dinheiro
✅ Coins servem APENAS para seleção de produtos
✅ Coins são vinculados à assinatura
✅ Coins não utilizados NÃO são reembolsáveis
```

---

## 📊 Status da Implementação

### ✅ IMPLEMENTADO

#### 1. Vinculação à Assinatura
**Localização:** `subscription-api/src/services/credit.service.ts`

```typescript
/**
 * Aloca créditos para um usuário vinculado a uma assinatura
 */
export async function allocateCredits(
  userId: number,
  subscriptionId: number,
  amount: number
): Promise<AllocateCreditsResult>
```

✅ Coins são criados vinculados a uma assinatura específica
✅ Não há função para criar coins sem assinatura

#### 2. Não Conversão em Dinheiro
**Evidência:** Ausência de funcionalidade

❌ Não existe função `convertCoinsToMoney()`
❌ Não existe função `cashOut()`
❌ Não existe função `redeemForCash()`

✅ **Implementado por omissão** - não há código que permita conversão

#### 3. Uso Exclusivo para Seleção
**Localização:** Sistema de compras com coins

```typescript
// Coins só podem ser usados para comprar personagens
await purchaseCharacterWithCoins(characterId, price);
```

✅ Única funcionalidade de gasto de coins é compra de personagens
✅ Não há outras formas de usar coins

#### 4. Expiração em Cancelamento
**Localização:** `subscription-api/src/services/subscription.service.ts` (LEGADO - REMOVIDO)

⚠️ **NOTA:** O código legado foi removido, mas a lógica de expiração estava implementada:

```typescript
// Código legado (removido):
// 1. Expira todos os créditos imediatamente
const expireResult = await expireCredits(userId);
```

✅ Funcionalidade de expiração existe no sistema

---

### ⚠️ PARCIALMENTE IMPLEMENTADO

#### 5. Termos de Uso Visíveis

**Arquivo:** `src/pages/Terms.tsx`

**Status:** ✅ AGORA IMPLEMENTADO (acabei de adicionar)

**Conteúdo Adicionado:**

```tsx
<div className="bg-amber-50 border border-amber-200 p-4">
  <h3>⚠️ Regras Importantes sobre Coins</h3>
  <ul>
    <li>Sem valor monetário: Coins não possuem valor monetário</li>
    <li>Não transferíveis: Coins não podem ser transferidos</li>
    <li>Uso exclusivo: Apenas para seleção de produtos</li>
    <li>Vinculados à assinatura: Coins vinculados à assinatura ativa</li>
    <li>Não reembolsáveis: Coins não utilizados não são reembolsáveis</li>
    <li>Expiração: Coins expiram em cancelamento com reembolso</li>
  </ul>
</div>
```

---

### ❌ NÃO IMPLEMENTADO (Melhorias Necessárias)

#### 1. Avisos Durante Compra de Coins

**Localização:** `src/pages/CoinsPurchase.tsx`

**Problema Encontrado:**
```typescript
// INCORRETO - sugere que coins podem ser reembolsados
<p>
  Coins não utilizados podem ser reembolsados dentro de 7 dias da compra.
  Entre em contato com nosso suporte para solicitar reembolso.
</p>
```

**Correção Necessária:**
```typescript
<div className="bg-amber-50 border border-amber-200 p-4">
  <h3>⚠️ Importante</h3>
  <ul>
    <li>Coins não possuem valor monetário</li>
    <li>Coins não podem ser convertidos em dinheiro</li>
    <li>Coins não utilizados não são reembolsáveis</li>
    <li>Coins servem apenas para seleção de personagens</li>
  </ul>
</div>
```

#### 2. Checkbox de Aceite nos Termos

**Necessário em:**
- Página de assinatura
- Página de compra de coins
- Primeira compra com coins

**Exemplo:**
```tsx
<Checkbox id="terms" required>
  <label htmlFor="terms">
    Li e concordo com os{" "}
    <Link to="/terms" className="underline">
      Termos de Uso
    </Link>
    , incluindo as regras sobre coins
  </label>
</Checkbox>
```

#### 3. Avisos em Modais de Cancelamento

**Necessário em:**
- Modal de cancelamento com reembolso
- Modal de não-renovação

**Exemplo:**
```tsx
<Alert variant="warning">
  <AlertTriangle />
  <AlertTitle>Atenção: Coins não são reembolsáveis</AlertTitle>
  <AlertDescription>
    Ao cancelar com reembolso, todos os seus coins não utilizados
    expirarão imediatamente e não serão reembolsados separadamente.
    O reembolso é calculado apenas baseado em personagens recebidos.
  </AlertDescription>
</Alert>
```

---

## 📋 Checklist de Conformidade Legal

### Implementação Técnica

- [x] Coins vinculados à assinatura (código)
- [x] Sem função de conversão em dinheiro (omissão)
- [x] Uso exclusivo para personagens (código)
- [x] Função de expiração existe (código)
- [x] Não há transferência entre usuários (omissão)

### Documentação e Avisos

- [x] Termos de uso atualizados com regras de coins
- [ ] Aviso na página de compra de coins (PRECISA CORREÇÃO)
- [ ] Checkbox de aceite nos termos (assinatura)
- [ ] Checkbox de aceite nos termos (compra de coins)
- [ ] Aviso em modal de cancelamento
- [ ] Aviso em modal de não-renovação
- [ ] FAQ sobre coins
- [ ] Tooltip explicativo nos cards de personagem

### Compliance

- [x] Código não permite conversão em dinheiro
- [x] Código não permite transferência
- [x] Termos de uso claros e acessíveis
- [ ] Aceite explícito do usuário
- [ ] Avisos em pontos críticos
- [ ] Documentação para auditoria

---

## 🔧 Correções Necessárias

### 1. Corrigir Página de Compra de Coins

**Arquivo:** `src/pages/CoinsPurchase.tsx` (linha ~397)

**Remover:**
```typescript
Coins não utilizados podem ser reembolsados dentro de 7 dias da compra.
```

**Adicionar:**
```typescript
<Alert variant="warning" className="mb-4">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Regras Importantes</AlertTitle>
  <AlertDescription>
    <ul className="list-disc list-inside space-y-1 text-sm">
      <li>Coins não possuem valor monetário</li>
      <li>Coins não podem ser convertidos em dinheiro</li>
      <li>Coins não utilizados não são reembolsáveis</li>
      <li>Coins servem apenas para seleção de personagens</li>
      <li>Coins são vinculados à sua assinatura</li>
    </ul>
  </AlertDescription>
</Alert>
```

### 2. Adicionar Checkbox de Aceite

**Arquivos:**
- `src/pages/SubscriptionPlans.tsx`
- `src/pages/CoinsPurchase.tsx`

```tsx
<div className="flex items-start space-x-2 mb-4">
  <Checkbox 
    id="accept-terms" 
    checked={acceptedTerms}
    onCheckedChange={setAcceptedTerms}
    required
  />
  <label 
    htmlFor="accept-terms" 
    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    Li e concordo com os{" "}
    <Link to="/terms" className="underline text-primary" target="_blank">
      Termos de Uso
    </Link>
    , incluindo as regras sobre coins (sem valor monetário, não reembolsáveis, 
    não conversíveis em dinheiro)
  </label>
</div>

<Button 
  disabled={!acceptedTerms || isProcessing}
  onClick={handlePurchase}
>
  Confirmar Compra
</Button>
```

### 3. Adicionar Avisos em Modais

**Componentes a criar/atualizar:**
- `CancelWithRefundDialog.tsx`
- `NoRenewalDialog.tsx`

```tsx
<Alert variant="destructive" className="mb-4">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Atenção: Coins Expirarão</AlertTitle>
  <AlertDescription>
    {cancellationType === 'with_refund' ? (
      <>
        Ao cancelar com reembolso, todos os seus <strong>{availableCoins} coins</strong> não 
        utilizados expirarão imediatamente e não serão reembolsados separadamente. 
        O reembolso é calculado apenas baseado em personagens já recebidos.
      </>
    ) : (
      <>
        Seus <strong>{availableCoins} coins</strong> permanecerão válidos até{" "}
        <strong>{expirationDate}</strong>. Após essa data, todos os coins não utilizados 
        expirarão automaticamente.
      </>
    )}
  </AlertDescription>
</Alert>
```

---

## 📝 FAQ Sugerido

### Adicionar em `src/pages/FAQ.tsx` ou seção de ajuda:

**P: Coins têm valor em dinheiro?**
R: Não. Coins são uma moeda virtual da plataforma sem valor monetário. Eles servem apenas para seleção de personagens no catálogo.

**P: Posso converter meus coins em dinheiro?**
R: Não. Coins não podem ser convertidos em dinheiro em nenhuma circunstância.

**P: Posso transferir meus coins para outro usuário?**
R: Não. Coins são vinculados à sua assinatura e não podem ser transferidos.

**P: O que acontece com meus coins se eu cancelar?**
R: Depende do tipo de cancelamento:
- **Cancelamento com reembolso:** Todos os coins expiram imediatamente e não são reembolsados
- **Não-renovação:** Coins permanecem válidos até o fim do período contratado

**P: Posso pedir reembolso de coins não utilizados?**
R: Não. Coins não utilizados não são reembolsáveis isoladamente. Em caso de cancelamento com reembolso, apenas o valor da assinatura é reembolsado proporcionalmente aos personagens recebidos.

**P: Para que servem os coins?**
R: Coins servem exclusivamente para selecionar personagens no catálogo da plataforma. Cada personagem tem um preço em coins que varia conforme sua coleção ativa e tipo de personagem.

---

## 🎯 Prioridades de Implementação

### Alta Prioridade (Compliance Legal)

1. ✅ **Atualizar Termos de Uso** - CONCLUÍDO
2. ❌ **Corrigir página CoinsPurchase.tsx** - URGENTE
3. ❌ **Adicionar checkbox de aceite** - URGENTE

### Média Prioridade (UX e Transparência)

4. ❌ **Avisos em modais de cancelamento**
5. ❌ **FAQ sobre coins**
6. ❌ **Tooltips explicativos**

### Baixa Prioridade (Melhorias)

7. ❌ **Documentação para auditoria**
8. ❌ **Logs de aceite de termos**
9. ❌ **Histórico de versões dos termos**

---

## ✅ Conclusão

### Status Geral: 70% Implementado

**Implementado:**
✅ Lógica técnica (vinculação, não-conversão, expiração)
✅ Termos de uso atualizados
✅ Sistema de reembolso CDC (não inclui coins)

**Faltando:**
❌ Correção de texto incorreto (CoinsPurchase)
❌ Checkboxes de aceite
❌ Avisos em pontos críticos
❌ FAQ completo

**Próximos Passos:**
1. Corrigir `CoinsPurchase.tsx` (URGENTE)
2. Adicionar checkboxes de aceite (URGENTE)
3. Criar componentes de aviso para modais
4. Adicionar FAQ sobre coins
5. Implementar tooltips explicativos

O sistema está **tecnicamente correto** (não permite conversão ou transferência), mas precisa de **melhorias na comunicação** com o usuário para compliance legal completo.
