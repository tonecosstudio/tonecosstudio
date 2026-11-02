import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeSystemSettings,
  readSystemSettings,
  updateSystemSettingValue,
  updateSystemSettingsValues,
} from "./system-settings-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  in: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/services/admin/config/admin-config-mutations-service", () => ({
  upsertAdminSystemSettings: mocks.upsert,
}));

const authoritativeSettings = {
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

describe("system settings authority: public reads, validation and admin writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ in: mocks.in });
    mocks.in.mockResolvedValue({
      data: Object.entries(authoritativeSettings).map(([key, value]) => ({
        key,
        value,
      })),
      error: null,
    });
    mocks.upsert.mockResolvedValue(undefined);
  });

  it("reads only allowlisted public keys, not payment secrets", async () => {
    const settings = await readSystemSettings();

    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("system_settings");
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith("key,value");
    const [column, keys] = mocks.in.mock.calls[0] as [string, string[]];
    expect(column).toBe("key");
    expect(keys).toContain("default_price_full");
    expect(keys).toContain("support_email");
    expect(keys).not.toContain("pix_key_voucher");
    expect(keys).not.toContain("payment_link_voucher");
    expect(keys).not.toContain("service_role_key");
    expect(settings.default_price_full).toBe(500);
    expect(settings.default_price_pix).toBe(475);
    expect(settings.production_days_min).toBe(15);
  });

  it("propagates storage errors without substituting guessed prices", async () => {
    mocks.in.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied" },
    });
    await expect(readSystemSettings()).rejects.toThrow(
      "Configurações oficiais do sistema estão indisponíveis: permission denied",
    );
  });

  it("rejects incomplete public records instead of inventing monetary values", async () => {
    mocks.in.mockResolvedValueOnce({
      data: [{ key: "default_price_full", value: "500" }],
      error: null,
    });
    await expect(readSystemSettings()).rejects.toThrow(
      "Configuração oficial inválida ou ausente: default_price_pix",
    );
  });

  it.each([
    ["default_price_full", "0", "default_price_full"],
    ["default_price_full", "-1", "default_price_full"],
    ["default_price_pix", "600", "default_price_pix"],
    ["default_deposit_amount", "476", "default_deposit_amount"],
    ["pix_discount_percentage", "101", "pix_discount_percentage"],
    ["max_installments_no_interest", "2.5", "max_installments_no_interest"],
    ["production_days_min", "0", "production_days_min"],
    ["production_days_max", "14", "production_days_max"],
    ["shipping_business_days", "32", "shipping_business_days"],
    ["exchange_deadline_days", "-1", "exchange_deadline_days"],
    ["character_choice_days", "Infinity", "character_choice_days"],
    ["balance_payment_days", "NaN", "balance_payment_days"],
  ])("rejects an invalid %s value", (key, value, invalidKey) => {
    expect(() =>
      normalizeSystemSettings({
        ...authoritativeSettings,
        [key]: value,
      }),
    ).toThrow(`Configuração oficial inválida ou ausente: ${invalidKey}`);
  });

  it("accepts a nested official settings payload", () => {
    const result = normalizeSystemSettings({
      settings: { ...authoritativeSettings, company_name: "Tonecos Studio" },
    });
    expect(result.company_name).toBe("Tonecos Studio");
    expect(result.default_deposit_amount).toBe(100);
  });

  it("rejects non-object payloads without a second source of pricing", () => {
    expect(() => normalizeSystemSettings(null)).toThrow(
      "Configuração oficial inválida ou ausente: default_price_full",
    );
    expect(() => normalizeSystemSettings([])).toThrow(
      "Configuração oficial inválida ou ausente: default_price_full",
    );
  });

  it("writes a single admin-controlled value through the canonical service", async () => {
    await expect(
      updateSystemSettingValue("company_name", "Tonecos Studio"),
    ).resolves.toEqual({ success: true });
    expect(mocks.upsert).toHaveBeenCalledExactlyOnceWith({
      company_name: "Tonecos Studio",
    });
  });

  it("writes an admin batch once, without splitting or retrying", async () => {
    const changes = {
      company_name: "Tonecos Studio",
      contact_email: "contato@example.test",
    };
    await expect(updateSystemSettingsValues(changes)).resolves.toEqual({
      success: true,
    });
    expect(mocks.upsert).toHaveBeenCalledExactlyOnceWith(changes);
  });

  it("returns a failure contract if the admin service refuses a write", async () => {
    mocks.upsert.mockRejectedValueOnce(new Error("access denied"));
    await expect(
      updateSystemSettingValue("company_name", "Unauthorized"),
    ).resolves.toEqual({ success: false, error: "access denied" });
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  it("does not claim success when the admin batch fails with an unknown error", async () => {
    mocks.upsert.mockRejectedValueOnce("unexpected");
    await expect(
      updateSystemSettingsValues({ company_name: "Blocked" }),
    ).resolves.toEqual({ success: false, error: "Erro desconhecido" });
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });
});
