import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  addQuoteProductionPhotoRpc,
  ensureQuoteProductionRpc,
  setQuoteProductionStageRpc,
} from "./production-mutations-service";

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const quoteId = "123e4567-e89b-42d3-a456-426614174010";
const otherQuoteId = "123e4567-e89b-42d3-a456-426614174011";
const productionId = "123e4567-e89b-42d3-a456-426614174012";
const updateId = "123e4567-e89b-42d3-a456-426614174013";
const otherUpdateId = "123e4567-e89b-42d3-a456-426614174014";
const photoId = "123e4567-e89b-42d3-a456-426614174015";
const adminId = "123e4567-e89b-42d3-a456-426614174016";
const photoUrl = "https://cdn.example.com/proof.jpg";

describe("production-mutations-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts quote production only for the requested quote", async () => {
    callAdminRpcMock.mockResolvedValue({
      id: productionId,
      quote_id: quoteId,
      current_stage: "queued",
      started_at: "2026-09-13T12:00:00Z",
      updated_at: "2026-09-13T12:00:00Z",
    });

    await expect(ensureQuoteProductionRpc(quoteId)).resolves.toMatchObject({
      id: productionId,
      quote_id: quoteId,
      current_stage: "queued",
    });
  });

  it.each([
    null,
    {},
    {
      id: "not-a-uuid",
      quote_id: quoteId,
      current_stage: "queued",
      started_at: "2026-09-13T12:00:00Z",
      updated_at: "2026-09-13T12:00:00Z",
    },
    {
      id: productionId,
      quote_id: otherQuoteId,
      current_stage: "queued",
      started_at: "2026-09-13T12:00:00Z",
      updated_at: "2026-09-13T12:00:00Z",
    },
    {
      id: productionId,
      quote_id: quoteId,
      current_stage: "invalid",
      started_at: "2026-09-13T12:00:00Z",
      updated_at: "2026-09-13T12:00:00Z",
    },
  ])("rejects malformed quote production data %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);

    await expect(ensureQuoteProductionRpc(quoteId)).rejects.toThrow(
      "Quote production did not return matching data",
    );
  });

  it("requires a valid update id when changing production stage", async () => {
    callAdminRpcMock.mockResolvedValue({ id: updateId });

    await expect(
      setQuoteProductionStageRpc({ quoteId, stage: "painting", note: "Pintura iniciada" }),
    ).resolves.toEqual({ id: updateId });
  });

  it.each([null, {}, { id: "not-a-uuid" }])(
    "rejects malformed stage update data %#",
    async (value) => {
      callAdminRpcMock.mockResolvedValue(value as never);

      await expect(
        setQuoteProductionStageRpc({ quoteId, stage: "painting" }),
      ).rejects.toThrow("Production stage update did not return valid data");
    },
  );

  it("accepts a production photo only when quote, update and URL match", async () => {
    callAdminRpcMock.mockResolvedValue({
      id: photoId,
      quote_id: quoteId,
      update_id: updateId,
      url: photoUrl,
      caption: "Frente",
      created_at: "2026-09-13T12:10:00Z",
      created_by: adminId,
    });

    await expect(
      addQuoteProductionPhotoRpc({
        quoteId,
        updateId,
        url: photoUrl,
        caption: "Frente",
      }),
    ).resolves.toMatchObject({
      id: photoId,
      quote_id: quoteId,
      update_id: updateId,
      url: photoUrl,
    });
  });

  it.each([
    null,
    {},
    {
      id: photoId,
      quote_id: otherQuoteId,
      update_id: updateId,
      url: photoUrl,
      caption: null,
      created_at: "2026-09-13T12:10:00Z",
      created_by: adminId,
    },
    {
      id: photoId,
      quote_id: quoteId,
      update_id: otherUpdateId,
      url: photoUrl,
      caption: null,
      created_at: "2026-09-13T12:10:00Z",
      created_by: adminId,
    },
    {
      id: photoId,
      quote_id: quoteId,
      update_id: updateId,
      url: "https://cdn.example.com/other.jpg",
      caption: null,
      created_at: "2026-09-13T12:10:00Z",
      created_by: adminId,
    },
    {
      id: photoId,
      quote_id: quoteId,
      update_id: updateId,
      url: "javascript:alert(1)",
      caption: null,
      created_at: "2026-09-13T12:10:00Z",
      created_by: adminId,
    },
  ])("rejects malformed production photo data %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);

    await expect(
      addQuoteProductionPhotoRpc({ quoteId, updateId, url: photoUrl }),
    ).rejects.toThrow("Production photo did not return matching data");
  });
});
