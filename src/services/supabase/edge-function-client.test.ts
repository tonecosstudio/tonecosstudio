import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  callAuthenticatedEdgeFunction,
  callAuthenticatedEdgeFunctionData,
} from "./edge-function-client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

const invoke = vi.mocked(supabase.functions.invoke);

describe("edge-function-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes the requested Edge Function with the provided body and returns data", async () => {
    invoke.mockResolvedValueOnce({
      data: { success: true, id: "result-1" },
      error: null,
    } as never);

    await expect(
      callAuthenticatedEdgeFunction(
        "example-function",
        { orderId: "order-1" },
        "Fallback error",
      ),
    ).resolves.toEqual({ success: true, id: "result-1" });

    expect(invoke).toHaveBeenCalledWith("example-function", {
      body: { orderId: "order-1" },
    });
  });

  it.each([null, undefined])(
    "preserves an empty successful response as undefined when data is %s",
    async (data) => {
      invoke.mockResolvedValueOnce({ data, error: null } as never);

      await expect(
        callAuthenticatedEdgeFunction("empty-function", {}, "Fallback error"),
      ).resolves.toBeUndefined();
    },
  );

  it("prefers the Edge Function error payload over the SDK error message", async () => {
    const json = vi.fn().mockResolvedValue({ error: "Business rule rejected" });
    const clone = vi.fn().mockReturnValue({ json });

    invoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: "FunctionsHttpError",
        context: { clone },
      },
    } as never);

    await expect(
      callAuthenticatedEdgeFunction("protected-function", {}, "Fallback error"),
    ).rejects.toThrow("Business rule rejected");

    expect(clone).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledTimes(1);
  });

  it("accepts a message field from an Edge Function error payload", async () => {
    const json = vi.fn().mockResolvedValue({ message: "Detailed failure" });

    invoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: "FunctionsHttpError",
        context: { json },
      },
    } as never);

    await expect(
      callAuthenticatedEdgeFunction("protected-function", {}, "Fallback error"),
    ).rejects.toThrow("Detailed failure");
  });

  it("falls back to the SDK message when the response body cannot be parsed", async () => {
    const json = vi.fn().mockRejectedValue(new Error("invalid json"));

    invoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Network-level failure",
        context: { json },
      },
    } as never);

    await expect(
      callAuthenticatedEdgeFunction("broken-function", {}, "Fallback error"),
    ).rejects.toThrow("Network-level failure");
  });

  it("uses the caller fallback when neither the payload nor SDK provides a message", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: {},
    } as never);

    await expect(
      callAuthenticatedEdgeFunction("broken-function", {}, "Expected fallback"),
    ).rejects.toThrow("Expected fallback");
  });

  it("unwraps the data envelope returned by authenticated data calls", async () => {
    invoke.mockResolvedValueOnce({
      data: { data: { count: 3 } },
      error: null,
    } as never);

    await expect(
      callAuthenticatedEdgeFunctionData<{ count: number }>(
        "report-function",
        { scope: "monthly" },
        "Unable to load report",
      ),
    ).resolves.toEqual({ count: 3 });
  });

  it.each([null, undefined])(
    "fails closed when an authenticated data call returns no envelope (%s)",
    async (data) => {
      invoke.mockResolvedValueOnce({ data, error: null } as never);

      await expect(
        callAuthenticatedEdgeFunctionData(
          "admin-function",
          {},
          "Admin operation failed",
        ),
      ).rejects.toThrow("Admin operation failed");
    },
  );

  it.each([{ success: true }, [], "unexpected"])(
    "fails closed when an authenticated data call returns a malformed envelope: %j",
    async (data) => {
      invoke.mockResolvedValueOnce({ data, error: null } as never);

      await expect(
        callAuthenticatedEdgeFunctionData(
          "report-function",
          {},
          "Unable to load report",
        ),
      ).rejects.toThrow("Unable to load report");
    },
  );
});
