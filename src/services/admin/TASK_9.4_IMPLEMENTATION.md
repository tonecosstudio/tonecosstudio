# Task 9.4 - Tratamento de Erros Específico para Geração de Etiquetas

## Resumo da Implementação

Implementação completa do tratamento de erros específico para geração de etiquetas de envio, conforme requisitos 8.4, 15.1 e 15.2.

## Requisitos Atendidos

- ✅ **Requisito 8.4**: Tratamento de erro de endereço inválido com identificação de campos faltantes
- ✅ **Requisito 15.1**: Mensagens de erro claras e descritivas
- ✅ **Requisito 15.2**: Mensagem com opção de retry em timeout e erros temporários

## Alterações Realizadas

### 1. Serviço de Etiquetas (`label-service.ts`)

#### Novos Códigos de Erro

Adicionado enum `LabelErrorCode` com códigos específicos:

```typescript
export enum LabelErrorCode {
  ADDRESS_NOT_FOUND = 'ADDRESS_NOT_FOUND',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  GENERATION_FAILED = 'GENERATION_FAILED',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

#### Classe de Erro Aprimorada

```typescript
export class LabelGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly orderId?: string,
    public readonly details?: Record<string, any>  // NOVO: detalhes adicionais
  )
}
```

#### Tratamento Específico de Erros da API

Adicionado tratamento específico para diferentes tipos de erros:

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

#### Novas Funções Auxiliares

**`isRetryableError(error: unknown): boolean`**
- Verifica se um erro pode ser resolvido tentando novamente
- Retorna `true` para: API_ERROR, NETWORK_ERROR, TIMEOUT_ERROR, GENERATION_FAILED

**`isAddressError(error: unknown): boolean`**
- Verifica se um erro é relacionado a endereço inválido
- Retorna `true` para: ADDRESS_NOT_FOUND, INVALID_ADDRESS

**`getMissingAddressFields(error: unknown): string[]`**
- Obtém a lista de campos faltantes de um erro de endereço
- Retorna array de strings com nomes dos campos em português

### 2. Modal de Resultado (`BulkLabelGenerationModal.tsx`)

#### Categorização de Erros

O modal agora categoriza erros em três grupos:

1. **Erros de Endereço** (corrigíveis)
   - Exibidos em seção separada com fundo vermelho
   - Botão "Corrigir" para cada pedido
   - Mensagem clara sobre campos faltantes

2. **Erros Temporários** (recuperáveis)
   - Exibidos em seção separada com fundo amarelo
   - Botão "Tentar Novamente" para todos os pedidos
   - Mensagem explicativa sobre natureza temporária

3. **Outros Erros** (não recuperáveis)
   - Exibidos em seção separada com fundo cinza
   - Sem opções de ação
   - Mensagem descritiva do problema

#### Novas Props

```typescript
interface BulkLabelGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: BulkLabelGenerationResult | null;
  onClose: () => void;
  onRetry?: (orderIds: string[]) => void;        // NOVO
  onEditAddress?: (orderId: string) => void;     // NOVO
}
```

#### Interface Aprimorada

```tsx
{/* Erros de Endereço */}
<div className="space-y-2">
  <h5>Problemas de Endereço ({addressErrors.length})</h5>
  {addressErrors.map(failure => (
    <div className="bg-red-50 border-red-200">
      <span>{failure.customerName}</span>
      <p>{failure.error}</p>
      <Button onClick={() => onEditAddress(failure.orderId)}>
        <Edit /> Corrigir
      </Button>
    </div>
  ))}
</div>

{/* Erros Temporários */}
<div className="space-y-2">
  <h5>Erros Temporários ({retryableErrors.length})</h5>
  <Button onClick={handleRetryFailed}>
    <RefreshCw /> Tentar Novamente
  </Button>
  {retryableErrors.map(failure => (
    <div className="bg-yellow-50 border-yellow-200">
      <span>{failure.customerName}</span>
      <p>{failure.error}</p>
    </div>
  ))}
</div>
```

### 3. Painel de Detalhes (`OrderDetailPanel.tsx`)

#### Tratamento de Erros Individual

Adicionado tratamento específico para geração individual de etiquetas:

```typescript
try {
  const result = await generateLabelForOrder(order);
  // Sucesso...
} catch (error) {
  if (isAddressError(error)) {
    // Erro de endereço - oferecer opção de corrigir
    toast({
      title: '✗ Endereço inválido',
      description: errorMessage,
      action: (
        <Button onClick={() => handleEditAddress()}>
          Corrigir Endereço
        </Button>
      ),
    });
  } else if (isRetryableError(error)) {
    // Erro temporário - oferecer opção de tentar novamente
    toast({
      title: '✗ Erro temporário',
      description: errorMessage,
      action: (
        <Button onClick={() => handleGenerateLabel()}>
          Tentar Novamente
        </Button>
      ),
    });
  } else {
    // Erro não recuperável
    toast({
      title: '✗ Erro ao gerar etiqueta',
      description: errorMessage,
    });
  }
}
```

### 4. Página de Pedidos (`OrdersPage.tsx`)

#### Handlers para Ações

**`handleRetryFailedLabels(orderIds: string[])`**
- Tenta novamente gerar etiquetas para pedidos específicos
- Filtra pedidos da lista atual
- Exibe progresso e resultado

**`handleEditAddress(orderId: string)`**
- Placeholder para funcionalidade de edição de endereço
- Atualmente exibe mensagem informativa
- TODO: Implementar modal de edição

#### Integração com Modal

```tsx
<BulkLabelGenerationModal
  open={isLabelResultModalOpen}
  onOpenChange={setIsLabelResultModalOpen}
  result={labelGenerationResult}
  onClose={handleCloseLabelResultModal}
  onRetry={handleRetryFailedLabels}        // NOVO
  onEditAddress={handleEditAddress}        // NOVO
/>
```

## Fluxo de Uso

### Cenário 1: Endereço Inválido

1. Usuário tenta gerar etiqueta
2. Sistema detecta endereço incompleto
3. Erro `INVALID_ADDRESS` é lançado com campos faltantes
4. Modal exibe erro na seção "Problemas de Endereço"
5. Usuário clica em "Corrigir"
6. Sistema abre edição de endereço (TODO)
7. Após correção, usuário pode tentar novamente

### Cenário 2: Erro de Timeout

1. Usuário tenta gerar etiqueta
2. API de etiquetas demora muito
3. Erro `TIMEOUT_ERROR` é lançado
4. Modal exibe erro na seção "Erros Temporários"
5. Usuário clica em "Tentar Novamente"
6. Sistema reprocessa apenas os pedidos com erro
7. Etiquetas são geradas com sucesso

### Cenário 3: Erro de Rede

1. Usuário tenta gerar etiqueta
2. Conexão com API falha
3. Erro `NETWORK_ERROR` é lançado
4. Toast exibe mensagem com botão "Tentar Novamente"
5. Usuário verifica conexão e tenta novamente
6. Etiquetas são geradas com sucesso

## Mensagens de Erro

| Código | Mensagem | Categoria |
|--------|----------|-----------|
| `ADDRESS_NOT_FOUND` | "Endereço de entrega não encontrado. Verifique o cadastro do cliente." | Endereço |
| `INVALID_ADDRESS` | "Endereço de entrega incompleto. Campos faltantes: [lista]." | Endereço |
| `API_ERROR` | "Erro ao comunicar com a API de etiquetas. Tente novamente." | Temporário |
| `NETWORK_ERROR` | "Erro de conexão. Verifique sua internet e tente novamente." | Temporário |
| `TIMEOUT_ERROR` | "A operação demorou muito. Tente novamente em alguns instantes." | Temporário |
| `GENERATION_FAILED` | "Erro ao gerar etiqueta. Tente novamente." | Temporário |
| `INVALID_ORDER_STATUS` | "Este pedido não pode ter etiqueta gerada no status atual." | Permanente |

## Testes

Todos os testes existentes continuam passando:

```
✓ Label Service (13 tests) 29ms
  ✓ canGenerateLabel (4 tests)
  ✓ getLabelErrorMessage (4 tests)
  ✓ generateBulkLabels (3 tests)
  ✓ openLabelsInTabs (2 tests)
```

## Documentação Adicional

- `LABEL_ERROR_HANDLING.md` - Guia completo de tratamento de erros
- `LABEL_GENERATION_README.md` - Documentação geral do serviço

## Melhorias Futuras

1. **Modal de Edição de Endereço**
   - Implementar modal inline para edição rápida
   - Validação em tempo real de CEP
   - Integração com ViaCEP para autocompletar

2. **Retry Automático**
   - Implementar retry automático com backoff exponencial
   - Configurar número máximo de tentativas
   - Adicionar indicador de tentativas restantes

3. **Telemetria**
   - Rastrear tipos de erros mais comuns
   - Monitorar taxa de sucesso/falha
   - Alertas para problemas recorrentes

4. **Validação Preventiva**
   - Validar endereços antes de permitir geração
   - Exibir avisos para endereços incompletos
   - Sugerir correções automáticas

## Conclusão

A implementação do task 9.4 adiciona tratamento robusto de erros para geração de etiquetas, com:

- ✅ Categorização clara de erros
- ✅ Mensagens descritivas e acionáveis
- ✅ Opções de retry para erros temporários
- ✅ Opções de correção para erros de endereço
- ✅ Interface intuitiva e informativa
- ✅ Todos os testes passando

O sistema agora fornece feedback claro e opções de ação apropriadas para cada tipo de erro, melhorando significativamente a experiência do usuário ao lidar com falhas na geração de etiquetas.
