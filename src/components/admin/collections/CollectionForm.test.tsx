/**
 * CollectionForm Component Tests
 *
 * Tests for the collection form component including validation,
 * form submission, and field interactions.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 * Task: 20.2 Create collection form component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionForm } from "./CollectionForm";
import type { Collection } from "@/services/collection-service";

// Mock dependencies
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("./ImageUpload", () => ({
  default: ({ label, onUploadComplete }: any) => (
    <div data-testid="image-upload">
      <label>{label}</label>
      <button onClick={() => onUploadComplete("https://example.com/image.jpg")}>
        Upload Image
      </button>
    </div>
  ),
}));

describe("CollectionForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("New Collection Mode", () => {
    it("renders form with empty fields", () => {
      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText("Nova Coleção")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Ex: Coleção Marvel")).toHaveValue("");
      expect(screen.getByPlaceholderText("Descreva a coleção...")).toHaveValue("");
      expect(screen.getByPlaceholderText("0.00")).toHaveValue(null);
    });

    it("validates required fields", async () => {
      const user = userEvent.setup();
      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole("button", { name: /Criar Coleção/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Preço inválido")).toBeInTheDocument();
      });
    });

    it("submits form with valid data", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Fill in required fields
      await user.type(screen.getByLabelText(/^Nome \*/), "Coleção Marvel");
      await user.type(screen.getByLabelText(/Descrição/), "Coleção de personagens Marvel");
      await user.type(screen.getByLabelText(/Preço/), "299.90");

      // Upload image
      const uploadButton = screen.getAllByText("Upload Image")[0];
      await user.click(uploadButton);

      // Submit form
      const submitButton = screen.getByRole("button", { name: /Criar Coleção/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Coleção Marvel",
            description: "Coleção de personagens Marvel",
            price: 299.90,
            image_url: "https://example.com/image.jpg",
            rotation_type: "fixed",
            is_active: true,
          })
        );
      }, { timeout: 10000 });
    });

    it("validates price is a number", async () => {
      const user = userEvent.setup();
      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/^Nome \*/), "Test");
      await user.type(screen.getByLabelText(/Descrição/), "Test description");

      // Type invalid price - the input type="number" will prevent non-numeric input
      // So we need to check the validation differently
      const priceInput = screen.getByLabelText(/Preço/) as HTMLInputElement;

      // Upload image first to pass that validation
      const uploadButton = screen.getAllByText("Upload Image")[0];
      await user.click(uploadButton);

      const submitButton = screen.getByRole("button", { name: /Criar Coleção/ });
      await user.click(submitButton);

      // Should show validation error for empty/invalid price
      await waitFor(() => {
        expect(screen.getByText("Preço inválido")).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe("Edit Collection Mode", () => {
    const mockCollection: Partial<Collection> = {
      id: "1",
      name: "Coleção DC",
      description: "Coleção de personagens DC",
      priceMonthly: 249.90,
      coverImage: "https://example.com/dc.jpg",
      rotation_type: "odd_months",
      character_revelation_date: "2026-06-15T00:00:00Z",
      character_name: "Batman",
      character_image_url: "https://example.com/batman.jpg",
      is_active: true,
    };

    it("renders form with collection data", () => {
      render(
        <CollectionForm
          collection={mockCollection as Collection}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText("Editar Coleção")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Coleção DC")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Coleção de personagens DC")).toBeInTheDocument();
      expect(screen.getByDisplayValue("249.9")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Batman")).toBeInTheDocument();
    });

    it("updates collection with modified data", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CollectionForm
          collection={mockCollection as Collection}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Modify name
      const nameInput = screen.getByDisplayValue("Coleção DC");
      await user.clear(nameInput);
      await user.type(nameInput, "Coleção DC Atualizada");

      // Submit form
      const submitButton = screen.getByRole("button", { name: /Salvar Alterações/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Coleção DC Atualizada",
            description: "Coleção de personagens DC",
            price: 249.90,
          })
        );
      }, { timeout: 10000 });
    });
  });

  describe("Rotation Type Selection", () => {
    it("allows selecting fixed rotation", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/^Nome \*/), "Test");
      await user.type(screen.getByLabelText(/Descrição/), "Test");
      await user.type(screen.getByLabelText(/Preço/), "100");

      // Upload image
      const uploadButton = screen.getAllByText("Upload Image")[0];
      await user.click(uploadButton);

      // Submit with default fixed rotation
      const submitButton = screen.getByRole("button", { name: /Criar Coleção/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            rotation_type: "fixed",
          })
        );
      });
    });

    it("does not show calendar preview for fixed rotation", () => {
      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Calendar preview should not be visible for fixed rotation
      expect(screen.queryByText("Visualização do Calendário de Rotação")).not.toBeInTheDocument();
    });

    it("shows calendar preview when editing collection with odd months rotation", () => {
      const mockCollection: Partial<Collection> = {
        id: "1",
        name: "Coleção Teste",
        description: "Descrição teste",
        priceMonthly: 100,
        coverImage: "https://example.com/image.jpg",
        rotation_type: "odd_months",
        is_active: true,
      };

      render(
        <CollectionForm
          collection={mockCollection as Collection}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Calendar preview should be visible for odd_months rotation
      expect(screen.getByText("Visualização do Calendário de Rotação")).toBeInTheDocument();

      // Check that all 12 months are displayed
      expect(screen.getByText("Jan")).toBeInTheDocument();
      expect(screen.getByText("Fev")).toBeInTheDocument();
      expect(screen.getByText("Mar")).toBeInTheDocument();
      expect(screen.getByText("Abr")).toBeInTheDocument();
      expect(screen.getByText("Mai")).toBeInTheDocument();
      expect(screen.getByText("Jun")).toBeInTheDocument();
      expect(screen.getByText("Jul")).toBeInTheDocument();
      expect(screen.getByText("Ago")).toBeInTheDocument();
      expect(screen.getByText("Set")).toBeInTheDocument();
      expect(screen.getByText("Out")).toBeInTheDocument();
      expect(screen.getByText("Nov")).toBeInTheDocument();
      expect(screen.getByText("Dez")).toBeInTheDocument();

      // Check legend
      expect(screen.getByText("Meses Ativos")).toBeInTheDocument();
      expect(screen.getByText("Meses Inativos")).toBeInTheDocument();

      // Check descriptive text for odd months
      expect(screen.getByText(/Esta coleção estará disponível nos meses ímpares/)).toBeInTheDocument();
    });

    it("shows calendar preview when editing collection with even months rotation", () => {
      const mockCollection: Partial<Collection> = {
        id: "1",
        name: "Coleção Teste",
        description: "Descrição teste",
        priceMonthly: 100,
        coverImage: "https://example.com/image.jpg",
        rotation_type: "even_months",
        is_active: true,
      };

      render(
        <CollectionForm
          collection={mockCollection as Collection}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Calendar preview should be visible for even_months rotation
      expect(screen.getByText("Visualização do Calendário de Rotação")).toBeInTheDocument();

      // Check descriptive text for even months
      expect(screen.getByText(/Esta coleção estará disponível nos meses pares/)).toBeInTheDocument();
    });
  });

  describe("Character Revelation Fields", () => {
    it("allows setting character name and image", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/^Nome \*/), "Test");
      await user.type(screen.getByLabelText(/Descrição/), "Test");
      await user.type(screen.getByLabelText(/Preço/), "100");
      await user.type(screen.getByLabelText(/Nome do Personagem/), "Superman");

      // Upload images
      const uploadButtons = screen.getAllByText("Upload Image");
      await user.click(uploadButtons[0]); // Collection image
      await user.click(uploadButtons[1]); // Character image

      const submitButton = screen.getByRole("button", { name: /Criar Coleção/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            character_name: "Superman",
            character_image_url: "https://example.com/image.jpg",
          })
        );
      }, { timeout: 10000 });
    });
  });

  describe("Active Status Toggle", () => {
    it("allows toggling active status", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/^Nome \*/), "Test");
      await user.type(screen.getByLabelText(/Descrição/), "Test");
      await user.type(screen.getByLabelText(/Preço/), "100");

      // Upload image
      const uploadButton = screen.getAllByText("Upload Image")[0];
      await user.click(uploadButton);

      // Toggle active status
      const activeSwitch = screen.getByRole("switch", { name: /Coleção Ativa/ });
      await user.click(activeSwitch);

      const submitButton = screen.getByRole("button", { name: /Criar Coleção/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            is_active: false,
          })
        );
      });
    });
  });

  describe("Form Cancellation", () => {
    it("calls onOpenChange when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /Cancelar/ });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Loading State", () => {
    it("disables form fields when loading", () => {
      render(
        <CollectionForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      expect(screen.getByPlaceholderText("Ex: Coleção Marvel")).toBeDisabled();
      expect(screen.getByPlaceholderText("Descreva a coleção...")).toBeDisabled();
      expect(screen.getByPlaceholderText("0.00")).toBeDisabled();
      expect(screen.getByRole("button", { name: /Criar Coleção/ })).toBeDisabled();
    });
  });
});
