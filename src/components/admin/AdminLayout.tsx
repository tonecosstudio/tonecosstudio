import { ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  FileText, 
  Upload, 
  Workflow, 
  MessageSquare,
  Settings,
  CreditCard,
  Gift,
  Building2,
  Layers,
  DollarSign,
  Ticket,
  Clock,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Megaphone,
  HeadphonesIcon,
  Calculator,
  Gauge,
  Wallet,
  UsersRound
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuSections: MenuSection[] = [
    {
      id: "overview",
      label: "Visão Geral",
      items: [
        {
          id: "home",
          label: "Dashboard",
          icon: LayoutDashboard,
          path: "/admin",
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: BarChart3,
          path: "/admin/analytics",
        },
      ],
    },
    {
      id: "sales",
      label: "Vendas",
      items: [
        {
          id: "quotes",
          label: "Orçamentos",
          icon: FileText,
          path: "/admin/orcamentos",
        },
        {
          id: "preorders",
          label: "Pré-vendas",
          icon: Clock,
          path: "/admin/pre-vendas",
        },
        {
          id: "subscriptions",
          label: "Assinaturas",
          icon: CreditCard,
          path: "/admin/assinaturas",
        },
      ],
    },
    {
      id: "products",
      label: "Produtos",
      items: [
        {
          id: "upload",
          label: "Upload Massivo",
          icon: Upload,
          path: "/admin/upload",
        },
        {
          id: "conveyor",
          label: "Modo Esteira",
          icon: Workflow,
          path: "/admin/esteira",
        },
        {
          id: "models",
          label: "Modelos",
          icon: Package,
          path: "/admin/modelos",
        },
        {
          id: "franchises",
          label: "Franquias",
          icon: Building2,
          path: "/admin/franquias",
        },
        {
          id: "collections",
          label: "Coleções",
          icon: Layers,
          path: "/admin/colecoes",
        },
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      items: [
        {
          id: "plans",
          label: "Planos",
          icon: DollarSign,
          path: "/admin/planos",
        },
        {
          id: "coupons",
          label: "Cupons",
          icon: Ticket,
          path: "/admin/cupons",
        },
        {
          id: "calculator",
          label: "Calculadora",
          icon: Calculator,
          path: "/admin/calculadora",
        },
      ],
    },
    {
      id: "financial",
      label: "Financeiro",
      items: [
        {
          id: "pricing",
          label: "Preços",
          icon: DollarSign,
          path: "/admin/precos",
        },
        {
          id: "financials",
          label: "Análise Financeira",
          icon: TrendingUp,
          path: "/admin/financeiro",
        },
        {
          id: "payment-methods",
          label: "Métodos de Pagamento",
          icon: Wallet,
          path: "/admin/metodos-pagamento",
        },
      ],
    },
    {
      id: "support",
      label: "Suporte",
      items: [
        {
          id: "support",
          label: "Tickets",
          icon: HeadphonesIcon,
          path: "/admin/suporte",
        },
        {
          id: "groups",
          label: "Grupos",
          icon: UsersRound,
          path: "/admin/grupos",
        },
        {
          id: "users",
          label: "Usuários",
          icon: Users,
          path: "/admin/users",
        },
      ],
    },
    {
      id: "settings",
      label: "Configurações",
      items: [
        {
          id: "production-limit",
          label: "Limite de Produção",
          icon: Gauge,
          path: "/admin/limite-producao",
        },
        {
          id: "templates",
          label: "Templates",
          icon: Settings,
          path: "/admin/templates-comunicacao",
        },
        {
          id: "legal",
          label: "Conformidade",
          icon: Settings,
          path: "/admin/conformidade-legal",
        },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="container py-8 sm:py-12 max-w-7xl">
      {/* Layout com Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <Card className="sticky top-4">
            <CardContent className="p-4">
              <nav className="space-y-6">
                {menuSections.map((section) => (
                  <div key={section.id}>
                    {/* Section Label */}
                    <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.label}
                    </h3>
                    
                    {/* Section Items */}
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
