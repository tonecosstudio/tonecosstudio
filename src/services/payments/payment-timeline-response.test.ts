import { describe, expect, it } from "vitest";
import { parsePaymentTimelineResponse } from "./payment-timeline-response";

const paymentId = "123e4567-e89b-12d3-a456-426614174000";

const validEvent = {
  id: "event-1",
  payment_id: paymentId,
  action_type: "status_changed",
  old_status: "pending",
  new_status: "under_review",
  notes: null,
  created_at: "2026-09-13T15:00:00.000Z",
};

describe("parsePaymentTimelineResponse", () => {
  it("accepts a valid sanitized timeline", () => {
    expect(parsePaymentTimelineResponse([validEvent], paymentId)).toEqual([validEvent]);
  });

  it.each([
    ["non-array", { data: validEvent }],
    ["wrong payment", [{ ...validEvent, payment_id: "123e4567-e89b-12d3-a456-426614174999" }]],
    ["unknown action", [{ ...validEvent, action_type: "admin_secret_action" }]],
    ["unknown status", [{ ...validEvent, new_status: "paid_without_review" }]],
    ["invalid timestamp", [{ ...validEvent, created_at: "not-a-date" }]],
    ["missing id", [{ ...validEvent, id: "" }]],
  ])("fails closed for %s payloads", (_label, payload) => {
    expect(() => parsePaymentTimelineResponse(payload, paymentId)).toThrow(
      "Payment timeline response is invalid",
    );
  });
});
