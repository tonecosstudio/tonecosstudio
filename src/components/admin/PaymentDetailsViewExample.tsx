/**
 * PaymentDetailsView Example Component
 *
 * Example usage of PaymentDetailsView component with mock data
 * for demonstration and testing purposes.
 */

import React from "react";
import { PaymentDetailsView } from "./PaymentDetailsView";

export function PaymentDetailsViewExample() {
  // Mock payment ID for demonstration
  const mockPaymentId = "123e4567-e89b-12d3-a456-426614174000";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">PaymentDetailsView Example</h1>
      <p className="text-muted-foreground mb-6">
        This is an example of the PaymentDetailsView component with a mock payment ID. In a real
        application, the payment ID would come from URL parameters or state.
      </p>

      <div className="border rounded-lg p-4 bg-muted/50">
        <PaymentDetailsView
          paymentId={mockPaymentId}
          onBack={() => console.log("Back clicked")}
          onStatusChange={() => console.log("Status changed")}
        />
      </div>

      <div className="mt-8 p-4 border rounded-lg bg-card">
        <h2 className="text-lg font-semibold mb-3">Usage Instructions</h2>
        <div className="space-y-3 text-sm">
          <div>
            <h3 className="font-medium">Props:</h3>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>
                <code>paymentId</code> (required): The ID of the payment to display
              </li>
              <li>
                <code>onBack</code> (optional): Callback for back button click
              </li>
              <li>
                <code>onStatusChange</code> (optional): Callback when payment status changes
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium">Features:</h3>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Complete payment information display</li>
              <li>Image gallery for payment proof images with thumbnails</li>
              <li>PDF viewer/download for PDF proofs</li>
              <li>Payment history timeline with status changes</li>
              <li>Audit log showing all admin actions</li>
              <li>Admin action buttons (Approve, Reject, Request Info)</li>
              <li>Linked conversation and entity details</li>
              <li>Responsive design for mobile and desktop</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium">Integration:</h3>
            <p className="mt-1">This component integrates with:</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>
                <code>PaymentService</code> for payment data
              </li>
              <li>
                <code>FileUploadService</code> for signed URLs
              </li>
              <li>
                <code>PaymentActionButtons</code> for admin actions
              </li>
              <li>React Query for data fetching and caching</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
