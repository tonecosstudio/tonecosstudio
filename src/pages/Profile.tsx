import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  analyzePreferencesWithAI,
  getMyProfile,
  upsertMyProfile,
  type AddressBR,
} from "@/lib/profile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import {
  X,
  User,
  Heart,
  MapPin,
  Package,
  Trophy,
  ExternalLink,
  Settings,
  CreditCard,
  Bell,
  FileText,
  Shield,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery as useRQ } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductionTimeline } from "@/components/production/ProductionTimeline";
import { Switch } from "@/components/ui/switch";
import {
  getMyCollectorProfile,
  updateCollectorProfile,
  getUserBadges,
  getPublicCollection,
  checkUsernameAvailability,
} from "@/lib/collector";
import { Link, useSearchParams } from "react-router-dom";
import { ManagePublicCollection } from "@/components/collector/ManagePublicCollection";
import { cn } from "@/lib/utils";
import {
  PersonalDataSection,
  PaymentSection,
  NotificationsSection,
  SubscriptionSection,
  SupportSection,
} from "./ProfileSections";

const addressSchema = z
  .object({
    cep: z.string().trim().max(20).optional().or(z.literal("")),
    rua: z.string().trim().max(120).optional().or(z.literal("")),
    numero: z.string().trim().max(30).optional().or(z.literal("")),
    complemento: z.string().trim().max(120).optional().or(z.literal("")),
    bairro: z.string().trim().max(80).optional().or(z.literal("")),
    cidade: z.string().trim().max(80).optional().or(z.literal("")),
    uf: z.string().trim().max(10).optional().or(z.literal("")),
  })
  .transform((v) => {
    const cleaned: AddressBR = {};
    (Object.keys(v) as Array<keyof typeof v>).forEach((k) => {
      const raw = v[k];
      const val = typeof raw === "string" ? raw.trim() : "";
      if (val) (cleaned as any)[k] = val;
    });
    return cleaned;
  });

const profileSchema = z.object({
  preferences_text: z.string().trim().max(1000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(40),
  address: addressSchema,
});

function parseTagsCSV(input: string) {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 40)
    )
  );
}

function removeTagFromCSV(csv: string, tagToRemove: string) {
  const needle = tagToRemove.trim().toLocaleLowerCase();
  const next = parseTagsCSV(csv).filter((t) => t.trim().toLocaleLowerCase() !== needle);
  return next.join(", ");
}

export default function Profile() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Estado para controlar a seção ativa - verifica URL params
  const sectionFromUrl = searchParams.get("section") as
    | "info"
    | "personal"
    | "collector"
    | "preferences"
    | "address"
    | "subscriptions"
    | "support"
    | "orders"
    | "collection"
    | "payment"
    | "notifications"
    | null;
  const [activeSection, setActiveSection] = useState<
    | "info"
    | "personal"
    | "collector"
    | "preferences"
    | "address"
    | "subscriptions"
    | "support"
    | "orders"
    | "collection"
    | "payment"
    | "notifications"
  >(sectionFromUrl || "info");

  // Atualizar seção quando URL mudar
  useEffect(() => {
    if (sectionFromUrl) {
      setActiveSection(sectionFromUrl);
    }
  }, [sectionFromUrl]);

  // Estados para perfil público
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  // Estados para dados pessoais
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Estados para notificações
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile", { userId: user?.id ?? null }],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      return getMyProfile(user.id);
    },
  });

  const collectorQuery = useQuery({
    queryKey: ["collector-profile", { userId: user?.id ?? null }],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      return getMyCollectorProfile(user.id);
    },
  });

  const badgesQuery = useQuery({
    queryKey: ["user-badges", { userId: user?.id ?? null }],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      return getUserBadges(user.id);
    },
  });

  const publicCollectionQuery = useQuery({
    queryKey: ["my-public-collection", { userId: user?.id ?? null }],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      return getPublicCollection(user.id);
    },
  });

  const initial = useMemo(() => {
    const p = profileQuery.data;
    return {
      address: (p?.address ?? {}) as AddressBR,
      preferencesText: p?.preferences_text ?? "",
      tags: p?.preference_tags ?? [],
    };
  }, [profileQuery.data]);

  const [address, setAddress] = useState<AddressBR>(initial.address);
  const [preferencesText, setPreferencesText] = useState(initial.preferencesText);
  const [tagsCSV, setTagsCSV] = useState((initial.tags ?? []).join(", "));

  const tags = useMemo(() => parseTagsCSV(tagsCSV), [tagsCSV]);

  // Re-hidrata quando carregar do backend.
  useEffect(() => {
    if (!profileQuery.isSuccess) return;
    setAddress(initial.address);
    setPreferencesText(initial.preferencesText);
    setTagsCSV((initial.tags ?? []).join(", "));
  }, [profileQuery.isSuccess, initial.address, initial.preferencesText, initial.tags]);

  // Hidrata dados do perfil público
  useEffect(() => {
    if (!collectorQuery.isSuccess || !collectorQuery.data) return;
    const cp = collectorQuery.data;
    setUsername(cp.username || "");
    setDisplayName(cp.display_name || "");
    setBio(cp.bio || "");
    setIsPublic(cp.is_public);
  }, [collectorQuery.isSuccess, collectorQuery.data]);

  // Hidrata dados pessoais
  useEffect(() => {
    if (!profileQuery.isSuccess || !profileQuery.data) return;
    const p = profileQuery.data;
    setFullName(p.full_name || "");
    setPhone(p.phone || "");
    setWhatsapp(p.whatsapp || "");
    setCpf(p.cpf || "");
    setBirthDate(p.birth_date || "");
    setEmailNotifications(p.email_notifications ?? true);
    setOrderUpdates(p.order_updates ?? true);
    setMarketingEmails(p.marketing_emails ?? false);
  }, [profileQuery.isSuccess, profileQuery.data]);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const text = preferencesText.trim();
      if (!text) return { tags: [] as string[] };
      return analyzePreferencesWithAI(text);
    },
    onSuccess: (data) => {
      const merged = Array.from(new Set([...parseTagsCSV(tagsCSV), ...(data.tags ?? [])])).slice(
        0,
        40
      );
      setTagsCSV(merged.join(", "));
      toast({
        title: "Preferências analisadas",
        description: "Tags atualizadas com base no seu texto.",
      });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao analisar", description: msg, variant: "destructive" });
    },
  });

  const savePublicProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");

      // Validar username
      if (username.trim()) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!usernameRegex.test(username.trim())) {
          throw new Error("Username deve ter 3-20 caracteres (letras, números, _ ou -)");
        }

        const isAvailable = await checkUsernameAvailability(username.trim(), user.id);
        if (!isAvailable) {
          throw new Error("Este username já está em uso");
        }
      }

      return updateCollectorProfile(user.id, {
        username: username.trim() || null,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        is_public: isPublic,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["collector-profile"] });
      toast({
        title: "Perfil público atualizado",
        description: "Suas configurações foram salvas.",
      });
      setUsernameError("");
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao salvar", description: msg, variant: "destructive" });
      if (msg.includes("username")) {
        setUsernameError(msg);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");

      const parsed = profileSchema.safeParse({
        preferences_text: preferencesText,
        tags: parseTagsCSV(tagsCSV),
        address,
      });

      if (!parsed.success) {
        throw new Error(parsed.error.issues?.[0]?.message ?? "Dados inválidos");
      }

      const cleanAddress = parsed.data.address;
      const cleanText = (parsed.data.preferences_text || "").trim();
      const cleanTags = parsed.data.tags;

      return upsertMyProfile({
        id: user.id,
        address: Object.keys(cleanAddress).length ? cleanAddress : null,
        preferences_text: cleanText || null,
        preference_tags: cleanTags.length ? cleanTags : null,
        full_name: fullName.trim() || null,
        phone: phone.replace(/\D/g, "") || null,
        whatsapp: whatsapp.replace(/\D/g, "") || null,
        cpf: cpf.replace(/\D/g, "") || null,
        birth_date: birthDate || null,
        email_notifications: emailNotifications,
        order_updates: orderUpdates,
        marketing_emails: marketingEmails,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Perfil salvo", description: "Suas informações foram atualizadas." });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao salvar", description: msg, variant: "destructive" });
    },
  });

  return (
    <>
      <SEOHead
        title="Minha Conta"
        description="Gerencie suas preferências, endereço e informações de perfil na Ordax."
        keywords={["perfil", "conta", "preferências", "endereço"]}
        noindex={true}
      />

      <div className="container py-8 sm:py-12 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Minha Conta</h1>
          <p className="text-muted-foreground">Gerencie seu perfil, preferências e coleção</p>

          {/* Indicador de Progresso do Perfil */}
          {profileQuery.data && (
            <div className="mt-6 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completude do Perfil</span>
                <span className="text-sm font-bold text-primary">
                  {profileQuery.data.profile_completion || 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${profileQuery.data.profile_completion || 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Complete seu perfil para desbloquear todos os recursos
              </p>
            </div>
          )}
        </header>

        {/* Layout com Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveSection("info")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "info"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <User className="h-4 w-4" />
                    Conta
                  </button>

                  <button
                    onClick={() => setActiveSection("personal")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "personal"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    Dados Pessoais
                  </button>

                  <button
                    onClick={() => setActiveSection("collector")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "collector"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Trophy className="h-4 w-4" />
                    Perfil Público
                  </button>

                  <button
                    onClick={() => setActiveSection("preferences")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "preferences"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Heart className="h-4 w-4" />
                    Preferências
                  </button>

                  <button
                    onClick={() => setActiveSection("address")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "address"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </button>

                  <button
                    onClick={() => setActiveSection("payment")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "payment"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                    Pagamento
                  </button>

                  <button
                    onClick={() => setActiveSection("subscriptions")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "subscriptions"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Package className="h-4 w-4" />
                    Assinaturas
                  </button>

                  <button
                    onClick={() => setActiveSection("support")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "support"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Suporte
                  </button>

                  <button
                    onClick={() => setActiveSection("orders")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "orders"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Package className="h-4 w-4" />
                    Meus Pedidos
                  </button>

                  <button
                    onClick={() => setActiveSection("collection")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "collection"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    Minha Coleção
                  </button>

                  <button
                    onClick={() => setActiveSection("notifications")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === "notifications"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    Notificações
                  </button>
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Conteúdo Principal */}
          <main className="flex-1 min-w-0">
            {activeSection === "info" && <InfoSection user={user} />}
            {activeSection === "personal" && (
              <PersonalDataSection
                profileQuery={profileQuery}
                fullName={fullName}
                setFullName={setFullName}
                phone={phone}
                setPhone={setPhone}
                whatsapp={whatsapp}
                setWhatsapp={setWhatsapp}
                cpf={cpf}
                setCpf={setCpf}
                birthDate={birthDate}
                setBirthDate={setBirthDate}
                saveMutation={saveMutation}
              />
            )}
            {activeSection === "collector" && (
              <CollectorSection
                user={user}
                collectorQuery={collectorQuery}
                badgesQuery={badgesQuery}
                username={username}
                setUsername={setUsername}
                displayName={displayName}
                setDisplayName={setDisplayName}
                bio={bio}
                setBio={setBio}
                isPublic={isPublic}
                setIsPublic={setIsPublic}
                usernameError={usernameError}
                setUsernameError={setUsernameError}
                savePublicProfileMutation={savePublicProfileMutation}
              />
            )}
            {activeSection === "preferences" && (
              <PreferencesSection
                preferencesText={preferencesText}
                setPreferencesText={setPreferencesText}
                tagsCSV={tagsCSV}
                setTagsCSV={setTagsCSV}
                tags={tags}
                analyzeMutation={analyzeMutation}
                saveMutation={saveMutation}
              />
            )}
            {activeSection === "address" && (
              <AddressSection
                address={address}
                setAddress={setAddress}
                saveMutation={saveMutation}
              />
            )}
            {activeSection === "payment" && user?.id && <PaymentSection userId={user.id} />}
            {activeSection === "subscriptions" && user?.id && (
              <SubscriptionSection userId={user.id} />
            )}
            {activeSection === "support" && user?.id && <SupportSection userId={user.id} />}
            {activeSection === "orders" && <OrdersSection userId={user?.id ?? null} />}
            {activeSection === "collection" && user?.id && <CollectionSection userId={user.id} />}
            {activeSection === "notifications" && (
              <NotificationsSection
                emailNotifications={emailNotifications}
                setEmailNotifications={setEmailNotifications}
                orderUpdates={orderUpdates}
                setOrderUpdates={setOrderUpdates}
                marketingEmails={marketingEmails}
                setMarketingEmails={setMarketingEmails}
                saveMutation={saveMutation}
              />
            )}
          </main>
        </div>
      </div>
    </>
  );
}

function MyOrders(props: { userId: string | null }) {
  const { userId } = props;

  const q = useRQ({
    queryKey: ["my-quotes", { userId }],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id,status,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; status: string; created_at: string }>;
    },
  });

  if (!userId) return null;

  if (q.isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  const rows = q.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Você ainda não enviou nenhum pedido.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {rows.map((r) => (
        <div key={r.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Pedido #{r.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
            <Badge variant="secondary" className="border border-border">
              {r.status}
            </Badge>
          </div>
          <ProductionTimeline quoteId={r.id} showHeader={false} />
        </div>
      ))}
    </div>
  );
}

// Componentes de Seção

function InfoSection({ user }: { user: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Informações da Conta
        </CardTitle>
        <CardDescription>Informações básicas da sua conta</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled className="mt-2" />
        </div>
        <div>
          <Label>ID do Usuário</Label>
          <Input value={user?.id ?? ""} disabled className="mt-2 font-mono text-xs" />
        </div>
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Conta criada em{" "}
            {user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CollectorSection({
  user,
  collectorQuery,
  badgesQuery,
  username,
  setUsername,
  displayName,
  setDisplayName,
  bio,
  setBio,
  isPublic,
  setIsPublic,
  usernameError,
  setUsernameError,
  savePublicProfileMutation,
}: any) {
  const collector = collectorQuery.data;
  const badges = badgesQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Status de Colecionador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {collector?.collector_level || 1}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Nível</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">{collector?.collector_xp || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">XP</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">{collector?.pieces_owned || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Peças</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                R$ {(collector?.total_spent || 0).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Investido</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conquistas</CardTitle>
            <CardDescription>Badges que você conquistou</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {badges.map((badge: any) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center text-center p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-medium text-sm">{badge.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{badge.description}</div>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {badge.rarity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Perfil Público */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Perfil Público</CardTitle>
          <CardDescription>Configure como outros usuários veem seu perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-0.5">
              <Label>Perfil Público</Label>
              <p className="text-sm text-muted-foreground">
                Permitir que outros vejam seu perfil e coleção
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {isPublic && collector?.username && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4" />
                <span className="text-muted-foreground">Seu perfil público:</span>
                <Link
                  to={`/profile/${collector.username}`}
                  className="font-medium text-primary hover:underline"
                >
                  ordax.com/profile/{collector.username}
                </Link>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError("");
              }}
              placeholder="seu-username"
              className="mt-2"
              maxLength={20}
            />
            {usernameError && <p className="text-sm text-destructive mt-1">{usernameError}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              3-20 caracteres (letras, números, _ ou -)
            </p>
          </div>

          <div>
            <Label htmlFor="displayName">Nome de Exibição</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu nome"
              className="mt-2"
              maxLength={50}
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você e sua coleção..."
              className="mt-2 min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{bio.length}/500 caracteres</p>
          </div>

          <Button
            onClick={() => savePublicProfileMutation.mutate()}
            disabled={savePublicProfileMutation.isPending}
            className="w-full"
          >
            {savePublicProfileMutation.isPending ? "Salvando..." : "Salvar Perfil Público"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferencesSection({
  preferencesText,
  setPreferencesText,
  tagsCSV,
  setTagsCSV,
  tags,
  analyzeMutation,
  saveMutation,
}: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Preferências
        </CardTitle>
        <CardDescription>
          Conte-nos sobre seus gostos para recomendações personalizadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="preferences">Descreva suas preferências</Label>
          <Textarea
            id="preferences"
            value={preferencesText}
            onChange={(e) => setPreferencesText(e.target.value)}
            placeholder="Ex: Gosto de super-heróis da Marvel, especialmente X-Men e Vingadores. Também curto Star Wars e anime..."
            className="mt-2 min-h-[120px]"
            maxLength={1000}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {preferencesText.length}/1000 caracteres
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => analyzeMutation.mutate()}
              disabled={!preferencesText.trim() || analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? "Analisando..." : "Analisar com IA"}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="tags">Tags de Preferência</Label>
          <Input
            id="tags"
            value={tagsCSV}
            onChange={(e) => setTagsCSV(e.target.value)}
            placeholder="marvel, dc, star-wars, anime..."
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">Separe por vírgula. Máximo 40 tags.</p>
        </div>

        {tags.length > 0 && (
          <div>
            <Label>Tags Ativas ({tags.length}/40)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => setTagsCSV((prev: string) => removeTagFromCSV(prev, tag))}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar Preferências"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AddressSection({ address, setAddress, saveMutation }: any) {
  const { toast } = useToast();
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const searchCep = async (cep: string) => {
    // Remove caracteres não numéricos
    const cleanCep = cep.replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "O CEP deve ter 8 dígitos",
        variant: "destructive",
      });
      return;
    }

    setIsSearchingCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique se o CEP está correto",
          variant: "destructive",
        });
        return;
      }

      // Preenche os campos automaticamente
      setAddress({
        ...address,
        cep: data.cep,
        rua: data.logradouro || address.rua,
        bairro: data.bairro || address.bairro,
        cidade: data.localidade || address.cidade,
        uf: data.uf || address.uf,
        complemento: data.complemento || address.complemento,
      });

      toast({
        title: "Endereço encontrado!",
        description: "Os campos foram preenchidos automaticamente",
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível consultar o CEP. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    setAddress({ ...address, cep: value });

    // Busca automaticamente quando o CEP tiver 8 dígitos
    const cleanCep = value.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      searchCep(value);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Endereço de Entrega
        </CardTitle>
        <CardDescription>Usado para calcular frete e facilitar futuros pedidos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cep">CEP</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="cep"
                value={address.cep ?? ""}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                disabled={isSearchingCep}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => searchCep(address.cep ?? "")}
                disabled={isSearchingCep || !address.cep}
                title="Buscar CEP"
              >
                {isSearchingCep ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Digite o CEP para buscar automaticamente
            </p>
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <Input
              id="uf"
              value={address.uf ?? ""}
              onChange={(e) => setAddress({ ...address, uf: e.target.value })}
              placeholder="SP"
              className="mt-2"
              maxLength={10}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            value={address.cidade ?? ""}
            onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
            placeholder="São Paulo"
            className="mt-2"
            maxLength={80}
          />
        </div>

        <div>
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            value={address.bairro ?? ""}
            onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
            placeholder="Centro"
            className="mt-2"
            maxLength={80}
          />
        </div>

        <div>
          <Label htmlFor="rua">Rua</Label>
          <Input
            id="rua"
            value={address.rua ?? ""}
            onChange={(e) => setAddress({ ...address, rua: e.target.value })}
            placeholder="Rua das Flores"
            className="mt-2"
            maxLength={120}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={address.numero ?? ""}
              onChange={(e) => setAddress({ ...address, numero: e.target.value })}
              placeholder="123"
              className="mt-2"
              maxLength={30}
            />
          </div>
          <div>
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              value={address.complemento ?? ""}
              onChange={(e) => setAddress({ ...address, complemento: e.target.value })}
              placeholder="Apto 45"
              className="mt-2"
              maxLength={120}
            />
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar Endereço"}
        </Button>
      </CardContent>
    </Card>
  );
}

function OrdersSection({ userId }: { userId: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Meus Pedidos
        </CardTitle>
        <CardDescription>Acompanhe o status dos seus pedidos</CardDescription>
      </CardHeader>
      <CardContent>
        <MyOrders userId={userId} />
      </CardContent>
    </Card>
  );
}

function CollectionSection({ userId }: { userId: string }) {
  return (
    <div className="space-y-6">
      <ManagePublicCollection userId={userId} />
    </div>
  );
}
