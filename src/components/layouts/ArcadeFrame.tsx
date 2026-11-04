/**
 * MainLayout - Layout principal da aplicação
 * 
 * Responsável por renderizar header e footer fixos.
 * Todas as páginas são renderizadas dentro deste layout.
 */

import { type PropsWithChildren, type ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PUBLIC_ROUTES } from "@/config/routes";


import { ScanlineOverlay, AnimatedGridBg, ArcadeAnimationStyles } from "@/components/arcade/ArcadeEffects";

export function ArcadeFrame({ children, nav, footer }: PropsWithChildren<{ nav: ReactNode; footer: ReactNode }>) {
  const { pathname } = useLocation();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pathname.replace(/\/$/, "") === PUBLIC_ROUTES.arcadeLab) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[hsl(0,0%,5%)] text-[hsl(0,0%,98%)] relative overflow-x-hidden">
      <ScanlineOverlay />
      <AnimatedGridBg scrollY={scrollY} />
      {nav}
      <main className="relative z-10">
        {children}
      </main>
      {footer}
      <ArcadeAnimationStyles />
    </div>
  );
}
