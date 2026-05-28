/**
 * CollectionForm Component Tests
 *
 * Tests for the current tabbed collection form, including pricing tier
 * selection, validation, submission, characters, and edit mode.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { CollectionForm } from "./CollectionForm";

const { mockToast, mockUseCollectionFormPricingTiers, mockUseCollectionTierAssignment } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockUseCollectionFormPricingTiers: vi.fn(),
  mockUseCollectionTierAssignment: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/admin/useCollectionFormPricingTiers", () => ({
  useCollectionFormPricingTiers: mockUseCollectionFormPricingTiers,
}));

vi.mock("@/hooks/useCollectionTierAssignment", () => ({
  useCollectionTierAssignment: mockUseCollectionTierAssignment,
}));

vi.mock("../shared/ImageUpload", () => ({
  default: ({
    label,
    currentImageUrl,
    onUploadComplete,
  }: {
    label: string;
    currentImageUrl?: string;
    onUploadComplete: (url: string) => void;
  }) => (
    <div data-testid="image-upload">
      <span>{label}</span>
      {currentImageUrl && <span>{currentImageUrl}</span>}
      <button type="button" onClick={() => onUploadComplete("https://example.com/image.jpg")}>
        Upload Image
      </button>
    </div>
  ),
}));

vi.mock("./CollectionCharactersManager", () => ({
  CollectionCharactersManager: ({
    characters,
    onChange,
    disabled,
  }: {
    characters: Array<{
      id: string;
      name: string;
      description: string;
      releaseMonth: number;
      releaseYear: number;
      imageUrl: string;
      releaseOrder: number;
    }>;
    onChange: (characters: Array<{
      id: string;
      name: string;
      description: string;
      releaseMonth: number;
      releaseYear: number;
      imageUrl: string;
      releaseOrder: number;
    }>) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="characters-manager">
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...characters,
            {
              id: "character-1",
              name: "Superman",
              description: "Hero character",
              releaseMonth: 1,
              releaseYear: 2026,
              imageUrl: "https://example.com/superman.jpg",
              releaseOrder: 1,
            },
          ])
        }
      >
        Add Character
      </button>
      {characters.map((character) => (
        <span key={character.id}>{character.name}</span>
      ))}
    </div>
  ),
}));

vi.mock("../pricing-tiers/CollectionTierAssignment", () => ({
  CollectionTierAssignment: () => <div data-testid="tier-assignment" />,
}));

interface Collection {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  rotation_type: "fixed" | "odd_months" | "even_months";
  is_active: boolean;
  is_price_custom?: boolean;
}

const defaultTierId = "11111111-1111-4111-8111-111111111111";
const defaultTier = {
  id: defaultTierId,
  name: "Plano Mensal",
  description: "Nivel padrao",
  price_full: 299.9,
  deposit_amount: 50,
  price_pix: 284.91,
  pix_discount_percentage: 5,
  is_default: true,
};

describe("CollectionForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockUseCollectionFormPricingTiers.mockReturnValue({ data: [defaultTier] });
    mockUseCollectionTierAssignment.mockReturnValue({ data: null, isLoading: false });
  });

  const render = (ui: ReactElement) =>
    rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

  const fillBasicFields = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText(/nome da cole/i), "Coleção Marvel");
    await user.type(screen.getByLabelText(/descri/i), "Coleção de personagens Marvel");
    await user.click(screen.getByRole("button", { name: /upload image/i }));
  };

  it("renders a new collection form with empty fields", () => {
    render(
      <CollectionForm open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />,
    );

    expect(screen.getByText("Nova Coleção")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Heróis da Marvel")).toHaveValue("");
    expect(screen.getByPlaceholderText("Descreva a coleção...")).toHaveValue("");
    expect(screen.getByText("Imagem da Coleção *")).toBeInTheDocument();
  });

  it("validates required basic fields", async () => {
    const user = userEvent.setup();
    render(
      <CollectionForm open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />,
    );

    await user.click(screen.getByRole("button", { name: /criar coleção/i }));

    await waitFor(() => {
      expect(screen.getByText("Nome é obrigatório")).toBeInTheDocument();
      expect(screen.getByText("Descrição é obrigatória")).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("requires a pricing tier before submitting", async () => {
    const user = userEvent.setup();
    mockUseCollectionFormPricingTiers.mockReturnValue({ data: [] });

    render(
      <CollectionForm open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />,
    );

    await fillBasicFields(user);
    await user.click(screen.getByRole("button", { name: /criar coleção/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Nível de preço obrigatório" }),
      );
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits a new collection with valid data", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <CollectionForm open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />,
    );

    await fillBasicFields(user);
    await user.click(screen.getByRole("button", { name: /criar coleção/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Coleção Marvel",
          description: "Coleção de personagens Marvel",
          image_url: "https://example.com/image.jpg",
          rotation_type: "fixed",
          tier_id: defaultTierId,
          is_active: true,
          characters: [],
        }),
      );
    });
  });

  it("renders edit mode with collection data", async () => {
    const collection: Collection = {
      id: "1",
      name: "Coleção DC",
      description: "Coleção de personagens DC",
      cover_image_url: "https://example.com/dc.jpg",
      rotation_type: "odd_months",
      is_active: true,
    };

    render(
      <CollectionForm
        collection={collection}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
      />,
    );

    expect(screen.getByText("Editar Coleção")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Coleção DC")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Coleção de personagens DC")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/dc.jpg")).toBeInTheDocument();
  });

  it("updates a collection with modified data", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    const collection: Collection = {
      id: "1",
      name: "Coleção DC",
      description: "Coleção de personagens DC",
      cover_image_url: "https://example.com/dc.jpg",
      rotation_type: "fixed",
      is_active: true,
    };

    render(
      <CollectionForm
        collection={collection}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
      />,
    );

    const nameInput = await screen.findByDisplayValue("Coleção DC");
    await user.clear(nameInput);
    await user.type(nameInput, "Coleção DC Atualizada");
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Coleção DC Atualizada",
          description: "Coleção de personagens DC",
          image_url: "https://example.com/dc.jpg",
          tier_id: defaultTierId,
        }),
      );
    });
  });

  it("does not show the month calendar for fixed rotation", () => {
    render(
      <CollectionForm open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />,
    );

    expect(screen.queryByText("Jan")).not.toBeInTheDocument();
  });

  it("shows the month calendar for odd and even month rotation collections", async () => {
    const oddCollection: Collection = {
      id: "1",
      name: "Coleção Teste",
      description: "Descrição teste",
      cover_image_url: "https://example.com/image.jpg",
      rotation_type: "odd_months",
      is_active: true,
    };

    const { rerender } = render(
      <CollectionForm
        collection={oddCollection}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
      />,
    );

    expect(await screen.findByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Fev")).toBeInTheDocument();
    expect(screen.getByText("Dez")).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient}>
        <CollectionForm
          collection={{ ...oddCollection, id: "2", rotation_type: "even_months" }}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Fev")).toBeInTheDocument();
    expect(screen.getByText("Dez")).toBeInTheDocument();
  });

  it("submits characters from the characters tab", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <CollectionForm open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />,
    );

    await fillBasicFields(user);
    await user.click(screen.getByRole("tab", { name: /personagens/i }));
    await user.click(screen.getByRole("button", { name: /add character/i }));
    expect(screen.getByText("Superman")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /criar coleção/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: [
            expect.objectContaining({
              name: "Superman",
              imageUrl: "https://example.com/superman.jpg",
            }),
          ],
        }),
      );
    });
  });

  it("allows toggling active status", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <CollectionForm open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />,
    );

    await fillBasicFields(user);
    await user.click(screen.getByRole("tab", { name: /config/i }));
    fireEvent.click(screen.getByRole("switch", { name: /ativa/i }));
    await user.click(screen.getByRole("button", { name: /criar coleção/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        }),
      );
    });
  });

  it("calls onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <CollectionForm open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />,
    );

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables editable controls when loading", () => {
    render(
      <CollectionForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={true}
      />,
    );

    expect(screen.getByPlaceholderText("Ex: Heróis da Marvel")).toBeDisabled();
    expect(screen.getByPlaceholderText("Descreva a coleção...")).toBeDisabled();
    expect(screen.getByRole("button", { name: /criar coleção/i })).toBeDisabled();
  });
});
