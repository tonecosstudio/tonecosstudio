/**
 * Cutoff Countdown Component
 * 
 * Displays a countdown timer showing time remaining until the cutoff deadline
 * (day 15 at 23:59:59 Bahia time).
 * 
 * Requirements: 7.4
 */

import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface CutoffCountdownProps {
  /**
   * Callback when cutoff status changes
   */
  onCutoffChange?: (isPassed: boolean) => void;
  
  /**
   * Display variant
   */
  variant?: "default" | "compact" | "alert";
  
  /**
   * Custom className
   */
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

/**
 * Calculate time remaining until cutoff
 */
function calculateTimeRemaining(): TimeRemaining {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Cutoff is day 15 at 23:59:59
  const cutoffDate = new Date(year, month, 15, 23, 59, 59, 999);
  
  const total = cutoffDate.getTime() - now.getTime();
  
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, total };
}

/**
 * Format time remaining as string
 */
function formatTimeRemaining(time: TimeRemaining): string {
  if (time.total <= 0) {
    return "Prazo encerrado";
  }
  
  if (time.days > 0) {
    return `${time.days}d ${time.hours}h ${time.minutes}m`;
  } else if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m`;
  } else {
    return `${time.minutes}m ${time.seconds}s`;
  }
}

/**
 * Get urgency level based on time remaining
 */
function getUrgencyLevel(time: TimeRemaining): "safe" | "warning" | "urgent" | "passed" {
  if (time.total <= 0) return "passed";
  if (time.days === 0 && time.hours < 24) return "urgent";
  if (time.days < 3) return "warning";
  return "safe";
}

export function CutoffCountdown({ 
  onCutoffChange, 
  variant = "default",
  className = "" 
}: CutoffCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(calculateTimeRemaining());
  const [isPassed, setIsPassed] = useState(false);

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      const newTime = calculateTimeRemaining();
      setTimeRemaining(newTime);
      
      const newIsPassed = newTime.total <= 0;
      if (newIsPassed !== isPassed) {
        setIsPassed(newIsPassed);
        onCutoffChange?.(newIsPassed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPassed, onCutoffChange]);

  const urgency = getUrgencyLevel(timeRemaining);
  const formattedTime = formatTimeRemaining(timeRemaining);

  // Compact variant - just the badge
  if (variant === "compact") {
    return (
      <Badge 
        variant={urgency === "passed" ? "destructive" : urgency === "urgent" ? "destructive" : urgency === "warning" ? "secondary" : "outline"}
        className={className}
      >
        <Clock className="w-3 h-3 mr-1" />
        {formattedTime}
      </Badge>
    );
  }

  // Alert variant - full alert box
  if (variant === "alert") {
    if (urgency === "passed") {
      return (
        <Alert variant="destructive" className={className}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Prazo encerrado</strong> - A produção já foi iniciada. Não é mais possível fazer alterações neste mês.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert 
        variant={urgency === "urgent" ? "destructive" : "default"}
        className={className}
      >
        <Clock className="h-4 w-4" />
        <AlertDescription>
          {urgency === "urgent" ? (
            <>
              <strong>Atenção!</strong> Faltam apenas <strong>{formattedTime}</strong> para o prazo final de alterações.
            </>
          ) : (
            <>
              Você tem <strong>{formattedTime}</strong> para fazer alterações antes do início da produção (dia 15 às 23:59).
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Default variant - card with details
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Prazo para Alterações</h3>
      </div>
      
      {urgency === "passed" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive font-medium">
            Prazo encerrado
          </p>
          <p className="text-xs text-muted-foreground">
            A produção já foi iniciada. Alterações serão possíveis novamente no próximo mês.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${
              urgency === "urgent" ? "text-destructive" : 
              urgency === "warning" ? "text-orange-500" : 
              "text-primary"
            }`}>
              {formattedTime}
            </span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {urgency === "urgent" ? (
              <span className="text-destructive font-medium">
                ⚠️ Últimas horas para fazer alterações!
              </span>
            ) : urgency === "warning" ? (
              "Prazo se aproximando. Faça suas alterações em breve."
            ) : (
              "Tempo restante até o dia 15 às 23:59 (horário de Salvador/BA)"
            )}
          </p>
          
          {/* Detailed breakdown */}
          {timeRemaining.days > 0 && (
            <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
              <div>
                <span className="font-medium">{timeRemaining.days}</span> dias
              </div>
              <div>
                <span className="font-medium">{timeRemaining.hours}</span> horas
              </div>
              <div>
                <span className="font-medium">{timeRemaining.minutes}</span> minutos
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to check if before cutoff
 */
export function useIsBeforeCutoff() {
  const [isBeforeCutoff, setIsBeforeCutoff] = useState(true);

  useEffect(() => {
    const checkCutoff = () => {
      const time = calculateTimeRemaining();
      setIsBeforeCutoff(time.total > 0);
    };

    checkCutoff();
    const interval = setInterval(checkCutoff, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return isBeforeCutoff;
}
