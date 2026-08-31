import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  getSystemDeadlines,
  invalidateDeadlinesCache,
} from "./deadline-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  log: { error: vi.fn() },
}));

vi.mock("@/services/calendar/holiday-service", () => ({
  getHolidayDates: vi.fn(),
}));

function mockSettings(result: {
  data: Array<{ key: string; value: string }> | null;
  error: { message: string } | null;
}) {
  const query = {
    select: vi.fn(),
    in: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  vi.mocked(supabase.from).mockReturnValue(query as never);
}

const validSettings = [
  { key: "production_days_min", value: "15" },
  { key: "production_days_max", value: "20" },
  { key: "shipping_business_days", value: "5" },
  { key: "sales_duration_days", value: "30" },
  { key: "delivery_interval_days", value: "90" },
  { key: "character_choice_days", value: "7" },
  { key: "balance_payment_days", value: "5" },
];

describe("deadline-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateDeadlinesCache();
  });

  it("loads complete operational deadlines only from system_settings", async () => {
    mockSettings({ data: validSettings, error: null });

    await expect(getSystemDeadlines()).resolves.toMatchObject({
      productionDaysMin: 15,
      productionDaysMax: 20,
      shippingBusinessDays: 5,
      salesDurationDays: 30,
      deliveryIntervalDays: 90,
      characterChoiceDays: 7,
      balancePaymentDays: 5,
    });
  });

  it("fails closed when the settings query fails", async () => {
    mockSettings({ data: null, error: { message: "database unavailable" } });

    await expect(getSystemDeadlines()).rejects.toThrow(
      "Prazos oficiais do sistema estão indisponíveis: database unavailable",
    );
  });

  it("fails closed when character_choice_days is absent", async () => {
    mockSettings({
      data: validSettings.filter((item) => item.key !== "character_choice_days"),
      error: null,
    });

    await expect(getSystemDeadlines()).rejects.toThrow(
      "Prazo oficial inválido ou ausente: character_choice_days",
    );
  });

  it("rejects inconsistent production ranges", async () => {
    mockSettings({
      data: validSettings.map((item) =>
        item.key === "production_days_min" ? { ...item, value: "25" } : item,
      ),
      error: null,
    });

    await expect(getSystemDeadlines()).rejects.toThrow(
      "production_days_max é menor que production_days_min",
    );
  });
});
