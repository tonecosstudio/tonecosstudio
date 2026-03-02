# Tratamento de Erros de Geração de Etiquetas

## Visão Geral

Este documento descreve o sistema de tratamento de erros específico implementado para a geração de etiquetas de envio, conforme os requisitos 8.4, 15.1 e 15.2.

## Requisitos Implementados

- **Requisito 8.4**: Tratamento de erro de endereço inválido com identificação de campos faltantes
- **Requisito 15.1**: Mensagens de erro claras e descritivas
- **Requisito 15.2**: Mensagem com opção de retry em timeout e erros temporários

## Códigos de Erro

O sistema utiliza códigos de erro específicos para categorizar diferentes tipos de falhas:

```typescript
export enum LabelErrorCode {
  ADDRESS_NOT_FOUND = 'ADDRESS_NOT_FOUND',      // Endereço não encontrado no cadastro
  INVALID_ADDRESS = 'INVALID_ADDRESS',          // Endereço incompleto/inválido
  API_ERROR = 'API_ERROR',                      // Erro genérico da API
  NETWORK_ERROR = 'NETWORK_ERROR',              // Erro de conexão
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',              // Timeout na API
  GENERATION_FAILED = 'GENERATION_FAILED',      // Falha geral na geração
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS', // Status do pedido não permite etiqueta
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'               // Erro desconhecido
}
```

## Categorias de Erros

### 1. Erros de Endereço (Corrigíveis)

**Códigos**: `ADDRESS_NOT_FOUND`, `INVALID_ADDRESS`

**Características**:
- Requerem intervenção do usuário para corrigir o endereço
- Exibem campos faltantes específicos
- Oferecem botão "Corrigir" para editar o endereço

**Exemplo de mensagem**:
```
Endereço de entrega incompleto. Campos faltantes: rua, número, CEP.
```

**Ação do usuário**: Clicar em "Corrigir" para editar o cadastro do cliente.

### 2. Erros Temporários (Recuperáveis)

**Códigos**: `API_ERROR`, `NETWORK_ERROR`, `TIMEOUT_ERROR`, `GENERATION_FAILED`

**Características**:
- Podem ser resolvidos tentando novamente
- Geralmente causados por problemas temporários de rede ou API
- Oferecem botão "Tentar Novamente"

**Exemplos de mensagens**:
```
A API de etiquetas demorou muito para responder. Tente novamente.
Erro de conexão. Verifique sua internet e tente novamente.
Erro ao comunicar com a API de etiquetas. Tente novamente.
```

**Ação do usuário**: Clicar em "Tentar Novamente" para reprocessar os pedidos.

### 3. Erros Permanentes (Não Recuperáveis)

**Códigos**: `INVALID_ORDER_STATUS`

**Características**:
- Não podem ser resolvidos automaticamente
- Requerem mudança no status do pedido ou outras ações manuais
- Não oferecem opção de retry

**Exemplos de mensagens**:
```
Pedido já possui código de rastreamento.
Pedido está em status final: cancelled.
```

**Ação do usuário**: Verificar o status do pedido e tomar ação apropriada.

## Funções Auxiliares

### `getLabelErrorMessage(error: unknown): string`

Converte um erro em mensagem amigável para o usuário.

```typescript
try {
  await generateLabelForOrder(order);
} catch (error) {
  const message = getLabelErrorMessage(error);
  toast.error(message);
}
```

### `isRetryableError(error: unknown): boolean`

Verifica se um erro pode ser resolvido tentando novamente.

```typescript
if (isRetryableError(error)) {
  // Mostrar botão "Tentar Novamente"
}
```

### `isAddressError(error: unknown): boolean`

Verifica se um erro é relacionado a endereço inválido.

```typescript
if (isAddressError(error)) {
  // Mostrar botão "Corrigir Endereço"
}
```

### `getMissingAddressFields(error: unknown): string[]`

Obtém a lista de campos faltantes de um erro de endereço.

```typescript
const missingFields = getMissingAddressFields(error);
// ['rua', 'número', 'CEP']
```

## Tratamento na API de Etiquetas

O serviço de geração de etiquetas implementa tratamento específico para diferentes tipos de erros da API:

```typescript
try {
  labelResult = await shippingService.generateLabel(order.id, shippingAddress);
} catch (apiError) {
  // Timeout
  if (apiError.message.includes('timeout')) {
    throw new LabelGenerationError(
      'A API de etiquetas demorou muito para responder. Tente novamente.',
      LabelErrorCode.TIMEOUT_ERROR,
      order.id
    );
  }
  
  // Erro de rede
  if (apiError.message.includes('network')) {
    throw new LabelGenerationError(
      'Erro de conexão com a API de etiquetas. Verifique sua conexão.',
      LabelErrorCode.NETWORK_ERROR,
      order.id
    );
  }
  
  // Erro genérico da API
  throw new LabelGenerationError(
    `Erro na API de etiquetas: ${apiError.message}`,
    LabelErrorCode.API_ERROR,
    order.id
  );
}
```

## Interface do Modal de Resultado

O `BulkLabelGenerationModal` foi aprimorado para exibir erros categorizados:

### Seção de Erros de Endereço

```tsx
<div className="space-y-2">
  <h5>Problemas de Endereço ({addressErrors.length})</h5>
  {addressErrors.map(failure => (
    <div>
      <span>{failure.customerName}</span>
      <p>{failure.error}</p>
      <Button onClick={() => onEditAddress(failure.orderId)}>
        Corrigir
      </Button>
    </div>
  ))}
</div>
```

### Seção de Erros Temporários

```tsx
<div className="space-y-2">
  <h5>Erros Temporários ({retryableErrors.length})</h5>
  <Button onClick={handleRetryFailed}>
    Tentar Novamente
  </Button>
  {retryableErrors.map(failure => (
    <div>
      <span>{failure.customerName}</span>
      <p>{failure.error}</p>
    </div>
  ))}
</div>
```

## Fluxo de Uso

### 1. Geração Individual

```typescript
try {
  const result = await generateLabelForOrder(order);
  toast.success('Etiqueta gerada com sucesso!');
  window.open(result.labelUrl, '_blank');
} catch (error) {
  const message = getLabelErrorMessage(error);
  
  if (isAddressError(error)) {
    // Mostrar opção de corrigir endereço
    toast.error(message, {
      action: {
        label: 'Corrigir',
        onClick: () => openEditAddressModal(order.id)
      }
    });
  } else if (isRetryableError(error)) {
    // Mostrar opção de tentar novamente
    toast.error(message, {
      action: {
        label: 'Tentar Novamente',
        onClick: () => generateLabelForOrder(order)
      }
    });
  } else {
    // Erro não recuperável
    toast.error(message);
  }
}
```

### 2. Geração em Massa

```typescript
const result = await generateBulkLabels(selectedOrders);

// Abrir modal com resultado
<BulkLabelGenerationModal
  result={result}
  onRetry={(orderIds) => {
    // Tentar novamente apenas os pedidos com erro temporário
    const ordersToRetry = selectedOrders.filter(o => orderIds.includes(o.id));
    generateBulkLabels(ordersToRetry);
  }}
  onEditAddress={(orderId) => {
    // Abrir modal de edição de endereço
    openEditAddressModal(orderId);
  }}
/>
```

## Mensagens de Erro por Código

| Código | Mensagem | Ação Disponível |
|--------|----------|-----------------|
| `ADDRESS_NOT_FOUND` | "Endereço de entrega não encontrado. Verifique o cadastro do cliente." | Corrigir |
| `INVALID_ADDRESS` | "Endereço de entrega incompleto. Campos faltantes: [lista]." | Corrigir |
| `API_ERROR` | "Erro ao comunicar com a API de etiquetas. Tente novamente." | Tentar Novamente |
| `NETWORK_ERROR` | "Erro de conexão. Verifique sua internet e tente novamente." | Tentar Novamente |
| `TIMEOUT_ERROR` | "A operação demorou muito. Tente novamente em alguns instantes." | Tentar Novamente |
| `GENERATION_FAILED` | "Erro ao gerar etiqueta. Tente novamente." | Tentar Novamente |
| `INVALID_ORDER_STATUS` | "Este pedido não pode ter etiqueta gerada no status atual." | Nenhuma |

## Testes

Para testar o tratamento de erros:

1. **Erro de endereço inválido**: Criar pedido com endereço incompleto
2. **Erro de timeout**: Simular timeout na API de etiquetas
3. **Erro de rede**: Desconectar internet durante geração
4. **Erro de status**: Tentar gerar etiqueta para pedido cancelado

## Melhorias Futuras

- [ ] Adicionar telemetria para rastrear tipos de erros mais comuns
- [ ] Implementar retry automático com backoff exponencial
- [ ] Adicionar validação de CEP em tempo real
- [ ] Integrar com serviço de correção de endereços (ex: ViaCEP)
- [ ] Adicionar logs detalhados para debugging
