import { describe, expect, it } from "vitest";
import {
  requireAdminRpcMatchingId,
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
});
