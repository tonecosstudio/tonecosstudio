/**
 * Configuração de Navegação do Perfil do Usuário
 * 
 * Define a estrutura hierárquica das seções do perfil
 * com 5 seções principais consolidadas.
 */

export interface ProfileSubSection {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

export interface ProfileSection {
  id: string;
  title: string;
  subSections: ProfileSubSection[];
}

export const profileNavigationConfig: ProfileSection[] = [
  {
    id: 'account',
    title: 'Minha Conta',
    subSections: [
      {
        id: 'info',
        label: 'Informações Básicas',
        path: '/profile/info',
        icon: 'User',
      },
      {
        id: 'collector',
        label: 'Perfil Público',
        path: '/profile/collector',
        icon: 'Star',
      },
      {
        id: 'notifications',
        label: 'Notificações',
        path: '/profile/notifications',
        icon: 'Bell',
      },
    ],
  },
  {
    id: 'preferences',
    title: 'Preferências & Coleção',
    subSections: [
      {
        id: 'preferences',
        label: 'Preferências de Produtos',
        path: '/profile/preferences',
        icon: 'Settings',
      },
      {
        id: 'collection',
        label: 'Minha Coleção',
        path: '/profile/collection',
        icon: 'Grid',
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Endereço & Pagamento',
    subSections: [
      {
        id: 'address',
        label: 'Endereço de Entrega',
        path: '/profile/address',
        icon: 'MapPin',
      },
      {
        id: 'payment',
        label: 'Métodos de Pagamento',
        path: '/profile/payment',
        icon: 'CreditCard',
      },
    ],
  },
  {
    id: 'orders',
    title: 'Pedidos & Assinaturas',
    subSections: [
      {
        id: 'orders',
        label: 'Meus Pedidos',
        path: '/profile/orders',
        icon: 'ShoppingBag',
      },
      {
        id: 'subscriptions',
        label: 'Minhas Assinaturas',
        path: '/profile/subscriptions',
        icon: 'RefreshCw',
      },
    ],
  },
  {
    id: 'support',
    title: 'Suporte',
    subSections: [
      {
        id: 'support',
        label: 'Central de Ajuda',
        path: '/profile/support',
        icon: 'HelpCircle',
      },
    ],
  },
];

/**
 * Retorna todas as sub-seções em uma lista plana
 */
export function getAllProfileSubSections(): ProfileSubSection[] {
  return profileNavigationConfig.flatMap(section => section.subSections);
}

/**
 * Encontra uma sub-seção pelo path
 */
export function findProfileSubSectionByPath(path: string): ProfileSubSection | undefined {
  return getAllProfileSubSections().find(subSection => subSection.path === path);
}

/**
 * Retorna a seção que contém um determinado path
 */
export function findProfileSectionByPath(path: string): ProfileSection | undefined {
  return profileNavigationConfig.find(section =>
    section.subSections.some(subSection => subSection.path === path)
  );
}

/**
 * Mapeia IDs antigos para novos paths (para migração)
 */
export const legacyProfilePathMapping: Record<string, string> = {
  'personal': '/profile/info',
  'info': '/profile/info',
  'collector': '/profile/collector',
  'notifications': '/profile/notifications',
  'preferences': '/profile/preferences',
  'collection': '/profile/collection',
  'address': '/profile/address',
  'payment': '/profile/payment',
  'orders': '/profile/orders',
  'subscriptions': '/profile/subscriptions',
  'support': '/profile/support',
};
