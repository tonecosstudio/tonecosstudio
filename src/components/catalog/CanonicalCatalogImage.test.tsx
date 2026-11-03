import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CanonicalCatalogImage } from "./CanonicalCatalogImage";

describe("CanonicalCatalogImage", () => {
  it("shows the official image and a readable placeholder when loading fails", () => {
    render(
      <CanonicalCatalogImage
        src="/catalogo-api/media/model-one/card.webp"
        alt="Escultura original"
      />,
    );
    const image = screen.getByRole("img", { name: "Escultura original" });
    expect(image).toHaveAttribute(
      "src",
      "/catalogo-api/media/model-one/card.webp",
    );
    fireEvent.error(image);
    expect(screen.queryByRole("img", { name: "Escultura original" })).not.toBeInTheDocument();
    expect(screen.getByText("Imagem indisponível")).toBeInTheDocument();
  });

  it("recovers when the selected model changes to another valid image", () => {
    const { rerender } = render(
      <CanonicalCatalogImage src="/catalogo-api/media/first.webp" alt="Primeiro" />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Primeiro" }));
    rerender(
      <CanonicalCatalogImage src="/catalogo-api/media/second.webp" alt="Segundo" />,
    );
    expect(screen.getByRole("img", { name: "Segundo" })).toHaveAttribute(
      "src",
      "/catalogo-api/media/second.webp",
    );
    expect(screen.queryByText("Imagem indisponível")).not.toBeInTheDocument();
  });

  it("does not render an empty image request when media is absent", () => {
    const { container } = render(
      <CanonicalCatalogImage src={null} alt="" fallbackLabel="Sem prévia" />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Sem prévia")).toBeInTheDocument();
  });
});
