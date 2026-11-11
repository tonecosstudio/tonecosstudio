import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import CharacterSelect from "./CharacterSelect";

function Destination() {
  const location = useLocation();
  return <output data-testid="destination">{location.pathname + location.search}</output>;
}

function openLegacyDirectory(url: string) {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/selecionar-personagem" element={<CharacterSelect />} />
        <Route path="/universo" element={<Destination />} />
        <Route path="/modelos" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...view, fetchSpy };
}

describe("retired character directory compatibility", () => {
  it("redirects legacy character searches to the canonical model search without stale filters", async () => {
    const { fetchSpy, unmount } = openLegacyDirectory("/selecionar-personagem?q=Resident%20Evil&sort=az&page=4");
    expect((await screen.findByTestId("destination")).textContent).toBe("/modelos?q=Resident%20Evil");
    expect(fetchSpy).not.toHaveBeenCalled();
    unmount();
    fetchSpy.mockRestore();
  });

  it.each([
    "/selecionar-personagem",
    "/selecionar-personagem?q=ab",
    "/selecionar-personagem?q=" + "x".repeat(81),
    "/selecionar-personagem?q=abc%0Adef",
  ])("routes unsupported or unsafe old queries to the canonical Universe: %s", async (url) => {
    const { fetchSpy, unmount } = openLegacyDirectory(url);
    expect((await screen.findByTestId("destination")).textContent).toBe("/universo");
    expect(fetchSpy).not.toHaveBeenCalled();
    unmount();
    fetchSpy.mockRestore();
  });

  it("preserves unicode search terms as an encoded in-app path", async () => {
    const { fetchSpy, unmount } = openLegacyDirectory("/selecionar-personagem?q=Princesa%20L%C3%A9ia");
    expect((await screen.findByTestId("destination")).textContent).toBe("/modelos?q=Princesa%20L%C3%A9ia");
    expect(fetchSpy).not.toHaveBeenCalled();
    unmount();
    fetchSpy.mockRestore();
  });
});
