import { adminPaymentsGateway } from "@/services/admin/payments/admin-payments-gateway";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcRecord,
  requireAdminRpcMatchingId,
} from "@/services/admin/rpc/admin-rpc-results";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import { requireTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";
import { createStorageSignedUrl } from "@/services/supabase/storage-client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminSubscriptionVoucher = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  planType: string;
  paymentMethod: string | null;
  status: string;
  paymentStatus: string;
  collectionName: string;
  modelSlugs: string[];
  totalPaid: number;
  createdAt: string;
  voucherUrl: string | null;
  rejectionReason: string | null;
};

type SubscriptionVoucherRow = {
  id: string;
  user_id: string;
  plan_type: string;
  payment_method: string | null;
  status: string;
  payment_status: string;
  collection_id: string | null;
  selected_model_slugs: string[] | null;
  total_paid: number | null;
  created_at: string;
  payment_voucher_path: string | null;
  payment_voucher_url: string | null;
  payment_rejection_reason: string | null;
};

function asSafeLegacyVoucherUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

async function getVoucherUrl(row: SubscriptionVoucherRow): Promise<string | null> {
  if (row.payment_voucher_path) {
    const { data, error } = await createStorageSignedUrl(
      "payment-vouchers",
      row.payment_voucher_path,
      60 * 60,
    );
    if (error) throw new Error(`Não foi possível abrir o comprovante da assinatura ${row.id}.`);
    return data?.signedUrl ?? null;
  }
  return asSafeLegacyVoucherUrl(row.payment_voucher_url);
}

export async function listAdminSubscriptionVouchers(): Promise<AdminSubscriptionVoucher[]> {
  await requireTonecosAdminAccess();

  const { data, error } = await adminPaymentsGateway
    .from("subscriptions")
    .select(
      "id,user_id,plan_type,payment_method,status,payment_status,collection_id,selected_model_slugs,total_paid,created_at,payment_voucher_path,payment_voucher_url,payment_rejection_reason",
    )
    .or("payment_voucher_path.not.is.null,payment_voucher_url.not.is.null")
    .in("payment_status", ["pending", "under_review"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Falha ao carregar comprovantes de assinatura: ${error.message}`);
  const rows = (data ?? []) as unknown as SubscriptionVoucherRow[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const collectionIds = [...new Set(rows.map((row) => row.collection_id).filter((id): id is string => Boolean(id)))];
  const [profilesResult, collectionsResult, voucherUrls] = await Promise.all([
    adminPaymentsGateway.from("profiles").select("id,full_name,email").in("id", userIds),
    collectionIds.length
      ? adminPaymentsGateway.from("collections").select("id,name").in("id", collectionIds)
      : Promise.resolve({ data: [], error: null }),
    Promise.all(rows.map(getVoucherUrl)),
  ]);

  if (profilesResult.error) throw new Error(`Falha ao carregar clientes das assinaturas: ${profilesResult.error.message}`);
  if (collectionsResult.error) throw new Error(`Falha ao carregar coleções das assinaturas: ${collectionsResult.error.message}`);

  const profilesById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
  );
  const collectionsById = new Map(
    (collectionsResult.data ?? []).map((collection) => [collection.id, collection.name]),
  );

  return rows.map((row, index) => {
    const profile = profilesById.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      customerName: profile?.full_name?.trim() || "Cliente",
      customerEmail: profile?.email?.trim() || "E-mail não informado",
      planType: row.plan_type,
      paymentMethod: row.payment_method,
      status: row.status,
      paymentStatus: row.payment_status,
      collectionName: row.collection_id ? collectionsById.get(row.collection_id) ?? "Coleção" : "Coleção",
      modelSlugs: Array.isArray(row.selected_model_slugs)
        ? row.selected_model_slugs.filter((slug): slug is string => typeof slug === "string")
        : [],
      totalPaid: Number(row.total_paid ?? 0),
      createdAt: row.created_at,
      voucherUrl: voucherUrls[index] ?? null,
      rejectionReason: row.payment_rejection_reason,
    };
  });
}

export async function reviewAdminSubscriptionVoucher(input: {
  subscriptionId: string;
  approved: boolean;
  rejectionReason?: string;
  notes?: string;
}): Promise<void> {
  if (!UUID_PATTERN.test(input.subscriptionId)) {
    throw new Error("Assinatura inválida.");
  }

  const reason = input.rejectionReason?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  if (!input.approved && (!reason || reason.length > 500)) {
    throw new Error("Informe um motivo de rejeição de até 500 caracteres.");
  }
  if (notes.length > 1000) throw new Error("As observações devem ter até 1.000 caracteres.");

  const current = await getTonecosCurrentUser();
  if (!current) throw new Error("Entre na sua conta administrativa para continuar.");
  await requireTonecosAdminAccess();

  const result = await callAdminRpc<unknown>("admin_verify_subscription_payment_voucher", {
    p_subscription_id: input.subscriptionId,
    p_approved: input.approved,
    p_rejection_reason: input.approved ? null : reason,
    p_notes: notes || null,
    p_admin_user_id: current.id,
  });
  const response = requireAdminRpcRecord(result, "Subscription payment voucher review");
  const subscription = requireAdminRpcRecord(response.subscription, "Subscription payment voucher review");
  requireAdminRpcMatchingId(subscription.id, input.subscriptionId, "Subscription payment voucher review");

  const expectedPaymentStatus = input.approved ? "paid" : "rejected";
  if (subscription.payment_status !== expectedPaymentStatus) {
    throw new Error("A resposta do servidor não confirmou a revisão do comprovante.");
  }
}
