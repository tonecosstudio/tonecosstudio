# Documento de Requisitos - Página Consolidada de Pedidos

## Introdução

Este documento especifica os requisitos para a consolidação das três páginas administrativas existentes (`/admin/assinaturas`, `/admin/entregas`, `/admin/compras-avulsas`) em uma única página unificada `/admin/pedidos`. O objetivo é eliminar redundância, reduzir fragmentação e fornecer uma visão unificada de todos os pedidos e entregas do sistema.

## Glossário

- **Sistema_Pedidos**: O sistema de gerenciamento unificado de pedidos que consolida entregas de assinaturas e compras avulsas
- **Entrega_Assinatura**: Registro na tabela `subscription_deliveries` representando uma entrega programada de uma assinatura
- **Compra_Avulsa**: Registro na tabela `standalone_purchases` representando uma compra única não recorrente
- **Pedido**: Termo genérico que engloba tanto Entrega_Assinatura quanto Compra_Avulsa
- **Status_Pedido**: Estado atual de um pedido (pendente, processando, enviado, entregue, cancelado, etc.)
- **Administrador**: Usuário com permissões administrativas que gerencia pedidos
- **Cliente**: Usuário final que realiza assinaturas ou compras avulsas
- **Filtro**: Critério de seleção aplicado para reduzir o conjunto de pedidos exibidos
- **Ação_Massa**: Operação aplicada simultaneamente a múltiplos pedidos selecionados
- **Código_Rastreamento**: Identificador único fornecido pela transportadora para rastrear uma entrega

## Requisitos

### Requisito 1: Visualização Unificada de Pedidos

**User Story:** Como administrador, eu quero visualizar todos os pedidos em uma única página, para que eu possa ter uma visão completa sem navegar entre múltiplas páginas.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ exibir Entrega_Assinatura e Compra_Avulsa em uma única lista unificada
2. PARA CADA pedido exibido, O Sistema_Pedidos DEVERÁ mostrar tipo do pedido, ID, cliente, status, data de criação e valor
3. O Sistema_Pedidos DEVERÁ ordenar os pedidos por data de criação em ordem decrescente por padrão
4. O Sistema_Pedidos DEVERÁ implementar paginação com no mínimo 20 pedidos por página
5. QUANDO um Administrador acessa `/admin/pedidos`, O Sistema_Pedidos DEVERÁ carregar e exibir a lista unificada em menos de 2 segundos

### Requisito 2: Filtros por Tipo de Pedido

**User Story:** Como administrador, eu quero filtrar pedidos por tipo, para que eu possa focar em entregas de assinaturas ou compras avulsas conforme necessário.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ fornecer um filtro de tipo com opções "Todos", "Entregas de Assinatura" e "Compras Avulsas"
2. QUANDO um Administrador seleciona "Entregas de Assinatura", O Sistema_Pedidos DEVERÁ exibir apenas registros de `subscription_deliveries`
3. QUANDO um Administrador seleciona "Compras Avulsas", O Sistema_Pedidos DEVERÁ exibir apenas registros de `standalone_purchases`
4. QUANDO um Administrador seleciona "Todos", O Sistema_Pedidos DEVERÁ exibir ambos os tipos de pedidos
5. O Sistema_Pedidos DEVERÁ manter a seleção de filtro durante a navegação entre páginas da lista

### Requisito 3: Filtros por Status

**User Story:** Como administrador, eu quero filtrar pedidos por status, para que eu possa identificar rapidamente pedidos que requerem ação.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ fornecer um filtro de status com todas as opções de Status_Pedido disponíveis no sistema
2. QUANDO um Administrador seleciona um Status_Pedido, O Sistema_Pedidos DEVERÁ exibir apenas pedidos com aquele status
3. O Sistema_Pedidos DEVERÁ permitir seleção múltipla de status simultaneamente
4. O Sistema_Pedidos DEVERÁ exibir a contagem de pedidos para cada Status_Pedido disponível
5. QUANDO nenhum status é selecionado, O Sistema_Pedidos DEVERÁ exibir pedidos de todos os status

### Requisito 4: Funcionalidade de Busca

**User Story:** Como administrador, eu quero buscar pedidos por diferentes critérios, para que eu possa localizar rapidamente pedidos específicos.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ fornecer um campo de busca que aceita texto livre
2. QUANDO um Administrador insere texto no campo de busca, O Sistema_Pedidos DEVERÁ buscar em nome do Cliente, ID do pedido e Código_Rastreamento
3. O Sistema_Pedidos DEVERÁ exibir resultados de busca em tempo real com debounce de 300ms
4. QUANDO nenhum resultado é encontrado, O Sistema_Pedidos DEVERÁ exibir mensagem informativa "Nenhum pedido encontrado"
5. O Sistema_Pedidos DEVERÁ destacar visualmente os termos de busca nos resultados exibidos

### Requisito 5: Detalhes Completos do Pedido

**User Story:** Como administrador, eu quero visualizar todos os detalhes de um pedido, para que eu possa ter informações completas para suporte e resolução de problemas.

#### Critérios de Aceitação

1. QUANDO um Administrador clica em um pedido, O Sistema_Pedidos DEVERÁ exibir um painel de detalhes com todas as informações do pedido
2. PARA Entrega_Assinatura, O Sistema_Pedidos DEVERÁ exibir informações da assinatura relacionada, ciclo de produção, coleção e dados do Cliente
3. PARA Compra_Avulsa, O Sistema_Pedidos DEVERÁ exibir informações do produto, quantidade, valor e dados do Cliente
4. O Sistema_Pedidos DEVERÁ exibir histórico completo de mudanças de status com timestamps e usuário responsável
5. QUANDO existe Código_Rastreamento, O Sistema_Pedidos DEVERÁ fornecer link clicável para rastreamento externo

### Requisito 6: Atualização de Status Individual

**User Story:** Como administrador, eu quero atualizar o status de um pedido, para que eu possa refletir o progresso da entrega.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ fornecer um controle de seleção de Status_Pedido no painel de detalhes
2. QUANDO um Administrador altera o Status_Pedido, O Sistema_Pedidos DEVERÁ validar a transição de status
3. SE a transição de status é inválida, ENTÃO O Sistema_Pedidos DEVERÁ exibir mensagem de erro explicativa
4. QUANDO a transição é válida, O Sistema_Pedidos DEVERÁ salvar o novo status com timestamp e ID do Administrador
5. O Sistema_Pedidos DEVERÁ atualizar a lista de pedidos automaticamente após mudança de status

### Requisito 7: Ações em Massa

**User Story:** Como administrador, eu quero executar ações em múltiplos pedidos simultaneamente, para que eu possa processar pedidos de forma eficiente.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ fornecer checkboxes para seleção de múltiplos pedidos
2. O Sistema_Pedidos DEVERÁ exibir barra de ações quando um ou mais pedidos estão selecionados
3. O Sistema_Pedidos DEVERÁ suportar Ação_Massa para atualização de status em lote
4. QUANDO um Administrador executa uma Ação_Massa, O Sistema_Pedidos DEVERÁ solicitar confirmação antes de executar
5. O Sistema_Pedidos DEVERÁ exibir progresso e resultado da Ação_Massa com contagem de sucessos e falhas

### Requisito 8: Geração de Etiquetas

**User Story:** Como administrador, eu quero gerar etiquetas de envio para pedidos, para que eu possa preparar os pacotes para despacho.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ fornecer ação "Gerar Etiqueta" para pedidos individuais
2. O Sistema_Pedidos DEVERÁ suportar geração de etiquetas em massa para múltiplos pedidos selecionados
3. QUANDO um Administrador solicita geração de etiqueta, O Sistema_Pedidos DEVERÁ validar que o pedido possui endereço de entrega completo
4. SE o endereço está incompleto, ENTÃO O Sistema_Pedidos DEVERÁ exibir mensagem de erro identificando campos faltantes
5. QUANDO a etiqueta é gerada com sucesso, O Sistema_Pedidos DEVERÁ disponibilizar download em formato PDF

### Requisito 9: Exportação de Dados

**User Story:** Como administrador, eu quero exportar dados de pedidos, para que eu possa gerar relatórios e análises externas.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ fornecer funcionalidade de exportação em formato CSV
2. O Sistema_Pedidos DEVERÁ exportar apenas os pedidos atualmente filtrados e visíveis
3. O Sistema_Pedidos DEVERÁ incluir todas as colunas relevantes na exportação (ID, tipo, cliente, status, data, valor, rastreamento)
4. QUANDO um Administrador solicita exportação, O Sistema_Pedidos DEVERÁ gerar o arquivo em menos de 5 segundos para até 1000 pedidos
5. O Sistema_Pedidos DEVERÁ nomear o arquivo exportado com timestamp no formato `pedidos_YYYYMMDD_HHMMSS.csv`

### Requisito 10: Integração com Dados Relacionados

**User Story:** Como administrador, eu quero acessar informações relacionadas aos pedidos, para que eu possa entender o contexto completo.

#### Critérios de Aceitação

1. PARA Entrega_Assinatura, O Sistema_Pedidos DEVERÁ carregar e exibir dados da tabela `subscriptions`
2. O Sistema_Pedidos DEVERÁ carregar e exibir dados do Cliente da tabela `profiles`
3. O Sistema_Pedidos DEVERÁ carregar e exibir informações de coleção da tabela `collections`
4. PARA Entrega_Assinatura, O Sistema_Pedidos DEVERÁ carregar e exibir dados do ciclo da tabela `cycles`
5. O Sistema_Pedidos DEVERÁ realizar todas as consultas relacionadas em uma única operação de banco de dados usando joins

### Requisito 11: Performance e Escalabilidade

**User Story:** Como administrador, eu quero que a página carregue rapidamente mesmo com muitos pedidos, para que eu possa trabalhar eficientemente.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ carregar a primeira página de resultados em menos de 2 segundos
2. O Sistema_Pedidos DEVERÁ implementar paginação server-side para conjuntos de dados grandes
3. O Sistema_Pedidos DEVERÁ implementar índices de banco de dados em colunas frequentemente filtradas
4. O Sistema_Pedidos DEVERÁ limitar consultas a no máximo 100 pedidos por requisição
5. QUANDO aplicando filtros, O Sistema_Pedidos DEVERÁ executar a consulta filtrada em menos de 1 segundo

### Requisito 12: Permissões e Segurança

**User Story:** Como administrador, eu quero que apenas usuários autorizados acessem a página de pedidos, para que dados sensíveis sejam protegidos.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ verificar permissões de Administrador antes de exibir qualquer dado
2. SE o usuário não possui permissões de Administrador, ENTÃO O Sistema_Pedidos DEVERÁ redirecionar para página de acesso negado
3. O Sistema_Pedidos DEVERÁ registrar todas as ações de modificação de pedidos em log de auditoria
4. O Sistema_Pedidos DEVERÁ incluir ID do Administrador e timestamp em todos os logs de auditoria
5. O Sistema_Pedidos DEVERÁ sanitizar todos os inputs de busca e filtros para prevenir SQL injection

### Requisito 13: Responsividade e Usabilidade

**User Story:** Como administrador, eu quero usar a página em diferentes dispositivos, para que eu possa gerenciar pedidos de qualquer lugar.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ adaptar o layout para telas com largura mínima de 320px
2. O Sistema_Pedidos DEVERÁ exibir versão simplificada da tabela em dispositivos móveis
3. O Sistema_Pedidos DEVERÁ manter todas as funcionalidades essenciais acessíveis em dispositivos móveis
4. O Sistema_Pedidos DEVERÁ usar controles touch-friendly com área mínima de toque de 44x44px
5. O Sistema_Pedidos DEVERÁ fornecer feedback visual imediato para todas as interações do usuário

### Requisito 14: Migração e Compatibilidade

**User Story:** Como administrador, eu quero que a transição das páginas antigas seja suave, para que não haja perda de funcionalidade.

#### Critérios de Aceitação

1. O Sistema_Pedidos DEVERÁ manter URLs antigas (`/admin/assinaturas`, `/admin/entregas`, `/admin/compras-avulsas`) funcionais com redirecionamento
2. QUANDO um Administrador acessa uma URL antiga, O Sistema_Pedidos DEVERÁ redirecionar para `/admin/pedidos` com filtros apropriados aplicados
3. O Sistema_Pedidos DEVERÁ preservar todos os dados existentes sem necessidade de migração de banco de dados
4. O Sistema_Pedidos DEVERÁ manter compatibilidade com todas as integrações existentes de API
5. O Sistema_Pedidos DEVERÁ fornecer documentação de migração para Administradores

### Requisito 15: Tratamento de Erros

**User Story:** Como administrador, eu quero receber mensagens claras quando algo dá errado, para que eu possa tomar ação apropriada.

#### Critérios de Aceitação

1. SE ocorre erro de conexão com banco de dados, ENTÃO O Sistema_Pedidos DEVERÁ exibir mensagem "Erro ao carregar pedidos. Tente novamente."
2. SE ocorre timeout em operação, ENTÃO O Sistema_Pedidos DEVERÁ exibir mensagem com opção de retry
3. SE ocorre erro em Ação_Massa, ENTÃO O Sistema_Pedidos DEVERÁ exibir lista detalhada de pedidos que falharam e motivo
4. O Sistema_Pedidos DEVERÁ registrar todos os erros em sistema de logging com stack trace completo
5. O Sistema_Pedidos DEVERÁ manter a interface funcional mesmo quando operações individuais falham
