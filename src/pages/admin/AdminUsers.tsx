import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, ShoppingCart, CreditCard, UserCheck, Search } from "lucide-react";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed_at: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    whatsapp: string | null;
    cpf: string | null;
    profile_completion: number | null;
  } | null;
  roles: string[];
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Buscar todos os profiles (cada profile = 1 usuário)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar roles de todos os usuários
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Mapear roles por user_id
      const rolesMap = new Map<string, string[]>();
      (rolesData || []).forEach((r) => {
        const roles = rolesMap.get(r.user_id) || [];
        roles.push(r.role);
        rolesMap.set(r.user_id, roles);
      });

      // Combinar dados
      return (profilesData || []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        created_at: profile.created_at,
        last_sign_in_at: profile.updated_at,
        confirmed_at: null,
        email_confirmed_at: null,
        phone: profile.phone,
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          phone: profile.phone,
          whatsapp: profile.whatsapp,
          cpf: profile.cpf,
          profile_completion: profile.profile_completion,
        },
        roles: rolesMap.get(profile.id) || [],
      })) as UserRow[];
    },
  });

  // Buscar estatísticas de assinaturas e pedidos
  const statsQuery = useQuery({
    queryKey: ["admin-users-stats"],
    queryFn: async () => {
      // Buscar assinantes ativos
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("user_id, status")
        .eq("status", "active");

      // Buscar usuários com pedidos
      const { data: payments } = await supabase
        .from("manual_payments")
        .select("user_id")
        .eq("status", "approved");

      const subscriberIds = new Set((subscriptions || []).map((s) => s.user_id));
      const buyerIds = new Set((payments || []).map((p) => p.user_id));

      return {
        subscriberIds,
        buyerIds,
        totalSubscribers: subscriberIds.size,
        totalBuyers: buyerIds.size,
      };
    },
  });

  const allUsers = usersQuery.data ?? [];
  const stats = statsQuery.data;

  // Filtrar usuários por tipo
  const getFilteredUsers = () => {
    let filtered = allUsers;

    // Filtrar por tab
    if (activeTab === "subscribers" && stats) {
      filtered = filtered.filter((u) => stats.subscriberIds.has(u.id));
    } else if (activeTab === "buyers" && stats) {
      filtered = filtered.filter((u) => stats.buyerIds.has(u.id));
    } else if (activeTab === "admins") {
      filtered = filtered.filter((u) => u.roles.includes("admin"));
    }

    // Filtrar por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(term) ||
          u.id.toLowerCase().includes(term) ||
          (u.profile?.full_name ?? "").toLowerCase().includes(term) ||
          (u.profile?.phone ?? "").toLowerCase().includes(term) ||
          (u.profile?.cpf ?? "").toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  // Contar admins
  const adminCount = (usersQuery.data ?? []).filter((u) => u.roles.includes("admin")).length;
  const isLastAdmin = (userId: string, roles: string[]) => {
    return roles.includes("admin") && adminCount === 1;
  };

  const promote = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-promote", {
        body: { email: email.trim().toLowerCase(), role: "admin" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Falha ao promover");
      toast({ title: "Sucesso", description: "Usuário promovido a administrador." });
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const removeRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    try {
      // Contar quantos admins existem
      if (role === "admin") {
        const adminCount = (usersQuery.data ?? []).filter((u) => u.roles.includes("admin")).length;

        if (adminCount <= 1) {
          toast({
            title: "Operação bloqueada",
            description:
              "Não é possível remover o último administrador do sistema. Promova outro usuário primeiro.",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
      toast({ title: "Removido", description: `Role "${role}" removida.` });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha", description: msg, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-12">
        <div className="h-px w-20 bg-foreground mb-6" />
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-5xl font-bold tracking-tight">Gerenciar Usuários</h1>
          <Badge variant="secondary" className="border border-border px-4 py-2 text-base">
            {filteredUsers.length} {filteredUsers.length === 1 ? "usuário" : "usuários"}
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground">
          Controle de acesso do sistema Ordax (usuários e permissões).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Promover Usuário */}
        <Card className="border border-border bg-card shadow-premium h-fit">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-semibold">Promover Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail do usuário
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                className="h-11 border-border"
              />
            </div>

            <Button
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium"
              onClick={promote}
              disabled={!email.trim() || isLoading}
            >
              {isLoading ? "Promovendo…" : "Promover a Admin"}
            </Button>

            <div className="rounded-sm border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Nota:</span> O usuário precisa ter
                criado uma conta antes de ser promovido.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-xl font-semibold">Todos os Usuários</CardTitle>
              <Input
                placeholder="Buscar por nome, email, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md h-9"
              />
            </div>
            {adminCount === 1 && (
              <div className="mt-4 rounded-sm border border-amber-500/50 bg-amber-500/10 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ <span className="font-semibold">Atenção:</span> Existe apenas 1 administrador
                  no sistema. Promova outro usuário antes de remover permissões de admin.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {usersQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando usuários…</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado."}
              </div>
            ) : (
              <div className="rounded-sm border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Usuário</TableHead>
                      <TableHead className="font-semibold">Contato</TableHead>
                      <TableHead className="font-semibold">Perfil</TableHead>
                      <TableHead className="font-semibold">Roles</TableHead>
                      <TableHead className="font-semibold">Cadastro</TableHead>
                      <TableHead className="font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const roles = user.roles || [];
                      const profile = user.profile;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              {profile?.full_name && (
                                <span className="font-semibold">{profile.full_name}</span>
                              )}
                              <span className="text-sm">{user.email ?? "—"}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.id.slice(0, 8)}...
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {profile?.cpf && (
                                <span className="text-sm font-mono">{profile.cpf}</span>
                              )}
                              {profile?.phone && (
                                <span className="text-xs text-muted-foreground">
                                  Tel: {profile.phone}
                                </span>
                              )}
                              {profile?.whatsapp && (
                                <span className="text-xs text-muted-foreground">
                                  WhatsApp: {profile.whatsapp}
                                </span>
                              )}
                              {!profile?.cpf && !profile?.phone && !profile?.whatsapp && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {profile?.profile_completion !== undefined && (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-muted rounded-full h-1.5">
                                    <div
                                      className="bg-primary h-1.5 rounded-full transition-all"
                                      style={{ width: `${profile.profile_completion}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {profile.profile_completion}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {roles.length === 0 ? (
                                <Badge variant="secondary" className="text-xs">
                                  user
                                </Badge>
                              ) : (
                                roles.map((role) => (
                                  <Badge
                                    key={role}
                                    variant={
                                      role === "admin" && isLastAdmin(user.id, roles)
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {role}
                                    {role === "admin" && isLastAdmin(user.id, roles) && " 🔒"}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fmtDate(user.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/admin/users/${user.id}`}>Ver Detalhes</Link>
                              </Button>
                              {roles.includes("admin") && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      disabled={isLastAdmin(user.id, roles)}
                                      title={
                                        isLastAdmin(user.id, roles)
                                          ? "Não é possível remover o último admin"
                                          : "Remover permissão de admin"
                                      }
                                    >
                                      Remover Admin
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Remover permissão de admin?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        O usuário <strong>{user.email}</strong> perderá acesso à
                                        área administrativa.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => removeRole(user.id, "admin")}
                                      >
                                        Confirmar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
