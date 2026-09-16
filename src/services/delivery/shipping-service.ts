import { logDebug } from "@/lib/logger";
import { callAuthenticatedEdgeFunctionData } from "@/services/supabase/edge-function-client";

function secureNumericCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => String(byte % 10)).join("");
}

export interface Address {
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
}

export interface LabelResult {
  trackingCode: string;
  labelUrl: string;
  cost: number;
}

type ShippingCarrier = "correios" | "private";

type ShippingLabelRequest = {
  referenceId: string;
  address: Address;
  weightKg: number;
};

class ShippingServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "ShippingServiceError";
  }
}

const BRAZIL_STATE_CODES = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

function isLabelResult(value: unknown): value is LabelResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.trackingCode === "string" &&
    record.trackingCode.trim().length > 0 &&
    typeof record.labelUrl === "string" &&
    record.labelUrl.trim().length > 0 &&
    typeof record.cost === "number" &&
    Number.isFinite(record.cost) &&
    record.cost >= 0
  );
}

/**
 * Adapter de geração de etiqueta.
 *
 * O browser não possui autoridade de banco nem credenciais da transportadora.
 * A referência do pedido e o endereço já são validados pelo serviço
 * administrativo chamador. Em produção, a geração ocorre na Edge Function
 * generate-shipping-label; fora de produção há somente um simulador local.
 * Tracking periódico pertence à Edge Function cron-update-tracking.
 */
export class ShippingService {
  private readonly carrier: ShippingCarrier;

  constructor() {
    const configuredCarrier = String(
      import.meta.env.VITE_SHIPPING_CARRIER ?? "correios",
    ).toLowerCase();

    this.carrier = configuredCarrier === "private" ? "private" : "correios";
  }

  private isProductionBuild(): boolean {
    return import.meta.env.PROD === true || String(import.meta.env.PROD) === "true";
  }

  private validateReference(referenceId: string): void {
    if (!referenceId.trim()) {
      throw new ShippingServiceError(
        "Order reference is required",
        "INVALID_ORDER_REFERENCE",
        false,
      );
    }
  }

  private validateAddress(address: Address): void {
    const required: Array<keyof Address> = [
      "name",
      "street",
      "number",
      "neighborhood",
      "city",
      "state",
      "zipCode",
    ];
    const missing = required.filter((field) => !String(address[field] ?? "").trim());

    if (missing.length > 0) {
      throw new ShippingServiceError(
        `Missing required address fields: ${missing.join(", ")}`,
        "INVALID_ADDRESS",
        false,
      );
    }

    if (!/^\d{5}-?\d{3}$/.test(address.zipCode.trim())) {
      throw new ShippingServiceError(
        "Invalid zip code format. Expected: 12345-678 or 12345678",
        "INVALID_ZIP_CODE",
        false,
      );
    }

    if (!BRAZIL_STATE_CODES.has(address.state.trim().toUpperCase())) {
      throw new ShippingServiceError(
        `Invalid state code: ${address.state}`,
        "INVALID_STATE",
        false,
      );
    }
  }

  private calculateDevelopmentShippingCost(address: Address, weightKg: number): number {
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      throw new ShippingServiceError(
        "Weight must be greater than 0",
        "INVALID_WEIGHT",
        false,
      );
    }

    const basePrice = 15;
    const weightPrice = weightKg * 5;
    const regionalSurcharge = address.state.trim().toUpperCase() === "BA" ? 0 : 10;
    return basePrice + weightPrice + regionalSurcharge;
  }

  private async generateProductionLabel(
    referenceId: string,
    address: Address,
    weightKg: number,
  ): Promise<LabelResult> {
    const result = await callAuthenticatedEdgeFunctionData<
      unknown,
      ShippingLabelRequest
    >(
      "generate-shipping-label",
      { referenceId, address, weightKg },
      "Shipping label generation failed",
    );

    if (!isLabelResult(result)) {
      throw new ShippingServiceError(
        "Shipping provider returned an invalid label",
        "INVALID_SHIPPING_LABEL_RESPONSE",
        false,
      );
    }

    return result;
  }

  async generateLabel(referenceId: string, address: Address): Promise<LabelResult> {
    this.validateReference(referenceId);
    this.validateAddress(address);

    const weightKg = 0.5;
    if (this.isProductionBuild()) {
      return this.generateProductionLabel(referenceId, address, weightKg);
    }

    const cost = this.calculateDevelopmentShippingCost(address, weightKg);
    const trackingCode =
      this.carrier === "correios"
        ? `BR${secureNumericCode(9)}BR`
        : `PC${secureNumericCode(9)}`;
    const providerPath = this.carrier === "correios" ? "correios" : "private-carrier";
    const labelUrl = `https://simulator.local/${providerPath}/labels/${trackingCode}.pdf`;

    logDebug(
      "Development shipping label simulator",
      {
        referenceId,
        carrier: this.carrier,
        destinationState: address.state.trim().toUpperCase(),
      },
      "shipping",
    );

    return {
      trackingCode,
      labelUrl,
      cost,
    };
  }
}

export const shippingService = new ShippingService();
