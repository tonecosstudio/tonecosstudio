# Customer Components

> **Escopo e segurança (04/11/2026):** documentação técnica de módulo **comercial futuro**; não integra o MVP público somente leitura hospedado no Cloudflare Pages. Conteúdo histórico não autoriza deploy, acesso a Supabase, envio de e-mails, operações financeiras nem reutilização de domínios/credenciais da OrdaX. Validar código, identidade, configuração e autorização antes de ativar esta funcionalidade.


Esta pasta concentra a superficie de atendimento do cliente.

## CustomerChat

[CustomerChat](CustomerChat.tsx) e a unica entrada ativa do chat do cliente no app.

### O que ele faz

- renderiza o botao flutuante
- mostra badge de nao lidas
- abre o painel lateral de suporte
- lista conversas do usuario autenticado
- permite abrir nova conversa
- exibe mensagens, anexos e atualizacoes automáticas
- bloqueia envio quando a conversa estiver encerrada

### Dependencias principais

- [useCustomerChatButton](../../hooks/customer/useCustomerChatButton.ts)
- [CustomerMessageList](CustomerMessageList.tsx)
- [CustomerMessageInput](CustomerMessageInput.tsx)
- [useMessages](../../hooks/useMessages.ts)

### Contrato atual

- a criacao de conversa sai apenas de `useCustomerChatButton`
- `CustomerMessageList` e `CustomerMessageInput` recebem essa acao por prop
- anexos usam `useSupportAttachmentPublicUrl` apenas para resolver URL publica

### Integracao

O app monta o chat em [App.tsx](../../App.tsx) com:

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
