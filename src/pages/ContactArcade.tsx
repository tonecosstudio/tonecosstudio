import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  User,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArcadeCard,
  ArcadeCTA,
  ArcadeHero,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles } from "@/components/arcade/ArcadeEffects";
import { Page } from "@/components/layouts/Page";
import { useContactFormSubmission } from "@/hooks/customer/useContactFormSubmission";
import { useAuth } from "@/lib/auth";
import { useSanitizedForm } from "@/hooks/useSanitizedInput";
import { contactFormSchema } from "@/lib/validations/support";
import {
  PUBLIC_ROUTES,
  loginReturnToPath,
  profileSectionPath,
} from "@/config/routes";
import { CONTACT } from "@/config/constants";

// The authenticated contact service uses account identity; it does not
// accept or persist an arbitrary email field from this public page.
const authenticatedContactFormSchema = contactFormSchema.omit({ email: true });
type ContactFormData = z.infer<typeof authenticatedContactFormSchema>;

export default function ContactArcade() {
  const PREVIEW_READ_ONLY = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const { formData, setValue, getSanitizedData } =
    useSanitizedForm<ContactFormData>(
      { name: "", message: "" },
      { name: "text", message: "html" },
    );

  const { submitContactForm, isSubmitting } = useContactFormSubmission({
    onRequiresAuth: () => {
      setError("Faca login para enviar mensagem.");
      setTimeout(
        () => navigate(loginReturnToPath(PUBLIC_ROUTES.contact)),
        2000,
      );
    },
    onSuccess: () => {
      navigate(profileSectionPath("support"));
    },
    onError: setError,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(authenticatedContactFormSchema),
    values: formData,
  });

  const onSubmit = async () => {
    setError(null);
    const sanitizedData = getSanitizedData();
    await submitContactForm({
      name: sanitizedData.name,
      message: sanitizedData.message,
    });
  };

  return (
    <Page
      title="Contato"
      description="Entre em contato conosco. Canal direto para duvidas e solicitacoes."
    >
      <ArcadeHero
        badge="Canal Aberto"
        title="CONTATO"
        subtitle=">> TRANSMITA SUA MENSAGEM."
      />

      <section className="max-w-2xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Transmissao</ArcadeSectionTitle>

        <ArcadeCard hover={false}>
          <div className="p-6 md:p-8 relative overflow-hidden">
            <FloatingParticles />

            {PREVIEW_READ_ONLY || !user ? (
              <div className="relative z-10 space-y-4 text-center" role="status">
                <h2 className="text-lg font-medium text-[hsl(0,0%,94%)]">
                  {PREVIEW_READ_ONLY ? "CONTATO EM PREPARAÇÃO" : "Atendimento pela sua conta"}
                </h2>
                <p className="text-sm text-[hsl(0,0%,65%)]">
                  {PREVIEW_READ_ONLY
                    ? "Esta prévia é somente leitura e não recebe mensagens. Explore o catálogo enquanto o atendimento é homologado."
                    : "Para enviar uma mensagem ao suporte, entre na sua conta. Assim a equipe poderá acompanhar sua solicitação pelo perfil."}
                </p>
                <Link
                  to={PREVIEW_READ_ONLY ? PUBLIC_ROUTES.catalogModels : loginReturnToPath(PUBLIC_ROUTES.contact)}
                  className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent))] px-5 font-mono text-xs uppercase tracking-[0.1em] text-[hsl(var(--gold-accent))]"
                >
                  {PREVIEW_READ_ONLY ? "EXPLORAR MODELOS" : "Entrar para enviar mensagem"}
                </Link>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5 relative z-10"
              >
                {error && (
                  <div className="flex items-center gap-3 p-3 border border-[hsl(0,70%,50%)/0.4] bg-[hsl(0,70%,50%)/0.08]">
                    <AlertCircle className="w-4 h-4 text-[hsl(0,70%,60%)] shrink-0" />
                    <span className="font-mono text-[11px] text-[hsl(0,70%,60%)] tracking-wider">
                      {error}
                    </span>
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 font-mono text-[9px] text-[hsl(var(--gold-accent)/0.7)] tracking-widest uppercase mb-2">
                    <User className="w-3 h-3" /> Nome *
                  </label>
                  <input
                    {...register("name")}
                    value={formData.name}
                    onChange={(event) => setValue("name", event.target.value)}
                    disabled={isSubmitting}
                    placeholder="Seu nome completo"
                    className="w-full h-12 px-4 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-sm tracking-wider placeholder:text-[hsl(0,0%,25%)] focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none transition-colors disabled:opacity-50"
                  />
                  {errors.name && (
                    <p className="font-mono text-[10px] text-[hsl(0,70%,60%)] mt-1 tracking-wider">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 font-mono text-[9px] text-[hsl(var(--gold-accent)/0.7)] tracking-widest uppercase mb-2">
                    <MessageSquare className="w-3 h-3" /> Mensagem *
                  </label>
                  <textarea
                    {...register("message")}
                    value={formData.message}
                    onChange={(event) => setValue("message", event.target.value)}
                    disabled={isSubmitting}
                    rows={6}
                    placeholder="Descreva sua duvida ou solicitacao..."
                    className="w-full px-4 py-3 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-sm tracking-wider placeholder:text-[hsl(0,0%,25%)] focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none transition-colors resize-none disabled:opacity-50"
                  />
                  {errors.message && (
                    <p className="font-mono text-[10px] text-[hsl(0,70%,60%)] mt-1 tracking-wider">
                      {errors.message.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] hover:brightness-110 font-mono text-xs tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_hsl(var(--gold-accent)/0.2)]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Transmitindo...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Enviar Transmissao
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </ArcadeCard>

        <div
          className={
            CONTACT.CONTACT_EMAIL
              ? "grid sm:grid-cols-2 gap-4 mt-6"
              : "grid gap-4 mt-6"
          }
        >
          {CONTACT.CONTACT_EMAIL ? (
            <ArcadeCard>
              <div className="p-5 text-center">
                <Mail className="w-5 h-5 text-[hsl(var(--gold-accent))] mx-auto mb-3" />
                <h3 className="font-mono text-xs text-[hsl(0,0%,80%)] tracking-wider mb-1">
                  Email Direto
                </h3>
                <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider">
                  {CONTACT.CONTACT_EMAIL}
                </p>
              </div>
            </ArcadeCard>
          ) : null}
          <ArcadeCard>
            <div className="p-5 text-center">
              <MessageSquare className="w-5 h-5 text-[hsl(var(--gold-accent))] mx-auto mb-3" />
              <h3 className="font-mono text-xs text-[hsl(0,0%,80%)] tracking-wider mb-1">
                Chat no Perfil
              </h3>
              <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider">
                Acesse seu perfil para suporte
              </p>
            </div>
          </ArcadeCard>
        </div>
      </section>

      <ArcadeCTA
        badge="Explore"
        title="VOLTAR AO ARSENAL"
        description="Confira o universo publicado e fale com a equipe."
        primaryAction={{ label: "VER UNIVERSO", href: PUBLIC_ROUTES.catalog }}
        secondaryAction={undefined}
      />
    </Page>
  );
}
