import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionCollectionCuration } from "./SubscriptionCollectionCuration";

const mocks = vi.hoisted(() => ({
  listCollections: vi.fn(),
  saveModels: vi.fn(),
  loadModels: vi.fn(),
  searchModels: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/services/admin/catalog/admin-subscription-collection-curation-service", () => ({
  listAdminSubscriptionCollections: mocks.listCollections,
  saveAdminSubscriptionCollectionModels: mocks.saveModels,
}));

vi.mock("@/services/subscriptions/subscription-catalog-service", () => ({
  loadSubscriptionCatalogModels: mocks.loadModels,
  searchSubscriptionCatalogModels: mocks.searchModels,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const collection = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Terror",
  slug: "terror",
  is_active: true,
  catalog_model_slugs: [],
};

const model = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "monstro-do-pantano",
  code: "TER-001",
  name: "Monstro do Pântano",
  variantName: "Edição clássica",
  category: "Filmes e séries",
  categorySlug: "filmes-series",
  franchise: "Terror",
  franchiseSlug: "terror",
  collection: null,
  folderPath: null,
  imageCount: 1,
  galleryVersion: 1,
  coverStorageKey: null,
  imageUrl: null,
};

function renderCuration() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SubscriptionCollectionCuration />
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe("subscription collection curation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCollections.mockResolvedValue([collection]);
    mocks.saveModels.mockResolvedValue(undefined);
    mocks.loadModels.mockResolvedValue([]);
    mocks.searchModels.mockResolvedValue({
      items: [model],
      nextCursor: null,
    });
  });

  it("keeps catalog names and variants visible while the collection draft changes", async () => {
    renderCuration();

    const search = await screen.findByRole("textbox", {
      name: "Buscar modelos publicados",
    });
    fireEvent.change(search, {
      target: { value: "terror" },
    });
    await screen.findByRole("button", { name: /Monstro do Pântano/ });
    fireEvent.click(screen.getByRole("button", { name: /Monstro do Pântano/ }));

    const selection = screen.getByRole("region", { name: "Seleção da coleção" });
    expect(selection).toHaveTextContent("Monstro do Pântano · Edição clássica");
    expect(selection).toHaveTextContent("Terror");
    expect(selection).not.toHaveTextContent("monstro-do-pantano");

    fireEvent.change(search, {
      target: { value: "" },
    });

    expect(selection).toHaveTextContent("Monstro do Pântano · Edição clássica");
    expect(screen.getByRole("button", { name: "Salvar seleção" })).toBeEnabled();
  });
});
