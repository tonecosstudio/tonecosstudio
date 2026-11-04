import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ModelDetailsRoute from "./ModelDetailsRoute";

vi.mock("./CanonicalModelDetails", () => ({
  default: () => <output data-testid="canonical-catalog-detail">Worker catalog</output>,
}));
vi.mock("./ModelDetails", () => ({
  default: () => <output data-testid="legacy-supabase-detail">Legacy Supabase</output>,
}));

describe("Model detail source of truth", () => {
  it.each([
    ["canonical slug", "/modelos/figura-original"],
    ["UUID-shaped legacy link", "/modelos/43e97b32-c0af-4b88-a49d-1d454f077b46"],
    ["old friendly UUID link", "/modelos/androide-18-43e97b32-c0af-4b88-a49d-1d454f077b46"],
  ])("never reactivates Supabase model details for %s", (_label, path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/modelos/:id" element={<ModelDetailsRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("canonical-catalog-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("legacy-supabase-detail")).not.toBeInTheDocument();
  });
});
