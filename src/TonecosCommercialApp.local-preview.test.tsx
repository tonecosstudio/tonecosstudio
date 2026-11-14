import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const shellProps = vi.hoisted(() => vi.fn());

vi.mock("@/CatalogMvpShell", () => ({
  CatalogMvpShell: (props: { navigation?: ReactNode; extraRoutes?: ReactNode }) => {
    shellProps(props);
    return <main data-testid="commercial-shell" />;
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  shellProps.mockClear();
});

describe("TonecosCommercialApp local preview boot", () => {
  it("renders the commercial shell without connecting a localhost preview to remote Supabase", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_SUPABASE_URL", "https://production-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "production-publishable-key");

    const { default: TonecosCommercialApp } = await import("@/TonecosCommercialApp");
    render(<TonecosCommercialApp />);

    expect(screen.getByTestId("commercial-shell")).toBeInTheDocument();
    expect(shellProps).toHaveBeenCalledWith(
      expect.objectContaining({
        extraRoutes: expect.anything(),
        navigation: expect.anything(),
      }),
    );
  });
});
