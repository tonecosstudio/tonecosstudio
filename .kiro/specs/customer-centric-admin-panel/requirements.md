# Requirements Document

## Introduction

Este documento especifica os requisitos para um painel administrativo centrado no cliente que consolida todas as informações dos usuários em um único lugar. O sistema permitirá aos administradores visualizar e gerenciar clientes, seus planos, saldo de coins, pedidos e histórico de atividades através de uma interface unificada.

## Glossary

- **Admin_Panel**: Interface administrativa do sistema
- **Customer_List**: Lista consolidada de todos os usuários do sistema
- **Customer_Profile**: Página de detalhes de um cliente específico
- **Subscription**: Assinatura ativa de um cliente (Mensal ou Anual)
- **Coins_Balance**: Saldo atual de moedas virtuais do cliente
- **Order**: Pedido realizado pelo cliente (avulso ou via assinatura)
- **Activity_Timestamp**: Data e hora da última atividade do cliente
- **Coins_History**: Histórico de transações de coins do cliente
- **Order_History**: Histórico consolidado de todos os pedidos do cliente

## Requirements

### Requirement 1: Exibir Lista Consolidada de Clientes

**User Story:** Como administrador, eu quero visualizar todos os clientes em uma única lista consolidada, para que eu possa ter uma visão geral de todos os usuários do sistema.

#### Acceptance Criteria

1. THE Customer_List SHALL exibir todos os usuários registrados no sistema
2. THE Customer_List SHALL incluir assinantes, compradores avulsos e usuários sem compra na mesma tabela
3. THE Customer_List SHALL exibir o nome ou identificação de cada cliente
4. THE Customer_List SHALL exibir o tipo de plano de cada cliente (Mensal, Anual ou Nenhum)
5. THE Customer_List SHALL exibir o saldo atual de coins de cada cliente
6. THE Customer_List SHALL exibir a quantidade total de pedidos de cada cliente
7. THE Customer_List SHALL exibir o tempo decorrido desde a última atividade de cada cliente

### Requirement 2: Acessar Perfil Detalhado do Cliente

**User Story:** Como administrador, eu quero acessar o perfil detalhado de um cliente, para que eu possa visualizar todas as informações específicas daquele usuário.

#### Acceptance Criteria

1. WHEN o administrador clica em um cliente na lista, THE Admin_Panel SHALL navegar para o Customer_Profile
2. THE Customer_Profile SHALL exibir os dados básicos do cliente
3. THE Customer_Profile SHALL exibir o saldo atual de coins do cliente
4. THE Customer_Profile SHALL exibir informações da assinatura ativa (se existir)
5. THE Customer_Profile SHALL exibir o histórico consolidado de pedidos
6. THE Customer_Profile SHALL exibir o histórico de transações de coins

### Requirement 3: Consolidar Histórico de Pedidos

**User Story:** Como administrador, eu quero visualizar todos os pedidos de um cliente em um único histórico, para que eu possa entender o comportamento de compra completo do usuário.

#### Acceptance Criteria

1. THE Order_History SHALL consolidar pedidos avulsos e pedidos da assinatura em uma única lista
2. THE Order_History SHALL ordenar os pedidos por data de forma cronológica
3. THE Order_History SHALL identificar a origem de cada pedido (avulso ou assinatura)
4. THE Order_History SHALL exibir o status de cada pedido
5. THE Order_History SHALL exibir o valor ou custo em coins de cada pedido

### Requirement 4: Navegar para Seções Específicas

**User Story:** Como administrador, eu quero navegar do perfil do cliente para seções específicas, para que eu possa gerenciar aspectos individuais da conta do cliente.

#### Acceptance Criteria

1. WHEN o administrador está no Customer_Profile, THE Admin_Panel SHALL permitir navegação para a seção de assinatura do cliente
2. WHEN o administrador está no Customer_Profile, THE Admin_Panel SHALL permitir navegação para a seção de pedidos do cliente
3. WHEN o administrador está no Customer_Profile, THE Admin_Panel SHALL permitir navegação para a seção de coins do cliente
4. WHEN o administrador está no Customer_Profile, THE Admin_Panel SHALL permitir navegação para o histórico completo do cliente

### Requirement 5: Filtrar e Ordenar Lista de Clientes

**User Story:** Como administrador, eu quero filtrar e ordenar a lista de clientes, para que eu possa encontrar rapidamente usuários específicos ou grupos de usuários.

#### Acceptance Criteria

1. THE Customer_List SHALL permitir ordenação por nome do cliente
2. THE Customer_List SHALL permitir ordenação por tipo de plano
3. THE Customer_List SHALL permitir ordenação por saldo de coins
4. THE Customer_List SHALL permitir ordenação por quantidade de pedidos
5. THE Customer_List SHALL permitir ordenação por última atividade
6. THE Customer_List SHALL permitir filtrar clientes por tipo de plano (Mensal, Anual, Nenhum)
7. THE Customer_List SHALL permitir buscar clientes por nome ou identificação

### Requirement 6: Exibir Indicadores Visuais de Status

**User Story:** Como administrador, eu quero visualizar indicadores visuais do status dos clientes, para que eu possa identificar rapidamente situações que requerem atenção.

#### Acceptance Criteria

1. THE Customer_List SHALL destacar visualmente clientes com assinatura ativa
2. THE Customer_List SHALL destacar visualmente clientes com saldo baixo de coins
3. THE Customer_List SHALL destacar visualmente clientes inativos por período prolongado
4. WHEN um cliente possui assinatura próxima do vencimento, THE Customer_List SHALL exibir um indicador visual

### Requirement 7: Exibir Métricas Resumidas

**User Story:** Como administrador, eu quero visualizar métricas resumidas sobre a base de clientes, para que eu possa entender rapidamente o estado geral do negócio.

#### Acceptance Criteria

1. THE Customer_List SHALL exibir o total de clientes cadastrados
2. THE Customer_List SHALL exibir o total de assinantes ativos
3. THE Customer_List SHALL exibir o total de clientes com pedidos avulsos
4. THE Customer_List SHALL exibir o total de clientes sem compras
5. THE Customer_List SHALL exibir o total de coins em circulação

### Requirement 8: Atualizar Dados em Tempo Real

**User Story:** Como administrador, eu quero que os dados dos clientes sejam atualizados automaticamente, para que eu sempre visualize informações precisas e atuais.

#### Acceptance Criteria

1. WHEN um cliente realiza uma compra, THE Customer_List SHALL atualizar a quantidade de pedidos automaticamente
2. WHEN o saldo de coins de um cliente muda, THE Customer_List SHALL atualizar o saldo exibido automaticamente
3. WHEN um cliente realiza qualquer atividade, THE Customer_List SHALL atualizar o timestamp de última atividade automaticamente
4. WHEN uma assinatura é criada ou cancelada, THE Customer_List SHALL atualizar o status do plano automaticamente

### Requirement 9: Exibir Histórico de Transações de Coins

**User Story:** Como administrador, eu quero visualizar o histórico completo de transações de coins de um cliente, para que eu possa auditar e entender o uso de coins.

#### Acceptance Criteria

1. THE Coins_History SHALL exibir todas as transações de entrada de coins (compras, bônus, reembolsos)
2. THE Coins_History SHALL exibir todas as transações de saída de coins (compras de personagens, pedidos)
3. THE Coins_History SHALL exibir a data e hora de cada transação
4. THE Coins_History SHALL exibir o saldo resultante após cada transação
5. THE Coins_History SHALL exibir a descrição ou motivo de cada transação

### Requirement 10: Calcular Última Atividade

**User Story:** Como administrador, eu quero visualizar quando foi a última atividade de cada cliente, para que eu possa identificar clientes inativos.

#### Acceptance Criteria

1. THE Activity_Timestamp SHALL considerar login como atividade
2. THE Activity_Timestamp SHALL considerar realização de pedido como atividade
3. THE Activity_Timestamp SHALL considerar compra de coins como atividade
4. THE Activity_Timestamp SHALL considerar alteração de assinatura como atividade
5. THE Activity_Timestamp SHALL exibir o tempo decorrido em formato legível (hoje, X dias, X meses)
