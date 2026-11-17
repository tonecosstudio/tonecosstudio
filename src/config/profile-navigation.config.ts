import { PUBLIC_SUBSCRIPTIONS_ENABLED, profileSectionPath } from "./routes";

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

const baseProfileNavigation: ProfileSection[] = [
  {
    id: "account",
    title: "Conta",
    subSections: [
      {
        id: "info",
        label: "Dados da conta",
        path: profileSectionPath("info"),
        icon: "User",
      },
    ],
  },
  {
    id: "finance",
    title: "Financeiro",
    subSections: [
      {
        id: "payment",
        label: "Pagamentos",
        path: profileSectionPath("payment"),
        icon: "CreditCard",
      },
    ],
  },
  {
    id: "communication",
    title: "Atendimento",
    subSections: [
      {
        id: "notifications",
        label: "Notificacoes",
        path: profileSectionPath("notifications"),
        icon: "Bell",
      },
      {
        id: "support",
        label: "Suporte",
        path: profileSectionPath("support"),
        icon: "HelpCircle",
      },
    ],
  },
];

export const profileNavigationConfig: ProfileSection[] = PUBLIC_SUBSCRIPTIONS_ENABLED
  ? [
      ...baseProfileNavigation,
      {
        id: "subscriptions",
        title: "Assinaturas",
        subSections: [
          {
            id: "subscriptions",
            label: "Minha assinatura",
            path: profileSectionPath("subscriptions"),
            icon: "RefreshCw",
          },
        ],
      },
    ]
  : baseProfileNavigation;
