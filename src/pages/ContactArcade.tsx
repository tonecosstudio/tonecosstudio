/**
 * Contato Arcade — estética gaming com formulário integrado.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, AlertCircle, MessageSquare, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { conversationService } from "@/lib/services/conversationService";
import { messageService } from "@/lib/services/messageService";
import { contactFormSchema } from "@/lib/validations/support";
import { useSanitizedForm } from "@/hooks/useSanitizedInput";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { FORM_RATE_LIMITS } from "@/lib/security/sanitization-config";
import {
  ArcadePage,
  ArcadeHero,
  ArcadeSectionTitle,
  ArcadeCard,
  ArcadeCTA,
  FloatingParticles,
} from "@/components/arcade/ArcadeLayout";

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function ContactArcade() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { formData, setValue, getSanitizedData } = useSanitizedForm<ContactFormData>(
    { name: "", email: "", message: "" },
    { name: "text", email: "email", message: "html" }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    values: formData,
  });

  const onSubmit = async (data: ContactFormData) => {
    const rateLimit = checkRateLimit("contact-form-submit", FORM_RATE_LIMITS.contactForm);
    if (!rateLimit.allowed) {
      setError(`Limite excedido. Aguarde ${rateLimit.retryAfter}s.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Faça login para enviar mensagem.");
        setTimeout(() => navigate("/login?returnTo=/contato"), 2000);
        return;
      }

      const sanitizedData = getSanitizedData();
      const conversation = await conversationService.createConversation({
        user_id: user.id,
        subject: `Contato: ${sanitizedData.name}`,
        status: "waiting_admin",
        tags: ["duvida"],
      });

      await messageService.sendMessage({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_type: "customer",
        message: sanitizedData.message,
      });

      navigate("/perfil?section=support");
    } catch {
      setError("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ArcadePage
      title="Contato | ORDAX Comms"
      description="Entre em contato conosco. Canal direto para dúvidas e solicitações."
    >
      <ArcadeHero
        badge="Canal Aberto"
        title="CONTATO"
        subtitle=">> TRANSMITA SUA MENSAGEM."
      />

      <section className="max-w-2xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Transmissão</ArcadeSectionTitle>

        <ArcadeCard hover={false}>
          <div className="p-6 md:p-8 relative overflow-hidden">
            <FloatingParticles />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10">
              {error && (
                <div className="flex items-center gap-3 p-3 border border-[hsl(0,70%,50%)/0.4] bg-[hsl(0,70%,50%)/0.08]">
                  <AlertCircle className="w-4 h-4 text-[hsl(0,70%,60%)] shrink-0" />
                  <span className="font-mono text-[11px] text-[hsl(0,70%,60%)] tracking-wider">{error}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="flex items-center gap-2 font-mono text-[9px] text-[hsl(var(--gold-accent)/0.7)] tracking-widest uppercase mb-2">
                  <User className="w-3 h-3" /> Nome *
                </label>
                <input
                  {...register("name")}
                  value={formData.name}
                  onChange={(e) => setValue("name", e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Seu nome completo"
                  className="w-full h-12 px-4 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-sm tracking-wider placeholder:text-[hsl(0,0%,25%)] focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none transition-colors disabled:opacity-50"
                />
                {errors.name && (
                  <p className="font-mono text-[10px] text-[hsl(0,70%,60%)] mt-1 tracking-wider">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 font-mono text-[9px] text-[hsl(var(--gold-accent)/0.7)] tracking-widest uppercase mb-2">
                  <Mail className="w-3 h-3" /> Email *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setValue("email", e.target.value)}
                  disabled={isSubmitting}
                  placeholder="seu@email.com"
                  className="w-full h-12 px-4 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-sm tracking-wider placeholder:text-[hsl(0,0%,25%)] focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none transition-colors disabled:opacity-50"
                />
                {errors.email && (
                  <p className="font-mono text-[10px] text-[hsl(0,70%,60%)] mt-1 tracking-wider">{errors.email.message}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="flex items-center gap-2 font-mono text-[9px] text-[hsl(var(--gold-accent)/0.7)] tracking-widest uppercase mb-2">
                  <MessageSquare className="w-3 h-3" /> Mensagem *
                </label>
                <textarea
                  {...register("message")}
                  value={formData.message}
                  onChange={(e) => setValue("message", e.target.value)}
                  disabled={isSubmitting}
                  rows={6}
                  placeholder="Descreva sua dúvida ou solicitação..."
                  className="w-full px-4 py-3 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-sm tracking-wider placeholder:text-[hsl(0,0%,25%)] focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none transition-colors resize-none disabled:opacity-50"
                />
                {errors.message && (
                  <p className="font-mono text-[10px] text-[hsl(0,70%,60%)] mt-1 tracking-wider">{errors.message.message}</p>
                )}
              </div>

              {/* Submit */}
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
                    <Send className="w-4 h-4" /> Enviar Transmissão
                  </>
                )}
              </button>
            </form>
          </div>
        </ArcadeCard>

        {/* Info cards */}
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <ArcadeCard>
            <div className="p-5 text-center">
              <Mail className="w-5 h-5 text-[hsl(var(--gold-accent))] mx-auto mb-3" />
              <h3 className="font-mono text-xs text-[hsl(0,0%,80%)] tracking-wider mb-1">Email Direto</h3>
              <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider">contato@ordax.com.br</p>
            </div>
          </ArcadeCard>
          <ArcadeCard>
            <div className="p-5 text-center">
              <MessageSquare className="w-5 h-5 text-[hsl(var(--gold-accent))] mx-auto mb-3" />
              <h3 className="font-mono text-xs text-[hsl(0,0%,80%)] tracking-wider mb-1">Chat no Perfil</h3>
              <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider">Acesse seu perfil para suporte</p>
            </div>
          </ArcadeCard>
        </div>
      </section>

      <ArcadeCTA
        badge="Explore"
        title="VOLTAR AO ARSENAL"
        description="Confira nosso catálogo e coleções disponíveis."
        primaryAction={{ label: "VER CATÁLOGO", href: "/catalogo" }}
        secondaryAction={{ label: "VER COLEÇÕES", href: "/colecoes" }}
      />
    </ArcadePage>
  );
}
