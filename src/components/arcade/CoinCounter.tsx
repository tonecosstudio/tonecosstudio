/**
 * CoinCounter - Contador animado de coins
 */

import { useState, useEffect } from "react";
import { Coins } from "lucide-react";

export function CoinCounter({ balance, isLoading }: { balance: number; isLoading: boolean }) {
  const [displayed, setDisplayed] = useState(0);
  const [sparkle, setSparkle] = useState(false);

  useEffect(() => {
    if (isLoading || balance === displayed) return;
    const step = Math.max(1, Math.floor(Math.abs(balance - displayed) / 20));
    const timer = setInterval(() => {
      setDisplayed((prev) => {
        if (prev < balance) return Math.min(prev + step, balance);
        if (prev > balance) return Math.max(prev - step, balance);
        return prev;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [balance, isLoading, displayed]);

  useEffect(() => {
    if (displayed === balance && balance > 0) {
      setSparkle(true);
      const t = setTimeout(() => setSparkle(false), 600);
      return () => clearTimeout(t);
    }
  }, [displayed, balance]);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 border border-[hsl(var(--gold-accent)/0.5)] bg-[hsl(var(--gold-accent)/0.08)] transition-all duration-300 ${
        sparkle ? "shadow-[0_0_20px_hsl(var(--gold-accent)/0.4)] scale-105" : ""
      }`}
    >
      <Coins className={`w-5 h-5 text-[hsl(var(--gold-accent))] ${sparkle ? "animate-bounce" : ""}`} />
      <span className="font-mono text-lg font-bold text-[hsl(var(--gold-accent))] tracking-wider tabular-nums">
        {isLoading ? "---" : displayed.toLocaleString("pt-BR")}
      </span>
      <span className="font-mono text-[10px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase">
        coins
      </span>
    </div>
  );
}
