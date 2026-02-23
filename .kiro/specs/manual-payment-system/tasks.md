# Plano de Implementação: Sistema de Pagamento Manual

## Visão Geral

Este plano de implementação divide o sistema de pagamento manual em tarefas de codificação discretas e incrementais. Cada tarefa se baseia no trabalho anterior e inclui referências específicas aos requisitos. O plano segue uma abordagem em fases: configuração do banco de dados, serviços principais, interface admin, interface do cliente, notificações e testes.

A implementação usa TypeScript com React, Supabase para backend e shadcn/ui para componentes. Testes baseados em propriedades usam a biblioteca fast-check com mínimo de 100 iterações por teste.

## Mapeamento de Propriedades de Corretude

O documento de design define 37 propriedades de corretude. Abaixo está o mapeamento de cada propriedade para sua tarefa de teste correspondente:

| Propriedade | Descrição | Tarefa de Teste | Status |
|-------------|-----------|-----------------|--------|
| 1 | Validação de Método de Pagamento | 3.2 | Pendente |
| 2 | Aceitação de Campos Opcionais | 3.3 | Pendente |
| 3 | Método de Pagamento Padrão Único | 3.4 | Pendente |
| 4 | Exibição de Métodos de Pagamento Ativos | 3.5 | Pendente |
| 5 | Status Inicial de Pagamento | 4.2 | Pendente |
| 6 | Exclusividade de Referência de Entidade | 2.2 | Pendente |
| 7 | Números de Referência Únicos | 4.3 | Pendente |
| 8 | Validação de Tipo de Arquivo | 5.2 | Pendente |
| 9 | Validação de Tamanho de Arquivo | 5.3 | Pendente |
| 10 | Máximo de Arquivos Por Pagamento | 5.4 | Pendente |
| 11 | Transição de Status no Primeiro Upload | 5.5 | Pendente |
| 12 | Criação Automática de Conversa | 7.2 | Pendente |
| 13 | Formato de Assunto de Conversa | 7.3 | Pendente |
| 14 | Filtragem de Dashboard Admin | 12.3 | Pendente |
| 15 | Correção de Aplicação de Filtro | 12.4 | Pendente |
| 16 | Transição de Status de Aprovação | 8.2 | Pendente |
| 17 | Atualização de Status de Orçamento | 9.2 | Pendente |
| 18 | Ativação de Assinatura | 9.3 | Pendente |
| 19 | Criação de Entregas de Assinatura | 9.4 | Pendente |
| 20 | Completude do Log de Auditoria | 8.3 | Pendente |
| 21 | Imutabilidade de Status Aprovado | 4.4 | Pendente |
| 22 | Restrição de Transição de Status Rejeitado | 4.5 | Pendente |
| 23 | Notificação por Email na Criação | 21.3 | Pendente |
| 24 | Atualização de Badge em Tempo Real | 22.3 | Pendente |
| 25 | Persistência de Arquivo de Pagamento | 19.2 | Pendente |
| 26 | Filtro de Status de Aprovação em Lote | 14.3 | Pendente |
| 27 | Permissão de Upload para Pagamentos Rejeitados | 18.3 | Pendente |
| 28 | Correspondência de Tipo MIME e Extensão | 5.6 | Pendente |
| 29 | Detecção e Log de Malware | 28.2 | Pendente |
| 30 | Limite de Taxa de Upload | 5.7 | Pendente |
| 31 | Autorização de Acesso a Arquivo | 13.3 | Pendente |
| 32 | Performance de Carregamento do Dashboard | 25.3 | Pendente |
| 33 | Limite de Paginação | 25.4 | Pendente |
| 34 | Especificidade de Mensagem de Erro | 26.3 | Pendente |
| 35 | Destaque de Campo Inválido | 26.4 | Pendente |
| 36 | Suporte a Navegação por Teclado | 27.3 | Pendente |
| 37 | Conformidade de Contraste de Cor | 27.4 | Pendente |

**Nota**: Todas as tarefas de teste de propriedade são marcadas como opcionais (*) e podem ser puladas para um MVP mais rápido, mas são altamente recomendadas para garantir a corretude do sistema.

## Tarefas

- [x] 1. Esquema do Banco de Dados e Migrações
  - Criar arquivo de migração para todas as novas tabelas e modificações
  - Implementar tabela payment_methods com índices e políticas RLS
  - Implementar tabela manual_payments com constraints e índices
  - Implementar tabela payment_files com políticas RLS
  - Implementar tabela payment_audit_log
  - Adicionar coluna payment_id à tabela support_conversations
  - Criar funções do banco: generate_payment_reference()
  - Criar triggers: trigger_payment_status_change(), trigger_first_file_upload()
  - _Requisitos: 1.1-1.10, 2.5-2.8, 3.1-3.12, 4.1-4.3, 7.14-7.15, 8.1-8.10, 11.1-11.6, 14.9-14.10, 15.8-15.15_

- [x] 2. Definições de Tipos e Interfaces Principais
  - [x] 2.1 Criar tipos TypeScript para todas as tabelas do banco
    - Definir tipos PaymentMethod, ManualPayment, PaymentFile, PaymentAuditLog
    - Definir enums PaymentStatus, PaymentType
    - Definir extensão SupportConversation com payment_id
    - _Requisitos: 1.1-1.10, 2.5-2.8_
  
  - [ ]* 2.2 Escrever teste de propriedade para exclusividade de referência de entidade de pagamento
    - **Propriedade 6: Exclusividade de Referência de Entidade de Pagamento**
    - **Valida: Requisitos 2.6**

- [x] 3. Serviço de Métodos de Pagamento
  - [x] 3.1 Implementar classe PaymentMethodService
    - Criar método listActive() para buscar métodos de pagamento ativos
    - Criar método getById() com cache
    - Criar método create() com validação
    - Criar método update()
    - Criar método setDefault() (remove padrão anterior)
    - Criar método toggleActive()
    - _Requisitos: 1.1-1.10, 2.1-2.4_
  
  - [ ]* 3.2 Escrever teste de propriedade para validação de método de pagamento
    - **Propriedade 1: Validação de Método de Pagamento**
    - **Valida: Requisitos 1.2**
  
  - [ ]* 3.3 Escrever teste de propriedade para aceitação de campos opcionais
    - **Propriedade 2: Aceitação de Campos Opcionais**
    - **Valida: Requisitos 1.3**
  
  - [ ]* 3.4 Escrever teste de propriedade para método de pagamento padrão único
    - **Propriedade 3: Método de Pagamento Padrão Único**
    - **Valida: Requisitos 1.8**
  
  - [ ]* 3.5 Escrever teste de propriedade para exibição de métodos de pagamento ativos
    - **Propriedade 4: Exibição de Métodos de Pagamento Ativos**
    - **Valida: Requisitos 2.1, 2.2**
  
  - [ ]* 3.6 Escrever testes unitários para operações CRUD de métodos de pagamento
    - Testar criação de método de pagamento com todos os campos obrigatórios
    - Testar criação de método de pagamento com campos opcionais
    - Testar definição de padrão remove padrão anterior
    - Testar alternância de status ativo
    - _Requisitos: 1.1-1.10_

- [x] 4. Serviço de Pagamento Principal
  - [x] 4.1 Implementar classe PaymentService
    - Criar método create() com geração de número de referência
    - Criar método getById() com dados relacionados (método de pagamento, usuário, arquivos)
    - Criar método listByUser() com filtragem
    - Criar método updateStatus() com validação
    - Implementar lógica de validação de transição de status
    - _Requisitos: 2.5-2.10, 8.1-8.10_
  
  - [ ]* 4.2 Escrever teste de propriedade para status inicial de pagamento
    - **Propriedade 5: Status Inicial de Pagamento**
    - **Valida: Requisitos 2.5, 8.2**
  
  - [ ]* 4.3 Escrever teste de propriedade para números de referência de pagamento únicos
    - **Propriedade 7: Números de Referência de Pagamento Únicos**
    - **Valida: Requisitos 2.8**
  
  - [ ]* 4.4 Escrever teste de propriedade para imutabilidade de status aprovado
    - **Propriedade 21: Imutabilidade de Status Aprovado**
    - **Valida: Requisitos 8.8**
  
  - [ ]* 4.5 Escrever teste de propriedade para restrição de transição de status rejeitado
    - **Propriedade 22: Restrição de Transição de Status Rejeitado**
    - **Valida: Requisitos 8.9**

- [x] 5. Serviço de Upload de Arquivos
  - [x] 5.1 Implementar classe FileUploadService
    - Criar método validateFile() (tipo, tamanho, correspondência de tipo MIME)
    - Criar método upload() com rastreamento de progresso
    - Criar método generateThumbnail() para imagens
    - Criar método getSignedUrl() com expiração de 1 hora
    - Criar método listByPayment()
    - Implementar verificação de limite de taxa (10 uploads por hora por usuário)
    - _Requisitos: 3.1-3.12, 14.1-14.15_
  
  - [ ]* 5.2 Escrever teste de propriedade para validação de tipo de arquivo
    - **Propriedade 8: Validação de Tipo de Arquivo**
    - **Valida: Requisitos 3.2**
  
  - [ ]* 5.3 Escrever teste de propriedade para validação de tamanho de arquivo
    - **Propriedade 9: Validação de Tamanho de Arquivo**
    - **Valida: Requisitos 3.3**
  
  - [ ]* 5.4 Escrever teste de propriedade para máximo de arquivos por pagamento
    - **Propriedade 10: Máximo de Arquivos Por Pagamento**
    - **Valida: Requisitos 3.6**
  
  - [ ]* 5.5 Escrever teste de propriedade para transição de status no primeiro upload
    - **Propriedade 11: Transição de Status no Primeiro Upload de Arquivo**
    - **Valida: Requisitos 3.11, 8.3**
  
  - [ ]* 5.6 Escrever teste de propriedade para correspondência de tipo MIME e extensão
    - **Propriedade 28: Correspondência de Tipo MIME e Extensão**
    - **Valida: Requisitos 14.1**
  
  - [ ]* 5.7 Escrever teste de propriedade para limite de taxa de upload de arquivo
    - **Propriedade 30: Limite de Taxa de Upload de Arquivo**
    - **Valida: Requisitos 14.5**
  
  - [ ]* 5.8 Escrever testes unitários para casos extremos de upload de arquivo
    - Testar upload de arquivo de exatamente 5MB com sucesso
    - Testar upload de 5MB + 1 byte falha
    - Testar upload do 6º arquivo para pagamento falha
    - Testar rejeição de arquivo infectado por malware
    - _Requisitos: 3.1-3.12, 14.1-14.15_

- [x] 6. Checkpoint - Serviços Principais Completos
  - Garantir que todos os testes passem, perguntar ao usuário se surgirem dúvidas.

- [x] 7. Serviço de Integração de Conversas
  - [x] 7.1 Implementar extensões do ConversationService
    - Criar método createForPayment() (cria conversa automaticamente com assunto formatado)
    - Criar método sendMessage() com suporte a anexos
    - Criar método markAsRead()
    - Criar método getMessages() com assinatura em tempo real
    - _Requisitos: 4.1-4.11_
  
  - [ ]* 7.2 Escrever teste de propriedade para criação automática de conversa
    - **Propriedade 12: Criação Automática de Conversa**
    - **Valida: Requisitos 4.1, 4.3**
  
  - [ ]* 7.3 Escrever teste de propriedade para formato de assunto de conversa
    - **Propriedade 13: Formato de Assunto de Conversa**
    - **Valida: Requisitos 4.2**
  
  - [ ]* 7.4 Escrever testes unitários para integração de conversa
    - Testar conversa criada com formato de assunto correto
    - Testar primeira mensagem contém detalhes do pagamento
    - Testar anexos de arquivo vinculados à conversa
    - _Requisitos: 4.1-4.11_

- [x] 8. Aprovação de Pagamento e Ações
  - [x] 8.1 Implementar métodos de ação admin no PaymentService
    - Criar método approve() (atualiza status, cria log de auditoria, aciona integração)
    - Criar método reject() (atualiza status, armazena motivo, cria log de auditoria)
    - Criar método requestInfo() (atualiza status, envia mensagem, cria log de auditoria)
    - _Requisitos: 7.1-7.15_
  
  - [ ]* 8.2 Escrever teste de propriedade para transição de status de aprovação de pagamento
    - **Propriedade 16: Transição de Status de Aprovação de Pagamento**
    - **Valida: Requisitos 7.3**
  
  - [ ]* 8.3 Escrever teste de propriedade para completude do log de auditoria
    - **Propriedade 20: Completude do Log de Auditoria**
    - **Valida: Requisitos 7.14, 11.2**
  
  - [ ]* 8.4 Escrever testes unitários para ações admin
    - Testar approve cria log de auditoria com admin_id
    - Testar reject armazena motivo da rejeição
    - Testar requestInfo envia mensagem para conversa
    - _Requisitos: 7.1-7.15_

- [x] 9. Serviço de Integração
  - [x] 9.1 Implementar classe IntegrationService
    - Criar método de orquestração handlePaymentApproval()
    - Criar método updateQuoteStatus()
    - Criar método activateSubscription()
    - Criar método createSubscriptionDeliveries()
    - Criar método calculateNextDeliveryDate() baseado em plan_type
    - _Requisitos: 15.1-15.15_
  
  - [ ]* 9.2 Escrever teste de propriedade para atualização de status de orçamento na aprovação
    - **Propriedade 17: Atualização de Status de Orçamento na Aprovação**
    - **Valida: Requisitos 7.5, 15.1**
  
  - [ ]* 9.3 Escrever teste de propriedade para ativação de assinatura na aprovação
    - **Propriedade 18: Ativação de Assinatura na Aprovação**
    - **Valida: Requisitos 7.6, 15.3**
  
  - [ ]* 9.4 Escrever teste de propriedade para criação de entregas de assinatura
    - **Propriedade 19: Criação de Entregas de Assinatura**
    - **Valida: Requisitos 15.4**
  
  - [ ]* 9.5 Escrever testes de integração para fluxo completo de pagamento
    - Testar aprovação de pagamento de orçamento atualiza orçamento e cria log de auditoria
    - Testar aprovação de pagamento de assinatura ativa assinatura e cria entregas
    - Testar pagamento rejeitado não aciona integrações
    - _Requisitos: 15.1-15.15_

- [x] 10. Checkpoint - Serviços Backend Completos
  - Garantir que todos os testes passem, perguntar ao usuário se surgirem dúvidas.

- [x] 11. Interface de Configuração de Métodos de Pagamento Admin
  - [x] 11.1 Criar componente PaymentMethodForm
    - Construir formulário com componentes shadcn/ui (Input, Select, Textarea, Switch)
    - Implementar validação para campos obrigatórios
    - Adicionar seção de campos opcionais (payment_link, pix_key, account_details)
    - Implementar envio de formulário com mutação React Query
    - _Requisitos: 1.1-1.10_
  
  - [x] 11.2 Criar componente PaymentMethodList
    - Exibir todos os métodos de pagamento com indicadores ativo/inativo
    - Adicionar botões alternar ativo/inativo
    - Adicionar botão definir como padrão
    - Adicionar ações editar e excluir
    - Implementar arrastar e soltar para display_order
    - _Requisitos: 1.1-1.10_
  
  - [ ]* 11.3 Escrever testes unitários para UI de método de pagamento
    - Testar validação de formulário mostra erros para campos obrigatórios ausentes
    - Testar formulário aceita campos opcionais
    - Testar alternância ativa atualiza banco de dados
    - Testar definir padrão atualiza corretamente
    - _Requisitos: 1.1-1.10_

- [x] 12. Dashboard de Pagamentos Admin
  - [x] 12.1 Criar componente PaymentDashboard
    - Construir layout de dashboard com barra lateral de filtros
    - Implementar filtro de status (pending, under_review, requires_info)
    - Implementar filtro de método de pagamento
    - Implementar filtro de intervalo de datas
    - Implementar busca por número de referência ou nome do cliente
    - Exibir lista de pagamentos com informações-chave
    - Adicionar opções de ordenação (data, valor, cliente, status)
    - Mostrar badge de contagem de pagamentos pendentes
    - _Requisitos: 5.1-5.10_
  
  - [x] 12.2 Criar componente PaymentListItem
    - Exibir número de referência, cliente, valor, método, status
    - Mostrar badge de contagem de arquivos
    - Mostrar badge de mensagens não lidas
    - Adicionar manipulador de clique para navegar para detalhes
    - Implementar codificação de cores de status
    - _Requisitos: 5.1-5.10_
  
  - [ ]* 12.3 Escrever teste de propriedade para filtragem de dashboard admin
    - **Propriedade 14: Filtragem de Dashboard Admin**
    - **Valida: Requisitos 5.1**
  
  - [ ]* 12.4 Escrever teste de propriedade para correção de aplicação de filtro
    - **Propriedade 15: Correção de Aplicação de Filtro**
    - **Valida: Requisitos 5.4**
  
  - [ ]* 12.5 Escrever testes unitários para UI de dashboard
    - Testar dashboard exibe apenas pagamentos pending/under_review/requires_info
    - Testar filtros atualizam lista exibida corretamente
    - Testar busca encontra pagamentos por número de referência
    - Testar ordenação funciona corretamente
    - _Requisitos: 5.1-5.10_

- [x] 13. Visualização de Detalhes de Pagamento Admin
  - [x] 13.1 Criar componente PaymentDetailsView
    - Exibir informações de pagamento (referência, cliente, valor, método, status)
    - Exibir linha do tempo de histórico de pagamento com mudanças de status
    - Mostrar detalhes de orçamento ou assinatura vinculados
    - Exibir todos os arquivos de comprovante de pagamento enviados
    - Implementar galeria de imagens para imagens de comprovante com miniaturas
    - Adicionar visualizador/download de PDF para comprovantes PDF
    - Mostrar log de auditoria com ações admin
    - _Requisitos: 6.1-6.10_
  
  - [x] 13.2 Criar componente PaymentActionButtons
    - Adicionar botão Aprovar com diálogo de confirmação
    - Adicionar botão Rejeitar com diálogo de entrada de motivo
    - Adicionar botão Solicitar Mais Informações com diálogo de entrada de mensagem
    - Desabilitar botões com base no status atual
    - Mostrar estados de carregamento durante ações
    - _Requisitos: 7.1-7.15_
  
  - [ ]* 13.3 Escrever teste de propriedade para autorização de acesso a arquivo
    - **Propriedade 31: Autorização de Acesso a Arquivo**
    - **Valida: Requisitos 14.9, 6.10**
  
  - [ ]* 13.4 Escrever testes unitários para UI de detalhes de pagamento
    - Testar botão aprovar aciona fluxo de aprovação
    - Testar botão rejeitar requer motivo
    - Testar botão solicitar informações envia mensagem
    - Testar botões desabilitados para pagamentos aprovados/rejeitados
    - _Requisitos: 6.1-6.10, 7.1-7.15_

- [x] 14. Operações em Lote Admin
  - [x] 14.1 Implementar métodos em lote do AdminPaymentService
    - Criar método bulkApprove() com filtragem de status
    - Criar método bulkExport() gerando CSV
    - Criar método bulkMessage() postando em conversas
    - Implementar processamento assíncrono para seleções grandes
    - Retornar BulkOperationResult com contagens de sucesso/falha
    - _Requisitos: 12.1-12.15_
  
  - [x] 14.2 Criar componente BulkOperationsToolbar
    - Adicionar caixas de seleção aos itens da lista de pagamentos
    - Adicionar caixa de seleção "Selecionar Todos"
    - Mostrar botões de ação em lote quando itens selecionados
    - Exibir contagem selecionada
    - Mostrar indicador de progresso durante operações em lote
    - Exibir relatório resumido após conclusão
    - _Requisitos: 12.1-12.15_
  
  - [ ]* 14.3 Escrever teste de propriedade para filtro de status de aprovação em lote
    - **Propriedade 26: Filtro de Status de Aprovação em Lote**
    - **Valida: Requisitos 12.6, 12.7**
  
  - [ ]* 14.4 Escrever testes unitários para operações em lote
    - Testar aprovação em lote apenas aprova pagamentos under_review
    - Testar aprovação em lote pula pagamentos com status inválido
    - Testar exportação em lote gera CSV correto
    - Testar mensagem em lote posta em todas as conversas selecionadas
    - _Requisitos: 12.1-12.15_

- [x] 15. Checkpoint - Interface Admin Completa
  - Garantir que todos os testes passem, perguntar ao usuário se surgirem dúvidas.

- [x] 16. Fluxo de Iniciação de Pagamento do Cliente
  - [x] 16.1 Criar componente PaymentInitiationFlow
    - Exibir métodos de pagamento ativos disponíveis
    - Mostrar detalhes do método de pagamento (instruções, link, chave PIX)
    - Adicionar seleção de método de pagamento
    - Exibir instruções do método selecionado de forma proeminente
    - Adicionar botão "Confirmar Método de Pagamento"
    - Criar registro de pagamento na confirmação
    - Navegar para detalhes do pagamento após criação
    - _Requisitos: 2.1-2.10_
  
  - [x] 16.2 Integrar iniciação de pagamento no fluxo de orçamento
    - Adicionar botão "Pagar Agora" à página de detalhes do orçamento
    - Passar quote_id e valor para PaymentInitiationFlow
    - Lidar com sucesso de criação de pagamento
    - _Requisitos: 2.1-2.10, 15.1-15.2_
  
  - [x] 16.3 Integrar iniciação de pagamento no fluxo de assinatura
    - Adicionar botão "Pagar Assinatura" ao checkout de assinatura
    - Passar subscription_id e valor para PaymentInitiationFlow
    - Lidar com sucesso de criação de pagamento
    - _Requisitos: 2.1-2.10, 15.3-15.7_
  
  - [ ]* 16.4 Escrever testes unitários para iniciação de pagamento
    - Testar apenas métodos de pagamento ativos exibidos
    - Testar pagamento criado com quote_id correto
    - Testar pagamento criado com subscription_id correto
    - Testar pagamento não pode ter quote_id e subscription_id simultaneamente
    - _Requisitos: 2.1-2.10_

- [x] 17. Interface de Upload de Arquivo do Cliente
  - [x] 17.1 Criar FileUploadComponent
    - Construir área de upload arrastar e soltar
    - Adicionar entrada de arquivo com atributo accept (image/*, application/pdf)
    - Mostrar visualização de arquivo para imagens
    - Mostrar nome e tamanho do arquivo para PDFs
    - Exibir barra de progresso de upload
    - Mostrar erros de validação (tipo, tamanho)
    - Permitir seleção de múltiplos arquivos (até 5 no total)
    - Adicionar suporte a captura de câmera móvel
    - _Requisitos: 3.1-3.12, 17.6_
  
  - [x] 17.2 Criar componente UploadedFilesList
    - Exibir todos os arquivos enviados com miniaturas
    - Mostrar nome do arquivo, tamanho, data de upload
    - Adicionar botão ver tamanho completo para imagens
    - Adicionar botão download para PDFs
    - Mostrar status de upload (enviando, completo, erro)
    - _Requisitos: 3.1-3.12_
  
  - [ ]* 17.3 Escrever testes unitários para UI de upload de arquivo
    - Testar validação de tipo de arquivo mostra erro para tipos inválidos
    - Testar validação de tamanho de arquivo mostra erro para arquivos grandes demais
    - Testar progresso de upload exibe corretamente
    - Testar 6º upload de arquivo é impedido
    - Testar captura de câmera móvel funciona
    - _Requisitos: 3.1-3.12, 17.6_

- [x] 18. Página Meus Pagamentos do Cliente
  - [x] 18.1 Criar componente MyPaymentsPage
    - Exibir todos os pagamentos do cliente em layout de cartão
    - Mostrar número de referência, valor, método, status, data
    - Adicionar filtro de status (todos, pending, under_review, approved, rejected)
    - Adicionar filtro de intervalo de datas
    - Implementar codificação de cores e ícones de status
    - Adicionar manipulador de clique para navegar para detalhes do pagamento
    - Mostrar estado vazio quando não há pagamentos
    - _Requisitos: 13.1-13.15_
  
  - [x] 18.2 Criar componente CustomerPaymentDetails
    - Exibir informações e instruções de pagamento
    - Mostrar status atual com indicador visual
    - Exibir linha do tempo de histórico de status
    - Mostrar arquivos de comprovante enviados
    - Adicionar seção de upload de arquivo (se o status permitir)
    - Exibir motivo da rejeição (se rejeitado)
    - Exibir mensagem do admin (se requires_info)
    - Adicionar link para conversa de suporte
    - Adicionar botão baixar recibo (se aprovado)
    - _Requisitos: 13.1-13.15_
  
  - [ ]* 18.3 Escrever teste de propriedade para permissão de upload de arquivo para pagamentos rejeitados
    - **Propriedade 27: Permissão de Upload de Arquivo para Pagamentos Rejeitados**
    - **Valida: Requisitos 13.9**
  
  - [ ]* 18.4 Escrever testes unitários para UI de pagamentos do cliente
    - Testar página meus pagamentos exibe apenas pagamentos do cliente
    - Testar filtros funcionam corretamente
    - Testar pagamento rejeitado mostra motivo da rejeição
    - Testar pagamento requires_info mostra mensagem do admin
    - Testar pagamento aprovado mostra botão baixar recibo
    - _Requisitos: 13.1-13.15_

- [x] 19. Geração de Recibo de Pagamento
  - [x] 19.1 Implementar serviço de geração de recibo
    - Criar método generateReceipt()
    - Gerar PDF com detalhes do pagamento (referência, valor, data, método)
    - Incluir data de aprovação e nome do admin
    - Adicionar marca e logotipo da empresa
    - Retornar blob PDF para download
    - _Requisitos: 13.13-13.14_
  
  - [ ]* 19.2 Escrever teste de propriedade para persistência de arquivo de pagamento
    - **Propriedade 25: Persistência de Arquivo de Pagamento**
    - **Valida: Requisitos 11.5**
  
  - [ ]* 19.3 Escrever testes unitários para geração de recibo
    - Testar recibo contém todas as informações necessárias
    - Testar PDF do recibo é válido e baixável
    - Testar recibo apenas gerado para pagamentos aprovados
    - _Requisitos: 13.13-13.14_

- [x] 20. Checkpoint - Interface do Cliente Completa
  - Garantir que todos os testes passem, perguntar ao usuário se surgirem dúvidas.

- [x] 21. Serviço de Notificação
  - [x] 21.1 Implementar classe NotificationService
    - Criar método sendPaymentCreated() com template de email
    - Criar método sendPaymentUnderReview() (para admins)
    - Criar método sendPaymentApproved() com template de email
    - Criar método sendPaymentRejected() com motivo
    - Criar método sendInfoRequested() com mensagem do admin
    - Criar método sendNewMessage() para mensagens de conversa
    - Integrar com serviço de email existente
    - _Requisitos: 9.1-9.12_
  
  - [x] 21.2 Criar templates de email
    - Projetar template payment_created com instruções
    - Projetar template payment_under_review para admins
    - Projetar template payment_approved com confirmação
    - Projetar template payment_rejected com motivo e instruções de reenvio
    - Projetar template info_requested com mensagem do admin
    - Projetar template new_message com link da conversa
    - _Requisitos: 9.1-9.12_
  
  - [ ]* 21.3 Escrever teste de propriedade para notificação por email na criação de pagamento
    - **Propriedade 23: Notificação por Email na Criação de Pagamento**
    - **Valida: Requisitos 9.1**
  
  - [ ]* 21.4 Escrever testes unitários para serviço de notificação
    - Testar pagamento criado envia email para cliente
    - Testar pagamento em revisão envia email para admins
    - Testar pagamento aprovado envia email para cliente
    - Testar pagamento rejeitado inclui motivo da rejeição
    - Testar templates de email renderizam corretamente
    - _Requisitos: 9.1-9.12_

- [x] 22. Sistema de Notificação In-App
  - [x] 22.1 Implementar badge de notificação in-app
    - Criar hook useNotificationCount com Supabase Realtime
    - Assinar mudanças de status de pagamento
    - Assinar novas mensagens de conversa
    - Calcular contagem não lida para clientes (requires_info + mensagens não lidas)
    - Calcular contagem não lida para admins (pending + under_review + mensagens não lidas)
    - _Requisitos: 10.1-10.10_
  
  - [x] 22.2 Criar componente NotificationBadge
    - Exibir contagem de badge na navegação
    - Atualizar contagem em tempo real
    - Adicionar manipulador de clique para navegar para pagamentos
    - Mostrar máximo 99+ para contagens grandes
    - Adicionar indicador visual para novas notificações
    - _Requisitos: 10.1-10.10_
  
  - [ ]* 22.3 Escrever teste de propriedade para atualização de badge de notificação em tempo real
    - **Propriedade 24: Atualização de Badge de Notificação em Tempo Real**
    - **Valida: Requisitos 10.6, 16.2**
  
  - [ ]* 22.4 Escrever testes unitários para badge de notificação
    - Testar contagem de badge atualiza em novo pagamento
    - Testar contagem de badge atualiza em mudança de status
    - Testar contagem de badge atualiza em nova mensagem
    - Testar badge limpa quando usuário visualiza pagamento
    - _Requisitos: 10.1-10.10_

- [x] 23. Implementação de Atualizações em Tempo Real
  - [x] 23.1 Implementar assinaturas Supabase Realtime
    - Criar hook usePaymentRealtime para mudanças de status de pagamento
    - Criar hook useConversationRealtime para novas mensagens
    - Assinar mudanças na tabela manual_payments
    - Assinar mudanças na tabela support_messages
    - Lidar com perda de conexão e reconexão
    - Implementar backoff exponencial para reconexão
    - _Requisitos: 16.1-16.15_
  
  - [x] 23.2 Integrar atualizações em tempo real nos componentes
    - Adicionar atualizações em tempo real ao PaymentDashboard
    - Adicionar atualizações em tempo real ao PaymentDetailsView
    - Adicionar atualizações em tempo real ao MyPaymentsPage
    - Adicionar atualizações em tempo real às visualizações de conversa
    - Mostrar indicador visual quando atualizações recebidas
    - Debounce de atualizações rápidas (500ms)
    - _Requisitos: 16.1-16.15_
  
  - [ ]* 23.3 Escrever testes unitários para atualizações em tempo real
    - Testar mudança de status de pagamento atualiza UI
    - Testar nova mensagem atualiza conversa
    - Testar perda de conexão mostra aviso
    - Testar reconexão busca atualizações perdidas
    - _Requisitos: 16.1-16.15_

- [x] 24. Responsividade Mobile
  - [x] 24.1 Implementar layouts responsivos
    - Tornar PaymentDashboard responsivo (recolher filtros para drawer no mobile)
    - Tornar PaymentDetailsView responsivo (empilhar seções verticalmente)
    - Tornar MyPaymentsPage responsivo (layout de cartão no mobile)
    - Tornar FileUploadComponent responsivo (largura total no mobile)
    - Garantir que todos os formulários sejam mobile-friendly (empilhamento vertical)
    - _Requisitos: 17.1-17.15_
  
  - [x] 24.2 Otimizar para interações mobile
    - Implementar tamanhos de botão amigáveis ao toque (mínimo 44x44px)
    - Adicionar gestos de deslizar para navegação de pagamento
    - Otimizar carregamento de imagem para mobile (lazy loading, compressão)
    - Implementar galeria de imagens otimizada para mobile
    - Testar no iOS Safari e Android Chrome
    - _Requisitos: 17.1-17.15_
  
  - [ ]* 24.3 Escrever testes unitários para responsividade mobile
    - Testar componentes renderizam corretamente em viewport mobile
    - Testar interações de toque funcionam corretamente
    - Testar captura de câmera mobile funciona
    - Testar gestos de deslizar funcionam
    - _Requisitos: 17.1-17.15_

- [x] 25. Otimização de Performance
  - [x] 25.1 Implementar otimizações de performance
    - Adicionar cache React Query para métodos de pagamento (cache de 5 min)
    - Implementar paginação para listas de pagamento (25 por página)
    - Adicionar scroll infinito para listas de pagamento mobile
    - Implementar scroll virtual para listas grandes
    - Otimizar consultas de banco de dados (adicionar índices faltantes)
    - Implementar cache de resultado de consulta
    - _Requisitos: 18.1-18.15_
  
  - [x] 25.2 Otimizar operações de arquivo
    - Gerar miniaturas de forma assíncrona (job em background)
    - Comprimir imagens antes do armazenamento
    - Implementar lazy loading para imagens
    - Adicionar skeletons de carregamento para melhor performance percebida
    - _Requisitos: 18.1-18.15_
  
  - [ ]* 25.3 Escrever teste de propriedade para performance de carregamento do dashboard
    - **Propriedade 32: Performance de Carregamento do Dashboard**
    - **Valida: Requisitos 18.1**
  
  - [ ]* 25.4 Escrever teste de propriedade para limite de paginação
    - **Propriedade 33: Limite de Paginação**
    - **Valida: Requisitos 18.5**
  
  - [ ]* 25.5 Escrever testes unitários para otimizações de performance
    - Testar cache React Query funciona corretamente
    - Testar paginação retorna número correto de itens
    - Testar scroll infinito carrega mais itens
    - Testar lazy loading de imagens funciona
    - _Requisitos: 18.1-18.15_

- [x] 26. Tratamento de Erros e Feedback do Usuário
  - [x] 26.1 Implementar tratamento abrangente de erros
    - Criar classe PaymentError com códigos de erro
    - Implementar componentes de boundary de erro
    - Adicionar lógica de retry com backoff exponencial
    - Criar mensagens de erro amigáveis para todos os tipos de erro
    - Implementar log de erros no servidor
    - _Requisitos: 19.1-19.15_
  
  - [x] 26.2 Criar componentes de feedback
    - Criar componente Toast para mensagens de sucesso/erro
    - Criar componente LoadingSpinner com progresso
    - Criar componente ErrorMessage com botão retry
    - Criar componente OfflineIndicator
    - Adicionar estados de carregamento a todas as operações assíncronas
    - _Requisitos: 19.1-19.15_
  
  - [ ]* 26.3 Escrever teste de propriedade para especificidade de mensagem de erro
    - **Propriedade 34: Especificidade de Mensagem de Erro**
    - **Valida: Requisitos 19.1**
  
  - [ ]* 26.4 Escrever teste de propriedade para destaque de campo inválido
    - **Propriedade 35: Destaque de Campo Inválido**
    - **Valida: Requisitos 19.5**
  
  - [ ]* 26.5 Escrever testes unitários para tratamento de erros
    - Testar erro de upload de arquivo mostra mensagem específica
    - Testar erro de rede mostra opção de retry
    - Testar erros de validação destacam campos
    - Testar indicador offline aparece quando desconectado
    - _Requisitos: 19.1-19.15_

- [x] 27. Implementação de Acessibilidade
  - [x] 27.1 Implementar recursos de acessibilidade
    - Adicionar texto alt a todas as imagens e ícones
    - Usar elementos HTML semânticos em todo o código
    - Adicionar labels ARIA a todos os elementos interativos
    - Implementar navegação por teclado para toda funcionalidade
    - Adicionar indicadores de foco visíveis
    - Garantir ordem de tabulação lógica
    - _Requisitos: 20.1-20.15_
  
  - [x] 27.2 Implementar regiões ARIA live
    - Adicionar regiões live para mudanças de status
    - Adicionar regiões live para mensagens de erro
    - Adicionar regiões live para mensagens de sucesso
    - Anunciar mudanças de conteúdo dinâmico para leitores de tela
    - _Requisitos: 20.1-20.15_
  
  - [ ]* 27.3 Escrever teste de propriedade para suporte a navegação por teclado
    - **Propriedade 36: Suporte a Navegação por Teclado**
    - **Valida: Requisitos 20.4**
  
  - [ ]* 27.4 Escrever teste de propriedade para conformidade de contraste de cor
    - **Propriedade 37: Conformidade de Contraste de Cor**
    - **Valida: Requisitos 20.7**
  
  - [ ]* 27.5 Escrever testes de acessibilidade
    - Testar todos os elementos interativos acessíveis por teclado
    - Testar leitor de tela anuncia mudanças de status
    - Testar contraste de cor atende WCAG AA
    - Testar indicadores de foco visíveis
    - Testar labels de formulário devidamente associados
    - _Requisitos: 20.1-20.15_

- [x] 28. Endurecimento de Segurança
  - [x] 28.1 Implementar medidas de segurança
    - Adicionar validação de tipo de arquivo server-side (não confiar no cliente)
    - Implementar varredura de malware com ClamAV ou similar
    - Remover dados EXIF de imagens enviadas
    - Gerar nomes de arquivo únicos (prevenir sobrescritas)
    - Implementar limite de taxa em uploads de arquivo
    - Adicionar proteção CSRF a todas as mutações
    - Sanitizar entrada do usuário para prevenir XSS
    - _Requisitos: 14.1-14.15_
  
  - [ ]* 28.2 Escrever teste de propriedade para detecção e log de malware
    - **Propriedade 29: Detecção e Log de Malware**
    - **Valida: Requisitos 14.4**
  
  - [ ]* 28.3 Escrever testes de segurança
    - Testar arquivo malicioso rejeitado
    - Testar limite de taxa bloqueia uploads excessivos
    - Testar spoofing de tipo MIME detectado
    - Testar tentativas de XSS sanitizadas
    - Testar políticas RLS aplicadas
    - _Requisitos: 14.1-14.15_

- [x] 29. Integração Final e Testes
  - [x] 29.1 Testes de integração end-to-end
    - Testar fluxo completo de pagamento do cliente (criar → upload → aprovar)
    - Testar fluxo completo de trabalho admin (revisar → aprovar → verificar integração)
    - Testar fluxo de rejeição e reenvio
    - Testar operações em lote com status mistos
    - Testar atualizações em tempo real em múltiplos clientes
    - Testar notificações por email enviadas corretamente
    - _Requisitos: Todos_
  
  - [x] 29.2 Testes de performance
    - Teste de carga com 100 usuários simultâneos
    - Testar dashboard com 100+ pagamentos pendentes
    - Testar upload de arquivo com arquivos de tamanho máximo
    - Testar operações em lote com 50+ pagamentos
    - Verificar todas as operações atendem requisitos de performance
    - _Requisitos: 18.1-18.15_
  
  - [x] 29.3 Auditoria de segurança
    - Revisar todas as políticas RLS
    - Testar segurança de upload de arquivo
    - Verificar limite de taxa funciona
    - Testar autorização em todos os endpoints
    - Revisar completude do log de auditoria
    - _Requisitos: 14.1-14.15_
  
  - [x] 29.4 Auditoria de acessibilidade
    - Testar com leitor de tela NVDA
    - Testar com leitor de tela JAWS
    - Testar com VoiceOver no iOS
    - Testar navegação apenas por teclado
    - Verificar conformidade WCAG AA
    - _Requisitos: 20.1-20.15_

- [x] 30. Documentação e Deployment
  - [x] 30.1 Criar documentação
    - Escrever guia do usuário admin para gerenciamento de pagamento
    - Escrever documentação de ajuda do cliente para processo de pagamento
    - Documentar endpoints de API e tipos
    - Criar checklist de deployment
    - Documentar variáveis de ambiente
    - _Requisitos: Todos_
  
  - [x] 30.2 Preparação de deployment
    - Executar todas as migrações de banco de dados
    - Criar bucket Supabase Storage 'payment-proofs'
    - Configurar políticas RLS do bucket
    - Configurar templates de email
    - Configurar monitoramento e alertas
    - Configurar estratégia de backup
    - _Requisitos: Todos_

- [x] 31. Checkpoint Final - Sistema Completo
  - Garantir que todos os testes passem, perguntar ao usuário se surgirem dúvidas.
  - Verificar todos os requisitos implementados
  - Confirmar sistema pronto para deployment em produção

## Notas

- Tarefas marcadas com `*` são testes baseados em propriedades e testes unitários opcionais que podem ser pulados para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental em marcos importantes
- Testes de propriedade validam propriedades de corretude universais com mínimo de 100 iterações
- Testes unitários validam exemplos específicos, casos extremos e condições de erro
- Testes de integração verificam fluxos end-to-end e integração do sistema
- A implementação segue uma abordagem em fases: banco de dados → serviços → UI admin → UI cliente → notificações → polimento
- Todo código deve usar TypeScript strict mode
- Todos os componentes devem usar shadcn/ui para consistência
- Toda busca de dados deve usar React Query
- Todas as atualizações em tempo real devem usar Supabase Realtime

## Resumo de Atualização (2025)

Este documento de tarefas foi atualizado para garantir alinhamento completo com:
- **20 requisitos** definidos no requirements.md
- **37 propriedades de corretude** definidas no design.md
- Status atual de implementação (tarefas completas, em progresso e pendentes)

### Principais Melhorias:

1. **Mapeamento de Propriedades**: Adicionada tabela de mapeamento completa mostrando todas as 37 propriedades e suas tarefas de teste correspondentes
2. **Cobertura de Testes**: Garantido que cada propriedade de corretude tem uma tarefa de teste de propriedade correspondente
3. **Organização**: Testes de propriedade organizados próximos às suas implementações para facilitar o desenvolvimento
4. **Rastreabilidade**: Todas as tarefas mantêm referências claras aos requisitos que validam
5. **Status Preservado**: Todos os status de conclusão ([x], [~], [ ]) foram preservados do documento original

### Próximos Passos Recomendados:

1. Revisar tarefas pendentes marcadas como [~] (em progresso) e atualizá-las para [x] quando concluídas
2. Priorizar testes de propriedade para funcionalidades críticas (validação de arquivo, transições de status, autorização)
3. Executar testes de integração end-to-end (tarefa 29.1) para validar fluxos completos
4. Completar auditoria de segurança (tarefa 29.3) antes do deployment em produção
5. Finalizar documentação (tarefa 30.1) para facilitar manutenção futura
