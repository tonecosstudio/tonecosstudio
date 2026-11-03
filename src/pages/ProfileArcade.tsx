import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  CreditCard,
  Loader2,
  MessageSquare,
  Save,
  ShieldCheck,
  Trophy,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { BRAND_NAME } from "@/config/brand";
import { ArcadeCard } from "@/components/arcade/ArcadeLayout";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getMyProfile, upsertMyProfile } from "@/lib/profile";
import { getMyCollectorProfile } from "@/lib/collector";
import { useToast } from "@/hooks/use-toast";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/services/customer/notification-preferences-service";
import {
  NotificationsSection,
  PaymentSection,
  PROFILE_COLLECTIONS_ENABLED,
  SubscriptionSection,
  SupportSection,
} from "./ProfileSections";
import { profileNavigationConfig } from "@/config/profile-navigation.config";
import { profileSectionPath, resolveProfileRouteSectionId } from "@/config/routes";
import NotFoundArcade from "./NotFoundArcade";

type SectionId =
  | "info"
  | "payment"
  | "notifications"
  | "support"
  | "subscriptions";

type SectionMeta = {
  title: string;
  eyebrow: string;
  description: string;
};

const SECTION_META: Record<SectionId, SectionMeta> = {
  info: {
    title: "Dados da conta",
    eyebrow: "Conta",
    description: "Mantenha seus dados principais atualizados para pagamentos, suporte e comunicacoes.",
  },
  payment: {
    title: "Pagamentos",
    eyebrow: "Financeiro",
    description: "Consulte metodos salvos, historico recente e a situacao financeira da conta.",
  },
  notifications: {
    title: "Notificacoes",
    eyebrow: "Comunicacoes",
    description: "Escolha quais avisos realmente importam e reduza ruido na operacao diaria.",
  },
  support: {
    title: "Suporte",
    eyebrow: "Atendimento",
    description: "Abra conversas, acompanhe retornos e centralize historico de atendimento em um unico lugar.",
  },
  subscriptions: {
    title: "Assinaturas",
    eyebrow: "Continuidades",
    description: "Consulte o estado da assinatura e acompanhe sua configuracao ativa.",
  },
};

const SECTION_IDS = new Set<SectionId>([
  "info",
  "payment",
  "notifications",
  "support",
  "subscriptions",
]);

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDateLabel(value?: string | null) {
  if (!value) return "Nao registrado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nao registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getCompletionMessage(completion: number) {
  if (completion >= 90) return "Conta pronta para uso continuo.";
  if (completion >= 70) return "Falta pouco para fechar a configuracao principal.";
  return "Complete os dados principais para evitar retrabalho em pedidos e suporte.";
}

function SummaryMetric({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <ArcadeCard hover={false} className="p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent)/0.72)]">
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[hsl(0,0%,96%)]"
        style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
      >
        {value}
      </p>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-[hsl(0,0%,45%)]">
        {help}
      </p>
    </ArcadeCard>
  );
}

function SectionShell({
  meta,
  status,
  children,
}: {
  meta: SectionMeta;
  status?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-[hsl(0,0%,12%)] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[hsl(var(--gold-accent)/0.72)]">
            {meta.eyebrow}
          </p>
          <h2
            className="mt-2 text-3xl font-black uppercase tracking-[0.08em]"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            {meta.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[hsl(0,0%,56%)]">
            {meta.description}
          </p>
        </div>
        {status ? (
          <span className="inline-flex items-center self-start border border-[hsl(var(--gold-accent)/0.25)] bg-[hsl(var(--gold-accent)/0.08)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent))]">
            {status}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ProfileSectionSkeleton() {
  return (
    <ArcadeCard hover={false} className="p-6">
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-40 bg-[hsl(0,0%,12%)]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="h-10 bg-[hsl(0,0%,10%)]" />
            <div className="h-10 bg-[hsl(0,0%,10%)]" />
            <div className="h-10 bg-[hsl(0,0%,10%)]" />
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-[hsl(0,0%,10%)]" />
            <div className="h-20 bg-[hsl(0,0%,10%)]" />
          </div>
        </div>
      </div>
    </ArcadeCard>
  );
}

export default function ProfileArcade() {
  const { user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { section: routeSection } = useParams<{ section?: string }>();
  const [activeSection, setActiveSection] = useState<SectionId>("info");

  const allowedSections = useMemo(
    () =>
      new Set<SectionId>(
        profileNavigationConfig.flatMap((section) =>
          section.subSections
            .map((subSection) => subSection.id)
            .filter((id): id is SectionId => SECTION_IDS.has(id as SectionId)),
        ),
      ),
    [],
  );

  const requestedRouteSection = resolveProfileRouteSectionId(routeSection);
  const hasInvalidRouteSection = Boolean(routeSection) && !requestedRouteSection;

  useEffect(() => {
    if (hasInvalidRouteSection) return;
    const nextSection =
      requestedRouteSection && allowedSections.has(requestedRouteSection as SectionId)
        ? (requestedRouteSection as SectionId)
        : "info";

    setActiveSection(nextSection);
  }, [allowedSections, hasInvalidRouteSection, requestedRouteSection]);

  const profileQuery = useQuery({
    queryKey: ["profile", { userId: userId ?? null }],
    enabled: Boolean(userId),
    queryFn: () => (userId ? getMyProfile(userId) : null),
  });

  const collectorQuery = useQuery({
    queryKey: ["collector-profile", { userId: userId ?? null }],
    enabled: Boolean(userId),
    queryFn: () => (userId ? getMyCollectorProfile(userId) : null),
  });

  const notificationPreferencesQuery = useQuery({
    queryKey: ["customer-notification-preferences", { userId: userId ?? null }],
    enabled: Boolean(userId),
    queryFn: fetchNotificationPreferences,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);

  useEffect(() => {
    if (!profileQuery.data) return;
    setFullName(profileQuery.data.full_name || "");
    setPhone(profileQuery.data.phone || "");
  }, [profileQuery.data]);

  useEffect(() => {
    if (!notificationPreferencesQuery.data) return;
    setEmailNotifications(
      Boolean(
        notificationPreferencesQuery.data.item_shipped &&
          notificationPreferencesQuery.data.item_delivered,
      ),
    );
    setOrderUpdates(Boolean(notificationPreferencesQuery.data.production_stage_updates));
    setMarketingEmails(Boolean(notificationPreferencesQuery.data.marketing_emails));
  }, [notificationPreferencesQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Conta nao autenticada");
      return upsertMyProfile({
        id: userId,
        full_name: fullName.trim() || null,
        phone: phone.replace(/\D/g, "") || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Conta atualizada", description: "Os dados principais foram salvos." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  const saveNotificationPreferencesMutation = useMutation({
    mutationFn: () =>
      updateNotificationPreferences({
        production_stage_updates: orderUpdates,
        item_shipped: emailNotifications,
        item_delivered: emailNotifications,
        marketing_emails: marketingEmails,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["customer-notification-preferences"],
      });
      toast({
        title: "Preferencias salvas",
        description: "As notificacoes da conta foram atualizadas.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  const iconLookup: Record<string, LucideIcon> = {
    User,
    Star: Trophy,
    Bell,
    CreditCard,
    HelpCircle: MessageSquare,
    RefreshCw: Bell,
  };

  const profile = profileQuery.data;
  const collector = collectorQuery.data;
  const completion = profile?.profile_completion || 0;
  const notificationChannelsEnabled = [
    emailNotifications,
    orderUpdates,
    marketingEmails,
  ].filter(Boolean).length;
  const accountDisplayName =
    fullName || user?.email?.split("@")[0] || "Minha conta";
  const accountDataCoverage = [
    Boolean(fullName.trim()),
    Boolean(phone.trim()),
    Boolean(user?.email),
  ].filter(Boolean).length;
  const accountOperationalStatus =
    accountDataCoverage === 3
      ? "Base operacional pronta"
      : accountDataCoverage === 2
        ? "Revisar dados principais"
        : "Completar cadastro principal";
  const isAccountLoading =
    (profileQuery.isLoading && !profileQuery.data) ||
    (collectorQuery.isLoading && !collectorQuery.data) ||
    (notificationPreferencesQuery.isLoading && !notificationPreferencesQuery.data);

  const sectionStatus = useMemo(() => {
    switch (activeSection) {
      case "info":
        return `${completion}% completo`;
      case "payment":
        return "Metodos, historico e seguranca";
      case "notifications":
        return `${notificationChannelsEnabled}/3 canais ativos`;
      case "support":
        return "Central do cliente";
      case "subscriptions":
        return PROFILE_COLLECTIONS_ENABLED ? "Area ativa" : "Area futura";
      default:
        return "";
    }
  }, [activeSection, completion, notificationChannelsEnabled]);

  const handleSectionChange = (nextSection: SectionId) => {
    setActiveSection(nextSection);
    navigate(profileSectionPath(nextSection));
  };

  const saveNotificationPreferencesAction = {
    mutate: () => saveNotificationPreferencesMutation.mutate(),
    isPending: saveNotificationPreferencesMutation.isPending,
  };

  if (hasInvalidRouteSection) {
    return <NotFoundArcade />;
  }

  return (
    <Page
      title={`Minha Conta | ${BRAND_NAME}`}
      description="Gerencie dados da conta, nivel do colecionador, pagamentos e comunicacoes."
    >
      <section className="relative px-6 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--gold-accent))] animate-pulse" />
            <span
              className="font-mono text-[9px] uppercase tracking-[0.3em] text-[hsl(var(--gold-accent))]"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              ACCOUNT CONSOLE
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <h1
                className="text-4xl font-black uppercase tracking-[0.15em] md:text-6xl"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                MINHA CONTA
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[hsl(0,0%,58%)] md:text-base">
                Gerencie dados da conta, nivel do colecionador, pagamentos, notificacoes e
                suporte em uma superficie unica e mais clara.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,6%)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,72%)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--gold-accent))]" />
                {user?.email || "Conta autenticada"}
              </span>
              <span className="inline-flex items-center gap-2 border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,6%)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,72%)]">
                <Trophy className="h-3.5 w-3.5 text-[hsl(var(--gold-accent))]" />
                Nivel {collector?.collector_level ?? 0}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
              label="Perfil"
              value={`${completion}%`}
              help={getCompletionMessage(completion)}
            />
            <SummaryMetric
              label="Nivel"
              value={`NVL ${collector?.collector_level ?? 0}`}
              help="Status interno do colecionador. Nao ha classificacao publica ativa no projeto."
            />
            <SummaryMetric
              label="Pecas"
              value={String(collector?.pieces_owned ?? 0)}
              help="Quantidade de itens associados ao seu historico atual."
            />
            <SummaryMetric
              label="Investido"
              value={formatCurrency(collector?.total_spent)}
              help="Total registrado para a sua conta ate o momento."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-72 lg:flex-shrink-0">
            <ArcadeCard hover={false} className="p-4">
              <div className="border-b border-[hsl(0,0%,12%)] pb-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent)/0.72)]">
                  Conta atual
                </p>
                <p
                  className="mt-2 text-2xl font-black uppercase tracking-[0.08em]"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                >
                  {accountDisplayName}
                </p>
                <p className="mt-2 text-sm text-[hsl(0,0%,58%)]">{user?.email || "Sem email"}</p>
              </div>

              <nav className="mt-4 space-y-4">
                {profileNavigationConfig.map((section) => (
                  <div key={section.id}>
                    <p className="px-2 font-mono text-[8px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent)/0.5)]">
                      {section.title}
                    </p>
                    <div className="mt-2 space-y-1">
                      {section.subSections.map((subSection) => {
                        const sectionId = subSection.id as SectionId;
                        const Icon = subSection.icon ? iconLookup[subSection.icon] ?? User : User;
                        const isActive = activeSection === sectionId;

                        return (
                          <button
                            key={subSection.id}
                            type="button"
                            onClick={() => handleSectionChange(sectionId)}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] transition-all",
                              isActive
                                ? "border-l-2 border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.14)] text-[hsl(var(--gold-accent))]"
                                : "text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,10%)] hover:text-[hsl(0,0%,82%)]",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {subSection.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </ArcadeCard>

            <ArcadeCard hover={false} className="mt-4 p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent)/0.72)]">
                Estado da conta
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[hsl(0,0%,44%)]">
                    Perfil completo
                  </p>
                  <div className="mt-2 h-2 overflow-hidden bg-[hsl(0,0%,12%)]">
                    <div
                      className="h-full bg-gradient-to-r from-[hsl(var(--gold-accent))] to-[hsl(var(--gold-accent)/0.72)] transition-all duration-700"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>
                <p className="font-mono text-[10px] leading-relaxed text-[hsl(0,0%,48%)]">
                  {getCompletionMessage(completion)}
                </p>
                <div className="border-t border-[hsl(0,0%,12%)] pt-3 font-mono text-[10px] text-[hsl(0,0%,48%)]">
                  <p>Ultima atualizacao: {formatDateLabel(profile?.updated_at)}</p>
                  <p className="mt-1">Cadastro: {formatDateLabel(profile?.created_at)}</p>
                </div>
              </div>
            </ArcadeCard>
          </aside>

          <div className="min-w-0 flex-1">
            <SectionShell meta={SECTION_META[activeSection]} status={sectionStatus}>
              {isAccountLoading ? <ProfileSectionSkeleton /> : null}

              {!isAccountLoading && activeSection === "info" ? (
                <ArcadeCard hover={false} className="p-6">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.95fr)]">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent)/0.72)]">
                          Dados operacionais
                        </p>
                        <p className="mt-2 font-mono text-[10px] leading-relaxed text-[hsl(0,0%,48%)]">
                          Estes dados aparecem em comunicacoes, validacoes de conta e acompanhamento de pedidos.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,50%)]">
                            Nome completo
                          </label>
                          <Input
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            className="border-[hsl(0,0%,15%)] bg-[hsl(0,0%,8%)] font-mono text-[hsl(0,0%,92%)]"
                            placeholder="Seu nome completo"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,50%)]">
                            Telefone principal
                          </label>
                          <Input
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            className="border-[hsl(0,0%,15%)] bg-[hsl(0,0%,8%)] font-mono text-[hsl(0,0%,92%)]"
                            placeholder="(11) 99999-9999"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,50%)]">
                            Email da conta
                          </label>
                          <Input
                            value={user?.email || ""}
                            disabled
                            className="border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] font-mono text-[hsl(0,0%,44%)]"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent)/0.72)]">
                              Estado da base
                            </p>
                            <p className="mt-2 font-mono text-[10px] leading-relaxed text-[hsl(0,0%,48%)]">
                              {accountOperationalStatus}
                            </p>
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,72%)]">
                            {accountDataCoverage}/3 sinais principais
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => saveProfileMutation.mutate()}
                          disabled={saveProfileMutation.isPending}
                          className="inline-flex w-full items-center justify-center gap-2 bg-[hsl(var(--gold-accent))] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-[hsl(0,0%,7%)] transition-all hover:brightness-110 disabled:opacity-50 sm:w-auto"
                        >
                          {saveProfileMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Salvar dados
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent)/0.72)]">
                          Resumo da conta
                        </p>
                        <div className="mt-3 space-y-3 font-mono text-[10px] text-[hsl(0,0%,56%)]">
                          <div className="flex items-center justify-between gap-3 border-b border-[hsl(0,0%,12%)] pb-2">
                            <span>Email</span>
                            <span className="text-right text-[hsl(0,0%,82%)]">{user?.email || "--"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-b border-[hsl(0,0%,12%)] pb-2">
                            <span>Nivel do colecionador</span>
                            <span className="text-right text-[hsl(0,0%,82%)]">
                              {collector?.collector_level ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-b border-[hsl(0,0%,12%)] pb-2">
                            <span>Notificacoes ativas</span>
                            <span className="text-right text-[hsl(0,0%,82%)]">
                              {notificationChannelsEnabled}/3
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Ultima atualizacao</span>
                            <span className="text-right text-[hsl(0,0%,82%)]">
                              {formatDateLabel(profile?.updated_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent)/0.72)]">
                          Recomendacao
                        </p>
                        <p className="mt-3 font-mono text-[10px] leading-relaxed text-[hsl(0,0%,48%)]">
                          O sistema ainda mantem progresso de colecionador por nivel, pecas e
                          investimento total. O que nao existe hoje e uma classificacao publica comparativa.
                        </p>
                      </div>
                    </div>
                  </div>
                </ArcadeCard>
              ) : null}

              {!isAccountLoading && activeSection === "payment" && userId ? (
                <PaymentSection userId={userId} />
              ) : null}

              {!isAccountLoading && activeSection === "notifications" ? (
                <NotificationsSection
                  emailNotifications={emailNotifications}
                  setEmailNotifications={setEmailNotifications}
                  orderUpdates={orderUpdates}
                  setOrderUpdates={setOrderUpdates}
                  marketingEmails={marketingEmails}
                  setMarketingEmails={setMarketingEmails}
                  saveMutation={saveNotificationPreferencesAction}
                />
              ) : null}

              {!isAccountLoading && activeSection === "support" && userId ? (
                <SupportSection userId={userId} />
              ) : null}

              {!isAccountLoading &&
              PROFILE_COLLECTIONS_ENABLED &&
              activeSection === "subscriptions" &&
              userId ? (
                <SubscriptionSection userId={userId} />
              ) : null}
            </SectionShell>
          </div>
        </div>
      </section>
    </Page>
  );
}
