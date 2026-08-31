import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentVoucherUpload } from "../PaymentVoucherUpload";
import { supabase } from "@/integrations/supabase/client";
import {
  assertCurrentUserId,
  requireAuthenticatedUserId,
} from "@/services/auth/current-user";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({ upload: vi.fn() })),
    },
  },
}));

vi.mock("@/services/auth/current-user", () => ({
  assertCurrentUserId: vi.fn().mockResolvedValue("11111111-1111-4111-8111-111111111111"),
  requireAuthenticatedUserId: vi.fn().mockResolvedValue("11111111-1111-4111-8111-111111111111"),
}));

Object.defineProperty(global.URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "blob:mock-url"),
});
Object.defineProperty(global.URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});

const USER_ID = "11111111-1111-4111-8111-111111111111";

function createMockFile(name: string, size: number, type: string): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("PaymentVoucherUpload", () => {
  const onUploadSuccess = vi.fn();
  const onUploadError = vi.fn();
  const upload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload } as never);
    vi.mocked(assertCurrentUserId).mockResolvedValue(USER_ID);
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue(USER_ID);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the private voucher upload surface", () => {
    render(<PaymentVoucherUpload onUploadSuccess={onUploadSuccess} />);

    expect(screen.getByText("Comprovante de Pagamento")).toBeInTheDocument();
    expect(screen.getByText(/Armazenamento privado/i)).toBeInTheDocument();
    expect(screen.getByText(/JPG, PNG ou PDF/i)).toBeInTheDocument();
  });

  it("uploads to the authenticated user's private subscriptions folder", async () => {
    render(
      <PaymentVoucherUpload
        onUploadSuccess={onUploadSuccess}
        userId={USER_ID}
        pathPrefix="subscriptions"
      />,
    );

    const file = createMockFile("proof.jpg", 1024, "image/jpeg");
    await userEvent.upload(screen.getByLabelText("Comprovante de Pagamento"), file);

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalled());

    expect(assertCurrentUserId).toHaveBeenCalledWith(USER_ID);
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `^subscriptions/${USER_ID}/\\d{10,16}-[0-9a-f]{16}\\.jpg$`,
        ),
      ),
      file,
      expect.objectContaining({ upsert: false, contentType: "image/jpeg" }),
    );

    const [path] = onUploadSuccess.mock.calls[0] as [string, File];
    expect(path).toMatch(
      new RegExp(`^subscriptions/${USER_ID}/\\d{10,16}-[0-9a-f]{16}\\.jpg$`),
    );
    expect(path).not.toMatch(/^https?:\/\//);
  });

  it("requires an authenticated user when userId is omitted", async () => {
    render(<PaymentVoucherUpload onUploadSuccess={onUploadSuccess} />);

    const file = createMockFile("proof.png", 1024, "image/png");
    await userEvent.upload(screen.getByLabelText("Comprovante de Pagamento"), file);

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalled());
    expect(requireAuthenticatedUserId).toHaveBeenCalledTimes(1);
  });

  it("rejects files larger than 5 MB before storage", async () => {
    render(
      <PaymentVoucherUpload
        onUploadSuccess={onUploadSuccess}
        onUploadError={onUploadError}
      />,
    );

    const file = createMockFile("large.jpg", 5 * 1024 * 1024 + 1, "image/jpeg");
    await userEvent.upload(screen.getByLabelText("Comprovante de Pagamento"), file);

    await waitFor(() => expect(onUploadError).toHaveBeenCalled());
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByText(/Arquivo muito grande/i)).toBeInTheDocument();
  });

  it("rejects unsupported MIME types before storage", async () => {
    render(
      <PaymentVoucherUpload
        onUploadSuccess={onUploadSuccess}
        onUploadError={onUploadError}
      />,
    );

    const file = createMockFile("payload.txt", 1024, "text/plain");
    fireEvent.drop(screen.getByText(/Arraste e solte/i).closest("div")!.parentElement!, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => expect(onUploadError).toHaveBeenCalled());
    expect(upload).not.toHaveBeenCalled();
  });

  it("surfaces storage upload failures", async () => {
    upload.mockResolvedValue({ error: { message: "RLS denied upload" } });

    render(
      <PaymentVoucherUpload
        onUploadSuccess={onUploadSuccess}
        onUploadError={onUploadError}
      />,
    );

    const file = createMockFile("proof.pdf", 1024, "application/pdf");
    await userEvent.upload(screen.getByLabelText("Comprovante de Pagamento"), file);

    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith(expect.stringContaining("RLS denied upload"));
    });
    expect(screen.getByText(/Erro no upload/i)).toBeInTheDocument();
  });

  it("does not attempt an upload while disabled", async () => {
    render(<PaymentVoucherUpload onUploadSuccess={onUploadSuccess} disabled />);

    const input = screen.getByLabelText("Comprovante de Pagamento");
    expect(input).toBeDisabled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("keeps image preview local and revokes it on removal", async () => {
    render(<PaymentVoucherUpload onUploadSuccess={onUploadSuccess} showPreview />);

    const file = createMockFile("proof.jpg", 1024, "image/jpeg");
    await userEvent.upload(screen.getByLabelText("Comprovante de Pagamento"), file);

    const preview = await screen.findByAltText("Preview do comprovante");
    expect(preview).toHaveAttribute("src", "blob:mock-url");

    await userEvent.click(screen.getByRole("button", { name: "Remover comprovante" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(screen.getByText(/Arraste e solte/i)).toBeInTheDocument();
  });
});
