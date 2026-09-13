import { describe, expect, it } from "vitest";
import { parsePaymentFileUploadResponse } from "./payment-file-upload-response";

const expected = {
  paymentId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
};

const validFile = {
  id: "33333333-3333-4333-8333-333333333333",
  payment_id: expected.paymentId,
  file_name: "comprovante.pdf",
  file_path: `${expected.paymentId}/44444444-4444-4444-8444-444444444444.pdf`,
  file_size: 1024,
  file_type: "application/pdf",
  thumbnail_path: null,
  uploaded_by: expected.userId,
  created_at: "2026-09-13T15:00:00.000Z",
};

describe("parsePaymentFileUploadResponse", () => {
  it("accepts a file record that matches the authenticated upload context", () => {
    expect(
      parsePaymentFileUploadResponse({ file: validFile, firstFile: true }, expected),
    ).toEqual(validFile);
  });

  it.each([null, undefined, {}, [], { file: null }, { file: {} }])(
    "fails closed for malformed upload response: %j",
    (value) => {
      expect(() => parsePaymentFileUploadResponse(value, expected)).toThrow(
        "Payment proof upload did not return a valid file record",
      );
    },
  );

  it("rejects a file linked to a different payment", () => {
    expect(() =>
      parsePaymentFileUploadResponse(
        { file: { ...validFile, payment_id: "55555555-5555-4555-8555-555555555555" } },
        expected,
      ),
    ).toThrow("Payment proof upload did not return a valid file record");
  });

  it("rejects a file attributed to a different user", () => {
    expect(() =>
      parsePaymentFileUploadResponse(
        { file: { ...validFile, uploaded_by: "55555555-5555-4555-8555-555555555555" } },
        expected,
      ),
    ).toThrow("Payment proof upload did not return a valid file record");
  });

  it("rejects a storage path outside the payment namespace", () => {
    expect(() =>
      parsePaymentFileUploadResponse(
        { file: { ...validFile, file_path: "other-payment/comprovante.pdf" } },
        expected,
      ),
    ).toThrow("Payment proof upload did not return a valid file record");
  });
});
