import { submitOrderMigrationRequestRpc } from "@/services/customer-account-mutations-service";

export type OrderMigrationSubmission = {
  fullName: string;
  email: string;
  phone?: string;
  oldOrderNumber?: string;
  orderDescription: string;
};

export async function submitOrderMigrationRequest(submission: OrderMigrationSubmission) {
  await submitOrderMigrationRequestRpc(submission);
}
