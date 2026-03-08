import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { useSanitizedForm } from "@/hooks/useSanitizedInput";
import { Mail, Lock, ArrowRight, User, Phone } from "lucide-react";

// Google Icon Component
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function Login() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = useMemo(() => params.get("next") || "/", [params]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Setup sanitized form for name and email
  const {
    formData,
    setValue,
    getSanitizedData
  } = useSanitizedForm<{
    name: string;
    email: string;
    phone: string;
  }>(
    {
      name: '',
      email: '',
      phone: ''
    },
    {
      name: 'text',
      email: 'email',
      phone: 'phone'
    }
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const sanitizedData = getSanitizedData();
      
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: sanitizedData.email, 
          password 
        });
        if (error) throw error;
        toast({ title: "Bem-vindo de volta!", description: "Login realizado com sucesso." });
        navigate(next);
      } else {
        const { error } = await supabase.auth.signUp({
          email: sanitizedData.email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              email_confirm: false, // Desabilita confirmação por email para evitar rate limit
              full_name: sanitizedData.name,
              phone: sanitizedData.phone
            },
          },
        });
        if (error) {
          // Tratamento específico para erro 429 (Too Many Requests)
          if (error.message.includes("429") || error.message.includes("rate limit")) {
            throw new Error(
              "Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente."
            );
          }
          throw error;
        }
        toast({
          title: "Conta criada com sucesso!",
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
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({
        title: "Erro ao entrar com Google",
        description: msg,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <SEOHead
        title={mode === "login" ? "Entrar" : "Criar Conta"}
        description="Entre na sua conta Ordax para solicitar orçamentos e acompanhar pedidos de colecionáveis premium."
        keywords={["login", "entrar", "criar conta", "cadastro", "ordax"]}
        noindex={true}
      />

      <div className="container py-12 sm:py-20">
        <div className="mx-auto max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background mb-6">
              <span className="text-2xl font-bold">O</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
              {mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "login"
                ? "Entre para acessar seus orçamentos e favoritos"
                : "Crie sua conta para solicitar orçamentos personalizados"}
            </p>
          </div>

          {/* Card */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 sm:p-8">
              {/* Google Login */}
              <div className="space-y-4 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-border hover:bg-muted font-medium"
                  onClick={signInWithGoogle}
                  disabled={isLoading}
                >
                  <GoogleIcon />
                  <span className="ml-2">Continuar com Google</span>
                </Button>
              </div>

              {/* Divisor */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou continue com e-mail</span>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-6">
                {/* Name (only for signup) */}
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nome Completo
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setValue('name', e.target.value)}
                      autoComplete="name"
                      className="h-12 text-base"
                      placeholder="Seu nome completo"
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setValue('email', e.target.value)}
                    autoComplete="email"
                    className="h-12 text-base"
                    placeholder="seu@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Phone (only for signup) */}
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefone (opcional)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setValue('phone', e.target.value)}
                      autoComplete="tel"
                      className="h-12 text-base"
                      placeholder="(00) 00000-0000"
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="h-12 text-base"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  {mode === "signup" && (
                    <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
                  )}
                </div>

                {/* Botão Principal */}
                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-foreground text-background hover:bg-foreground/90 font-medium"
                  disabled={
                    isLoading || !formData.email || !password || (mode === "signup" && password.length < 6)
                  }
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Aguarde...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      {mode === "login" ? "Entrar" : "Criar Conta"}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                {/* Alternar Modo */}
                <div className="pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-border hover:bg-muted"
                    onClick={() => {
                      setMode((m) => (m === "login" ? "signup" : "login"));
                      setPassword("");
                    }}
                    disabled={isLoading}
                  >
                    {mode === "login" ? "Criar nova conta" : "Já tenho conta"}
                  </Button>
                </div>
              </form>

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Ao continuar, você concorda com nossos{" "}
                  <a href="#" className="underline hover:text-foreground">
                    Termos de Uso
                  </a>{" "}
                  e{" "}
                  <a href="#" className="underline hover:text-foreground">
                    Política de Privacidade
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Link Sobre */}
          <div className="mt-6 text-center">
            <a
              href="/sobre"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Saiba mais sobre a Ordax e Tonecos Studios
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
