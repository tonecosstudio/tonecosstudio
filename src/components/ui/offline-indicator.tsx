/**
 * OfflineIndicator Component
 * Requirements: 19.1-19.15
 * Task: 26.2 Criar componentes de feedback
 */

import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show reconnected message briefly
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5",
        className
      )}
    >
      <Alert variant={isOnline ? "default" : "destructive"}>
        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <AlertDescription>
          {isOnline
            ? "Conexão restaurada! Você está online novamente."
            : "Você está offline. Algumas funcionalidades podem não estar disponíveis."}
        </AlertDescription>
      </Alert>
    </div>
  );
};
