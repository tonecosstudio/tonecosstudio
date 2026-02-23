import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { ContactForm } from "@/components/customer/ContactForm";

export default function Contact() {
  return (
    <AppShell>
      <SEOHead
        title="Contato - Ordax"
        description="Entre em contato conosco. Estamos aqui para ajudar com suas dúvidas e solicitações."
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Fale Conosco</h1>
            <p className="text-muted-foreground">
              Tem alguma dúvida ou precisa de ajuda? Estamos aqui para você.
            </p>
          </div>
          <ContactForm />
        </div>
      </div>
    </AppShell>
  );
}
