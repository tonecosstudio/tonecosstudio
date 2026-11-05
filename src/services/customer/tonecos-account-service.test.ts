import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  registerTonecosAccount, signInTonecosAccount, signOutTonecosAccount,
  getMyTonecosProfile, updateMyTonecosProfile,
} from "./tonecos-account-service";

const USER = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  signUp: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), getUser: vi.fn(), from: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    signUp: mocks.signUp,
    signInWithPassword: mocks.signInWithPassword,
    signOut: mocks.signOut,
    getUser: mocks.getUser,
  }, from: mocks.from },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("Tonecos authenticated MVP account", () => {
  it("registers with Supabase Auth only; confirmation is explicit", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: USER }, session: null }, error: null });
    await expect(registerTonecosAccount({
      email: "  Client@example.com ", password: "StrongPass123!", fullName: "  Cliente  ",
    })).resolves.toEqual({ userId: USER, emailConfirmationRequired: true });
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "client@example.com", password: "StrongPass123!",
      options: { data: { full_name: "Cliente" } },
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not sign in unless Auth actually returned user and session", async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({ data: { user: { id: USER }, session: { access_token: "x" } }, error: null });
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!")).resolves.toBe(USER);
    mocks.signInWithPassword.mockResolvedValueOnce({ data: { user: { id: USER }, session: null }, error: null });
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!")).rejects.toThrow("tonecos_login_incomplete");
  });

  it("allows existing valid accounts to log in even when their original password predates the signup policy", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: USER }, session: { access_token: "x" } }, error: null,
    });
    await expect(signInTonecosAccount("client@example.com", "OldPassword1"))
      .resolves.toBe(USER);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "client@example.com", password: "OldPassword1",
    });
    await expect(signInTonecosAccount("client@example.com", ""))
      .rejects.toThrow("tonecos_account_credentials_invalid");
  });

  it("blocks commercial requests when configured for the OrdaX Supabase project", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://jhfphsjptrpmtnzkpwud.supabase.co");
    await expect(registerTonecosAccount({
      email: "client@example.com", password: "StrongPass123!", fullName: "Cliente",
    })).rejects.toThrow("tonecos_supabase_project_mismatch");
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("blocks account access in public read-only previews", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!"))
      .rejects.toThrow("catalog_quotes_not_enabled");
    await expect(getMyTonecosProfile()).rejects.toThrow("catalog_quotes_not_enabled");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("reads and updates only the authenticated profile through RLS", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    const profile = {
      id: USER, email: "client@example.com", full_name: "Cliente", phone: "71999999999",
      created_at: "2026-11-05T00:00:00Z", updated_at: "2026-11-05T00:00:00Z",
    };
    const read = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
    read.select.mockReturnValue(read); read.eq.mockReturnValue(read);
    read.single.mockResolvedValue({ data: profile, error: null });
    const change = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() };
    change.update.mockReturnValue(change); change.eq.mockReturnValue(change);
    change.select.mockReturnValue(change);
    change.single.mockResolvedValue({ data: profile, error: null });
    mocks.from.mockReturnValueOnce(read).mockReturnValueOnce(change);
    await expect(getMyTonecosProfile()).resolves.toEqual(profile);
    await expect(updateMyTonecosProfile({ fullName: "Cliente", phone: "71999999999" }))
      .resolves.toEqual(profile);
    expect(read.eq).toHaveBeenCalledWith("id", USER);
    expect(change.update).toHaveBeenCalledExactlyOnceWith({
      full_name: "Cliente", phone: "71999999999",
    });
    expect(change.eq).toHaveBeenCalledWith("id", USER);
  });

  it("rejects weak input, non-owner and invalid phones before mutation", async () => {
    await expect(registerTonecosAccount({
      email: "bad", password: "short", fullName: "Cliente",
    })).rejects.toThrow("tonecos_account_credentials_invalid");
    await expect(updateMyTonecosProfile({ fullName: "Cliente", phone: "abc" }))
      .rejects.toThrow("tonecos_account_phone_invalid");
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getMyTonecosProfile()).rejects.toThrow("tonecos_login_required");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("signs out through Supabase Auth and propagates errors", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await expect(signOutTonecosAccount()).resolves.toBeUndefined();
    mocks.signOut.mockResolvedValueOnce({ error: { message: "offline" } });
    await expect(signOutTonecosAccount()).rejects.toMatchObject({ message: "offline" });
  });
});
