import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  ExternalLink,
  FileText,
  MessageSquare,
  Package,
  Plus,
  Search,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useActiveProfileSubscription,
  useProfilePaymentMethods,
  useProfileSupport,
} from "@/hooks/customer/useProfileSectionsData";
import { loadSubscriptionCatalogModels } from "@/services/subscriptions/subscription-catalog-service";
import { listPaymentsByUser } from "@/lib/payment-service";
import {
  PUBLIC_COLLECTIONS_ENABLED,
  PUBLIC_ROUTES,
  paymentDetailsPath,
  profileSectionPath,
} from "@/config/routes";
import type { PaymentFilters, PaymentStatus } from "@/types/manual-payment";

type SaveMutationLike = {
  mutate: () => void;
  isPending: boolean;
};

interface PersonalDataSectionProps {
  profileQuery?: unknown;
  fullName: string;
  setFullName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  whatsapp: string;
  setWhatsapp: (value: string) => void;
  cpf: string;
  setCpf: (value: string) => void;
  birthDate: string;
  setBirthDate: (value: string) => void;
  saveMutation: SaveMutationLike;
}

interface NotificationsSectionProps {
  emailNotifications: boolean;
  setEmailNotifications: (value: boolean) => void;
  orderUpdates: boolean;
  setOrderUpdates: (value: boolean) => void;
  marketingEmails: boolean;
  setMarketingEmails: (value: boolean) => void;
  saveMutation: SaveMutationLike;
}

export const PROFILE_COLLECTIONS_ENABLED =
  PUBLIC_COLLECTIONS_ENABLED ||
  (import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true" &&
    import.meta.env.VITE_PREVIEW_READ_ONLY === "false" &&
    import.meta.env.VITE_PUBLIC_CATALOG_MVP !== "true");

const profileCardClassName = "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none";
const profilePanelClassName = "rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.03]";
const profileDashedPanelClassName =
  "rounded-lg border border-dashed border-[hsl(0,0%,18%)] bg-white/[0.02]";
const profileSkeletonClassName =
  "animate-pulse rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.08]";
const profileInputClassName =
  "border-[hsl(0,0%,16%)] bg-[hsl(0,0%,8%)] text-white placeholder:text-zinc-500";
const profileMutedTextClassName = "text-zinc-400";
const profileTinyMutedTextClassName = "text-xs text-zinc-500";
const profileOutlineButtonClassName =
  "border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]";
const profilePrimaryButtonClassName =
  "bg-[hsl(var(--gold-accent))] text-black hover:bg-[hsl(var(--gold-accent)/0.9)]";

function formatCpf(value: string) {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return value;
}

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }
  return value;
}

function getPlanLabel(planType: string | null) {
  switch (planType) {
    case "trimestral":
      return "Trimestral (3 meses)";
    case "semestral":
      return "Semestral (6 meses)";
    case "anual":
      return "Anual (12 meses)";
    default:
      return "Plano ativo";
  }
}

function getPaymentMethodLabel(method: string | null) {
  const labels: Record<string, string> = {
    pix: "PIX",
    credit_card: "Cartao de credito",
    boleto: "Boleto",
  };

  if (!method) return "Nao informado";
  return labels[method] ?? method;
}

function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    under_review: "Em analise",
    requires_info: "Aguardando dados",
    approved: "Aprovado",
    rejected: "Rejeitado",
  };
  return labels[status] ?? status;
}

function getPaymentStatusBadgeClass(status: string) {
  switch (status) {
    case "approved":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    case "rejected":
      return "border-red-500/25 bg-red-500/10 text-red-300";
    case "requires_info":
      return "border-amber-500/25 bg-amber-500/10 text-amber-300";
    case "under_review":
      return "border-sky-500/25 bg-sky-500/10 text-sky-300";
    default:
      return "border-[hsl(var(--gold-accent)/0.25)] bg-[hsl(var(--gold-accent)/0.08)] text-[hsl(var(--gold-accent))]";
  }
}

function formatPaymentAmount(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getPaymentTypeLabel(paymentType: string) {
  if (paymentType === "recurring") return "Recorrente";
  if (paymentType === "one_time") return "Avulso";
  return "Pagamento";
}

function formatDateTimeLabel(value: string | null) {
  if (!value) return "Sem atualizacoes";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function formatConversationCreatedLabel(value: string) {
  return format(new Date(value), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
}

function getSupportStatusBadge(status: string) {
  const statusMap = {
    new: { label: "Nova", variant: "default" as const },
    waiting_admin: { label: "Aguardando equipe", variant: "secondary" as const },
    waiting_customer: { label: "Aguardando voce", variant: "default" as const },
    resolved: { label: "Resolvida", variant: "outline" as const },
    closed: { label: "Fechada", variant: "outline" as const },
  };

  const config = statusMap[status as keyof typeof statusMap] || statusMap.new;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PersonalDataSection({
  profileQuery: _profileQuery,
  fullName,
  setFullName,
  phone,
  setPhone,
  whatsapp,
  setWhatsapp,
  cpf,
  setCpf,
  birthDate,
  setBirthDate,
  saveMutation,
}: PersonalDataSectionProps) {
  const hasPendingRequiredFields = !fullName || !cpf || (!phone && !whatsapp);

  return (
    <Card className={profileCardClassName}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dados pessoais
        </CardTitle>
        <CardDescription className={profileMutedTextClassName}>
          Informacoes essenciais para atendimento, faturamento e acompanhamento de pedidos.
        </CardDescription>
        {hasPendingRequiredFields ? (
          <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
            <p className="text-sm text-amber-300">
              Complete os campos obrigatorios para evitar bloqueios em pedidos e suporte.
            </p>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="fullName">
            Nome completo <span className="text-red-400">*</span>
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Seu nome completo"
            className={`mt-2 ${profileInputClassName}`}
            maxLength={100}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">
              Telefone <span className={profileTinyMutedTextClassName}>(ou WhatsApp)</span>
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
              placeholder="(11) 99999-9999"
              className={`mt-2 ${profileInputClassName}`}
              maxLength={15}
            />
            <p className={`mt-1 ${profileTinyMutedTextClassName}`}>Canal principal para contato.</p>
          </div>

          <div>
            <Label htmlFor="whatsapp">
              WhatsApp <span className={profileTinyMutedTextClassName}>(ou Telefone)</span>
            </Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(event) => setWhatsapp(formatPhone(event.target.value))}
              placeholder="(11) 99999-9999"
              className={`mt-2 ${profileInputClassName}`}
              maxLength={15}
            />
            <p className={`mt-1 ${profileTinyMutedTextClassName}`}>
              Canal recomendado para atualizacoes operacionais.
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="cpf">
            CPF <span className="text-red-400">*</span>
          </Label>
          <Input
            id="cpf"
            value={cpf}
            onChange={(event) => setCpf(formatCpf(event.target.value))}
            placeholder="000.000.000-00"
            className={`mt-2 ${profileInputClassName}`}
            maxLength={14}
            required
          />
          <p className={`mt-1 ${profileTinyMutedTextClassName}`}>
            Necessario para emissao fiscal quando aplicavel.
          </p>
        </div>

        <div>
          <Label htmlFor="birthDate">Data de nascimento</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className={`mt-2 ${profileInputClassName}`}
          />
        </div>

        <div className="border-t border-[hsl(0,0%,14%)] pt-4">
          <p className={`mb-4 ${profileTinyMutedTextClassName}`}>
            Os dados pessoais sao usados apenas para operacao da conta e comunicacoes necessarias.
          </p>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className={`w-full ${profilePrimaryButtonClassName}`}
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar dados"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export function PaymentSection({ userId }: { userId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const statusFilter = useMemo<PaymentStatus | "all">(() => {
    const rawStatus = searchParams.get("status");
    if (
      rawStatus === "pending" ||
      rawStatus === "under_review" ||
      rawStatus === "requires_info" ||
      rawStatus === "approved" ||
      rawStatus === "rejected"
    ) {
      return rawStatus;
    }
    return "all";
  }, [searchParams]);

  const {
    methods,
    isLoading,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    isDeleting,
    isSettingDefault,
  } = useProfilePaymentMethods(userId);

  const paymentsQuery = useQuery({
    queryKey: ["profile-payments", userId, statusFilter, searchParams.get("q") ?? ""],
    enabled: Boolean(userId),
    queryFn: () => {
      const filters: PaymentFilters = {};
      if (statusFilter !== "all") filters.status = [statusFilter];
      const searchQuery = searchParams.get("q")?.trim();
      if (searchQuery) filters.search = searchQuery;
      return listPaymentsByUser(userId, filters);
    },
  });

  const hasMethods = methods.length > 0;
  const payments = paymentsQuery.data ?? [];
  const pendingPayments = payments.filter((payment) =>
    ["pending", "under_review", "requires_info"].includes(payment.status),
  ).length;
  const paymentStats = {
    total: payments.length,
    pending: pendingPayments,
    approved: payments.filter((payment) => payment.status === "approved").length,
  };
  const reviewPayments = payments.filter((payment) => payment.status === "under_review").length;
  const awaitingActionPayments = payments.filter(
    (payment) => payment.status === "pending" || payment.status === "requires_info",
  ).length;
  const hasActiveFilters = statusFilter !== "all" || Boolean(searchParams.get("q")?.trim());

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "");
  }, [searchParams]);

  const statusOptions: Array<{ value: PaymentStatus | "all"; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendentes" },
    { value: "under_review", label: "Em analise" },
    { value: "requires_info", label: "Aguardando dados" },
    { value: "approved", label: "Aprovados" },
    { value: "rejected", label: "Rejeitados" },
  ];

  function updatePaymentFilters(next: { status?: PaymentStatus | "all"; q?: string }) {
    const nextParams = new URLSearchParams(searchParams);

    if (next.status !== undefined) {
      if (next.status === "all") nextParams.delete("status");
      else nextParams.set("status", next.status);
    }

    if (next.q !== undefined) {
      const trimmed = next.q.trim();
      if (trimmed) nextParams.set("q", trimmed);
      else nextParams.delete("q");
    }

    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div className="space-y-6">
      <Card className={profileCardClassName}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Metodos de pagamento
              </CardTitle>
              <CardDescription className={profileMutedTextClassName}>
                Consulte os cartoes vinculados e mantenha a configuracao financeira da conta em ordem.
              </CardDescription>
            </div>

            <div className="self-start rounded-lg border border-[hsl(var(--gold-accent)/0.2)] bg-[hsl(var(--gold-accent)/0.06)] px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))]">
                Sincronizado com o provedor
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className={`${profilePanelClassName} p-4`}>
              <p className={profileTinyMutedTextClassName}>Metodos salvos</p>
              <p className="mt-2 text-2xl font-semibold">{methods.length}</p>
            </div>
            <div className={`${profilePanelClassName} p-4`}>
              <p className={profileTinyMutedTextClassName}>Pagamentos registrados</p>
              <p className="mt-2 text-2xl font-semibold">{paymentStats.total}</p>
            </div>
            <div className={`${profilePanelClassName} p-4`}>
              <p className={profileTinyMutedTextClassName}>Pendencias em acompanhamento</p>
              <p className="mt-2 text-2xl font-semibold">{paymentStats.pending}</p>
            </div>
          </div>

          <div className={`${profilePanelClassName} p-4`}>
            <p className={`text-sm ${profileMutedTextClassName}`}>
              Os metodos salvos sao protegidos pelo provedor financeiro. Ajustes estruturais ou suporte sobre cobranca ficam centralizados no atendimento.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((item) => (
                <div key={item} className={`h-20 ${profileSkeletonClassName}`} />
              ))}
            </div>
          ) : null}

          {!isLoading && !hasMethods ? (
            <div className={`${profileDashedPanelClassName} px-6 py-12 text-center ${profileMutedTextClassName}`}>
              <CreditCard className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="font-medium text-white">Nenhum metodo salvo</p>
              <p className="mt-2 text-sm">
                Quando houver um metodo ativo vinculado a conta, ele aparecera aqui com mascaramento seguro.
              </p>
            </div>
          ) : null}

          {!isLoading && hasMethods ? (
            <div className="space-y-3">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className={`${profilePanelClassName} flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--gold-accent)/0.2)] bg-[hsl(var(--gold-accent)/0.08)]">
                      <CreditCard className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {method.card_brand?.toUpperCase() || method.type || "Cartao"} **** {method.card_last4 || "0000"}
                        </p>
                        {method.is_default ? (
                          <Badge variant="secondary" className="text-xs">
                            Padrao
                          </Badge>
                        ) : null}
                      </div>

                      {method.card_holder_name ? (
                        <p className={`text-sm ${profileMutedTextClassName}`}>{method.card_holder_name}</p>
                      ) : null}

                      {method.card_expiry_month && method.card_expiry_year ? (
                        <p className={profileTinyMutedTextClassName}>
                          Validade {String(method.card_expiry_month).padStart(2, "0")}/{method.card_expiry_year}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!method.is_default ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className={profileOutlineButtonClassName}
                        onClick={() => setDefaultPaymentMethod(method.id)}
                        disabled={isSettingDefault}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Definir padrao
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-zinc-300 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => deletePaymentMethod(method.id)}
                      disabled={isDeleting}
                      aria-label="Remover metodo salvo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className={profileCardClassName}>
        <CardHeader>
          <CardTitle className="text-base">Historico de pagamentos</CardTitle>
          <CardDescription className={profileMutedTextClassName}>
            Esta e a area canonica para acompanhar comprovantes, revisoes e aprovacoes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className={`${profilePanelClassName} p-4`}>
              <p className={profileTinyMutedTextClassName}>Aprovados</p>
              <p className="mt-2 text-2xl font-semibold">{paymentStats.approved}</p>
            </div>
            <div className={`${profilePanelClassName} p-4`}>
              <p className={profileTinyMutedTextClassName}>Sob revisao</p>
              <p className="mt-2 text-2xl font-semibold">{reviewPayments}</p>
            </div>
            <div className={`${profilePanelClassName} p-4`}>
              <p className={profileTinyMutedTextClassName}>Aguardando acao</p>
              <p className="mt-2 text-2xl font-semibold">{awaitingActionPayments}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onBlur={() => updatePaymentFilters({ q: searchInput })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    updatePaymentFilters({ q: searchInput });
                  }
                }}
                placeholder="Buscar por referencia"
                className={`pl-9 ${profileInputClassName}`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={statusFilter === option.value ? "default" : "outline"}
                  onClick={() => updatePaymentFilters({ status: option.value })}
                  className={`min-w-[112px] ${statusFilter === option.value ? "" : profileOutlineButtonClassName}`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {hasActiveFilters ? (
            <div className={`${profileDashedPanelClassName} px-4 py-3 text-sm ${profileMutedTextClassName}`}>
              Filtros ativos aplicados ao historico. Limpe os filtros para voltar a visao completa.
            </div>
          ) : null}

          <div className="space-y-3">
            {paymentsQuery.isLoading ? (
              <>
                <div className={`h-20 ${profileSkeletonClassName}`} />
                <div className={`h-20 ${profileSkeletonClassName}`} />
              </>
            ) : null}

            {!paymentsQuery.isLoading && payments.length === 0 ? (
              <div className={`${profileDashedPanelClassName} px-4 py-6 text-sm ${profileMutedTextClassName}`}>
                Nenhum pagamento encontrado para os filtros atuais.
              </div>
            ) : null}

            {!paymentsQuery.isLoading
              ? payments.map((payment) => (
                  <div
                    key={payment.id}
                    className={`${profilePanelClassName} flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">
                          {payment.reference_number || `Pagamento ${payment.id.slice(0, 8)}`}
                        </p>
                        <Badge variant="outline" className={getPaymentStatusBadgeClass(payment.status)}>
                          {getPaymentStatusLabel(payment.status)}
                        </Badge>
                      </div>
                      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${profileTinyMutedTextClassName}`}>
                        <span>
                          {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                        <span>{getPaymentTypeLabel(payment.payment_type)}</span>
                        <span>{payment.currency}</span>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm font-medium">{formatPaymentAmount(payment.amount)}</p>
                      <p className={profileTinyMutedTextClassName}>ID {payment.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <Button asChild size="sm" variant="outline" className={`self-start sm:self-auto ${profileOutlineButtonClassName}`}>
                      <Link to={paymentDetailsPath(payment.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Detalhes
                      </Link>
                    </Button>
                  </div>
                ))
              : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className={`sm:flex-1 ${profileOutlineButtonClassName}`}
          onClick={() => {
            setSearchInput("");
            updatePaymentFilters({ status: "all", q: "" });
          }}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Limpar filtros
        </Button>
        <Button asChild className={`sm:flex-1 ${profileOutlineButtonClassName}`} variant="outline">
          <Link to={profileSectionPath("support")}>Falar com suporte</Link>
        </Button>
      </div>
    </div>
  );
}

export function NotificationsSection({
  emailNotifications,
  setEmailNotifications,
  orderUpdates,
  setOrderUpdates,
  marketingEmails,
  setMarketingEmails,
  saveMutation,
}: NotificationsSectionProps) {
  const activeChannels = [emailNotifications, orderUpdates, marketingEmails].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className={`${profilePanelClassName} p-4`}>
          <p className={profileTinyMutedTextClassName}>Preferências ativas</p>
          <p className="mt-2 text-2xl font-semibold">{activeChannels}/3</p>
        </div>
        <div className={`${profilePanelClassName} p-4`}>
          <p className={profileTinyMutedTextClassName}>Alertas operacionais</p>
          <p className="mt-2 text-2xl font-semibold">{orderUpdates ? "Ligados" : "Pausados"}</p>
        </div>
        <div className={`${profilePanelClassName} p-4`}>
          <p className={profileTinyMutedTextClassName}>Comunicados comerciais</p>
          <p className="mt-2 text-2xl font-semibold">{marketingEmails ? "Ativos" : "Desligados"}</p>
        </div>
      </div>

      <div className={`${profilePanelClassName} p-4`}>
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-4 w-4 text-[hsl(var(--gold-accent))]" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Política de notificações</p>
            <p className={`text-sm ${profileMutedTextClassName}`}>
              Mantenha ativos os avisos operacionais para não perder etapas de
              pedido, cobrança, envio ou retorno da equipe.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className={`${profilePanelClassName} flex items-start justify-between gap-4 p-4`}>
          <div className="space-y-1">
            <Label>Avisos de envio e entrega</Label>
            <p className={`text-sm ${profileMutedTextClassName}`}>
              E-mails quando o pedido for enviado ou a entrega for concluída.
            </p>
          </div>
          <Switch
            aria-label="Avisos de envio e entrega"
            checked={emailNotifications}
            disabled={saveMutation.isPending}
            onCheckedChange={setEmailNotifications}
          />
        </div>

        <div className={`${profilePanelClassName} flex items-start justify-between gap-4 p-4`}>
          <div className="space-y-1">
            <Label>Atualizações de produção</Label>
            <p className={`text-sm ${profileMutedTextClassName}`}>
              Etapas de design, produção, controle de qualidade e embalagem.
            </p>
          </div>
          <Switch
            aria-label="Atualizações de produção"
            checked={orderUpdates}
            disabled={saveMutation.isPending}
            onCheckedChange={setOrderUpdates}
          />
        </div>

        <div className={`${profilePanelClassName} flex items-start justify-between gap-4 p-4`}>
          <div className="space-y-1">
            <Label>Comunicados de lançamento</Label>
            <p className={`text-sm ${profileMutedTextClassName}`}>
              Novidades de universos, campanhas e comunicados comerciais não operacionais.
            </p>
          </div>
          <Switch
            aria-label="Comunicados de lançamento"
            checked={marketingEmails}
            disabled={saveMutation.isPending}
            onCheckedChange={setMarketingEmails}
          />
        </div>
      </div>

      <div className={`${profilePanelClassName} p-4 text-sm ${profileMutedTextClassName}`}>
        Preferências de notificação impactam somente a distribuição dos avisos.
        Comunicações obrigatórias de segurança ou operação crítica continuam
        sendo priorizadas quando necessário.
      </div>

      <div className="border-t border-[hsl(0,0%,14%)] pt-4">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className={`w-full ${profilePrimaryButtonClassName}`}
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar preferências"}
        </Button>
      </div>
    </div>
  );
}

function SubscriptionSelectedModels({ slugs }: { slugs: string[] }) {
  const selectedModelsQuery = useQuery({
    queryKey: ["subscription-selected-models", slugs],
    queryFn: ({ signal }) => loadSubscriptionCatalogModels(slugs, signal),
  });

  return (
    <section className={`${profilePanelClassName} p-4`} aria-labelledby="subscription-selected-models-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="subscription-selected-models-heading" className="text-sm font-semibold">Modelos da sua assinatura</h3>
          <p className={`mt-1 text-xs ${profileMutedTextClassName}`}>
            {slugs.length} modelos selecionados da coleção curada.
          </p>
        </div>
        {selectedModelsQuery.isLoading && <span role="status" className={`text-xs ${profileMutedTextClassName}`}>Carregando catálogo...</span>}
      </div>
      {selectedModelsQuery.isError && (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-500/20 p-3">
          <p className="text-sm text-red-300">Não foi possível carregar os nomes dos modelos.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void selectedModelsQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {selectedModelsQuery.data && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {selectedModelsQuery.data.map((model) => (
            <li key={model.slug} className="flex min-w-0 items-center gap-3 rounded-md border border-white/10 p-2">
              {model.imageUrl ? (
                <img src={model.imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded object-cover" />
              ) : (
                <span aria-hidden="true" className="h-12 w-12 shrink-0 rounded bg-white/5" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{model.name}</span>
                {model.variantName && <span className="block truncate text-xs text-zinc-400">{model.variantName}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SubscriptionSection({
  userId,
  commercialMvp = false,
}: {
  userId: string;
  commercialMvp?: boolean;
}) {
  const subscriptionQuery = useActiveProfileSubscription(userId);
  const selectedModelSlugs = subscriptionQuery.data?.selected_model_slugs ?? [];

  if (subscriptionQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`h-24 ${profileSkeletonClassName}`} />
          <div className={`h-24 ${profileSkeletonClassName}`} />
          <div className={`h-24 ${profileSkeletonClassName}`} />
        </div>
        <div className={`h-40 ${profileSkeletonClassName}`} />
        <div className={`h-56 ${profileSkeletonClassName}`} />
      </div>
    );
  }

  if (subscriptionQuery.isError) {
    return (
      <section role="alert" className={`${profilePanelClassName} p-6`}>
        <h2 className="text-lg font-semibold">Não foi possível carregar sua assinatura</h2>
        <p className={`mt-2 text-sm ${profileMutedTextClassName}`}>
          Tente novamente em instantes. Seus dados e pagamentos continuam protegidos.
        </p>
        <Button
          type="button"
          variant="outline"
          className={`mt-4 ${profileOutlineButtonClassName}`}
          onClick={() => void subscriptionQuery.refetch()}
          disabled={subscriptionQuery.isFetching}
        >
          {subscriptionQuery.isFetching ? "Atualizando..." : "Tentar novamente"}
        </Button>
      </section>
    );
  }

  if (!commercialMvp && !PROFILE_COLLECTIONS_ENABLED) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`${profilePanelClassName} p-4`}>
            <p className={profileTinyMutedTextClassName}>Estado da area</p>
            <p className="mt-2 text-2xl font-semibold">Futura</p>
          </div>
          <div className={`${profilePanelClassName} p-4`}>
            <p className={profileTinyMutedTextClassName}>Superficie publica</p>
            <p className="mt-2 text-2xl font-semibold">Pausada</p>
          </div>
          <div className={`${profilePanelClassName} p-4`}>
            <p className={profileTinyMutedTextClassName}>Foco atual</p>
            <p className="mt-2 text-2xl font-semibold">Universo</p>
          </div>
        </div>

        <div className={`${profilePanelClassName} p-4`}>
          <div className="flex items-start gap-3">
            <Package className="mt-0.5 h-4 w-4 text-[hsl(var(--gold-accent))]" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Modulo temporariamente fora da superficie publica</p>
              <p className={`text-sm ${profileMutedTextClassName}`}>
                Esta area sera reativada quando a proxima fase do projeto for publicada. Por enquanto, a conta fica focada em dados, pagamentos, notificacoes e suporte.
              </p>
            </div>
          </div>
        </div>

        <div className={`${profileDashedPanelClassName} px-6 py-10 text-center`}>
          <Package className="mx-auto mb-4 h-14 w-14 text-zinc-500" />
          <p className="font-medium text-white">Assinaturas fora do ar neste momento</p>
          <p className={`mx-auto mt-2 max-w-md text-sm ${profileMutedTextClassName}`}>
            Enquanto isso, o acesso principal da conta continua centralizado no universo publicado e nas preferencias pessoais.
          </p>
          <Button asChild className={`mt-4 ${profilePrimaryButtonClassName}`}>
            <Link to={PUBLIC_ROUTES.catalog}>Ver universo</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!subscriptionQuery.data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`${profilePanelClassName} p-4`}>
            <p className={profileTinyMutedTextClassName}>Status atual</p>
            <p className="mt-2 text-2xl font-semibold">Sem plano</p>
          </div>
          <div className={`${profilePanelClassName} p-4`}>
            <p className={profileTinyMutedTextClassName}>Painel dedicado</p>
            <p className="mt-2 text-2xl font-semibold">Inativo</p>
          </div>
          <div className={`${profilePanelClassName} p-4`}>
            <p className={profileTinyMutedTextClassName}>Próximo passo</p>
            <p className="mt-2 text-2xl font-semibold">Explorar</p>
          </div>
        </div>

        <div className={`${profilePanelClassName} p-4`}>
          <div className="flex items-start gap-3">
            <Package className="mt-0.5 h-4 w-4 text-[hsl(var(--gold-accent))]" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Nenhuma assinatura ativa vinculada a conta</p>
              <p className={`text-sm ${profileMutedTextClassName}`}>
                Quando houver um plano ativo novamente, esta area passa a concentrar progresso, metodo principal, proximas entregas e total pago.
              </p>
            </div>
          </div>
        </div>

        <div className={`${profileDashedPanelClassName} px-6 py-10 text-center`}>
          <Package className="mx-auto mb-4 h-14 w-14 text-zinc-500" />
          <p className="font-medium text-white">Não há plano ativo no momento</p>
          <p className={`mx-auto mt-2 max-w-md text-sm ${profileMutedTextClassName}`}>
            Enquanto isso, use o catalogo publico e o restante da conta para acompanhar seus dados e operacoes atuais.
          </p>
          <Button asChild className={`mt-4 ${profilePrimaryButtonClassName}`}>
            <Link to={PUBLIC_ROUTES.catalog}>Explorar universo</Link>
          </Button>
          <Button asChild variant="outline" className="mt-4 sm:ml-2">
            <Link to={PUBLIC_ROUTES.plans}>Conhecer planos de assinatura</Link>
          </Button>
        </div>
      </div>
    );
  }

  const subscription = subscriptionQuery.data;
  const deliveriesCompleted = subscription.deliveries_completed ?? 0;
  const deliveriesTotal = subscription.deliveries_total ?? 0;
  const progressPercentage =
    deliveriesTotal > 0 ? Math.min(100, Math.round((deliveriesCompleted / deliveriesTotal) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className={`${profilePanelClassName} p-4`}>
          <p className={profileTinyMutedTextClassName}>Status atual</p>
          <p className="mt-2 text-2xl font-semibold">Ativa</p>
        </div>
        <div className={`${profilePanelClassName} p-4`}>
          <p className={profileTinyMutedTextClassName}>Plano</p>
          <p className="mt-2 text-2xl font-semibold">{getPlanLabel(subscription.plan_type)}</p>
        </div>
        <div className={`${profilePanelClassName} p-4`}>
          <p className={profileTinyMutedTextClassName}>Progresso</p>
          <p className="mt-2 text-2xl font-semibold">{progressPercentage}%</p>
        </div>
      </div>

      <div className={`${profilePanelClassName} p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Resumo operacional da assinatura</p>
            <p className={`text-sm ${profileMutedTextClassName}`}>
              Consulte aqui o estado atual do plano, progresso de entregas e metodo principal antes de abrir o painel dedicado.
            </p>
          </div>
          <Badge variant="default" className="gap-1 self-start">
            <CheckCircle className="h-3 w-3" />
            Ativa
          </Badge>
        </div>
      </div>

      {selectedModelSlugs.length > 0 && <SubscriptionSelectedModels slugs={selectedModelSlugs} />}

      <div className={`${profilePanelClassName} p-4`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={profileTinyMutedTextClassName}>Andamento do plano</p>
            <p className="mt-1 text-sm font-medium">
              {deliveriesCompleted}/{deliveriesTotal || "?"} entregas concluidas
            </p>
          </div>
          <p className="text-sm font-medium">{progressPercentage}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[hsl(var(--gold-accent))] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={`${profilePanelClassName} p-4`}>
          <span className={profileTinyMutedTextClassName}>Ultima atualizacao</span>
          <p className="mt-1 text-sm font-medium">{formatDateTimeLabel(subscription.updated_at)}</p>
        </div>

        <div className={`${profilePanelClassName} p-4`}>
          <span className={profileTinyMutedTextClassName}>Proxima entrega</span>
          <p className="mt-1 text-sm font-medium">{formatDateTimeLabel(subscription.next_delivery_at)}</p>
        </div>

        <div className={`${profilePanelClassName} p-4`}>
          <span className={profileTinyMutedTextClassName}>Metodo principal</span>
          <p className="mt-1 text-sm font-medium">
            {getPaymentMethodLabel(subscription.payment_method)}
          </p>
        </div>

        <div className={`${profilePanelClassName} p-4`}>
          <span className={profileTinyMutedTextClassName}>Total pago</span>
          <p className="mt-1 text-sm font-medium">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(subscription.total_paid ?? 0)}
          </p>
        </div>
      </div>

      <Button asChild variant="outline" className={`w-full ${profileOutlineButtonClassName}`}>
        <Link to="/painel-assinante">
          Abrir painel do assinante
          <ExternalLink className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export function SupportSection({ userId }: { userId: string }) {
  const {
    conversations,
    isLoadingConversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    isLoadingMessages,
    newMessage,
    setNewMessage,
    newSubject,
    setNewSubject,
    newFirstMessage,
    setNewFirstMessage,
    sending,
    showNewConversationForm,
    setShowNewConversationForm,
    messagesEndRef,
    createConversation,
    sendMessage,
  } = useProfileSupport(userId);

  const openConversations = conversations.filter((conversation) =>
    ["new", "waiting_admin", "waiting_customer"].includes(conversation.status),
  ).length;
  const waitingOnCustomer = conversations.filter(
    (conversation) => conversation.status === "waiting_customer",
  ).length;
  const archivedConversations = conversations.filter((conversation) =>
    ["resolved", "closed"].includes(conversation.status),
  ).length;
  const isConversationListVisible =
    !selectedConversation && conversations.length > 0 && !showNewConversationForm;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className={`${profilePanelClassName} p-4`}>
          <p className={profileTinyMutedTextClassName}>Conversas em andamento</p>
          <p className="mt-2 text-2xl font-semibold">{openConversations}</p>
        </div>
        <div className={`${profilePanelClassName} p-4`}>
          <p className={profileTinyMutedTextClassName}>Aguardando sua resposta</p>
          <p className="mt-2 text-2xl font-semibold">{waitingOnCustomer}</p>
        </div>
        <div className={`${profilePanelClassName} p-4`}>
          <p className={profileTinyMutedTextClassName}>Historico concluido</p>
          <p className="mt-2 text-2xl font-semibold">{archivedConversations}</p>
        </div>
      </div>

      <div className={`${profilePanelClassName} p-4`}>
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 text-[hsl(var(--gold-accent))]" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Janela operacional de resposta</p>
            <p className={`text-sm ${profileMutedTextClassName}`}>
              A equipe responde em ate 48 horas uteis. Atualizacoes importantes tambem seguem pelos canais de notificacao ativos da conta.
            </p>
          </div>
        </div>
      </div>

      {isLoadingConversations ? (
        <div className="space-y-3">
          <div className={`h-24 ${profileSkeletonClassName}`} />
          <div className={`h-24 ${profileSkeletonClassName}`} />
          <div className={`h-24 ${profileSkeletonClassName}`} />
        </div>
      ) : null}

      {!isLoadingConversations && conversations.length === 0 && !selectedConversation && !showNewConversationForm ? (
        <div className={`${profileDashedPanelClassName} px-6 py-10 text-center`}>
          <MessageSquare className="mx-auto mb-4 h-14 w-14 text-zinc-500" />
          <p className="font-medium text-white">Nenhum atendimento iniciado</p>
          <p className={`mx-auto mt-2 max-w-xl text-sm ${profileMutedTextClassName}`}>
            Use este canal para pagamentos, conta, pedidos ou suporte tecnico. Quanto mais contexto na primeira mensagem, mais rapido o retorno operacional.
          </p>
          <Button onClick={() => setShowNewConversationForm(true)} className={`mt-4 ${profilePrimaryButtonClassName}`}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Abrir atendimento
          </Button>
        </div>
      ) : null}

      {(conversations.length === 0 || showNewConversationForm) && !selectedConversation ? (
        <div className={`${profilePanelClassName} p-5`}>
          <div className="flex flex-col gap-2 border-b border-[hsl(0,0%,14%)] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-medium">Novo atendimento</h3>
              <p className={`mt-1 text-sm ${profileMutedTextClassName}`}>
                Abra um chamado com assunto claro e contexto suficiente para a equipe agir sem retrabalho.
              </p>
            </div>
            {conversations.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className={profileOutlineButtonClassName}
                onClick={() => {
                  setShowNewConversationForm(false);
                  setNewSubject("");
                  setNewFirstMessage("");
                }}
              >
                Voltar para conversas
              </Button>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="support-subject">Assunto</Label>
              <Input
                id="support-subject"
                placeholder="Ex: Atualizacao sobre meu pagamento"
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
                className={`mt-2 ${profileInputClassName}`}
              />
            </div>

            <div>
              <Label htmlFor="support-message">Mensagem inicial</Label>
              <Textarea
                id="support-message"
                placeholder="Explique o contexto, inclua referencia do pedido ou pagamento quando existir e descreva exatamente o que voce precisa."
                rows={6}
                value={newFirstMessage}
                onChange={(event) => setNewFirstMessage(event.target.value)}
                className={`mt-2 ${profileInputClassName}`}
              />
            </div>

            <div className={`${profilePanelClassName} p-3 ${profileTinyMutedTextClassName}`}>
              Assuntos com referencia de pagamento, pedido ou prazo costumam ser tratados mais rapido.
            </div>

            <Button
              onClick={createConversation}
              disabled={sending || !newSubject.trim() || !newFirstMessage.trim()}
              className={`w-full sm:w-auto ${profilePrimaryButtonClassName}`}
            >
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Enviando..." : "Enviar para a equipe"}
            </Button>
          </div>
        </div>
      ) : null}

      {isConversationListVisible ? (
        <div className={`${profilePanelClassName} p-5`}>
          <div className="flex flex-col gap-3 border-b border-[hsl(0,0%,14%)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-medium">Conversas recentes</h3>
              <p className={`mt-1 text-sm ${profileMutedTextClassName}`}>
                Selecione uma conversa para revisar historico, status e respostas da equipe.
              </p>
            </div>
            <Button variant="outline" size="sm" className={profileOutlineButtonClassName} onClick={() => setShowNewConversationForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova conversa
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedConversation(conversation)}
                className={`${profilePanelClassName} flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-white/[0.06] sm:flex-row sm:items-start sm:justify-between`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{conversation.subject}</p>
                    {getSupportStatusBadge(conversation.status)}
                  </div>
                  <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 ${profileTinyMutedTextClassName}`}>
                    <span>Criada em {formatConversationCreatedLabel(conversation.created_at)}</span>
                    <span>Ultima atualizacao {formatDateTimeLabel(conversation.last_message_at)}</span>
                  </div>
                </div>
                <div className={`self-start ${profileTinyMutedTextClassName} sm:self-center`}>
                  Abrir historico
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selectedConversation ? (
        <div className={`${profilePanelClassName} p-5`}>
          <div className="flex flex-col gap-4 border-b border-[hsl(0,0%,14%)] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium">{selectedConversation.subject}</h3>
                {getSupportStatusBadge(selectedConversation.status)}
              </div>
              <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 ${profileTinyMutedTextClassName}`}>
                <span>Criada em {formatConversationCreatedLabel(selectedConversation.created_at)}</span>
                <span>Ultima atualizacao {formatDateTimeLabel(selectedConversation.last_message_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className={profileOutlineButtonClassName} onClick={() => setShowNewConversationForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo atendimento
              </Button>
              <Button size="sm" variant="ghost" className="text-zinc-300 hover:bg-white/[0.06] hover:text-white" onClick={() => setSelectedConversation(null)}>
                Voltar
              </Button>
            </div>
          </div>

          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto">
            {isLoadingMessages ? (
              <>
                <div className="h-16 w-[70%] animate-pulse rounded-lg bg-white/[0.08]" />
                <div className="ml-auto h-16 w-[80%] animate-pulse rounded-lg bg-white/[0.08]" />
                <div className="h-16 w-[75%] animate-pulse rounded-lg bg-white/[0.08]" />
              </>
            ) : null}

            {!isLoadingMessages
              ? messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        message.sender_id === userId
                          ? "bg-[hsl(var(--gold-accent))] text-black"
                          : "border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)] text-zinc-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                      <p
                        className={`mt-2 text-[11px] ${
                          message.sender_id === userId
                            ? "text-black/65"
                            : "text-zinc-500"
                        }`}
                      >
                        {format(new Date(message.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))
              : null}
            <div ref={messagesEndRef} />
          </div>

          {selectedConversation.status !== "closed" ? (
            <div className="mt-4 space-y-3 border-t border-[hsl(0,0%,14%)] pt-4">
              <Textarea
                placeholder="Digite sua mensagem"
                rows={4}
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                className={profileInputClassName}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className={profileTinyMutedTextClassName}>
                  Enter envia. Shift + Enter adiciona nova linha.
                </p>
                <Button onClick={() => void sendMessage()} disabled={sending || !newMessage.trim()} size="sm" className={profilePrimaryButtonClassName}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar resposta
                </Button>
              </div>
            </div>
          ) : (
            <div className={`${profilePanelClassName} mt-4 p-4`}>
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4" />
                <p className={`text-sm ${profileMutedTextClassName}`}>
                  Esta conversa foi encerrada. Abra um novo atendimento se precisar retomar o tema com contexto atualizado.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className={`${profilePanelClassName} p-4 text-sm`}>
        <p className="font-medium">Horario operacional</p>
        <p className={`mt-1 ${profileMutedTextClassName}`}>Segunda a sexta, das 9h as 18h.</p>
        <p className={profileMutedTextClassName}>Tempo medio de primeira resposta: ate 2 horas dentro da janela ativa.</p>
      </div>
    </div>
  );
}
