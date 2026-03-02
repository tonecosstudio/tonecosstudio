# Documento de Requisitos

## Introdução

Este documento especifica os requisitos para implementar um sistema de níveis de preço (pricing tiers) para substituir o modelo atual de preços individuais por coleção. O novo sistema permitirá que administradores definam níveis de preço (ex: "Nível 1", "Nível 2", "Nível 3") e atribuam múltiplas coleções a cada nível. Quando o preço de um nível muda, todas as coleções naquele nível herdam automaticamente o novo preço, simplificando significativamente o gerenciamento de preços.

O sistema atual requer gerenciar preços individuais para cada coleção (price_full, price_pix, deposit_amount, is_price_custom), o que se torna complexo conforme o número de coleções cresce. O sistema de níveis de preço reduzirá a sobrecarga administrativa mantendo flexibilidade para cenários especiais de precificação.

## Glossário

- **Nível_de_Preço**: Um nível de precificação nomeado (ex: "Nível 1", "Nível 2", "Nível 3") que define um conjunto de preços aplicáveis a múltiplas coleções
- **Coleção**: Um grupo de personagens/peças que podem ser comprados individualmente ou via assinatura
- **Preço_Cheio**: O preço completo sem descontos
- **Preço_Pix**: O preço com desconto ao pagar via PIX (tipicamente 5% de desconto)
- **Valor_Entrada**: O pagamento inicial necessário para reservar capacidade de produção
- **Atribuição_de_Nível**: O relacionamento entre uma coleção e um nível de preço
- **Painel_Admin**: A interface administrativa onde os níveis de preço são gerenciados
- **Configurações_Sistema**: Valores de configuração global armazenados na tabela system_settings
- **Preço_Customizado_Legado**: Precificação individual de coleção que existia antes do sistema de níveis
- **Nível_Padrão**: O nível de preço usado quando nenhum nível específico é atribuído a uma coleção

## Requisitos

### Requisito 1: Gerenciamento de Níveis de Preço

**História de Usuário:** Como administrador, quero criar e gerenciar níveis de preço, para que eu possa organizar coleções em níveis de precificação e atualizar preços eficientemente.

#### Critérios de Aceitação

1. O Painel_Admin DEVE fornecer uma interface de usuário para criar novos Níveis_de_Preço
2. QUANDO criar um Nível_de_Preço, O Painel_Admin DEVE exigir um nome de nível único
3. QUANDO criar um Nível_de_Preço, O Painel_Admin DEVE exigir Preço_Cheio, Valor_Entrada e percentual de desconto PIX
4. O Painel_Admin DEVE calcular o Preço_Pix automaticamente baseado no Preço_Cheio e percentual de desconto PIX
5. O Painel_Admin DEVE exibir todos os Níveis_de_Preço existentes em uma visualização de lista
6. O Painel_Admin DEVE permitir edição dos preços de Níveis_de_Preço existentes
7. O Painel_Admin DEVE permitir desativar Níveis_de_Preço que não estão mais em uso
8. QUANDO um Nível_de_Preço é desativado, O Sistema DEVE prevenir novas Atribuições_de_Nível para aquele nível
9. O Painel_Admin DEVE exibir a contagem de coleções atribuídas a cada Nível_de_Preço

### Requisito 2: Atribuição de Coleções a Níveis

**História de Usuário:** Como administrador, quero atribuir coleções a níveis de preço, para que as coleções usem automaticamente a precificação do nível sem configuração manual.

#### Critérios de Aceitação

1. O Painel_Admin DEVE fornecer uma interface de usuário para atribuir Coleções a Níveis_de_Preço
2. QUANDO atribuir uma Coleção a um Nível_de_Preço, O Sistema DEVE atualizar a precificação da coleção para corresponder ao nível
3. O Sistema DEVE permitir que uma Coleção seja atribuída a apenas um Nível_de_Preço por vez
4. O Painel_Admin DEVE exibir a atribuição atual de Nível_de_Preço para cada Coleção
5. O Painel_Admin DEVE permitir alterar a atribuição de Nível_de_Preço de uma Coleção
6. QUANDO o Nível_de_Preço de uma Coleção é alterado, O Sistema DEVE atualizar imediatamente a precificação da coleção
7. O Painel_Admin DEVE permitir remover uma Coleção de um Nível_de_Preço
8. QUANDO uma Coleção é removida de um Nível_de_Preço, O Sistema DEVE reverter para a precificação padrão das Configurações_Sistema

### Requisito 3: Propagação Automática de Preços

**História de Usuário:** Como administrador, quero que mudanças de preço em níveis atualizem automaticamente todas as coleções atribuídas, para que eu não precise atualizar cada coleção individualmente.

#### Critérios de Aceitação

1. QUANDO o Preço_Cheio de um Nível_de_Preço é atualizado, O Sistema DEVE atualizar o Preço_Cheio para todas as Coleções atribuídas àquele nível
2. QUANDO o Valor_Entrada de um Nível_de_Preço é atualizado, O Sistema DEVE atualizar o Valor_Entrada para todas as Coleções atribuídas àquele nível
3. QUANDO o percentual de desconto PIX de um Nível_de_Preço é atualizado, O Sistema DEVE recalcular e atualizar o Preço_Pix para todas as Coleções atribuídas àquele nível
4. O Sistema DEVE completar a propagação de preços em até 5 segundos para até 100 coleções
5. O Sistema DEVE registrar todas as mudanças de preço resultantes de atualizações de nível para fins de auditoria
6. QUANDO a propagação de preços falhar para qualquer Coleção, O Sistema DEVE registrar o erro e continuar atualizando as coleções restantes
7. O Sistema DEVE enviar uma notificação aos administradores quando a propagação de preços for concluída

### Requisito 4: Exibição de Preços Baseada em Níveis

**História de Usuário:** Como cliente, quero ver preços precisos baseados no nível da coleção, para que eu saiba o preço correto ao fazer uma compra.

#### Critérios de Aceitação

1. QUANDO uma Coleção é atribuída a um Nível_de_Preço, O Sistema DEVE exibir o Preço_Cheio do nível na página da coleção
2. QUANDO uma Coleção é atribuída a um Nível_de_Preço, O Sistema DEVE exibir o Preço_Pix do nível na página da coleção
3. QUANDO uma Coleção é atribuída a um Nível_de_Preço, O Sistema DEVE exibir o Valor_Entrada do nível na página de compra
4. O Sistema DEVE calcular os valores de saldo restante usando a precificação do nível
5. QUANDO uma Coleção não tem atribuição de Nível_de_Preço, O Sistema DEVE exibir a precificação padrão das Configurações_Sistema
6. O Sistema DEVE atualizar os preços exibidos em até 10 segundos após uma mudança de preço do nível

### Requisito 5: Migração da Precificação Individual

**História de Usuário:** Como administrador, quero migrar coleções existentes da precificação individual para precificação baseada em níveis, para que eu possa fazer a transição para o novo sistema sem perda de dados.

#### Critérios de Aceitação

1. O Sistema DEVE fornecer uma ferramenta de migração no Painel_Admin
2. A Ferramenta_de_Migração DEVE analisar os preços existentes das coleções e sugerir atribuições apropriadas de Níveis_de_Preço
3. A Ferramenta_de_Migração DEVE agrupar coleções com preços idênticos em níveis sugeridos
4. A Ferramenta_de_Migração DEVE permitir que administradores revisem as atribuições de nível sugeridas antes de aplicar
5. QUANDO a migração é executada, O Sistema DEVE criar Atribuições_de_Nível para todas as coleções selecionadas
6. O Sistema DEVE preservar dados de Preço_Customizado_Legado em uma tabela de auditoria antes da migração
7. A Ferramenta_de_Migração DEVE gerar um relatório de migração mostrando todas as mudanças feitas
8. O Sistema DEVE permitir reverter a migração em até 24 horas após a execução

### Requisito 6: Substituição de Preço Customizado

**História de Usuário:** Como administrador, quero definir preços customizados para coleções específicas que não se encaixam em níveis padrão, para que eu possa lidar com cenários especiais de precificação.

#### Critérios de Aceitação

1. O Painel_Admin DEVE fornecer uma opção para habilitar preço customizado para Coleções individuais
2. QUANDO preço customizado é habilitado para uma Coleção, O Sistema DEVE remover qualquer atribuição de Nível_de_Preço
3. QUANDO preço customizado é habilitado, O Painel_Admin DEVE permitir definir Preço_Cheio, Preço_Pix e Valor_Entrada independentemente
4. O Sistema DEVE marcar coleções com preço customizado com um indicador visual no Painel_Admin
5. QUANDO preço customizado é desabilitado para uma Coleção, O Painel_Admin DEVE solicitar uma atribuição de Nível_de_Preço
6. O Sistema DEVE prevenir atualizações automáticas de preço para coleções com preço customizado habilitado
7. O Painel_Admin DEVE exibir a contagem de coleções usando preço customizado

### Requisito 7: Validação de Níveis de Preço

**História de Usuário:** Como administrador, quero que o sistema valide dados de níveis de preço, para que eu não crie acidentalmente configurações de preço inválidas.

#### Critérios de Aceitação

1. QUANDO criar ou editar um Nível_de_Preço, O Sistema DEVE validar que o Preço_Cheio é maior que zero
2. QUANDO criar ou editar um Nível_de_Preço, O Sistema DEVE validar que o Valor_Entrada é maior que zero
3. QUANDO criar ou editar um Nível_de_Preço, O Sistema DEVE validar que o Valor_Entrada é menor que o Preço_Cheio
4. QUANDO criar ou editar um Nível_de_Preço, O Sistema DEVE validar que o percentual de desconto PIX está entre 0 e 100
5. O Sistema DEVE validar que o Preço_Pix é menor que o Preço_Cheio
6. QUANDO a validação falhar, O Sistema DEVE exibir uma mensagem de erro clara indicando a regra de validação violada
7. O Sistema DEVE prevenir salvar dados inválidos de Nível_de_Preço

### Requisito 8: Histórico de Preços e Trilha de Auditoria

**História de Usuário:** Como administrador, quero rastrear mudanças de preço ao longo do tempo, para que eu possa auditar modificações de preço e entender o histórico de precificação.

#### Critérios de Aceitação

1. O Sistema DEVE registrar todas as mudanças de preço de Níveis_de_Preço em uma tabela pricing_history
2. QUANDO o preço de um Nível_de_Preço é alterado, O Sistema DEVE registrar o preço anterior, novo preço, timestamp da mudança e ID do usuário admin
3. O Painel_Admin DEVE exibir o histórico de preços para cada Nível_de_Preço
4. O Sistema DEVE registrar todas as atribuições e reatribuições de nível de Coleções em uma tabela de auditoria
5. O Painel_Admin DEVE permitir filtrar o histórico de preços por intervalo de datas, nível e usuário admin
6. O Sistema DEVE reter o histórico de preços por pelo menos 2 anos
7. O Painel_Admin DEVE permitir exportar o histórico de preços para formato CSV

### Requisito 9: Configuração de Nível Padrão

**História de Usuário:** Como administrador, quero designar um nível de preço padrão, para que novas coleções recebam automaticamente precificação padrão sem atribuição manual.

#### Critérios de Aceitação

1. O Painel_Admin DEVE permitir designar um Nível_de_Preço como Nível_Padrão
2. O Sistema DEVE permitir apenas um Nível_de_Preço ser marcado como padrão por vez
3. QUANDO uma nova Coleção é criada, O Sistema DEVE atribuí-la automaticamente ao Nível_Padrão
4. QUANDO o Nível_Padrão é alterado, O Sistema DEVE perguntar se deve reatribuir coleções existentes
5. O Painel_Admin DEVE exibir um indicador visual para o Nível_Padrão na lista de níveis
6. QUANDO nenhum Nível_Padrão está configurado, O Sistema DEVE usar precificação das Configurações_Sistema para novas coleções
7. O Sistema DEVE prevenir desativar o Nível_Padrão sem primeiro designar um novo padrão

### Requisito 10: Atribuição em Massa de Níveis

**História de Usuário:** Como administrador, quero atribuir múltiplas coleções a um nível de uma vez, para que eu possa organizar coleções em níveis de precificação eficientemente.

#### Critérios de Aceitação

1. O Painel_Admin DEVE fornecer uma interface de atribuição em massa para selecionar múltiplas Coleções
2. O Painel_Admin DEVE permitir filtrar coleções por nível atual, faixa de preço ou nome da coleção
3. O Painel_Admin DEVE exibir uma prévia das coleções a serem reatribuídas antes da confirmação
4. QUANDO a atribuição em massa é executada, O Sistema DEVE atualizar todas as Coleções selecionadas em até 10 segundos
5. O Sistema DEVE exibir um indicador de progresso durante operações de atribuição em massa
6. QUANDO a atribuição em massa é concluída, O Sistema DEVE exibir um resumo de atribuições bem-sucedidas e falhadas
7. O Sistema DEVE permitir desfazer atribuições em massa em até 5 minutos após a execução

### Requisito 11: Relatórios de Níveis de Preço

**História de Usuário:** Como administrador, quero gerar relatórios sobre uso de níveis de preço, para que eu possa analisar a efetividade da estratégia de precificação.

#### Critérios de Aceitação

1. O Painel_Admin DEVE fornecer uma interface de relatórios para análises de Níveis_de_Preço
2. O Sistema DEVE gerar relatórios mostrando contagem de coleções por Nível_de_Preço
3. O Sistema DEVE gerar relatórios mostrando distribuição de receita entre Níveis_de_Preço
4. O Sistema DEVE gerar relatórios mostrando taxas de conversão de compra por Nível_de_Preço
5. O Painel_Admin DEVE permitir filtrar relatórios por intervalo de datas
6. O Sistema DEVE permitir exportar relatórios para formatos PDF e CSV
7. O Sistema DEVE atualizar dados de relatórios em até 1 hora após mudanças de preço

### Requisito 12: Suporte de API para Níveis de Preço

**História de Usuário:** Como desenvolvedor, quero endpoints de API para operações de níveis de preço, para que eu possa integrar precificação baseada em níveis em outros componentes do sistema.

#### Critérios de Aceitação

1. O Sistema DEVE fornecer um endpoint de API REST para recuperar todos os Níveis_de_Preço
2. O Sistema DEVE fornecer um endpoint de API REST para recuperar o Nível_de_Preço atual de uma Coleção
3. O Sistema DEVE fornecer um endpoint de API REST para recuperar a precificação de uma Coleção específica
4. A API DEVE retornar dados de precificação em formato JSON
5. A API DEVE incluir Preço_Cheio, Preço_Pix, Valor_Entrada e nome do nível nas respostas
6. A API DEVE responder a consultas de precificação em até 200 milissegundos
7. A API DEVE exigir autenticação para operações de gerenciamento de níveis
8. A API DEVE retornar códigos de status HTTP apropriados para condições de sucesso e erro
