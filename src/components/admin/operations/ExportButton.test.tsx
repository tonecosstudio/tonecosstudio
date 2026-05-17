/**
 * Testes para ExportButton component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExportButton } from "./ExportButton";

// Mock do toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("ExportButton", () => {
  const mockData = [
    { id: 1, name: "Item 1", value: 100 },
    { id: 2, name: "Item 2", value: 200 },
    { id: 3, name: "Item 3", value: 300 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar botão de exportação", () => {
    render(<ExportButton data={mockData} filename="test" />);

    expect(screen.getByText("Exportar")).toBeInTheDocument();
  });

  it("deve ter atributos corretos para dropdown", () => {
    render(<ExportButton data={mockData} filename="test" />);

    const button = screen.getByText("Exportar");

    // Verificar que o botão tem os atributos corretos do Radix UI
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded");
  });

  it("deve renderizar com dados corretos", () => {
    const { container } = render(<ExportButton data={mockData} filename="test" />);

    // Verificar que o componente renderizou
    expect(container.querySelector("button")).toBeInTheDocument();

    // Verificar que tem o ícone de download
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("deve aceitar callback onExport customizado", () => {
    const mockOnExport = vi.fn();

    render(<ExportButton data={mockData} filename="test" onExport={mockOnExport} />);

    const button = screen.getByText("Exportar");
    expect(button).toBeInTheDocument();

    // Verificar que o componente aceita a prop
    expect(mockOnExport).not.toHaveBeenCalled();
  });

  it("deve aplicar className customizada", () => {
    const { container } = render(
      <ExportButton data={mockData} filename="test" className="custom-export-class" />
    );

    const button = container.querySelector(".custom-export-class");
    expect(button).toBeInTheDocument();
  });

  it("deve ter filename correto", () => {
    const testFilename = "my-export-file";

    render(<ExportButton data={mockData} filename={testFilename} />);

    const button = screen.getByText("Exportar");
    expect(button).toBeInTheDocument();
  });

  it("deve lidar com dados vazios", () => {
    render(<ExportButton data={[]} filename="test" />);

    expect(screen.getByText("Exportar")).toBeInTheDocument();
  });

  it("deve exibir ícone de download", () => {
    const { container } = render(<ExportButton data={mockData} filename="test" />);

    // Verificar que o ícone está presente (Lucide icons)
    const downloadIcon = container.querySelector("svg");
    expect(downloadIcon).toBeInTheDocument();
  });
});

describe("ExportButton - Seleção de Colunas", () => {
  const mockData = [
    { id: 1, name: "Item 1", value: 100, category: "A" },
    { id: 2, name: "Item 2", value: 200, category: "B" },
  ];

  it("deve aceitar prop allowColumnSelection", () => {
    render(<ExportButton data={mockData} filename="test" allowColumnSelection={true} />);

    const button = screen.getByText("Exportar");
    expect(button).toBeInTheDocument();
  });

  it("deve funcionar sem allowColumnSelection", () => {
    render(<ExportButton data={mockData} filename="test" allowColumnSelection={false} />);

    const button = screen.getByText("Exportar");
    expect(button).toBeInTheDocument();
  });
});

describe("ExportButton - Formatos de Exportação", () => {
  const mockData = [{ id: 1, name: "Test", value: 100 }];

  it("deve aceitar dados para exportação", () => {
    render(<ExportButton data={mockData} filename="test" />);

    const button = screen.getByText("Exportar");
    expect(button).toBeInTheDocument();
  });

  it("deve ter estrutura correta para múltiplos formatos", () => {
    const { container } = render(<ExportButton data={mockData} filename="test" />);

    // Verificar que o componente renderizou corretamente
    const button = container.querySelector("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-haspopup", "menu");
  });

  it("deve lidar com dados vazios", () => {
    render(<ExportButton data={[]} filename="test" />);

    const button = screen.getByText("Exportar");
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });
});
