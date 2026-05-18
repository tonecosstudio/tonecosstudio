export const NOTIFICATION_ROUTES = {
  adminPayments: "/admin/payments",
  adminPaymentsPending: "/admin/payments?status=pending",
  adminPaymentsUnderReview: "/admin/payments?status=under_review",
  myPayments: "/my-payments",
  myPaymentsRequiresInfo: "/my-payments?status=requires_info",
  support: "/support",
} as const;
