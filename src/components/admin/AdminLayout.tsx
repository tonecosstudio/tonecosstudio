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
  Settings,
  CreditCard,
  Building2,
  Layers,
  DollarSign,
  Ticket,
  Clock,
  TrendingUp,
  BarChart3,
  HeadphonesIcon,
  Gauge,
  Wallet,
  Menu,
  X,
  History,
  CalendarClock,
  FolderKanban,
  MessageSquare,
  ShoppingCart,
  RefreshCw,
  Truck,
  FileSearch,
  Box,
  Grid,
  Tag,
  Coins,
  Gift,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { adminNavigationConfig } from "@/config/admin-navigation.config";

interface AdminLayoutProps {
  children: ReactNode;
}

// Mapeamento de nomes de ícones para componentes
const iconMap: Record<string, any> = {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  RefreshCw,
  Calendar: CalendarClock,
  Truck,
  Package,
  FileSearch,
  Upload,
  Layers,
  Box,
  Grid,
  DollarSign,
  CreditCard,
  TrendingUp,
  Tag,
  Users,
  MessageSquare,
  Settings,
  Coins,
  Gift,
  // Ícones adicionados para Sistema de Créditos
  Gauge,
  Wallet,
  BarChart3,
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {adminNavigationConfig.map((section) => (
        <div key={section.id}>
          {/* Section Label */}
          <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {section.title}
          </h3>

          {/* Section Items */}
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = iconMap[item.icon || 'Settings'];
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
                  {item.badge && (
                    <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
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
