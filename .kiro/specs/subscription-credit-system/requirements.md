# Documento de Requisitos

## Introdução

Este documento especifica os requisitos para um sistema completo de assinaturas com créditos para uma plataforma de personagens colecionáveis. O sistema permite que usuários assinem planos que geram créditos para compra de personagens, substituindo ou complementando o modelo tradicional de vendas diretas. O sistema gerencia dois tipos de planos (Trimestral e Semestral), controla saldos de créditos, vincula compras a ciclos de produção, e oferece entrega automática de coleções padrão.

## Glossário

- **Sistema_Assinatura**: O sistema responsável por gerenciar assinaturas de usuários
- **Sistema_Credito**: O sistema responsável por gerenciar créditos dos usuários
- **Catalogo_Personagens**: O catálogo de personagens disponíveis para compra
- **Ciclo_Producao**: Ciclo de produção com capacidade limitada e data de fechamento
- **Plano_Trimestral**: Plano de assinatura trimestral que gera 600 créditos
- **Plano_Semestral**: Plano de assinatura semestral que gera 1.200 créditos + 200 créditos de bônus
- **Personagem_Exclusivo**: Personagem disponível apenas para assinantes do plano semestral
- **Colecao_Padrao**: Coleção padrão de personagens entregue automaticamente ao iniciar assinatura
- **Painel_Admin**: Painel administrativo para gestão do sistema
- **Perfil_Usuario**: Área logada do cliente com informações de assinatura e créditos
- **Transacao_Credito**: Registro de uso de créditos por um usuário
- **Pedido**: Pedido de personagem vinculado a um ciclo de produção
- **Pedido_Automatico**: Pedido da coleção padrão criado automaticamente ao iniciar assinatura, com débito de créditos no fechamento do ciclo
- **Complemento_Compra**: Pagamento adicional para completar uma compra específica quando créditos são insuficientes
- **Barra_Visual_Creditos**: Representação gráfica do uso de créditos no perfil do usuário
- **Badge_Plano**: Selo visual indicando o tipo de plano do usuário
- **Cancelamento_Com_Extorno**: Cancelamento de assinatura com reembolso proporcional e expiração imediata de créditos
- **Nao_Renovacao**: Cancelamento da renovação automática mantendo acesso até o fim do período pago

## Requisitos

### Requisito 1: Gerenciamento de Planos de Assinatura

**História de Usuário:** Como administrador, eu quero gerenciar planos de assinatura, para que eu possa oferecer diferentes opções aos clientes.

#### Critérios de Aceitação

1. O Sistema_Assinatura DEVE suportar exatamente dois tipos de plano: Plano_Trimestral e Plano_Semestral
2. O Plano_Trimestral DEVE gerar 600 créditos na ativação
3. O Plano_Semestral DEVE gerar 1200 créditos na ativação
4. QUANDO um Plano_Semestral é ativado, O Sistema_Assinatura DEVE adicionar automaticamente um bônus de 200 créditos
5. QUANDO uma assinatura é ativada, O Sistema_Credito DEVE liberar todos os créditos imediatamente
6. ONDE um usuário tem Plano_Trimestral, O Catalogo_Personagens DEVE exibir apenas personagens não exclusivos
7. ONDE um usuário tem Plano_Semestral, O Catalogo_Personagens DEVE exibir todos os personagens incluindo personagens exclusivos
8. ONDE um usuário tem Plano_Semestral, O Sistema_Assinatura DEVE marcar todos os Pedidos desse usuário com flag de prioridade na produção

### Requisito 2: Validade e Expiração de Créditos

**História de Usuário:** Como sistema, eu quero controlar a validade de créditos vinculada à assinatura ativa, para que créditos sejam válidos apenas enquanto o usuário mantém sua assinatura.

#### Critérios de Aceitação

1. ENQUANTO uma assinatura está ativa, O Sistema_Credito DEVE manter todos os créditos disponíveis para uso
2. QUANDO uma assinatura expira naturalmente, O Sistema_Credito DEVE marcar todos os créditos restantes como expirados imediatamente
3. QUANDO créditos são marcados como expirados, O Sistema_Credito DEVE impedir o uso desses créditos em novas compras
4. QUANDO uma assinatura é renovada, O Sistema_Credito DEVE somar os novos créditos ao saldo existente
5. QUANDO uma assinatura é renovada, O Sistema_Credito NÃO DEVE resetar o saldo de créditos existente

### Requisito 2.1: Cancelamento com Extorno

**História de Usuário:** Como cliente, eu quero cancelar minha assinatura e receber reembolso proporcional, para que eu possa encerrar o serviço e recuperar o valor não utilizado.

#### Critérios de Aceitação

1. QUANDO um usuário solicita cancelamento com extorno, O Sistema_Assinatura DEVE calcular o reembolso proporcional baseado EXCLUSIVAMENTE no tempo restante da assinatura
2. O cálculo do reembolso DEVE seguir a fórmula: reembolso = (preço_plano * dias_restantes) / dias_totais_do_plano
3. O cálculo do reembolso NÃO DEVE considerar créditos usados ou disponíveis
4. QUANDO um cancelamento com extorno é processado, O Sistema_Credito DEVE marcar todos os créditos restantes como expirados imediatamente
5. QUANDO um cancelamento com extorno é processado, O Sistema_Assinatura DEVE encerrar a assinatura imediatamente
6. QUANDO um cancelamento com extorno é processado, O Sistema_Assinatura DEVE processar o reembolso calculado
7. QUANDO créditos são expirados por cancelamento com extorno, O Sistema_Credito DEVE impedir o uso desses créditos em novas compras

### Requisito 2.2: Não-Renovação sem Extorno

**História de Usuário:** Como cliente, eu quero cancelar a renovação automática sem perder acesso imediato, para que eu possa usar o período já pago até o final.

#### Critérios de Aceitação

1. QUANDO um usuário solicita não-renovação, O Sistema_Assinatura DEVE desativar a renovação automática
2. QUANDO uma não-renovação é processada, O Sistema_Assinatura DEVE manter a assinatura ativa até a data de expiração original
3. ENQUANTO a assinatura está ativa após não-renovação, O Sistema_Credito DEVE manter todos os créditos disponíveis para uso
4. QUANDO a data de expiração é atingida após não-renovação, O Sistema_Assinatura DEVE encerrar a assinatura
5. QUANDO a assinatura é encerrada após não-renovação, O Sistema_Credito DEVE marcar todos os créditos restantes como expirados
6. O Sistema_Assinatura NÃO DEVE processar reembolso em casos de não-renovação

### Requisito 3: Gerenciamento de Saldo de Créditos

**História de Usuário:** Como sistema, eu quero rastrear créditos de usuários, para que eu possa controlar saldos e transações com precisão.

#### Critérios de Aceitação

1. O Sistema_Credito DEVE armazenar user_id, total_credit, used_credit, available_credit, subscription_id e created_at para cada usuário
2. QUANDO créditos são alocados, O Sistema_Credito DEVE atualizar total_credit e available_credit
3. QUANDO créditos são usados, O Sistema_Credito DEVE atualizar used_credit e available_credit
4. O Sistema_Credito DEVE garantir que available_credit seja igual a total_credit menos used_credit em todos os momentos
5. QUANDO uma transação de crédito ocorre, O Sistema_Credito DEVE registrar user_id, character_id, credits_used, production_cycle_id e created_at
6. O Sistema_Credito DEVE manter um histórico completo de todas as transações de crédito

### Requisito 4: Precificação e Catálogo de Personagens

**História de Usuário:** Como administrador, eu quero configurar preços de personagens, para que eu possa oferecer opções de compra em dinheiro e créditos.

#### Critérios de Aceitação

1. O Catalogo_Personagens DEVE armazenar price_cash, price_credit, is_exclusive_semestral, is_active e production_cycle_id para cada personagem
2. O Catalogo_Personagens DEVE exibir price_cash para todos os visitantes
3. ONDE um usuário está logado e tem uma assinatura ativa, O Catalogo_Personagens DEVE exibir price_credit e saldo de crédito disponível
4. ONDE um usuário está logado e tem uma assinatura ativa, O Catalogo_Personagens DEVE exibir comparação entre price_cash e price_credit para cada personagem
5. ONDE um personagem tem is_exclusive_semestral definido como verdadeiro, O Catalogo_Personagens DEVE exibi-lo apenas para assinantes do Plano_Semestral
6. ONDE um personagem tem is_active definido como falso, O Catalogo_Personagens NÃO DEVE exibi-lo para nenhum usuário
7. O Painel_Admin DEVE permitir que administradores definam price_cash e price_credit independentemente para cada personagem

### Requisito 5: Fluxo de Compra Individual com Créditos

**História de Usuário:** Como cliente assinante, eu quero comprar personagens individuais do catálogo com créditos, para que eu possa escolher personagens específicos além da coleção automática.

#### Critérios de Aceitação

1. QUANDO um usuário assinante seleciona um personagem individual do Catalogo_Personagens para compra, O Sistema_Assinatura DEVE validar o saldo de crédito disponível
2. SE o crédito disponível é menor que price_credit, ENTÃO O Sistema_Assinatura DEVE rejeitar a compra e exibir mensagem de saldo insuficiente
3. QUANDO uma compra individual é confirmada com créditos, O Sistema_Credito DEVE deduzir price_credit de available_credit imediatamente
4. QUANDO uma compra individual é confirmada com créditos, O Sistema_Assinatura DEVE criar um Pedido com as informações do personagem e usuário
5. QUANDO um Pedido de compra individual é criado, O Sistema_Assinatura DEVE vinculá-lo ao Ciclo_Producao aberto atual
6. SE o Ciclo_Producao atual está na capacidade máxima, ENTÃO O Sistema_Assinatura DEVE vincular o Pedido ao próximo Ciclo_Producao disponível
7. QUANDO créditos são deduzidos de compra individual, O Sistema_Credito DEVE criar um registro de Transacao_Credito imediatamente
8. QUANDO um Pedido de compra individual é criado, O Sistema_Assinatura DEVE marcar o Pedido como confirmado e bloqueado para modificações

### Requisito 6: Entrega Automática de Coleção com Débito no Fechamento

**História de Usuário:** Como cliente, eu quero receber automaticamente uma coleção padrão ao assinar, para que eu tenha personagens garantidos sem esforço adicional.

#### Critérios de Aceitação

1. QUANDO uma assinatura é ativada, O Sistema_Assinatura DEVE criar automaticamente um Pedido_Automatico com todos os personagens da Colecao_Padrao
2. QUANDO o Pedido_Automatico é criado, O Sistema_Assinatura DEVE vinculá-lo ao Ciclo_Producao aberto atual
3. QUANDO o Pedido_Automatico é criado, O Sistema_Credito NÃO DEVE deduzir créditos imediatamente
4. ENQUANTO o Ciclo_Producao está aberto, O Sistema_Assinatura DEVE permitir que o usuário modifique o Pedido_Automatico
5. QUANDO o Ciclo_Producao fecha, O Sistema_Assinatura DEVE bloquear o Pedido_Automatico e impedir modificações adicionais
6. QUANDO o Ciclo_Producao fecha, O Sistema_Credito DEVE calcular o total de créditos necessários para todos os personagens no Pedido_Automatico
7. QUANDO o Ciclo_Producao fecha, O Sistema_Credito DEVE deduzir o total calculado de available_credit
8. QUANDO créditos são deduzidos no fechamento do ciclo, O Sistema_Credito DEVE criar registros de Transacao_Credito para cada personagem
9. QUANDO o Ciclo_Producao fecha, O Sistema_Assinatura DEVE enviar o Pedido_Automatico para produção
10. SE o crédito disponível é insuficiente no fechamento do ciclo, ENTÃO O Sistema_Assinatura DEVE notificar o usuário e manter o Pedido_Automatico pendente até resolução

### Requisito 7: Gerenciamento de Ciclos de Produção

**História de Usuário:** Como administrador, eu quero gerenciar ciclos de produção, para que eu possa controlar capacidade e prazos de entrega.

#### Critérios de Aceitação

1. O Painel_Admin DEVE permitir que administradores criem um Ciclo_Producao com limite de capacidade total e data de fechamento
2. O Ciclo_Producao DEVE rastrear o número de Pedidos vinculados
3. QUANDO Pedidos vinculados a um Ciclo_Producao atingem o limite de capacidade, O Ciclo_Producao DEVE ser marcado como cheio
4. O Painel_Admin DEVE exibir todos os Pedidos vinculados a cada Ciclo_Producao
5. O Painel_Admin DEVE permitir que administradores fechem manualmente um Ciclo_Producao
6. QUANDO um Ciclo_Producao é fechado, O Sistema_Assinatura DEVE impedir que novos Pedidos sejam vinculados a ele
7. QUANDO um Ciclo_Producao é fechado, O Sistema_Assinatura DEVE bloquear todos os Pedidos vinculados e impedir modificações

### Requisito 7.1: Limite de Personagens por Usuário por Ciclo

**História de Usuário:** Como administrador, eu quero controlar quantos personagens cada usuário pode adicionar por ciclo, para que eu possa gerenciar capacidade de forma equilibrada.

#### Critérios de Aceitação

1. O Painel_Admin DEVE permitir que administradores configurem um limite máximo de personagens por usuário por Ciclo_Producao
2. ONDE um limite global está configurado, O Sistema_Assinatura DEVE aplicar esse limite a todos os usuários
3. O Painel_Admin DEVE permitir que administradores configurem limites específicos por tipo de plano
4. QUANDO um usuário atinge o limite de personagens para o Ciclo_Producao atual, O Sistema_Assinatura DEVE impedir adição de novos personagens ao ciclo atual
5. QUANDO um usuário atinge o limite de personagens para o Ciclo_Producao atual, O Sistema_Assinatura DEVE vincular automaticamente novos Pedidos ao próximo Ciclo_Producao disponível
6. O Sistema_Assinatura DEVE exibir ao usuário quantos personagens ele já adicionou ao ciclo atual e qual é o limite
7. O Perfil_Usuario DEVE exibir o limite de personagens por ciclo e a quantidade já utilizada no ciclo atual

### Requisito 8: Upgrade e Downgrade de Planos

**História de Usuário:** Como cliente, eu quero fazer upgrade ou downgrade do meu plano, para que eu possa ajustar minha assinatura às minhas necessidades.

#### Critérios de Aceitação

1. QUANDO um usuário solicita upgrade de Plano_Trimestral para Plano_Semestral, O Sistema_Assinatura DEVE agendar o upgrade para a próxima renovação
2. QUANDO um usuário solicita upgrade, O Sistema_Assinatura DEVE marcar a assinatura atual com pending_plan_change = 'semestral'
3. QUANDO a data de renovação é atingida E pending_plan_change está definido, O Sistema_Assinatura DEVE encerrar o plano anterior e ativar o novo plano
4. QUANDO o novo plano é ativado na renovação, O Sistema_Credito DEVE liberar todos os créditos do novo plano integralmente
5. QUANDO o novo plano é ativado na renovação, O Sistema_Credito DEVE somar os novos créditos ao saldo existente
6. QUANDO um usuário solicita downgrade de Plano_Semestral para Plano_Trimestral, O Sistema_Assinatura DEVE agendar o downgrade para a próxima renovação
7. QUANDO um downgrade é realizado na renovação, O Sistema_Credito DEVE manter o saldo de créditos existente
8. O Perfil_Usuario DEVE exibir claramente quando há mudança de plano agendada e a data em que entrará em vigor

### Requisito 9: Painel de Gerenciamento Administrativo

**História de Usuário:** Como administrador, eu quero um painel completo de gestão, para que eu possa controlar todos os aspectos do sistema de assinaturas.

#### Critérios de Aceitação

1. O Painel_Admin DEVE permitir que administradores criem e configurem planos de assinatura com valor, créditos, bônus e benefícios
2. O Painel_Admin DEVE permitir que administradores criem personagens e definam price_cash, price_credit, is_exclusive_semestral e is_active
3. O Painel_Admin DEVE permitir que administradores visualizem status de assinatura do usuário, saldo de crédito e histórico de transações
4. O Painel_Admin DEVE permitir que administradores ajustem manualmente o saldo de crédito do usuário
5. O Painel_Admin DEVE permitir que administradores façam upgrade ou downgrade de planos de assinatura do usuário
6. O Painel_Admin DEVE permitir que administradores processem cancelamento com extorno de assinaturas de usuários
7. O Painel_Admin DEVE permitir que administradores processem não-renovação de assinaturas de usuários
8. O Painel_Admin DEVE exibir todos os Ciclos_Producao com Pedidos vinculados e status de capacidade
9. O Painel_Admin DEVE permitir que administradores visualizem Pedidos agrupados por Ciclo_Producao
10. O Painel_Admin DEVE exibir a flag de prioridade de cada Pedido na visualização do Ciclo_Producao
11. O Painel_Admin DEVE permitir que administradores ajustem o bônus de créditos do Plano_Semestral
12. O Painel_Admin DEVE permitir que administradores configurem o limite de personagens por usuário por Ciclo_Producao

### Requisito 10: Perfil e Painel do Usuário

**História de Usuário:** Como cliente assinante, eu quero visualizar informações da minha assinatura, para que eu possa acompanhar meu plano e créditos.

#### Critérios de Aceitação

1. O Perfil_Usuario DEVE exibir o tipo de plano de assinatura atual
2. O Perfil_Usuario DEVE exibir a próxima data de cobrança ou data de expiração se não-renovação está ativa
3. O Perfil_Usuario DEVE exibir o saldo de crédito disponível
4. O Perfil_Usuario DEVE exibir um histórico completo de Transacoes_Credito separando compras individuais de débitos automáticos
5. O Perfil_Usuario DEVE exibir todos os personagens no Pedido_Automatico atual
6. O Perfil_Usuario DEVE exibir a data de fechamento do Ciclo_Producao atual
7. ENQUANTO o Ciclo_Producao está aberto, O Perfil_Usuario DEVE fornecer um botão para modificar a seleção de personagens do Pedido_Automatico
8. ONDE um usuário tem Plano_Trimestral, O Perfil_Usuario DEVE fornecer um botão para fazer upgrade para Plano_Semestral
9. O Perfil_Usuario DEVE exibir uma Barra_Visual_Creditos mostrando créditos totais, usados e disponíveis
10. O Perfil_Usuario DEVE exibir um Badge_Plano indicando o tipo de plano do usuário
11. O Perfil_Usuario DEVE exibir o limite de personagens por ciclo e a quantidade já utilizada no ciclo atual
12. O Perfil_Usuario DEVE fornecer opção para solicitar não-renovação da assinatura
13. O Perfil_Usuario DEVE fornecer opção para solicitar cancelamento com extorno da assinatura
14. ONDE não-renovação está ativa, O Perfil_Usuario DEVE exibir claramente a data de expiração e que créditos permanecem válidos até essa data

### Requisito 11: Complemento de Compra para Compras Individuais

**História de Usuário:** Como cliente assinante, eu quero complementar o valor de uma compra individual específica quando meus créditos são insuficientes, para que eu possa adquirir o personagem desejado do catálogo.

#### Critérios de Aceitação

1. ONDE um usuário tem créditos insuficientes para uma compra individual específica do Catalogo_Personagens, O Sistema_Assinatura DEVE oferecer opção de Complemento_Compra
2. QUANDO um Complemento_Compra é oferecido, O Sistema_Assinatura DEVE calcular a diferença exata entre créditos disponíveis e price_credit
3. QUANDO um Complemento_Compra é realizado, O Sistema_Assinatura DEVE processar o pagamento apenas para a diferença calculada
4. QUANDO um Complemento_Compra é realizado, O Sistema_Assinatura NÃO DEVE adicionar créditos ao saldo do usuário
5. QUANDO um Complemento_Compra é realizado, O Sistema_Assinatura DEVE completar a compra do personagem específico
6. QUANDO um Complemento_Compra é realizado, O Sistema_Credito DEVE deduzir todos os créditos disponíveis do usuário
7. O Sistema_Assinatura NÃO DEVE oferecer Complemento_Compra para Pedido_Automatico
8. O Sistema_Assinatura NÃO DEVE oferecer venda de pacotes de créditos avulsos

### Requisito 12: Regras Anti-Abuso e Proteção Jurídica

**História de Usuário:** Como empresa, eu quero estabelecer regras claras sobre créditos, para que eu possa proteger o modelo de negócio e evitar abusos.

#### Critérios de Aceitação

1. O Sistema_Credito NÃO DEVE permitir transferência de créditos entre usuários
2. O Sistema_Credito NÃO DEVE permitir conversão de créditos em dinheiro
3. O Sistema_Assinatura NÃO DEVE permitir reembolso de créditos isoladamente
4. O Sistema_Assinatura DEVE exibir termos de uso indicando que créditos não são transferíveis
5. O Sistema_Assinatura DEVE exibir termos de uso indicando que créditos não são conversíveis em dinheiro
6. O Sistema_Assinatura DEVE exibir termos de uso indicando que créditos não são reembolsáveis isoladamente
7. O Sistema_Assinatura DEVE exibir termos de uso indicando que créditos expiram imediatamente em caso de cancelamento com extorno
8. O Sistema_Assinatura DEVE exibir termos de uso indicando que créditos permanecem válidos até a data de expiração em caso de não-renovação
9. O Sistema_Assinatura DEVE exibir termos de uso distinguindo claramente cancelamento com extorno de não-renovação

### Requisito 13: Escalabilidade e Concorrência do Sistema

**História de Usuário:** Como arquiteto de sistema, eu quero uma estrutura escalável e segura, para que o sistema suporte crescimento e transações concorrentes.

#### Critérios de Aceitação

1. O Sistema_Assinatura DEVE usar consultas de banco de dados indexadas para user_id, subscription_id e production_cycle_id
2. O Catalogo_Personagens DEVE suportar paginação para listagens de personagens
3. O Sistema_Credito DEVE suportar transações de crédito concorrentes sem condições de corrida
4. O Sistema_Credito DEVE usar bloqueios de transação para garantir consistência em operações de débito e crédito simultâneas
5. O Ciclo_Producao DEVE suportar pelo menos 10.000 Pedidos vinculados por ciclo
6. O Painel_Admin DEVE carregar dados com paginação para conjuntos de dados grandes
7. QUANDO múltiplos usuários realizam compras simultaneamente, O Sistema_Credito DEVE processar cada transação de forma isolada e consistente

