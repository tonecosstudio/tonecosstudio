import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectVariables,
  fetchCustomerData,
  fetchSystemSettings,
  processTemplate,
  validateTemplate,
} from "./support-template-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  requireAdmin: vi.fn(),
  fetchOrders: vi.fn(),
  fetchPricingSettings: vi.fn(),
  debug: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/services/auth/current-user", () => ({
  requireCurrentUserAdminAccess: mocks.requireAdmin,
}));

vi.mock("@/services/admin/orders/orders-service", () => ({
  fetchOrdersByUserId: mocks.fetchOrders,
}));

vi.mock("@/services/pricing/pricing-settings-service", () => ({
  fetchPricingSettings: mocks.fetchPricingSettings,
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: mocks.debug },
}));

vi.mock("@/lib/utils", () => ({
  formatCurrency: (amount: number) => "R$ " + amount.toFixed(2),
}));

const pricing = {
  pixDiscountPercentage: 5,
  defaultPriceFull: 500,
  defaultPricePix: 475,
  defaultDepositAmount: 100,
  monthlyProductionLimit: 20,
  salesOpenDay: 15,
  currentMonthLimit: 20,
  currentMonthSold: 6,
  currentMonthAvailable: 14,
};

type QueryResponse = { data: unknown; error: unknown };

function queryReturning(response: QueryResponse) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

function useTableResponses(responses: Record<string, QueryResponse>) {
  mocks.from.mockImplementation((table: string) =>
    queryReturning(responses[table] ?? { data: null, error: null }),
  );
}

describe("support templates — canonical customer and pricing data", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.fetchOrders.mockResolvedValue([]);
    mocks.fetchPricingSettings.mockResolvedValue({ ...pricing });
  });

  it("recognizes repeated, numeric, lowercase and empty placeholders", () => {
    expect(
      detectVariables(
        "{{NOME_CLIENTE}} | {{NOME_CLIENTE}} | {{CLIENTE_2}} | {{cliente}} | {{}}",
      ),
    ).toEqual([
      "{{NOME_CLIENTE}}",
      "{{NOME_CLIENTE}}",
      "{{CLIENTE_2}}",
      "{{cliente}}",
      "{{}}",
    ]);
  });

  it("accepts registered variables and rejects every unsupported placeholder", () => {
    expect(validateTemplate("Olá {{NOME_CLIENTE}}")).toEqual({
      valid: true,
      unknownVars: [],
    });
    expect(validateTemplate("{{CLIENTE_2}} / {{cliente}} / {{}}")).toEqual({
      valid: false,
      unknownVars: ["{{CLIENTE_2}}", "{{cliente}}", "{{}}"],
    });
  });

  it("fails closed before pricing reads for an invalid template", async () => {
    await expect(
      processTemplate("Olá {{CLIENTE_2}}", { userId: "customer" }),
    ).rejects.toThrow("Template contém variáveis desconhecidas");
    expect(mocks.fetchPricingSettings).not.toHaveBeenCalled();
  });

  it("reads official pricing through the one canonical service", async () => {
    const settings = await fetchSystemSettings();
    expect(settings).toEqual(pricing);
    expect(mocks.fetchPricingSettings).toHaveBeenCalledTimes(1);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("replaces names and every commercial amount without querying browser prices", async () => {
    const rendered = await processTemplate(
      "{{NOME_CLIENTE}} | {{EMAIL_CLIENTE}} | {{PRECO_PADRAO}} | {{PRECO_PIX}} | {{VALOR_ENTRADA}} | {{DESCONTO_PIX}} | {{DESCONTO_PIX_VALOR}}",
      { userId: "customer", name: "  Ana  ", email: " ana@example.com " },
    );
    expect(rendered).toBe(
      "Ana | ana@example.com | R$ 500.00 | R$ 475.00 | R$ 100.00 | 5,00% | R$ 25.00",
    );
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.fetchPricingSettings).toHaveBeenCalledTimes(1);
  });

  it("uses the newest order, quote, payment and active subscription", async () => {
    const rendered = await processTemplate(
      "{{ULTIMO_PEDIDO_ID}} | {{ULTIMO_PEDIDO_STATUS}} | {{ULTIMO_PEDIDO_RASTREIO}} | {{ULTIMO_ORCAMENTO_ID}} | {{ULTIMO_ORCAMENTO_VALOR}} | {{ULTIMO_PAGAMENTO_VALOR}} | {{ULTIMO_PAGAMENTO_STATUS}} | {{ASSINATURA_PLANO}} | {{ASSINATURA_STATUS}}",
      {
        userId: "customer",
        orders: [
          {
            id: "12345678-order",
            status: "in_production",
            tracking_code: " BR-TRACK ",
            created_at: "2026-11-02T12:00:00Z",
          },
        ],
        quotes: [{ id: "abcdef01-quote", total_amount: 120 }],
        payments: [{ amount: 50, status: "approved" }],
        subscription: {
          status: "active",
          plan_type: "monthly",
          collections: { name: "Coleção Especial" },
        },
      },
    );
    expect(rendered).toBe(
      "#12345678 | Em produção | BR-TRACK | #ORC-abcdef | R$ 120.00 | R$ 50.00 | Aprovado | Coleção Especial | Ativa",
    );
  });

  it("does not invent missing orders, quotes, payments or subscriptions", async () => {
    const rendered = await processTemplate(
      "{{NOME_CLIENTE}} | {{EMAIL_CLIENTE}} | {{ULTIMO_PEDIDO_ID}} | {{ULTIMO_PEDIDO_STATUS}} | {{ULTIMO_PEDIDO_DATA}} | {{ULTIMO_ORCAMENTO_ID}} | {{ULTIMO_ORCAMENTO_VALOR}} | {{ULTIMO_PAGAMENTO_VALOR}} | {{ULTIMO_PAGAMENTO_STATUS}} | {{ASSINATURA_PLANO}} | {{ASSINATURA_STATUS}}",
      { userId: "customer" },
    );
    expect(rendered).toBe(
      "Cliente | não disponível | sem pedido | sem pedido | não disponível | sem orçamento | não disponível | não disponível | sem pagamento | sem assinatura ativa | sem assinatura ativa",
    );
  });

  it("rejects malformed dates and unavailable numeric amounts", async () => {
    const rendered = await processTemplate(
      "{{ULTIMO_PEDIDO_DATA}} | {{ULTIMO_ORCAMENTO_VALOR}} | {{ULTIMO_PAGAMENTO_VALOR}}",
      {
        userId: "customer",
        orders: [
          { id: "order", status: "pending", created_at: "invalid-date" },
        ],
        quotes: [{ id: "quote", total_amount: Number.NaN }],
        payments: [{ amount: -5, status: "pending" }],
      },
    );
    expect(rendered).toBe("não disponível | não disponível | não disponível");
  });

  it("uses official production capacity and calculates percentage when absent", async () => {
    const rendered = await processTemplate(
      "{{LIMITE_MENSAL}} | {{VENDAS_MES_ATUAL}} | {{VAGAS_DISPONIVEIS}} | {{PERCENTUAL_VENDIDO}} | {{DIA_ABERTURA_VENDAS}}",
      { userId: "customer" },
    );
    expect(rendered).toBe("20 peças | 6 peças | 14 vagas | 30% | Dia 15");
  });

  it("prefers reported production percentage to a derived value", async () => {
    mocks.fetchPricingSettings.mockResolvedValueOnce({
      ...pricing,
      currentMonthPercentage: 75,
    });
    await expect(
      processTemplate("{{PERCENTUAL_VENDIDO}}", { userId: "customer" }),
    ).resolves.toBe("75%");
  });

  it("does not divide by zero or invent production metrics", async () => {
    mocks.fetchPricingSettings.mockResolvedValueOnce({
      ...pricing,
      currentMonthLimit: 0,
      currentMonthSold: 6,
      currentMonthAvailable: undefined,
    });
    await expect(
      processTemplate(
        "{{PERCENTUAL_VENDIDO}} | {{VAGAS_DISPONIVEIS}}",
        { userId: "customer" },
      ),
    ).resolves.toBe("não disponível | não disponível");
  });

  it("replaces repeated variables and collapses excessive blank lines", async () => {
    await expect(
      processTemplate(
        "{{NOME_CLIENTE}}\n\n\n\n{{NOME_CLIENTE}}",
        { userId: "customer", name: "Ana" },
      ),
    ).resolves.toBe("Ana\n\nAna");
  });

  it("never queries customer tables if admin authorization fails", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("access denied"));
    await expect(fetchCustomerData("customer")).rejects.toThrow(
      "access denied",
    );
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.fetchOrders).not.toHaveBeenCalled();
  });

  it("reads only the requested customer's records and bounds order history", async () => {
    useTableResponses({
      profiles: {
        data: { full_name: "Ana", email: "ana@example.com" },
        error: null,
      },
      quotes: { data: [{ id: "quote-1", total_amount: 100 }], error: null },
      manual_payments: {
        data: [{ amount: 50, status: "approved" }],
        error: null,
      },
      subscriptions: {
        data: {
          status: "active",
          plan_type: "annual",
          collections: { name: "Coleção" },
        },
        error: null,
      },
    });
    mocks.fetchOrders.mockResolvedValueOnce(
      Array.from({ length: 7 }, (_, index) => ({
        id: "order-" + index,
        status: "confirmed",
        trackingCode: "track-" + index,
        createdAt: "2026-11-02T12:00:00Z",
      })),
    );

    const data = await fetchCustomerData("customer-1");
    expect(mocks.requireAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.fetchOrders).toHaveBeenCalledExactlyOnceWith("customer-1");
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "profiles",
      "quotes",
      "manual_payments",
      "subscriptions",
    ]);
    expect(data.name).toBe("Ana");
    expect(data.email).toBe("ana@example.com");
    expect(data.orders).toHaveLength(5);
    expect(data.orders?.[0]).toEqual({
      id: "order-0",
      status: "confirmed",
      tracking_code: "track-0",
      created_at: "2026-11-02T12:00:00Z",
    });
    expect(data.quotes).toEqual([{ id: "quote-1", total_amount: 100 }]);
    expect(data.payments).toEqual([{ amount: 50, status: "approved" }]);
    expect(data.subscription).toMatchObject({ plan_type: "annual" });
  });

  it("keeps other customer data available if independent queries fail", async () => {
    useTableResponses({
      profiles: { data: { full_name: "Ana", email: null }, error: null },
      quotes: { data: null, error: { message: "denied" } },
      manual_payments: {
        data: [{ amount: 12, status: "pending" }],
        error: null,
      },
      subscriptions: { data: null, error: { message: "offline" } },
    });
    mocks.fetchOrders.mockRejectedValueOnce(new Error("orders offline"));

    const data = await fetchCustomerData("customer-1");
    expect(data.name).toBe("Ana");
    expect(data.email).toBeUndefined();
    expect(data.quotes).toEqual([]);
    expect(data.orders).toEqual([]);
    expect(data.payments).toEqual([{ amount: 12, status: "pending" }]);
    expect(data.subscription).toBeNull();
    expect(mocks.debug).toHaveBeenCalledWith(
      "Pedidos indisponíveis para template",
      expect.objectContaining({ userId: "customer-1" }),
    );
  });
});
