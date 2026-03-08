/**
 * Configuração de Redirecionamentos
 * 
 * Define regras de redirecionamento para manter compatibilidade
 * com URLs antigas e favoritos dos usuários.
 */

export interface RedirectRule {
  from: string;
  to: string;
  permanent: boolean;
  reason: string;
}

/**
 * Redirecionamentos ativos para manter compatibilidade
 * com URLs em inglês que podem estar em favoritos ou documentação externa
 */
export const activeRedirects: RedirectRule[] = [
  {
    from: '/admin/quotes',
    to: '/admin/pedidos',
    permanent: false,
    reason: 'URL em inglês pode estar em emails/documentação',
  },
  {
    from: '/admin/orcamentos',
    to: '/admin/pedidos',
    permanent: false,
    reason: 'Orçamentos consolidados em Pedidos',
  },
  {
    from: '/admin/subscriptions',
    to: '/admin/pedidos?type=subscription',
    permanent: false,
    reason: 'Assinaturas consolidadas na página de Pedidos',
  },
  {
    from: '/admin/users-list',
    to: '/admin/users',
    permanent: false,
    reason: 'URL antiga pode estar em links externos',
  },
  {
    from: '/admin/financial-dashboard',
    to: '/admin/financeiro',
    permanent: false,
    reason: 'URL antiga pode estar em relatórios',
  },
  {
    from: '/admin/payment-hub',
    to: '/admin/pagamentos',
    permanent: false,
    reason: 'URL antiga pode estar em emails',
  },
  {
    from: '/admin/settings',
    to: '/admin/configuracoes',
    permanent: false,
    reason: 'URL em inglês pode estar em favoritos',
  },
  // Redirects de consolidação de páginas de preços
  {
    from: '/admin/pricing-tiers',
    to: '/admin/precos-gerenciar?tab=tiers',
    permanent: false,
    reason: 'Página consolidada em AdminPricingManagement',
  },
  {
    from: '/admin/plans',
    to: '/admin/precos-gerenciar?tab=tiers',
    permanent: false,
    reason: 'Página consolidada em AdminPricingManagement',
  },
  {
    from: '/admin/pricing-and-plans',
    to: '/admin/precos-gerenciar?tab=tiers',
    permanent: false,
    reason: 'Página consolidada em AdminPricingManagement',
  },
  {
    from: '/admin/pricing',
    to: '/admin/precos-gerenciar?tab=tiers',
    permanent: false,
    reason: 'Página consolidada em AdminPricingManagement',
  },
  // Redirects de consolidação de páginas de pagamentos
  {
    from: '/admin/chaves-pagamento',
    to: '/admin/pagamentos?tab=keys',
    permanent: false,
    reason: 'Página consolidada em AdminPaymentHub',
  },
  {
    from: '/admin/metodos-pagamento',
    to: '/admin/pagamentos?tab=methods',
    permanent: false,
    reason: 'Página consolidada em AdminPaymentHub',
  },
  {
    from: '/admin/calculadora',
    to: '/admin/pagamentos?tab=calculator',
    permanent: false,
    reason: 'Página consolidada em AdminPaymentHub',
  },
  {
    from: '/admin/verificacao-pagamentos',
    to: '/admin/pagamentos?tab=verification',
    permanent: false,
    reason: 'Página consolidada em AdminPaymentHub',
  },
  // Redirects de consolidação de páginas de catálogo/coleções
  {
    from: '/admin/colecoes',
    to: '/admin/catalogo?tab=collections',
    permanent: false,
    reason: 'Página consolidada em AdminCollectionsHub',
  },
  {
    from: '/admin/modelos',
    to: '/admin/catalogo?tab=models',
    permanent: false,
    reason: 'Página consolidada em AdminCollectionsHub',
  },
  {
    from: '/admin/franquias',
    to: '/admin/catalogo?tab=models',
    permanent: false,
    reason: 'Página consolidada em AdminCollectionsHub',
  },
  {
    from: '/admin/modelos-franquias',
    to: '/admin/catalogo?tab=models',
    permanent: false,
    reason: 'Página consolidada em AdminCollectionsHub',
  },
  {
    from: '/admin/financeiro',
    to: '/admin/catalogo?tab=financials',
    permanent: false,
    reason: 'Página consolidada em AdminCollectionsHub',
  },
  {
    from: '/admin/pre-vendas',
    to: '/admin/catalogo?tab=preorders',
    permanent: false,
    reason: 'Página consolidada em AdminCollectionsHub',
  },
  // Redirects de consolidação de páginas de comunicação
  {
    from: '/admin/notificacoes',
    to: '/admin/comunicacao?tab=notifications',
    permanent: false,
    reason: 'Página consolidada em AdminCommunication',
  },
  {
    from: '/admin/notificacoes/historico',
    to: '/admin/comunicacao?tab=history',
    permanent: false,
    reason: 'Página consolidada em AdminCommunication',
  },
];

/**
 * Redirecionamentos obsoletos que devem ser removidos
 * Apontam para páginas que foram consolidadas há mais de 6 meses
 */
export const deprecatedRedirects: string[] = [
  '/admin/old-quotes',
  '/admin/legacy-preorders',
  '/admin/deprecated-analytics',
  '/admin/old-collections',
  '/admin/legacy-upload',
  '/admin/old-coupons',
  '/admin/legacy-communication',
];

/**
 * Encontra um redirecionamento para um path específico
 */
export function findRedirect(path: string): RedirectRule | undefined {
  return activeRedirects.find(redirect => redirect.from === path);
}

/**
 * Verifica se um path é um redirecionamento obsoleto
 */
export function isDeprecatedRedirect(path: string): boolean {
  return deprecatedRedirects.includes(path);
}

/**
 * Retorna todos os paths de origem dos redirecionamentos ativos
 */
export function getAllRedirectSources(): string[] {
  return activeRedirects.map(redirect => redirect.from);
}

/**
 * Retorna todos os paths de destino dos redirecionamentos ativos
 */
export function getAllRedirectTargets(): string[] {
  return activeRedirects.map(redirect => redirect.to);
}
