# Requirements Document - Sistema de Chat Centralizado (MVP)

## Introduction

Este documento define os requisitos para o Sistema de Chat e Suporte Centralizado da plataforma Ordax. O sistema substituirá a implementação básica atual (`AdminSupport.tsx`) por uma solução **robusta, pragmática e focada em resolver problemas reais**.

### Princípios de Design

1. **Centralização de Atendimento**: Todas as conversas em um único lugar
2. **Automação de Status de Pedidos**: Reduzir mensagens repetitivas sobre "onde está meu pedido?"
3. **Organização Interna**: Ferramentas para equipe pequena (1-2 atendentes) trabalhar de forma eficiente
4. **Simplicidade Operacional**: Fácil de usar, estável, sem complexidade desnecessária

### Escopo Inicial

- **Operação**: 1-2 atendentes
- **Volume**: Até 200 conversas/mês
- **Arquitetura**: Modular para expansão futura

### O que NÃO está no MVP

Funcionalidades que serão consideradas apenas quando houver:
- 3+ atendentes
- 200+ conversas/mês
- Receita estável

Exemplos: modo offline complexo, performance para 10k usuários simultâneos, otimizações prematuras.

**Princípio**: Resolver problemas reais de hoje, não problemas hipotéticos de amanhã.

## Glossary

- **Chat_System**: O sistema centralizado de chat e suporte
- **Admin**: Usuário administrador da plataforma Ordax
- **User**: Qualquer usuário da plataforma (cliente, assinante, lead ou visitante)
- **Client**: Usuário que já realizou pelo menos uma compra
- **Subscriber**: Usuário com assinatura ativa
- **Lead**: Usuário registrado que ainda não comprou
- **Conversation**: Thread de mensagens entre usuário e suporte
- **Message**: Unidade individual de comunicação
- **Order**: Pedido de compra
- **Quote**: Orçamento solicitado
- **Subscription**: Assinatura recorrente
- **Internal_Note**: Anotação visível apenas para admins
- **Conversation_Tag**: Categoria para organização (pedido, orçamento, dúvida, reclamação, assinatura)
- **Order_Status**: Estado do pedido (aguardando_pagamento, em_producao, enviado, entregue)
- **Tracking_Code**: Código de rastreamento
- **Quick_Reply**: Resposta rápida pré-configurada
- **Status_Update**: Atualização automática de status

## Estratégia de Comunicação

### Decisão Estratégica: Chat vs Email

**Pergunta crítica:** O chat deve ser a central de comunicação ou o email deve ser primário?

**Decisão para MVP:**
- **Email é primário** para notificações automáticas (status de pedido, pagamento)
- **Chat é secundário** para suporte ativo e dúvidas
- **Conversa automática** é criada quando há interação do cliente, não automaticamente para todos os pedidos

**Justificativa:**
1. Nem todos os clientes usam chat ativamente
2. Email tem maior alcance e taxa de abertura
3. Chat sem interação vira "conversa fantasma"
4. Permite transição gradual: email → chat quando cliente engaja

**Implementação:**
- Status de pedido: Email + criar conversa SE cliente já usou chat antes
- Pagamento pendente: Email + criar conversa SE valor > R$500
- Orçamento: Email + criar conversa sempre (oportunidade de venda)

## Requirements

### Requirement 1: Lista Centralizada de Conversas

**User Story:** Como Admin, eu quero visualizar todas as conversas em uma lista centralizada, para que eu possa gerenciar todos os atendimentos em um único lugar.

#### Acceptance Criteria

1. THE Chat_System SHALL display all conversations in a single list ordered by most recent activity
2. FOR EACH conversation, THE Chat_System SHALL display user name, last message preview (50 chars), timestamp, and unread count
3. THE Chat_System SHALL update the conversation list in real-time when new messages arrive
4. THE Chat_System SHALL support basic search by user name or email
5. THE Chat_System SHALL support filtering by status (aberta, aguardando_usuario, resolvida)
6. THE Chat_System SHALL load the conversation list within 2 seconds
7. THE Chat_System SHALL highlight conversations with unread messages with visual indicator

### Requirement 2: Interface de Chat Simples e Funcional

**User Story:** Como Admin, eu quero uma interface de chat clara e funcional, para que eu possa responder usuários rapidamente sem complexidade desnecessária.

#### Acceptance Criteria

1. THE Chat_System SHALL display a two-panel layout: conversation list on left (30% width), active chat on right (70% width)
2. WHEN an Admin selects a conversation, THE Chat_System SHALL load the message history within 1 second
3. THE Chat_System SHALL display messages in chronological order with sender name and timestamp (HH:mm format)
4. THE Chat_System SHALL visually distinguish Admin messages (right-aligned, blue) from User messages (left-aligned, gray)
5. THE Chat_System SHALL auto-scroll to the most recent message when opening a conversation
6. THE Chat_System SHALL support text messages up to 2000 characters
7. THE Chat_System SHALL display a simple text input with send button (Enter to send, Shift+Enter for line break)

### Requirement 3: Envio e Recebimento de Mensagens

**User Story:** Como Admin, eu quero enviar e receber mensagens de forma confiável, para que eu possa manter comunicação efetiva com usuários.

#### Acceptance Criteria

1. WHEN an Admin sends a message, THE Chat_System SHALL deliver it within 3 seconds
2. WHEN a user sends a message, THE Chat_System SHALL display it to Admin within 3 seconds
3. THE Chat_System SHALL store all messages permanently in the database
4. THE Chat_System SHALL support line breaks in messages
5. IF message sending fails, THEN THE Chat_System SHALL display error and allow retry
6. THE Chat_System SHALL prevent sending empty messages
7. THE Chat_System SHALL display sending status (enviando, enviado, falhou)

### Requirement 4: Anexos Básicos

**User Story:** Como Admin, eu quero enviar e receber imagens e PDFs, para que eu possa compartilhar comprovantes e documentos com usuários.

#### Acceptance Criteria

1. THE Chat_System SHALL support attaching images (JPEG, PNG) up to 5MB
2. THE Chat_System SHALL support attaching PDF documents up to 5MB
3. WHEN an image is attached, THE Chat_System SHALL display a thumbnail preview (200x200px)
4. WHEN a PDF is attached, THE Chat_System SHALL display filename with PDF icon
5. WHEN a user clicks an attachment, THE Chat_System SHALL allow download
6. THE Chat_System SHALL validate file type and size before upload
7. IF upload fails, THEN THE Chat_System SHALL display clear error message

### Requirement 5: Histórico de Conversas

**User Story:** Como Admin, eu quero acessar o histórico completo de cada conversa, para que eu possa entender o contexto antes de responder.

#### Acceptance Criteria

1. THE Chat_System SHALL store all messages permanently
2. WHEN opening a conversation, THE Chat_System SHALL load the most recent 50 messages
3. WHEN Admin scrolls up, THE Chat_System SHALL load previous 50 messages automatically (infinite scroll)
4. THE Chat_System SHALL display date separators when messages span multiple days
5. THE Chat_System SHALL maintain scroll position when loading older messages
6. THE Chat_System SHALL allow exporting conversation as text file

### Requirement 6: Automação de Status de Pedidos ⭐ PRIORIDADE MÁXIMA

**User Story:** Como Admin, eu quero que o sistema notifique automaticamente os clientes sobre mudanças de status dos pedidos, para que eu não precise responder "onde está meu pedido?" manualmente.

#### Acceptance Criteria

1. WHEN an Order_Status changes to "em_producao", THE Chat_System SHALL send automatic message to Client within 1 minute
2. WHEN an Order_Status changes to "enviado", THE Chat_System SHALL send automatic message with Tracking_Code to Client within 1 minute
3. WHEN an Order_Status changes to "entregue", THE Chat_System SHALL send automatic message to Client within 1 minute
4. THE Chat_System SHALL support Order_Status values: aguardando_pagamento, em_producao, enviado, entregue
5. THE Chat_System SHALL create a Conversation automatically if one doesn't exist for the Client
6. THE Chat_System SHALL display Order details (number, items, value) in the automatic message
7. THE Chat_System SHALL allow Admin to customize automatic message templates
8. THE Chat_System SHALL log all automatic messages in conversation history

### Requirement 7: Visualização de Pedidos na Conversa

**User Story:** Como Admin, eu quero ver os pedidos do cliente dentro da conversa, para que eu possa responder perguntas sobre pedidos rapidamente.

#### Acceptance Criteria

1. WHEN viewing a conversation with a Client, THE Chat_System SHALL display a sidebar with Client's orders
2. FOR EACH order, THE Chat_System SHALL display order number, date, total value, and current status
3. THE Chat_System SHALL allow Admin to click an order to view full details
4. THE Chat_System SHALL display Tracking_Code if order status is "enviado" or "entregue"
5. THE Chat_System SHALL allow Admin to update Order_Status directly from the chat interface
6. WHEN Admin updates Order_Status, THE Chat_System SHALL trigger automatic notification
7. THE Chat_System SHALL display order timeline with status change history

### Requirement 8: Integração com Orçamentos

**User Story:** Como Admin, eu quero visualizar e responder orçamentos dentro do chat, para que eu possa gerenciar quotes de forma centralizada.

#### Acceptance Criteria

1. WHEN a user requests a Quote, THE Chat_System SHALL create a Conversation automatically
2. WHEN viewing a conversation, THE Chat_System SHALL display all Quotes for that user in sidebar
3. FOR EACH quote, THE Chat_System SHALL display quote number, date, items, and status
4. THE Chat_System SHALL allow Admin to mark Quote as "respondido" directly from chat
5. WHEN a Quote is accepted by user, THE Chat_System SHALL notify Admin in the conversation
6. THE Chat_System SHALL display Quote details when Admin clicks on it

### Requirement 9: Integração com Assinaturas

**User Story:** Como Admin, eu quero visualizar informações de assinatura dentro do chat, para que eu possa resolver problemas de assinantes rapidamente.

#### Acceptance Criteria

1. WHEN viewing a conversation with a Subscriber, THE Chat_System SHALL display subscription details in sidebar
2. THE Chat_System SHALL display subscription plan, status, and next billing date
3. THE Chat_System SHALL display payment history for the subscription
4. WHEN a subscription payment fails, THE Chat_System SHALL create automatic notification in conversation
5. THE Chat_System SHALL allow Admin to view subscription details by clicking on it

### Requirement 10: Respostas Rápidas (Quick Replies)

**User Story:** Como Admin, eu quero usar respostas rápidas para perguntas frequentes, para que eu possa responder mais rápido sem digitar sempre a mesma coisa.

#### Acceptance Criteria

1. THE Chat_System SHALL provide a Quick_Reply button in the message input area
2. WHEN Admin clicks Quick_Reply button, THE Chat_System SHALL display list of available quick replies
3. WHEN Admin selects a Quick_Reply, THE Chat_System SHALL insert the text into message input
4. THE Chat_System SHALL allow Admin to create new Quick_Replies
5. THE Chat_System SHALL allow Admin to edit and delete Quick_Replies
6. THE Chat_System SHALL support at least 20 Quick_Replies
7. THE Chat_System SHALL allow organizing Quick_Replies by category

### Requirement 11: Notas Internas

**User Story:** Como Admin, eu quero adicionar notas internas às conversas, para que eu possa registrar informações importantes sem que o cliente veja.

#### Acceptance Criteria

1. THE Chat_System SHALL allow Admin to add Internal_Notes to any conversation
2. THE Chat_System SHALL display Internal_Notes only to Admins, never to users
3. THE Chat_System SHALL visually distinguish Internal_Notes from regular messages (yellow background)
4. THE Chat_System SHALL display author name and timestamp for each Internal_Note
5. THE Chat_System SHALL allow editing Internal_Notes within 5 minutes of creation
6. THE Chat_System SHALL allow deleting Internal_Notes at any time

### Requirement 12: Tags para Organização

**User Story:** Como Admin, eu quero categorizar conversas com tags, para que eu possa organizar e filtrar conversas por tipo.

#### Acceptance Criteria

1. THE Chat_System SHALL support predefined tags: pedido, orcamento, duvida, reclamacao, assinatura, urgente, risco
2. THE Chat_System SHALL allow Admin to assign multiple tags per conversation
3. THE Chat_System SHALL display all assigned tags in the conversation list
4. THE Chat_System SHALL allow filtering conversations by one or more tags
5. THE Chat_System SHALL allow adding/removing tags at any time
6. THE Chat_System SHALL use color coding for different tags
7. THE Chat_System SHALL highlight conversations with "urgente" or "risco" tags prominently

### Requirement 13: Status de Conversas e Resolução Automática

**User Story:** Como Admin, eu quero marcar conversas como abertas ou resolvidas, para que eu possa organizar meu trabalho e saber o que precisa de atenção.

#### Acceptance Criteria

1. THE Chat_System SHALL support conversation statuses: aberta, aguardando_usuario, resolvida
2. THE Chat_System SHALL allow Admin to change conversation status with one click
3. WHEN Admin sends a message, THE Chat_System SHALL automatically set status to "aguardando_usuario"
4. WHEN user sends a message, THE Chat_System SHALL automatically set status to "aberta"
5. THE Chat_System SHALL allow filtering conversations by status
6. THE Chat_System SHALL display conversation status with visual indicator (color dot)
7. THE Chat_System SHALL count only "aberta" conversations in the pending count
8. WHEN a conversation has status "aguardando_usuario" for 48 hours without response, THE Chat_System SHALL suggest marking as "resolvida"
9. THE Chat_System SHALL allow Admin to configure auto-resolve timeout (default: 48h)

### Requirement 14: Área de Chat para Cliente

**User Story:** Como Client, eu quero iniciar conversas e acompanhar meus pedidos, para que eu possa obter suporte quando precisar.

#### Acceptance Criteria

1. THE Chat_System SHALL provide a chat button accessible to authenticated users
2. WHEN Client clicks chat button, THE Chat_System SHALL open chat interface in modal or side panel
3. THE Chat_System SHALL display Client's conversation history
4. THE Chat_System SHALL allow Client to send new messages
5. THE Chat_System SHALL allow Client to attach images and PDFs up to 5MB
6. THE Chat_System SHALL display unread message count on chat button
7. WHEN Admin responds, THE Chat_System SHALL show notification to Client
8. THE Chat_System SHALL display Order status updates in the chat interface

### Requirement 15: Formulário de Contato para Não-Clientes

**User Story:** Como visitante não registrado, eu quero entrar em contato com a plataforma, para que eu possa fazer perguntas antes de comprar.

#### Acceptance Criteria

1. THE Chat_System SHALL provide a contact form accessible without authentication
2. THE Chat_System SHALL require name, email, and message in the contact form
3. WHEN a visitor submits the form, THE Chat_System SHALL create a Conversation
4. WHEN a visitor submits the form, THE Chat_System SHALL send confirmation email with conversation link
5. THE Chat_System SHALL allow visitor to continue conversation using the unique link
6. THE Chat_System SHALL notify Admin of new contact form submission within 30 seconds
7. THE Chat_System SHALL automatically tag contact form conversations as "duvida"

### Requirement 16: Notificações por Email

**User Story:** Como usuário, eu quero receber email quando houver novas mensagens, para que eu não perca respostas importantes.

#### Acceptance Criteria

1. WHEN Admin sends a message to a user who is offline, THE Chat_System SHALL send email notification within 5 minutes
2. WHEN Order_Status changes, THE Chat_System SHALL send email notification to Client within 5 minutes
3. THE Chat_System SHALL include message content in email notification
4. THE Chat_System SHALL include link to conversation in email notification
5. THE Chat_System SHALL NOT send email if user is currently online in chat
6. THE Chat_System SHALL group multiple messages into single email if sent within 5 minutes

### Requirement 17: Dashboard com SLA e Métricas Operacionais

**User Story:** Como Admin, eu quero ver estatísticas básicas de atendimento com SLA interno, para que eu possa acompanhar qualidade e identificar problemas.

#### Acceptance Criteria

1. THE Chat_System SHALL display count of conversations with status "aberta"
2. THE Chat_System SHALL display count of conversations with status "aguardando_usuario"
3. THE Chat_System SHALL display count of conversations resolved today
4. THE Chat_System SHALL display total count of conversations
5. THE Chat_System SHALL display count of conversations open for more than 24 hours (SLA alert)
6. THE Chat_System SHALL calculate and display average time to first response (last 7 days)
7. THE Chat_System SHALL highlight conversations exceeding 24h without response in red
8. THE Chat_System SHALL display these metrics in cards at the top of the page
9. THE Chat_System SHALL update metrics in real-time

### Requirement 18: Busca em Conversas

**User Story:** Como Admin, eu quero buscar em conversas, para que eu possa encontrar informações específicas rapidamente.

#### Acceptance Criteria

1. THE Chat_System SHALL provide a search box in the conversation list
2. WHEN Admin types in search box, THE Chat_System SHALL filter conversations by user name or email
3. THE Chat_System SHALL display search results within 1 second
4. THE Chat_System SHALL highlight matching text in results
5. THE Chat_System SHALL allow clearing search to return to full list

### Requirement 19: Integração com Sistema de Pagamentos

**User Story:** Como Admin, eu quero visualizar status de pagamento dentro do chat, para que eu possa resolver problemas de pagamento rapidamente.

#### Acceptance Criteria

1. WHEN viewing a conversation with a Client, THE Chat_System SHALL display payment status in sidebar
2. FOR EACH order, THE Chat_System SHALL display payment status (pendente, aprovado, rejeitado)
3. WHEN a payment is approved, THE Chat_System SHALL send automatic notification to Client
4. WHEN a payment is rejected, THE Chat_System SHALL send automatic notification to Client
5. THE Chat_System SHALL display payment method used for each order

### Requirement 20: Segurança Básica

**User Story:** Como usuário, eu quero que minhas conversas sejam seguras, para que minhas informações estejam protegidas.

#### Acceptance Criteria

1. THE Chat_System SHALL require authentication for all chat access
2. THE Chat_System SHALL use HTTPS for all communications
3. THE Chat_System SHALL validate and sanitize all user input
4. THE Chat_System SHALL validate file uploads for type and size
5. THE Chat_System SHALL store messages encrypted in database
6. THE Chat_System SHALL log all Admin actions for audit

### Requirement 21: Performance Adequada

**User Story:** Como Admin, eu quero que o sistema seja rápido e responsivo, para que eu possa trabalhar eficientemente.

#### Acceptance Criteria

1. THE Chat_System SHALL load conversation list in less than 2 seconds
2. THE Chat_System SHALL load a conversation in less than 1 second
3. THE Chat_System SHALL deliver messages in less than 3 seconds
4. THE Chat_System SHALL support at least 10 concurrent Admin users
5. THE Chat_System SHALL support at least 100 concurrent Client users
6. THE Chat_System SHALL handle at least 50 messages per minute across all conversations

### Requirement 22: Migração de Dados Existentes

**User Story:** Como Admin, eu quero migrar conversas do sistema antigo, para que não percamos histórico de comunicações.

#### Acceptance Criteria

1. THE Chat_System SHALL provide migration script for importing from AdminSupport.tsx
2. THE Chat_System SHALL preserve message content, timestamps, and sender information
3. THE Chat_System SHALL preserve user associations
4. THE Chat_System SHALL provide migration report with success/failure counts
5. IF migration fails for specific conversations, THEN THE Chat_System SHALL log errors and continue

### Requirement 23: Lembretes Comerciais Automáticos

**User Story:** Como Admin, eu quero que o sistema envie lembretes automáticos sobre orçamentos e pagamentos pendentes, para que eu não perca oportunidades de venda.

#### Acceptance Criteria

1. WHEN a Quote has status "pending" for 3 days without response, THE Chat_System SHALL send automatic reminder to user
2. WHEN a payment has status "aguardando_pagamento" for 24 hours, THE Chat_System SHALL send automatic reminder to user
3. THE Chat_System SHALL allow Admin to configure reminder timeouts
4. THE Chat_System SHALL allow Admin to disable automatic reminders per conversation
5. THE Chat_System SHALL log all automatic reminders in conversation history
6. THE Chat_System SHALL NOT send reminder if conversation has recent activity (last 12 hours)

### Requirement 24: Flags de Risco e Prioridade

**User Story:** Como Admin, eu quero marcar conversas com flags de risco, para que eu possa ajustar minha postura no atendimento.

#### Acceptance Criteria

1. THE Chat_System SHALL support risk flags: cliente_conflito, atraso_critico, pagamento_problema
2. THE Chat_System SHALL allow Admin to add/remove risk flags at any time
3. THE Chat_System SHALL display risk flags prominently in conversation list (red indicator)
4. THE Chat_System SHALL allow filtering conversations by risk flag
5. THE Chat_System SHALL display warning message when opening conversation with risk flag
6. THE Chat_System SHALL log all risk flag changes for audit

### Requirement 25: Indicador de Produção Interna

**User Story:** Como Admin, eu quero acompanhar o status de produção interno dos pedidos, para que eu possa dar informações precisas aos clientes.

#### Acceptance Criteria

1. THE Chat_System SHALL display internal production status in order sidebar (visible only to Admin)
2. THE Chat_System SHALL support production stages: molde_pronto, impressao_iniciada, pintura_iniciada, finalizacao
3. THE Chat_System SHALL allow Admin to update production stage directly from chat interface
4. THE Chat_System SHALL NOT send automatic notification to customer when production stage changes (internal only)
5. THE Chat_System SHALL display production timeline with stage change history
6. THE Chat_System SHALL allow Admin to add notes to each production stage

### Requirement 26: Campo "Promessa Feita"

**User Story:** Como Admin, eu quero registrar prazos prometidos aos clientes, para que eu não esqueça compromissos e evite conflitos.

#### Acceptance Criteria

1. THE Chat_System SHALL allow Admin to set "promised_date" field for any conversation
2. WHEN promised_date is set, THE Chat_System SHALL display countdown in conversation list
3. WHEN promised_date is today or past, THE Chat_System SHALL highlight conversation in orange/red
4. THE Chat_System SHALL display alert when opening conversation with overdue promise
5. THE Chat_System SHALL allow Admin to update or clear promised_date at any time
6. THE Chat_System SHALL log all promised_date changes in conversation history
7. THE Chat_System SHALL send internal notification to Admin 1 day before promised_date

## Future Enhancements (Fora do MVP)

Funcionalidades que serão consideradas apenas quando houver 3+ atendentes, 200+ conversas/mês, e receita estável:

1. **Mensagens em Massa Avançadas**: Envio para múltiplos usuários com segmentação complexa
2. **Agendamento de Mensagens**: Programar envios futuros com recorrência
3. **Atribuição de Conversas**: Distribuir conversas entre múltiplos atendentes com round-robin
4. **Modo Offline**: Funcionar sem conexão e sincronizar depois
5. **Performance Avançada**: Otimizações para 10k+ usuários simultâneos
6. **Indicadores de Leitura Avançados**: "Visto por último às..." com precisão de segundos
7. **Indicadores de Digitação**: "Fulano está digitando..." em tempo real
8. **Arquivamento Automático**: Arquivar conversas antigas com regras complexas
9. **Busca Avançada**: Buscar dentro do conteúdo das mensagens com filtros complexos
10. **Analytics Avançado**: Métricas detalhadas de performance com gráficos e exportação
11. **Integração com CRM Externo**: Sincronização bidirecional com sistemas externos
12. **Chatbot/IA**: Respostas automáticas inteligentes para perguntas frequentes

## Notas de Implementação

### Removido do Escopo Técnico Detalhado

Para manter o MVP enxuto e focado em operação real, os seguintes detalhes técnicos foram simplificados ou removidos:

❌ **Criptografia em nível de banco descrita tecnicamente** - Deixado implícito, confiando na segurança padrão do Supabase
❌ **Log de auditoria muito detalhado** - Mantido apenas o essencial (mudanças de status, flags de risco)
❌ **Métricas excessivas** - Focado em SLA operacional (24h, primeira resposta) ao invés de analytics corporativo

### Foco Operacional

O sistema é projetado para ser uma **ferramenta de controle operacional**, não um sistema de auditoria corporativa. Prioridades:

1. **Reduzir mensagens repetitivas** ("onde está meu pedido?")
2. **Controlar qualidade** (SLA de 24h, primeira resposta)
3. **Evitar conflitos** (promessas registradas, flags de risco)
4. **Aumentar receita** (lembretes de orçamento e pagamento)
5. **Transformar chat em CRM** (sidebar com contexto completo)

