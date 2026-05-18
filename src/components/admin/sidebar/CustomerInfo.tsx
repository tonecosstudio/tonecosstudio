import { Mail, Phone, User, MapPin, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCustomerProfile } from "@/hooks/admin/useCustomerProfile";

interface CustomerInfoProps {
  userId: string;
}

export function CustomerInfo({ userId }: CustomerInfoProps) {
  const { data: profile, isLoading: loading } = useCustomerProfile(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-sm text-muted-foreground py-4">Dados do cliente nao encontrados</div>;
  }

  const displayName = profile.full_name || profile.display_name || profile.username || "Cliente";
  const memberSince = profile.created_at
    ? format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })
    : "Data desconhecida";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{displayName}</h3>
          {profile.username && profile.username !== displayName && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
        </div>
        {profile.collector_level && profile.collector_level > 1 && (
          <Badge variant="secondary">Nivel {profile.collector_level}</Badge>
        )}
      </div>

      <div className="space-y-2">
        {profile.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${profile.email}`} className="hover:underline">
              {profile.email}
            </a>
          </div>
        )}
        {profile.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${profile.phone}`} className="hover:underline">
              {profile.phone}
            </a>
          </div>
        )}
        {profile.cpf && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>CPF: {profile.cpf}</span>
          </div>
        )}
      </div>

      {(profile.address || profile.city || profile.state) && (
        <div className="space-y-1">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              {profile.address && <div>{profile.address}</div>}
              {(profile.city || profile.state) && (
                <div className="text-muted-foreground">
                  {profile.city}
                  {profile.city && profile.state && ", "}
                  {profile.state}
                  {profile.zip_code && ` - ${profile.zip_code}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
        <Calendar className="h-4 w-4" />
        <span>Cliente desde {memberSince}</span>
      </div>
    </div>
  );
}
