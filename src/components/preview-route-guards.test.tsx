import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import RequireAdmin from "./RequireAdmin";
import { useAuthProfileSync } from "@/hooks/useAuthProfileSync";

const auth = vi.hoisted(() => ({
  user: null as null | { id: string },
  isLoading: false,
}));
const roles = vi.hoisted(() =>
  vi.fn(() => ({ data: true, isLoading: false })),
);
const subscribe = vi.hoisted(() => vi.fn(() => vi.fn()));

vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));
vi.mock("@/lib/roles", () => ({ useCurrentUserIsAdmin: roles }));
vi.mock("@/services/auth/auth-profile-sync-service", () => ({
  subscribeToAuthProfileSync: subscribe,
}));
vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ScanlineOverlay: () => null,
}));
vi.mock("@/services/auth/auth-session-service", () => ({
  signOutCurrentSession: vi.fn(),
}));

function mount(guard: "user" | "admin") {
  const path = guard === "user" ? "/perfil" : "/admin";
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            guard === "user" ? (
              <RequireAuth><h1>Página restrita</h1></RequireAuth>
            ) : (
              <RequireAdmin><h1>Página restrita</h1></RequireAdmin>
            )
          }
        />
        <Route path="/modelos" element={<h1>Catálogo público</h1>} />
        <Route path="/login" element={<h1>Entrar</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function ProfileSyncProbe() {
  useAuthProfileSync();
  return <h1>Sincronização testada</h1>;
}

beforeEach(() => {
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  auth.user = null;
  auth.isLoading = false;
  roles.mockClear();
  subscribe.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Tonecos preview route isolation", () => {
  it("redirects a persisted customer session to public models in read-only preview", () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    auth.user = { id: "customer-session" };
    mount("user");
    expect(screen.getByRole("heading", { name: "Catálogo público" })).toBeInTheDocument();
    expect(screen.queryByText("Página restrita")).not.toBeInTheDocument();
  });

  it("redirects a persisted admin session without making a role query in preview", () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    auth.user = { id: "admin-session" };
    mount("admin");
    expect(screen.getByRole("heading", { name: "Catálogo público" })).toBeInTheDocument();
    expect(roles).toHaveBeenCalledWith({
      currentUserId: undefined,
      enabled: false,
    });
    expect(screen.queryByText("Página restrita")).not.toBeInTheDocument();
  });

  it("preserves the commercial authenticated account route", () => {
    auth.user = { id: "customer-session" };
    mount("user");
    expect(screen.getByRole("heading", { name: "Página restrita" })).toBeInTheDocument();
  });

  it("preserves the commercial role-checked admin route", () => {
    auth.user = { id: "admin-session" };
    mount("admin");
    expect(roles).toHaveBeenCalledWith({
      currentUserId: "admin-session",
      enabled: true,
    });
    expect(screen.getByRole("heading", { name: "Página restrita" })).toBeInTheDocument();
  });

  it("never starts the auth profile synchronizer in preview", () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    render(<ProfileSyncProbe />);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("preserves one existing auth profile synchronizer commercially", () => {
    render(<ProfileSyncProbe />);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });
});
