/**
 * Image compression utility using browser-image-compression
 */
import imageCompression from "browser-image-compression";

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressed = await imageCompression(file, options);
    return new File([compressed], file.name, { type: file.type });
  } catch (error) {
    throw new Error(
      `Image compression failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}
