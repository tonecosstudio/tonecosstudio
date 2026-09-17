import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPaymentById } from "@/lib/payment-service";
import type { PaymentDetails } from "@/types/manual-payment";
import { PaymentDetailsView } from "./PaymentDetailsView";

vi.mock("@/lib/payment-service", () => ({
  getPaymentById: vi.fn(),
}));

vi.mock("@/lib/file-upload-service", () => ({
  fileUploadService: {
    getSignedUrl: vi.fn(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("./PaymentActionButtons", () => ({
  PaymentActionButtons: () => <div data-testid="payment-actions">actions</div>,
}));

vi.mock("lucide-react", () => {
  const Icon = () => <span aria-hidden="true" />;
  return {
    AlertCircle: Icon,
    Calendar: Icon,
    CheckCircle: Icon,
    Clock: Icon,
    CreditCard: Icon,
    DollarSign: Icon,
    Download: Icon,
    ExternalLink: Icon,
    Eye: Icon,
    File: Icon,
    FileText: Icon,
    Hash: Icon,
    History: Icon,
    Image: Icon,
    MessageSquare: Icon,
    Package: Icon,
    Receipt: Icon,
    User: Icon,
    XCircle: Icon,
  };
});

const mockGetPaymentById = vi.mocked(getPaymentById);

function createPayment(overrides: Partial<PaymentDetails> = {}): PaymentDetails {
  return {
    id: "payment-123",
    reference_number: "PAY-2026-ADMIN",
    user_id: "user-123",
    payment_method_id: "method-123",
    amount: 299.99,
    currency: "BRL",
    payment_type: "one_time",
    status: "under_review",
    rejection_reason: null,
    created_at: "2026-09-13T12:00:00Z",
    updated_at: "2026-09-13T12:05:00Z",
    approved_at: null,
    approved_by: null,
    payment_method: {
      id: "method-123",
      name: "PIX",
      type: "pix",
      instructions: "Confirme o pagamento via PIX.",
      payment_link: null,
      pix_key: "pix@example.com",
      account_details: null,
      is_active: true,
      is_default: true,
      display_order: 1,
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
    files: [],
    timeline: [
      {
        id: "event-upload",
        payment_id: "payment-123",
        action_type: "file_uploaded",
        old_status: "pending",
        new_status: "under_review",
        notes: "Comprovante recebido pelo backend.",
        created_at: "2026-09-13T12:05:00Z",
      },
    ],
    customer_name: "Cliente Teste",
    customer_email: "cliente@example.com",
    ...overrides,
  };
}

function renderView(payment: PaymentDetails) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  mockGetPaymentById.mockResolvedValue(payment);

  return render(
    <QueryClientProvider client={queryClient}>
      <PaymentDetailsView paymentId={payment.id} />
    </QueryClientProvider>,
  );
}

describe("PaymentDetailsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the payment and only the canonical detail tabs", async () => {
    renderView(createPayment());

    expect(await screen.findByText("Detalhes do Pagamento")).toBeInTheDocument();
    expect(screen.getAllByText("PAY-2026-ADMIN").length).toBeGreaterThan(0);
    expect(screen.getByText("Cliente Teste")).toBeInTheDocument();
    expect(screen.getByTestId("payment-actions")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Comprovantes/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Linha do tempo/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Log de Auditoria/ })).not.toBeInTheDocument();
  });

  it("renders sanitized backend timeline events", async () => {
    const user = userEvent.setup();
    renderView(createPayment());

    await screen.findByText("Detalhes do Pagamento");
    await user.click(screen.getByRole("tab", { name: /Linha do tempo/ }));

    await waitFor(() => {
      expect(screen.getByText("Comprovante enviado")).toBeInTheDocument();
      expect(screen.getByText("Comprovante recebido pelo backend.")).toBeInTheDocument();
      expect(screen.getByText("pending")).toBeInTheDocument();
      expect(screen.getByText("under_review")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Admin ID/i)).not.toBeInTheDocument();
  });

  it("shows an empty proof state without fabricating audit content", async () => {
    const user = userEvent.setup();
    renderView(createPayment({ files: [], timeline: [] }));

    expect(await screen.findByText("Nenhum comprovante enviado")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Linha do tempo/ }));
    expect(await screen.findByText(/Nenhum evento disponível/i)).toBeInTheDocument();
  });
});
