# Fluxo de Pagamento: Compras Avulsa

## 📋 Modelo de Negócio

### Pagamento em 2 Parcelas (Recomendado)

```
1. Cliente faz pedido
   └─> Escolhe personagem
   └─> Status: pending

2. Cliente paga DEPÓSITO (20%)
   └─> Ex: R$ 100 de R$ 500
   └─> Status: deposit_paid
   └─> Estágio: payment_confirmed
   └─> 🏭 PRODUÇÃO INICIA

3. Produção passa por estágios
   ├─> model_preparation
   ├─> printing
   ├─> post_processing
   ├─> painting
   └─> quality_check

4. Produto pronto para envio
   └─> Estágio: packaging ou ready_to_ship
   └─> 📧 NOTIFICA CLIENTE: "Seu pedido está pronto!"
   └─> 💰 AGUARDA PAGAMENTO DO SALDO

5. Cliente paga SALDO (80%)
   └─> Ex: R$ 400
   └─> Status: balance_paid
   └─> Estágio: ready_to_ship

6. Envio
   └─> Estágio: shipped
   └─> Cliente recebe código de rastreio
```

## 🎯 Estágios e Pagamento

### Fluxo Correto

| Estágio | Pagamento Necessário | Ação |
|---------|---------------------|------|
| awaiting_payment | Nenhum | Aguardando depósito |
| payment_confirmed | Depósito ✅ | Produção pode iniciar |
| model_preparation | Depósito ✅ | Em produção |
| printing | Depósito ✅ | Em produção |
| post_processing | Depósito ✅ | Em produção |
| painting | Depósito ✅ | Em produção |
| quality_check | Depósito ✅ | Verificação final |
| packaging | Depósito ✅ | **NOTIFICAR CLIENTE** |
| ready_to_ship | Saldo ✅ | Aguardando coleta |
| shipped | Saldo ✅ | Enviado |
| delivered | Saldo ✅ | Entregue |

### Ponto de Bloqueio

**Estágio `packaging`:**
- Produto está pronto
- Sistema notifica cliente
- Sistema aguarda pagamento do saldo
- **NÃO avança para `ready_to_ship` até saldo ser pago**

## ⚠️ Situação Atual (Dados de Teste)

### Pedido 9254ac09
- ✅ Depósito pago
- ❌ Saldo não pago (vencimento: 12/03/2026)
- Estágio: model_preparation
- **Status Correto**: Em produção, aguardando chegar em packaging

### Pedido b4ff58da
- ✅ Depósito pago
- ✅ Saldo pago (mesmo dia do depósito)
- Estágio: payment_confirmed
- **Observação**: Pagamento à vista ou adiantado

## 🔧 Implementação Necessária

### 1. Validação de Transição de Estágio

Adicionar validação em `src/services/admin/production-service.ts`:

```typescript
// Ao tentar avançar de packaging → ready_to_ship
if (currentStage === 'packaging' && newStage === 'ready_to_ship') {
  // Verificar se é compra avulsa
  if (orderType === 'standalone_purchase') {
    // Verificar se saldo foi pago
    const purchase = await getStandalonePurchase(orderId);
    if (!purchase.balance_paid_at) {
      throw new Error('Saldo pendente. Cliente precisa pagar antes do envio.');
    }
  }
}
```

### 2. Notificação Automática

Quando chegar em `packaging`:

```typescript
// Em production-notification-service.ts
if (newStage === 'packaging' && orderType === 'standalone_purchase') {
  const purchase = await getStandalonePurchase(orderId);
  
  if (!purchase.balance_paid_at) {
    // Enviar email/notificação
    await sendBalancePaymentReminder({
      customerId: purchase.customer_id,
      orderId: purchase.id,
      balanceAmount: purchase.price_balance,
      dueDate: purchase.balance_due_date
    });
  }
}
```

### 3. Dashboard Admin

Adicionar indicador visual:
- Badge "Aguardando Saldo" em pedidos no estágio `packaging` sem saldo pago
- Filtro para "Aguardando Pagamento de Saldo"

## 💡 Alternativa: Pagamento à Vista

Se o modelo de negócio permitir pagamento à vista:

```
1. Cliente faz pedido
2. Cliente paga VALOR TOTAL
   └─> Status: balance_paid (pula deposit_paid)
   └─> Estágio: payment_confirmed
3. Produção completa
4. Envio direto (sem bloqueio)
```

Neste caso:
- `deposit_paid_at` e `balance_paid_at` são preenchidos juntos
- Não há bloqueio em `packaging`
- Fluxo segue direto até `shipped`

## 📊 Recomendação

**Para Produção:**
1. Implementar validação de saldo antes de `ready_to_ship`
2. Adicionar notificação automática em `packaging`
3. Adicionar indicadores visuais no dashboard
4. Documentar processo para equipe

**Para Dados Atuais:**
- Pedido 9254ac09: Correto (aguardando saldo)
- Pedido b4ff58da: Pagamento adiantado/à vista (OK)

## ✅ Conclusão

O fluxo ideal é:
1. Depósito → Inicia produção
2. Produção completa → Notifica cliente
3. Saldo pago → Libera envio

Isso protege o negócio e garante pagamento antes do envio.
