/**
 * PaymentPage Component Tests
 *
 * Unit tests for the PaymentPage component
 *
 * Requirements: 2.1-2.10, 15.1-15.2, 15.3-15.7
 * Tasks: 16.2 Integrar iniciação de pagamento no fluxo de orçamento
 *        16.3 Integrar iniciação de pagamento no fluxo de assinatura
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import PaymentPage from "./PaymentPage";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

// Mock the auth hook
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
    isLoading: false,
  }),
}));

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the PaymentInitiationFlow component
vi.mock("@/components/customer/PaymentInitiationFlow", () => ({
  PaymentInitiationFlow: () => (
    <div data-testid="payment-initiation-flow">PaymentInitiationFlow Mock</div>
  ),
}));

describe("PaymentPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (initialEntries = ["/orcamento/pagamento"]) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <QueryClientProvider client={queryClient}>
          <PaymentPage />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it("should render error state when no quote or subscription ID is provided", async () => {
    renderComponent(["/orcamento/pagamento"]);

    await waitFor(() => {
      expect(screen.getByText("Parâmetros inválidos")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Não foi possível identificar o item para pagamento. Por favor, volte e tente novamente."
        )
      ).toBeInTheDocument();
      expect(screen.getByText("Voltar ao Dashboard")).toBeInTheDocument();
    });
  });

  it("should render loading state when fetching quote data", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    // Mock quote query to never resolve (loading state)
    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => new Promise(() => {})), // Never resolves
        })),
      })),
    });

    renderComponent(["/orcamento/pagamento?quote=quote-123"]);

    // Should show loading skeletons
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("should render quote payment page when quote ID is provided", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    const mockQuote = {
      id: "quote-123",
      total_amount: 150.5,
      deposit_amount: 50.0,
      remaining_amount: 100.5,
      payment_status: "pending",
      quote_items: [
        {
          id: "item-1",
          quantity: 1,
          scale: "1:12",
          models: {
            id: "model-1",
            name: "Modelo Teste",
          },
        },
      ],
    };

    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockQuote, error: null })),
        })),
      })),
    });

    renderComponent(["/orcamento/pagamento?quote=quote-123"]);

    await waitFor(() => {
      expect(screen.getByText("Pagamento Total - Orçamento #quote-123")).toBeInTheDocument();
      expect(screen.getByText("Realize o pagamento total do seu orçamento.")).toBeInTheDocument();
      expect(screen.getByText("R$ 150,50")).toBeInTheDocument();
      expect(screen.getByTestId("payment-initiation-flow")).toBeInTheDocument();
    });
  });

  it("should render deposit payment for quote when type=deposit", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    const mockQuote = {
      id: "quote-123",
      total_amount: 150.5,
      deposit_amount: 50.0,
      remaining_amount: 100.5,
      payment_status: "pending",
      quote_items: [],
    };

    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockQuote, error: null })),
        })),
      })),
    });

    renderComponent(["/orcamento/pagamento?quote=quote-123&type=deposit"]);

    await waitFor(() => {
      expect(screen.getByText("Pagamento do Sinal - Orçamento #quote-123")).toBeInTheDocument();
      expect(
        screen.getByText("Realize o pagamento do sinal para iniciar a produção do seu pedido.")
      ).toBeInTheDocument();
      expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
    });
  });

  it("should render final payment for quote when type=final", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    const mockQuote = {
      id: "quote-123",
      total_amount: 150.5,
      deposit_amount: 50.0,
      remaining_amount: 100.5,
      payment_status: "deposit_paid",
      quote_items: [],
    };

    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockQuote, error: null })),
        })),
      })),
    });

    renderComponent(["/orcamento/pagamento?quote=quote-123&type=final"]);

    await waitFor(() => {
      expect(screen.getByText("Pagamento Final - Orçamento #quote-123")).toBeInTheDocument();
      expect(
        screen.getByText("Realize o pagamento final para liberar o envio do seu pedido.")
      ).toBeInTheDocument();
      expect(screen.getByText("R$ 100,50")).toBeInTheDocument();
    });
  });

  it("should render subscription payment page when subscription ID is provided", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    const mockSubscription = {
      id: "sub-123",
      status: "pending",
      plans: {
        id: "plan-1",
        name: "Plano Premium",
        price: 99.9,
        currency: "BRL",
      },
      collections: {
        id: "col-1",
        name: "Coleção Teste",
        slug: "colecao-teste",
      },
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockSubscription, error: null })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      };
    });

    renderComponent(["/orcamento/pagamento?subscription=sub-123"]);

    await waitFor(() => {
      expect(screen.getByText("Assinatura - Plano Premium")).toBeInTheDocument();
      expect(screen.getByText("Pagamento da assinatura Coleção Teste.")).toBeInTheDocument();
      expect(screen.getByText("R$ 99,90")).toBeInTheDocument();
      expect(screen.getByTestId("payment-initiation-flow")).toBeInTheDocument();
    });
  });

  it("should render error state when quote fetch fails", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    const errorMessage = "Failed to fetch quote";
    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: new Error(errorMessage) })),
        })),
      })),
    });

    renderComponent(["/orcamento/pagamento?quote=quote-123"]);

    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar informações")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText("Voltar")).toBeInTheDocument();
    });
  });

  it("should render error state when subscription fetch fails", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    const errorMessage = "Failed to fetch subscription";
    supabase.from.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: new Error(errorMessage) })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      };
    });

    renderComponent(["/orcamento/pagamento?subscription=sub-123"]);

    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar informações")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText("Voltar")).toBeInTheDocument();
    });
  });

  it("should show quote summary when quote data is loaded", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    const mockQuote = {
      id: "quote-123",
      total_amount: 150.5,
      deposit_amount: 50.0,
      remaining_amount: 100.5,
      payment_status: "pending",
      quote_items: [
        {
          id: "item-1",
          quantity: 2,
          scale: "1:12",
          models: {
            id: "model-1",
            name: "Modelo A",
          },
        },
        {
          id: "item-2",
          quantity: 1,
          scale: "1:24",
          models: {
            id: "model-2",
            name: "Modelo B",
          },
        },
      ],
    };

    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockQuote, error: null })),
        })),
      })),
    });

    renderComponent(["/orcamento/pagamento?quote=quote-123"]);

    await waitFor(() => {
      expect(screen.getByText("Resumo do Orçamento")).toBeInTheDocument();
      expect(screen.getByText("Detalhes do seu pedido")).toBeInTheDocument();
      expect(screen.getByText("Número")).toBeInTheDocument();
      expect(screen.getByText("#quote-123")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Aguardando Sinal")).toBeInTheDocument();
      expect(screen.getByText("Itens:")).toBeInTheDocument();
      expect(screen.getByText("Modelo A × 2")).toBeInTheDocument();
      expect(screen.getByText("Escala: 1:12")).toBeInTheDocument();
      expect(screen.getByText("Modelo B × 1")).toBeInTheDocument();
      expect(screen.getByText("Escala: 1:24")).toBeInTheDocument();
    });
  });

  it("should show subscription summary when subscription data is loaded", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    const mockSubscription = {
      id: "sub-123",
      status: "active",
      plans: {
        id: "plan-1",
        name: "Plano Premium",
        price: 99.9,
        currency: "BRL",
      },
      collections: {
        id: "col-1",
        name: "Coleção Teste",
        slug: "colecao-teste",
      },
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockSubscription, error: null })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      };
    });

    renderComponent(["/orcamento/pagamento?subscription=sub-123"]);

    await waitFor(() => {
      expect(screen.getByText("Resumo da Assinatura")).toBeInTheDocument();
      expect(screen.getByText("Detalhes da sua assinatura")).toBeInTheDocument();
      expect(screen.getByText("Plano")).toBeInTheDocument();
      expect(screen.getByText("Plano Premium")).toBeInTheDocument();
      expect(screen.getByText("Coleção")).toBeInTheDocument();
      expect(screen.getByText("Coleção Teste")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Ativa")).toBeInTheDocument();
      expect(screen.getByText("Benefícios:")).toBeInTheDocument();
      expect(screen.getByText("Acesso à coleção")).toBeInTheDocument();
      expect(screen.getByText("Descontos exclusivos")).toBeInTheDocument();
      expect(screen.getByText("Conteúdo premium")).toBeInTheDocument();
    });
  });

  it("should show important information section", async () => {
    const { supabase } = require("@/integrations/supabase/client");

    const mockQuote = {
      id: "quote-123",
      total_amount: 150.5,
      deposit_amount: 50.0,
      remaining_amount: 100.5,
      payment_status: "pending",
      quote_items: [],
    };

    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockQuote, error: null })),
        })),
      })),
    });

    renderComponent(["/orcamento/pagamento?quote=quote-123"]);

    await waitFor(() => {
      expect(screen.getByText("Informações Importantes")).toBeInTheDocument();
      expect(
        screen.getByText("Após o pagamento, você precisará enviar o comprovante")
      ).toBeInTheDocument();
      expect(screen.getByText("Mantenha o comprovante em mãos para upload")).toBeInTheDocument();
      expect(screen.getByText("O processamento pode levar até 24 horas úteis")).toBeInTheDocument();
      expect(
        screen.getByText("Em caso de dúvidas, entre em contato com nosso suporte")
      ).toBeInTheDocument();
    });
  });
});
