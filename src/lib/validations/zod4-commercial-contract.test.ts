import { describe, expect, it } from "vitest";
import {
  depositAmountSchema,
  getPricingReportsSchema,
  pixDiscountPercentageSchema,
  priceFullSchema,
} from "./pricing-tiers";
import { purchaseModeSchema } from "./pricing-restructure";

describe("Zod 4 migration — preserve commercial validation feedback", () => {
  it("distinguishes missing prices from nonnumeric prices", () => {
    expect(priceFullSchema.safeParse(undefined).error?.issues[0]?.message)
      .toBe("Preço cheio é obrigatório");
    expect(priceFullSchema.safeParse("500").error?.issues[0]?.message)
      .toBe("Preço cheio deve ser um número");
    expect(depositAmountSchema.safeParse(undefined).error?.issues[0]?.message)
      .toBe("Valor de entrada é obrigatório");
    expect(depositAmountSchema.safeParse("100").error?.issues[0]?.message)
      .toBe("Valor de entrada deve ser um número");
  });

  it("preserves the percentage type check and valid default", () => {
    expect(pixDiscountPercentageSchema.safeParse("5").error?.issues[0]?.message)
      .toBe("Percentual de desconto deve ser um número");
    expect(pixDiscountPercentageSchema.parse(undefined)).toBe(5);
  });

  it("preserves the mandatory and invalid reporting-mode messages", () => {
    expect(getPricingReportsSchema.safeParse({}).error?.issues[0]?.message)
      .toBe("Tipo de relatório é obrigatório");
    expect(
      getPricingReportsSchema.safeParse({ reportType: "unexpected" })
        .error?.issues[0]?.message,
    ).toBe("Tipo de relatório inválido");
  });

  it("rejects unsupported purchase modes with the established message", () => {
    expect(
      purchaseModeSchema.safeParse({ mode_key: "unexpected" })
        .error?.issues[0]?.message,
    ).toBe("Modalidade inválida");
  });
});
