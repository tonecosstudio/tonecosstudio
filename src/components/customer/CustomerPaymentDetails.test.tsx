import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyPaymentById } from "@/lib/payment-service";
import type { PaymentDetails } from "@/types/manual-payment";
import { CustomerPaymentDetails } from "./CustomerPaymentDetails";

const toastMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/payment-service", () => ({
  getMyPaymentById: vi.fn(),
}));

vi.mock("@/components/customer/FileUploadComponent", () => ({
  FileUploadComponent: ({ paymentId }: { paymentId: string }) => (
    <div data-testid="file-upload">upload:{paymentId}</div>
  ),
}));

vi.mock("@/components/customer/UploadedFilesList", () => ({
  UploadedFilesList: ({ paymentId }: { paymentId: string }) => (
    <div data-testid="uploaded-files">files:{paymentId}</div>
  ),
}));

vi.mock("lucide-react", () => {
  const Icon = () => <span aria-hidden="true" />;
  return {
    AlertCircle: Icon,
    ArrowLeft: Icon,
    CheckCircle: Icon,
    Clock: Icon,
    CreditCard: Icon,
    Eye: Icon,
    FileCheck: Icon,
    History: Icon,
    Info: Icon,
    Upload: Icon,
    XCircle: Icon,
  };
});

const mockGetMyPaymentById = vi.mocked(getMyPaymentById);

function createPayment(overrides: Partial<PaymentDetails> = {}): PaymentDetails {
  return {
    id: "payment-123",
    reference_number: "PAY-2026-001",
    user_id: "user-123",
    payment_method_id: "method-123",
    amount: 250,
    currency: "BRL",
    payment_type: "one_time",
    status: "pending",
    rejection_reason: null,
    created_at: "2026-09-13T12:00:00Z",
    updated_at: "2026-09-13T12:00:00Z",
    approved_at: null,
    approved_by: null,
    payment_method: {
      id: "method-123",
      name: "PIX",
      type: "pix",
      instructions: "Use a chave PIX informada abaixo.",
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
        id: "event-created",
        payment_id: "payment-123",
        action_type: "created",
        old_status: null,
        new_status: "pending",
        notes: null,
        created_at: "2026-09-13T12:00:00Z",
      },
    ],
    customer_name: "Cliente Teste",
    customer_email: "cliente@example.com",
    ...overrides,
  };
}

function renderDetails(payment: PaymentDetails) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  mockGetMyPaymentById.mockResolvedValue(payment);

  return render(
    <QueryClientProvider client={queryClient}>
      <CustomerPaymentDetails paymentId={payment.id} />
    </QueryClientProvider>,
  );
}

describe("CustomerPaymentDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the canonical payment timeline", async () => {
    renderDetails(
      createPayment({
        status: "under_review",
        timeline: [
          {
            id: "event-upload",
            payment_id: "payment-123",
            action_type: "file_uploaded",
            old_status: "pending",
            new_status: "under_review",
            notes: "Comprovante recebido.",
            created_at: "2026-09-13T12:05:00Z",
          },
        ],
      }),
    );

    expect(await screen.findByText("Pagamento PAY-2026-001")).toBeInTheDocument();
    expect(screen.getByText("Comprovante enviado")).toBeInTheDocument();
    expect(screen.getByText("Comprovante recebido.")).toBeInTheDocument();
    expect(screen.queryByText(/Admin ID/i)).not.toBeInTheDocument();
  });

  it("shows the sanitized information request message", async () => {
    renderDetails(
      createPayment({
        status: "requires_info",
        timeline: [
          {
            id: "event-info",
            payment_id: "payment-123",
            action_type: "info_requested",
            old_status: "under_review",
            new_status: "requires_info",
            notes: "Envie um comprovante com a data visivel.",
            created_at: "2026-09-13T12:10:00Z",
          },
        ],
      }),
    );

    expect(await screen.findByText("Precisa de informacoes")).toBeInTheDocument();
    expect(screen.getAllByText("Envie um comprovante com a data visivel.").length).toBeGreaterThan(0);
  });

  it("keeps proof upload reachable for actionable statuses", async () => {
    const user = userEvent.setup();
    renderDetails(createPayment());

    await screen.findByText("Pagamento PAY-2026-001");
    await user.click(screen.getByRole("button", { name: "Ir para comprovantes" }));

    expect(await screen.findByTestId("file-upload")).toHaveTextContent("upload:payment-123");
    expect(screen.getByTestId("uploaded-files")).toHaveTextContent("files:payment-123");
  });
});
