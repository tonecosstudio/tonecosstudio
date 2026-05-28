import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PaymentMethodList } from "./PaymentMethodList";
import type { PaymentMethod } from "@/types/manual-payment";
import * as paymentMethodService from "@/lib/payment-method-service";

vi.mock("@/lib/payment-method-service", () => ({
  clearPaymentMethodCache: vi.fn(),
  deletePaymentMethod: vi.fn(),
  listAllPaymentMethods: vi.fn(),
  setDefaultPaymentMethod: vi.fn(),
  togglePaymentMethodActive: vi.fn(),
  updatePaymentMethod: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  closestCenter: vi.fn(),
  useSensor: vi.fn((sensor, options) => ({ sensor, options })),
  useSensors: vi.fn((...sensors) => sensors),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  arrayMove: vi.fn((items: unknown[], fromIndex: number, toIndex: number) => {
    const nextItems = [...items];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);
    return nextItems;
  }),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    isDragging: false,
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ""),
    },
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });

const mockPaymentMethods: PaymentMethod[] = [
  {
    account_details: null,
    created_at: "2024-01-01T00:00:00Z",
    display_order: 0,
    id: "1",
    instructions: "Faca o PIX para a chave abaixo",
    is_active: true,
    is_default: true,
    name: "PIX",
    payment_link: null,
    pix_key: "123.456.789-00",
    type: "pix",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    account_details: null,
    created_at: "2024-01-02T00:00:00Z",
    display_order: 1,
    id: "2",
    instructions: "Pagamento via cartao de credito",
    is_active: true,
    is_default: false,
    name: "Cartao de Credito",
    payment_link: "https://pagseguro.example/pay",
    pix_key: null,
    type: "other",
    updated_at: "2024-01-02T00:00:00Z",
  },
  {
    account_details: { account: "56789-0", agency: "1234", bank: "Banco do Brasil" },
    created_at: "2024-01-03T00:00:00Z",
    display_order: 2,
    id: "3",
    instructions: "Pague o boleto em qualquer banco",
    is_active: false,
    is_default: false,
    name: "Boleto Bancario",
    payment_link: null,
    pix_key: null,
    type: "bank_transfer",
    updated_at: "2024-01-03T00:00:00Z",
  },
];

describe("PaymentMethodList", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = (props?: React.ComponentProps<typeof PaymentMethodList>) =>
    render(
      <QueryClientProvider client={queryClient}>
        <PaymentMethodList {...props} />
      </QueryClientProvider>
    );

  test("exibe estado de carregamento inicial", async () => {
    let resolveMethods: (methods: PaymentMethod[]) => void = () => undefined;
    const pendingMethods = new Promise<PaymentMethod[]>((resolve) => {
      resolveMethods = resolve;
    });
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockReturnValue(pendingMethods);

    renderComponent();

    expect(screen.getByText("Carregando metodos de pagamento...")).toBeInTheDocument();

    resolveMethods([]);
    await screen.findByText("Nenhum metodo de pagamento configurado.");
  });

  test("exibe estado de erro quando a consulta falha", async () => {
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockRejectedValue(
      new Error("Falha ao buscar metodos")
    );

    renderComponent();

    expect(await screen.findByText("Erro ao carregar metodos de pagamento")).toBeInTheDocument();
    expect(screen.getByText("Falha ao buscar metodos")).toBeInTheDocument();
  });

  test("exibe estado vazio quando nao ha metodos cadastrados", async () => {
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockResolvedValue([]);

    renderComponent();

    expect(await screen.findByText("Nenhum metodo de pagamento configurado.")).toBeInTheDocument();
    expect(screen.getByText(/Clique em "Adicionar Metodo"/)).toBeInTheDocument();
  });

  test("exibe tabela de metodos com dados e indicadores corretos", async () => {
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    expect(await screen.findByText("PIX")).toBeInTheDocument();
    expect(screen.getByText("Cartao de Credito")).toBeInTheDocument();
    expect(screen.getByText("Boleto Bancario")).toBeInTheDocument();
    expect(screen.getByText("bank_transfer")).toBeInTheDocument();
    expect(screen.getAllByText("Ativo")).toHaveLength(2);
    expect(screen.getByText("Inativo")).toBeInTheDocument();
    expect(screen.getAllByText("Nao padrao")).toHaveLength(2);
    expect(screen.getAllByText("Ordem")).toHaveLength(2);
    expect(screen.getByText("Acoes")).toBeInTheDocument();
  });

  test("chama onEdit ao selecionar a acao de edicao", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockResolvedValue([mockPaymentMethods[0]]);

    renderComponent({ onEdit });

    expect(await screen.findByText("PIX")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir acoes de PIX" }));
    await user.click(await screen.findByText("Editar"));

    expect(onEdit).toHaveBeenCalledWith(mockPaymentMethods[0]);
  });

  test("abre dialogo de exclusao ao selecionar a acao de excluir", async () => {
    const user = userEvent.setup();
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockResolvedValue([mockPaymentMethods[0]]);

    renderComponent();

    expect(await screen.findByText("PIX")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir acoes de PIX" }));
    await user.click(await screen.findByText("Excluir"));

    expect(screen.getByText("Excluir metodo de pagamento")).toBeInTheDocument();
    expect(
      screen.getByText(/Tem certeza que deseja excluir o metodo de pagamento "PIX"\?/)
    ).toBeInTheDocument();
  });

  test("alterna status ativo pelo servico canonico", async () => {
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockResolvedValue([mockPaymentMethods[0]]);
    vi.mocked(paymentMethodService.togglePaymentMethodActive).mockResolvedValue(undefined);

    renderComponent();

    expect(await screen.findByText("PIX")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Toggle PIX active status" }));

    await waitFor(() => {
      expect(paymentMethodService.togglePaymentMethodActive).toHaveBeenCalledWith("1", false);
    });
  });

  test("define metodo nao padrao como padrao pelo servico canonico", async () => {
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockResolvedValue([mockPaymentMethods[1]]);
    vi.mocked(paymentMethodService.setDefaultPaymentMethod).mockResolvedValue(undefined);

    renderComponent();

    expect(await screen.findByText("Cartao de Credito")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Definir Cartao de Credito como padrao" })
    );

    await waitFor(() => {
      expect(paymentMethodService.setDefaultPaymentMethod).toHaveBeenCalledWith("2");
    });
  });

  test("nao oferece redefinicao de padrao para metodo ja padrao", async () => {
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockResolvedValue([mockPaymentMethods[0]]);

    renderComponent();

    expect(await screen.findByText("PIX")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Definir PIX como padrao" })).not.toBeInTheDocument();
  });

  test("exibe orientacao de reordenacao", async () => {
    vi.mocked(paymentMethodService.listAllPaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    expect(await screen.findByText(/Arraste os itens pelo icone/)).toBeInTheDocument();
    expect(
      screen.getByText(/A ordem afeta como os metodos sao exibidos para os clientes/)
    ).toBeInTheDocument();
  });
});
