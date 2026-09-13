import { describe, expect, it } from "vitest";
import {
  requireAdminRpcIntegerField,
  requireAdminRpcMatchingId,
  requireAdminRpcRecord,
  requireAdminRpcRecordMatchingId,
  requireAdminRpcUuid,
} from "./admin-rpc-results";

const ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

describe("admin-rpc-results", () => {
  it("accepts a valid UUID result", () => {
    expect(requireAdminRpcUuid(ID, "Payment link creation")).toBe(ID);
  });

  it.each([null, undefined, "", "not-a-uuid", {}, []])(
    "rejects an invalid UUID result: %j",
    (value) => {
      expect(() => requireAdminRpcUuid(value, "Payment link creation")).toThrow(
        "Payment link creation returned an invalid resource id",
      );
    },
  );

  it("accepts a matching UUID", () => {
    expect(requireAdminRpcMatchingId(ID, ID, "Quote update")).toBe(ID);
  });

  it("rejects a different UUID", () => {
    expect(() => requireAdminRpcMatchingId(OTHER_ID, ID, "Quote update")).toThrow(
      "Quote update returned an unexpected resource id",
    );
  });

  it("accepts a plain object result", () => {
    expect(requireAdminRpcRecord({ id: ID }, "Config update")).toEqual({ id: ID });
  });

  it.each([null, undefined, "value", 1, [], true])(
    "rejects a non-object result: %j",
    (value) => {
      expect(() => requireAdminRpcRecord(value, "Config update")).toThrow(
        "Config update returned invalid data",
      );
    },
  );

  it("accepts an object with the expected id", () => {
    expect(requireAdminRpcRecordMatchingId({ id: ID, name: "A" }, ID, "Resource update")).toEqual({
      id: ID,
      name: "A",
    });
  });

  it("rejects an object with a different id", () => {
    expect(() =>
      requireAdminRpcRecordMatchingId({ id: OTHER_ID }, ID, "Resource update"),
    ).toThrow("Resource update returned an unexpected resource id");
  });

  it("accepts a non-negative integer field and can enforce its expected value", () => {
    expect(requireAdminRpcIntegerField({ updated: 3 }, "updated", "Bulk update", 3)).toBe(3);
  });

  it.each([
    [{ updated: -1 }, "invalid"],
    [{ updated: 1.5 }, "invalid"],
    [{ updated: "3" }, "invalid"],
    [{}, "invalid"],
    [{ updated: 2 }, "unexpected"],
  ] as const)("rejects invalid or unexpected integer fields %#", (value, kind) => {
    const expectedMessage =
      kind === "unexpected"
        ? "Bulk update returned an unexpected updated"
        : "Bulk update returned an invalid updated";

    expect(() => requireAdminRpcIntegerField(value, "updated", "Bulk update", 3)).toThrow(
      expectedMessage,
    );
  });
});
