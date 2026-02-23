# Requirements Document

## Introduction

Este documento especifica as correções críticas necessárias para tornar o sistema de chat pronto para produção profissional. O sistema está 85% completo, mas três problemas impedem o lançamento: notificações por email não funcionais, sistema de anexos com workaround temporário, e ausência de indicador de digitação em tempo real.

## Glossary

- **Chat_System**: Sistema de suporte ao cliente via chat em tempo real
- **Email_Notifier**: Componente responsável por enviar notificações por email
- **Attachment_Handler**: Componente que gerencia upload e exibição de anexos
- **Typing_Indicator**: Componente que mostra quando um usuário está digitando
- **Admin**: Usuário do sistema que responde mensagens de clientes
- **Customer**: Usuário final que envia mensagens através do chat
- **Realtime_Subscription**: Mecanismo do Supabase para receber atualizações em tempo real
- **Edge_Function**: Função serverless executada no Supabase Edge Runtime
- **Optimistic_Update**: Técnica de atualizar UI imediatamente antes da confirmação do servidor
- **Broadcast_Channel**: Canal do Supabase Realtime para comunicação pub/sub

## Requirements

### Requirement 1: Notificações por Email Funcionais

**User Story:** Como um cliente, eu quero receber emails quando um admin responde minhas mensagens, para que eu não perca comunicações importantes mesmo quando estou offline.

#### Acceptance Criteria

1. WHEN an Admin sends a message to a Customer, THE Email_Notifier SHALL check if the Customer is offline
2. IF the Customer is offline, THEN THE Email_Notifier SHALL send an email notification within 30 seconds
3. THE Email_Notifier SHALL use a production-ready email service (Resend or SendGrid)
4. THE Email_Notifier SHALL format emails using a responsive HTML template
5. THE Email_Notifier SHALL include a direct link to the conversation in the email
6. WHEN multiple messages are sent within 5 minutes, THE Email_Notifier SHALL group them into a single email
7. THE Email_Notifier SHALL implement the functionality via a Supabase Edge Function
8. WHEN email sending fails, THE Email_Notifier SHALL log the error and retry up to 3 times with exponential backoff
9. THE Email_Notifier SHALL track email delivery status in the database

### Requirement 2: Sistema de Anexos sem Workarounds

**User Story:** Como um usuário do chat, eu quero que anexos apareçam instantaneamente após o upload, para que a experiência seja fluida e profissional.

#### Acceptance Criteria

1. WHEN a Customer uploads an attachment, THE Attachment_Handler SHALL display it immediately using optimistic update
2. THE Attachment_Handler SHALL NOT use setTimeout or artificial delays
3. THE Attachment_Handler SHALL NOT use refreshKey or force component remounts
4. THE Realtime_Subscription SHALL correctly capture and broadcast attachment events
5. WHEN an attachment upload completes, THE Attachment_Handler SHALL update the message with the confirmed attachment data
6. IF an attachment upload fails, THEN THE Attachment_Handler SHALL show an error state and allow retry
7. THE Attachment_Handler SHALL maintain message order consistency during optimistic updates
8. WHEN another user sends an attachment, THE Attachment_Handler SHALL display it in real-time without manual refresh

### Requirement 3: Indicador de Digitação em Tempo Real

**User Story:** Como um usuário do chat, eu quero ver quando a outra pessoa está digitando, para que eu saiba que minha mensagem está sendo respondida.

#### Acceptance Criteria

1. WHEN a user types in the message input, THE Typing_Indicator SHALL broadcast a typing event after 300ms debounce
2. WHEN a typing event is received, THE Typing_Indicator SHALL display "[Nome] está digitando..." to other participants
3. THE Typing_Indicator SHALL use Supabase Realtime Broadcast Channel for communication
4. WHEN a user stops typing for 3 seconds, THE Typing_Indicator SHALL automatically hide the indicator
5. WHEN a user sends a message, THE Typing_Indicator SHALL immediately clear the typing state
6. THE Typing_Indicator SHALL show typing status for both Admin and Customer roles
7. THE Typing_Indicator SHALL handle multiple concurrent typing users by showing "Fulano e Ciclano estão digitando..."
8. THE Typing_Indicator SHALL NOT send typing events when the input is empty

### Requirement 4: Integração e Qualidade do Código

**User Story:** Como um desenvolvedor, eu quero que as correções sejam implementadas com qualidade profissional, para que o sistema seja mantível e confiável.

#### Acceptance Criteria

1. THE Chat_System SHALL remove all setTimeout workarounds from ChatButton.tsx
2. THE Chat_System SHALL remove the refreshKey mechanism from useMessages.ts
3. THE Chat_System SHALL implement proper error handling for all new features
4. THE Chat_System SHALL include TypeScript types for all new interfaces and functions
5. THE Chat_System SHALL maintain backward compatibility with existing chat functionality
6. WHEN any of the three fixes is deployed, THE Chat_System SHALL NOT break existing features
7. THE Chat_System SHALL include logging for debugging production issues
8. THE Chat_System SHALL complete all fixes within 6 hours of development time

### Requirement 5: Configuração e Deployment

**User Story:** Como um administrador do sistema, eu quero que as configurações de email sejam facilmente gerenciáveis, para que eu possa trocar provedores ou atualizar credenciais sem modificar código.

#### Acceptance Criteria

1. THE Email_Notifier SHALL read email service credentials from environment variables
2. THE Email_Notifier SHALL support both Resend and SendGrid through configuration
3. THE Chat_System SHALL provide clear documentation for deploying the Edge Function
4. THE Chat_System SHALL include example environment variable configuration
5. WHERE the email service is not configured, THE Email_Notifier SHALL log warnings but not crash
6. THE Chat_System SHALL validate email service configuration on startup
7. THE Chat_System SHALL provide a test endpoint to verify email functionality

## Success Criteria

O sistema será considerado pronto para produção quando:

1. Clientes receberem emails reais quando admins responderem (testado com usuário offline)
2. Anexos aparecerem instantaneamente sem setTimeout ou refreshKey
3. Indicador "está digitando..." funcionar em tempo real para ambos os lados
4. Todos os workarounds temporários forem removidos do código
5. Sistema passar em testes de integração end-to-end
6. Tempo total de implementação não exceder 6 horas

## Technical Constraints

- Deve usar Supabase Edge Functions para envio de emails
- Deve usar Supabase Realtime para typing indicator
- Deve manter compatibilidade com código existente
- Deve funcionar com a estrutura atual do banco de dados
- Não deve requerer mudanças em migrations já aplicadas
