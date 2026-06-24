import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CreditCard } from "lucide-react";
import { CustomerPaymentDetails } from "@/components/customer/CustomerPaymentDetails";
import { Page } from "@/components/layouts/Page";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { AUTH_ROUTES } from "@/config/routes";

export default function PaymentDetails() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBackToMyPayments = () => {
    navigate(AUTH_ROUTES.payments);
  };

  if (!paymentId) {
    return (
      <Page title="Pagamento nao encontrado | ORDAX" description="Detalhes do pagamento">
        <section className="relative px-6 py-12 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-8 text-center">
              <h1 className="text-2xl font-bold text-destructive">Pagamento nao encontrado</h1>
              <p className="mt-2 text-muted-foreground">
                O identificador do pagamento nao foi fornecido ou e invalido.
              </p>
              <Button variant="outline" onClick={handleBackToMyPayments} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para pagamentos
              </Button>
            </div>
          </div>
        </section>
      </Page>
    );
  }

  return (
    <Page
      title="Detalhes do Pagamento | ORDAX"
      description="Acompanhe status, comprovantes e orientacoes do pagamento."
    >
      <section className="relative px-6 py-12 md:py-16">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-4">
            <Button variant="outline" onClick={handleBackToMyPayments} className="self-start">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para pagamentos
            </Button>

            <div className="rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[hsl(var(--gold-accent))]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent))]">
                  Financeiro
                </span>
              </div>

              <h1
                className="mt-3 text-4xl font-black uppercase tracking-[0.08em] md:text-5xl"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                Pagamento
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[hsl(0,0%,58%)]">
                Consulte status, comprovantes, orientacoes e historico operacional do pagamento em
                uma unica superficie.
              </p>
            </div>
          </div>

          <CustomerPaymentDetails
            paymentId={paymentId}
            userId={user?.id}
            onBack={handleBackToMyPayments}
            showHeader={false}
          />
        </div>
      </section>
    </Page>
  );
}
