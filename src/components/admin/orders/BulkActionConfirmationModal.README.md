# BulkActionConfirmationModal

Modal de confirmação reutilizável para ações em massa em pedidos.

## Visão Geral

O `BulkActionConfirmationModal` é um componente que exibe um modal de confirmação antes de executar ações em massa em pedidos. Ele mostra:

- A ação que será executada
- A lista de pedidos que serão afetados
- Informações adicionais (como novo status)
- Botões de confirmar e cancelar

## Características

- ✅ Reutilizável para diferentes tipos de ações
- ✅ Exibe lista scrollável de pedidos afetados
- ✅ Mostra informações relevantes de cada pedido
- ✅ Suporta estado de loading durante processamento
- ✅ Informações adicionais opcionais
- ✅ Totalmente em português
- ✅ Responsivo e acessível

## Uso Básico

```tsx
import { BulkActionConfirmationModal } from '@/components/admin/orders/BulkActionConfirmationModal';

function MyComponent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<UnifiedOrder[]>([]);

  const handleConfirm = async () => {
    // Executar ação em massa
    await bulkUpdateStatus(selectedOrders, 'in_production');
    setModalOpen(false);
  };

  return (
    <BulkActionConfirmationModal
      open={modalOpen}
      onOpenChange={setModalOpen}
      actionType="update_status"
      orders={selectedOrders}
      onConfirm={handleConfirm}
      onCancel={() => setModalOpen(false)}
    />
  );
}
```

## Props

### `open` (obrigatório)
- **Tipo:** `boolean`
- **Descrição:** Controla se o modal está aberto ou fechado

### `onOpenChange` (obrigatório)
- **Tipo:** `(open: boolean) => void`
- **Descrição:** Callback chamado quando o estado de abertura do modal muda

### `actionType` (obrigatório)
- **Tipo:** `'update_status' | 'generate_labels' | 'export_csv'`
- **Descrição:** Tipo de ação que será executada
- **Efeito:** Determina o título, descrição e texto dos botões

### `orders` (obrigatório)
- **Tipo:** `UnifiedOrder[]`
- **Descrição:** Array de pedidos que serão afetados pela ação

### `onConfirm` (obrigatório)
- **Tipo:** `() => void`
- **Descrição:** Callback chamado quando o usuário confirma a ação

### `onCancel` (obrigatório)
- **Tipo:** `() => void`
- **Descrição:** Callback chamado quando o usuário cancela a ação

### `isLoading` (opcional)
- **Tipo:** `boolean`
- **Padrão:** `false`
- **Descrição:** Indica se a ação está sendo processada
- **Efeito:** Desabilita botões e mostra texto "Processando..."

### `additionalInfo` (opcional)
- **Tipo:** `string`
- **Descrição:** Informação adicional a ser exibida (ex: "Novo status: Em Produção")

## Tipos de Ação

### `update_status`
- **Título:** "Confirmar Atualização de Status"
- **Descrição:** "Você está prestes a atualizar o status de X pedido(s)..."
- **Botão:** "Atualizar Status"

### `generate_labels`
- **Título:** "Confirmar Geração de Etiquetas"
- **Descrição:** "Você está prestes a gerar etiquetas para X pedido(s)..."
- **Botão:** "Gerar Etiquetas"

### `export_csv`
- **Título:** "Confirmar Exportação"
- **Descrição:** "Você está prestes a exportar X pedido(s) para um arquivo CSV."
- **Botão:** "Exportar"

## Informações Exibidas por Pedido

Para cada pedido na lista, o modal exibe:

- **ID do pedido** (primeiros 8 caracteres)
- **Tipo de pedido** (Entrega de Assinatura ou Compra Avulsa)
- **Nome do cliente**
- **Nome da coleção**
- **Status atual**

## Exemplo Completo

Integre o modal diretamente com a `BulkActionsBar` usando os handlers reais da página de pedidos.

## Integração com BulkActionsBar

```tsx
function OrdersPage() {
  const [selectedOrders, setSelectedOrders] = useState<UnifiedOrder[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<BulkActionType>('update_status');

  return (
    <>
      <BulkActionsBar
        selectedCount={selectedOrders.length}
        onUpdateStatus={() => {
          setActionType('update_status');
          setModalOpen(true);
        }}
        onGenerateLabels={() => {
          setActionType('generate_labels');
          setModalOpen(true);
        }}
        onExportCSV={() => {
          setActionType('export_csv');
          setModalOpen(true);
        }}
        onClearSelection={() => setSelectedOrders([])}
      />

      <BulkActionConfirmationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        actionType={actionType}
        orders={selectedOrders}
        onConfirm={handleConfirmAction}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
}
```

## Acessibilidade

- ✅ Suporte completo a teclado
- ✅ Foco gerenciado automaticamente
- ✅ Escape fecha o modal
- ✅ Overlay clicável para fechar
- ✅ Textos descritivos para screen readers

## Responsividade

- ✅ Largura máxima de 2xl (672px)
- ✅ Lista scrollável com altura fixa de 300px
- ✅ Layout adaptável para telas pequenas
- ✅ Botões empilhados em mobile

## Testes

O componente possui cobertura completa de testes unitários. Execute:

```bash
npm test -- BulkActionConfirmationModal.test.tsx
```

## Requisitos Atendidos

Este componente atende aos seguintes requisitos da spec:

- **Requisito 7.4:** Modal de confirmação antes de executar ações em massa
- **Design:** Modal reutilizável com lista de pedidos afetados
- **Task 8.2:** Implementação completa do modal de confirmação

## Dependências

- `@/components/ui/dialog` - Componente Dialog do shadcn/ui
- `@/components/ui/button` - Componente Button do shadcn/ui
- `@/components/ui/scroll-area` - Componente ScrollArea do shadcn/ui
- `@/types/admin/orders` - Tipos TypeScript de pedidos
- `lucide-react` - Ícones
