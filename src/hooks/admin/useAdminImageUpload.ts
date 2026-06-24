import { useMutation } from "@tanstack/react-query";
import {
  uploadAdminImage,
  type UploadAdminImageInput,
} from "@/services/admin/catalog/admin-image-upload-service";

export function useAdminImageUpload() {
  return useMutation({
    mutationFn: (input: UploadAdminImageInput) => uploadAdminImage(input),
  });
}
