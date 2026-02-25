import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealtimeIndicatorProps {
  isConnected?: boolean;
  lastUpdate?: Date;
  className?: string;
}

export function RealtimeIndicator({
  isConnected = true,
  lastUpdate,
  className,
}: RealtimeIndicatorProps) {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>("");

  useEffect(() => {
    if (!lastUpdate) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = now.getTime() - lastUpdate.getTime();
      const seconds = Math.floor(diff / 1000);

      if (seconds < 60) {
        setTimeSinceUpdate(`${seconds}s atrás`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeSinceUpdate(`${minutes}m atrás`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeSinceUpdate(`${hours}h atrás`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant={isConnected ? "default" : "destructive"}
        className={cn("gap-1.5", isConnected && "bg-green-500 hover:bg-green-600")}
      >
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Ao vivo
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Desconectado
          </>
        )}
      </Badge>
      {lastUpdate && isConnected && (
        <span className="text-xs text-muted-foreground">Atualizado {timeSinceUpdate}</span>
      )}
    </div>
  );
}
