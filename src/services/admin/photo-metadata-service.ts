/**
 * Photo Metadata Service
 *
 * Service for managing production photo metadata including customer visibility
 * Task: 4.4.3 Implement photo permissions
 */

import { supabase } from "@/integrations/supabase/client";

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

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create photo metadata record
 */
export async function createPhotoMetadata(
  metadata: Omit<PhotoMetadata, "id" | "uploadedAt">
): Promise<PhotoMetadata> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("production_photo_metadata")
    .insert({
      photo_url: metadata.photoUrl,
      production_stage_id: metadata.productionStageId,
      customer_visible: metadata.customerVisible,
      caption: metadata.caption,
      uploaded_by: user?.user?.id,
      uploaded_by_name: metadata.uploadedByName,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create photo metadata: ${error.message}`);
  }

  return {
    id: data.id,
    photoUrl: data.photo_url,
    productionStageId: data.production_stage_id,
    customerVisible: data.customer_visible,
    caption: data.caption,
    uploadedBy: data.uploaded_by,
    uploadedByName: data.uploaded_by_name,
    uploadedAt: data.uploaded_at,
  };
}

/**
 * Update photo metadata (e.g., toggle customer visibility)
 */
export async function updatePhotoMetadata(
  photoUrl: string,
  updates: Partial<Pick<PhotoMetadata, "customerVisible" | "caption">>
): Promise<PhotoMetadata> {
  const { data, error } = await supabase
    .from("production_photo_metadata")
    .update({
      customer_visible: updates.customerVisible,
      caption: updates.caption,
    })
    .eq("photo_url", photoUrl)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update photo metadata: ${error.message}`);
  }

  return {
    id: data.id,
    photoUrl: data.photo_url,
    productionStageId: data.production_stage_id,
    customerVisible: data.customer_visible,
    caption: data.caption,
    uploadedBy: data.uploaded_by,
    uploadedByName: data.uploaded_by_name,
    uploadedAt: data.uploaded_at,
  };
}

/**
 * Get photos with metadata for a production stage
 * Automatically filters based on user role (admin sees all, customer sees only customer-visible)
 */
export async function getStagePhotosWithMetadata(
  stageId: string
): Promise<PhotoWithMetadata[]> {
  const { data, error } = await supabase.rpc("get_stage_photos_with_metadata", {
    p_stage_id: stageId,
  });

  if (error) {
    throw new Error(`Failed to get photos with metadata: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    url: item.photo_url,
    customerVisible: item.customer_visible,
    caption: item.caption,
    uploadedByName: item.uploaded_by_name,
    uploadedAt: item.uploaded_at,
  }));
}

/**
 * Delete photo metadata
 */
export async function deletePhotoMetadata(photoUrl: string): Promise<void> {
  const { error } = await supabase
    .from("production_photo_metadata")
    .delete()
    .eq("photo_url", photoUrl);

  if (error) {
    throw new Error(`Failed to delete photo metadata: ${error.message}`);
  }
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
  uploaderName?: string
): Promise<PhotoMetadata[]> {
  const { data: user } = await supabase.auth.getUser();

  const records = photos.map((photo) => ({
    photo_url: photo.url,
    production_stage_id: stageId,
    customer_visible: photo.customerVisible,
    caption: photo.caption,
    uploaded_by: user?.user?.id,
    uploaded_by_name: uploaderName,
  }));

  const { data, error } = await supabase
    .from("production_photo_metadata")
    .insert(records)
    .select();

  if (error) {
    throw new Error(`Failed to bulk create photo metadata: ${error.message}`);
  }

  return (data || []).map((item) => ({
    id: item.id,
    photoUrl: item.photo_url,
    productionStageId: item.production_stage_id,
    customerVisible: item.customer_visible,
    caption: item.caption,
    uploadedBy: item.uploaded_by,
    uploadedByName: item.uploaded_by_name,
    uploadedAt: item.uploaded_at,
  }));
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) return false;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.user.id)
    .eq("role", "admin")
    .single();

  if (error) return false;
  return !!data;
}
