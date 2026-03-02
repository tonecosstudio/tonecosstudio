# Geração de Etiquetas - Documentação

## Visão Geral

O sistema de geração de etiquetas permite que administradores gerem etiquetas de envio para pedidos individuais e em massa diretamente do painel administrativo.

**Requisitos Implementados**: 8.1, 8.2, 8.4, 8.5

## Arquitetura

### Componentes

1. **label-service.ts** - Serviço principal de geração de etiquetas (individual e em massa)
2. **OrderDetailPanel.tsx** - Interface do usuário com botão de geração individual
3. **BulkActionsBar.tsx** - Barra de ações em massa com botão de geração de etiquetas
4. **BulkLabelGenerationModal.tsx** - Modal de resultado da geração em massa
5. **shipping-service.ts** - Integração com API de transportadora (mock)
6. **orders-validator.ts** - Validação de endereços

### Fluxo de Geração Individual

```
1. Usuário clica em "Gerar Etiqueta" no painel de detalhes
2. Sistema verifica se o pedido pode ter etiqueta gerada (canGenerateLabel)
3. Sistema busca o endereço de entrega do perfil do cliente
4. Sistema valida o endereço (validateDeliveryAddress)
5. Sistema chama o ShippingService para gerar a etiqueta
6. Sistema atualiza o pedido com o código de rastreamento
7. Sistema abre o PDF da etiqueta em nova aba
8. Sistema exibe mensagem de sucesso com código de rastreamento
```

### Fluxo de Geração em Massa

```
1. Usuário seleciona múltiplos pedidos na lista
2. Usuário clica em "Gerar Etiquetas" na barra de ações em massa
3. Sistema exibe modal de confirmação com lista de pedidos
4. Usuário confirma a ação
5. Sistema valida cada pedido (canGenerateLabel)
6. Sistema processa pedidos em lote:
   - Busca endereço de cada pedido
   - Valida endereço
   - Gera etiqueta
   - Atualiza código de rastreamento
7. Sistema coleta sucessos e falhas
8. Sistema exibe modal de resultado com:
   - Contagem de sucessos e falhas
   - Lista de pedidos com problemas
   - Botão para abrir todas as etiquetas geradas
9. Usuário pode abrir todas as etiquetas em abas do navegador
```

## Uso

### No Painel de Detalhes (Geração Individual)

Quando um pedido é aberto no painel de detalhes:

1. Se o pedido **não possui** código de rastreamento
2. E o pedido **não está** cancelado, entregue ou completo
3. Então o botão "Gerar Etiqueta" é exibido

### Na Barra de Ações em Massa (Geração em Massa)

Quando múltiplos pedidos são selecionados:

1. A barra de ações em massa é exibida na parte inferior da tela
2. O botão "Gerar Etiquetas" está disponível
3. Ao clicar, um modal de confirmação é exibido
4. Após confirmação, o sistema processa todos os pedidos
5. Um modal de resultado mostra sucessos e falhas
6. Botão "Abrir Todas as Etiquetas" abre até 10 etiquetas em abas

**Limitações:**
- Máximo de 10 etiquetas abertas automaticamente (para evitar bloqueio do navegador)
- Pedidos com status final (cancelado, entregue, completo, revelado) são automaticamente filtrados
- Pedidos que já possuem código de rastreamento são automaticamente filtrados

### Validações

O sistema valida:

- ✅ Pedido não está em status final (cancelado, entregue, completo, revelado)
- ✅ Pedido não possui código de rastreamento existente
- ✅ Endereço de entrega está completo (rua, número, cidade, estado, CEP)
- ✅ Formato do CEP é válido
- ✅ Código do estado é válido

### Tratamento de Erros

Erros são tratados e exibidos ao usuário com mensagens amigáveis:

| Código do Erro | Mensagem ao Usuário |
|----------------|---------------------|
| `ADDRESS_NOT_FOUND` | "Endereço de entrega não encontrado. Verifique o cadastro do cliente." |
| `INVALID_ADDRESS` | Lista dos campos faltantes (ex: "Campos faltantes: rua, CEP") |
| `GENERATION_FAILED` | "Erro ao gerar etiqueta. Tente novamente." |

## Estrutura de Dados

### DeliveryAddress

```typescript
interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
```

### LabelGenerationResult

```typescript
interface LabelGenerationResult {
  orderId: string;
  labelUrl: string;
  trackingCode: string;
  generatedAt: string;
}
```

### BulkLabelGenerationResult

```typescript
interface BulkLabelGenerationResult {
  successful: LabelGenerationResult[];
  failed: Array<{
    orderId: string;
    customerName: string;
    error: string;
    errorCode?: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}
```

## Armazenamento de Endereços

Os endereços são armazenados na tabela `profiles` no campo `address` como JSON:

```json
{
  "street": "Rua das Flores",
  "number": "123",
  "complement": "Apt 45",
  "neighborhood": "Centro",
  "city": "Salvador",
  "state": "BA",
  "zipCode": "40000-000",
  "country": "Brasil"
}
```

O sistema suporta tanto nomes em inglês quanto em português:
- `street` ou `rua`
- `number` ou `numero`
- `city` ou `cidade`
- `state` ou `estado`
- `zipCode` ou `cep`

## Integração com Transportadora

Atualmente, o sistema usa uma implementação **mock** do ShippingService que:

- Gera códigos de rastreamento fictícios no formato Correios (BR123456789BR)
- Retorna URLs de etiquetas mock
- Simula delays de API

### Para Produção

Para integrar com uma API real de transportadora:

1. Edite `src/services/shipping-service.ts`
2. Implemente os métodos `generateCorreiosLabel()` ou `generatePrivateCarrierLabel()`
3. Configure as variáveis de ambiente:
   - `VITE_SHIPPING_CARRIER` - 'correios' ou 'private'
   - `VITE_SHIPPING_API_KEY` - Chave da API
   - `VITE_SHIPPING_API_URL` - URL base da API
   - `VITE_SHIPPING_CONTRACT_CODE` - Código do contrato (Correios)
   - `VITE_SHIPPING_SERVICE_CODE` - Código do serviço (ex: '04014' para SEDEX)

## Atualização Automática de Status

Quando uma etiqueta é gerada com sucesso:

1. O código de rastreamento é salvo no pedido
2. O status do pedido é automaticamente atualizado para `shipped` (enviado)
3. O campo `updated_at` é atualizado

## Testes

Execute os testes com:

```bash
npm run test -- src/services/admin/label-service.test.ts --run
```

Os testes cobrem:
- ✅ Validação de pedidos que podem ter etiqueta gerada
- ✅ Mensagens de erro apropriadas
- ✅ Lógica de negócio do `canGenerateLabel()`
- ✅ Geração de etiquetas em massa com array vazio
- ✅ Filtragem de pedidos inválidos na geração em massa
- ✅ Tratamento de pedidos com código de rastreamento existente
- ✅ Abertura de etiquetas em abas do navegador
- ✅ Respeito ao limite máximo de abas

## API do Serviço

### `generateLabelForOrder(order: UnifiedOrder): Promise<LabelGenerationResult>`

Gera etiqueta para um pedido individual.

**Throws:**
- `LabelGenerationError` com código `ADDRESS_NOT_FOUND` se endereço não for encontrado
- `LabelGenerationError` com código `INVALID_ADDRESS` se endereço estiver incompleto
- `LabelGenerationError` com código `GENERATION_FAILED` se houver erro na geração

### `generateBulkLabels(orders: UnifiedOrder[]): Promise<BulkLabelGenerationResult>`

Gera etiquetas para múltiplos pedidos em massa.

**Comportamento:**
- Filtra automaticamente pedidos que não podem ter etiqueta gerada
- Processa pedidos sequencialmente
- Coleta sucessos e falhas
- Não lança exceções - retorna resultado com sucessos e falhas

### `canGenerateLabel(order: UnifiedOrder): boolean`

Verifica se um pedido pode ter etiqueta gerada.

**Retorna `false` se:**
- Status é `cancelled`, `delivered`, `completed` ou `revealed`
- Pedido já possui código de rastreamento

### `openLabelsInTabs(labelResults: LabelGenerationResult[], maxTabs?: number): void`

Abre múltiplas etiquetas em abas do navegador.

**Parâmetros:**
- `labelResults` - Array de resultados de geração de etiquetas
- `maxTabs` - Número máximo de abas a abrir (padrão: 10)

**Comportamento:**
- Adiciona delay de 100ms entre aberturas para evitar bloqueio
- Exibe aviso no console se houver mais etiquetas que o limite

### `getLabelErrorMessage(error: unknown): string`

Retorna mensagem de erro amigável para o usuário.

**Códigos de erro:**
- `ADDRESS_NOT_FOUND` - "Endereço de entrega não encontrado. Verifique o cadastro do cliente."
- `INVALID_ADDRESS` - Mensagem com lista de campos faltantes
- `GENERATION_FAILED` - "Erro ao gerar etiqueta. Tente novamente."
- Outros - "Erro desconhecido ao gerar etiqueta."

## Próximos Passos

As próximas fases implementarão:
- ~~Geração de etiquetas em massa para múltiplos pedidos~~ ✅ **Concluído (Task 9.3)**
- ~~Validação de endereços em lote~~ ✅ **Concluído (Task 9.3)**
- ~~Relatório de sucessos e falhas~~ ✅ **Concluído (Task 9.3)**
- ~~Download de múltiplas etiquetas~~ ✅ **Concluído (Task 9.3)**
- Exportação CSV de pedidos (Task 10.1-10.5)

## Exemplos de Uso

### Geração Individual

```typescript
import { generateLabelForOrder } from '@/services/admin/label-service';

try {
  const result = await generateLabelForOrder(order);
  console.log('Etiqueta gerada:', result.labelUrl);
  console.log('Código de rastreamento:', result.trackingCode);
  
  // Abrir etiqueta em nova aba
  window.open(result.labelUrl, '_blank');
} catch (error) {
  if (error instanceof LabelGenerationError) {
    console.error('Erro:', error.message);
  }
}
```

### Geração em Massa

```typescript
import { generateBulkLabels, openLabelsInTabs } from '@/services/admin/label-service';

const result = await generateBulkLabels(selectedOrders);

console.log(`${result.successCount} etiquetas geradas com sucesso`);
console.log(`${result.failureCount} falhas`);

// Abrir todas as etiquetas geradas
if (result.successful.length > 0) {
  openLabelsInTabs(result.successful);
}

// Exibir pedidos com falha
result.failed.forEach(failure => {
  console.error(`${failure.customerName}: ${failure.error}`);
});
```

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do console para erros detalhados
2. Confirme que o endereço do cliente está completo no perfil
3. Verifique as variáveis de ambiente do ShippingService
