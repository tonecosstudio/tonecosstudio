# Documento de Requisitos

## Introdução

Este documento especifica os requisitos para reorganizar e melhorar a navegação da barra lateral do admin, modernizar o design do layout administrativo e analisar a área de perfil do usuário para melhorias organizacionais similares. A área administrativa atual sofre de sobrecarga de navegação (mais de 30 itens de menu em 9 seções), páginas obsoletas, redirecionamentos excessivos e organização inconsistente. A área de perfil do usuário (Profile.tsx) possui 11 seções na barra lateral com potenciais problemas de duplicação entre páginas independentes e seções de perfil. Esta reorganização irá simplificar a navegação administrativa para 15-20 itens, modernizar padrões de UI/UX nas páginas administrativas, remover débito técnico, analisar a navegação voltada ao usuário para problemas similares e estabelecer uma arquitetura de informação clara tanto para áreas administrativas quanto de usuário.

## Glossário

- **Admin_Sidebar**: O menu de navegação exibido na área administrativa que fornece acesso às páginas administrativas
- **Menu_Item**: Um link clicável no Admin_Sidebar que navega para uma página administrativa
- **Menu_Section**: Um agrupamento lógico de Menu_Items relacionados no Admin_Sidebar
- **Obsolete_Page**: Um componente de página que foi consolidado em outras páginas e não é mais necessário
- **Compatibility_Redirect**: Um redirecionamento de rota que mantém URLs antigas para compatibilidade retroativa
- **Orphaned_Page**: Um componente de página que existe no código mas não possui definição de rota
- **Collections_Functionality**: Funcionalidades relacionadas ao gerenciamento de coleções de produtos e personagens
- **Route_Definition**: Uma configuração de rota do React Router que mapeia um caminho de URL para um componente de página
- **Admin_Area**: A seção protegida da aplicação acessível apenas para administradores
- **AdminLayout**: O componente de layout que envolve todas as páginas administrativas e fornece estrutura consistente
- **UI_Pattern**: Um padrão de design reutilizável para componentes de interface de usuário seguindo padrões contemporâneos
- **User_Profile_Area**: A seção da aplicação onde usuários gerenciam suas informações pessoais e preferências
- **Profile_Sidebar**: O menu de navegação no Profile.tsx que fornece acesso às seções de perfil do usuário
- **Profile_Section**: Uma área de conteúdo dentro do Profile.tsx acessível através do Profile_Sidebar
- **Standalone_Page**: Um componente de página que existe independentemente com sua própria rota fora do Profile.tsx
- **Duplicate_Navigation**: Quando a mesma funcionalidade é acessível através de múltiplos caminhos de navegação
- **User_Dashboard**: A página principal de destino para usuários autenticados mostrando suas atividades e ações rápidas

## Requisitos

### Requisito 1: Reduzir Complexidade da Navegação da Barra Lateral

**História de Usuário:** Como administrador, eu quero uma barra lateral simplificada com 15-20 itens claramente organizados, para que eu possa encontrar rapidamente as funcionalidades que preciso sem sobrecarga cognitiva.

#### Critérios de Aceitação

1. O Admin_Sidebar DEVE conter entre 15 e 20 Menu_Items no total
2. O Admin_Sidebar DEVE conter entre 5 e 7 Menu_Sections
3. QUANDO o Admin_Sidebar for renderizado, O Admin_Sidebar DEVE exibir Menu_Sections em uma hierarquia lógica baseada na frequência de uso do fluxo de trabalho do usuário
4. O Admin_Sidebar DEVE agrupar Menu_Items relacionados dentro da mesma Menu_Section
5. QUANDO comparar a nova estrutura com a estrutura antiga, O novo Admin_Sidebar DEVE reduzir a contagem total de Menu_Items em pelo menos 30 por cento

### Requisito 2: Remover Páginas Obsoletas

**História de Usuário:** Como desenvolvedor, eu quero componentes de página obsoletos removidos do código, para que a aplicação seja mantível e livre de código morto.

#### Critérios de Aceitação

1. O Sistema DEVE remover todos os 11 componentes Obsolete_Page identificados do código
2. O Sistema DEVE remover todas as declarações de importação que referenciam componentes Obsolete_Page
3. O Sistema DEVE remover todas as Route_Definitions que apontam para componentes Obsolete_Page
4. QUANDO uma Obsolete_Page for removida, O Sistema DEVE verificar que nenhuma referência ativa permanece no código
5. O Sistema DEVE documentar quais páginas substituíram a funcionalidade de cada Obsolete_Page

### Requisito 3: Limpar Redirecionamentos de Compatibilidade

**História de Usuário:** Como desenvolvedor, eu quero redirecionamentos desnecessários removidos, para que a configuração de roteamento seja limpa e mantível.

#### Critérios de Aceitação

1. QUANDO um Compatibility_Redirect apontar para uma Obsolete_Page, O Sistema DEVE remover o Compatibility_Redirect
2. QUANDO um Compatibility_Redirect estiver em vigor por mais de 6 meses e apontar para uma página válida, O Sistema DEVE avaliar o redirecionamento para remoção
3. O Sistema DEVE reter Compatibility_Redirects apenas para URLs que possam estar marcadas como favoritas ou vinculadas externamente
4. O Sistema DEVE reduzir o número total de Compatibility_Redirects em pelo menos 50 por cento
5. O Sistema DEVE documentar o motivo para reter cada Compatibility_Redirect restante

### Requisito 4: Resolver Páginas Órfãs

**História de Usuário:** Como desenvolvedor, eu quero que todos os componentes de página tenham rotas ou sejam removidos, para que o código contenha apenas componentes funcionais.

#### Critérios de Aceitação

1. QUANDO uma Orphaned_Page fornecer funcionalidade única, O Sistema DEVE criar uma Route_Definition para a Orphaned_Page
2. QUANDO uma Orphaned_Page duplicar funcionalidade existente, O Sistema DEVE remover a Orphaned_Page
3. QUANDO uma Orphaned_Page for adicionada às rotas, O Sistema DEVE adicionar um Menu_Item correspondente ao Admin_Sidebar
4. O Sistema DEVE resolver todas as 3 Orphaned_Pages identificadas (AdminHolidayManager, PaymentVerification, StandalonePurchases)
5. QUANDO todas as Orphaned_Pages forem resolvidas, O Sistema DEVE verificar que nenhum componente de página existe sem Route_Definitions

### Requisito 5: Consolidar Funcionalidade de Coleções

**História de Usuário:** Como administrador, eu quero todas as funcionalidades relacionadas a coleções em um único lugar, para que eu possa gerenciar coleções eficientemente sem navegar entre múltiplas seções.

#### Critérios de Aceitação

1. O Admin_Sidebar DEVE colocar todos os Menu_Items de Collections_Functionality dentro de uma única Menu_Section
2. QUANDO Collections_Functionality aparecer em múltiplas seções, O Sistema DEVE mover todos os itens para a seção única mais apropriada
3. O Sistema DEVE usar nomenclatura consistente para todos os Menu_Items de Collections_Functionality
4. O Sistema DEVE agrupar Collections_Functionality com funcionalidades relacionadas ao catálogo de produtos
5. QUANDO um usuário acessar qualquer página de Collections_Functionality, O Admin_Sidebar DEVE destacar a Menu_Section contendo funcionalidades de coleções

### Requisito 6: Padronizar Convenções de Nomenclatura

**História de Usuário:** Como administrador, eu quero terminologia consistente em toda a área administrativa, para que a interface seja previsível e profissional.

#### Critérios de Aceitação

1. O Admin_Sidebar DEVE usar português ou inglês consistentemente para todos os rótulos de Menu_Item dentro da mesma Menu_Section
2. O Sistema DEVE usar o mesmo idioma para rótulos de Menu_Item usado nos títulos de página correspondentes
3. QUANDO termos técnicos aparecerem em Menu_Items, O Sistema DEVE usar terminologia padrão da indústria
4. O Sistema DEVE usar regras de capitalização consistentes para todos os rótulos de Menu_Item
5. O Sistema DEVE evitar misturar termos em português e inglês dentro do mesmo rótulo de Menu_Item

### Requisito 7: Melhorar Uso de Ícones e Hierarquia Visual

**História de Usuário:** Como administrador, eu quero ícones distintos para diferentes funcionalidades, para que eu possa rapidamente escanear e identificar itens de menu visualmente.

#### Critérios de Aceitação

1. O Admin_Sidebar DEVE usar ícones únicos para cada Menu_Section
2. QUANDO múltiplos Menu_Items compartilharem tipos de funcionalidade, O Admin_Sidebar DEVE usar o mesmo ícone apenas para esses itens relacionados
3. O Admin_Sidebar NÃO DEVE usar o mesmo ícone mais de duas vezes em todos os Menu_Items
4. O Sistema DEVE substituir o ícone Package por ícones distintos para pelo menos 2 dos 4 usos atuais
5. O Admin_Sidebar DEVE usar tamanho de ícone e espaçamento para estabelecer hierarquia visual clara entre Menu_Sections e Menu_Items

### Requisito 8: Manter Compatibilidade Retroativa para Rotas Críticas

**História de Usuário:** Como administrador de sistema, eu quero que URLs críticas marcadas como favoritas continuem funcionando, para que documentação existente e links salvos permaneçam funcionais.

#### Critérios de Aceitação

1. QUANDO uma URL de Menu_Item mudar, O Sistema DEVE criar um Compatibility_Redirect para URLs que possam ser referenciadas externamente
2. O Sistema DEVE manter Compatibility_Redirects para todas as URLs na documentação do usuário
3. O Sistema DEVE manter Compatibility_Redirects para todas as URLs que aparecem em notificações por email
4. QUANDO um Compatibility_Redirect for criado, O Sistema DEVE redirecionar para a nova URL com status HTTP 301
5. O Sistema DEVE documentar todos os Compatibility_Redirects mantidos com datas de expiração para limpeza futura

### Requisito 9: Preservar Todas as Páginas Funcionais

**História de Usuário:** Como administrador, eu quero que todas as funcionalidades atualmente funcionais permaneçam acessíveis, para que nenhuma capacidade seja perdida durante a reorganização.

#### Critérios de Aceitação

1. O Sistema DEVE manter Route_Definitions para todas as páginas que não são identificadas como Obsolete_Pages
2. QUANDO uma página for movida para uma Menu_Section diferente, O Sistema DEVE preservar a funcionalidade da página
3. O Sistema DEVE verificar que todas as 56 páginas administrativas são removidas como obsoletas ou possuem rotas válidas
4. QUANDO a reorganização estiver completa, O Sistema DEVE fornecer um documento de mapeamento mostrando localizações antigas para novas localizações
5. O Sistema DEVE garantir que toda página funcional seja acessível através de pelo menos um Menu_Item no Admin_Sidebar

### Requisito 10: Organizar por Fluxo de Trabalho do Usuário

**História de Usuário:** Como administrador, eu quero itens de menu organizados pela frequência com que os uso e sua ordem lógica de fluxo de trabalho, para que tarefas comuns sejam fáceis de acessar.

#### Critérios de Aceitação

1. O Admin_Sidebar DEVE colocar os Menu_Items mais frequentemente acessados nas 3 primeiras Menu_Sections
2. O Admin_Sidebar DEVE agrupar Menu_Items que são usados juntos em fluxos de trabalho sequenciais dentro da mesma Menu_Section
3. O Admin_Sidebar DEVE colocar Menu_Items administrativos e de configuração em Menu_Sections inferiores
4. QUANDO Menu_Sections representarem um fluxo de trabalho, O Admin_Sidebar DEVE ordenar Menu_Items dentro da seção pela sequência do fluxo de trabalho
5. O Sistema DEVE posicionar o Menu_Item Dashboard como o primeiro item no Admin_Sidebar

### Requisito 11: Modernizar Design do Layout Administrativo

**História de Usuário:** Como administrador, eu quero uma interface administrativa contemporânea e visualmente atraente, para que a área administrativa pareça profissional e seja agradável de usar.

#### Critérios de Aceitação

1. O AdminLayout DEVE implementar UI_Patterns contemporâneos consistentes com dashboards administrativos modernos
2. O AdminLayout DEVE usar espaçamento, tipografia e esquemas de cores consistentes em todas as páginas administrativas
3. QUANDO páginas administrativas forem renderizadas, O AdminLayout DEVE fornecer design responsivo que funcione em viewports de tablet e desktop
4. O Sistema DEVE atualizar todos os componentes de página administrativa para seguir o sistema de design modernizado
5. O AdminLayout DEVE melhorar a hierarquia visual para tornar ações e informações primárias mais proeminentes

### Requisito 12: Analisar Estrutura de Navegação do Perfil do Usuário

**História de Usuário:** Como desenvolvedor, eu quero entender a organização da navegação do perfil do usuário, para que eu possa identificar problemas similares aos encontrados na área administrativa.

#### Critérios de Aceitação

1. O Sistema DEVE documentar todos os 11 itens de Profile_Section no Profile_Sidebar
2. O Sistema DEVE identificar todas as Standalone_Pages que fornecem funcionalidade voltada ao usuário
3. O Sistema DEVE comparar funcionalidade de Profile_Section contra funcionalidade de Standalone_Page para identificar sobreposições
4. O Sistema DEVE documentar quais funcionalidades são acessíveis através de Profile_Sidebar versus User_Dashboard versus Standalone_Pages
5. O Sistema DEVE produzir um relatório de análise mostrando complexidade de navegação e oportunidades potenciais de consolidação

### Requisito 13: Identificar Navegação Duplicada Voltada ao Usuário

**História de Usuário:** Como usuário, eu quero um único caminho claro para acessar cada funcionalidade, para que eu não encontre opções de navegação duplicadas confusas.

#### Critérios de Aceitação

1. QUANDO uma funcionalidade existir tanto como Profile_Section quanto como Standalone_Page, O Sistema DEVE identificá-la como Duplicate_Navigation
2. O Sistema DEVE identificar que a funcionalidade de Suporte existe tanto em Support.tsx quanto em Profile_Sidebar
3. O Sistema DEVE identificar que a funcionalidade de NotificationHistory existe tanto em NotificationHistory.tsx quanto em Profile_Sidebar
4. O Sistema DEVE analisar se Dashboard.tsx duplica funcionalidade na Profile_Section "Meus Pedidos"
5. O Sistema DEVE documentar todas as instâncias de Duplicate_Navigation com recomendações para consolidação

### Requisito 14: Garantir Acessibilidade de Funcionalidades do Usuário

**História de Usuário:** Como usuário, eu quero que todas as funcionalidades disponíveis sejam facilmente descobríveis, para que eu possa acessar toda a funcionalidade que a aplicação fornece.

#### Critérios de Aceitação

1. O Sistema DEVE verificar que todas as Standalone_Pages voltadas ao usuário são acessíveis através de Profile_Sidebar ou User_Dashboard
2. QUANDO uma Standalone_Page fornecer funcionalidade única, O Sistema DEVE garantir que ela tenha um ponto de entrada de navegação
3. O Sistema DEVE identificar quaisquer funcionalidades de usuário que não são acessíveis através da navegação do Profile_Sidebar
4. O Sistema DEVE verificar que MemberGroupsPage, PreorderTracking e Wishlist têm caminhos de navegação claros
5. O Sistema DEVE documentar quais funcionalidades devem ser adicionadas ao Profile_Sidebar ou User_Dashboard para descobribilidade

### Requisito 15: Consolidar Navegação Voltada ao Usuário

**História de Usuário:** Como usuário, eu quero padrões de navegação consistentes entre meu dashboard e perfil, para que a interface seja previsível e fácil de aprender.

#### Critérios de Aceitação

1. QUANDO Duplicate_Navigation for identificada, O Sistema DEVE consolidar para um único caminho de navegação
2. O Sistema DEVE estabelecer regras claras para quando funcionalidades pertencem ao Profile_Sidebar versus User_Dashboard versus Standalone_Pages
3. O Sistema DEVE garantir que Suporte e NotificationHistory sejam acessíveis através de apenas um caminho de navegação primário
4. O Sistema DEVE manter Compatibility_Redirects para quaisquer URLs voltadas ao usuário que mudarem
5. O Sistema DEVE criar uma hierarquia de navegação consistente para a User_Profile_Area similar à reorganização da Admin_Area

### Requisito 16: Alinhar Modernização de Layout de Usuário e Admin

**História de Usuário:** Como usuário, eu quero que as áreas voltadas ao usuário tenham o mesmo design moderno e polido da área administrativa, para que toda a aplicação pareça coesa.

#### Critérios de Aceitação

1. O Sistema DEVE aplicar os mesmos UI_Patterns usados no AdminLayout aos layouts voltados ao usuário
2. O Sistema DEVE garantir que Profile.tsx use o mesmo sistema de design das páginas administrativas modernizadas
3. O Sistema DEVE atualizar User_Dashboard para corresponder ao estilo visual da área administrativa modernizada
4. O Sistema DEVE usar bibliotecas de componentes e abordagens de estilização consistentes entre áreas administrativas e de usuário
5. QUANDO ambas as áreas administrativa e de usuário forem modernizadas, O Sistema DEVE manter distinção visual entre contextos administrativos e de usuário enquanto compartilha padrões de design
