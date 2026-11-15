import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PlansArcade from "@/pages/PlansArcade";

const mocks = vi.hoisted(() => ({
  useSubscribeCollectionCheckout: vi.fn(),
  usePricingSettings: vi.fn(),
}));

vi.mock("@/hooks/subscription/useSubscribeCollectionCheckout", () => ({
  useSubscribeCollectionCheckout: mocks.useSubscribeCollectionCheckout,
}));
vi.mock("@/hooks/usePricingSettings", () => ({
  usePricingSettings: mocks.usePricingSettings,
}));
vi.mock("@/hooks/useContentSettings", () => ({
  useContentVariable: () => "Consulte as informações de entrega da coleção.",
}));
vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeHero: () => null,
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  ArcadeCard: ({ children }: { children: ReactNode }) => <article>{children}</article>,
  ArcadeCTA: () => null,
}));

const PLAN_ID = "22222222-2222-4222-8222-222222222222";
const TERROR_ID = "11111111-1111-4111-8111-111111111111";
const SCIFI_ID = "33333333-3333-4333-8333-333333333333";

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderPlansPage() {
  return render(
    <MemoryRouter initialEntries={["/planos"]}>
      <LocationProbe />
      <Routes>
        <Route path="/planos" element={<PlansArcade />} />
        <Route path="/colecoes/:slug/assinar" element={<p>Checkout</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PlansArcade curated subscription entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSubscribeCollectionCheckout.mockReturnValue({
      plans: [{
        id: PLAN_ID,
        name: "Plano Terror",
        description: "Escolha modelos da coleção.",
        plan_type: "trimestral",
        price_pix: 270,
        price_full: 300,
        deliveries_total: 3,
        total_credits: 120,
        model_selection_limit: 6,
        is_active: true,
      }],
      collections: [
        {
          id: TERROR_ID,
          name: "Terror",
          slug: "terror",
          catalog_model_slugs: Array.from({ length: 20 }, (_, index) => `terror-${index}`),
        },
        {
          id: SCIFI_ID,
          name: "Ficção científica",
          slug: "ficcao-cientifica",
          catalog_model_slugs: Array.from({ length: 12 }, (_, index) => `scifi-${index}`),
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          name: "Coleção em preparação",
          slug: "em-preparacao",
          catalog_model_slugs: ["only-five-1", "only-five-2", "only-five-3", "only-five-4", "only-five-5"],
        },
      ],
      plansLoading: false,
      collectionsLoading: false,
      loadError: null,
      retryLoad: vi.fn(),
    });
    mocks.usePricingSettings.mockReturnValue({
      data: { defaultPriceFull: 300 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("routes into the selected curated collection and carries the selected plan", () => {
    renderPlansPage();

    const collectionSelect = screen.getByRole("combobox", { name: "Coleção para sua assinatura" });
    expect(collectionSelect).toHaveValue(TERROR_ID);
    expect(screen.queryByRole("option", { name: "Coleção em preparação · 5 modelos" })).not.toBeInTheDocument();

    fireEvent.change(collectionSelect, { target: { value: SCIFI_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Escolher 6 modelos" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      `/colecoes/ficcao-cientifica/assinar?plan=${PLAN_ID}`,
    );
  });
});
