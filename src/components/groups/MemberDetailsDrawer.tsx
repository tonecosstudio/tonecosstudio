import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Loader2, Mail, MapPin, MessageSquare, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useGroupMemberProfile } from "@/hooks/groups/useGroupMemberProfile";

interface MemberDetailsDrawerProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberDetailsDrawer({ userId, isOpen, onClose }: MemberDetailsDrawerProps) {
  const { data: profile, isLoading } = useGroupMemberProfile(userId, isOpen);

  const displayName = profile?.full_name || profile?.display_name || profile?.username || "Membro";
  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "Data desconhecida";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Informacoes do Membro</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : profile ? (
          <div className="mt-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-xl">{displayName}</h3>
                {profile.username && profile.username !== displayName && (
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                )}
              </div>
              {profile.collector_level && profile.collector_level > 1 && (
                <Badge variant="secondary">Nivel {profile.collector_level}</Badge>
              )}
            </div>

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

            {(profile.address || profile.city || profile.state) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">Endereco</h4>
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
            Dados do membro nao encontrados
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
