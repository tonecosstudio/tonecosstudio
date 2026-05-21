import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSanitizedForm } from "@/hooks/useSanitizedInput";
import { useAuthSessionActions } from "@/hooks/auth/useAuthSessionActions";
import { Mail, Lock, ArrowRight, User, Phone, Shield, Zap } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles, GlitchText } from "@/components/arcade/ArcadeEffects";

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function LoginArcade() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    signInWithGoogleOAuth,
    signInWithPasswordCredentials,
    signUpWithPasswordCredentials,
  } = useAuthSessionActions();
  const [params] = useSearchParams();
  const next = useMemo(() => {
    const raw = params.get("next") || "/";
    // Prevent open redirect: only allow relative paths starting with /
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    return "/";
  }, [params]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { formData, setValue, getSanitizedData } = useSanitizedForm<{
    name: string;
    email: string;
    phone: string;
  }>(
    { name: "", email: "", phone: "" },
    { name: "text", email: "email", phone: "phone" }
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const sanitizedData = getSanitizedData();
      if (mode === "login") {
        await signInWithPasswordCredentials({
          email: sanitizedData.email,
          password,
        });
        toast({ title: "Bem-vindo de volta!", description: "Login realizado com sucesso." });
        navigate(next);
      } else {
        await signUpWithPasswordCredentials({
          email: sanitizedData.email,
          password,
          fullName: sanitizedData.name,
          phone: sanitizedData.phone,
          emailRedirectTo: window.location.origin,
        });
        toast({
          title: "Conta criada!",
          description: "Você já pode entrar com seu e-mail e senha.",
        });
        setMode("login");
        setPassword("");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({
        title: mode === "login" ? "Erro ao entrar" : "Erro ao criar conta",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogleOAuth(`${window.location.origin}${next}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Erro ao entrar com Google", description: msg, variant: "destructive" });
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full h-12 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,18%)] text-[hsl(0,0%,90%)] placeholder:text-[hsl(0,0%,30%)] font-mono text-sm px-4 focus:outline-none focus:border-[hsl(var(--gold-accent))] focus:shadow-[0_0_10px_hsl(var(--gold-accent)/0.15)] transition-all";

  return (
    <Page
      title={mode === "login" ? "Entrar" : "Criar Conta"}
      description="Entre na sua conta Ordax para acessar o sistema."
      keywords={["login", "entrar", "criar conta", "cadastro"]}
    >
      <section className="relative py-16 md:py-24 px-6 overflow-hidden">
        <FloatingParticles />

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--gold-accent)), transparent 70%)" }}
        />

        <div className="relative max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-[hsl(var(--gold-accent)/0.5)] bg-[hsl(var(--gold-accent)/0.05)] mb-6">
              <Shield className="w-8 h-8 text-[hsl(var(--gold-accent))]" />
            </div>
            <h1
              className="text-4xl md:text-5xl font-black tracking-[0.15em] mb-3"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 30px hsl(var(--gold-accent)/0.15)" }}
            >
              <GlitchText text={mode === "login" ? "IDENTIFICAÇÃO" : "NOVO RECRUTA"} />
            </h1>
            <p
              className="text-[hsl(0,0%,45%)] text-[9px] tracking-[0.2em] uppercase"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {mode === "login" ? "» insira suas credenciais «" : "» preencha os dados «"}
            </p>
          </div>

          {/* Card */}
          <ArcadeCard>
            <div className="p-6 md:p-8">
              {/* Google */}
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={isLoading}
                className="w-full h-12 flex items-center justify-center gap-3 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-[hsl(0,0%,80%)] hover:border-[hsl(var(--gold-accent)/0.5)] hover:bg-[hsl(var(--gold-accent)/0.05)] font-mono text-sm uppercase tracking-wider transition-all disabled:opacity-50"
              >
                <GoogleIcon />
                Continuar com Google
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-[hsl(0,0%,15%)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-[hsl(0,0%,7%)] text-[hsl(0,0%,35%)] font-mono text-[10px] tracking-widest uppercase">
                    ou via terminal
                  </span>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-5">
                {mode === "signup" && (
                  <div>
                    <label className="flex items-center gap-2 text-[hsl(0,0%,50%)] font-mono text-[10px] tracking-wider uppercase mb-2">
                      <User className="w-3 h-3" /> Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setValue("name", e.target.value)}
                      placeholder="Seu nome completo"
                      required
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 text-[hsl(0,0%,50%)] font-mono text-[10px] tracking-wider uppercase mb-2">
                    <Mail className="w-3 h-3" /> E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setValue("email", e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="flex items-center gap-2 text-[hsl(0,0%,50%)] font-mono text-[10px] tracking-wider uppercase mb-2">
                      <Phone className="w-3 h-3" /> Telefone (opcional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setValue("phone", e.target.value)}
                      placeholder="(00) 00000-0000"
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 text-[hsl(0,0%,50%)] font-mono text-[10px] tracking-wider uppercase mb-2">
                    <Lock className="w-3 h-3" /> Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    minLength={6}
                    className={inputClass}
                  />
                  {mode === "signup" && (
                    <p className="text-[hsl(0,0%,30%)] font-mono text-[9px] mt-1">Mínimo 6 caracteres</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !formData.email || !password || (mode === "signup" && password.length < 6)}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] font-mono uppercase tracking-[0.15em] text-sm hover:brightness-110 shadow-[0_0_15px_hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_25px_hsl(var(--gold-accent)/0.4)] transition-all disabled:opacity-40 disabled:shadow-none"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processando...
                    </span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      {mode === "login" ? "ACESSAR" : "REGISTRAR"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-4 border-t border-[hsl(0,0%,12%)]">
                  <button
                    type="button"
                    onClick={() => { setMode((m) => (m === "login" ? "signup" : "login")); setPassword(""); }}
                    disabled={isLoading}
                    className="w-full h-11 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.05)] font-mono uppercase tracking-wider text-xs transition-all"
                  >
                    {mode === "login" ? "CRIAR NOVA CONTA" : "JÁ TENHO CONTA"}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-5 border-t border-[hsl(0,0%,12%)] text-center">
                <p className="text-[hsl(0,0%,30%)] font-mono text-[9px] tracking-wider">
                  Ao continuar, você concorda com os{" "}
                  <a href="/termos" className="text-[hsl(var(--gold-accent)/0.7)] hover:text-[hsl(var(--gold-accent))] underline">
                    Termos
                  </a>{" "}
                  e{" "}
                  <a href="/privacidade" className="text-[hsl(var(--gold-accent)/0.7)] hover:text-[hsl(var(--gold-accent))] underline">
                    Privacidade
                  </a>
                </p>
              </div>
            </div>
          </ArcadeCard>
        </div>
      </section>
    </Page>
  );
}
