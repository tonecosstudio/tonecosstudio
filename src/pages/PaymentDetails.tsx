/**
 * PaymentDetails Page
 *
 * Customer page for viewing payment details and uploading proof.
 *
 * Requirements: 13.1-13.15
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CustomerPaymentDetails } from "@/components/customer/CustomerPaymentDetails";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Page } from "@/components/layouts/Page";

export default function PaymentDetails() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle going back to my payments
  const handleBackToMyPayments = () => {
    navigate("/pagamentos");
  };

  if (!paymentId) {
    return (
      <Page title="Pagamento não encontrado | ORDAX" description="Detalhes do pagamento">
        <div className="container mx-auto p-4 md:p-6">
          <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-destructive">Pagamento não encontrado</h1>
          <p className="text-muted-foreground mt-2">
            O ID do pagamento não foi fornecido ou é inválido.
          </p>
          <Button variant="outline" onClick={handleBackToMyPayments} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Meus Pagamentos
          </Button>
        </div>
      </div>
      </Page>
    );
  }

  return (
    <Page title="Detalhes do Pagamento | ORDAX" description="Visualize os detalhes do seu pagamento">
      <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Button variant="outline" onClick={handleBackToMyPayments} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Meus Pagamentos
        </Button>

        <h1 className="text-3xl font-bold tracking-tight">Detalhes do Pagamento</h1>
        <p className="text-muted-foreground mt-2">
          Visualize os detalhes do seu pagamento e acompanhe o status.
        </p>
      </div>

      <CustomerPaymentDetails
        paymentId={paymentId}
        userId={user?.id}
        onBack={handleBackToMyPayments}
      />
    </div>
    </Page>
  );
}
