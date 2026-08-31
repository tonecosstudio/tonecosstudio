import { describe, expect, it, vi } from "vitest";
import { normalizeSystemSettings } from "./system-settings-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

vi.mock("@/services/admin/config/admin-config-mutations-service", () => ({
  upsertAdminSystemSettings: vi.fn(),
}));

const completeSettings = {
  default_price_full: "500",
  default_price_pix: "475",
  default_deposit_amount: "100",
  pix_discount_percentage: "5",
  max_installments_no_interest: "6",
  max_installments_with_interest: "10",
  production_days_min: "15",
  production_days_max: "20",
  shipping_business_days: "5",
  sales_duration_days: "30",
  delivery_interval_days: "90",
  character_choice_days: "7",
  balance_payment_days: "5",
  exchange_deadline_days: "0",
  days_to_next_delivery: "30",
};

describe("normalizeSystemSettings", () => {
  it("accepts a complete canonical commercial and operational payload", () => {
    const settings = normalizeSystemSettings(completeSettings);

    expect(settings).toMatchObject({
      default_price_full: 500,
      default_price_pix: 475,
      max_installments_no_interest: 6,
      production_days_min: 15,
      production_days_max: 20,
      character_choice_days: 7,
      exchange_deadline_days: 0,
    });
  });

  it("fails closed when character_choice_days is absent", () => {
    const { character_choice_days: _removed, ...settings } = completeSettings;

    expect(() => normalizeSystemSettings(settings)).toThrow(
      "Configuração oficial inválida ou ausente: character_choice_days",
    );
  });

  it("fails closed when installment configuration is absent", () => {
    const { max_installments_no_interest: _removed, ...settings } = completeSettings;

    expect(() => normalizeSystemSettings(settings)).toThrow(
      "Configuração oficial inválida ou ausente: max_installments_no_interest",
    );
  });

  it("rejects an inverted production range", () => {
    expect(() =>
      normalizeSystemSettings({
        ...completeSettings,
        production_days_min: "30",
        production_days_max: "20",
      }),
    ).toThrow("Configuração oficial inválida ou ausente: production_days_max");
  });
});
