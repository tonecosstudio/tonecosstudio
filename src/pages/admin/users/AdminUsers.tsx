import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  ShoppingCart,
  CreditCard,
  UserCheck,
  Download,
} from "lucide-react";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { ValidationFeedback } from "@/components/ui/validation-feedback";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { FORM_RATE_LIMITS } from "@/lib/security/sanitization-config";
import { useAdminUsersData } from "@/hooks/admin/useAdminUsersData";
import {
  usePromoteAdminUser,
  useRemoveAdminUserRole,
} from "@/hooks/admin/useAdminUserActions";
import {
  formatAdminAccessRoleLabel,
  hasAdminAccessRole,
  hasAnyAdminAccessRole,
  type AdminAccessRole,
} from "@/lib/permissions/adminRoles";
import { adminUserDetailsPath } from "@/config/routes";

function fmtDate(iso: string | null) {
  if (!iso) return "Ã¢â‚¬â€";
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

  // Sanitized input for email field
  const [emailRaw, setEmailRaw, emailSanitized] = useSanitizedInput(
    "",
    "email",
  );
  const [emailError, setEmailError] = useState<string>("");

  // Sanitized input for search field
  const [searchTermRaw, setSearchTermRaw, searchTermSanitized] =
    useSanitizedInput("", "search");

  const [activeTab, setActiveTab] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { usersQuery, allUsers, stats } = useAdminUsersData();
  const promoteAdminMutation = usePromoteAdminUser();
  const removeRoleMutation = useRemoveAdminUserRole();

  // FunÃƒÂ§ÃƒÂ£o para exportar usuÃƒÂ¡rios para CSV
  const exportToCSV = () => {
    const filtered = getFilteredUsers();
    const headers = [
      "ID",
      "Email",
      "Nome",
      "CPF",
      "Telefone",
      "WhatsApp",
      "Perfil %",
      "Roles",
      "Cadastro",
    ];
    const rows = filtered.map((u) => [
      u.id,
      u.email || "",
      u.profile?.full_name || "",
      u.profile?.cpf || "",
      u.profile?.phone || "",
      u.profile?.whatsapp || "",
      u.profile?.profile_completion || 0,
      u.roles.join(", ") || "user",
      new Date(u.created_at).toLocaleDateString("pt-BR"),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `usuarios_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Exportado",
      description: `${filtered.length} usuÃƒÂ¡rios exportados com sucesso.`,
    });
  };

  // Filtrar usuÃƒÂ¡rios por tipo
  const getFilteredUsers = () => {
    let filtered = allUsers;

    // Filtrar por tab
    if (activeTab === "subscribers" && stats) {
      filtered = filtered.filter((u) => stats.subscriberIds.has(u.id));
    } else if (activeTab === "buyers" && stats) {
      filtered = filtered.filter((u) => stats.buyerIds.has(u.id));
    } else if (activeTab === "admins") {
      filtered = filtered.filter((u) => hasAnyAdminAccessRole(u.roles));
    }

    // Filtrar por data
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      if (dateFilter !== "all") {
        filtered = filtered.filter((u) => new Date(u.created_at) >= filterDate);
      }
    }

    // Filtrar por completude do perfil
    if (profileFilter !== "all") {
      switch (profileFilter) {
        case "complete":
          filtered = filtered.filter(
            (u) => (u.profile?.profile_completion || 0) === 100,
          );
          break;
        case "incomplete":
          filtered = filtered.filter(
            (u) => (u.profile?.profile_completion || 0) < 100,
          );
          break;
        case "empty":
          filtered = filtered.filter(
            (u) => (u.profile?.profile_completion || 0) === 0,
          );
          break;
      }
    }

    // Filtrar por busca
    if (searchTermSanitized.trim()) {
      const term = searchTermSanitized.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(term) ||
          u.id.toLowerCase().includes(term) ||
          (u.profile?.full_name ?? "").toLowerCase().includes(term) ||
          (u.profile?.phone ?? "").toLowerCase().includes(term) ||
          (u.profile?.cpf ?? "").toLowerCase().includes(term),
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  // PaginaÃƒÂ§ÃƒÂ£o
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Resetar pÃƒÂ¡gina ao mudar filtros
  const handleFilterChange = () => {
    setCurrentPage(1);
    setSelectedUsers(new Set());
  };

  // SeleÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rios
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map((u) => u.id)));
    }
  };

  // Contar admins
  const adminCount = (usersQuery.data ?? []).filter((u) =>
    hasAnyAdminAccessRole(u.roles),
  ).length;
  const isLastAdmin = (roles: string[]) => {
    return hasAnyAdminAccessRole(roles) && adminCount === 1;
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const promote = async () => {
    // Validate email
    if (!emailSanitized.trim()) {
      setEmailError("Email ÃƒÂ© obrigatÃƒÂ³rio");
      return;
    }

    if (!validateEmail(emailSanitized)) {
      setEmailError("Formato de email invÃƒÂ¡lido");
      return;
    }

    // Check rate limit
    const rateLimitKey = `admin-user-promote:${emailSanitized}`;
    const rateLimit = checkRateLimit(
      rateLimitKey,
      FORM_RATE_LIMITS.adminUserUpdate,
    );

    if (!rateLimit.allowed) {
      toast({
        title: "Limite excedido",
        description: `Aguarde ${rateLimit.retryAfter}s antes de tentar novamente`,
        variant: "destructive",
      });
      return;
    }

    setEmailError("");

    try {
      await promoteAdminMutation.mutateAsync(emailSanitized);
      toast({
        title: "Sucesso",
        description: "UsuÃƒÂ¡rio promovido a administrador.",
      });
      setEmailRaw("");
      setEmailError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha", description: msg, variant: "destructive" });
    }
  };

  const removeRole = async (userId: string, role: AdminAccessRole) => {
    try {
      // Contar quantos admins existem
      if (hasAdminAccessRole(role)) {
        const adminCount = (usersQuery.data ?? []).filter((u) =>
          hasAnyAdminAccessRole(u.roles),
        ).length;

        if (adminCount <= 1) {
          toast({
            title: "OperaÃƒÂ§ÃƒÂ£o bloqueada",
            description:
              "NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel remover o ÃƒÂºltimo administrador do sistema. Promova outro usuÃƒÂ¡rio primeiro.",
            variant: "destructive",
          });
          return;
        }
      }

      await removeRoleMutation.mutateAsync({ userId, role });
      toast({ title: "Removido", description: `Role "${role}" removida.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha", description: msg, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="h-px w-20 bg-foreground mb-6" />
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-5xl font-bold tracking-tight">
            UsuÃƒÂ¡rios e permissÃƒÂµes
          </h1>
          <Badge
            variant="secondary"
            className="border border-border px-4 py-2 text-base"
          >
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "usuÃƒÂ¡rio" : "usuÃƒÂ¡rios"}
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground">
          Controle de acesso interno, perfis administrativos e visÃƒÂ£o
          consolidada da base de clientes.
        </p>
      </div>

      {/* Cards de EstatÃƒÂ­sticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de UsuÃƒÂ¡rios
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastrados no sistema
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes com assinatura
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalSubscribers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Com assinaturas ativas
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compradores</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBuyers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Com pedidos aprovados
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Administradores
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Com acesso admin
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Promover UsuÃƒÂ¡rio */}
        <Card className="border border-border bg-card shadow-premium h-fit">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-semibold">
              Conceder acesso administrativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail do usuÃƒÂ¡rio
              </Label>
              <Input
                id="email"
                type="email"
                value={emailRaw}
                onChange={(e) => {
                  setEmailRaw(e.target.value);
                  setEmailError("");
                }}
                placeholder="cliente@empresa.com"
                className="h-11 border-border"
              />
              <ValidationFeedback
                error={emailError}
                info={
                  emailRaw !== emailSanitized && emailRaw.length > 0
                    ? "Email foi sanitizado para seguranÃƒÂ§a"
                    : undefined
                }
              />
            </div>

            <Button
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium"
              onClick={promote}
              disabled={
                !emailSanitized.trim() || promoteAdminMutation.isPending
              }
            >
              {promoteAdminMutation.isPending
                ? "Atualizando acesso..."
                : "Conceder acesso admin"}
            </Button>

            <div className="rounded-sm border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Nota:</span> O
                usuÃƒÂ¡rio precisa ter criado uma conta antes de ser promovido.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lista de UsuÃƒÂ¡rios */}
        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="border-b border-border space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-xl font-semibold">
                UsuÃƒÂ¡rios
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={filteredUsers.length === 0}
                  className="w-full md:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>

            {/* Tabs de Filtro */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v);
                handleFilterChange();
              }}
            >
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
                <TabsTrigger value="all">Todos ({allUsers.length})</TabsTrigger>
                <TabsTrigger value="subscribers">
                  Com assinatura ({stats?.totalSubscribers || 0})
                </TabsTrigger>
                <TabsTrigger value="buyers">
                  Compradores ({stats?.totalBuyers || 0})
                </TabsTrigger>
                <TabsTrigger value="admins">
                  Administradores ({adminCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtros AvanÃƒÂ§ados */}
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome, email, telefone ou CPF..."
                  value={searchTermRaw}
                  onChange={(e) => {
                    setSearchTermRaw(e.target.value);
                    handleFilterChange();
                  }}
                  className="h-9"
                />
                {searchTermRaw !== searchTermSanitized &&
                  searchTermRaw.length > 0 && (
                    <ValidationFeedback
                      info="Caracteres especiais foram removidos da busca"
                      className="mt-1"
                    />
                  )}
              </div>
              <Select
                value={dateFilter}
                onValueChange={(v) => {
                  setDateFilter(v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="h-9 w-full md:w-[180px]">
                  <SelectValue placeholder="Data de cadastro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">ÃƒÅ¡ltima semana</SelectItem>
                  <SelectItem value="month">ÃƒÅ¡ltimo mÃƒÂªs</SelectItem>
                  <SelectItem value="year">ÃƒÅ¡ltimo ano</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={profileFilter}
                onValueChange={(v) => {
                  setProfileFilter(v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="h-9 w-full md:w-[180px]">
                  <SelectValue placeholder="Status do perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os perfis</SelectItem>
                  <SelectItem value="complete">Completos (100%)</SelectItem>
                  <SelectItem value="incomplete">Incompletos</SelectItem>
                  <SelectItem value="empty">Vazios (0%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AÃƒÂ§ÃƒÂµes em Massa */}
            {selectedUsers.size > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-3 md:flex-row md:items-center md:justify-between">
                <span className="text-sm font-medium">
                  {selectedUsers.size}{" "}
                  {selectedUsers.size === 1
                    ? "usuÃƒÂ¡rio selecionado"
                    : "usuÃƒÂ¡rios selecionados"}
                </span>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUsers(new Set())}
                    className="w-full md:w-auto"
                  >
                    Limpar seleÃƒÂ§ÃƒÂ£o
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full md:w-auto"
                    onClick={() => {
                      const selected = allUsers.filter((u) =>
                        selectedUsers.has(u.id),
                      );
                      const headers = [
                        "ID",
                        "Email",
                        "Nome",
                        "CPF",
                        "Telefone",
                      ];
                      const rows = selected.map((u) => [
                        u.id,
                        u.email || "",
                        u.profile?.full_name || "",
                        u.profile?.cpf || "",
                        u.profile?.phone || "",
                      ]);
                      const csv = [headers, ...rows]
                        .map((row) => row.map((cell) => `"${cell}"`).join(","))
                        .join("\n");
                      const blob = new Blob([csv], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = `usuarios_selecionados_${new Date().toISOString().split("T")[0]}.csv`;
                      link.click();
                      toast({
                        title: "Exportado",
                        description: `${selected.length} usuÃƒÂ¡rios exportados.`,
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar selecionados
                  </Button>
                </div>
              </div>
            )}

            {adminCount === 1 && (
              <div className="rounded-sm border border-amber-500/50 bg-amber-500/10 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">Atencao:</span> Existe apenas
                  1 administrador no sistema. Promova outro usuario antes de
                  remover permissoes de admin.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {usersQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando usuarios...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTermSanitized ||
                dateFilter !== "all" ||
                profileFilter !== "all"
                  ? "Nenhum usuÃƒÂ¡rio encontrado com os filtros aplicados."
                  : "Nenhum usuÃƒÂ¡rio cadastrado."}
              </div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {paginatedUsers.map((user) => {
                    const roles = user.roles || [];
                    const profile = user.profile;
                    const adminRoles = roles.filter(hasAdminAccessRole);

                    return (
                      <div
                        key={user.id}
                        className="rounded-sm border border-border bg-muted/20 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                            className="mt-1"
                          />

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="space-y-1">
                              <div className="truncate text-sm font-semibold">
                                {profile?.full_name ||
                                  user.email ||
                                  "UsuÃƒÂ¡rio sem nome"}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {user.email ?? "-"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID {user.id.slice(0, 8)}...
                              </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Contato
                                </div>
                                {profile?.phone ? (
                                  <div className="text-sm">
                                    Tel: {profile.phone}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    Sem telefone
                                  </div>
                                )}
                                {profile?.whatsapp && (
                                  <div className="text-xs text-muted-foreground">
                                    WhatsApp: {profile.whatsapp}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Perfil
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                                    <div
                                      className="h-1.5 rounded-full bg-primary transition-all"
                                      style={{
                                        width: `${profile?.profile_completion ?? 0}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {profile?.profile_completion ?? 0}%
                                  </span>
                                </div>
                                {profile?.cpf && (
                                  <div className="text-xs text-muted-foreground">
                                    {profile.cpf}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Acesso
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {roles.length === 0 ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    user
                                  </Badge>
                                ) : (
                                  roles.map((role) => (
                                    <Badge
                                      key={role}
                                      variant={
                                        hasAdminAccessRole(role) &&
                                        isLastAdmin(roles)
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {role}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 border-t border-border pt-3 md:flex-row md:items-center md:justify-between">
                              <div className="text-xs text-muted-foreground">
                                Cadastro em {fmtDate(user.created_at)}
                              </div>

                              <div className="flex flex-col gap-2 md:flex-row">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="w-full md:w-auto"
                                >
                                  <Link to={adminUserDetailsPath(user.id)}>
                                    Ver detalhes
                                  </Link>
                                </Button>

                                {adminRoles.map((role) => (
                                  <AlertDialog key={role}>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs md:w-auto"
                                        disabled={isLastAdmin(roles)}
                                        title={
                                          isLastAdmin(roles)
                                            ? "Nao e possivel remover o ultimo admin"
                                            : `Remover permissao de ${role}`
                                        }
                                      >
                                        Remover{" "}
                                        {formatAdminAccessRoleLabel(role)}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Remover permissao de {role}?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          O usuario{" "}
                                          <strong>{user.email}</strong> perdera
                                          acesso a area administrativa.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            removeRole(user.id, role)
                                          }
                                        >
                                          Confirmar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-hidden rounded-sm border border-border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedUsers.size === paginatedUsers.length &&
                              paginatedUsers.length > 0
                            }
                            onCheckedChange={toggleAllUsers}
                          />
                        </TableHead>
                        <TableHead className="font-semibold">
                          UsuÃƒÂ¡rio
                        </TableHead>
                        <TableHead className="font-semibold">Contato</TableHead>
                        <TableHead className="font-semibold">Perfil</TableHead>
                        <TableHead className="font-semibold">Roles</TableHead>
                        <TableHead className="font-semibold">
                          Cadastro
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          AÃƒÂ§ÃƒÂµes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((user) => {
                        const roles = user.roles || [];
                        const profile = user.profile;
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedUsers.has(user.id)}
                                onCheckedChange={() =>
                                  toggleUserSelection(user.id)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-1">
                                {profile?.full_name && (
                                  <span className="font-semibold">
                                    {profile.full_name}
                                  </span>
                                )}
                                <span className="text-sm">
                                  {user.email ?? "Ã¢â‚¬â€"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {user.id.slice(0, 8)}...
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {profile?.cpf && (
                                  <span className="text-sm font-mono">
                                    {profile.cpf}
                                  </span>
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
                                {!profile?.cpf &&
                                  !profile?.phone &&
                                  !profile?.whatsapp && (
                                    <span className="text-xs text-muted-foreground">
                                      Ã¢â‚¬â€
                                    </span>
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
                                        style={{
                                          width: `${profile.profile_completion}%`,
                                        }}
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
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    user
                                  </Badge>
                                ) : (
                                  roles.map((role) => (
                                    <Badge
                                      key={role}
                                      variant={
                                        hasAdminAccessRole(role) &&
                                        isLastAdmin(roles)
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {role}
                                      {hasAdminAccessRole(role) &&
                                        isLastAdmin(roles) &&
                                        " Ã°Å¸â€â€™"}
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
                                  <Link to={adminUserDetailsPath(user.id)}>
                                    Ver detalhes
                                  </Link>
                                </Button>
                                {roles
                                  .filter(hasAdminAccessRole)
                                  .map((role) => (
                                    <AlertDialog key={role}>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-xs"
                                          disabled={isLastAdmin(roles)}
                                          title={
                                            isLastAdmin(roles)
                                              ? "NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel remover o ÃƒÂºltimo admin"
                                              : `Remover permissÃƒÂ£o de ${role}`
                                          }
                                        >
                                          Remover{" "}
                                          {formatAdminAccessRoleLabel(role)}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Remover permissÃƒÂ£o de {role}?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            O usuario{" "}
                                            <strong>{user.email}</strong>{" "}
                                            perdera acesso a area
                                            administrativa.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Cancelar
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              removeRole(user.id, role)
                                            }
                                          >
                                            Confirmar
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* PaginaÃƒÂ§ÃƒÂ£o */}
                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredUsers.length,
                      )}{" "}
                      de {filteredUsers.length} usuÃƒÂ¡rios
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-9"
                              >
                                {pageNum}
                              </Button>
                            );
                          },
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        PrÃƒÂ³xima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
