import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShippingService, type Address } from "../shipping-service";

describe("ShippingService", () => {
  let service: ShippingService;
  let validAddress: Address;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_SHIPPING_CARRIER", "correios");
    vi.stubEnv("PROD", false);
    service = new ShippingService();
    validAddress = {
      name: "João Silva",
      street: "Rua das Flores",
      number: "123",
      complement: "Apt 45",
      neighborhood: "Centro",
      city: "Salvador",
      state: "BA",
      zipCode: "40000-000",
      phone: "71999999999",
    };
  });

  it("generates only development simulator labels", async () => {
    const result = await service.generateLabel("order-123", validAddress);

    expect(result.trackingCode).toMatch(/^BR\d{9}BR$/);
    expect(result.labelUrl).toBe(
      `https://simulator.local/correios/labels/${result.trackingCode}.pdf`,
    );
    expect(result.cost).toBeGreaterThan(0);
  });

  it("supports standalone purchase references without querying subscription deliveries", async () => {
    await expect(
      service.generateLabel("standalone-purchase-123", validAddress),
    ).resolves.toMatchObject({
      labelUrl: expect.stringContaining("simulator.local"),
    });
  });

  it("rejects an empty order reference", async () => {
    await expect(service.generateLabel("   ", validAddress)).rejects.toMatchObject({
      code: "INVALID_ORDER_REFERENCE",
      retryable: false,
    });
  });

  it("rejects invalid or incomplete Brazilian addresses", async () => {
    await expect(
      service.generateLabel("order-1", { ...validAddress, street: "" }),
    ).rejects.toMatchObject({ code: "INVALID_ADDRESS" });

    await expect(
      service.generateLabel("order-1", { ...validAddress, zipCode: "invalid" }),
    ).rejects.toMatchObject({ code: "INVALID_ZIP_CODE" });

    await expect(
      service.generateLabel("order-1", { ...validAddress, state: "XX" }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("accepts CEP with or without hyphen", async () => {
    await expect(
      service.generateLabel("order-1", { ...validAddress, zipCode: "40000-000" }),
    ).resolves.toBeDefined();
    await expect(
      service.generateLabel("order-2", { ...validAddress, zipCode: "40000000" }),
    ).resolves.toBeDefined();
  });

  it("uses the private-carrier simulator only when explicitly configured outside production", async () => {
    vi.stubEnv("VITE_SHIPPING_CARRIER", "private");
    const privateCarrier = new ShippingService();

    const result = await privateCarrier.generateLabel("order-123", validAddress);

    expect(result.trackingCode).toMatch(/^PC\d{9}$/);
    expect(result.labelUrl).toContain("/private-carrier/");
  });

  it("keeps regional development pricing deterministic", async () => {
    const bahia = await service.generateLabel("order-ba", validAddress);
    const saoPaulo = await service.generateLabel("order-sp", {
      ...validAddress,
      state: "SP",
    });

    expect(saoPaulo.cost).toBeGreaterThan(bahia.cost);
  });

  it("fails closed in production until a real server-side carrier adapter exists", async () => {
    vi.stubEnv("PROD", true);
    const productionService = new ShippingService();

    await expect(
      productionService.generateLabel("order-123", validAddress),
    ).rejects.toMatchObject({
      code: "SHIPPING_INTEGRATION_REQUIRED",
      retryable: false,
    });
  });
});
