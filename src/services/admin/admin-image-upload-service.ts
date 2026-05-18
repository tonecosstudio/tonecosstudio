import { supabase } from "@/integrations/supabase/client";
import { sanitizeFilename } from "@/lib/security/input-sanitizer";

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
  const fileExt = sanitizedName.split(".").pop() || "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return publicUrl;
}
