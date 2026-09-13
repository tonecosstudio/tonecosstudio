import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcIntegerField,
  requireAdminRpcRecord,
} from "@/services/admin/rpc/admin-rpc-results";
import { requireCurrentUserAdminAccess } from "@/services/auth/current-user";
import { groupService } from "@/services/groups/group-service";
import { messageService } from "@/services/support/message-service";
import type {
  CreateGroupInput,
  Group,
  GroupAttachment,
  GroupMessage,
  MembershipCriteria,
} from "@/types/groups";

export interface GroupCollectionOption {
  id: string;
  name: string;
}

export interface GroupMemberProfile {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  cpf?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  username?: string;
  display_name?: string;
  collector_level?: number;
}

export interface GroupCreationFormValues {
  name: string;
  type: CreateGroupInput["type"];
  subscriptionCollectionId?: string;
  subscriptionPlan?: string;
  collectionId?: string;
  launchCriteria?: "all_users" | "previous_buyers";
  orderStatuses?: string[];
  orderDateFrom?: string;
  orderDateTo?: string;
}

export interface GroupRichMessageFields {
  action_button_text?: string;
  action_button_url?: string;
  link_text?: string;
  link_url?: string;
}

export interface ImportGroupMembersResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

interface ImportGroupMembersInput {
  groupId: string;
  importedBy: string;
  file: File;
  onProgress?: (progress: number) => void;
}

interface ProfileLookupRow {
  id: string;
  email: string;
}

function buildMembershipCriteria(
  data: GroupCreationFormValues,
): MembershipCriteria {
  if (data.type === "assinantes") {
    return {
      type: "assinantes",
      subscriptionStatus: "active",
      ...(data.subscriptionCollectionId && {
        collectionId: data.subscriptionCollectionId,
      }),
      ...(data.subscriptionPlan && { plan: data.subscriptionPlan }),
    };
  }

  if (data.type === "colecao") {
    if (!data.collectionId) {
      throw new Error("Selecione uma colecao");
    }

    return {
      type: "colecao",
      collectionId: data.collectionId,
    };
  }

  if (data.type === "lancamentos") {
    if (!data.launchCriteria) {
      throw new Error("Selecione um criterio de lancamento");
    }

    return {
      type: "lancamentos",
      criteria: data.launchCriteria,
    };
  }

  if (data.type === "pedidos") {
    return {
      type: "pedidos",
      ...(data.orderStatuses &&
        data.orderStatuses.length > 0 && { status: data.orderStatuses }),
      ...(data.orderDateFrom && { dateFrom: data.orderDateFrom }),
      ...(data.orderDateTo && { dateTo: data.orderDateTo }),
    };
  }

  return null;
}

function parseImportMembersCsv(csv: string) {
  const lines = csv.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("Arquivo vazio ou invalido");
  }

  const header = lines[0].toLowerCase().split(",");
  const emailIndex = header.findIndex((column) => column.trim() === "email");
  const nameIndex = header.findIndex((column) => column.trim() === "nome");

  if (emailIndex === -1) {
    throw new Error("Coluna 'email' nao encontrada no CSV");
  }

  const members: Array<{ email: string; name?: string }> = [];
  const errors: string[] = [];

  for (let index = 1; index < lines.length; index++) {
    const columns = lines[index].split(",").map((column) => column.trim());
    const email = columns[emailIndex];
    const name = nameIndex !== -1 ? columns[nameIndex] : undefined;

    if (!email || !email.includes("@")) {
      errors.push(`Linha ${index + 1}: Email invalido "${email}"`);
      continue;
    }

    members.push({ email, name });
  }

  return { members, errors };
}

export async function syncAllAutomaticGroups(): Promise<void> {
  try {
    const data = await callAdminRpc<unknown>("sync_all_automatic_groups");
    const result = requireAdminRpcRecord(data, "Automatic group synchronization");

    if (result.success !== true) {
      throw new Error("Automatic group synchronization returned invalid data");
    }

    const summary = requireAdminRpcRecord(
      result.summary,
      "Automatic group synchronization summary",
    );
    const groupsProcessed = requireAdminRpcIntegerField(
      summary,
      "groupsProcessed",
      "Automatic group synchronization",
    );
    requireAdminRpcIntegerField(summary, "totalAdded", "Automatic group synchronization");
    requireAdminRpcIntegerField(summary, "totalRemoved", "Automatic group synchronization");
    const errors = requireAdminRpcIntegerField(
      summary,
      "errors",
      "Automatic group synchronization",
    );

    if (!Array.isArray(result.results) || result.results.length !== groupsProcessed) {
      throw new Error("Automatic group synchronization returned inconsistent results");
    }

    if (errors > 0) {
      throw new Error(`Automatic group synchronization completed with ${errors} error(s)`);
    }
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Erro ao sincronizar grupos",
    );
  }
}

export async function listCollectionsForGroupRules(): Promise<
  GroupCollectionOption[]
> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return (data ?? []) as GroupCollectionOption[];
}

export async function createGroupFromForm(
  data: GroupCreationFormValues,
  createdBy: string,
): Promise<Group> {
  return groupService.createGroup({
    name: data.name,
    type: data.type,
    membership_criteria: buildMembershipCriteria(data),
    created_by: createdBy,
  });
}

export async function getGroupMemberProfile(
  userId: string,
): Promise<GroupMemberProfile> {
  await requireCurrentUserAdminAccess();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as GroupMemberProfile;
}

export async function sendGroupBroadcastMessage(input: {
  groupId: string;
  senderId: string;
  message: string;
  richFields?: GroupRichMessageFields;
  attachments?: File[];
}): Promise<GroupMessage & { attachments: GroupAttachment[] }> {
  return messageService.sendBroadcastMessage(
    input.groupId,
    input.senderId,
    input.message,
    input.richFields,
    input.attachments,
  );
}

export async function importGroupMembersFromCsv({
  groupId,
  importedBy,
  file,
  onProgress,
}: ImportGroupMembersInput): Promise<ImportGroupMembersResult> {
  const { members, errors } = parseImportMembersCsv(await file.text());
  const batchSize = 50;
  let successCount = 0;
  let failedCount = 0;

  for (let index = 0; index < members.length; index += batchSize) {
    const batch = members.slice(index, index + batchSize);

    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email")
      .in(
        "email",
        batch.map((member) => member.email),
      );

    if (usersError) {
      errors.push(`Erro ao buscar usuarios: ${usersError.message}`);
      failedCount += batch.length;
      continue;
    }

    const emailToUserId = new Map(
      ((users ?? []) as ProfileLookupRow[]).map((user) => [
        user.email,
        user.id,
      ]),
    );

    const userIdsToAdd = [
      ...new Set(
        batch
          .filter((member) => emailToUserId.has(member.email))
          .map((member) => emailToUserId.get(member.email)!),
      ),
    ];

    if (userIdsToAdd.length > 0) {
      try {
        const importResult = await callAdminRpc<unknown>("admin_add_chat_group_members", {
          p_group_id: groupId,
          p_user_ids: userIdsToAdd,
          p_added_by: importedBy,
        });
        const result = requireAdminRpcRecord(importResult, "Group member import");
        const added = requireAdminRpcIntegerField(result, "added", "Group member import");
        const existing = requireAdminRpcIntegerField(result, "existing", "Group member import");
        const invalid = requireAdminRpcIntegerField(result, "invalid", "Group member import");

        if (added + existing + invalid !== userIdsToAdd.length) {
          throw new Error("Group member import returned inconsistent counts");
        }

        successCount += added + existing;
        failedCount += invalid;
      } catch (error) {
        errors.push(
          `Erro ao adicionar membros: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        );
        failedCount += userIdsToAdd.length;
      }
    }

    batch.forEach((member) => {
      if (!emailToUserId.has(member.email)) {
        errors.push(`Email nao encontrado no sistema: ${member.email}`);
        failedCount++;
      }
    });

    onProgress?.(Math.round(((index + batch.length) / members.length) * 100));
  }

  return {
    total: members.length,
    success: successCount,
    failed: failedCount,
    errors: errors.slice(0, 10),
  };
}
