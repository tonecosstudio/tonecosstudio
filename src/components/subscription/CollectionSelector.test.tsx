import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollectionSelector, Collection } from "./CollectionSelector";

vi.mock("@/hooks/useCollectionPrice", () => ({
  useCollectionPrice: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
  }),
}));

const mockCollections: Collection[] = [
  {
    id: "col-1",
    name: "Marvel",
    description: "Heróis da Marvel",
    slug: "marvel",
    is_active: true,
    available_for_plans: ["trimestral", "semestral"],
    is_semestral_exclusive: false,
  },
  {
    id: "col-2",
    name: "DC Comics",
    description: "Heróis da DC",
    slug: "dc",
    is_active: true,
    available_for_plans: ["trimestral", "semestral"],
    is_semestral_exclusive: false,
  },
  {
    id: "col-3",
    name: "Edição Especial",
    description: "Coleção exclusiva",
    slug: "especial",
    is_active: true,
    available_for_plans: ["semestral"],
    is_semestral_exclusive: true,
  },
];

describe("CollectionSelector", () => {
  it("renders loading state", () => {
    render(
      <CollectionSelector
        planId="plan-1"
        planType="trimestral"
        onCollectionSelect={vi.fn()}
        collections={[]}
        isLoading={true}
      />
    );

    expect(screen.getByText("Carregando coleções disponíveis...")).toBeInTheDocument();
  });

  it("shows message when no plan selected", () => {
    render(
      <CollectionSelector
        planId=""
        planType="trimestral"
        onCollectionSelect={vi.fn()}
        collections={mockCollections}
      />
    );

    expect(
      screen.getByText("Selecione um plano primeiro para ver as coleções disponíveis")
    ).toBeInTheDocument();
  });

  it("renders all available collections for trimestral plan", () => {
    render(
      <CollectionSelector
        planId="plan-1"
        planType="trimestral"
        onCollectionSelect={vi.fn()}
        collections={mockCollections}
      />
    );

    expect(screen.getByText("Marvel")).toBeInTheDocument();
    expect(screen.getByText("DC Comics")).toBeInTheDocument();
    expect(screen.queryByText("Edição Especial")).not.toBeInTheDocument();
  });

  it("renders all collections including exclusive for semestral plan", () => {
    render(
      <CollectionSelector
        planId="plan-2"
        planType="semestral"
        onCollectionSelect={vi.fn()}
        collections={mockCollections}
      />
    );

    expect(screen.getByText("Marvel")).toBeInTheDocument();
    expect(screen.getByText("DC Comics")).toBeInTheDocument();
    expect(screen.getByText("Edição Especial")).toBeInTheDocument();
  });

  it("shows exclusive badge for semestral-only collections", () => {
    render(
      <CollectionSelector
        planId="plan-2"
        planType="semestral"
        onCollectionSelect={vi.fn()}
        collections={mockCollections}
      />
    );

    expect(screen.getByText("Exclusivo do Plano Semestral")).toBeInTheDocument();
  });

  it("calls onCollectionSelect when collection is clicked", () => {
    const onCollectionSelect = vi.fn();
    render(
      <CollectionSelector
        planId="plan-1"
        planType="trimestral"
        onCollectionSelect={onCollectionSelect}
        collections={mockCollections}
      />
    );

    const marvelCard = screen.getByRole("button", { name: /Marvel/i });
    fireEvent.click(marvelCard!);

    expect(onCollectionSelect).toHaveBeenCalledWith("col-1");
  });

  it("highlights selected collection", () => {
    render(
      <CollectionSelector
        planId="plan-1"
        planType="trimestral"
        selectedCollectionId="col-1"
        onCollectionSelect={vi.fn()}
        collections={mockCollections}
      />
    );

    const marvelCard = screen.getByRole("button", { name: /Marvel/i });
    expect(marvelCard).toHaveClass("border-primary");
  });

  it("marks selected collection as pressed for assistive technologies", () => {
    render(
      <CollectionSelector
        planId="plan-1"
        planType="trimestral"
        selectedCollectionId="col-1"
        onCollectionSelect={vi.fn()}
        collections={mockCollections}
      />
    );

    expect(screen.getByRole("button", { name: /Marvel/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("disables selection when disabled prop is true", () => {
    const onCollectionSelect = vi.fn();
    render(
      <CollectionSelector
        planId="plan-1"
        planType="trimestral"
        onCollectionSelect={onCollectionSelect}
        collections={mockCollections}
        disabled={true}
      />
    );

    const marvelCard = screen.getByRole("button", { name: /Marvel/i });
    fireEvent.click(marvelCard!);

    expect(onCollectionSelect).not.toHaveBeenCalled();
    expect(marvelCard).toHaveAttribute("aria-disabled", "true");
  });

  it("shows info alert about unlimited changes", () => {
    render(
      <CollectionSelector
        planId="plan-1"
        planType="trimestral"
        onCollectionSelect={vi.fn()}
        collections={mockCollections}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Você poderá trocar de personagem ILIMITADAMENTE/
    );
  });

  it("renders empty state when no collections available", () => {
    render(
      <CollectionSelector
        planId="plan-1"
        planType="trimestral"
        onCollectionSelect={vi.fn()}
        collections={[]}
      />
    );

    expect(screen.getByText("Nenhuma coleção disponível para este plano")).toBeInTheDocument();
  });
});
