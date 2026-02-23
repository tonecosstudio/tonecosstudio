/**
 * CustomerPaymentDetails Component - Simple version
 */

import React from 'react';

interface CustomerPaymentDetailsProps {
  paymentId: string;
  userId?: string;
  onBack?: () => void;
}

export function CustomerPaymentDetails({ 
  paymentId, 
  userId,
  onBack 
}: CustomerPaymentDetailsProps) {
  return (
    <div>
      <h1>Customer Payment Details</h1>
      <p>Payment ID: {paymentId}</p>
      <p>User ID: {userId || 'Not provided'}</p>
      <button onClick={onBack}>Back</button>
    </div>
  );
}