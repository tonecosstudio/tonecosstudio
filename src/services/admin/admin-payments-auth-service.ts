import { adminPaymentsGateway } from "@/services/admin/admin-payments-gateway";

export async function getCurrentAdminPaymentsUserId(): Promise<string | undefined> {
  const {
    data: { user },
  } = await adminPaymentsGateway.auth.getUser();
  return user?.id;
}
