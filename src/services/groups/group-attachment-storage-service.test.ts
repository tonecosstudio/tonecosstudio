import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGroupAttachmentSignedUrl } from "./group-attachment-storage-service";

const mocks = vi.hoisted(() => ({ createSignedUrl: vi.fn() }));

vi.mock("@/services/supabase/storage-client", () => ({
  createStorageSignedUrl: mocks.createSignedUrl,
}));

const group = "01234567-89ab-cdef-0123-456789abcdef";
const safePath = group + "/photos/character.webp";

describe("group attachment signed URLs — private paths and bounded access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn.example.com/signed/character.webp?token=test" },
      error: null,
    });
  });

  it("uses the one canonical private bucket with a one-hour expiry", async () => {
    await expect(createGroupAttachmentSignedUrl(safePath)).resolves.toBe(
      "https://cdn.example.com/signed/character.webp?token=test",
    );
    expect(mocks.createSignedUrl).toHaveBeenCalledExactlyOnceWith(
      "group-attachments", safePath, 3600,
    );
  });

  it("passes a caller-specified expiry to the existing signer", async () => {
    await createGroupAttachmentSignedUrl(group + "/invoice.pdf", 120);
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      "group-attachments", group + "/invoice.pdf", 120,
    );
  });

  it.each([
    "",
    "photos/character.webp",
    "/"+group+"/photo.webp",
    group + "/",
    group + "//photo.webp",
    group + "/../secret.webp",
    group + "/photos/../../secret.webp",
    group + "/photo\u0000.webp",
    group + "/photo\n.webp",
    "non-uuid/photo.webp",
  ])("rejects unsafe attachment path %# before requesting a signed URL", async (path) => {
    await expect(createGroupAttachmentSignedUrl(path))
      .rejects.toThrow("Invalid group attachment path");
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("accepts an uppercase UUID without weakening path isolation", async () => {
    const upper = group.toUpperCase() + "/photo.webp";
    await createGroupAttachmentSignedUrl(upper);
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      "group-attachments", upper, 3600,
    );
  });

  it.each([
    { data: null, error: null },
    { data: { signedUrl: "" }, error: null },
    { data: null, error: { message: "permission denied" } },
    { data: { signedUrl: "https://example.com/unused" }, error: { message: "forbidden" } },
  ])("never manufactures signed links when storage refuses access %#", async (response) => {
    mocks.createSignedUrl.mockResolvedValueOnce(response);
    await expect(createGroupAttachmentSignedUrl(safePath))
      .rejects.toThrow("Failed to generate group attachment access URL");
  });
});
