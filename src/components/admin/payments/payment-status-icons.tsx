import type { ReactNode } from "react";
import { AlertCircle, CheckCircle, Clock, Eye, XCircle } from "lucide-react";
import type { PaymentStatus } from "@/types/manual-payment";

export function getPaymentStatusIcon(status: PaymentStatus, className: string): ReactNode {
  switch (status) {
    case "pending":
      return <Clock className={className} />;
    case "under_review":
      return <Eye className={className} />;
    case "requires_info":
      return <AlertCircle className={className} />;
    case "approved":
      return <CheckCircle className={className} />;
    case "rejected":
      return <XCircle className={className} />;
    default:
      return null;
  }
}
