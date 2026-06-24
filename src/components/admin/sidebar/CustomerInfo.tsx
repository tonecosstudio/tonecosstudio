import { Mail, Phone, User, MapPin, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { buildSafeMailtoHref } from "@/lib/security/safe-open";
import type { CustomerProfile } from "@/hooks/admin/useCustomerSidebar";

interface CustomerInfoProps {
  profile: CustomerProfile | null;
  loading?: boolean;
}

export function CustomerInfo({ profile, loading = false }: CustomerInfoProps) {
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
  const emailHref = profile.email ? buildSafeMailtoHref(profile.email) : null;

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

      {typeof profile.pieces_owned === "number" || typeof profile.total_spent === "number" ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Pecas</div>
            <div className="font-medium">{profile.pieces_owned ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total gasto</div>
            <div className="font-medium">R$ {(profile.total_spent ?? 0).toFixed(2)}</div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {profile.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {emailHref ? (
              <a href={emailHref} className="hover:underline">
                {profile.email}
              </a>
            ) : (
              <span>{profile.email}</span>
            )}
          </div>
        )}
        {profile.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{profile.phone}</span>
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
