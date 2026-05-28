import { ADMIN_ROUTES } from "./routes";

/**
 * Configuração de Navegação Admin
 * 
 * Define a estrutura hierárquica da sidebar administrativa.
 * Atualizado para refletir as consolidações de páginas em hubs.
 * 
 * Consolidações realizadas:
 * - Preços: 5 páginas → 1 hub (/admin/creditos?tab=plans)
 * - Pagamentos: 5 páginas → 1 hub (/admin/pagamentos)
 * - Catálogo: 6 páginas → 1 hub (/admin/catalogo)
 */

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  badge?: string;
  permissions?: string[];
}

export interface NavigationSection {
  id: string;
  title: string;
  items: NavigationItem[];
  permissions?: string[];
}

export const adminNavigationConfig: NavigationSection[] = [
  {
    id: 'dashboard',
    title: 'Visão Geral',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: ADMIN_ROUTES.home,
        icon: 'LayoutDashboard',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        path: ADMIN_ROUTES.analytics,
        icon: 'BarChart3',
      },
    ],
  },
  {
    id: 'catalog',
    title: 'Catálogo & Produtos',
    items: [
      {
        id: 'catalog-hub',
        label: 'Catálogo & Produtos',
        path: ADMIN_ROUTES.catalog,
        icon: 'Package',
        badge: 'Hub',
      },
      {
        id: 'packaging',
        label: 'Embalagem',
        path: ADMIN_ROUTES.packaging,
        icon: 'Box',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operações',
    items: [
      {
        id: 'orders',
        label: 'Pedidos',
        path: ADMIN_ROUTES.orders,
        icon: 'ShoppingCart',
        badge: 'Novo',
      },
      {
        id: 'audit',
        label: 'Trilha de Auditoria',
        path: ADMIN_ROUTES.audit,
        icon: 'FileSearch',
      },
    ],
  },
  {
    id: 'credits',
    title: 'Sistema de Créditos',
    items: [
      {
        id: 'credits-hub',
        label: 'Créditos',
        path: ADMIN_ROUTES.credits,
        icon: 'Coins',
        badge: 'Hub',
      },
    ],
  },
  {
    id: 'production',
    title: 'Produção',
    items: [
      {
        id: 'production-dashboard',
        label: 'Hub de Produção',
        path: ADMIN_ROUTES.production,
        icon: 'Grid',
        badge: 'Hub',
      },
    ],
  },
  {
    id: 'financial',
    title: 'Financeiro',
    items: [
      {
        id: 'financial-hub',
        label: 'Relatórios Financeiros',
        path: ADMIN_ROUTES.financialHub,
        icon: 'DollarSign',
        badge: 'Hub',
      },
      {
        id: 'payments',
        label: 'Pagamentos',
        path: ADMIN_ROUTES.payments,
        icon: 'CreditCard',
        badge: 'Hub',
      },
    ],
  },
  {
    id: 'users',
    title: 'Usuários & Comunicação',
    items: [
      {
        id: 'users',
        label: 'Gerenciar Usuários',
        path: ADMIN_ROUTES.users,
        icon: 'Users',
      },
      {
        id: 'communication',
        label: 'Central de Comunicação',
        path: ADMIN_ROUTES.communication,
        icon: 'MessageSquare',
        badge: 'Hub',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Configurações',
    items: [
      {
        id: 'system',
        label: 'Configurações',
        path: ADMIN_ROUTES.settings,
        icon: 'Settings',
        badge: 'Hub',
      },
    ],
  },
];

/**
 * Retorna todos os itens de navegação em uma lista plana
 */
export function getAllNavigationItems(): NavigationItem[] {
  return adminNavigationConfig.flatMap(section => section.items);
}

/**
 * Encontra um item de navegação pelo path
 */
export function findNavigationItemByPath(path: string): NavigationItem | undefined {
  return getAllNavigationItems().find(item => item.path === path);
}

/**
 * Retorna a seção que contém um determinado path
 */
export function findSectionByPath(path: string): NavigationSection | undefined {
  return adminNavigationConfig.find(section =>
    section.items.some(item => item.path === path)
  );
}
