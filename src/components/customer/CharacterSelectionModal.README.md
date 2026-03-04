# CharacterSelectionModal Component

## Overview

O `CharacterSelectionModal` é um componente modal que permite aos clientes selecionar seu personagem favorito de uma coleção. O componente exibe todos os personagens disponíveis em um grid responsivo, mostra indicadores de estoque, exibe uma contagem regressiva do prazo de forma proeminente e gerencia o processo de seleção e submissão.

## Requisitos

- **Requirements**: 2.2.2 (Customer Choice Submission), 2.4.3 (Character Selection Interface)
- **Task**: 3.2.1 Create CharacterSelectionModal component

## Funcionalidades

### 1. Exibição de Personagens em Grid

- Grid responsivo (2 colunas em mobile, 3 em desktop)
- Imagens dos personagens com aspect ratio quadrado
- Nomes e descrições dos personagens
- Suporte para personagens sem imagem (mostra ícone de placeholder)

### 2. Indicadores de Estoque

- **Estoque Baixo**: Badge vermelho para personagens com estoque ≤ 5 unidades
- **Indisponível**: Overlay escuro com ícone X para personagens sem estoque
- **Contagem de Estoque**: Mostra quantidade disponível abaixo da descrição
- **Desabilitação**: Personagens indisponíveis não podem ser selecionados

### 3. Contagem Regressiva do Prazo

- **Alerta Proeminente**: Exibido no topo do modal
- **Cores por Urgência**:
  - Verde: > 3 dias restantes
  - Amarelo: 1-3 dias restantes
  - Vermelho: < 24 horas restantes
- **Prazo Expirado**: Alerta vermelho e desabilitação da seleção

### 4. Preview ao Passar o Mouse

- Efeito de zoom na imagem (scale 110%)
- Borda destacada em azul primário
- Sombra elevada no card
- Transições suaves

### 5. Fluxo de Seleção

1. Cliente visualiza grid de personagens
2. Cliente clica em um personagem (visual feedback imediato)
3. Cliente clica em "Continuar"
4. Modal mostra tela de confirmação com personagem selecionado
5. Cliente confirma ou volta para selecionar outro
6. Após confirmação, escolha é enviada para aprovação

### 6. Estados de Loading e Erro

- **Loading**: Skeleton grid com 6 placeholders
- **Erro**: Alert vermelho com mensagem de erro
- **Sem Personagens**: Alert informativo
- **Submissão**: Botão desabilitado com texto "Enviando..."

## Props

```typescript
interface CharacterSelectionModalProps {
  open: boolean;                    // Controla visibilidade do modal
  onOpenChange: (open: boolean) => void;  // Callback para mudanças de estado
  orderId: string;                  // ID do pedido
  collectionId: string;             // ID da coleção para buscar personagens
  deadline: string | null;          // Prazo ISO 8601 para escolha
  onSuccess?: () => void;           // Callback opcional após sucesso
}
```

## Uso

### Exemplo Básico

```tsx
import { CharacterSelectionModal } from "@/components/customer/CharacterSelectionModal";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Escolher Personagem
      </Button>

      <CharacterSelectionModal
        open={isOpen}
        onOpenChange={setIsOpen}
        orderId="order-123"
        collectionId="collection-456"
        deadline="2024-12-31T23:59:59Z"
        onSuccess={() => {
          console.log("Escolha enviada com sucesso!");
        }}
      />
    </>
  );
}
```

### Integração com CharacterChoiceCard

```tsx
import { CharacterChoiceCard } from "@/components/customer/CharacterChoiceCard";
import { CharacterSelectionModal } from "@/components/customer/CharacterSelectionModal";

function OrderProgressPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <CharacterChoiceCard
        orderId="order-123"
        orderType="subscription_delivery"
        choiceStatus="pending"
        choiceDeadline="2024-12-31T23:59:59Z"
        characterName={null}
        characterImageUrl={null}
        onChooseClick={() => setShowModal(true)}
      />

      <CharacterSelectionModal
        open={showModal}
        onOpenChange={setShowModal}
        orderId="order-123"
        collectionId="collection-456"
        deadline="2024-12-31T23:59:59Z"
        onSuccess={() => {
          // Refresh order data
          queryClient.invalidateQueries(["order-progress"]);
        }}
      />
    </>
  );
}
```

## Dependências

### Serviços

- `getAvailableCharacters(collectionId)`: Busca personagens disponíveis
- `submitCharacterChoice(orderId, characterId)`: Submete escolha do cliente

### UI Components

- `Dialog`, `DialogContent`, `DialogHeader`, etc. (shadcn/ui)
- `Button`, `Badge`, `Alert`, `ScrollArea`, `Skeleton`

### Bibliotecas

- `@tanstack/react-query`: Gerenciamento de estado e cache
- `date-fns`: Formatação de datas e cálculos de tempo
- `lucide-react`: Ícones

## Comportamento

### Validações

1. **Prazo Expirado**: Desabilita seleção e mostra alerta
2. **Nenhum Personagem Selecionado**: Mostra toast ao tentar continuar
3. **Personagem Indisponível**: Não permite seleção
4. **Erro de Submissão**: Mantém modal aberto e mostra toast de erro

### Invalidação de Cache

Após submissão bem-sucedida, o componente invalida as seguintes queries:
- `customer-order-progress`: Atualiza página de progresso do pedido
- `character-choice`: Atualiza dados da escolha

### Reset de Estado

Quando o modal é aberto:
- Seleção anterior é limpa
- Volta para tela de grid (não confirmação)
- Recarrega personagens disponíveis

## Acessibilidade

- **Keyboard Navigation**: Todos os elementos são navegáveis por teclado
- **Focus Management**: Focus ring visível em elementos interativos
- **Screen Readers**: Labels descritivos e alt text em imagens
- **Disabled States**: Elementos desabilitados têm cursor apropriado
- **ARIA**: Dialog usa primitivos Radix UI com ARIA correto

## Responsividade

- **Mobile (< 768px)**: Grid de 2 colunas
- **Desktop (≥ 768px)**: Grid de 3 colunas
- **Modal**: Max-width 4xl (896px)
- **Altura**: Max 90vh com scroll interno
- **Imagens**: Aspect ratio mantido em todos os tamanhos

## Testes

O componente possui testes abrangentes cobrindo:

1. **Display e Layout**: Renderização de título, descrição, grid
2. **Indicadores de Estoque**: Badges, overlays, contagens
3. **Contagem Regressiva**: Alertas normais, urgentes e expirados
4. **Seleção**: Clique, visual feedback, confirmação
5. **Submissão**: Sucesso, erro, loading states
6. **Estados**: Loading skeleton, mensagens de erro
7. **Comportamento do Modal**: Abrir, fechar, reset

Execute os testes:

```bash
npm test CharacterSelectionModal.test.tsx
```

## Melhorias Futuras

1. **Filtros**: Adicionar filtros por tipo, raridade, etc.
2. **Busca**: Campo de busca para encontrar personagens
3. **Favoritos**: Marcar personagens favoritos
4. **Comparação**: Comparar múltiplos personagens lado a lado
5. **Animações**: Transições mais elaboradas entre estados
6. **Preview Expandido**: Modal de preview com mais detalhes
7. **Histórico**: Mostrar escolhas anteriores (se permitido)

## Notas de Implementação

### Performance

- Usa `React.memo` implicitamente via componentes funcionais
- Query cache evita re-fetches desnecessários
- Imagens lazy-loaded pelo navegador
- ScrollArea virtualizado para grandes listas (se necessário)

### Segurança

- Validação de prazo no cliente E servidor
- RLS policies garantem acesso apenas a próprias escolhas
- Sanitização de inputs no serviço

### UX

- Feedback visual imediato em todas as ações
- Mensagens de erro claras e acionáveis
- Confirmação antes de submissão final
- Possibilidade de voltar e mudar seleção

## Suporte

Para dúvidas ou problemas:
1. Verifique os testes para exemplos de uso
2. Consulte a documentação do serviço `choice-service.ts`
3. Revise os requisitos no `requirements.md`
4. Entre em contato com a equipe de desenvolvimento
