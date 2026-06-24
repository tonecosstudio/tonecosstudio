import { generateSecureToken, sanitizeFilename } from "@/lib/security/input-sanitizer";
import { getPublicStorageUrl, uploadStorageFile } from "@/services/supabase/storage-client";

export interface UploadAdminImageInput {
  file: File;
  bucket: string;
  folder: string;
}

export async function uploadAdminImage({
  file,
  bucket,
  folder,
}: UploadAdminImageInput): Promise<string> {
  const sanitizedName = sanitizeFilename(file.name);
  const sanitizedFolder = folder
    .split(/[/\\]+/)
    .map((segment) => sanitizeFilename(segment))
    .filter(Boolean)
    .join("/") || "admin-images";
  const fileExt = sanitizedName.split(".").pop() || "jpg";
  const fileName = `${sanitizedFolder}/${Date.now()}-${generateSecureToken(8)}.${fileExt}`;

  const { error: uploadError } = await uploadStorageFile(bucket, fileName, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) throw uploadError;

  return getPublicStorageUrl(bucket, fileName);
}
