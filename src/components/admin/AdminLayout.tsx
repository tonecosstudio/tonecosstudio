import { ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationCenter } from "@/components/admin/NotificationCenter";
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
  UsersRound,
  MessageSquare as MessageSquareIcon,
  Menu,
  X,
  History,
  CalendarClock,
  FolderKanban,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      label: "Vendas & Pagamentos",
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
        {
          id: "audit-trail",
          label: "Trilha de Auditoria",
          icon: History,
          path: "/admin/auditoria",
        },
      ],
    },
    {
      id: "production",
      label: "Produção & Ciclos",
      items: [
        {
          id: "cycle-dashboard",
          label: "Dashboard de Ciclos",
          icon: CalendarClock,
          path: "/admin/ciclos",
        },
        {
          id: "delivery-management",
          label: "Gerenciar Entregas",
          icon: Package,
          path: "/admin/entregas",
        },
        {
          id: "capacity-management",
          label: "Gerenciar Capacidade",
          icon: Gauge,
          path: "/admin/capacidade",
        },
        {
          id: "bonus-pieces",
          label: "Peças Bônus",
          icon: Package,
          path: "/admin/pecas-bonus",
        },
        {
          id: "collection-management",
          label: "Gerenciar Coleções",
          icon: FolderKanban,
          path: "/admin/gerenciar-colecoes",
        },
      ],
    },
    {
      id: "products",
      label: "Produtos & Catálogo",
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
          label: "Coleções & Personagens",
          icon: Layers,
          path: "/admin/colecoes",
        },
        {
          id: "packaging",
          label: "Embalagem",
          icon: Package,
          path: "/admin/embalagem",
        },
      ],
    },
    {
      id: "marketing",
      label: "Marketing & Planos",
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
          id: "payments",
          label: "Hub de Pagamentos",
          icon: Wallet,
          path: "/admin/pagamentos",
        },
      ],
    },
    {
      id: "communication",
      label: "Comunicação & Suporte",
      items: [
        {
          id: "communication",
          label: "Comunicação",
          icon: HeadphonesIcon,
          path: "/admin/comunicacao",
        },
      ],
    },
    {
      id: "users",
      label: "Usuários",
      items: [
        {
          id: "users",
          label: "Lista de Usuários",
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
          id: "settings",
          label: "Configurações",
          icon: Settings,
          path: "/admin/configuracoes",
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

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false); // Fecha sidebar no mobile após navegação
  };

  // Componente de navegação reutilizável
  const SidebarNav = () => (
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
                  onClick={() => handleNavigate(item.path)}
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
  );

  return (
    <div className="container py-4 sm:py-8 lg:py-12 max-w-7xl">
      {/* Mobile Header com Menu Hamburguer */}
      <div className="lg:hidden mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin</h1>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <ThemeToggle />
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-4 h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Menu</h2>
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <Separator className="mb-4" />
                <SidebarNav />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Layout com Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:block lg:w-64 flex-shrink-0">
          <Card className="sticky top-4">
            <CardContent className="p-4">
              {/* Theme Toggle & Notifications */}
              <div className="flex justify-end items-center gap-2 mb-4">
                <NotificationCenter />
                <ThemeToggle />
              </div>
              <Separator className="mb-4" />
              <SidebarNav />
            </CardContent>
          </Card>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
