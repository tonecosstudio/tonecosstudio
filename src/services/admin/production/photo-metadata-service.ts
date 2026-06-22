/**
 * Photo Metadata Service
 *
 * Service for managing production photo metadata including customer visibility
 * Task: 4.4.3 Implement photo permissions
 */

import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/admin-rpc-gateway";
import { currentUserHasAdminAccess } from "@/services/auth/current-user";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create photo metadata record
 */
export async function createPhotoMetadata(
  metadata: Omit<PhotoMetadata, "id" | "uploadedAt">,
): Promise<PhotoMetadata> {
  const data = await callAdminRpc<PhotoMetadataRow | null>(
    "admin_create_photo_metadata",
    {
      p_photo_url: metadata.photoUrl,
      p_production_stage_id: metadata.productionStageId,
      p_customer_visible: metadata.customerVisible,
      p_caption: metadata.caption ?? null,
      p_uploaded_by_name: metadata.uploadedByName ?? null,
    },
  );

  if (!data) {
    throw new Error("Failed to create photo metadata: Empty response");
  }

  return mapPhotoMetadata(data);
}

/**
 * Update photo metadata (e.g., toggle customer visibility)
 */
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

  const data = await callAdminRpc<PhotoMetadataRow | null>(
    "admin_update_photo_metadata",
    {
      p_photo_url: photoUrl,
      p_updates: updatePayload,
    },
  );

  if (!data) {
    throw new Error("Failed to update photo metadata: Empty response");
  }

  return mapPhotoMetadata(data);
}

/**
 * Get photos with metadata for a production stage
 * Automatically filters based on user role (admin sees all, customer sees only customer-visible)
 */
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

/**
 * Delete photo metadata
 */
export async function deletePhotoMetadata(photoUrl: string): Promise<void> {
  await callAdminRpc("admin_delete_photo_metadata", {
    p_photo_url: photoUrl,
  });
}

/**
 * Bulk create photo metadata for multiple photos
 */
export async function bulkCreatePhotoMetadata(
  stageId: string,
  photos: Array<{
    url: string;
    customerVisible: boolean;
    caption?: string;
  }>,
  uploaderName?: string,
): Promise<PhotoMetadata[]> {
  const data = await callAdminRpc<PhotoMetadataRow[] | null>(
    "admin_bulk_create_photo_metadata",
    {
      p_production_stage_id: stageId,
      p_photos: photos,
      p_uploaded_by_name: uploaderName ?? null,
    },
  );

  return (data || []).map(mapPhotoMetadata);
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(): Promise<boolean> {
  return currentUserHasAdminAccess();
}
