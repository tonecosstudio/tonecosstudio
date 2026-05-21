import { supabase } from "@/integrations/supabase/client";

interface UploadProductionPhotoParams {
  bucket: string;
  filePath: string;
  file: File;
}

interface RemoveProductionPhotoParams {
  bucket: string;
  photoUrl: string;
}

export async function uploadProductionPhotoToStorage({
  bucket,
  filePath,
  file,
}: UploadProductionPhotoParams): Promise<string> {
  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (uploadError) {
    throw new Error(`Erro no upload: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
}

export async function removeProductionPhotoFromStorage({
  bucket,
  photoUrl,
}: RemoveProductionPhotoParams): Promise<void> {
  const url = new URL(photoUrl);
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
  const filePath = pathMatch?.[1];

  if (!filePath) {
    return;
  }

  const { error: deleteError } = await supabase.storage.from(bucket).remove([filePath]);

  if (deleteError) {
    throw new Error(`Erro ao excluir do storage: ${deleteError.message}`);
  }
}
