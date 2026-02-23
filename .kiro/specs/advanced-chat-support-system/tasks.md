# Implementation Plan: Sistema de Chat Centralizado (MVP)

## Overview

Este plano de implementação segue uma estratégia de priorização baseada em impacto operacional, começando pela automação (Fase 3) que reduz carga manual imediatamente, seguida pela infraestrutura base, interface admin, interface cliente, features avançadas e finalizando com polish e testes.

A implementação usa TypeScript/React com Supabase (PostgreSQL + Realtime + Storage) e componentes shadcn/ui existentes.

## Tasks

### FASE 3: AUTOMAÇÃO (PRIORIDADE MÁXIMA) ⭐

- [x] 1. Implementar automação de status de pedidos
  - [x] 1.1 Criar tabela order_status_templates com templates padrão
    - Criar migration para tabela order_status_templates
    - Inserir 4 templates padrão (aguardando_pagamento, em_producao, enviado, entregue)
    - _Requirements: 6.1, 6.4, 6.8_

  - [x] 1.2 Criar trigger de notificação automática de status
    - Implementar função PL/pgSQL notify_order_status_change()
    - Criar trigger AFTER UPDATE em manual_payments
    - Buscar ou criar conversa automaticamente para o pedido
    - Substituir variáveis no template ({order_number}, {amount}, {tracking_code})
    - Inserir mensagem system na conversa
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [ ]* 1.3 Escrever testes para automação de status
    - **Property 20: Order Status Automation**
    - **Property 22: Automatic Conversation Creation**
    - **Property 23: Order Details in Automatic Messages**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5, 6.6**

- [x] 2. Implementar sistema de lembretes comerciais
  - [x] 2.1 Criar tabela conversation_reminders
    - Criar migration para tabela conversation_reminders
    - Definir tipos de lembretes (quote_followup, payment_pending, promised_date)
    - Criar índices para scheduled_for e conversation_id
    - _Requirements: 23.1, 23.2_

  - [x] 2.2 Implementar serviço de processamento de lembretes
    - Criar reminderService.ts com função processReminders()
    - Buscar lembretes pendentes (scheduled_for <= now, is_active = true, sent_at IS NULL)
    - Criar mensagem automática na conversa
    - Marcar lembrete como enviado (sent_at = now)
    - _Requirements: 23.3, 23.4_

  - [x] 2.3 Criar interface admin para agendar lembretes
    - Adicionar botão "Agendar lembrete" no ChatHeader
    - Criar modal ReminderScheduler com campos (tipo, data/hora, mensagem opcional)
    - Validar data futura
    - Salvar lembrete na tabela
    - _Requirements: 23.5_

  - [ ]* 2.4 Escrever testes para sistema de lembretes
    - Testar criação de lembretes
    - Testar processamento de lembretes pendentes
    - Testar que lembretes enviados não são reprocessados
    - _Requirements: 23.1, 23.2, 23.3, 23.4_

- [x] 3. Implementar templates de mensagens (Quick Replies)
  - [x] 3.1 Criar tabela quick_replies
    - Criar migration para tabela quick_replies
    - Definir campos (category, title, message, display_order, is_active)
    - Criar índices para category e is_active
    - _Requirements: 10.1_

  - [x] 3.2 Criar componente QuickRepliesManager
    - Criar interface CRUD para gerenciar respostas rápidas
    - Permitir criar, editar, deletar e reordenar respostas
    - Organizar por categorias
    - _Requirements: 10.2, 10.3, 10.4, 10.7_

  - [x] 3.3 Criar componente QuickRepliesSelector
    - Adicionar botão no MessageInput para abrir selector
    - Listar respostas rápidas filtradas por categoria
    - Inserir texto no campo de mensagem ao selecionar
    - _Requirements: 10.5, 10.6_

  - [ ]* 3.4 Escrever testes para Quick Replies
    - **Property 32: Quick Reply Category Organization**
    - Testar inserção de texto no campo de mensagem
    - _Requirements: 10.1, 10.2, 10.5, 10.7_

- [x] 4. Checkpoint - Validar automação funcionando
  - Testar trigger de status de pedidos manualmente
  - Verificar criação automática de conversas
  - Testar agendamento e processamento de lembretes
  - Validar Quick Replies funcionando
  - Ensure all tests pass, ask the user if questions arise.

### FASE 1: INFRAESTRUTURA BASE

- [x] 5. Criar migrations do banco de dados
  - [x] 5.1 Criar migration para support_conversations
    - Adicionar campos novos: tags (array), risk_flags (array), promised_date
    - Criar índices para tags, risk_flags, promised_date
    - Manter compatibilidade com dados existentes
    - _Requirements: 1.1, 12.1, 12.2, 24.1_

  - [x] 5.2 Criar migration para support_messages
    - Adicionar campos: is_internal, read_by_admin, read_by_customer, edited_at
    - Criar índices para mensagens não lidas
    - _Requirements: 2.1, 11.1_

  - [x] 5.3 Criar migration para support_attachments
    - Criar tabela com campos (message_id, file_name, file_path, file_size, file_type, thumbnail_path)
    - Criar índice para message_id
    - _Requirements: 4.1, 4.2_

  - [x] 5.4 Criar migration para order_production_stages
    - Criar tabela para estágios internos de produção
    - Definir enum (molde_pronto, impressao_iniciada, pintura_iniciada, finalizacao)
    - Criar índice para order_id
    - _Requirements: 25.1, 25.2_

  - [ ]* 5.5 Escrever testes de migration
    - Testar que migrations rodam sem erros
    - Testar rollback de migrations
    - Validar índices criados
    - _Requirements: 22.1_

- [x] 6. Criar triggers e funções do banco
  - [x] 6.1 Criar trigger update_conversation_last_message
    - Implementar função PL/pgSQL que atualiza last_message_at
    - Atualizar status para waiting_admin ou waiting_customer baseado no sender_type
    - Criar trigger AFTER INSERT em support_messages
    - _Requirements: 1.1, 13.3, 13.4_

  - [x] 6.2 Criar trigger mark_first_admin_response
    - Implementar função PL/pgSQL que marca first_response_at
    - Verificar se sender é admin usando has_role()
    - Criar trigger AFTER INSERT em support_messages
    - _Requirements: 17.1_

  - [ ]* 6.3 Escrever testes para triggers
    - **Property 43: Admin Message Status Update**
    - **Property 44: Customer Message Status Update**
    - Testar atualização de last_message_at
    - Testar marcação de first_response_at
    - _Requirements: 13.3, 13.4, 17.1_

- [x] 7. Criar tipos TypeScript e interfaces
  - [x] 7.1 Criar types/support.ts com todas as interfaces
    - Definir Conversation, Message, Attachment, QuickReply
    - Definir OrderProductionStage, ConversationReminder, OrderStatusTemplate
    - Definir enums (ConversationStatus, ConversationTag, RiskFlag, etc)
    - _Requirements: Todos_

  - [x] 7.2 Criar schemas de validação com Zod
    - Criar schemas para validação de mensagens (max 2000 chars, não vazio)
    - Criar schemas para validação de arquivos (tipo, tamanho)
    - Criar schemas para validação de formulários
    - _Requirements: 2.6, 3.6, 4.1, 4.2, 15.2, 20.3_

- [x] 8. Criar serviços base
  - [x] 8.1 Criar conversationService.ts
    - Implementar listConversations() com filtros e ordenação
    - Implementar getConversation() por ID
    - Implementar createConversation()
    - Implementar updateStatus(), updateTags(), updateRiskFlags()
    - Implementar searchConversations()
    - _Requirements: 1.1, 1.4, 1.5, 12.1, 12.2, 13.1, 18.1_

  - [x] 8.2 Criar messageService.ts
    - Implementar listMessages() com paginação (50 mensagens)
    - Implementar sendMessage()
    - Implementar addInternalNote(), editInternalNote(), deleteInternalNote()
    - Implementar markAsRead()
    - _Requirements: 2.1, 3.1, 5.2, 11.1, 11.5_

  - [x] 8.3 Criar fileUploadService.ts
    - Implementar uploadFile() para Supabase Storage
    - Implementar validateFile() (tipo, tamanho)
    - Implementar generateThumbnail() para imagens
    - Implementar getPublicUrl() e deleteFile()
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [x] 8.4 Criar integrationService.ts
    - Implementar getUserOrders()
    - Implementar getUserQuotes()
    - Implementar getUserSubscription()
    - Implementar getUserPayments()
    - _Requirements: 7.1, 8.2, 9.1, 19.1_

  - [ ]* 8.5 Escrever testes unitários para serviços
    - **Property 8: Message Length Validation**
    - **Property 11: Empty Message Prevention**
    - **Property 13: Image Upload Validation**
    - **Property 14: PDF Upload Validation**
    - **Property 17: File Validation Before Upload**
    - _Requirements: 2.6, 3.6, 4.1, 4.2, 4.6_

- [x] 9. Checkpoint - Infraestrutura base completa
  - Verificar que todas as migrations rodam sem erros
  - Testar serviços base com dados mock
  - Validar tipos TypeScript compilando sem erros
  - Ensure all tests pass, ask the user if questions arise.

### FASE 2: INTERFACE ADMIN

- [x] 10. Criar página AdminSupportV2
  - [x] 10.1 Criar estrutura base da página
    - Criar componente AdminSupportV2.tsx com layout 30/70
    - Implementar roteamento em /admin/support
    - Adicionar navegação no menu admin
    - _Requirements: 1.1_

  - [x] 10.2 Criar hook useConversations com Realtime
    - Implementar carregamento inicial de conversas
    - Configurar subscription Realtime para INSERT/UPDATE em support_conversations
    - Implementar filtros (status, tag, busca)
    - Implementar ordenação por last_message_at DESC
    - _Requirements: 1.1, 1.5, 12.4, 13.5_

  - [x] 10.3 Criar hook useMessages com Realtime
    - Implementar carregamento de mensagens com paginação
    - Configurar subscription Realtime para INSERT/UPDATE em support_messages
    - Implementar auto-scroll para mensagem mais recente
    - Implementar infinite scroll para mensagens antigas
    - _Requirements: 2.1, 5.2_

  - [ ]* 10.4 Escrever testes para hooks Realtime
    - Testar subscription e cleanup
    - Testar atualização de estado em tempo real
    - Testar reconexão automática
    - _Requirements: 2.1, 3.2_

- [x] 11. Criar ConversationList
  - [x] 11.1 Criar componente ConversationList
    - Renderizar lista de conversas ordenadas por last_message_at DESC
    - Exibir nome do usuário, preview da última mensagem (50 chars), timestamp
    - Destacar conversas com unread_count > 0
    - Implementar seleção de conversa
    - _Requirements: 1.1, 1.2, 1.7_

  - [x] 11.2 Adicionar SearchBar e filtros
    - Criar campo de busca por nome/email
    - Criar filtro dropdown de status
    - Criar filtro dropdown de tags
    - Aplicar filtros em tempo real
    - _Requirements: 1.4, 1.5, 12.4_

  - [x] 11.3 Criar ConversationCard
    - Exibir badge de unread_count se > 0
    - Exibir tags com cores diferentes
    - Exibir indicador de status (color dot)
    - Exibir timestamp formatado (relativo ou HH:mm)
    - _Requirements: 1.2, 1.7, 12.3, 12.6, 13.6_

  - [ ]* 11.4 Escrever testes para ConversationList
    - **Property 1: Conversation List Ordering**
    - **Property 2: Conversation Display Completeness**
    - **Property 3: Search Functionality**
    - **Property 4: Status Filtering**
    - **Property 5: Unread Indicator**
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.7_

- [x] 12. Criar ChatInterface
  - [x] 12.1 Criar componente ChatInterface
    - Criar estrutura com ChatHeader, MessageList, MessageInput
    - Implementar carregamento de mensagens ao selecionar conversa
    - Implementar envio de mensagens
    - _Requirements: 2.1, 3.1_

  - [x] 12.2 Criar ChatHeader
    - Exibir nome do usuário e email
    - Exibir e permitir editar status da conversa
    - Exibir e permitir editar tags (múltiplas tags)
    - Adicionar botão para toggle CustomerSidebar
    - Adicionar campo "Promessa feita" (date picker)
    - Exibir flags de risco se existirem
    - _Requirements: 1.3, 12.1, 12.2, 13.1, 24.2, 24.3_

  - [x] 12.3 Criar MessageList
    - Renderizar mensagens em ordem cronológica (created_at ASC)
    - Inserir DateSeparator entre dias diferentes
    - Implementar auto-scroll para última mensagem
    - Implementar infinite scroll para mensagens antigas (50 por vez)
    - Distinguir visualmente mensagens admin (direita, azul) vs customer (esquerda, cinza)
    - _Requirements: 2.3, 2.4, 5.2, 5.4_

  - [x] 12.4 Criar MessageBubble
    - Exibir sender name e timestamp (HH:mm)
    - Renderizar texto com quebras de linha preservadas
    - Exibir anexos (thumbnails para imagens, ícone+nome para PDFs)
    - Exibir status de envio (enviando, enviado, falhou)
    - _Requirements: 2.2, 2.3, 3.4, 3.7, 4.3, 4.4_

  - [x] 12.5 Criar MessageInput
    - Criar textarea com limite de 2000 caracteres
    - Adicionar botão de anexo (AttachmentUpload)
    - Adicionar toggle para nota interna
    - Adicionar botão para Quick Replies
    - Validar mensagem antes de enviar (não vazia, não só espaços)
    - Implementar envio com Enter (Shift+Enter para quebra de linha)
    - _Requirements: 2.6, 3.1, 3.6, 10.5, 11.1_

  - [ ]* 12.6 Escrever testes para ChatInterface
    - **Property 6: Message Chronological Order**
    - **Property 7: Message Visual Distinction**
    - **Property 8: Message Length Validation**
    - **Property 10: Line Break Support**
    - **Property 11: Empty Message Prevention**
    - **Property 12: Message Status Display**
    - **Property 19: Date Separator Insertion**
    - _Requirements: 2.2, 2.3, 2.4, 2.6, 3.4, 3.6, 3.7, 5.4_

- [x] 13. Criar CustomerSidebar com contexto
  - [x] 13.1 Criar componente CustomerSidebar
    - Criar sidebar colapsável (toggle button)
    - Criar seções: Orders, Quotes, Subscription, Payments
    - Implementar lazy loading ao abrir sidebar
    - _Requirements: 7.1, 8.2, 9.1, 19.1_

  - [x] 13.2 Criar OrdersList section
    - Exibir lista de pedidos do usuário
    - Mostrar order number, date, total value, status
    - Mostrar tracking code se status = enviado/entregue
    - Adicionar botão para atualizar status (trigger notificação)
    - Exibir estágios de produção interna se existirem
    - _Requirements: 7.2, 7.3, 7.4, 7.6, 25.3_

  - [x] 13.3 Criar QuotesList section
    - Exibir lista de orçamentos do usuário
    - Mostrar quote number, date, items summary, status
    - Destacar orçamentos pendentes de resposta
    - _Requirements: 8.3, 8.4_

  - [x] 13.4 Criar SubscriptionInfo section
    - Exibir plano, status, next billing date
    - Mostrar apenas se usuário tem assinatura ativa
    - _Requirements: 9.1, 9.2_

  - [x] 13.5 Criar PaymentInfo section
    - Exibir histórico de pagamentos manuais
    - Mostrar payment status e método de pagamento
    - Permitir atualizar status de pagamento (trigger notificação)
    - _Requirements: 19.1, 19.2, 19.5_

  - [ ]* 13.6 Escrever testes para CustomerSidebar
    - **Property 24: Order Display Completeness**
    - **Property 25: Tracking Code Conditional Display**
    - **Property 28: Quote Display Completeness**
    - **Property 30: Subscription Display Completeness**
    - **Property 58: Payment Status Display**
    - _Requirements: 7.2, 7.4, 8.3, 9.1, 19.1_

- [x] 14. Criar Dashboard com métricas e SLA
  - [x] 14.1 Criar componente DashboardMetrics
    - Calcular e exibir: open_count, waiting_customer_count, resolved_today_count
    - Calcular SLA: overdue_24h_count (conversas abertas há mais de 24h)
    - Calcular SLA: avg_first_response_minutes
    - Exibir conversations_with_risk e conversations_overdue_promise
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 21.1, 21.2, 24.4_

  - [ ]* 14.2 Escrever testes para Dashboard
    - **Property 56: Dashboard Metrics Calculation**
    - Testar cálculo de métricas SLA
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 21.1, 21.2_

- [x] 15. Checkpoint - Interface admin funcional
  - Testar fluxo completo: listar conversas, selecionar, enviar mensagem
  - Validar Realtime funcionando (abrir em 2 abas)
  - Testar filtros e busca
  - Verificar CustomerSidebar carregando dados
  - Validar Dashboard exibindo métricas corretas
  - Ensure all tests pass, ask the user if questions arise.

### FASE 4: INTERFACE CLIENTE

- [x] 16. Criar página CustomerChat
  - [x] 16.1 Criar componente CustomerChat
    - Criar modal ou side panel para chat
    - Implementar botão flutuante com badge de unread_count
    - Carregar conversas do usuário autenticado (user_id = current_user)
    - _Requirements: 14.1, 14.3, 14.6_

  - [x] 16.2 Criar CustomerMessageList
    - Renderizar mensagens (excluir is_internal = true)
    - Exibir mensagens de status de pedidos (sender_type = system)
    - Implementar auto-scroll para última mensagem
    - _Requirements: 14.2, 14.8_

  - [x] 16.3 Criar CustomerMessageInput
    - Criar textarea simples
    - Adicionar botão de anexo
    - Validar mensagem antes de enviar
    - _Requirements: 14.4_

  - [ ]* 16.4 Escrever testes para CustomerChat
    - **Property 47: Client Conversation History Display**
    - **Property 48: Unread Message Count Display**
    - **Property 49: Order Status Updates in Client Chat**
    - Testar que notas internas não aparecem
    - _Requirements: 14.2, 14.3, 14.6, 14.8_

- [x] 17. Criar formulário de contato
  - [x] 17.1 Criar componente ContactForm
    - Criar formulário com campos: name, email, message
    - Validar campos obrigatórios
    - Criar conversa ao submeter
    - Auto-atribuir tag 'duvida'
    - Redirecionar para chat após criação
    - _Requirements: 15.1, 15.2, 15.3, 15.7_

  - [x] 17.2 Adicionar ContactForm na página pública
    - Criar rota /contato
    - Adicionar link no footer/menu
    - _Requirements: 15.1_

  - [ ]* 17.3 Escrever testes para ContactForm
    - **Property 50: Contact Form Required Fields**
    - **Property 51: Contact Form Conversation Creation**
    - **Property 52: Contact Form Auto-Tagging**
    - _Requirements: 15.2, 15.3, 15.7_

- [x] 18. Implementar notificações por email
  - [x] 18.1 Criar notificationService.ts
    - Implementar sendEmailNotification()
    - Implementar isUserOnline() (verificar última atividade)
    - Implementar queueNotification() e processNotificationQueue()
    - Agrupar notificações em 5 minutos
    - _Requirements: 16.1, 16.5, 16.6_

  - [x] 18.2 Criar template de email
    - Criar template HTML para notificações
    - Incluir conteúdo da mensagem e link para conversa
    - _Requirements: 16.3, 16.4_

  - [x] 18.3 Integrar com trigger de mensagens
    - Chamar notificationService ao inserir nova mensagem
    - Verificar se destinatário está online antes de enviar
    - _Requirements: 16.2, 16.5_

  - [ ]* 18.4 Escrever testes para notificações
    - **Property 53: Email Notification Content**
    - **Property 54: Online User Email Suppression**
    - **Property 55: Email Message Grouping**
    - _Requirements: 16.3, 16.4, 16.5, 16.6_

- [x] 19. Checkpoint - Interface cliente funcional
  - Testar CustomerChat abrindo e exibindo conversas
  - Validar formulário de contato criando conversa
  - Testar notificações por email (usar email de teste)
  - Verificar que notas internas não aparecem para cliente
  - Ensure all tests pass, ask the user if questions arise.

### FASE 5: FEATURES AVANÇADAS

- [x] 20. Implementar anexos de arquivos
  - [x] 20.1 Criar componente AttachmentUpload
    - Implementar drag & drop
    - Validar tipo (JPEG, PNG, PDF) e tamanho (5MB) antes de upload
    - Exibir preview de imagens
    - Exibir progress indicator durante upload
    - _Requirements: 4.1, 4.2, 4.6_

  - [x] 20.2 Implementar upload para Supabase Storage
    - Criar bucket 'support-attachments' no Supabase
    - Implementar fileUploadService.uploadFile()
    - Gerar thumbnail para imagens (200x200px)
    - Salvar metadata na tabela support_attachments
    - _Requirements: 4.3_

  - [x] 20.3 Criar componente AttachmentDisplay
    - Renderizar thumbnail clicável para imagens
    - Renderizar ícone PDF + filename para PDFs
    - Implementar modal de visualização para imagens
    - Adicionar botão de download
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ]* 20.4 Escrever testes para anexos
    - **Property 13: Image Upload Validation**
    - **Property 14: PDF Upload Validation**
    - **Property 15: Image Thumbnail Display**
    - **Property 16: PDF Display Format**
    - **Property 17: File Validation Before Upload**
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 21. Implementar notas internas
  - [x] 21.1 Adicionar toggle de nota interna no MessageInput
    - Adicionar checkbox "Nota interna" no MessageInput
    - Enviar mensagem com is_internal = true quando marcado
    - _Requirements: 11.1_

  - [x] 21.2 Criar componente InternalNote
    - Renderizar com fundo amarelo e ícone de cadeado
    - Exibir author name e timestamp
    - Adicionar botão de editar (se dentro de 5 minutos)
    - Adicionar botão de deletar
    - _Requirements: 11.3, 11.4, 11.5_

  - [x] 21.3 Implementar RLS para notas internas
    - Criar policy que bloqueia is_internal = true para não-admins
    - Validar no backend que cliente não pode ver notas internas
    - _Requirements: 11.2_

  - [ ]* 21.4 Escrever testes para notas internas
    - **Property 33: Internal Note Visibility**
    - **Property 34: Internal Note Visual Distinction**
    - **Property 35: Internal Note Metadata Display**
    - **Property 36: Internal Note Edit Time Window**
    - _Requirements: 11.2, 11.3, 11.4, 11.5_

- [x] 22. Implementar sistema de tags e flags
  - [x] 22.1 Criar componente TagSelector
    - Permitir selecionar múltiplas tags
    - Exibir tags com cores diferentes
    - Validar tags permitidas (pedido, orcamento, duvida, reclamacao, assinatura, urgente)
    - _Requirements: 12.1, 12.2, 12.6_

  - [x] 22.2 Criar componente RiskFlagManager
    - Permitir adicionar/remover flags de risco
    - Exibir flags com ícones de alerta
    - Tipos: cliente_conflito, atraso_critico, pagamento_problema
    - _Requirements: 24.1_

  - [ ]* 22.3 Escrever testes para tags e flags
    - **Property 37: Conversation Tag Validation**
    - **Property 39: Tag Display in List**
    - **Property 40: Tag Filtering**
    - **Property 41: Tag Color Coding**
    - Testar múltiplas tags
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6_

- [x] 23. Implementar estágios de produção
  - [x] 23.1 Criar componente ProductionStageTracker
    - Exibir estágios de produção no CustomerSidebar
    - Permitir admin adicionar novo estágio
    - Exibir timeline visual dos estágios
    - _Requirements: 25.1, 25.2, 25.3_

  - [x] 23.2 Criar notificação de estágio de produção
    - Enviar mensagem automática ao adicionar estágio
    - Incluir notas do estágio na mensagem
    - _Requirements: 25.4_

  - [ ]* 23.3 Escrever testes para estágios de produção
    - Testar criação de estágios
    - Testar notificação automática
    - _Requirements: 25.1, 25.2, 25.4_

- [x] 24. Checkpoint - Features avançadas completas
  - Testar upload e visualização de anexos
  - Validar notas internas visíveis apenas para admins
  - Testar sistema de tags e flags
  - Verificar estágios de produção funcionando
  - Ensure all tests pass, ask the user if questions arise.

### FASE 6: POLISH & TESTING

- [x] 25. Implementar tratamento de erros
  - [x] 25.1 Criar error handling para network errors
    - Implementar retry automático com exponential backoff
    - Exibir toast notifications para erros
    - Implementar optimistic UI updates com rollback
    - _Requirements: 20.1_

  - [x] 25.2 Criar error handling para Realtime
    - Exibir indicador de status de conexão
    - Implementar reconexão automática
    - Fallback para polling se Realtime falhar
    - _Requirements: 3.2_

  - [x] 25.3 Implementar validação e sanitização
    - Sanitizar inputs antes de salvar (prevenir XSS)
    - Validar todos os campos com Zod schemas
    - Exibir mensagens de erro inline
    - _Requirements: 20.3_

  - [x] 25.4 Implementar audit logging
    - Criar tabela audit_logs
    - Logar ações de admin (status change, tag assignment, internal notes)
    - _Requirements: 20.6_

- [x] 26. Implementar features de segurança
  - [x] 26.1 Configurar Row Level Security (RLS)
    - Criar policies para support_conversations (user vê apenas suas conversas)
    - Criar policies para support_messages (user vê apenas mensagens de suas conversas)
    - Criar policies para notas internas (apenas admins)
    - _Requirements: 20.2, 11.2_

  - [x] 26.2 Implementar rate limiting
    - Limitar envio de mensagens (ex: 10 por minuto)
    - Limitar criação de conversas (ex: 5 por hora)
    - _Requirements: 20.5_

  - [ ]* 26.3 Escrever testes de segurança
    - **Property 33: Internal Note Visibility**
    - **Property 47: Client Conversation History Display**
    - **Property 61: Input Sanitization**
    - Testar RLS policies
    - Testar rate limiting
    - _Requirements: 20.2, 20.3, 20.5, 11.2, 14.3_

- [x] 27. Implementar busca avançada
  - [x] 27.1 Criar componente AdvancedSearch
    - Buscar por nome, email, conteúdo de mensagens
    - Filtrar por data range
    - Filtrar por múltiplos critérios combinados
    - _Requirements: 18.1, 18.3_

  - [x] 27.2 Implementar highlighting de resultados
    - Destacar termos de busca nos resultados
    - _Requirements: 18.4_

  - [ ]* 27.3 Escrever testes para busca
    - **Property 3: Search Functionality**
    - **Property 57: Search Result Highlighting**
    - _Requirements: 18.1, 18.4_

- [x] 28. Implementar resolução automática
  - [x] 28.1 Criar job de resolução automática
    - Criar função que busca conversas waiting_customer há mais de 48h
    - Atualizar status para 'resolved' automaticamente
    - Enviar mensagem de confirmação ao cliente
    - _Requirements: 26.1, 26.2_

  - [x] 28.2 Criar agendador para jobs
    - Configurar cron job ou scheduled function
    - Executar diariamente
    - _Requirements: 26.1_

  - [ ]* 28.3 Escrever testes para resolução automática
    - Testar que conversas antigas são resolvidas
    - Testar que conversas recentes não são afetadas
    - _Requirements: 26.1, 26.2_

- [x] 29. Criar script de migração de dados
  - [x] 29.1 Criar migration script
    - Migrar conversas existentes de AdminSupport.tsx
    - Preservar message content, timestamps, sender info
    - Preservar user associations
    - Validar integridade dos dados migrados
    - _Requirements: 22.1, 22.2, 22.3_

  - [ ]* 29.2 Escrever testes para migração
    - **Property 63: Migration Data Preservation**
    - **Property 64: Migration User Association Preservation**
    - _Requirements: 22.2, 22.3_

- [x] 30. Testes de integração end-to-end
  - [ ]* 30.1 Escrever testes E2E para fluxo admin
    - Testar fluxo completo: login → listar conversas → selecionar → enviar mensagem
    - Testar filtros e busca
    - Testar criação de nota interna
    - Testar upload de anexo
    - _Requirements: Todos_

  - [ ]* 30.2 Escrever testes E2E para fluxo cliente
    - Testar fluxo completo: login → abrir chat → enviar mensagem
    - Testar formulário de contato
    - Testar recebimento de notificação de status de pedido
    - _Requirements: Todos_

  - [ ]* 30.3 Escrever testes E2E para Realtime
    - Testar que mensagens aparecem em tempo real em múltiplas abas
    - Testar reconexão após perda de conexão
    - _Requirements: 2.1, 3.2_

- [x] 31. Otimizações de performance
  - [x] 31.1 Implementar caching com React Query
    - Cachear conversas e mensagens
    - Invalidar cache ao receber updates via Realtime
    - _Requirements: Performance_

  - [x] 31.2 Implementar lazy loading
    - Lazy load CustomerSidebar data
    - Lazy load imagens de anexos
    - _Requirements: Performance_

  - [x] 31.3 Otimizar queries do banco
    - Adicionar índices faltantes
    - Otimizar queries N+1
    - _Requirements: Performance_

- [x] 32. Documentação e deployment
  - [x] 32.1 Criar documentação técnica
    - Documentar arquitetura e fluxos principais
    - Documentar APIs dos serviços
    - Criar guia de troubleshooting
    - _Requirements: 22.4_

  - [x] 32.2 Criar documentação de usuário
    - Criar guia para admins (como usar o sistema)
    - Criar guia para clientes (como usar o chat)
    - _Requirements: 22.4_

  - [x] 32.3 Preparar deployment
    - Configurar variáveis de ambiente
    - Executar migrations em produção
    - Executar script de migração de dados
    - Validar funcionamento em produção
    - _Requirements: 22.1_

- [x] 33. Checkpoint final - Sistema completo
  - Executar todos os testes (unitários, integração, E2E)
  - Validar todas as funcionalidades em staging
  - Verificar performance e métricas
  - Confirmar que todos os requisitos foram atendidos
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marcadas com `*` são opcionais (testes) e podem ser puladas para MVP mais rápido
- Cada task referencia requirements específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Priorização estratégica: Fase 3 (Automação) primeiro para impacto operacional imediato
- Property tests validam propriedades universais de correção
- Unit tests validam exemplos específicos e edge cases
- Implementação usa TypeScript/React com Supabase (PostgreSQL + Realtime + Storage)
- Componentes shadcn/ui devem ser reutilizados quando possível

## Estimativas

- **Fase 3 (Automação)**: 3-4 dias
- **Fase 1 (Infraestrutura)**: 2-3 dias
- **Fase 2 (Interface Admin)**: 4-5 dias
- **Fase 4 (Interface Cliente)**: 2-3 dias
- **Fase 5 (Features Avançadas)**: 3-4 dias
- **Fase 6 (Polish & Testing)**: 3-4 dias

**Total estimado**: 17-23 dias de desenvolvimento

## Dependencies

- Fase 3 depende parcialmente de Fase 1 (migrations e serviços base)
- Fase 2 depende de Fase 1 completa
- Fase 4 depende de Fase 1 completa
- Fase 5 depende de Fase 2 e Fase 4
- Fase 6 pode ser executada em paralelo com outras fases

## Success Criteria

- ✅ Automação de status de pedidos funcionando (reduz 70% da carga manual)
- ✅ Interface admin completa e funcional
- ✅ Interface cliente completa e funcional
- ✅ Realtime funcionando sem falhas
- ✅ SLA interno sendo monitorado (24h, primeira resposta)
- ✅ Flags de risco e promessas implementadas
- ✅ Lembretes comerciais funcionando
- ✅ Sistema de tags e notas internas operacional
- ✅ Migração de dados existentes concluída sem perda
- ✅ Todos os 26 requisitos atendidos
