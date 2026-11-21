import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  listStudios: vi.fn(),
  searchIndex: vi.fn(),
  getDraft: vi.fn(),
  editDraft: vi.fn(),
  getImage: vi.fn(),
}));
// Keep this unit suite focused on the editor; CommercialPage imports the
// complete backoffice and is not needed to exercise its form or navigation.
vi.mock("./CommercialPage", () => ({
  actionClass: "btn-primary",
  secondaryClass: "btn-secondary",
}));

vi.mock("@/services/catalog/tonart-telegram-drafts", () => ({
  listTelegramDraftStudios: mocks.listStudios,
  searchTelegramStudioIndex: mocks.searchIndex,
  getTelegramDraft: mocks.getDraft,
  editTelegramDraft: mocks.editDraft,
  getTelegramDraftImage: mocks.getImage,
  telegramStudioCoverUrl: () => undefined,
}));
import TonartTelegramDrafts from "./TonartTelegramDrafts";

const id = (n: number) => "tg_" + n.toString(16).padStart(24, "0");
const indexed = (n: number) => ({
  id: id(n),
  name: "Modelo " + n,
  studio: "Wicked",
  character: "Personagem " + n,
  variant: "",
  imageCount: 1,
  provisional: true,
  cover: null,
});
const draft = (n: number) => ({
  ...indexed(n),
  source: "telegram_studios" as const,
  groupKey: "wicked",
  originId: "2370335738",
  collection: "Telegram",
  provisionalName: true,
  reviewStatus: "pending" as const,
  rightsStatus: "not_reviewed" as const,
  revision: 0,
  published: false as const,
  images: [
    {
      messageId: 9000 + n,
      sha256: "a".repeat(64),
      role: "cover" as const,
      position: 0,
      thumbPath: "/thumb",
      displayPath: "/display",
    },
  ],
});
const page = (offset: number, onlyProvisional = false) => {
  const available = Array.from({ length: 25 }, (_, i) => i + 1).filter(
    (number) => !onlyProvisional || current.get(id(number))?.provisionalName,
  );
  return {
    total: available.length,
    limit: 24,
    offset,
    items: available.slice(offset, offset + 24).map(indexed),
  };
};
let current: Map<string, ReturnType<typeof draft>>;
const editor = () =>
  within(screen.getByRole("dialog", { name: "Editor de estatueta Telegram" }));

beforeEach(() => {
  vi.clearAllMocks();
  current = new Map(
    Array.from({ length: 25 }, (_, i) => {
      const model = draft(i + 1);
      return [model.id, model];
    }),
  );
  mocks.listStudios.mockResolvedValue({
    studios: [{ studio: "Wicked", total: 25 }],
  });
  mocks.searchIndex.mockImplementation(
    async (_s: string, _q: string, offset: number, onlyProvisional = false) =>
      page(offset, onlyProvisional),
  );
  mocks.getDraft.mockImplementation(async (key: string) => current.get(key));
  mocks.getImage.mockRejectedValue(
    new Error("private media unavailable in isolated test"),
  );
  mocks.editDraft.mockImplementation(
    async (
      key: string,
      form: {
        name: string;
        studio: string;
        character: string;
        variant: string;
        reviewStatus: "pending" | "reviewing" | "confirmed" | "rejected";
        revision: number;
      },
    ) => {
      const old = current.get(key)!;
      const next = {
        ...old,
        name: form.name.trim(),
        studio: form.studio.trim(),
        character: form.character.trim(),
        variant: form.variant.trim(),
        reviewStatus: form.reviewStatus,
        revision: old.revision + 1,
        provisionalName:
          form.reviewStatus === "confirmed" ? false : old.provisionalName,
      };
      current.set(key, next);
      return next;
    },
  );
});
afterEach(() => cleanup());

async function openLast() {
  render(<TonartTelegramDrafts />);
  fireEvent.click(await screen.findByRole("button", { name: /Modelo 24/ }));
  expect(
    await editor().findByRole("heading", { name: "Modelo 24" }),
  ).toBeInTheDocument();
}

describe("TONART: curadoria contínua em lotes de 24", () => {
  it("navigates from model 24 to 25 and back without an unintended write", async () => {
    await openLast();
    fireEvent.click(
      editor().getByRole("button", { name: "Abrir próxima ficha" }),
    );
    expect(
      await editor().findByRole("heading", { name: "Modelo 25" }),
    ).toBeInTheDocument();
    expect(
      await editor().findByText("Ficha 25 de 25 nesta seleção"),
    ).toBeInTheDocument();
    expect(mocks.searchIndex).toHaveBeenCalledWith("", "", 24, false);
    expect(
      editor().getByRole("button", { name: "Abrir próxima ficha" }),
    ).toBeDisabled();
    expect(mocks.editDraft).not.toHaveBeenCalled();
    fireEvent.click(
      editor().getByRole("button", { name: "Abrir ficha anterior" }),
    );
    expect(
      await editor().findByRole("heading", { name: "Modelo 24" }),
    ).toBeInTheDocument();
    expect(mocks.searchIndex).toHaveBeenCalledWith("", "", 0, false);
  });

  it("only advances after saving and reading the verified revision", async () => {
    await openLast();
    fireEvent.change(editor().getByLabelText("Nome da escultura"), {
      target: { value: "Modelo 24 revisado" },
    });
    fireEvent.click(
      editor().getByRole("button", { name: "Salvar e abrir próxima ficha →" }),
    );
    expect(
      await editor().findByRole("heading", { name: "Modelo 25" }),
    ).toBeInTheDocument();
    expect(mocks.editDraft).toHaveBeenCalledWith(
      id(24),
      expect.objectContaining({
        revision: 0,
        name: "Modelo 24 revisado",
      }),
    );
    expect(current.get(id(24))?.name).toBe("Modelo 24 revisado");
    expect(current.get(id(24))?.revision).toBe(1);
    expect(mocks.getDraft).toHaveBeenCalledWith(id(24));
    expect(mocks.searchIndex).toHaveBeenCalledWith("", "", 24, false);
  });

  it("blocks advancing after a failed persistence check", async () => {
    await openLast();
    mocks.editDraft.mockResolvedValueOnce({ ...draft(24), revision: 1 });
    fireEvent.change(editor().getByLabelText("Nome da escultura"), {
      target: { value: "Identificação não persistida" },
    });
    fireEvent.click(
      editor().getByRole("button", { name: "Salvar e abrir próxima ficha →" }),
    );
    await waitFor(() =>
      expect(editor().getByRole("alert")).toHaveTextContent(
        "A gravação não pôde ser reconfirmada",
      ),
    );
    expect(
      editor().getByRole("heading", { name: "Modelo 24" }),
    ).toBeInTheDocument();
    expect(mocks.searchIndex).not.toHaveBeenCalledWith("", "", 24, false);
  });

  it("filters provisional identities and advances correctly when confirmation removes model 24", async () => {
    render(<TonartTelegramDrafts />);
    fireEvent.click(
      screen.getByRole("button", { name: /Somente identidades provisórias/ }),
    );
    await waitFor(() =>
      expect(mocks.searchIndex).toHaveBeenCalledWith("", "", 0, true),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Modelo 24/ }));
    expect(
      await editor().findByRole("heading", { name: "Modelo 24" }),
    ).toBeInTheDocument();
    fireEvent.change(editor().getByLabelText("Estado da revisão"), {
      target: { value: "confirmed" },
    });
    fireEvent.click(
      editor().getByRole("button", { name: "Salvar e abrir próxima ficha →" }),
    );
    expect(
      await editor().findByRole("heading", { name: "Modelo 25" }),
    ).toBeInTheDocument();
    expect(current.get(id(24))?.provisionalName).toBe(false);
    expect(current.get(id(24))?.reviewStatus).toBe("confirmed");
    expect(mocks.searchIndex).toHaveBeenCalledWith("", "", 0, true);
    expect(
      editor().getByText("Ficha 24 de 24 nesta seleção"),
    ).toBeInTheDocument();
  });

  it("reports a navigation failure without falsely reversing a saved model", async () => {
    await openLast();
    mocks.searchIndex.mockImplementation(
      async (_s: string, _q: string, offset: number) => {
        if (offset === 24) throw new Error("adjacent page failed");
        return page(offset);
      },
    );
    fireEvent.change(editor().getByLabelText("Nome da escultura"), {
      target: { value: "Modelo 24 revisado" },
    });
    fireEvent.click(
      editor().getByRole("button", { name: "Salvar e abrir próxima ficha →" }),
    );
    await waitFor(() =>
      expect(editor().getByRole("alert")).toHaveTextContent(
        "Ficha salva e verificada, mas a próxima página não carregou",
      ),
    );
    expect(
      editor().getByRole("heading", { name: "Modelo 24 revisado" }),
    ).toBeInTheDocument();
    expect(current.get(id(24))?.revision).toBe(1);
    expect(mocks.editDraft).toHaveBeenCalledTimes(1);
  });
});
