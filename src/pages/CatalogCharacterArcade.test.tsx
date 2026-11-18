import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import CatalogCharacterArcade from "./CatalogCharacterArcade";
import { PUBLIC_ROUTES } from "@/config/routes";

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

describe("historical character URL", () => {
  it.each([
    ["/universo/personagem/androide-18-dragon-ball", "/modelos"],
    [
      "/universo/personagem/androide-18-dragon-ball?character=Androide%2018&source=Dragon%20Ball",
      "/modelos",
    ],
    ["/universo/personagem/nao-existe", "/modelos"],
    [
      "/universo/anime/dragon-ball/androide-18-dragon-ball",
      "/modelos?category=anime&franchise=dragon-ball",
    ],
  ])("keeps %s behind the approved-publication gate without a Supabase lookup", (initial, expected) => {
    render(
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path={PUBLIC_ROUTES.catalogCharacter} element={<CatalogCharacterArcade />} />
          <Route path={PUBLIC_ROUTES.catalogUniverseCharacter} element={<CatalogCharacterArcade />} />
          <Route path={PUBLIC_ROUTES.catalogModels} element={<h1>Catálogo canônico</h1>} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Catálogo canônico" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(expected);
    expect(screen.getByTestId("location")).not.toHaveTextContent("personagem");
    expect(screen.getByTestId("location")).not.toHaveTextContent("character=");
  });
});
