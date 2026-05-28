import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContactFormSubmission } from "@/hooks/customer/useContactFormSubmission";
import { useSanitizedForm } from "@/hooks/useSanitizedInput";
import { contactFormSchema } from "@/lib/validations/support";
import { PUBLIC_ROUTES, loginReturnToPath, profileSectionPath } from "@/config/routes";

type ContactFormData = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { formData, setValue, getSanitizedData } = useSanitizedForm<ContactFormData>(
    {
      name: "",
      email: "",
      message: "",
    },
    {
      name: "text",
      email: "email",
      message: "html",
    },
  );

  const { submitContactForm, isSubmitting } = useContactFormSubmission({
    onRequiresAuth: () => {
      setError("Para entrar em contato, por favor faca login ou crie uma conta.");
      setTimeout(() => {
        navigate(loginReturnToPath(PUBLIC_ROUTES.contact));
      }, 2000);
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
    resolver: zodResolver(contactFormSchema),
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Entre em Contato</CardTitle>
        <CardDescription>
          Preencha o formulario abaixo e entraremos em contato o mais breve possivel.
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
              value={formData.name}
              onChange={(event) => setValue("name", event.target.value)}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register("email")}
              value={formData.email}
              onChange={(event) => setValue("email", event.target.value)}
              disabled={isSubmitting}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              placeholder="Descreva sua duvida ou solicitacao..."
              rows={6}
              {...register("message")}
              value={formData.message}
              onChange={(event) => setValue("message", event.target.value)}
              disabled={isSubmitting}
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
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
