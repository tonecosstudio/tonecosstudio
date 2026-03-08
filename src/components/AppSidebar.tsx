import {
  Home,
  BookOpen,
  Layers,
  CreditCard,
  Flame,
  Info,
  Mail,
  ShieldCheck,
  LogIn,
  LogOut,
  User,
  Bell,
  Coins,
  LayoutDashboard,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Início", url: "/", icon: Home },
  { title: "Catálogo", url: "/catalogo", icon: BookOpen },
  { title: "Coleções", url: "/colecoes", icon: Layers },
  { title: "Planos", url: "/planos", icon: CreditCard },
  { title: "🔥 Voucher R$100", url: "/pre-lancamento", icon: Flame },
];

const infoNav = [
  { title: "Sobre", url: "/sobre", icon: Info },
  { title: "Contato", url: "/contato", icon: Mail },
];

const userNav = [
  { title: "Perfil", url: "/perfil", icon: User },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Coins", url: "/coins/purchase", icon: Coins },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarContent className="bg-sidebar">
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase text-sidebar-foreground/50">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* User navigation (when logged in) */}
        {user && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase text-sidebar-foreground/50">
                Minha Conta
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {userNav.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <NavLink
                          to={item.url}
                          className="hover:bg-sidebar-accent/50"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />
          </>
        )}

        {/* Info */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase text-sidebar-foreground/50">
            Informações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {infoNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase text-destructive/70">
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname.startsWith("/admin")}
                      tooltip="Painel Admin"
                    >
                      <NavLink
                        to="/admin"
                        className="hover:bg-destructive/10 text-destructive/80"
                        activeClassName="bg-destructive/15 text-destructive font-medium"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {!collapsed && <span>Painel Admin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer: Auth */}
      <SidebarFooter className="border-t border-border/40 bg-sidebar">
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/");
            }}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => navigate("/login")}
          >
            <LogIn className="h-4 w-4" />
            {!collapsed && <span>Entrar</span>}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
