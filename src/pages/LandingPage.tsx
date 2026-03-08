import { useNavigate } from 'react-router-dom';
import { ArrowRight, Crosshair, Shield, Zap, Eye, Trophy, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef } from 'react';
import SEOHead from '@/components/SEOHead';

// ─── Metal Slug–Inspired Arcade Landing ─────────────────────────────

function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 0%) 2px, hsl(0 0% 0%) 4px)',
      }}
    />
  );
}

function PixelBorder({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute -inset-[2px] bg-gold-accent opacity-80" style={{ clipPath: 'polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))' }} />
      <div className="relative bg-background">
        {children}
      </div>
    </div>
  );
}

function GlitchText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="absolute top-0 left-[2px] text-[hsl(0,100%,50%)] opacity-40 animate-[glitch1_3s_infinite]" aria-hidden="true">{text}</span>
      <span className="absolute top-0 left-[-2px] text-[hsl(200,100%,50%)] opacity-40 animate-[glitch2_3s_infinite]" aria-hidden="true">{text}</span>
      <span className="relative">{text}</span>
    </span>
  );
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      <span className="animate-[blink_1s_step-end_infinite] border-r-2 border-gold-accent ml-0.5">&nbsp;</span>
    </span>
  );
}

function StatCounter({ value, label, icon: Icon }: { value: string; label: string; icon: React.ElementType }) {
  return (
    <div className="text-center group">
      <div className="w-16 h-16 mx-auto mb-3 border-2 border-gold-accent/50 bg-background/50 flex items-center justify-center group-hover:border-gold-accent group-hover:bg-gold-accent/10 transition-all duration-300">
        <Icon className="h-7 w-7 text-gold-accent" />
      </div>
      <p className="font-military text-3xl tracking-wider text-foreground">{value}</p>
      <p className="font-pixel text-[8px] text-muted-foreground mt-1 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function MissionCard({ title, description, number, icon: Icon }: { title: string; description: string; number: string; icon: React.ElementType }) {
  return (
    <div className="group relative border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:border-gold-accent/60 transition-all duration-500 overflow-hidden">
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-gold-accent/40 group-hover:border-gold-accent transition-colors" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-gold-accent/40 group-hover:border-gold-accent transition-colors" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-gold-accent/40 group-hover:border-gold-accent transition-colors" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-gold-accent/40 group-hover:border-gold-accent transition-colors" />

      <div className="flex items-start gap-4">
        <span className="font-pixel text-[10px] text-gold-accent/60">{number}</span>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Icon className="h-5 w-5 text-gold-accent" />
            <h3 className="font-military text-2xl tracking-wide text-foreground">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Hover scan line */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" 
        style={{ background: 'linear-gradient(transparent 50%, hsl(var(--gold-accent) / 0.02) 50%)', backgroundSize: '100% 4px' }} 
      />
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <SEOHead
        title="ORDAX — Colecionáveis Premium de Elite"
        description="Plataforma de colecionáveis artesanais premium. Escolha, acompanhe e colecione peças exclusivas feitas à mão."
        keywords={["colecionáveis", "premium", "artesanal", "metal slug", "figuras", "estátuas"]}
        type="website"
      />

      <ScanlineOverlay />

      {/* ═══ HERO SECTION ═══ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Animated grid background */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--gold-accent) / 0.3) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--gold-accent) / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, hsl(var(--gold-accent)), transparent 70%)' }}
        />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Mission badge */}
          <div className="inline-flex items-center gap-2 border border-gold-accent/30 bg-gold-accent/5 px-4 py-2 mb-8 animate-fade-in">
            <div className="w-2 h-2 bg-gold-accent rounded-full animate-pulse" />
            <span className="font-pixel text-[9px] text-gold-accent tracking-[0.3em] uppercase">
              Mission Active • Squad Online
            </span>
          </div>

          {/* Main title */}
          <h1 className="mb-6">
            <span className="block font-military text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] tracking-[0.15em] leading-none text-foreground" style={{ textShadow: '0 0 60px hsl(var(--gold-accent) / 0.15)' }}>
              <GlitchText text="ORDAX" />
            </span>
            <span className="block font-pixel text-[10px] sm:text-xs text-gold-accent tracking-[0.5em] mt-4 uppercase">
              Collectibles Arsenal
            </span>
          </h1>

          {/* Subtitle typewriter */}
          <div className="h-8 mb-10">
            <p className="font-pixel text-[9px] sm:text-[10px] text-muted-foreground tracking-wider">
              <TypewriterText text=">> PEÇAS PREMIUM ARTESANAIS. FEITAS À MÃO. SOB ENCOMENDA." delay={800} />
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              onClick={() => navigate('/colecoes')}
              size="lg"
              className="group relative bg-gold-accent text-background hover:bg-gold-accent/90 font-military text-xl tracking-[0.15em] h-14 px-10 border-0 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--gold-accent)/0.3)]"
            >
              <Crosshair className="mr-3 h-5 w-5 group-hover:animate-spin" style={{ animationDuration: '3s' }} />
              EXPLORAR COLEÇÕES
              <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              onClick={() => navigate('/catalogo')}
              variant="outline"
              size="lg"
              className="font-military text-xl tracking-[0.15em] h-14 px-10 border-gold-accent/30 text-gold-accent hover:bg-gold-accent/10 hover:border-gold-accent/60 transition-all duration-300"
            >
              <Eye className="mr-3 h-5 w-5" />
              VER CATÁLOGO
            </Button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <StatCounter value="150+" label="Modelos" icon={Trophy} />
            <StatCounter value="100%" label="Artesanal" icon={Shield} />
            <StatCounter value="12" label="Estágios" icon={Zap} />
            <StatCounter value="∞" label="Detalhes" icon={Eye} />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-[bounce_2s_ease-in-out_infinite]">
          <span className="font-pixel text-[7px] text-muted-foreground tracking-widest">SCROLL</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Horizontal rule with pixel corners */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-accent/30 to-transparent" />
      </section>

      {/* ═══ MISSION BRIEFING ═══ */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <span className="font-pixel text-[9px] text-gold-accent tracking-[0.4em] uppercase">Mission Briefing</span>
            <h2 className="font-military text-5xl sm:text-6xl tracking-[0.1em] text-foreground mt-4">
              COMO FUNCIONA
            </h2>
            <div className="w-24 h-[2px] bg-gold-accent/40 mx-auto mt-4" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <MissionCard
              number="01"
              title="ESCOLHA SUA PEÇA"
              description="Navegue pelo arsenal de personagens e coleções. Cada modelo é único, produzido com resina de alta qualidade e pintura artística profissional."
              icon={Crosshair}
            />
            <MissionCard
              number="02"
              title="ASSINE OU COMPRE"
              description="Monte sua squad! Assine uma coleção para receber peças mensais ou compre avulso o personagem que quiser. Você no controle."
              icon={Shield}
            />
            <MissionCard
              number="03"
              title="ACOMPANHE EM TEMPO REAL"
              description="12 estágios de produção com fotos de cada etapa. Da impressão 3D até a pintura final — total transparência no processo."
              icon={Eye}
            />
            <MissionCard
              number="04"
              title="RECEBA EM CASA"
              description="Embalagem premium com proteção reforçada. Sua peça chega em segurança, pronta para entrar na coleção. Mission Complete!"
              icon={Trophy}
            />
          </div>
        </div>
      </section>

      {/* ═══ CALL TO ACTION ═══ */}
      <section className="relative py-24 px-6">
        {/* Top border */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-accent/20 to-transparent" />

        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-destructive/30 bg-destructive/5 px-4 py-2 mb-8">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            <span className="font-pixel text-[8px] text-destructive tracking-[0.2em] uppercase">Vagas Limitadas</span>
          </div>

          <h2 className="font-military text-5xl sm:text-7xl tracking-[0.1em] text-foreground mb-6">
            READY PLAYER?
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Entre para o esquadrão de colecionadores. Peças exclusivas, produção artesanal e 
            acompanhamento total do seu pedido.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              className="group bg-gold-accent text-background hover:bg-gold-accent/90 font-military text-2xl tracking-[0.15em] h-16 px-12 transition-all duration-300 hover:shadow-[0_0_40px_hsl(var(--gold-accent)/0.4)]"
            >
              <Zap className="mr-3 h-6 w-6" />
              INSERT COIN
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </div>

          {/* Bottom pixel art decoration */}
          <div className="mt-16 flex items-center justify-center gap-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="h-1 bg-gold-accent/20"
                style={{ width: `${Math.sin(i * 0.4) * 8 + 10}px`, opacity: 0.1 + Math.sin(i * 0.3) * 0.15 }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-military text-2xl tracking-[0.2em] text-foreground">ORDAX</span>
            <span className="font-pixel text-[7px] text-muted-foreground">v2.0</span>
          </div>

          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/sobre')} className="font-pixel text-[8px] text-muted-foreground hover:text-gold-accent tracking-wider transition-colors uppercase">
              Sobre
            </button>
            <button onClick={() => navigate('/contato')} className="font-pixel text-[8px] text-muted-foreground hover:text-gold-accent tracking-wider transition-colors uppercase">
              Contato
            </button>
            <button onClick={() => navigate('/termos')} className="font-pixel text-[8px] text-muted-foreground hover:text-gold-accent tracking-wider transition-colors uppercase">
              Termos
            </button>
            <button onClick={() => navigate('/privacidade')} className="font-pixel text-[8px] text-muted-foreground hover:text-gold-accent tracking-wider transition-colors uppercase">
              Privacidade
            </button>
          </nav>

          <p className="font-pixel text-[7px] text-muted-foreground/50 tracking-wider">
            © {new Date().getFullYear()} TONECOS STUDIOS
          </p>
        </div>
      </footer>
    </div>
  );
}
