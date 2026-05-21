import { useState } from "react";
import { log } from "@/lib/logger";
import { FORM_RATE_LIMITS } from "@/lib/security/sanitization-config";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { useAuth } from "@/lib/auth";
import { submitCustomerContact } from "@/services/customer/contact-service";

interface ContactFormSubmissionData {
  name: string;
  message: string;
}

interface UseContactFormSubmissionOptions {
  onRequiresAuth: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function useContactFormSubmission({
  onRequiresAuth,
  onSuccess,
  onError,
}: UseContactFormSubmissionOptions) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitContactForm = async (data: ContactFormSubmissionData) => {
    const rateLimit = checkRateLimit("contact-form-submit", FORM_RATE_LIMITS.contactForm);

    if (!rateLimit.allowed) {
      onError(
        `Limite de requisicoes excedido. Aguarde ${rateLimit.retryAfter}s antes de tentar novamente.`,
      );
      return;
    }

    if (!user) {
      onRequiresAuth();
      return;
    }

    setIsSubmitting(true);

    try {
      await submitCustomerContact({
        userId: user.id,
        name: data.name,
        message: data.message,
      });
      onSuccess();
    } catch (error) {
      log.error("Error submitting contact form", { error, userId: user.id });
      onError("Erro ao enviar mensagem. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitContactForm, isSubmitting };
}
