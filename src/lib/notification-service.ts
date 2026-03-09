/**
 * Notification Service Stub
 * 
 * Provides a no-op notification service for payment events.
 * Actual notifications are handled by Edge Functions.
 */

interface NotificationService {
  sendPaymentCreated(paymentId: string): Promise<void>;
  sendPaymentApproved(paymentId: string): Promise<void>;
  sendPaymentRejected(paymentId: string, reason: string): Promise<void>;
  sendInfoRequested(paymentId: string, message: string): Promise<void>;
}

const noopService: NotificationService = {
  async sendPaymentCreated() {},
  async sendPaymentApproved() {},
  async sendPaymentRejected() {},
  async sendInfoRequested() {},
};

export function getNotificationService(): NotificationService {
  return noopService;
}
