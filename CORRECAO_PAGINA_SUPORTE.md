# Correção da Página de Suporte

## Problema Identificado

A página `/suporte` estava apresentando 3 headers e sem sidebar devido a:

1. **Duplicação de componentes**: O `ChatButton` estava sendo renderizado globalmente no `App.tsx`, criando conflito com a página `/suporte` que já tem sua própria interface de chat
2. **Falta de lógica para URL**: Não havia tratamento para o parâmetro `conversation` na URL (`/suporte?conversation=xxx`)
3. **Possível renderização múltipla**: Headers sendo renderizados várias vezes

## Correções Aplicadas

### 1. ChatButton.tsx
- Adicionado `useLocation` do react-router-dom
- Implementada verificação para não renderizar o botão quando estiver na página `/suporte`
- Isso evita duplicação de interfaces de chat

```typescript
// Não renderizar o botão na página de suporte para evitar duplicação
if (location.pathname === '/suporte') {
  return null;
}
```

### 2. Support.tsx
- Adicionado `useSearchParams` para ler parâmetros da URL
- Implementada lógica para abrir conversa específica via URL
- Corrigida dependência do useEffect para incluir `conversationIdFromUrl`

```typescript
const [searchParams] = useSearchParams();
const conversationIdFromUrl = searchParams.get("conversation");

// Lógica para selecionar conversa da URL
if (conversationIdFromUrl && data) {
  const conversationFromUrl = data.find(c => c.id === conversationIdFromUrl);
  if (conversationFromUrl) {
    setSelectedConversation(conversationFromUrl);
  }
}
```

## Resultado Esperado

Agora a página `/suporte` deve:
- Exibir apenas 1 header (do AppShell)
- Não mostrar o ChatButton flutuante (evitando duplicação)
- Abrir conversas específicas quando acessada via URL com parâmetro `conversation`
- Funcionar corretamente sem conflitos de interface

## Como Testar

1. Acesse `http://localhost:8080/suporte`
2. Verifique que há apenas 1 header
3. Teste abrir uma conversa específica: `http://localhost:8080/suporte?conversation=11bced61-f539-4e50-8c9a-e5c0895ebd0c`
4. Verifique que o ChatButton flutuante não aparece nesta página
5. Navegue para outras páginas e confirme que o ChatButton aparece normalmente
