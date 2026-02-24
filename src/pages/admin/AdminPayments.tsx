/**
 * AdminPayments Page
 *
 * Admin page for managing manual payments with dashboard and payment details view.
 *
 * Requirements: 5.1-5.10, 6.1-6.10, 7.1-7.15
 * Task: 13. Visualização de Detalhes de Pagamento Admin
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PaymentDashboard } from "@/components/admin/PaymentDashboard";
import { PaymentDetailsView } from "@/components/admin/PaymentDetailsView";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminPayments() {
  const { paymentId } = useParams<{ paymentId?: string }>();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle viewing a payment
  const handleViewPayment = (id: string) => {
    navigate(`/admin/payments/${id}`);
  };

  // Handle going back to dashboard
  const handleBackToDashboard = () => {
    navigate("/admin/payments");
    setRefreshKey((prev) => prev + 1); // Refresh dashboard when returning
  };

  // Handle payment status change (refresh dashboard)
  const handlePaymentStatusChange = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Pagamentos</h1>
        <p className="text-muted-foreground mt-2">
          {paymentId
            ? "Visualizando detalhes do pagamento"
            : "Dashboard de pagamentos pendentes para revisão"}
        </p>
      </div>

      {paymentId ? (
        <div className="space-y-4">
          <Button variant="outline" onClick={handleBackToDashboard} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Dashboard
          </Button>

          <PaymentDetailsView
            key={paymentId}
            paymentId={paymentId}
            onBack={handleBackToDashboard}
            onStatusChange={handlePaymentStatusChange}
          />
        </div>
      ) : (
        <PaymentDashboard key={refreshKey} onViewPayment={handleViewPayment} />
      )}
    </div>
  );
}
