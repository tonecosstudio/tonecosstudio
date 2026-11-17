import { describe, expect, it } from "vitest";
import { subscriptionPaymentPeriodForPlanType } from "./subscription-payment-period";

describe("subscription payment periods", () => {
  it.each([
    ["bimestral", "bimonthly"],
    ["BIMONTHLY", "bimonthly"],
    ["trimestral", "quarterly"],
    ["quarterly", "quarterly"],
    ["semestral", "semiannual"],
    ["annual", "annual"],
  ] as const)(
    "maps plan type %s to payment setting %s",
    (planType, expected) => {
      expect(subscriptionPaymentPeriodForPlanType(planType)).toBe(expected);
    },
  );

  it("does not invent a payment period for an unsupported plan", () => {
    expect(subscriptionPaymentPeriodForPlanType("avulso")).toBeNull();
  });
});
