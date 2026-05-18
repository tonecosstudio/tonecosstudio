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
import { usePromoteAdminUser, useRemoveAdminUserRole } from "@/hooks/admin/useAdminUserActions";

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

  // Sanitized input for email field
  const [emailRaw, setEmailRaw, emailSanitized] = useSanitizedInput("", "email");
  const [emailError, setEmailError] = useState<string>("");

  // Sanitized input for search field
  const [searchTermRaw, setSearchTermRaw, searchTermSanitized] = useSanitizedInput("", "search");

  const [activeTab, setActiveTab] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { usersQuery, allUsers, stats } = useAdminUsersData();
  const promoteAdminMutation = usePromoteAdminUser();
  const removeRoleMutation = useRemoveAdminUserRole();

  // Função para exportar usuários para CSV
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
      description: `${filtered.length} usuários exportados com sucesso.`,
    });
  };

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
          filtered = filtered.filter((u) => (u.profile?.profile_completion || 0) === 100);
          break;
        case "incomplete":
          filtered = filtered.filter((u) => (u.profile?.profile_completion || 0) < 100);
          break;
        case "empty":
          filtered = filtered.filter((u) => (u.profile?.profile_completion || 0) === 0);
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
          (u.profile?.cpf ?? "").toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Resetar página ao mudar filtros
  const handleFilterChange = () => {
    setCurrentPage(1);
    setSelectedUsers(new Set());
  };

  // Seleção de usuários
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
  const adminCount = (usersQuery.data ?? []).filter((u) => u.roles.includes("admin")).length;
  const isLastAdmin = (userId: string, roles: string[]) => {
    return roles.includes("admin") && adminCount === 1;
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const promote = async () => {
    // Validate email
    if (!emailSanitized.trim()) {
      setEmailError("Email é obrigatório");
      return;
    }

    if (!validateEmail(emailSanitized)) {
      setEmailError("Formato de email inválido");
      return;
    }

    // Check rate limit
    const rateLimitKey = `admin-user-promote:${emailSanitized}`;
    const rateLimit = checkRateLimit(rateLimitKey, FORM_RATE_LIMITS.adminUserUpdate);

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
      toast({ title: "Sucesso", description: "Usuário promovido a administrador." });
      setEmailRaw("");
      setEmailError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha", description: msg, variant: "destructive" });
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

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinantes Ativos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSubscribers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Com assinaturas ativas</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compradores</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBuyers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Com pedidos aprovados</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Com acesso admin</p>
          </CardContent>
        </Card>
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
                info={emailRaw !== emailSanitized && emailRaw.length > 0 ? "Email foi sanitizado para segurança" : undefined}
              />
            </div>

            <Button
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium"
              onClick={promote}
              disabled={!emailSanitized.trim() || promoteAdminMutation.isPending}
            >
              {promoteAdminMutation.isPending ? "Promovendo…" : "Promover a Admin"}
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
          <CardHeader className="border-b border-border space-y-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-xl font-semibold">Usuários</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={filteredUsers.length === 0}
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Todos ({allUsers.length})</TabsTrigger>
                <TabsTrigger value="subscribers">
                  Assinantes ({stats?.totalSubscribers || 0})
                </TabsTrigger>
                <TabsTrigger value="buyers">Compradores ({stats?.totalBuyers || 0})</TabsTrigger>
                <TabsTrigger value="admins">Admins ({adminCount})</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtros Avançados */}
            <div className="flex flex-col sm:flex-row gap-3">
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
                {searchTermRaw !== searchTermSanitized && searchTermRaw.length > 0 && (
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
                <SelectTrigger className="w-full sm:w-[180px] h-9">
                  <SelectValue placeholder="Data de cadastro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="year">Último ano</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={profileFilter}
                onValueChange={(v) => {
                  setProfileFilter(v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-9">
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

            {/* Ações em Massa */}
            {selectedUsers.size > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <span className="text-sm font-medium">
                  {selectedUsers.size}{" "}
                  {selectedUsers.size === 1 ? "usuário selecionado" : "usuários selecionados"}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedUsers(new Set())}>
                    Limpar seleção
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selected = allUsers.filter((u) => selectedUsers.has(u.id));
                      const headers = ["ID", "Email", "Nome", "CPF", "Telefone"];
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
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = `usuarios_selecionados_${new Date().toISOString().split("T")[0]}.csv`;
                      link.click();
                      toast({
                        title: "Exportado",
                        description: `${selected.length} usuários exportados.`,
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
                {searchTermSanitized || dateFilter !== "all" || profileFilter !== "all"
                  ? "Nenhum usuário encontrado com os filtros aplicados."
                  : "Nenhum usuário cadastrado."}
              </div>
            ) : (
              <>
                <div className="rounded-sm border border-border overflow-hidden">
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
                        <TableHead className="font-semibold">Usuário</TableHead>
                        <TableHead className="font-semibold">Contato</TableHead>
                        <TableHead className="font-semibold">Perfil</TableHead>
                        <TableHead className="font-semibold">Roles</TableHead>
                        <TableHead className="font-semibold">Cadastro</TableHead>
                        <TableHead className="font-semibold text-right">Ações</TableHead>
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
                                onCheckedChange={() => toggleUserSelection(user.id)}
                              />
                            </TableCell>
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

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                      {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de{" "}
                      {filteredUsers.length} usuários
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-9"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
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
