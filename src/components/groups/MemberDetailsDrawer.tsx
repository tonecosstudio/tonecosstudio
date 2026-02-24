import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mail, Phone, User, MapPin, Calendar, Loader2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MemberDetailsDrawerProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileData {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  cpf?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  username?: string;
  display_name?: string;
  collector_level?: number;
}

export function MemberDetailsDrawer({ userId, isOpen, onClose }: MemberDetailsDrawerProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId && isOpen) {
      loadProfile();
    }
  }, [userId, isOpen]);

  const loadProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(profileData);
    } catch (error) {
      console.error("Erro ao carregar dados do membro:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayName = profile?.full_name || profile?.display_name || profile?.username || "Membro";
  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "Data desconhecida";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Informações do Membro</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : profile ? (
          <div className="mt-6 space-y-6">
            {/* Nome e Badge */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-xl">{displayName}</h3>
                {profile.username && profile.username !== displayName && (
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                )}
              </div>
              {profile.collector_level && profile.collector_level > 1 && (
                <Badge variant="secondary">Nível {profile.collector_level}</Badge>
              )}
            </div>

            {/* Informações de Contato */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase">Contato</h4>

              {profile.email && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a href={`mailto:${profile.email}`} className="text-sm hover:underline">
                      {profile.email}
                    </a>
                  </div>
                </div>
              )}

              {profile.phone && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <a href={`tel:${profile.phone}`} className="text-sm hover:underline">
                      {profile.phone}
                    </a>
                  </div>
                </div>
              )}

              {profile.cpf && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">CPF</p>
                    <p className="text-sm">{profile.cpf}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Endereço */}
            {(profile.address || profile.city || profile.state) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">Endereço</h4>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    {profile.address && <p className="text-sm">{profile.address}</p>}
                    {(profile.city || profile.state) && (
                      <p className="text-sm text-muted-foreground">
                        {profile.city}
                        {profile.city && profile.state && ", "}
                        {profile.state}
                        {profile.zip_code && ` - ${profile.zip_code}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data de Cadastro */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Membro desde</p>
                  <p className="text-sm">{memberSince}</p>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="pt-4 space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <a href={`mailto:${profile.email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email
                </a>
              </Button>
              {profile.phone && (
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={`https://wa.me/${profile.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Dados do membro não encontrados
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
