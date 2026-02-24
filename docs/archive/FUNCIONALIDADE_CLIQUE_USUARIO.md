# Funcionalidade: Clique no Nome do Usuário

## Implementação Concluída ✅

Agora no chat de suporte, o admin pode clicar no nome do usuário no cabeçalho da conversa para abrir o sidebar com todos os dados do cliente.

## Como Funciona

1. **No cabeçalho do chat**: O nome do usuário aparece como um link clicável
2. **Ao clicar**: Abre automaticamente o CustomerSidebar com:
   - Pedidos do cliente
   - Orçamentos
   - Assinatura (se houver)
   - Histórico de pagamentos

## Componentes Modificados

### 1. AdminSupportV2.tsx
- Adicionado estado para controlar o sidebar (`sidebarUserId`, `sidebarOpen`)
- Adicionado função `handleOpenSidebar` para abrir o sidebar
- Integrado o `CustomerSidebar` no layout
- Passa a função `onOpenUserSidebar` para o `ChatInterface`

### 2. ChatInterface.tsx
- Adicionado prop `onOpenUserSidebar`
- Carrega os dados da conversa usando `conversationService.getConversation()`
- Passa os dados da conversa (incluindo `userId`) para o `ChatHeader`
- Integrado o `ChatHeader` no layout

### 3. ChatHeader.tsx
- Adicionado props `userId` e `onUserClick`
- Nome do usuário agora é clicável quando `userId` e `onUserClick` estão presentes
- Adicionado ícone de usuário para indicar que é clicável
- Adicionado hover effect e cursor pointer
- Adicionado tooltip "Clique para ver dados do cliente"

## Experiência do Usuário

- **Visual**: Nome do usuário muda de cor ao passar o mouse (hover)
- **Cursor**: Muda para pointer indicando que é clicável
- **Ícone**: Pequeno ícone de usuário ao lado do nome
- **Tooltip**: Mensagem explicativa ao passar o mouse
- **Sidebar**: Abre suavemente do lado direito com todos os dados

## Teste

Para testar:
1. Acesse a página de suporte admin
2. Selecione uma conversa
3. Clique no nome do usuário no topo do chat
4. O sidebar deve abrir mostrando pedidos, orçamentos, assinatura e pagamentos

## Próximos Passos Possíveis

- Adicionar loading state enquanto carrega dados do usuário
- Adicionar cache dos dados do usuário
- Adicionar botão para fechar o sidebar (já existe o X padrão do Sheet)
- Adicionar atalho de teclado para abrir/fechar o sidebar
