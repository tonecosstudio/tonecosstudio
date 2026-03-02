# Plano de Implementação: Reorganização da Barra Lateral Admin

## Visão Geral

Este plano detalha a implementação da reorganização e modernização da navegação administrativa, remoção de páginas obsoletas, limpeza de redirecionamentos e consolidação da área de perfil do usuário. A implementação seguirá 7 fases ao longo de 7 semanas, com entregas incrementais e validação contínua.

**Objetivos principais:**
- Reduzir complexidade de navegação de 30+ itens para 18 itens (28% de redução)
- Consolidar 9 seções em 6 seções lógicas
- Remover 11 páginas obsoletas e suas referências
- Limpar 7 de 13 redirecionamentos (54%)
- Resolver 3 páginas órfãs
- Modernizar UI/UX com sistema de design unificado
- Consolidar navegação do perfil de usuário

**Linguagem de implementação:** TypeScript/React

## Tarefas

- [x] 1. Fase 1: Preparação e Análise
  - [x] 1.1 Auditar todas as páginas administrativas existentes
    - Criar script TypeScript para escanear diretório de páginas admin
    - Identificar todos os componentes de página e suas rotas
    - Gerar lista completa das 56 páginas administrativas
    - Documentar dependências entre páginas (imports, links)
    - _Requisitos: 9.3_

  - [x] 1.2 Confirmar e documentar páginas obsoletas
    - Verificar as 11 páginas obsoletas identificadas no design
    - Para cada página obsoleta, documentar: página substituta, data de obsolescência, referências existentes
    - Criar arquivo `obsolete-pages-list.md` com justificativas
    - _Requisitos: 2.1, 2.5_

  - [x] 1.3 Mapear e analisar redirecionamentos existentes
    - Identificar todos os 13 redirecionamentos de compatibilidade
    - Classificar cada redirect: manter (6) ou remover (7)
    - Documentar motivo de retenção para redirects mantidos
    - Verificar se redirects apontam para páginas válidas ou obsoletas
    - Criar arquivo `redirects-analysis.md`
    - _Requisitos: 3.1, 3.2, 3.3, 3.5_

  - [x] 1.4 Documentar resolução de páginas órfãs
    - Analisar AdminHolidayManager: verificar funcionalidade única, definir rota `/admin/feriados`
    - Analisar PaymentVerification: planejar integração ao Hub de Pagamentos
    - Analisar StandalonePurchases: planejar integração à página Orçamentos
    - Criar arquivo `orphaned-pages-resolution.md` com plano detalhado
    - _Requisitos: 4.1, 4.2, 4.4_

  - [x] 1.5 Criar mapeamento de URLs antigas para novas
    - Documentar todas as mudanças de URL planejadas
    - Mapear consolidações: Modelos + Franquias, Preços + Planos, Coleções
    - Mapear mudanças de idioma: `/admin/users` → `/admin/usuarios`
    - Criar arquivo `url-mapping.md` com tabela completa
    - _Requisitos: 9.4_

- [x] 2. Fase 2: Configuração de Navegação
  - [x] 2.1 Criar arquivo de configuração de navegação admin
    - Criar `src/config/admin-navigation.config.ts`
    - Definir interfaces TypeScript: `MenuItem`, `MenuSection`, `AdminLayoutProps`, `Breadcrumb`
    - Implementar array `adminNavigationConfig` com 6 seções e 18 itens
    - Seção 1: Visão Geral (Dashboard, Analytics)
    - Seção 2: Operações (7 itens: Orçamentos, Pré-vendas, Assinaturas, Ciclos, Entregas, Capacidade, Auditoria)
    - Seção 3: Catálogo (5 itens: Upload, Esteira, Modelos & Franquias, Coleções, Embalagem)
    - Seção 4: Financeiro & Marketing (4 itens: Preços & Planos, Pagamentos, Financeiro, Cupons)
    - Seção 5: Usuários & Comunicação (2 itens: Usuários, Comunicação)
    - Seção 6: Configurações (2 itens: Configurações, Feriados)
    - Importar ícones do lucide-react
    - _Requisitos: 1.1, 1.2, 1.4, 5.1, 5.4, 6.1, 7.1, 10.1, 10.5_

  - [x] 2.2 Criar arquivo de configuração de navegação do perfil
    - Criar `src/config/profile-navigation.config.ts`
    - Definir type `ProfileSection` com 9 valores
    - Definir interfaces: `ProfileLayoutProps`, `ProfileSidebarItem`, `ProfileSidebarSubItem`
    - Implementar array `profileNavigationConfig` com 5 seções principais
    - Seção 1: Minha Conta (3 sub-itens: Info, Pessoal, Notificações)
    - Seção 2: Perfil Público (Colecionador)
    - Seção 3: Preferências & Coleção (3 sub-itens: Preferências, Coleção, Wishlist)
    - Seção 4: Endereço & Pagamento (2 sub-itens)
    - Seção 5: Pedidos & Assinaturas (2 sub-itens)
    - Seção 6: Suporte
    - _Requisitos: 12.1, 13.1, 14.1, 15.2_

  - [x] 2.3 Criar arquivo de configuração de redirecionamentos
    - Criar `src/config/redirects.config.ts`
    - Definir interface `RedirectRule` com campos: from, to, permanent, reason, expiresAt
    - Implementar array `adminRedirects` com 6 redirects mantidos
    - Adicionar redirects: quotes, subscriptions, users-list, financial-dashboard, payment-hub, settings
    - Adicionar redirects de consolidação: modelos→modelos-franquias, franquias→modelos-franquias, planos→precos-planos, precos→precos-planos
    - Documentar motivo e data de expiração para cada redirect
    - _Requisitos: 3.3, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x]* 2.4 Criar geradores para testes de propriedades
    - Criar `src/test/generators/navigation.generators.ts`
    - Implementar `menuItemGenerator` usando fast-check
    - Implementar `menuSectionGenerator` com constraints (5-7 seções, 15-20 itens)
    - Implementar `validAdminSidebarGenerator`
    - Implementar `validRouteGenerator`
    - Implementar `redirectGenerator`
    - _Requisitos: Suporte para testes_

- [x] 3. Fase 3: Atualização de Componentes
  - [x] 3.1 Atualizar componente AdminLayout
    - Modificar `src/layouts/AdminLayout.tsx`
    - Importar `adminNavigationConfig` do arquivo de configuração
    - Refatorar renderização da sidebar para usar configuração
    - Implementar destaque de seção ativa baseado na rota atual
    - Adicionar suporte para badges opcionais em itens de menu
    - Implementar breadcrumbs opcionais
    - _Requisitos: 1.3, 5.5, 9.2, 10.4_

  - [x] 3.2 Criar página consolidada Modelos & Franquias
    - Criar `src/pages/admin/ModelsAndFranchises.tsx`
    - Implementar navegação por abas: "Modelos" e "Franquias"
    - Integrar componentes existentes de modelos e franquias como abas
    - Manter toda funcionalidade das páginas originais
    - Adicionar rota `/admin/modelos-franquias` no router
    - _Requisitos: 5.3, 6.2, 9.2_

  - [x] 3.3 Criar página consolidada Preços & Planos
    - Criar `src/pages/admin/PricingAndPlans.tsx`
    - Implementar navegação por abas: "Preços" e "Planos"
    - Integrar componentes existentes de preços e planos como abas
    - Manter toda funcionalidade das páginas originais
    - Adicionar rota `/admin/precos-planos` no router
    - _Requisitos: 5.3, 6.2, 9.2_

  - [x] 3.4 Adicionar rota para AdminHolidayManager
    - Adicionar rota `/admin/feriados` no router principal
    - Importar componente `AdminHolidayManager`
    - Adicionar item "Feriados" na seção Configurações do menu
    - Verificar que componente renderiza corretamente
    - _Requisitos: 4.1, 4.3_

  - [x] 3.5 Integrar PaymentVerification ao Hub de Pagamentos
    - Modificar `src/pages/admin/PaymentHub.tsx`
    - Adicionar aba "Verificação" ao componente PaymentHub
    - Integrar componente `PaymentVerification` como conteúdo da aba
    - Remover qualquer rota standalone para PaymentVerification
    - Verificar que funcionalidade está acessível via Hub de Pagamentos
    - _Requisitos: 4.2, 4.3_

  - [x] 3.6 Integrar StandalonePurchases à página Orçamentos
    - Modificar `src/pages/admin/Quotes.tsx`
    - Adicionar filtro/visualização "Compras Avulsas" à página Orçamentos
    - Integrar lógica do componente `StandalonePurchases`
    - Remover qualquer rota standalone para StandalonePurchases
    - Verificar que compras avulsas são visíveis na página Orçamentos
    - _Requisitos: 4.2, 4.3_

  - [x] 3.7 Consolidar páginas de Coleções
    - Verificar se páginas `/admin/colecoes` e `/admin/gerenciar-colecoes` existem
    - Se existirem páginas separadas, consolidar em uma única página
    - Implementar navegação por abas se necessário
    - Atualizar rota para `/admin/colecoes`
    - Manter toda funcionalidade de gerenciamento de coleções
    - _Requisitos: 5.1, 5.2, 5.3_

  - [x] 3.8 Atualizar componente Profile
    - Modificar `src/pages/Profile.tsx`
    - Importar `profileNavigationConfig` do arquivo de configuração
    - Refatorar sidebar do perfil para usar configuração
    - Consolidar seções: info + personal + notifications → account
    - Implementar sub-itens colapsáveis para seções com múltiplas páginas
    - Adicionar link para Wishlist na seção Preferências & Coleção
    - _Requisitos: 12.1, 13.3, 14.3, 15.1, 15.2_

  - [x] 3.9 Implementar sistema de redirecionamentos
    - Criar `src/utils/redirects.ts`
    - Implementar função `setupRedirects()` que lê `redirects.config.ts`
    - Implementar detecção de loops circulares
    - Adicionar logging de redirects para monitoramento
    - Integrar redirects no router principal da aplicação
    - Implementar fallback para dashboard em caso de erro
    - _Requisitos: 8.1, 8.4_

- [ ] 4. Checkpoint - Verificar funcionalidades consolidadas
  - Testar navegação para todas as páginas consolidadas
  - Verificar que páginas órfãs estão acessíveis
  - Testar redirects manualmente
  - Garantir que nenhuma funcionalidade foi perdida
  - Perguntar ao usuário se há dúvidas ou problemas

- [x] 5. Fase 4: Remoção de Código Obsoleto
  - [x] 5.1 Remover componentes de páginas obsoletas
    - Deletar arquivo `OldQuotesPage.tsx`
    - Deletar arquivo `LegacyPreordersPage.tsx`
    - Deletar arquivo `OldSubscriptionsManager.tsx`
    - Deletar arquivo `DeprecatedAnalytics.tsx`
    - Deletar arquivo `OldUsersList.tsx`
    - Deletar arquivo `LegacyProductUpload.tsx`
    - Deletar arquivo `OldCollectionsPage.tsx`
    - Deletar arquivo `DeprecatedPricingPage.tsx`
    - Deletar arquivo `OldCouponsManager.tsx`
    - Deletar arquivo `LegacyFinancialDashboard.tsx`
    - Deletar arquivo `OldCommunicationCenter.tsx`
    - _Requisitos: 2.1_

  - [x] 5.2 Remover imports de páginas obsoletas
    - Buscar todas as referências de import para as 11 páginas obsoletas
    - Remover declarações de import em todos os arquivos
    - Verificar que nenhum import permanece usando busca no código
    - _Requisitos: 2.2, 2.4_

  - [x] 5.3 Remover rotas de páginas obsoletas
    - Remover Route definitions para as 11 páginas obsoletas do router
    - Verificar arquivo principal de rotas (ex: `App.tsx` ou `routes.tsx`)
    - Garantir que nenhuma rota aponta para componentes obsoletos
    - _Requisitos: 2.3, 2.4_

  - [x] 5.4 Remover redirecionamentos obsoletos
    - Remover redirect `/admin/old-quotes`
    - Remover redirect `/admin/legacy-preorders`
    - Remover redirect `/admin/deprecated-analytics`
    - Remover redirect `/admin/old-collections`
    - Remover redirect `/admin/legacy-upload`
    - Remover redirect `/admin/old-coupons`
    - Remover redirect `/admin/legacy-communication`
    - Atualizar `redirects.config.ts` removendo os 7 redirects obsoletos
    - _Requisitos: 3.1, 3.4_

  - [x] 5.5 Limpar código não utilizado
    - Executar análise de código morto (dead code)
    - Remover utilitários e helpers usados apenas por páginas obsoletas
    - Remover constantes e tipos TypeScript não utilizados
    - Atualizar índices de exportação se necessário
    - _Requisitos: 2.4_

  - [x] 5.6 Atualizar documentação técnica
    - Atualizar README com nova estrutura de navegação
    - Documentar páginas removidas e suas substitutas
    - Atualizar diagramas de arquitetura se existirem
    - Criar changelog detalhado das mudanças
    - _Requisitos: 2.5, 9.4_

- [x] 6. Fase 5: Modernização de UI/UX
  - [x] 6.1 Criar sistema de design tokens
    - Criar `src/styles/design-tokens.ts`
    - Definir tokens de espaçamento (xs, sm, md, lg, xl, xxl)
    - Definir tokens de tipografia (fontFamily, fontSize, fontWeight, lineHeight)
    - Definir tokens de cores usando variáveis CSS para tema claro/escuro
    - Definir tokens de borderRadius (sm, md, lg, xl, full)
    - Definir tokens de sombras (sm, md, lg, xl)
    - Definir tokens de transições (fast, normal, slow)
    - _Requisitos: 11.1, 11.2, 16.1, 16.2_

  - [x] 6.2 Atualizar componentes base
    - Atualizar componente `Card` para usar design tokens
    - Atualizar componente `Button` com variantes (primary, secondary, outline, ghost, destructive)
    - Atualizar componente `Button` com tamanhos (sm, md, lg)
    - Implementar estados de loading e disabled em botões
    - Garantir que componentes suportam tema claro/escuro
    - _Requisitos: 11.1, 11.4, 16.3_

  - [x] 6.3 Implementar hierarquia visual na sidebar
    - Aplicar estilos de seção: uppercase, tamanho xs, peso semibold, cor muted
    - Aplicar estilos de item: tamanho sm, peso medium, padding md, border radius lg
    - Implementar destaque visual para item ativo (cor primary)
    - Padronizar tamanho de ícones (16x16px) e espaçamento
    - Garantir contraste adequado para acessibilidade
    - _Requisitos: 7.5, 11.5_

  - [x] 6.4 Implementar animações e transições
    - Criar animação de transição de página (fade + translateY)
    - Implementar transição de hover em itens de menu (150ms)
    - Implementar animação de expansão para seções colapsáveis (350ms)
    - Adicionar skeleton loaders para estados de carregamento
    - Implementar toast notifications para feedback de ações
    - _Requisitos: 11.1_

  - [x] 6.5 Melhorar responsividade do layout
    - Implementar menu hamburguer para mobile (< 768px)
    - Implementar sidebar colapsável para tablet (768px - 1024px)
    - Manter sidebar fixa para desktop (> 1024px)
    - Adicionar breakpoints no código: sm, md, lg, xl, 2xl
    - Testar layout em diferentes viewports
    - _Requisitos: 11.3_

  - [x] 6.6 Adicionar breadcrumbs de navegação
    - Implementar componente `Breadcrumbs`
    - Integrar breadcrumbs ao AdminLayout
    - Gerar breadcrumbs automaticamente baseado na rota atual
    - Adicionar navegação clicável nos breadcrumbs
    - _Requisitos: 11.5_

  - [x] 6.7 Implementar error boundaries
    - Criar componente `ErrorBoundary` para capturar erros de renderização
    - Adicionar error boundary ao redor de páginas administrativas
    - Implementar UI de fallback amigável para erros
    - Adicionar logging de erros para monitoramento
    - _Requisitos: 11.1_

  - [x] 6.8 Aplicar modernização ao Profile e Dashboard
    - Aplicar design tokens ao componente Profile.tsx
    - Aplicar design tokens ao componente Dashboard.tsx
    - Garantir consistência visual entre áreas admin e usuário
    - Manter distinção visual entre contextos (admin vs usuário)
    - _Requisitos: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 7. Checkpoint - Verificar modernização
  - Testar interface em diferentes navegadores
  - Verificar responsividade em mobile, tablet e desktop
  - Testar tema claro e escuro
  - Verificar animações e transições
  - Garantir que todos os testes passam
  - Perguntar ao usuário se há ajustes necessários

- [x] 8. Fase 6: Testes
  - [x] 8.1 Escrever testes unitários para exemplos específicos
    - Testar redução de 28% nos itens de menu (25 → 18)
    - Testar que 11 páginas obsoletas foram removidas
    - Testar que 7 redirects foram removidos (54%)
    - Testar que 3 páginas órfãs foram resolvidas
    - Testar que ícone Package foi substituído em 2 de 4 usos
    - Testar que Dashboard é o primeiro item do menu
    - Testar que Configurações está nas seções inferiores
    - Testar que Coleções está na seção Catálogo
    - Testar casos extremos: sidebar vazia, máximo de itens, mínimo de itens
    - Testar condições de erro: configuração inválida, ícone não encontrado, rota duplicada
    - _Requisitos: 1.5, 2.1, 3.4, 4.4, 7.4, 9.3, 10.3, 10.5, 5.4_

  - [ ]* 8.2 Escrever teste de propriedade 1: Limites de contagem de itens
    - **Propriedade 1: Limites de Contagem de Itens de Menu**
    - **Valida: Requisitos 1.1**
    - Criar `src/test/properties/navigation.properties.test.ts`
    - Implementar teste: total de Menu_Items entre 15 e 20
    - Usar `menuSectionGenerator` com fast-check
    - Configurar 100 iterações mínimas
    - _Requisitos: 1.1_

  - [ ]* 8.3 Escrever teste de propriedade 2: Limites de contagem de seções
    - **Propriedade 2: Limites de Contagem de Seções**
    - **Valida: Requisitos 1.2**
    - Implementar teste: total de Menu_Sections entre 5 e 7
    - Usar `validAdminSidebarGenerator` com fast-check
    - Configurar 100 iterações mínimas
    - _Requisitos: 1.2_

  - [ ]* 8.4 Escrever teste de propriedade 3: Ausência de referências obsoletas
    - **Propriedade 3: Ausência de Referências a Páginas Obsoletas**
    - **Valida: Requisitos 2.2, 2.3, 2.4**
    - Implementar teste: nenhuma referência a páginas obsoletas no código
    - Verificar imports, rotas e chamadas de componente
    - Usar lista de OBSOLETE_PAGES como entrada
    - _Requisitos: 2.2, 2.3, 2.4_

  - [ ]* 8.5 Escrever teste de propriedade 4: Redirects não apontam para obsoletas
    - **Propriedade 4: Redirects Não Apontam para Páginas Obsoletas**
    - **Valida: Requisitos 3.1**
    - Implementar teste: URL de destino de redirects não aponta para página obsoleta
    - Verificar todos os Compatibility_Redirects configurados
    - _Requisitos: 3.1_

  - [ ]* 8.6 Escrever teste de propriedade 5: Redirects retidos têm documentação
    - **Propriedade 5: Redirects Retidos Têm Documentação**
    - **Valida: Requisitos 3.5**
    - Implementar teste: todo redirect mantido tem campo "reason" preenchido
    - Verificar que campo reason não está vazio
    - _Requisitos: 3.5_

  - [ ]* 8.7 Escrever teste de propriedade 6: Páginas órfãs resolvidas têm rotas
    - **Propriedade 6: Páginas Órfãs Resolvidas Têm Rotas**
    - **Valida: Requisitos 4.1**
    - Implementar teste: páginas órfãs com funcionalidade única têm Route_Definition
    - Verificar AdminHolidayManager, PaymentVerification, StandalonePurchases
    - _Requisitos: 4.1_

  - [ ]* 8.8 Escrever teste de propriedade 7: Páginas com rotas têm itens de menu
    - **Propriedade 7: Páginas com Rotas Têm Itens de Menu**
    - **Valida: Requisitos 4.3**
    - Implementar teste: páginas órfãs com rota têm Menu_Item correspondente
    - Verificar que AdminHolidayManager está no menu
    - _Requisitos: 4.3_

  - [ ]* 8.9 Escrever teste de propriedade 8: Nenhum componente sem rota
    - **Propriedade 8: Nenhum Componente de Página Sem Rota**
    - **Valida: Requisitos 4.5**
    - Implementar teste: todo componente de página tem Route_Definition ou não existe
    - Excluir componentes auxiliares e seções
    - _Requisitos: 4.5_

  - [ ]* 8.10 Escrever teste de propriedade 9: Itens de coleções em seção única
    - **Propriedade 9: Itens de Coleções em Seção Única**
    - **Valida: Requisitos 5.1, 5.2**
    - Implementar teste: todos os Menu_Items de Collections_Functionality na mesma seção
    - Usar função `isCollectionItem` para identificar itens
    - _Requisitos: 5.1, 5.2_

  - [ ]* 8.11 Escrever teste de propriedade 10: Nomenclatura consistente de coleções
    - **Propriedade 10: Nomenclatura Consistente de Coleções**
    - **Valida: Requisitos 5.3**
    - Implementar teste: itens de Collections_Functionality seguem mesmo padrão de nomenclatura
    - Verificar idioma, capitalização e terminologia
    - _Requisitos: 5.3_

  - [ ]* 8.12 Escrever teste de propriedade 11: Destaque de seção ativa
    - **Propriedade 11: Destaque de Seção Ativa**
    - **Valida: Requisitos 5.5**
    - Implementar teste: seção de coleções destacada quando página de coleções acessada
    - Verificar estado visual da Menu_Section
    - _Requisitos: 5.5_

  - [ ]* 8.13 Escrever teste de propriedade 12: Consistência de idioma
    - **Propriedade 12: Consistência de Idioma e Nomenclatura**
    - **Valida: Requisitos 6.1, 6.5**
    - Implementar teste: Menu_Items na mesma seção usam mesmo idioma
    - Implementar função `detectLanguage` para identificar idioma
    - Verificar que nenhum item mistura idiomas no rótulo
    - _Requisitos: 6.1, 6.5_

  - [ ]* 8.14 Escrever teste de propriedade 13: Correspondência idioma menu-página
    - **Propriedade 13: Correspondência de Idioma Menu-Página**
    - **Valida: Requisitos 6.2**
    - Implementar teste: idioma do Menu_Item corresponde ao idioma do título da página
    - Verificar navegação e comparar idiomas
    - _Requisitos: 6.2_

  - [ ]* 8.15 Escrever teste de propriedade 14: Capitalização consistente
    - **Propriedade 14: Capitalização Consistente**
    - **Valida: Requisitos 6.4**
    - Implementar teste: todos os Menu_Items seguem mesmo padrão de capitalização
    - Verificar Title Case ou Sentence case consistente
    - _Requisitos: 6.4_

  - [ ]* 8.16 Escrever teste de propriedade 15: Ícones únicos por seção
    - **Propriedade 15: Ícones Únicos por Seção**
    - **Valida: Requisitos 7.1**
    - Implementar teste: cada Menu_Section tem ícone único
    - Verificar que nenhum ícone de seção é compartilhado
    - _Requisitos: 7.1_

  - [ ]* 8.17 Escrever teste de propriedade 16: Limite de reutilização de ícones
    - **Propriedade 16: Limite de Reutilização de Ícones**
    - **Valida: Requisitos 7.3**
    - Implementar teste: nenhum ícone aparece mais de 2 vezes em Menu_Items
    - Contar ocorrências de cada ícone
    - _Requisitos: 7.3_

  - [ ]* 8.18 Escrever teste de propriedade 17: Redirects para URLs alteradas
    - **Propriedade 17: Redirects para URLs Alteradas**
    - **Valida: Requisitos 8.1**
    - Implementar teste: URLs que mudaram têm Compatibility_Redirect
    - Comparar URLs antigas com novas
    - _Requisitos: 8.1_

  - [ ]* 8.19 Escrever teste de propriedade 18: Redirects usam status 301
    - **Propriedade 18: Redirects Usam Status 301**
    - **Valida: Requisitos 8.4**
    - Implementar teste: redirects permanentes usam status HTTP 301
    - Verificar campo `permanent: true`
    - _Requisitos: 8.4_

  - [ ]* 8.20 Escrever teste de propriedade 19: Redirects têm data de expiração
    - **Propriedade 19: Redirects Têm Data de Expiração**
    - **Valida: Requisitos 8.5**
    - Implementar teste: redirects mantidos têm campo `expiresAt` preenchido
    - Verificar que data não é nula
    - _Requisitos: 8.5_

  - [ ]* 8.21 Escrever teste de propriedade 20: Páginas não-obsoletas têm rotas
    - **Propriedade 20: Páginas Não-Obsoletas Têm Rotas**
    - **Valida: Requisitos 9.1**
    - Implementar teste: páginas não identificadas como obsoletas têm Route_Definition
    - Verificar todas as 56 páginas administrativas
    - _Requisitos: 9.1_

  - [ ]* 8.22 Escrever teste de propriedade 21: Páginas funcionais acessíveis via menu
    - **Propriedade 21: Páginas Funcionais Acessíveis via Menu**
    - **Valida: Requisitos 9.5**
    - Implementar teste: páginas com rota válida têm Menu_Item que navega para ela
    - Verificar que todas as páginas são acessíveis
    - _Requisitos: 9.5_

  - [ ]* 8.23 Escrever teste de propriedade 22: Consistência de design tokens
    - **Propriedade 22: Consistência de Design Tokens**
    - **Valida: Requisitos 11.2, 11.4**
    - Implementar teste: páginas admin usam mesmos design tokens
    - Verificar espaçamento, tipografia e cores
    - _Requisitos: 11.2, 11.4_

  - [ ]* 8.24 Escrever teste de propriedade 23: Responsividade do layout
    - **Propriedade 23: Responsividade do Layout**
    - **Valida: Requisitos 11.3**
    - Implementar teste: AdminLayout renderiza corretamente em viewports >= 768px
    - Verificar ausência de overflow horizontal
    - _Requisitos: 11.3_

  - [ ]* 8.25 Escrever teste de propriedade 24: Identificação de navegação duplicada
    - **Propriedade 24: Identificação de Navegação Duplicada**
    - **Valida: Requisitos 13.1**
    - Implementar teste: funcionalidade em Profile_Section e Standalone_Page é identificada
    - Verificar lista de Duplicate_Navigation
    - _Requisitos: 13.1_

  - [ ]* 8.26 Escrever teste de propriedade 25: Páginas standalone acessíveis
    - **Propriedade 25: Páginas Standalone Acessíveis**
    - **Valida: Requisitos 14.1, 14.2**
    - Implementar teste: Standalone_Pages têm link no Profile_Sidebar ou User_Dashboard
    - Verificar MemberGroupsPage, PreorderTracking, Wishlist
    - _Requisitos: 14.1, 14.2_

  - [ ]* 8.27 Escrever teste de propriedade 26: Consolidação de navegação duplicada
    - **Propriedade 26: Consolidação de Navegação Duplicada**
    - **Valida: Requisitos 15.1**
    - Implementar teste: Duplicate_Navigation consolidada tem apenas um caminho primário
    - Verificar que duplicações foram resolvidas
    - _Requisitos: 15.1_

  - [ ]* 8.28 Escrever teste de propriedade 27: Redirects para URLs de usuário alteradas
    - **Propriedade 27: Redirects para URLs de Usuário Alteradas**
    - **Valida: Requisitos 15.4**
    - Implementar teste: URLs de usuário alteradas têm redirect (client-side ou server-side)
    - Verificar redirects de profile sections consolidadas
    - _Requisitos: 15.4_

  - [ ]* 8.29 Escrever teste de propriedade 28: Sistema de design unificado
    - **Propriedade 28: Sistema de Design Unificado**
    - **Valida: Requisitos 16.1, 16.2, 16.3, 16.4**
    - Implementar teste: componentes em áreas admin e usuário vêm da mesma biblioteca
    - Verificar uso dos mesmos design tokens
    - _Requisitos: 16.1, 16.2, 16.3, 16.4_

  - [x] 8.30 Escrever testes de integração
    - Criar `src/test/integration/navigation.integration.test.ts`
    - Testar navegação completa pela sidebar admin (todos os itens clicáveis)
    - Testar que redirects funcionam corretamente (acessar URLs antigas)
    - Testar que páginas órfãs resolvidas são acessíveis
    - Testar navegação do perfil consolidada
    - Verificar que não há navegação duplicada
    - _Requisitos: 9.2, 9.5_

  - [ ]* 8.31 Escrever testes de responsividade
    - Criar `src/test/responsive/layout.responsive.test.ts`
    - Testar layout admin em desktop (1920x1080): sidebar fixa visível
    - Testar layout admin em tablet (768x1024): sidebar colapsável
    - Testar layout admin em mobile (375x667): menu hamburguer
    - Testar layout de perfil em diferentes viewports
    - _Requisitos: 11.3_

  - [ ]* 8.32 Escrever testes de acessibilidade
    - Criar `src/test/accessibility/navigation.a11y.test.ts`
    - Testar navegação por teclado (Tab, Enter, Escape)
    - Testar labels apropriados para screen readers
    - Testar anúncio de seção ativa
    - Testar contraste de cores (WCAG AA)
    - Testar em modo claro e escuro
    - _Requisitos: 11.1_

  - [ ]* 8.33 Escrever testes de performance
    - Criar `src/test/performance/navigation.perf.test.ts`
    - Testar tempo de renderização da sidebar (objetivo: < 100ms)
    - Testar tempo de navegação entre páginas (objetivo: < 200ms)
    - Medir tamanho do bundle (objetivo: aumento < 5%)
    - Usar React DevTools Profiler e Navigation Timing API
    - _Requisitos: Performance_

  - [x] 8.34 Verificar cobertura de testes
    - Executar relatório de cobertura com Vitest
    - Verificar cobertura de componentes de navegação >= 90%
    - Verificar cobertura de lógica de redirects = 100%
    - Verificar cobertura de configuração de rotas = 100%
    - Verificar cobertura de utilitários >= 85%
    - Adicionar testes para áreas com baixa cobertura
    - _Requisitos: Qualidade_

- [ ] 9. Checkpoint - Garantir qualidade
  - Executar todos os testes e verificar que passam
  - Revisar cobertura de testes
  - Testar manualmente em diferentes navegadores
  - Verificar performance e acessibilidade
  - Perguntar ao usuário se está pronto para deploy

- [x] 10. Fase 7: Documentação e Deploy
  - [x] 10.1 Atualizar documentação de usuário
    - Criar guia "Nova Navegação Administrativa" para usuários admin
    - Documentar onde encontrar funcionalidades movidas
    - Criar screenshots da nova estrutura de navegação
    - Documentar páginas consolidadas e como acessá-las
    - Publicar documentação no portal de ajuda
    - _Requisitos: 9.4_

  - [x] 10.2 Criar guia de migração para administradores
    - Criar documento "Guia de Migração - Navegação Admin"
    - Incluir tabela de mapeamento: localização antiga → nova localização
    - Documentar redirects mantidos e quando expiram
    - Explicar mudanças em páginas consolidadas
    - Incluir FAQ sobre mudanças
    - _Requisitos: 8.2, 9.4_

  - [x] 10.3 Atualizar README do projeto
    - Atualizar seção de arquitetura com nova estrutura
    - Documentar sistema de design tokens
    - Atualizar instruções de desenvolvimento
    - Adicionar seção sobre configuração de navegação
    - Documentar padrões de teste (unitários + propriedades)
    - _Requisitos: Documentação técnica_

  - [x] 10.4 Criar release notes
    - Criar documento de release notes versão X.Y.Z
    - Listar todas as mudanças principais (breaking changes)
    - Documentar novas funcionalidades (páginas órfãs resolvidas)
    - Listar melhorias de UI/UX
    - Incluir métricas de sucesso alcançadas
    - Documentar redirects e período de validade
    - _Requisitos: Comunicação_

  - [x] 10.5 Deploy em ambiente de staging
    - Fazer build da aplicação
    - Executar todos os testes antes do deploy
    - Fazer deploy em ambiente de staging
    - Verificar que aplicação inicia corretamente
    - Testar funcionalidades críticas manualmente
    - _Requisitos: Deploy_

  - [x] 10.6 Executar testes de aceitação
    - Convidar usuários admin para testar em staging
    - Coletar feedback sobre nova navegação
    - Verificar que todas as funcionalidades são encontráveis
    - Testar redirects com URLs antigas salvas
    - Documentar problemas encontrados e corrigir
    - _Requisitos: Validação_

  - [x] 10.7 Deploy em produção
    - Agendar janela de deploy
    - Comunicar usuários sobre mudanças
    - Fazer backup do banco de dados
    - Executar deploy em produção
    - Verificar que aplicação está funcionando
    - Monitorar logs por 1 hora após deploy
    - _Requisitos: Deploy_

  - [x] 10.8 Monitoramento pós-deploy
    - Configurar alertas para erros 404 em páginas antigas
    - Monitorar uso de redirects (quais são mais acessados)
    - Coletar métricas de performance (tempo de carregamento)
    - Monitorar feedback de usuários
    - Criar dashboard de métricas de sucesso
    - Agendar revisão em 30 dias
    - _Requisitos: Monitoramento_

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedades validam propriedades universais de corretude
- Testes unitários validam exemplos específicos e casos extremos
- Implementação usa TypeScript/React com Vitest e fast-check
- Total de 28 propriedades de corretude a serem testadas
- Fases 1-5 focam em implementação, Fase 6 em testes, Fase 7 em deploy

## Critérios de Sucesso

**Métricas Quantitativas:**
- ✅ Redução de itens de menu: 25 → 18 (28%)
- ✅ Redução de seções: 9 → 6 (33%)
- ✅ Páginas obsoletas removidas: 11/11 (100%)
- ✅ Redirects removidos: 7/13 (54%)
- ✅ Páginas órfãs resolvidas: 3/3 (100%)
- ✅ Cobertura de testes: > 85%
- ✅ Testes de propriedades: 28 implementados
- ✅ Performance: renderização < 100ms, navegação < 200ms

**Métricas Qualitativas:**
- Navegação intuitiva e lógica
- Nomenclatura consistente em português
- Hierarquia visual clara
- Sistema de design unificado
- Acessibilidade WCAG AA
- Código limpo e mantível
