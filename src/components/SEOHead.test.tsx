import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEOHead from "./SEOHead";

describe("Tonecos public document titles", () => {
  it("does not duplicate the brand for the Home or published model", async () => {
    const { rerender } = render(
      <HelmetProvider>
        <SEOHead title="TONART Studio" />
      </HelmetProvider>,
    );
    await waitFor(() => expect(document.title).toBe("TONART Studio"));
    rerender(
      <HelmetProvider>
        <SEOHead title="10H — TONART Studio" />
      </HelmetProvider>,
    );
    await waitFor(() => expect(document.title).toBe("10H — TONART Studio"));
  });

  it("adds the brand once to an unbranded catalog title", async () => {
    render(
      <HelmetProvider>
        <SEOHead title="Catálogo de modelos" />
      </HelmetProvider>,
    );
    await waitFor(() =>
      expect(document.title).toBe("Catálogo de modelos | TONART Studio"),
    );
  });
});
