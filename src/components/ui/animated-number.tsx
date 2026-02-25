import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  enabled?: boolean;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1000,
  prefix = "",
  suffix = "",
  className,
  enabled = true,
}: AnimatedNumberProps) {
  const count = useCountUp({
    end: value,
    duration,
    decimals,
    enabled,
  });

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {count.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
