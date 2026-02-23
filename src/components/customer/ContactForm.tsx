import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { conversationService } from "@/lib/services/conversationService";
import { messageService } from "@/lib/services/messageService";
import { contactFormSchema } from "@/lib/validations/support";

type ContactFormData = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // User is not authenticated
        // Redirect to login with return URL
        setError(
          "Para entrar em contato, por favor faça login ou crie uma conta."
        );
        setIsSubmitting(false);
        setTimeout(() => {
          navigate("/login?returnTo=/contato");
        }, 2000);
        return;
      }

      // Create conversation with tag 'duvida'
      const conversation = await conversationService.createConversation({
        user_id: user.id,
        subject: `Contato: ${data.name}`,
        status: "waiting_admin",
        tags: ["duvida"],
      });

      // Send initial message
      await messageService.sendMessage({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_type: "customer",
        message: data.message,
      });

      // Redirect to chat
      navigate("/perfil?section=support");
    } catch (err) {
      console.error("Error submitting contact form:", err);
      setError("Erro ao enviar mensagem. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Entre em Contato</CardTitle>
        <CardDescription>
          Preencha o formulário abaixo e entraremos em contato o mais breve possível.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome completo"
              {...register("name")}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register("email")}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              placeholder="Descreva sua dúvida ou solicitação..."
              rows={6}
              {...register("message")}
              disabled={isSubmitting}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
