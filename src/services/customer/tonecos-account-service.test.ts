import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  registerTonecosAccount, signInTonecosAccount, signOutTonecosAccount,
  getTonecosCurrentUser, getMyTonecosProfile, updateMyTonecosProfile,
  requestTonecosPasswordReset, completeTonecosPasswordRecovery,
  verifyTonecosPasswordRecoveryToken,
} from "./tonecos-account-service";

const USER = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), getSession: vi.fn(), from: vi.fn(), updateUser: vi.fn(), verifyOtp: vi.fn(),
  sendPasswordResetEmail: vi.fn(), signUpWithPasswordCredentials: vi.fn(),
  signInWithPasswordCredentials: vi.fn(), signOutCurrentSession: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    getUser: mocks.getUser,
    getSession: mocks.getSession,
    updateUser: mocks.updateUser,
    verifyOtp: mocks.verifyOtp,
  }, from: mocks.from },
}));
vi.mock("@/services/auth/auth-session-service", () => ({
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  signUpWithPasswordCredentials: mocks.signUpWithPasswordCredentials,
  signInWithPasswordCredentials: mocks.signInWithPasswordCredentials,
  signOutCurrentSession: mocks.signOutCurrentSession,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "test" } }, error: null });
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("Tonecos authenticated MVP account", () => {

  it("treats a logged-out visitor as guest without calling getUser or showing an Auth error", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(getTonecosCurrentUser()).resolves.toBeNull();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("handles a session that disappears between preflight and server verification", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", message: "Auth session missing!" },
    });
    await expect(getTonecosCurrentUser()).resolves.toBeNull();
  });

  it("still verifies authenticated users server-side and propagates real Auth errors", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { id: USER, email: "client@example.com" } },
      error: null,
    });
    await expect(getTonecosCurrentUser()).resolves.toEqual({ id: USER, email: "client@example.com" });
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { name: "AuthApiError", message: "Authentication service unavailable" },
    });
    await expect(getTonecosCurrentUser()).rejects.toMatchObject({ message: "Authentication service unavailable" });
  });

  it("sends password reset through existing rate-limited service to current Tonecos origin", async () => {
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
    await expect(requestTonecosPasswordReset("  CLIENT@EXAMPLE.COM ")).resolves.toBeUndefined();
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith({
      email: "client@example.com",
      redirectTo: expect.stringMatching(/\/recuperar-senha\?action=update$/),
    });
  });

  it("exchanges recovery token hash with Supabase Auth for cross-browser password recovery", async () => {
    const tokenHash = "a".repeat(64);
    mocks.verifyOtp.mockResolvedValue({ data: { user: { id: USER }, session: { access_token: "test" } }, error: null });
    await expect(verifyTonecosPasswordRecoveryToken(tokenHash)).resolves.toBeUndefined();
    expect(mocks.verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: tokenHash, type: "recovery" });
  });

  it("rejects malformed, expired and sessionless recovery tokens without updating a password", async () => {
    await expect(verifyTonecosPasswordRecoveryToken("invalid")).rejects.toThrow("tonecos_recovery_link_invalid");
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    mocks.verifyOtp.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: "Expired" } });
    await expect(verifyTonecosPasswordRecoveryToken("b".repeat(64))).rejects.toThrow("tonecos_recovery_link_invalid");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("rejects password recovery without a verified Supabase session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(completeTonecosPasswordRecovery("StrongPass123!"))
      .rejects.toThrow("tonecos_recovery_session_required");
    expect(mocks.updateUser).not.toHaveBeenCalled();
    await expect(completeTonecosPasswordRecovery("weak"))
      .rejects.toThrow("tonecos_recovery_password_invalid");
  });

  it("updates the password after token verification and signs out to require fresh login", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    mocks.updateUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    mocks.signOutCurrentSession.mockResolvedValue(undefined);
    await expect(completeTonecosPasswordRecovery("StrongPass123!")).resolves.toBeUndefined();
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ password: "StrongPass123!" });
    expect(mocks.signOutCurrentSession).toHaveBeenCalledTimes(1);
  });
  it("registers with Supabase Auth only; confirmation is explicit", async () => {
    mocks.signUpWithPasswordCredentials.mockResolvedValue({ userId: USER, emailConfirmationRequired: true });
    await expect(registerTonecosAccount({
      email: "  Client@example.com ", password: "StrongPass123!", fullName: "  Cliente  ",
    })).resolves.toEqual({ userId: USER, emailConfirmationRequired: true });
    expect(mocks.signUpWithPasswordCredentials).toHaveBeenCalledWith({
      email: "client@example.com", password: "StrongPass123!",
      fullName: "Cliente", emailRedirectTo: expect.stringMatching(/\/login$/),
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not sign in unless Auth actually returned user and session", async () => {
    mocks.signInWithPasswordCredentials.mockResolvedValueOnce(USER);
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!")).resolves.toBe(USER);
    mocks.signInWithPasswordCredentials.mockRejectedValueOnce(new Error("tonecos_login_incomplete"));
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!")).rejects.toThrow("tonecos_login_incomplete");
  });

  it("allows existing valid accounts to log in even when their original password predates the signup policy", async () => {
    mocks.signInWithPasswordCredentials.mockResolvedValue(USER);
    await expect(signInTonecosAccount("client@example.com", "OldPassword1"))
      .resolves.toBe(USER);
    expect(mocks.signInWithPasswordCredentials).toHaveBeenCalledWith({
      email: "client@example.com", password: "OldPassword1",
    });
    await expect(signInTonecosAccount("client@example.com", ""))
      .rejects.toThrow("tonecos_account_credentials_invalid");
  });

  it("allows private accounts without enabling quotes, using the same Auth SSOT", async () => {
    vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "false");
    mocks.signInWithPasswordCredentials.mockResolvedValue(USER);
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!")).resolves.toBe(USER);
    expect(mocks.signInWithPasswordCredentials).toHaveBeenCalledTimes(1);
  });

  it("blocks commercial requests when configured for the OrdaX Supabase project", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://jhfphsjptrpmtnzkpwud.supabase.co");
    await expect(registerTonecosAccount({
      email: "client@example.com", password: "StrongPass123!", fullName: "Cliente",
    })).rejects.toThrow("tonecos_supabase_project_mismatch");
    expect(mocks.signUpWithPasswordCredentials).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("blocks account access in public read-only previews", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!"))
      .rejects.toThrow("tonecos_commercial_mvp_disabled");
    await expect(getMyTonecosProfile()).rejects.toThrow("tonecos_commercial_mvp_disabled");
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
    mocks.signOutCurrentSession.mockResolvedValue(undefined);
    await expect(signOutTonecosAccount()).resolves.toBeUndefined();
    mocks.signOutCurrentSession.mockRejectedValueOnce(new Error("offline"));
    await expect(signOutTonecosAccount()).rejects.toThrow("offline");
  });
});
