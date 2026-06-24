# Customer Components

Esta pasta concentra a superficie de atendimento do cliente.

## CustomerChat

[CustomerChat](</C:/Users/Casa/Documents/Novo github/ordax/src/components/customer/CustomerChat.tsx>) e a unica entrada ativa do chat do cliente no app.

### O que ele faz

- renderiza o botao flutuante
- mostra badge de nao lidas
- abre o painel lateral de suporte
- lista conversas do usuario autenticado
- permite abrir nova conversa
- exibe mensagens, anexos e atualizacoes automáticas
- bloqueia envio quando a conversa estiver encerrada

### Dependencias principais

- [useCustomerChatButton](</C:/Users/Casa/Documents/Novo github/ordax/src/hooks/customer/useCustomerChatButton.ts>)
- [CustomerMessageList](</C:/Users/Casa/Documents/Novo github/ordax/src/components/customer/CustomerMessageList.tsx>)
- [CustomerMessageInput](</C:/Users/Casa/Documents/Novo github/ordax/src/components/customer/CustomerMessageInput.tsx>)
- [useMessages](</C:/Users/Casa/Documents/Novo github/ordax/src/hooks/useMessages.ts>)

### Contrato atual

- a criacao de conversa sai apenas de `useCustomerChatButton`
- `CustomerMessageList` e `CustomerMessageInput` recebem essa acao por prop
- anexos usam `useSupportAttachmentPublicUrl` apenas para resolver URL publica

### Integracao

O app monta o chat em [App.tsx](</C:/Users/Casa/Documents/Novo github/ordax/src/App.tsx>) com:

```tsx
import { CustomerChat } from "@/components/customer/CustomerChat";

function AppShell() {
  return (
    <>
      <CustomerChat />
    </>
  );
}
```

### Validacao recomendada

1. autenticar um usuario
2. abrir o botao flutuante
3. criar nova conversa
4. enviar texto e anexo
5. fechar a conversa no admin e verificar bloqueio de envio
6. reabrir nova solicitacao

### Observacao importante

Nao reintroduzir `ChatButton` nem fluxo local de criacao de conversa nos componentes filhos. O SSOT dessa trilha e `useCustomerChatButton`.
