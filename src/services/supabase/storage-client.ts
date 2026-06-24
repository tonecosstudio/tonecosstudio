import { supabase } from "@/integrations/supabase/client";

export function getPublicStorageUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function createStorageSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number,
) {
  return supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
}

export async function uploadStorageFile(
  bucket: string,
  path: string,
  file: Blob,
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  },
) {
  return supabase.storage.from(bucket).upload(path, file, options);
}

export async function removeStorageFiles(bucket: string, paths: string[]) {
  return supabase.storage.from(bucket).remove(paths);
}

export async function listStorageFiles(
  bucket: string,
  path: string,
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: {
      column?: string;
      order?: string;
    };
    search?: string;
  },
) {
  return supabase.storage.from(bucket).list(path, options);
}
