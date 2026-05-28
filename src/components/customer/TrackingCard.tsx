/**
 * TrackingCard Component
 * 
 * Displays shipping tracking information for customer orders.
 * Shows tracking code with copy functionality, carrier info, and link to tracking page.
 * 
 * Requirements: 2.4.4 Order Tracking
 * Task: 5.3.1 Create TrackingCard component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Copy, ExternalLink, Package, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { openSafeExternalUrl } from "@/lib/security/safe-open";
import { buildTrackingUrl } from "@/lib/tracking-links";

// ============================================================================
// Types
// ============================================================================

export interface TrackingCardProps {
  trackingCode: string | null;
  trackingCarrier: string | null;
  estimatedDeliveryDate: string | null;
  className?: string;
}

// Carrier configuration with display metadata
const CARRIER_CONFIG: Record<string, { name: string; logo: string }> = {
  correios: {
    name: "Correios",
    logo: "🇧🇷",
  },
  jadlog: {
    name: "Jadlog",
    logo: "📦",
  },
  sedex: {
    name: "Sedex",
    logo: "🇧🇷",
  },
  default: {
    name: "Transportadora",
    logo: "🚚",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get carrier configuration based on carrier name
 */
const getCarrierConfig = (carrier: string | null) => {
  if (!carrier) return CARRIER_CONFIG.default;
  
  const normalizedCarrier = carrier.toLowerCase().trim();
  return CARRIER_CONFIG[normalizedCarrier] || CARRIER_CONFIG.default;
};

// ============================================================================
// Main Component
// ============================================================================

export const TrackingCard: React.FC<TrackingCardProps> = ({
  trackingCode,
  trackingCarrier,
  estimatedDeliveryDate,
  className,
}) => {
  // Get carrier configuration
  const carrierConfig = getCarrierConfig(trackingCarrier);

  // Copy tracking code to clipboard
  const handleCopyTrackingCode = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      toast({
        title: "Código Copiado",
        description: "Código de rastreamento copiado para a área de transferência.",
      });
    }
  };

  // Open tracking link in new tab
  const handleOpenTracking = () => {
    if (trackingCode) {
      try {
        const trackingUrl = buildTrackingUrl(trackingCode, trackingCarrier);
        if (!trackingUrl) {
          throw new Error("Invalid tracking code");
        }
        openSafeExternalUrl(trackingUrl);
      } catch {
        toast({
          title: "Link de rastreamento indisponivel",
          description: "Nao foi possivel abrir um link seguro para esta transportadora.",
          variant: "destructive",
        });
      }
    }
  };

  // If no tracking code, show placeholder
  if (!trackingCode) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Rastreamento
          </CardTitle>
          <CardDescription>
            Informações de rastreamento estarão disponíveis após o envio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              O código de rastreamento será disponibilizado assim que seu pedido for enviado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Rastreamento
            </CardTitle>
            <CardDescription>
              Acompanhe seu pedido em tempo real
            </CardDescription>
          </div>
          <Badge variant="default" className="text-sm px-3 py-1">
            Enviado
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tracking Code */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Código de Rastreamento</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-muted rounded font-mono text-sm break-all">
              {trackingCode}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyTrackingCode}
              title="Copiar código"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carrier Information */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <div className="text-3xl" role="img" aria-label={carrierConfig.name}>
            {carrierConfig.logo}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Transportadora</p>
            <p className="font-semibold">{carrierConfig.name}</p>
          </div>
        </div>

        {/* Estimated Delivery Date */}
        {estimatedDeliveryDate && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <Calendar className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Previsão de Entrega</p>
              <p className="font-semibold">
                {format(new Date(estimatedDeliveryDate), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>
        )}

        {/* Track Order Button */}
        <Button
          className="w-full"
          onClick={handleOpenTracking}
        >
          Rastrear Pedido
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground text-center">
          Clique no botão acima para acompanhar seu pedido no site da transportadora.
        </p>
      </CardContent>
    </Card>
  );
};

export default TrackingCard;
