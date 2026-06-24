import { describe, expect, it } from "vitest";
import { exportOrdersToCSV } from "./orders-export";
import type { UnifiedOrder } from "@/types/admin/orders";

const baseOrder: UnifiedOrder = {
  id: "order-1",
  type: "manual_payment",
  status: "pending",
  createdAt: "2026-05-24T12:00:00.000Z",
  updatedAt: "2026-05-24T12:00:00.000Z",
  customer: {
    id: "user-1",
    name: "Cliente",
    email: "cliente@example.com",
  },
  collection: null,
  amount: 100,
  trackingCode: null,
  expectedDeliveryDate: null,
  actualDeliveryDate: null,
  manualPayment: {
    paymentMethod: "pix",
    paymentDate: null,
    referenceId: null,
    referenceType: null,
    notes: null,
    confirmedAt: null,
    confirmedBy: null,
  },
};

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("orders export", () => {
  it("exports orders without collection data", async () => {
    const result = await exportOrdersToCSV([baseOrder]);
    const csv = await readBlobText(result.blob);

    expect(result.rowCount).toBe(1);
    expect(result.filename).toMatch(/^pedidos_\d{8}_\d{6}\.csv$/);
    expect(csv).toContain("Pagamento Manual");
    expect(csv).toContain("Pendente");
  });

  it("neutralizes spreadsheet formula injection payloads", async () => {
    const result = await exportOrdersToCSV([
      {
        ...baseOrder,
        customer: {
          ...baseOrder.customer,
          name: "=HYPERLINK(\"https://evil.example\")",
        },
      },
    ]);
    const csv = await readBlobText(result.blob);

    expect(csv).toContain("\"'=HYPERLINK(\"\"https://evil.example\"\")\"");
  });
});
