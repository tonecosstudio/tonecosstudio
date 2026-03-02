/**
 * Configuração de Navegação Admin
 * 
 * Define a estrutura hierárquica da sidebar administrativa.
 * Atualizado para refletir as consolidações de páginas em hubs.
 * 
 * Consolidações realizadas:
 * - Preços: 5 páginas → 1 hub (/admin/precos-gerenciar)
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
        path: '/admin',
        icon: 'LayoutDashboard',
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
        path: '/admin/catalogo',
        icon: 'Package',
        badge: 'Hub',
      },
      {
        id: 'upload',
        label: 'Upload Massivo',
        path: '/admin/upload',
        icon: 'Upload',
      },
      {
        id: 'conveyor',
        label: 'Modo Esteira',
        path: '/admin/esteira',
        icon: 'Layers',
      },
      {
        id: 'packaging',
        label: 'Embalagem',
        path: '/admin/embalagem',
        icon: 'Box',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operações',
    items: [
      {
        id: 'quotes',
        label: 'Orçamentos',
        path: '/admin/orcamentos',
        icon: 'FileText',
      },
      {
        id: 'orders',
        label: 'Pedidos',
        path: '/admin/pedidos',
        icon: 'ShoppingCart',
        badge: 'Novo',
      },
      {
        id: 'capacity',
        label: 'Gerenciar Capacidade',
        path: '/admin/capacidade',
        icon: 'Package',
      },
      {
        id: 'audit',
        label: 'Trilha de Auditoria',
        path: '/admin/auditoria',
        icon: 'FileSearch',
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
        path: '/admin/financeiro-hub',
        icon: 'DollarSign',
        badge: 'Hub',
      },
      {
        id: 'payments',
        label: 'Pagamentos',
        path: '/admin/pagamentos',
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
        path: '/admin/users',
        icon: 'Users',
      },
      {
        id: 'communication',
        label: 'Central de Comunicação',
        path: '/admin/comunicacao',
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
        label: 'Configurações do Sistema',
        path: '/admin/configuracoes',
        icon: 'Settings',
      },
      {
        id: 'holidays',
        label: 'Feriados',
        path: '/admin/feriados',
        icon: 'Calendar',
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
