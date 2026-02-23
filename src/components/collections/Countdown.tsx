import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountdownProps {
  targetDate: Date | string;
  className?: string;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function Countdown({ targetDate, className, compact = false }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft());

  function calculateTimeLeft(): TimeLeft | null {
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    const difference = +target - +new Date();
    
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return null;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className={cn("text-green-600 font-semibold", className)}>
        🎉 Disponível agora!
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1 text-sm font-mono", className)}>
        <span className="font-bold">{timeLeft.days}d</span>
        <span className="text-muted-foreground">:</span>
        <span className="font-bold">{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span className="text-muted-foreground">:</span>
        <span className="font-bold">{String(timeLeft.minutes).padStart(2, '0')}m</span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", className)}>
      <div className="flex flex-col items-center">
        <div className="text-3xl md:text-4xl font-bold tabular-nums">
          {timeLeft.days}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {timeLeft.days === 1 ? 'dia' : 'dias'}
        </div>
      </div>
      
      <div className="flex items-center text-2xl text-muted-foreground">:</div>
      
      <div className="flex flex-col items-center">
        <div className="text-3xl md:text-4xl font-bold tabular-nums">
          {String(timeLeft.hours).padStart(2, '0')}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          horas
        </div>
      </div>
      
      <div className="flex items-center text-2xl text-muted-foreground">:</div>
      
      <div className="flex flex-col items-center">
        <div className="text-3xl md:text-4xl font-bold tabular-nums">
          {String(timeLeft.minutes).padStart(2, '0')}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          min
        </div>
      </div>
      
      <div className="flex items-center text-2xl text-muted-foreground">:</div>
      
      <div className="flex flex-col items-center">
        <div className="text-3xl md:text-4xl font-bold tabular-nums">
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          seg
        </div>
      </div>
    </div>
  );
}
