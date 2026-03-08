import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminNavigationConfig } from "@/config/admin-navigation.config";
import { ScanlineOverlay } from "@/components/arcade/ArcadeLayout";

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
    setSidebarOpen(false);
  };

  // Sidebar nav arcade-styled
  const SidebarNav = () => (
    <nav className="space-y-5">
      {adminNavigationConfig.map((section) => (
        <div key={section.id}>
          <h3
            className="px-3 mb-2 text-[8px] tracking-[0.3em] uppercase text-[hsl(var(--gold-accent)/0.6)]"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            {section.title}
          </h3>

          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = iconMap[item.icon || "Settings"];
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-xs font-mono tracking-wider transition-all duration-200 border border-transparent",
                    active
                      ? "bg-[hsl(var(--gold-accent)/0.15)] text-[hsl(var(--gold-accent))] border-[hsl(var(--gold-accent)/0.3)]"
                      : "text-[hsl(0,0%,50%)] hover:text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,12%)]"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[8px] tracking-wider px-1.5 py-0.5 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent)/0.7)] uppercase">
                      {item.badge}
                    </span>
                  )}
                  {active && <ChevronRight className="ml-auto h-3 w-3 text-[hsl(var(--gold-accent)/0.5)]" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="dark min-h-screen bg-[hsl(0,0%,5%)] text-[hsl(0,0%,90%)] relative">
      <ScanlineOverlay />

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-12 border-b border-[hsl(var(--gold-accent)/0.15)] bg-[hsl(0,0%,5%)]/95 backdrop-blur-md">
        <h1
          className="text-[10px] tracking-[0.3em] uppercase text-[hsl(var(--gold-accent))]"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          ADMIN
        </h1>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[hsl(0,0%,55%)] hover:text-[hsl(var(--gold-accent))] transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-[hsl(0,0%,6%)] border-r border-[hsl(var(--gold-accent)/0.15)] p-4 pt-16 overflow-y-auto animate-fade-in">
            <SidebarNav />
          </div>
        </div>
      )}

      {/* Layout */}
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-[hsl(var(--gold-accent)/0.1)] bg-[hsl(0,0%,6%)]">
          <div className="p-4">
            {/* Admin header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[hsl(var(--gold-accent)/0.15)]">
              <h2
                className="text-[10px] tracking-[0.3em] uppercase text-[hsl(var(--gold-accent))]"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                COMMAND
              </h2>
              <NotificationCenter />
            </div>
            <SidebarNav />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
