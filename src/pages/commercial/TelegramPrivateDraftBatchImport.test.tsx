import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TelegramPrivateDraftBatchImport from "./TelegramPrivateDraftBatchImport";

const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
  importDraft: vi.fn(),
}));

vi.mock("@/services/catalog/telegram-private-import-plan", () => ({
  parsePrivateTelegramPlan: mocks.parse,
}));
vi.mock("@/services/catalog/tonart-telegram-drafts", () => ({
  importPrivateTelegramDraft: mocks.importDraft,
}));

const manifest = {
  originId: "2370335738",
  studio: "Momoji",
  groupKey: "single:24268",
  name: "Modelo sem nome #24268",
  universe: "Naruto",
  variant: "",
  franchiseId: 48,
  images: [{ messageId: 24268, sha256: "a".repeat(64) }],
};

const plan = {
  sha256: "f".repeat(64),
  studioCount: 1,
  photoCount: 1,
  drafts: [{
    id: "tg_" + "b".repeat(24),
    operationId: "c".repeat(64),
    studio: "Momoji",
    manifest,
  }],
};

async function loadPlan() {
  const file = new File(["{}"], "rascunhos_telegram_importacao_privada.jsonl", {
    type: "text/plain",
  });
  Object.defineProperty(file, "text", {
    value: vi.fn().mockResolvedValue("{}"),
  });
  fireEvent.change(screen.getByLabelText(/Plano privado da Curadoria/), {
    target: { files: [file] },
  });
  await waitFor(() => expect(mocks.parse).toHaveBeenCalledWith("{}"));
  expect(await screen.findByText(/Plano validado localmente/)).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.parse.mockResolvedValue(plan);
  mocks.importDraft.mockResolvedValue({
    id: plan.drafts[0].id,
    created: true,
    reused: false,
    published: false,
    imageCount: 1,
  });
});

afterEach(() => cleanup());

describe("TONART existing admin Worker private import workbench", () => {
  it("never sends a record before explicit confirmation and click", async () => {
    render(<TelegramPrivateDraftBatchImport />);
    await loadPlan();
    expect(mocks.importDraft).not.toHaveBeenCalled();
    const start = screen.getByRole("button", { name: "Iniciar importação privada" });
    expect(start).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(start).toBeEnabled();
    fireEvent.click(start);
    await waitFor(() => expect(mocks.importDraft).toHaveBeenCalledTimes(1));
    expect(mocks.importDraft).toHaveBeenCalledWith(manifest);
    expect(await screen.findByText(/Lote concluído/)).toBeInTheDocument();
    expect(screen.getByText(/1 criadas/)).toBeInTheDocument();
    expect(screen.getByText(/1 de 1 verificadas/)).toBeInTheDocument();
  });

  it("stops on unexpected Worker result and never acknowledges a public draft", async () => {
    mocks.importDraft.mockResolvedValueOnce({
      id: plan.drafts[0].id,
      created: true,
      reused: false,
      published: true,
    });
    render(<TelegramPrivateDraftBatchImport />);
    await loadPlan();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Iniciar importação privada" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Resposta inesperada do Worker/,
    );
    expect(screen.getByText(/0 de 1 verificadas/)).toBeInTheDocument();
    expect(mocks.importDraft).toHaveBeenCalledTimes(1);
  });

  it("rejects a bad local file without sending any network request", async () => {
    mocks.parse.mockRejectedValueOnce(new Error("private_import_plan_not_private_new_draft"));
    render(<TelegramPrivateDraftBatchImport />);
    const file = new File(["bad"], "bad.jsonl");
    Object.defineProperty(file, "text", { value: async () => "bad" });
    fireEvent.change(screen.getByLabelText(/Plano privado da Curadoria/), {
      target: { files: [file] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "private_import_plan_not_private_new_draft",
    );
    expect(mocks.importDraft).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Iniciar importação privada" }))
      .not.toBeInTheDocument();
  });
});
