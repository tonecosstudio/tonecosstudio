import { useCallback } from "react";
import {
  removeProductionPhotoFromStorage,
  uploadProductionPhotoToStorage,
} from "@/services/admin/production-photo-storage-service";

interface UploadPhotoParams {
  bucket: string;
  filePath: string;
  file: File;
}

interface RemovePhotoParams {
  bucket: string;
  photoUrl: string;
}

export function useProductionPhotoStorage() {
  const uploadPhoto = useCallback(
    async ({ bucket, filePath, file }: UploadPhotoParams) =>
      uploadProductionPhotoToStorage({ bucket, filePath, file }),
    []
  );

  const removePhoto = useCallback(
    async ({ bucket, photoUrl }: RemovePhotoParams) =>
      removeProductionPhotoFromStorage({ bucket, photoUrl }),
    []
  );

  return {
    uploadPhoto,
    removePhoto,
  };
}
