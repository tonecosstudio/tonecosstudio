import { Page } from "@/components/layouts/Page";
import { ArcadeCard, ArcadeSectionTitle } from "@/components/arcade/ArcadeLayout";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  User, Bell, MapPin, Heart, Settings, CreditCard, Package,
  RefreshCw, MessageSquare, Trophy, ExternalLink, Save, Loader2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  getMyProfile,
  upsertMyProfile,
} from "@/lib/profile";
import {
  getMyCollectorProfile,
  updateCollectorProfile,
  checkUsernameAvailability,
} from "@/lib/collector";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/services/customer/notification-preferences-service";
import {
  PaymentSection,
  NotificationsSection,
  SubscriptionSection,
  SupportSection,
} from "./ProfileSections";
import { profileNavigationConfig } from "@/config/profile-navigation.config";

type SectionId = "info" | "personal" | "collector" | "preferences" | "address" | "subscriptions" | "support" | "orders" | "collection" | "payment" | "notifications";

export default function ProfileArcade() {
  const { user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const sectionFromUrl = searchParams.get("section") as SectionId | null;
  const [activeSection, setActiveSection] = useState<SectionId>(sectionFromUrl || "info");

  useEffect(() => {
    if (sectionFromUrl) setActiveSection(sectionFromUrl);
  }, [sectionFromUrl]);

  // Profile data
  const profileQuery = useQuery({
    queryKey: ["profile", { userId: user?.id ?? null }],
    enabled: Boolean(user?.id),
    queryFn: () => user?.id ? getMyProfile(user.id) : null,
  });

  const collectorQuery = useQuery({
    queryKey: ["collector-profile", { userId: user?.id ?? null }],
    enabled: Boolean(user?.id),
    queryFn: () => user?.id ? getMyCollectorProfile(user.id) : null,
  });

  const notificationPreferencesQuery = useQuery({
    queryKey: ["customer-notification-preferences", { userId: userId ?? null }],
    enabled: Boolean(userId),
    queryFn: fetchNotificationPreferences,
  });

  // Collector profile states
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Personal data states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);

  useEffect(() => {
    if (collectorQuery.data) {
      setUsername(collectorQuery.data.username || "");
      setDisplayName(collectorQuery.data.display_name || "");
      setBio(collectorQuery.data.bio || "");
      setIsPublic(collectorQuery.data.is_public);
    }
  }, [collectorQuery.data]);

  useEffect(() => {
    if (profileQuery.data) {
      setFullName(profileQuery.data.full_name || "");
      setPhone(profileQuery.data.phone || "");
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (notificationPreferencesQuery.data) {
      setEmailNotifications(
        notificationPreferencesQuery.data.item_shipped &&
          notificationPreferencesQuery.data.item_delivered
      );
      setOrderUpdates(notificationPreferencesQuery.data.production_stage_updates);
      setMarketingEmails(notificationPreferencesQuery.data.marketing_emails);
    }
  }, [notificationPreferencesQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");
      return upsertMyProfile({
        id: user.id,
        full_name: fullName.trim() || null,
        phone: phone.replace(/\D/g, "") || null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Perfil salvo", description: "Dados atualizados com sucesso." });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const saveCollectorMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");
      if (username.trim()) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!usernameRegex.test(username.trim())) throw new Error("Username deve ter 3-20 caracteres");
        const available = await checkUsernameAvailability(username.trim(), user.id);
        if (!available) throw new Error("Username já em uso");
      }
      return updateCollectorProfile(user.id, {
        username: username.trim() || undefined,
        display_name: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        is_public: isPublic,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["collector-profile"] });
      toast({ title: "Perfil público atualizado" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
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
      await qc.invalidateQueries({ queryKey: ["customer-notification-preferences"] });
      toast({ title: "Preferencias salvas", description: "Notificacoes atualizadas com sucesso." });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const profile = profileQuery.data;
  const completion = profile?.profile_completion || 0;

  const iconLookup: Record<string, LucideIcon> = {
    User, Star: Trophy, Bell, Settings: Heart, Grid: Settings,
    MapPin, CreditCard, ShoppingBag: Package, RefreshCw, HelpCircle: MessageSquare
  };
  const saveNotificationPreferencesAction = {
    mutate: () => saveNotificationPreferencesMutation.mutate(),
    isPending: saveNotificationPreferencesMutation.isPending,
  };

  return (
    <Page title="Minha Conta | ORDAX" description="Gerencie seu perfil e preferências">
      {/* Hero */}
      <section className="relative py-12 md:py-16 px-6">
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-[hsl(var(--gold-accent))] rounded-full animate-pulse" />
            <span className="font-mono text-[9px] text-[hsl(var(--gold-accent))] tracking-[0.3em] uppercase" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              SOLDIER PROFILE
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-[0.15em] mb-4" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            MINHA CONTA
          </h1>

          {/* XP Bar */}
          <div className="max-w-md">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase">PERFIL COMPLETO</span>
              <span className="font-mono text-sm text-[hsl(var(--gold-accent))] font-bold">{completion}%</span>
            </div>
            <div className="h-2 bg-[hsl(0,0%,12%)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[hsl(var(--gold-accent))] to-[hsl(var(--gold-accent)/0.7)] transition-all duration-1000"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <ArcadeCard hover={false} className="p-4">
              <nav className="space-y-1">
                {profileNavigationConfig.map((section) => (
                  <div key={section.id} className="mb-4">
                    <h3 className="font-mono text-[8px] text-[hsl(var(--gold-accent)/0.5)] tracking-[0.2em] uppercase mb-2 px-2">{section.title}</h3>
                    {section.subSections.map((sub) => {
                      const Icon = sub.icon ? iconLookup[sub.icon] ?? User : User;
                      const sectionMap: Record<string, string> = {
                        info: "info", collector: "collector", notifications: "notifications",
                        preferences: "preferences", collection: "collection", address: "address",
                        payment: "payment", orders: "orders", subscriptions: "subscriptions", support: "support",
                      };
                      const mapped = (sectionMap[sub.id] || sub.id) as SectionId;
                      const isActive = activeSection === mapped;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => setActiveSection(mapped)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-xs font-mono tracking-wider transition-all",
                            isActive
                              ? "bg-[hsl(var(--gold-accent)/0.15)] text-[hsl(var(--gold-accent))] border-l-2 border-[hsl(var(--gold-accent))]"
                              : "text-[hsl(0,0%,50%)] hover:text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,10%)]"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </ArcadeCard>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {activeSection === "info" && (
              <ArcadeCard hover={false} className="p-6">
                <ArcadeSectionTitle>DADOS BÁSICOS</ArcadeSectionTitle>
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase block mb-1">NOME COMPLETO</label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase block mb-1">TELEFONE</label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase block mb-1">EMAIL</label>
                    <Input value={user?.email || ""} disabled className="bg-[hsl(0,0%,6%)] border-[hsl(0,0%,12%)] text-[hsl(0,0%,40%)] font-mono" />
                  </div>
                  <button
                    onClick={() => saveProfileMutation.mutate()}
                    disabled={saveProfileMutation.isPending}
                    className="flex items-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] font-mono uppercase tracking-[0.15em] text-xs h-10 px-6 hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {saveProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    SALVAR
                  </button>
                </div>
              </ArcadeCard>
            )}

            {activeSection === "collector" && (
              <ArcadeCard hover={false} className="p-6">
                <ArcadeSectionTitle>PERFIL PÚBLICO</ArcadeSectionTitle>
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs text-[hsl(0,0%,60%)]">Perfil visível publicamente</span>
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase block mb-1">USERNAME</label>
                    <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="meu_username" className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase block mb-1">NOME DE EXIBIÇÃO</label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase block mb-1">BIO</label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono" />
                  </div>
                  {isPublic && username && (
                    <div className="flex items-center gap-2 text-xs font-mono text-[hsl(var(--gold-accent)/0.7)]">
                      <ExternalLink className="w-3 h-3" />
                      <span>/collector/{username}</span>
                    </div>
                  )}
                  <button
                    onClick={() => saveCollectorMutation.mutate()}
                    disabled={saveCollectorMutation.isPending}
                    className="flex items-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] font-mono uppercase tracking-[0.15em] text-xs h-10 px-6 hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {saveCollectorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    SALVAR
                  </button>
                </div>
              </ArcadeCard>
            )}

            {activeSection === "payment" && (
              <ArcadeCard hover={false} className="p-6">
                <ArcadeSectionTitle>PAGAMENTO</ArcadeSectionTitle>
                {userId && <PaymentSection userId={userId} />}
              </ArcadeCard>
            )}

            {activeSection === "notifications" && (
              <ArcadeCard hover={false} className="p-6">
                <ArcadeSectionTitle>NOTIFICAÇÕES</ArcadeSectionTitle>
                <NotificationsSection
                  emailNotifications={emailNotifications}
                  setEmailNotifications={setEmailNotifications}
                  orderUpdates={orderUpdates}
                  setOrderUpdates={setOrderUpdates}
                  marketingEmails={marketingEmails}
                  setMarketingEmails={setMarketingEmails}
                  saveMutation={saveNotificationPreferencesAction}
                />
              </ArcadeCard>
            )}

            {activeSection === "subscriptions" && (
              <ArcadeCard hover={false} className="p-6">
                <ArcadeSectionTitle>ASSINATURAS</ArcadeSectionTitle>
                {userId && <SubscriptionSection userId={userId} />}
              </ArcadeCard>
            )}

            {activeSection === "support" && (
              <ArcadeCard hover={false} className="p-6">
                <ArcadeSectionTitle>SUPORTE</ArcadeSectionTitle>
                {userId && <SupportSection userId={userId} />}
              </ArcadeCard>
            )}

            {/* Fallback for other sections */}
            {!["info", "collector", "payment", "notifications", "subscriptions", "support"].includes(activeSection) && (
              <ArcadeCard hover={false} className="p-6">
                <ArcadeSectionTitle>{activeSection.toUpperCase()}</ArcadeSectionTitle>
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-[hsl(0,0%,20%)] mx-auto mb-4" />
                  <p className="font-mono text-xs text-[hsl(0,0%,40%)] tracking-wider">
                    Seção em construção
                  </p>
                </div>
              </ArcadeCard>
            )}
          </div>
        </div>
      </section>
    </Page>
  );
}
