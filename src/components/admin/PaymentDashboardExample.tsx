/**
 * PaymentDashboardExample Component
 * 
 * Example page showing the PaymentDashboard component in use.
 * This would typically be integrated into the admin section of the application.
 */

import React from 'react';
import { PaymentDashboard } from './PaymentDashboard';
import { AdminLayout } from './AdminLayout';

export function PaymentDashboardExample() {
  const handleViewPayment = (paymentId: string) => {
    console.log('View payment:', paymentId);
    // In a real app, this would navigate to the payment details page
    alert(`Viewing payment: ${paymentId}`);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-4 md:p-6">
        <PaymentDashboard onViewPayment={handleViewPayment} />
      </div>
    </AdminLayout>
  );
}