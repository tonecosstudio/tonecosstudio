import { describe, expect, it } from "vitest";
import { summarizeCoinLedger } from "./coins-ledger";
import { CoinsTransactionType } from "@/types/coins";

describe("summarizeCoinLedger", () => {
  it("keeps refunds out of earned credits and subtracts them from spent coins", () => {
    const summary = summarizeCoinLedger([
      { amount: 1_000, transaction_type: CoinsTransactionType.PURCHASE },
      { amount: 500, transaction_type: CoinsTransactionType.SUBSCRIPTION_CREDIT },
      { amount: 100, transaction_type: CoinsTransactionType.ADMIN_ADJUSTMENT },
      { amount: -700, transaction_type: CoinsTransactionType.SPEND },
      { amount: 200, transaction_type: CoinsTransactionType.REFUND },
      { amount: -50, transaction_type: CoinsTransactionType.SPEND },
    ]);

    expect(summary).toEqual({
      totalEarned: 1_600,
      grossSpent: 750,
      totalRefunded: 200,
      totalSpent: 550,
      netBalance: 1_050,
    });
  });

  it("supports transactions already mapped to the public type field", () => {
    const summary = summarizeCoinLedger([
      { amount: 300, type: CoinsTransactionType.BONUS },
      { amount: -100, type: CoinsTransactionType.SPEND },
      { amount: 25, type: CoinsTransactionType.REFUND },
    ]);

    expect(summary.totalEarned).toBe(300);
    expect(summary.totalSpent).toBe(75);
    expect(summary.netBalance).toBe(225);
  });

  it("floors net spent at zero when refunds exceed spend", () => {
    const summary = summarizeCoinLedger([
      { amount: -50, transaction_type: CoinsTransactionType.SPEND },
      { amount: 100, transaction_type: CoinsTransactionType.REFUND },
    ]);

    expect(summary.grossSpent).toBe(50);
    expect(summary.totalRefunded).toBe(100);
    expect(summary.totalSpent).toBe(0);
  });
});
