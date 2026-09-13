/**
 * Photo Metadata Service
 *
 * Service for managing production photo metadata including customer visibility.
 */

import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcRecord,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";
import { currentUserHasAdminAccess } from "@/services/auth/current-user";

export interface PhotoMetadata {
  id?: string;
  photoUrl: string;
  productionStageId: string;
  customerVisible: boolean;
  caption?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedAt?: string;
}

export interface PhotoWithMetadata {
  url: string;
  customerVisible: boolean;
  caption?: string;
  uploadedByName?: string;
  uploadedAt?: string;
}

interface StagePhotoMetadataRow {
  photo_url: string;
  customer_visible: boolean;
  caption: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string | null;
}

interface PhotoMetadataRow extends StagePhotoMetadataRow {
  id: string;
  production_stage_id: string;
  uploaded_by: string | null;
}

interface PhotoMetadataRpcError {
  message: string;
}

interface StagePhotoMetadataRpcClient {
  rpc(
    name: "get_stage_photos_with_metadata",
    args: { p_stage_id: string },
  ): Promise<{
    data: StagePhotoMetadataRow[] | null;
    error: PhotoMetadataRpcError | null;
  }>;
}

const stagePhotoMetadataRpc = supabase as unknown as StagePhotoMetadataRpcClient;

function normalizedOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizedPhotoUrl(value: string): string {
  return value.trim();
}

function requirePhotoMetadataRow(value: unknown, operation: string): PhotoMetadataRow {
  const record = requireAdminRpcRecord(value, operation);
  const id = requireAdminRpcUuid(record.id, operation);
  const productionStageId = requireAdminRpcUuid(record.production_stage_id, operation);
  const uploadedBy = record.uploaded_by;

  if (
    typeof record.photo_url !== "string" ||
    !/^https?:\/\//i.test(record.photo_url) ||
    typeof record.customer_visible !== "boolean" ||
    (record.caption !== null && typeof record.caption !== "string") ||
    (uploadedBy !== null && uploadedBy !== undefined && typeof uploadedBy !== "string") ||
    (record.uploaded_by_name !== null &&
      record.uploaded_by_name !== undefined &&
      typeof record.uploaded_by_name !== "string") ||
    typeof record.uploaded_at !== "string" ||
    !record.uploaded_at.trim()
  ) {
    throw new Error(`${operation} returned invalid photo metadata`);
  }

  if (typeof uploadedBy === "string") {
    requireAdminRpcUuid(uploadedBy, operation);
  }

  return {
    id,
    photo_url: record.photo_url,
    production_stage_id: productionStageId,
    customer_visible: record.customer_visible,
    caption: record.caption ?? null,
    uploaded_by: (uploadedBy as string | null | undefined) ?? null,
    uploaded_by_name: (record.uploaded_by_name as string | null | undefined) ?? null,
    uploaded_at: record.uploaded_at,
  };
}

function assertCreatedPhotoMatches(
  row: PhotoMetadataRow,
  input: {
    photoUrl: string;
    productionStageId: string;
    customerVisible: boolean;
    caption?: string;
  },
  operation: string,
): void {
  if (
    row.photo_url !== normalizedPhotoUrl(input.photoUrl) ||
    row.production_stage_id !== input.productionStageId ||
    row.customer_visible !== input.customerVisible ||
    row.caption !== normalizedOptionalText(input.caption)
  ) {
    throw new Error(`${operation} returned inconsistent photo metadata`);
  }
}

function mapPhotoMetadata(item: PhotoMetadataRow): PhotoMetadata {
  return {
    id: item.id,
    photoUrl: item.photo_url,
    productionStageId: item.production_stage_id,
    customerVisible: item.customer_visible,
    caption: item.caption ?? undefined,
    uploadedBy: item.uploaded_by ?? undefined,
    uploadedByName: item.uploaded_by_name ?? undefined,
    uploadedAt: item.uploaded_at ?? undefined,
  };
}

export async function createPhotoMetadata(
  metadata: Omit<PhotoMetadata, "id" | "uploadedAt">,
): Promise<PhotoMetadata> {
  const operation = "Photo metadata creation";
  const data = await callAdminRpc<unknown>("admin_create_photo_metadata", {
    p_photo_url: metadata.photoUrl,
    p_production_stage_id: metadata.productionStageId,
    p_customer_visible: metadata.customerVisible,
    p_caption: metadata.caption ?? null,
    p_uploaded_by_name: metadata.uploadedByName ?? null,
  });
  const row = requirePhotoMetadataRow(data, operation);

  assertCreatedPhotoMatches(row, metadata, operation);
  return mapPhotoMetadata(row);
}

export async function updatePhotoMetadata(
  photoUrl: string,
  updates: Partial<Pick<PhotoMetadata, "customerVisible" | "caption">>,
): Promise<PhotoMetadata> {
  const updatePayload: Record<string, string | boolean | null> = {};
  if ("customerVisible" in updates) {
    updatePayload.customer_visible = updates.customerVisible ?? null;
  }
  if ("caption" in updates) {
    updatePayload.caption = updates.caption ?? null;
  }

  const operation = "Photo metadata update";
  const data = await callAdminRpc<unknown>("admin_update_photo_metadata", {
    p_photo_url: photoUrl,
    p_updates: updatePayload,
  });
  const row = requirePhotoMetadataRow(data, operation);

  if (row.photo_url !== normalizedPhotoUrl(photoUrl)) {
    throw new Error(`${operation} returned metadata for another photo`);
  }

  if (
    "customerVisible" in updates &&
    row.customer_visible !== Boolean(updates.customerVisible)
  ) {
    throw new Error(`${operation} returned an unexpected visibility`);
  }

  if (
    "caption" in updates &&
    row.caption !== normalizedOptionalText(updates.caption)
  ) {
    throw new Error(`${operation} returned an unexpected caption`);
  }

  return mapPhotoMetadata(row);
}

export async function getStagePhotosWithMetadata(
  stageId: string,
): Promise<PhotoWithMetadata[]> {
  const { data, error } = await stagePhotoMetadataRpc.rpc(
    "get_stage_photos_with_metadata",
    {
      p_stage_id: stageId,
    },
  );

  if (error) {
    throw new Error(`Failed to get photos with metadata: ${error.message}`);
  }

  const photos = data ?? [];

  return photos.map((item) => ({
    url: item.photo_url,
    customerVisible: item.customer_visible,
    caption: item.caption ?? undefined,
    uploadedByName: item.uploaded_by_name ?? undefined,
    uploadedAt: item.uploaded_at ?? undefined,
  }));
}

export async function deletePhotoMetadata(photoUrl: string): Promise<void> {
  // The versioned SQL contract intentionally returns void. RPC failure is the
  // confirmation boundary here; requiring non-null data would reject valid deletes.
  await callAdminRpc("admin_delete_photo_metadata", {
    p_photo_url: photoUrl,
  });
}

export async function bulkCreatePhotoMetadata(
  stageId: string,
  photos: Array<{
    url: string;
    customerVisible: boolean;
    caption?: string;
  }>,
  uploaderName?: string,
): Promise<PhotoMetadata[]> {
  const operation = "Bulk photo metadata creation";
  const data = await callAdminRpc<unknown>("admin_bulk_create_photo_metadata", {
    p_production_stage_id: stageId,
    p_photos: photos,
    p_uploaded_by_name: uploaderName ?? null,
  });

  if (!Array.isArray(data) || data.length !== photos.length) {
    throw new Error(`${operation} returned an unexpected result count`);
  }

  return data.map((value, index) => {
    const row = requirePhotoMetadataRow(value, operation);
    const photo = photos[index];

    assertCreatedPhotoMatches(
      row,
      {
        photoUrl: photo.url,
        productionStageId: stageId,
        customerVisible: photo.customerVisible,
        caption: photo.caption,
      },
      operation,
    );

    return mapPhotoMetadata(row);
  });
}

export async function isUserAdmin(): Promise<boolean> {
  return currentUserHasAdminAccess();
}
