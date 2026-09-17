import { beforeEach, describe, expect, it, vi } from "vitest";

import { supabase } from "@/integrations/supabase/client";
import { uploadModelImage } from "./admin-collections-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}));

describe("admin-collections-service uploadModelImage", () => {
  const upload = vi.fn();
  const imageFile = { type: "image/png", size: 1024 } as File;

  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload } as never);
  });

  it("uploads safe collection and character images", async () => {
    await uploadModelImage("collections/heroes-123.png", imageFile);
    await uploadModelImage("characters/char-123.webp", { type: "image/webp", size: 1024 } as File);

    expect(upload).toHaveBeenNthCalledWith(
      1,
      "collections/heroes-123.png",
      imageFile,
      undefined,
    );
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("blocks unsafe storage paths", async () => {
    await expect(uploadModelImage("../secret.png", imageFile)).rejects.toThrow(
      "Caminho de imagem invalido"
    );
    await expect(uploadModelImage("collections/bad/name.png", imageFile)).rejects.toThrow(
      "Caminho de imagem invalido"
    );

    expect(upload).not.toHaveBeenCalled();
  });

  it("blocks unsupported image payloads", async () => {
    await expect(
      uploadModelImage("collections/heroes.svg", { type: "image/svg+xml", size: 1024 } as File)
    ).rejects.toThrow("Caminho de imagem invalido");
    await expect(
      uploadModelImage("collections/heroes.png", { type: "image/svg+xml", size: 1024 } as File)
    ).rejects.toThrow("Formato de imagem invalido");
    await expect(
      uploadModelImage("collections/heroes.png", { type: "image/png", size: 5 * 1024 * 1024 + 1 } as File)
    ).rejects.toThrow("Imagem excede o limite de 5MB");

    expect(upload).not.toHaveBeenCalled();
  });
});
