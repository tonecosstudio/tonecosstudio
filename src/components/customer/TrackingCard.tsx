import type { ReactNode } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Copy, ExternalLink, Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { buildTrackingUrl } from "@/lib/tracking-links";
import { openSafeExternalUrl } from "@/lib/security/safe-open";
import { cn } from "@/lib/utils";

export interface TrackingCardProps {
  trackingCode: string | null;
  trackingCarrier: string | null;
  estimatedDeliveryDate: string | null;
  className?: string;
}

const CARRIER_CONFIG: Record<string, { name: string; shortCode: string }> = {
  correios: { name: "Correios", shortCode: "BR" },
  jadlog: { name: "Jadlog", shortCode: "JD" },
  sedex: { name: "Sedex", shortCode: "SX" },
  default: { name: "Transportadora", shortCode: "TR" },
};

function getCarrierConfig(carrier: string | null) {
  if (!carrier) return CARRIER_CONFIG.default;

  const normalizedCarrier = carrier.toLowerCase().trim();
  return CARRIER_CONFIG[normalizedCarrier] || CARRIER_CONFIG.default;
}

function InfoBlock({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] p-4",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,10%)] text-[hsl(var(--gold-accent))]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(0,0%,48%)]">
          {label}
        </p>
        <div className="mt-1 text-sm font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}

export function TrackingCard({
  trackingCode,
  trackingCarrier,
  estimatedDeliveryDate,
  className,
}: TrackingCardProps) {
  const carrierConfig = getCarrierConfig(trackingCarrier);

  const handleCopyTrackingCode = () => {
    if (!trackingCode) return;

    navigator.clipboard.writeText(trackingCode);
    toast({
      title: "Código copiado",
      description: "Código de rastreamento copiado para a área de transferência.",
    });
  };

  const handleOpenTracking = () => {
    if (!trackingCode) return;

    try {
      const trackingUrl = buildTrackingUrl(trackingCode, trackingCarrier);
      if (!trackingUrl) throw new Error("Invalid tracking code");
      openSafeExternalUrl(trackingUrl);
    } catch {
      toast({
        title: "Link de rastreamento indisponível",
        description: "Não foi possível abrir um link seguro para esta transportadora.",
        variant: "destructive",
      });
    }
  };

  if (!trackingCode) {
    return (
      <Card
        className={cn(
          "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none",
          className
        )}
      >
        <CardHeader className="border-b border-[hsl(0,0%,12%)]">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
            Rastreamento
          </CardTitle>
          <CardDescription className="text-[hsl(0,0%,58%)]">
            As informações de envio serão liberadas assim que o pedido sair da produção.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-10">
          <div className="text-center text-[hsl(0,0%,58%)]">
            <Package className="mx-auto mb-3 h-12 w-12 text-[hsl(0,0%,32%)]" />
            <p className="text-sm">
              O código de rastreamento será disponibilizado assim que o pedido for enviado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none",
        className
      )}
    >
      <CardHeader className="border-b border-[hsl(0,0%,12%)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
              Rastreamento
            </CardTitle>
            <CardDescription className="mt-2 text-[hsl(0,0%,58%)]">
              Acompanhe a expedição e a previsão final de entrega.
            </CardDescription>
          </div>
          <Badge className="border-violet-500/25 bg-violet-500/12 text-violet-200 hover:bg-violet-500/12">
            Enviado
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        <div className="rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(0,0%,48%)]">
              Código de rastreamento
            </p>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyTrackingCode}
              aria-label="Copiar código"
              title="Copiar código"
              className="border-[hsl(0,0%,18%)] bg-transparent text-[hsl(0,0%,78%)] hover:bg-[hsl(0,0%,10%)] hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <code className="block break-all font-mono text-sm text-white">{trackingCode}</code>
        </div>

        <InfoBlock
          label="Transportadora"
          value={carrierConfig.name}
          icon={
            <span
              role="img"
              aria-label={carrierConfig.name}
              className="font-mono text-xs font-bold tracking-[0.18em]"
            >
              {carrierConfig.shortCode}
            </span>
          }
        />

        {estimatedDeliveryDate ? (
          <InfoBlock
            label="Previsão de entrega"
            value={format(new Date(estimatedDeliveryDate), "dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
            icon={<Calendar className="h-5 w-5" />}
          />
        ) : null}

        <Button className="w-full" onClick={handleOpenTracking}>
          Rastrear Pedido
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>

        <p className="text-center text-xs text-[hsl(0,0%,58%)]">
          Use o link acima para acompanhar a atualização do envio no site da transportadora.
        </p>
      </CardContent>
    </Card>
  );
}

export default TrackingCard;
